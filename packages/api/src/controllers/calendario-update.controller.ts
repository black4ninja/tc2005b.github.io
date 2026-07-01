import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { Actividad } from '../models/Actividad.js';

const VALID_TIPOS = [
  'lab', 'lectura', 'ejercicio', 'proyecto',
  'evaluacion', 'break', 'asueto', 'trabajo',
  'discusion', 'info',
];

export async function updateActividad(req: Request, res: Response): Promise<void> {
  const { actividadId } = req.params;
  const {
    tipo, titulo, descripcion, enlace, externo,
    duracion, fechaEntrega, enlacesExtra,
  } = req.body;

  try {
    const query = new Parse.Query<Actividad>('Actividad');
    const act = await query.get(actividadId, { useMasterKey: true });

    if (!act.isActive()) {
      res.status(404).json({ status: 'error', message: 'Actividad no encontrada' });
      return;
    }

    if (tipo !== undefined) {
      if (!VALID_TIPOS.includes(tipo)) {
        res.status(400).json({ status: 'error', message: `tipo inválido: ${tipo}` });
        return;
      }
      act.setTipo(tipo);
    }

    // For optional string fields: empty string → unset, non-empty → set
    if (titulo !== undefined) {
      if (titulo === '') act.unset('titulo');
      else act.setTitulo(titulo);
    }
    if (descripcion !== undefined) {
      if (descripcion === '') act.unset('descripcion');
      else act.setDescripcion(descripcion);
    }
    if (enlace !== undefined) {
      if (enlace === '') act.unset('enlace');
      else act.setEnlace(enlace);
    }
    if (typeof externo === 'boolean') act.setExterno(externo);
    if (duracion !== undefined) {
      if (duracion === '') act.unset('duracion');
      else act.setDuracion(duracion);
    }
    if (fechaEntrega !== undefined) {
      if (fechaEntrega === '') act.unset('fechaEntrega');
      else act.setFechaEntrega(fechaEntrega);
    }
    if (enlacesExtra !== undefined && Array.isArray(enlacesExtra)) {
      act.setEnlacesExtra(enlacesExtra);
    }

    await act.save(null, { useMasterKey: true });

    res.json({ status: 'ok', actividad: act.toSafeJSON() });
  } catch (error) {
    console.error('Error updating actividad:', error);
    res.status(500).json({ status: 'error', message: 'Error al actualizar actividad' });
  }
}

export async function deleteActividad(req: Request, res: Response): Promise<void> {
  const { actividadId } = req.params;

  try {
    const query = new Parse.Query<Actividad>('Actividad');
    const act = await query.get(actividadId, { useMasterKey: true });

    if (!act.isActive()) {
      res.status(404).json({ status: 'error', message: 'Actividad no encontrada' });
      return;
    }

    act.softDelete();
    await act.save(null, { useMasterKey: true });

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Error deleting actividad:', error);
    res.status(500).json({ status: 'error', message: 'Error al eliminar actividad' });
  }
}
