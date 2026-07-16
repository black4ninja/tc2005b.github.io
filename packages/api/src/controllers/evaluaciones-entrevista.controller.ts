import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { Entrevista } from '../models/Entrevista.js';
import { EvaluacionEntrevista } from '../models/EvaluacionEntrevista.js';
import { AppUser } from '../models/AppUser.js';
import { Competencia } from '../models/Competencia.js';
import { CompetenciaAlumno } from '../models/CompetenciaAlumno.js';
import { PlanEvaluacion, type PeriodoConfig } from '../models/PlanEvaluacion.js';
import { Grupo } from '../models/Grupo.js';
import { scopeGrupo } from '../services/grupo-admin.service.js';

const NUMBER_TO_VALOR: Record<number, string> = {
  0: '',
  15: 'Incipiente A (15%)',
  70: 'Básico (70%)',
  85: 'Sólido (85%)',
  100: 'Destacado (100%)',
};

function numberToValor(num: unknown): string {
  if (typeof num === 'number') return NUMBER_TO_VALOR[num] ?? '';
  if (typeof num === 'string') return num;
  return '';
}

async function fetchEntrevistaFull(entrevistaId: string, grupoId: string): Promise<Entrevista> {
  const query = new Parse.Query<Entrevista>('Entrevista');
  scopeGrupo(query, grupoId); // la entrevista debe ser DE este grupo (candado profesor)
  query.include('equipo');
  query.include('equipo.miembros');
  query.include('profesores');
  query.include('competencias');
  return query.get(entrevistaId, { useMasterKey: true });
}

async function fetchEvaluaciones(entrevistaId: string): Promise<EvaluacionEntrevista[]> {
  const pointer = Entrevista.createWithoutData(entrevistaId);
  const query = BaseModel.queryActive<EvaluacionEntrevista>('EvaluacionEntrevista');
  query.equalTo('entrevista', pointer);
  query.include('alumno');
  query.include('competencia');
  query.include('profesor');
  query.limit(1000);
  return query.find({ useMasterKey: true });
}

interface PeriodoMapResult {
  periodoMap: Record<string, string>;
  periodoNames: string[];
}

async function fetchPeriodoMapAndNames(grupoId: string): Promise<PeriodoMapResult> {
  const grupoPointer = Grupo.createWithoutData(grupoId) as Grupo;
  const query = BaseModel.queryActive<PlanEvaluacion>('PlanEvaluacion');
  query.equalTo('grupo', grupoPointer);
  query.limit(1);
  const results = await query.find({ useMasterKey: true });
  if (results.length === 0) return { periodoMap: {}, periodoNames: [] };

  const plan = results[0];
  const periodos: PeriodoConfig[] = plan.getPeriodos();
  const map: Record<string, string> = {};
  const names: string[] = [];
  for (const periodo of periodos) {
    names.push(periodo.nombre);
    for (const compId of periodo.competencias) {
      map[compId] = periodo.nombre;
    }
  }
  return { periodoMap: map, periodoNames: names };
}

interface CompAlumnoEntry {
  id: string;
  valorPeriodo1: string;
  valorPeriodo2: string;
  retroPeriodo1: string;
  retroPeriodo2: string;
  evidencias: string[];
}

async function fetchCompetenciasAlumnoMap(
  grupoId: string,
  alumnoIds: string[]
): Promise<Record<string, CompAlumnoEntry>> {
  if (alumnoIds.length === 0) return {};

  const grupoPointer = Grupo.createWithoutData(grupoId) as Grupo;
  const alumnoPointers = alumnoIds.map((id) => AppUser.createWithoutData(id));

  const query = BaseModel.queryActive<CompetenciaAlumno>('CompetenciaAlumno');
  query.equalTo('grupo', grupoPointer);
  query.containedIn('alumno', alumnoPointers);
  query.include('competencia');
  query.limit(1000);
  const results = await query.find({ useMasterKey: true });

  const map: Record<string, CompAlumnoEntry> = {};
  for (const ca of results) {
    const alumnoId = ca.getAlumno()?.id;
    const compId = ca.getCompetencia()?.id;
    if (alumnoId && compId) {
      map[`${alumnoId}-${compId}`] = {
        id: ca.id!,
        valorPeriodo1: numberToValor(ca.get('valorPeriodo1')),
        valorPeriodo2: numberToValor(ca.get('valorPeriodo2')),
        retroPeriodo1: ca.getRetroPeriodo1(),
        retroPeriodo2: ca.getRetroPeriodo2(),
        evidencias: ca.getEvidencias(),
      };
    }
  }
  return map;
}

export async function initEvaluaciones(req: Request, res: Response): Promise<void> {
  const { entrevistaId, grupoId } = req.params;

  try {
    const entrevista = await fetchEntrevistaFull(entrevistaId, grupoId);
    const { periodoMap, periodoNames } = await fetchPeriodoMapAndNames(grupoId);

    // Get current equipo members and competencias
    const equipo = entrevista.getEquipo();
    const miembros: AppUser[] = equipo ? (equipo.get('miembros') ?? []) : [];
    const competencias: Competencia[] = entrevista.getCompetencias();
    const currentMiembroIds = new Set(miembros.map((m) => m.id));
    const currentCompIds = new Set(competencias.map((c) => c.id));
    const asignacion = entrevista.getAsignacionProfesores();
    const entrevistaPointer = Entrevista.createWithoutData(entrevistaId) as Entrevista;

    // Check if evaluaciones already exist
    const existing = await fetchEvaluaciones(entrevistaId);
    if (existing.length > 0) {
      // Sync: soft-delete orphaned records (alumnos/competencias no longer in entrevista)
      const toDelete: EvaluacionEntrevista[] = [];
      for (const ev of existing) {
        const alumnoId = ev.getAlumno()?.id;
        const compId = ev.getCompetencia()?.id;
        if (!alumnoId || !currentMiembroIds.has(alumnoId) || !compId || !currentCompIds.has(compId)) {
          ev.softDelete();
          toDelete.push(ev);
        }
      }
      if (toDelete.length > 0) {
        await Parse.Object.saveAll(toDelete, { useMasterKey: true });
      }

      // Sync: create missing records for new alumnos/competencias
      const existingKeys = new Set(
        existing
          .filter((e) => {
            const aId = e.getAlumno()?.id;
            const cId = e.getCompetencia()?.id;
            return aId && currentMiembroIds.has(aId) && cId && currentCompIds.has(cId);
          })
          .map((e) => `${e.getAlumno()!.id}-${e.getCompetencia()!.id}`),
      );

      const toCreate: EvaluacionEntrevista[] = [];
      for (const alumno of miembros) {
        for (const comp of competencias) {
          const key = `${alumno.id}-${comp.id}`;
          if (!existingKeys.has(key)) {
            const eval_ = new EvaluacionEntrevista().initDefaults();
            eval_.setEntrevista(entrevistaPointer);
            eval_.setAlumno(AppUser.createWithoutData(alumno.id) as AppUser);
            eval_.setCompetencia(Competencia.createWithoutData(comp.id) as Competencia);
            eval_.setComentario('');
            const profesorId = asignacion[key];
            if (profesorId) {
              eval_.setProfesor(AppUser.createWithoutData(profesorId) as AppUser);
            }
            toCreate.push(eval_);
          }
        }
      }
      if (toCreate.length > 0) {
        await Parse.Object.saveAll(toCreate, { useMasterKey: true });
      }

      // Re-fetch synced evaluaciones
      const synced = await fetchEvaluaciones(entrevistaId);
      const alumnoIds = [...currentMiembroIds];
      const compAlumnoMap = await fetchCompetenciasAlumnoMap(grupoId, alumnoIds);

      res.json({
        status: 'ok',
        entrevista: entrevista.toSafeJSON(),
        evaluaciones: synced.map((e) => e.toSafeJSON()),
        periodoMap,
        periodoNames,
        compAlumnoMap,
      });
      return;
    }

    // No existing evaluaciones — create all cells: alumno × competencia
    const toSave: EvaluacionEntrevista[] = [];
    for (const alumno of miembros) {
      for (const comp of competencias) {
        const eval_ = new EvaluacionEntrevista().initDefaults();
        eval_.setEntrevista(entrevistaPointer);
        eval_.setAlumno(AppUser.createWithoutData(alumno.id) as AppUser);
        eval_.setCompetencia(Competencia.createWithoutData(comp.id) as Competencia);
        eval_.setComentario('');
        const profesorId = asignacion[`${alumno.id}-${comp.id}`];
        if (profesorId) {
          eval_.setProfesor(AppUser.createWithoutData(profesorId) as AppUser);
        }
        toSave.push(eval_);
      }
    }

    await Parse.Object.saveAll(toSave, { useMasterKey: true });

    // Re-fetch with includes
    const saved = await fetchEvaluaciones(entrevistaId);
    const alumnoIds = miembros.map((m) => m.id);
    const compAlumnoMap = await fetchCompetenciasAlumnoMap(grupoId, alumnoIds);

    res.json({
      status: 'ok',
      entrevista: entrevista.toSafeJSON(),
      evaluaciones: saved.map((e) => e.toSafeJSON()),
      periodoMap,
      periodoNames,
      compAlumnoMap,
    });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Entrevista no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al inicializar evaluaciones' });
  }
}

export async function listEvaluaciones(req: Request, res: Response): Promise<void> {
  const { entrevistaId, grupoId } = req.params;

  try {
    const entrevista = await fetchEntrevistaFull(entrevistaId, grupoId);
    const evaluaciones = await fetchEvaluaciones(entrevistaId);
    const { periodoMap, periodoNames } = await fetchPeriodoMapAndNames(grupoId);

    const alumnoIds = [...new Set(evaluaciones.map((e) => e.getAlumno()?.id).filter(Boolean))] as string[];
    const compAlumnoMap = await fetchCompetenciasAlumnoMap(grupoId, alumnoIds);

    res.json({
      status: 'ok',
      entrevista: entrevista.toSafeJSON(),
      evaluaciones: evaluaciones.map((e) => e.toSafeJSON()),
      periodoMap,
      periodoNames,
      compAlumnoMap,
    });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Entrevista no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al obtener evaluaciones' });
  }
}

export async function updateEvaluacion(req: Request, res: Response): Promise<void> {
  const { evaluacionId, grupoId } = req.params;
  const { comentario, valorAsignado } = req.body;

  try {
    const query = BaseModel.queryActive<EvaluacionEntrevista>('EvaluacionEntrevista');
    query.include('alumno');
    query.include('competencia');
    query.include('profesor');
    query.include('entrevista');
    const evaluacion = await query.get(evaluacionId, { useMasterKey: true });

    // EvaluacionEntrevista no tiene grupo propio: se scope vía su entrevista. Un
    // profesor con acceso al grupo A no debe editar la evaluación de una
    // entrevista de B (candado profesor).
    const entrevista = evaluacion.getEntrevista();
    if ((entrevista as any)?.get('grupo')?.id !== grupoId) {
      res.status(404).json({ status: 'error', message: 'Evaluación no encontrada en este grupo' });
      return;
    }

    // Block editing if entrevista is liberada
    if (entrevista && (entrevista as any).get('liberada') === true) {
      res.status(400).json({ status: 'error', message: 'No se puede editar una evaluación liberada' });
      return;
    }

    if (typeof comentario === 'string') {
      evaluacion.setComentario(comentario);
    }

    if (typeof valorAsignado === 'string') {
      evaluacion.setValorAsignado(valorAsignado);
    }

    await evaluacion.save(null, { useMasterKey: true });

    // Re-fetch with includes
    const refetchQuery = BaseModel.queryActive<EvaluacionEntrevista>('EvaluacionEntrevista');
    refetchQuery.include('alumno');
    refetchQuery.include('competencia');
    refetchQuery.include('profesor');
    const updated = await refetchQuery.get(evaluacion.id!, { useMasterKey: true });

    res.json({
      status: 'ok',
      evaluacion: updated.toSafeJSON(),
    });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Evaluación no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al actualizar evaluación' });
  }
}
