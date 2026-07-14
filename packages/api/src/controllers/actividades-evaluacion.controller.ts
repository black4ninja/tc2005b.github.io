import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { ActividadEvaluacion } from '../models/ActividadEvaluacion.js';
import { coleccionesDeGrupo } from '../services/grupo-colecciones.service.js';

const TIPOS_VALIDOS = [
  'lab', 'lectura', 'ejercicio', 'proyecto', 'evaluacion',
  'trabajo', 'discusion', 'info', 'actividad',
];

/** Resuelve un coleccionId a un pointer VALIDADO. `null` si no existe. */
async function resolverColeccion(coleccionId: string): Promise<Parse.Object | null> {
  const q = new Parse.Query('Coleccion');
  q.equalTo('exists' as any, true as any);
  try {
    return await q.get(coleccionId, { useMasterKey: true });
  } catch {
    return null;
  }
}

/**
 * Lista las plantillas de actividades de evaluación.
 *
 * - `?coleccionId=` → las de esa colección (`sin-coleccion` = las huérfanas).
 * - `?grupoId=`     → las de las colecciones del grupo.
 * - sin parámetros  → todas (la vista global del admin).
 */
export async function listActividadesEvaluacion(req: Request, res: Response): Promise<void> {
  const { coleccionId, grupoId } = req.query;

  try {
    const query = new Parse.Query<ActividadEvaluacion>('ActividadEvaluacion');
    query.equalTo('exists' as any, true as any);
    query.ascending('orden');
    query.include('coleccion' as any);
    query.limit(1000);

    if (typeof grupoId === 'string' && grupoId) {
      const colecciones = await coleccionesDeGrupo(grupoId);
      if (colecciones.length === 0) {
        res.json({ status: 'ok', actividades: [], sinColecciones: true });
        return;
      }
      query.containedIn('coleccion' as any, colecciones as any);
    } else if (typeof coleccionId === 'string' && coleccionId) {
      if (coleccionId === 'sin-coleccion') {
        query.doesNotExist('coleccion' as any);
      } else {
        const coleccion = await resolverColeccion(coleccionId);
        if (!coleccion) {
          res.status(404).json({ status: 'error', message: 'Colección no encontrada' });
          return;
        }
        query.equalTo('coleccion' as any, coleccion as any);
      }
    }

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
  const { nombre, tipo, aprendizajePlaneado, semanaPlaneada, coleccionId } = req.body;

  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    res.status(400).json({ status: 'error', message: 'El nombre es requerido' });
    return;
  }
  if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
    res.status(400).json({ status: 'error', message: 'El tipo es inválido' });
    return;
  }

  try {
    // Sin colección, la plantilla no se copia a ningún grupo: no sirve de nada.
    if (!coleccionId || typeof coleccionId !== 'string') {
      res.status(400).json({ status: 'error', message: 'La colección es requerida: sin ella la actividad no se copia a ningún grupo' });
      return;
    }
    const coleccion = await resolverColeccion(coleccionId);
    if (!coleccion) {
      res.status(400).json({ status: 'error', message: 'La colección indicada no existe' });
      return;
    }

    // El orden es POR COLECCIÓN. Un contador global intercalaría los órdenes de
    // dos materias y `copiarPlantilla` los estamparía mezclados en el grupo.
    const countQuery = new Parse.Query<ActividadEvaluacion>('ActividadEvaluacion');
    countQuery.equalTo('exists' as any, true as any);
    countQuery.equalTo('coleccion' as any, coleccion as any);
    countQuery.descending('orden');
    countQuery.limit(1);
    const last = await countQuery.first({ useMasterKey: true });
    const nextOrden = last ? last.getOrden() + 1 : 1;

    const act = new ActividadEvaluacion().initDefaults();
    act.setColeccion(coleccion);
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
  const { nombre, tipo, aprendizajePlaneado, semanaPlaneada, coleccionId } = req.body;

  try {
    const query = BaseModel.queryActive<ActividadEvaluacion>('ActividadEvaluacion');
    query.include('coleccion' as any);
    const act = await query.get(id, { useMasterKey: true });

    if (coleccionId !== undefined) {
      if (!coleccionId || typeof coleccionId !== 'string') {
        res.status(400).json({ status: 'error', message: 'La colección es requerida' });
        return;
      }
      const coleccion = await resolverColeccion(coleccionId);
      if (!coleccion) {
        res.status(400).json({ status: 'error', message: 'La colección indicada no existe' });
        return;
      }
      act.setColeccion(coleccion);
    }

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
