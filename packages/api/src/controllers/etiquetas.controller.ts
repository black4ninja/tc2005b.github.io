import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { Etiqueta } from '../models/Etiqueta.js';

// ─── Admin endpoints ────────────────────────────────────────────

export async function listEtiquetas(_req: Request, res: Response): Promise<void> {
  try {
    const query = BaseModel.queryActive<Etiqueta>('Etiqueta');
    query.ascending('nombre');
    query.limit(500);
    const etiquetas = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      etiquetas: etiquetas.map((e) => e.toSafeJSON()),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener etiquetas' });
  }
}

export async function createEtiqueta(req: Request, res: Response): Promise<void> {
  const { nombre, color, textColor } = req.body;

  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    res.status(400).json({ status: 'error', message: 'El nombre es requerido' });
    return;
  }

  try {
    // Check uniqueness
    const existing = BaseModel.queryActive<Etiqueta>('Etiqueta');
    existing.equalTo('nombre' as any, nombre.trim() as any);
    const found = await existing.first({ useMasterKey: true });
    if (found) {
      res.status(409).json({ status: 'error', message: 'Ya existe una etiqueta con ese nombre' });
      return;
    }

    const etiqueta = new Etiqueta().initDefaults();
    etiqueta.setNombre(nombre.trim());
    if (color) etiqueta.setColor(color);
    if (textColor) etiqueta.setTextColor(textColor);

    await etiqueta.save(null, { useMasterKey: true });

    res.status(201).json({ status: 'ok', etiqueta: etiqueta.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear etiqueta' });
  }
}

export async function updateEtiqueta(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { nombre, color, textColor } = req.body;

  try {
    const query = BaseModel.queryActive<Etiqueta>('Etiqueta');
    const etiqueta = await query.get(id, { useMasterKey: true });

    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || nombre.trim() === '') {
        res.status(400).json({ status: 'error', message: 'El nombre no puede estar vacío' });
        return;
      }
      // Check uniqueness if changed
      if (nombre.trim() !== etiqueta.getNombre()) {
        const existing = BaseModel.queryActive<Etiqueta>('Etiqueta');
        existing.equalTo('nombre' as any, nombre.trim() as any);
        existing.notEqualTo('objectId' as any, id as any);
        const found = await existing.first({ useMasterKey: true });
        if (found) {
          res.status(409).json({ status: 'error', message: 'Ya existe una etiqueta con ese nombre' });
          return;
        }
      }
      etiqueta.setNombre(nombre.trim());
    }

    if (color !== undefined) etiqueta.setColor(color);
    if (textColor !== undefined) etiqueta.setTextColor(textColor);

    await etiqueta.save(null, { useMasterKey: true });

    res.json({ status: 'ok', etiqueta: etiqueta.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Etiqueta no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al actualizar etiqueta' });
  }
}

export async function deleteEtiqueta(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const query = BaseModel.queryActive<Etiqueta>('Etiqueta');
    const etiqueta = await query.get(id, { useMasterKey: true });

    etiqueta.softDelete();
    await etiqueta.save(null, { useMasterKey: true });

    res.json({ status: 'ok', message: 'Etiqueta eliminada' });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Etiqueta no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al eliminar etiqueta' });
  }
}
