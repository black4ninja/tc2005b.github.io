import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { ActividadEvaluacionGrupo } from '../models/ActividadEvaluacionGrupo.js';
import { ActividadEvaluacion } from '../models/ActividadEvaluacion.js';
import { ActividadEvaluacionAlumno } from '../models/ActividadEvaluacionAlumno.js';
import { PlanEvaluacion } from '../models/PlanEvaluacion.js';
import { Grupo } from '../models/Grupo.js';

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
