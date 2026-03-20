import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { Actividad } from '../models/Actividad.js';

interface ReorderUpdate {
  actividadId: string;
  dia: string;
  isPrevio: boolean;
  orden: number;
}

export async function reorderActividades(req: Request, res: Response): Promise<void> {
  const { updates } = req.body as { updates?: ReorderUpdate[] };

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    res.status(400).json({ status: 'error', message: 'Se requiere un array de updates' });
    return;
  }

  const validDias = ['lunes', 'martes', 'miercoles', 'jueves'];
  for (const u of updates) {
    if (!u.actividadId || !validDias.includes(u.dia) || typeof u.orden !== 'number') {
      res.status(400).json({ status: 'error', message: `Update inválido: ${JSON.stringify(u)}` });
      return;
    }
  }

  try {
    const ids = updates.map((u) => u.actividadId);
    const query = new Parse.Query<Actividad>('Actividad');
    query.containedIn('objectId', ids);
    query.limit(ids.length);
    const actividades = await query.find({ useMasterKey: true });

    if (actividades.length !== ids.length) {
      const foundIds = new Set(actividades.map((a) => a.id));
      const missing = ids.filter((id) => !foundIds.has(id));
      res.status(404).json({ status: 'error', message: `Actividades no encontradas: ${missing.join(', ')}` });
      return;
    }

    const actMap = new Map<string, Actividad>(actividades.map((a) => [a.id!, a]));

    for (const u of updates) {
      const act = actMap.get(u.actividadId)!;
      act.setDia(u.dia);
      act.setIsPrevio(u.isPrevio);
      act.setOrden(u.orden);
    }

    await Parse.Object.saveAll(actividades, { useMasterKey: true });

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Error reordering actividades:', error);
    res.status(500).json({ status: 'error', message: 'Error al reordenar actividades' });
  }
}
