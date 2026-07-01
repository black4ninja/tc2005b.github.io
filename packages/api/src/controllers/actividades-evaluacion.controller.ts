import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { ActividadEvaluacion } from '../models/ActividadEvaluacion.js';

const TIPOS_VALIDOS = [
  'lab', 'lectura', 'ejercicio', 'proyecto', 'evaluacion',
  'trabajo', 'discusion', 'info', 'actividad',
];

export async function listActividadesEvaluacion(_req: Request, res: Response): Promise<void> {
  try {
    const query = new Parse.Query<ActividadEvaluacion>('ActividadEvaluacion');
    query.equalTo('exists' as any, true as any);
    query.ascending('orden');
    const actividades = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      actividades: actividades.map((a) => a.toSafeJSON()),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener actividades de evaluación' });
  }
}

export async function createActividadEvaluacion(req: Request, res: Response): Promise<void> {
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
    // Calculate next orden
    const countQuery = new Parse.Query<ActividadEvaluacion>('ActividadEvaluacion');
    countQuery.equalTo('exists' as any, true as any);
    countQuery.descending('orden');
    countQuery.limit(1);
    const last = await countQuery.first({ useMasterKey: true });
    const nextOrden = last ? last.getOrden() + 1 : 1;

    const act = new ActividadEvaluacion().initDefaults();
    act.setNombre(nombre.trim());
    act.setTipo(tipo);
    act.setAprendizajePlaneado(Number(aprendizajePlaneado) || 0);
    act.setSemanaPlaneada(Number(semanaPlaneada) || 0);
    act.setOrden(nextOrden);

    await act.save(null, { useMasterKey: true });

    res.status(201).json({ status: 'ok', actividad: act.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear actividad de evaluación' });
  }
}

export async function updateActividadEvaluacion(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { nombre, tipo, aprendizajePlaneado, semanaPlaneada } = req.body;

  try {
    const query = BaseModel.queryActive<ActividadEvaluacion>('ActividadEvaluacion');
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

    await act.save(null, { useMasterKey: true });

    res.json({ status: 'ok', actividad: act.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Actividad de evaluación no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al actualizar actividad de evaluación' });
  }
}

export async function deleteActividadEvaluacion(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const query = new Parse.Query<ActividadEvaluacion>('ActividadEvaluacion');
    query.equalTo('exists' as any, true as any);
    const act = await query.get(id, { useMasterKey: true });

    act.softDelete();
    await act.save(null, { useMasterKey: true });

    res.json({ status: 'ok', message: 'Actividad de evaluación eliminada' });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Actividad de evaluación no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al eliminar actividad de evaluación' });
  }
}
