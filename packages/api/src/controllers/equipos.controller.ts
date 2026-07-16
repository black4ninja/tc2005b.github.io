import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { Equipo } from '../models/Equipo.js';
import { Grupo } from '../models/Grupo.js';
import { AppUser } from '../models/AppUser.js';
import { scopeGrupo } from '../services/grupo-admin.service.js';
import { alumnoIdsDeGrupo } from '../services/grupo-alumno.service.js';

/**
 * ids de `miembros` del body → pointers VALIDADOS: cada uno debe ser alumno del
 * grupo. Evita fugar/corromper con alumnos de otro grupo. 'invalido' = alguno no
 * es del grupo (400); null = no-array (se ignora, no cambia miembros).
 */
async function resolverMiembros(
  miembros: unknown,
  grupoId: string,
): Promise<AppUser[] | 'invalido' | null> {
  if (!Array.isArray(miembros)) return null;
  const ids = [...new Set(miembros.filter((s): s is string => typeof s === 'string' && s.trim() !== ''))];
  if (ids.length === 0) return [];
  const delGrupo = await alumnoIdsDeGrupo(grupoId);
  if (ids.some((id) => !delGrupo.has(id))) return 'invalido';
  return ids.map((id) => Parse.Object.extend('AppUser').createWithoutData(id) as AppUser);
}

export async function listEquipos(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;
    const query = BaseModel.queryActive<Equipo>('Equipo');
    query.equalTo('grupo' as any, grupoPointer as any);
    query.include('miembros');
    query.descending('createdAt');
    const equipos = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      equipos: equipos.map((e) => e.toSafeJSON()),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener equipos' });
  }
}

export async function createEquipo(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const { nombre, repositorio, miembros } = req.body;

  if (!nombre) {
    res.status(400).json({ status: 'error', message: 'El nombre es requerido' });
    return;
  }

  try {
    const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId) as Grupo;
    const equipo = new Equipo().initDefaults();
    equipo.setNombre(nombre.trim());
    equipo.setRepositorio((repositorio ?? '').trim());
    equipo.setGrupo(grupoPointer);

    const miembrosPtrs = await resolverMiembros(miembros, grupoId);
    if (miembrosPtrs === 'invalido') {
      res.status(400).json({ status: 'error', message: 'Algún miembro no es alumno de este grupo' });
      return;
    }
    equipo.setMiembros(miembrosPtrs ?? []);

    await equipo.save(null, { useMasterKey: true });

    // Re-fetch with included miembros for full response
    const query = new Parse.Query<Equipo>('Equipo');
    query.include('miembros');
    const saved = await query.get(equipo.id!, { useMasterKey: true });

    res.status(201).json({
      status: 'ok',
      equipo: saved.toSafeJSON(),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear equipo' });
  }
}

export async function updateEquipo(req: Request, res: Response): Promise<void> {
  const { equipoId, grupoId } = req.params;
  const { nombre, repositorio, miembros } = req.body;

  try {
    const query = BaseModel.queryActive<Equipo>('Equipo');
    scopeGrupo(query, grupoId); // el equipo debe ser DE este grupo (candado profesor)
    query.include('miembros');
    const equipo = await query.get(equipoId, { useMasterKey: true });

    if (nombre !== undefined) equipo.setNombre(nombre.trim());
    if (repositorio !== undefined) equipo.setRepositorio(repositorio.trim());
    const miembrosPtrs = await resolverMiembros(miembros, grupoId);
    if (miembrosPtrs === 'invalido') {
      res.status(400).json({ status: 'error', message: 'Algún miembro no es alumno de este grupo' });
      return;
    }
    if (miembrosPtrs) equipo.setMiembros(miembrosPtrs);

    await equipo.save(null, { useMasterKey: true });

    // Re-fetch with included miembros
    const refetchQuery = new Parse.Query<Equipo>('Equipo');
    refetchQuery.include('miembros');
    const saved = await refetchQuery.get(equipo.id!, { useMasterKey: true });

    res.json({ status: 'ok', equipo: saved.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Equipo no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al actualizar equipo' });
  }
}

export async function deleteEquipo(req: Request, res: Response): Promise<void> {
  const { equipoId, grupoId } = req.params;

  try {
    const query = new Parse.Query<Equipo>('Equipo');
    query.equalTo('exists' as any, true as any);
    scopeGrupo(query, grupoId); // el equipo debe ser DE este grupo (candado profesor)
    const equipo = await query.get(equipoId, { useMasterKey: true });

    equipo.softDelete();
    await equipo.save(null, { useMasterKey: true });

    res.json({ status: 'ok', message: 'Equipo eliminado' });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Equipo no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al eliminar equipo' });
  }
}
