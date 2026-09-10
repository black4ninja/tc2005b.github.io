import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { IndicacionMalla } from '../models/IndicacionMalla.js';
import { Coleccion } from '../models/Coleccion.js';

/**
 * Resuelve la materia a la que pertenece la indicación.
 *
 * `''`/`null` NO se acepta al crear: una indicación sin materia no la vería
 * nadie —el alumno solo recibe las de las materias de su grupo— y quedaría
 * escrita para siempre sin que nadie note que no aparece.
 */
async function resolverColeccion(coleccionId: unknown): Promise<Coleccion | null | 'invalido'> {
  if (typeof coleccionId !== 'string' || !coleccionId) return 'invalido';
  const q = new Parse.Query<Coleccion>('Coleccion');
  q.equalTo('exists' as any, true as any);
  return (await q.get(coleccionId, { useMasterKey: true }).catch(() => null)) ?? 'invalido';
}

export async function listIndicaciones(req: Request, res: Response): Promise<void> {
  try {
    const query = new Parse.Query<IndicacionMalla>('IndicacionMalla');
    query.equalTo('exists' as any, true as any);
    // `?coleccion=<id>` acota a una materia, que es como entra la pantalla de
    // competencias. Sin el filtro salen todas, para poder ver el conjunto.
    const filtro = req.query.coleccion;
    if (typeof filtro === 'string' && filtro) {
      query.equalTo('coleccion' as any, Coleccion.createWithoutData(filtro) as any);
    }
    query.include('coleccion' as any);
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
  const { descripcion, coleccionId } = req.body;

  if (!descripcion || typeof descripcion !== 'string' || descripcion.trim() === '') {
    res.status(400).json({ status: 'error', message: 'La descripción es requerida' });
    return;
  }

  try {
    const coleccion = await resolverColeccion(coleccionId);
    if (coleccion === 'invalido') {
      res.status(400).json({
        status: 'error',
        message: 'Hay que decir de qué materia es la indicación',
      });
      return;
    }

    const indicacion = new IndicacionMalla().initDefaults();
    indicacion.setDescripcion(descripcion.trim());
    indicacion.setColeccion(coleccion);

    await indicacion.save(null, { useMasterKey: true });

    res.status(201).json({ status: 'ok', indicacion: indicacion.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear indicación' });
  }
}

export async function updateIndicacion(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { descripcion, coleccionId } = req.body;

  try {
    const query = BaseModel.queryActive<IndicacionMalla>('IndicacionMalla');
    query.include('coleccion' as any);
    const indicacion = await query.get(id, { useMasterKey: true });

    if (coleccionId !== undefined) {
      const coleccion = await resolverColeccion(coleccionId);
      if (coleccion === 'invalido') {
        res.status(400).json({ status: 'error', message: 'Esa materia no existe' });
        return;
      }
      indicacion.setColeccion(coleccion);
    }

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
