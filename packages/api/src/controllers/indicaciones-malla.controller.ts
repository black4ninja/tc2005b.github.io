import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { IndicacionMalla } from '../models/IndicacionMalla.js';

export async function listIndicaciones(_req: Request, res: Response): Promise<void> {
  try {
    const query = new Parse.Query<IndicacionMalla>('IndicacionMalla');
    query.equalTo('exists' as any, true as any);
    query.descending('createdAt');
    const indicaciones = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      indicaciones: indicaciones.map((i) => i.toSafeJSON()),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener indicaciones' });
  }
}

export async function createIndicacion(req: Request, res: Response): Promise<void> {
  const { descripcion } = req.body;

  if (!descripcion || typeof descripcion !== 'string' || descripcion.trim() === '') {
    res.status(400).json({ status: 'error', message: 'La descripción es requerida' });
    return;
  }

  try {
    const indicacion = new IndicacionMalla().initDefaults();
    indicacion.setDescripcion(descripcion.trim());

    await indicacion.save(null, { useMasterKey: true });

    res.status(201).json({ status: 'ok', indicacion: indicacion.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear indicación' });
  }
}

export async function updateIndicacion(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { descripcion } = req.body;

  try {
    const query = BaseModel.queryActive<IndicacionMalla>('IndicacionMalla');
    const indicacion = await query.get(id, { useMasterKey: true });

    if (descripcion !== undefined) {
      if (typeof descripcion !== 'string' || descripcion.trim() === '') {
        res.status(400).json({ status: 'error', message: 'La descripción no puede estar vacía' });
        return;
      }
      indicacion.setDescripcion(descripcion.trim());
    }

    await indicacion.save(null, { useMasterKey: true });

    res.json({ status: 'ok', indicacion: indicacion.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Indicación no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al actualizar indicación' });
  }
}

export async function deleteIndicacion(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const query = new Parse.Query<IndicacionMalla>('IndicacionMalla');
    query.equalTo('exists' as any, true as any);
    const indicacion = await query.get(id, { useMasterKey: true });

    indicacion.softDelete();
    await indicacion.save(null, { useMasterKey: true });

    res.json({ status: 'ok', message: 'Indicación eliminada' });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Indicación no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al eliminar indicación' });
  }
}
