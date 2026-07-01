import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { ActividadEvaluacionGrupo } from '../models/ActividadEvaluacionGrupo.js';
import { ActividadEvaluacion } from '../models/ActividadEvaluacion.js';
import { ActividadEvaluacionAlumno } from '../models/ActividadEvaluacionAlumno.js';
import { PlanEvaluacion } from '../models/PlanEvaluacion.js';
import { Grupo } from '../models/Grupo.js';
import { AppUser } from '../models/AppUser.js';
import { getAlumnosDeGrupo } from '../services/grupo-alumno.service.js';

const TIPOS_VALIDOS = [
  'lab', 'lectura', 'ejercicio', 'proyecto', 'evaluacion',
  'trabajo', 'discusion', 'info', 'actividad',
];

export async function listActividadesEvaluacionGrupo(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;
    const query = new Parse.Query<ActividadEvaluacionGrupo>('ActividadEvaluacionGrupo');
    query.equalTo('exists' as any, true as any);
    query.equalTo('grupo' as any, grupoPointer as any);
    query.ascending('orden');
    const actividades = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      actividades: actividades.map((a) => a.toSafeJSON()),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener actividades de evaluación del grupo' });
  }
}

export async function createActividadEvaluacionGrupo(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const { nombre, tipo, aprendizajePlaneado, semanaPlaneada } = req.body;

  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    res.status(400).json({ status: 'error', message: 'El nombre es requerido' });
    return;
  }
  if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
    res.status(400).json({ status: 'error', message: 'El tipo es inválido' });
    return;
  }

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;

    // Calculate next orden for this grupo
    const countQuery = new Parse.Query<ActividadEvaluacionGrupo>('ActividadEvaluacionGrupo');
    countQuery.equalTo('exists' as any, true as any);
    countQuery.equalTo('grupo' as any, grupoPointer as any);
    countQuery.descending('orden');
    countQuery.limit(1);
    const last = await countQuery.first({ useMasterKey: true });
    const nextOrden = last ? last.getOrden() + 1 : 1;

    const act = new ActividadEvaluacionGrupo().initDefaults();
    act.setNombre(nombre.trim());
    act.setTipo(tipo);
    act.setAprendizajePlaneado(Number(aprendizajePlaneado) || 0);
    act.setSemanaPlaneada(Number(semanaPlaneada) || 0);
    act.setOrden(nextOrden);
    act.setGrupo(grupoPointer);

    await act.save(null, { useMasterKey: true });

    res.status(201).json({ status: 'ok', actividad: act.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear actividad de evaluación del grupo' });
  }
}

export async function updateActividadEvaluacionGrupo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { nombre, tipo, aprendizajePlaneado, semanaPlaneada, congelada } = req.body;

  try {
    const query = BaseModel.queryActive<ActividadEvaluacionGrupo>('ActividadEvaluacionGrupo');
    const act = await query.get(id, { useMasterKey: true });

    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || nombre.trim() === '') {
        res.status(400).json({ status: 'error', message: 'El nombre no puede estar vacío' });
        return;
      }
      act.setNombre(nombre.trim());
    }
    if (tipo !== undefined) {
      if (!TIPOS_VALIDOS.includes(tipo)) {
        res.status(400).json({ status: 'error', message: 'El tipo es inválido' });
        return;
      }
      act.setTipo(tipo);
    }
    if (aprendizajePlaneado !== undefined) act.setAprendizajePlaneado(Number(aprendizajePlaneado) || 0);
    if (semanaPlaneada !== undefined) act.setSemanaPlaneada(Number(semanaPlaneada) || 0);
    if (congelada !== undefined) {
      if (typeof congelada !== 'boolean') {
        res.status(400).json({ status: 'error', message: 'congelada debe ser booleano' });
        return;
      }
      act.setCongelada(congelada);
    }

    await act.save(null, { useMasterKey: true });

    res.json({ status: 'ok', actividad: act.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Actividad de evaluación no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al actualizar actividad de evaluación del grupo' });
  }
}

export async function deleteActividadEvaluacionGrupo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const query = new Parse.Query<ActividadEvaluacionGrupo>('ActividadEvaluacionGrupo');
    query.equalTo('exists' as any, true as any);
    query.include('grupo');
    const act = await query.get(id, { useMasterKey: true });
    const grupo = act.getGrupo();

    // 1. Soft-delete the actividad
    act.softDelete();
    await act.save(null, { useMasterKey: true });

    // 2. Cascade: soft-delete ActividadEvaluacionAlumno records
    const alumnoActQuery = new Parse.Query<ActividadEvaluacionAlumno>('ActividadEvaluacionAlumno');
    alumnoActQuery.equalTo('actividadGrupo', act);
    alumnoActQuery.equalTo('active' as any, true as any);
    alumnoActQuery.limit(5000);
    const alumnoActs = await alumnoActQuery.find({ useMasterKey: true });

    if (alumnoActs.length > 0) {
      for (const rec of alumnoActs) {
        rec.softDelete();
      }
      await Parse.Object.saveAll(alumnoActs, { useMasterKey: true });
    }

    // 3. Cascade: remove actividadId from PlanEvaluacion periodos
    if (grupo) {
      const planQuery = new Parse.Query<PlanEvaluacion>('PlanEvaluacion');
      planQuery.equalTo('grupo', grupo);
      planQuery.equalTo('active' as any, true as any);
      const plan = await planQuery.first({ useMasterKey: true });

      if (plan) {
        const periodos = plan.getPeriodos();
        let changed = false;
        for (const periodo of periodos) {
          const before = periodo.actividades.length;
          periodo.actividades = periodo.actividades.filter((aid) => aid !== id);
          if (periodo.actividades.length !== before) changed = true;
        }
        if (changed) {
          plan.setPeriodos(periodos);
          await plan.save(null, { useMasterKey: true });
        }
      }
    }

    res.json({ status: 'ok', message: 'Actividad de evaluación eliminada' });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Actividad de evaluación no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al eliminar actividad de evaluación del grupo' });
  }
}

export async function getCompletionStats(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;

    // Total de alumnos activos en el grupo
    const alumnos = await getAlumnosDeGrupo(grupoId);
    const totalAlumnos = alumnos.length;

    // Solo registros con semanaCompletada > 0 (i.e. el alumno marcó algo)
    const recQuery = new Parse.Query<ActividadEvaluacionAlumno>('ActividadEvaluacionAlumno');
    recQuery.equalTo('exists' as any, true as any);
    recQuery.equalTo('grupo' as any, grupoPointer as any);
    recQuery.greaterThan('semanaCompletada' as any, 0 as any);
    recQuery.select(['actividadGrupo'] as any);
    recQuery.limit(10000);
    const records = await recQuery.find({ useMasterKey: true });

    const stats: Record<string, number> = {};
    for (const r of records) {
      const ag = r.get('actividadGrupo');
      const id = ag?.id ?? ag?.objectId;
      if (!id) continue;
      stats[id] = (stats[id] ?? 0) + 1;
    }

    res.json({ status: 'ok', totalAlumnos, stats });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener estadísticas de completado' });
  }
}

export async function getActividadAlumnosProgreso(req: Request, res: Response): Promise<void> {
  const { grupoId, id: actividadId } = req.params;

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;

    // Verificar que la actividad existe y pertenece al grupo
    const actQuery = new Parse.Query<ActividadEvaluacionGrupo>('ActividadEvaluacionGrupo');
    actQuery.equalTo('exists' as any, true as any);
    actQuery.equalTo('grupo' as any, grupoPointer as any);
    const actividad = await actQuery.get(actividadId, { useMasterKey: true }).catch(() => null);
    if (!actividad) {
      res.status(404).json({ status: 'error', message: 'Actividad no encontrada en este grupo' });
      return;
    }

    const alumnos = await getAlumnosDeGrupo(grupoId);

    // Buscar todos los registros de esta actividad para los alumnos del grupo
    const recQuery = new Parse.Query<ActividadEvaluacionAlumno>('ActividadEvaluacionAlumno');
    recQuery.equalTo('exists' as any, true as any);
    recQuery.equalTo('grupo' as any, grupoPointer as any);
    recQuery.equalTo('actividadGrupo' as any, actividad as any);
    recQuery.limit(10000);
    const registros = await recQuery.find({ useMasterKey: true });

    const byAlumnoId = new Map<string, ActividadEvaluacionAlumno>();
    for (const r of registros) {
      const a = r.getAlumno() as AppUser | undefined;
      if (a?.id) byAlumnoId.set(a.id, r);
    }

    const filas = alumnos.map(({ alumno }) => {
      const reg = byAlumnoId.get(alumno.id);
      return {
        alumnoId: alumno.id,
        name: alumno.get('name') ?? '',
        email: alumno.get('email') ?? '',
        matricula: alumno.get('matricula') ?? '',
        registroId: reg?.id ?? null,
        aprendizajePlaneado: reg?.getAprendizajePlaneado() ?? actividad.getAprendizajePlaneado(),
        aprendizajeGanado: reg?.getAprendizajeGanado() ?? 0,
        semanaCompletada: reg?.getSemanaCompletada() ?? 0,
        observaciones: reg?.getObservaciones() ?? '',
        completada: (reg?.getSemanaCompletada() ?? 0) > 0,
      };
    });

    res.json({
      status: 'ok',
      actividad: actividad.toSafeJSON(),
      totalAlumnos: alumnos.length,
      completados: filas.filter((f) => f.completada).length,
      alumnos: filas,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener progreso de alumnos' });
  }
}

export async function bulkCongelarActividades(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const { actividadIds, congelada } = req.body;

  if (!Array.isArray(actividadIds) || actividadIds.length === 0) {
    res.status(400).json({ status: 'error', message: 'actividadIds debe ser un arreglo no vacío' });
    return;
  }
  if (!actividadIds.every((id) => typeof id === 'string' && id.length > 0)) {
    res.status(400).json({ status: 'error', message: 'Todos los actividadIds deben ser strings no vacíos' });
    return;
  }
  if (typeof congelada !== 'boolean') {
    res.status(400).json({ status: 'error', message: 'congelada debe ser booleano' });
    return;
  }

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;

    // Fetch only actividades que pertenezcan a este grupo y estén en la lista pedida.
    // Esta query es la garantía contra congelar actividades de otros grupos.
    const query = new Parse.Query<ActividadEvaluacionGrupo>('ActividadEvaluacionGrupo');
    query.equalTo('exists' as any, true as any);
    query.equalTo('grupo' as any, grupoPointer as any);
    query.containedIn('objectId' as any, actividadIds as any);
    query.limit(actividadIds.length);
    const acts = await query.find({ useMasterKey: true });

    // IDs huérfanos: pueden existir cuando una actividad fue soft-deleted pero su id sigue
    // en PlanEvaluacion.periodos[].actividades, o si el plan referencia ids inexistentes.
    // No es un error fatal — procesamos las válidas e informamos cuáles se omitieron.
    const foundIds = new Set(acts.map((a) => a.id));
    const skippedIds = actividadIds.filter((id) => !foundIds.has(id));

    if (acts.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Ninguna de las actividades indicadas existe en este grupo',
        skippedIds,
      });
      return;
    }

    for (const act of acts) {
      act.setCongelada(congelada);
    }
    await Parse.Object.saveAll(acts, { useMasterKey: true });

    res.json({
      status: 'ok',
      updated: acts.length,
      requested: actividadIds.length,
      skippedIds,
      congelada,
      actividadIds: acts.map((a) => a.id),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al actualizar estado de congelada en lote' });
  }
}

export async function copiarPlantilla(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;

    // Verify grupo doesn't already have actividades
    const existQuery = new Parse.Query<ActividadEvaluacionGrupo>('ActividadEvaluacionGrupo');
    existQuery.equalTo('exists' as any, true as any);
    existQuery.equalTo('grupo' as any, grupoPointer as any);
    const existCount = await existQuery.count({ useMasterKey: true });
    if (existCount > 0) {
      res.status(409).json({ status: 'error', message: 'El grupo ya tiene actividades de evaluación' });
      return;
    }

    // Get all global template actividades
    const plantillaQuery = new Parse.Query<ActividadEvaluacion>('ActividadEvaluacion');
    plantillaQuery.equalTo('exists' as any, true as any);
    plantillaQuery.ascending('orden');
    plantillaQuery.limit(1000);
    const plantilla = await plantillaQuery.find({ useMasterKey: true });

    if (plantilla.length === 0) {
      res.status(404).json({ status: 'error', message: 'No hay actividades de evaluación en la plantilla global' });
      return;
    }

    // Create copies for this grupo
    const copies = plantilla.map((original) => {
      const copy = new ActividadEvaluacionGrupo().initDefaults();
      copy.setNombre(original.getNombre());
      copy.setTipo(original.getTipo());
      copy.setAprendizajePlaneado(original.getAprendizajePlaneado());
      copy.setSemanaPlaneada(original.getSemanaPlaneada());
      copy.setOrden(original.getOrden());
      copy.setGrupo(grupoPointer);
      return copy;
    });

    await Parse.Object.saveAll(copies, { useMasterKey: true });

    res.status(201).json({
      status: 'ok',
      actividades: copies.map((a) => a.toSafeJSON()),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al copiar plantilla de evaluación' });
  }
}
