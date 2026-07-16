import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { Entrevista } from '../models/Entrevista.js';
import { EvaluacionEntrevista } from '../models/EvaluacionEntrevista.js';
import { Grupo } from '../models/Grupo.js';
import { Equipo } from '../models/Equipo.js';
import { AppUser } from '../models/AppUser.js';
import { Competencia } from '../models/Competencia.js';
import { CompetenciaAlumno } from '../models/CompetenciaAlumno.js';
import { scopeGrupo, existeEnGrupo } from '../services/grupo-admin.service.js';
import { PlanEvaluacion, type PeriodoConfig } from '../models/PlanEvaluacion.js';

function getWeekBounds(fecha: string): { monday: string; sunday: string } {
  const d = new Date(fecha + 'T12:00:00');
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  return { monday: fmt(monday), sunday: fmt(sunday) };
}

export async function listProfesores(_req: Request, res: Response): Promise<void> {
  try {
    const query = BaseModel.queryActive<AppUser>('AppUser');
    query.equalTo('userType' as any, 'admin' as any);
    query.ascending('name');
    const users = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      profesores: users.map((u) => ({
        id: u.id,
        name: u.get('name') ?? '',
        email: u.get('email') ?? '',
      })),
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener profesores' });
  }
}

export async function listEntrevistas(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;
    const query = BaseModel.queryActive<Entrevista>('Entrevista');
    query.equalTo('grupo' as any, grupoPointer as any);
    query.include('equipo');
    query.include('equipo.miembros');
    query.include('profesores');
    query.include('competencias');
    query.descending('fecha');
    const entrevistas = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      entrevistas: entrevistas.map((e) => e.toSafeJSON()),
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener entrevistas' });
  }
}

export async function createEntrevista(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const { equipoId, profesores, competencias, fecha, asignacionProfesores } = req.body;

  if (!equipoId || !fecha || !Array.isArray(competencias) || competencias.length === 0) {
    res.status(400).json({ status: 'error', message: 'Equipo, fecha y al menos una competencia son requeridos' });
    return;
  }
  if (!Array.isArray(profesores) || profesores.length === 0) {
    res.status(400).json({ status: 'error', message: 'Al menos un profesor es requerido' });
    return;
  }

  try {
    // El equipo debe ser DE este grupo (candado profesor): con un equipoId ajeno,
    // el refetch con include('equipo.miembros') filtraría el roster de otro grupo.
    if (!(await existeEnGrupo('Equipo', equipoId, grupoId))) {
      res.status(400).json({ status: 'error', message: 'El equipo no pertenece a este grupo' });
      return;
    }

    // Weekly validation
    const conflicting = await checkWeeklyConflict(grupoId, fecha, competencias);
    if (conflicting.length > 0) {
      res.status(400).json({
        status: 'error',
        message: `Las siguientes competencias ya fueron evaluadas esta semana: ${conflicting.join(', ')}`,
      });
      return;
    }

    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;
    const equipoPointer = Parse.Object.extend('Equipo').createWithoutData(equipoId) as Equipo;
    const profesorPointers = profesores.map(
      (id: string) => Parse.Object.extend('AppUser').createWithoutData(id) as AppUser,
    );
    const competenciaPointers = competencias.map(
      (id: string) => Parse.Object.extend('Competencia').createWithoutData(id) as Competencia,
    );

    const entrevista = new Entrevista().initDefaults();
    entrevista.setGrupo(grupoPointer);
    entrevista.setEquipo(equipoPointer);
    entrevista.setProfesores(profesorPointers);
    entrevista.setCompetencias(competenciaPointers);
    entrevista.setFecha(fecha);
    if (asignacionProfesores && typeof asignacionProfesores === 'object') {
      entrevista.setAsignacionProfesores(asignacionProfesores);
    }

    await entrevista.save(null, { useMasterKey: true });

    // Re-fetch with includes
    const saved = await refetchEntrevista(entrevista.id!);

    res.status(201).json({ status: 'ok', entrevista: saved.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al crear entrevista' });
  }
}

export async function updateEntrevista(req: Request, res: Response): Promise<void> {
  const { entrevistaId } = req.params;
  const { grupoId } = req.params;
  const { equipoId, profesores, competencias, fecha, asignacionProfesores } = req.body;

  try {
    const query = BaseModel.queryActive<Entrevista>('Entrevista');
    scopeGrupo(query, grupoId); // la entrevista debe ser DE este grupo (candado profesor)
    const entrevista = await query.get(entrevistaId, { useMasterKey: true });

    if (entrevista.isLiberada()) {
      res.status(400).json({ status: 'error', message: 'No se puede editar una entrevista liberada' });
      return;
    }

    // Weekly validation if competencias or fecha changed
    if (fecha && Array.isArray(competencias) && competencias.length > 0) {
      const conflicting = await checkWeeklyConflict(grupoId, fecha, competencias, entrevistaId);
      if (conflicting.length > 0) {
        res.status(400).json({
          status: 'error',
          message: `Las siguientes competencias ya fueron evaluadas esta semana: ${conflicting.join(', ')}`,
        });
        return;
      }
    }

    if (equipoId) {
      // El equipo nuevo debe ser de este grupo (candado profesor): si no, el
      // refetch con include('equipo.miembros') filtraría el roster de otro grupo.
      if (!(await existeEnGrupo('Equipo', equipoId, grupoId))) {
        res.status(400).json({ status: 'error', message: 'El equipo no pertenece a este grupo' });
        return;
      }
      entrevista.setEquipo(Parse.Object.extend('Equipo').createWithoutData(equipoId) as Equipo);
    }
    if (Array.isArray(profesores)) {
      entrevista.setProfesores(
        profesores.map((id: string) => Parse.Object.extend('AppUser').createWithoutData(id) as AppUser),
      );
    }
    if (Array.isArray(competencias)) {
      entrevista.setCompetencias(
        competencias.map((id: string) => Parse.Object.extend('Competencia').createWithoutData(id) as Competencia),
      );
    }
    if (fecha) {
      entrevista.setFecha(fecha);
    }
    if (asignacionProfesores && typeof asignacionProfesores === 'object') {
      entrevista.setAsignacionProfesores(asignacionProfesores);
    }

    await entrevista.save(null, { useMasterKey: true });

    const saved = await refetchEntrevista(entrevista.id!);
    res.json({ status: 'ok', entrevista: saved.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Entrevista no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al actualizar entrevista' });
  }
}

export async function deleteEntrevista(req: Request, res: Response): Promise<void> {
  const { entrevistaId, grupoId } = req.params;

  try {
    const query = new Parse.Query<Entrevista>('Entrevista');
    query.equalTo('exists' as any, true as any);
    scopeGrupo(query, grupoId); // la entrevista debe ser DE este grupo (candado profesor)
    const entrevista = await query.get(entrevistaId, { useMasterKey: true });

    entrevista.softDelete();
    await entrevista.save(null, { useMasterKey: true });

    res.json({ status: 'ok', message: 'Entrevista eliminada' });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Entrevista no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al eliminar entrevista' });
  }
}

const VALOR_TO_NUMBER: Record<string, number> = {
  '': 0,
  'Incipiente B (0%)': 0,
  'Incipiente A (15%)': 15,
  'Básico (70%)': 70,
  'Sólido (85%)': 85,
  'Destacado (100%)': 100,
};

function valorToNumber(label: string): number {
  return VALOR_TO_NUMBER[label] ?? 0;
}

export async function liberarEntrevista(req: Request, res: Response): Promise<void> {
  const { grupoId, entrevistaId } = req.params;
  const { periodo } = req.body;

  if (!periodo || typeof periodo !== 'string') {
    res.status(400).json({ status: 'error', message: 'El periodo es requerido' });
    return;
  }

  try {
    const query = BaseModel.queryActive<Entrevista>('Entrevista');
    scopeGrupo(query, grupoId); // la entrevista debe ser DE este grupo (candado profesor)
    query.include('equipo');
    query.include('equipo.miembros');
    query.include('profesores');
    query.include('competencias');
    const entrevista = await query.get(entrevistaId, { useMasterKey: true });

    if (entrevista.isLiberada()) {
      res.status(400).json({ status: 'error', message: 'Esta entrevista ya fue liberada' });
      return;
    }

    // Fetch all evaluaciones for this entrevista
    const evPointer = Entrevista.createWithoutData(entrevistaId) as Entrevista;
    const evQuery = BaseModel.queryActive<EvaluacionEntrevista>('EvaluacionEntrevista');
    evQuery.equalTo('entrevista', evPointer);
    evQuery.include('alumno');
    evQuery.include('competencia');
    evQuery.limit(1000);
    const evaluaciones = await evQuery.find({ useMasterKey: true });

    const grupoPointer = Grupo.createWithoutData(grupoId) as Grupo;

    // Collect unique alumno+competencia pairs to update
    const toSave: Parse.Object[] = [];

    for (const ev of evaluaciones) {
      const valorAsignado = ev.getValorAsignado();
      if (!valorAsignado) continue; // Skip unevaluated cells

      const alumno = ev.getAlumno();
      const competencia = ev.getCompetencia();
      if (!alumno || !competencia) continue;

      // Find or create CompetenciaAlumno
      const caQuery = BaseModel.queryActive<CompetenciaAlumno>('CompetenciaAlumno');
      caQuery.equalTo('grupo', grupoPointer);
      caQuery.equalTo('alumno', alumno);
      caQuery.equalTo('competencia', competencia);
      const caResults = await caQuery.find({ useMasterKey: true });

      let ca: CompetenciaAlumno;
      if (caResults.length > 0) {
        ca = caResults[0];
      } else {
        // Skip if no CompetenciaAlumno exists (malla not initialized)
        continue;
      }

      const numericVal = valorToNumber(valorAsignado);
      const comentario = ev.getComentario();

      if (periodo.includes('1')) {
        ca.set('valorPeriodo1', numericVal);
        if (comentario) ca.setRetroPeriodo1(comentario);
      } else if (periodo.includes('2')) {
        ca.set('valorPeriodo2', numericVal);
        if (comentario) ca.setRetroPeriodo2(comentario);
      }

      toSave.push(ca);
    }

    // Bulk save all CompetenciaAlumno updates
    if (toSave.length > 0) {
      await Parse.Object.saveAll(toSave, { useMasterKey: true });
    }

    // Recalculate calculated competencias
    const processedPairs = new Set<string>();
    for (const ev of evaluaciones) {
      const alumno = ev.getAlumno();
      const competencia = ev.getCompetencia();
      if (!alumno || !competencia) continue;
      const pairKey = `${alumno.id}-${competencia.id}`;
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);
      await recalcularCalculadas(competencia.id, alumno, grupoPointer);
    }

    // Mark entrevista as liberada
    entrevista.setLiberada(true);
    await entrevista.save(null, { useMasterKey: true });

    res.json({ status: 'ok', message: 'Evaluación liberada exitosamente' });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Entrevista no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al liberar evaluación' });
  }
}

async function recalcularCalculadas(
  competenciaId: string,
  alumnoPointer: Parse.Object,
  grupoPointer: Parse.Object,
): Promise<void> {
  const compQuery = new Parse.Query<Competencia>('Competencia');
  compQuery.equalTo('exists' as any, true as any);
  compQuery.equalTo('esCalculada' as any, true as any);
  compQuery.equalTo('dependencias' as any, Parse.Object.extend('Competencia').createWithoutData(competenciaId) as any);
  compQuery.include('dependencias' as any);
  const calculadas = await compQuery.find({ useMasterKey: true });

  for (const calculada of calculadas) {
    const depIds: string[] = (calculada.getDependencias() ?? []).map((d: any) => d.id);
    if (depIds.length === 0) continue;

    const depPointers = depIds.map((id) => Parse.Object.extend('Competencia').createWithoutData(id));
    const caQuery = new Parse.Query<CompetenciaAlumno>('CompetenciaAlumno');
    caQuery.equalTo('exists' as any, true as any);
    caQuery.equalTo('alumno' as any, alumnoPointer as any);
    caQuery.equalTo('grupo' as any, grupoPointer as any);
    caQuery.containedIn('competencia' as any, depPointers as any);
    caQuery.limit(1000);
    const depRecords = await caQuery.find({ useMasterKey: true });

    for (const periodo of ['valorPeriodo1', 'valorPeriodo2'] as const) {
      const values: number[] = [];
      let allEvaluated = true;

      for (const depId of depIds) {
        const record = depRecords.find((r) => r.getCompetencia()?.id === depId);
        const rawVal = record ? record.get(periodo) : undefined;
        if (!record || rawVal === '' || rawVal === undefined || rawVal === null) {
          allEvaluated = false;
          break;
        }
        const numVal = typeof rawVal === 'number' ? rawVal : Number(rawVal);
        values.push(numVal);
      }

      const calcQuery = new Parse.Query<CompetenciaAlumno>('CompetenciaAlumno');
      calcQuery.equalTo('exists' as any, true as any);
      calcQuery.equalTo('alumno' as any, alumnoPointer as any);
      calcQuery.equalTo('grupo' as any, grupoPointer as any);
      calcQuery.equalTo('competencia' as any, calculada as any);
      const calcResults = await calcQuery.find({ useMasterKey: true });
      if (calcResults.length === 0) continue;

      const calcRecord = calcResults[0];
      if (allEvaluated && values.length === depIds.length) {
        calcRecord.set(periodo, Math.min(...values));
      } else {
        calcRecord.set(periodo, '');
      }
      await calcRecord.save(null, { useMasterKey: true });
    }
  }
}

export async function getEntrevistaProgress(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;

    // Load entrevistas with equipo members to filter correctly
    const entQueryFull = BaseModel.queryActive<Entrevista>('Entrevista');
    entQueryFull.equalTo('grupo' as any, grupoPointer as any);
    entQueryFull.include('equipo');
    entQueryFull.include('equipo.miembros');
    const entrevistasFull = await entQueryFull.find({ useMasterKey: true });

    const progress: Record<string, { porProfesor: Record<string, { name: string; total: number; evaluadas: number }> }> = {};

    for (const ent of entrevistasFull) {
      // Get current equipo member IDs
      const equipo = ent.getEquipo();
      const miembros: AppUser[] = equipo ? (equipo.get('miembros') ?? []) : [];
      const currentMiembroIds = new Set(miembros.map((m: AppUser) => m.id));

      const evPointer = Entrevista.createWithoutData(ent.id!) as Entrevista;
      const evQuery = BaseModel.queryActive<EvaluacionEntrevista>('EvaluacionEntrevista');
      evQuery.equalTo('entrevista', evPointer);
      evQuery.include('profesor');
      evQuery.include('alumno');
      evQuery.limit(1000);
      const evaluaciones = await evQuery.find({ useMasterKey: true });

      const porProfesor: Record<string, { name: string; total: number; evaluadas: number }> = {};

      for (const ev of evaluaciones) {
        // Only count evaluaciones for current equipo members
        const alumnoId = ev.getAlumno()?.id;
        if (!alumnoId || !currentMiembroIds.has(alumnoId)) continue;

        const prof = ev.getProfesor();
        if (prof) {
          const pid = prof.id;
          if (!porProfesor[pid]) {
            porProfesor[pid] = { name: prof.get('name') ?? '', total: 0, evaluadas: 0 };
          }
          porProfesor[pid].total++;
          // Complete = has both valorAsignado AND comentario
          if (ev.getValorAsignado() && ev.getComentario()) {
            porProfesor[pid].evaluadas++;
          }
        }
      }

      progress[ent.id!] = { porProfesor };
    }

    // Fetch periodos for liberar modal
    const planQuery = BaseModel.queryActive<PlanEvaluacion>('PlanEvaluacion');
    planQuery.equalTo('grupo', grupoPointer);
    planQuery.limit(1);
    const plans = await planQuery.find({ useMasterKey: true });
    const periodoNames: string[] = [];
    if (plans.length > 0) {
      const periodos: PeriodoConfig[] = plans[0].getPeriodos();
      for (const p of periodos) {
        periodoNames.push(p.nombre);
      }
    }

    res.json({ status: 'ok', progress, periodoNames });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener progreso' });
  }
}

async function checkWeeklyConflict(
  grupoId: string,
  fecha: string,
  competenciaIds: string[],
  excludeId?: string,
): Promise<string[]> {
  const { monday, sunday } = getWeekBounds(fecha);

  const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;
  const query = BaseModel.queryActive<Entrevista>('Entrevista');
  query.equalTo('grupo' as any, grupoPointer as any);
  query.greaterThanOrEqualTo('fecha' as any, monday as any);
  query.lessThanOrEqualTo('fecha' as any, sunday as any);
  query.include('competencias');

  if (excludeId) {
    query.notEqualTo('objectId' as any, excludeId as any);
  }

  const existing = await query.find({ useMasterKey: true });

  const usedCompetenciaIds = new Set<string>();
  for (const e of existing) {
    for (const c of e.getCompetencias()) {
      usedCompetenciaIds.add(c.id);
    }
  }

  const conflicting: string[] = [];
  for (const id of competenciaIds) {
    if (usedCompetenciaIds.has(id)) {
      conflicting.push(id);
    }
  }

  // Resolve names for the error message
  if (conflicting.length > 0) {
    const names: string[] = [];
    for (const e of existing) {
      for (const c of e.getCompetencias()) {
        if (conflicting.includes(c.id)) {
          const name = c.get('competencia') ?? c.id;
          if (!names.includes(name)) names.push(name);
        }
      }
    }
    return names;
  }

  return [];
}

async function refetchEntrevista(id: string): Promise<Entrevista> {
  const query = new Parse.Query<Entrevista>('Entrevista');
  query.include('equipo');
  query.include('equipo.miembros');
  query.include('profesores');
  query.include('competencias');
  return query.get(id, { useMasterKey: true });
}
