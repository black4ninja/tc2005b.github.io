import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { Grupo } from '../models/Grupo.js';
import { invalidateColeccionesPermitidas } from '../services/contenidos.service.js';
import { sanitizarUrlHref } from '../utils/url.js';

export async function listGrupos(_req: Request, res: Response): Promise<void> {
  try {
    const query = new Parse.Query<Grupo>('Grupo');
    query.equalTo('exists' as any, true as any);
    query.include('colecciones' as any);
    query.include('admins' as any);
    query.descending('createdAt');
    const grupos = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      grupos: grupos.map((g) => g.toSafeJSON()),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener grupos' });
  }
}

/**
 * ids de colecciones → pointers VALIDADOS (existentes). null = payload no-array
 * (se ignora); un id inexistente es error del cliente (400).
 */
async function resolverColecciones(value: unknown): Promise<Parse.Object[] | 'invalido' | null> {
  if (!Array.isArray(value)) return null;
  const ids = [...new Set(value.filter((s): s is string => typeof s === 'string' && s.trim() !== ''))];
  if (ids.length === 0) return [];
  const q = new Parse.Query('Coleccion');
  q.equalTo('exists' as any, true as any);
  q.containedIn('objectId' as any, ids as any);
  const encontradas = await q.find({ useMasterKey: true });
  if (encontradas.length !== ids.length) return 'invalido';
  return encontradas;
}

/**
 * ids de administradores → pointers VALIDADOS. Igual que resolverColecciones,
 * pero además exige que cada id sea un AppUser activo con userType='admin': así
 * un alumno no puede colarse como admin de un grupo por manipular el payload.
 * null = no-array (se ignora); 'invalido' = algún id no es un admin (400).
 */
async function resolverAdmins(value: unknown): Promise<Parse.Object[] | 'invalido' | null> {
  if (!Array.isArray(value)) return null;
  const ids = [...new Set(value.filter((s): s is string => typeof s === 'string' && s.trim() !== ''))];
  if (ids.length === 0) return [];
  const q = BaseModel.queryActive('AppUser');
  q.equalTo('userType' as any, 'admin' as any);
  q.containedIn('objectId' as any, ids as any);
  const encontrados = await q.find({ useMasterKey: true });
  if (encontrados.length !== ids.length) return 'invalido';
  return encontrados;
}

export async function createGrupo(req: Request, res: Response): Promise<void> {
  const { name, fechaInicio, fechaFin, colecciones, urlAgendaEntrevistas } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ status: 'error', message: 'El nombre es requerido' });
    return;
  }

  const url = sanitizarUrlHref(urlAgendaEntrevistas);
  if (url === null) {
    res.status(400).json({ status: 'error', message: 'La URL de la agenda debe empezar por http:// o https://' });
    return;
  }

  try {
    const grupo = new Grupo().initDefaults();
    grupo.setName(name.trim());
    if (fechaInicio) grupo.setFechaInicio(new Date(fechaInicio));
    if (fechaFin) grupo.setFechaFin(new Date(fechaFin));
    if (url) grupo.setUrlAgendaEntrevistas(url);

    const coleccionesPtrs = await resolverColecciones(colecciones);
    if (coleccionesPtrs === 'invalido') {
      res.status(400).json({ status: 'error', message: 'Alguna colección indicada no existe' });
      return;
    }
    if (coleccionesPtrs) grupo.setColecciones(coleccionesPtrs);

    const adminsPtrs = await resolverAdmins(req.body.admins);
    if (adminsPtrs === 'invalido') {
      res.status(400).json({ status: 'error', message: 'Alguno de los administradores indicados no existe o no es admin' });
      return;
    }
    if (adminsPtrs) grupo.setAdmins(adminsPtrs);

    await grupo.save(null, { useMasterKey: true });
    if (coleccionesPtrs?.length) invalidateColeccionesPermitidas();

    res.status(201).json({ status: 'ok', grupo: grupo.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear grupo' });
  }
}

export async function updateGrupo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, fechaInicio, fechaFin, colecciones, urlAgendaEntrevistas } = req.body;

  try {
    const query = BaseModel.queryActive<Grupo>('Grupo');
    // colecciones/admins incluidos: toSafeJSON serializa pointers y sin fetch
    // respondería nulls (y no podría filtrar soft-deleted).
    query.include('colecciones' as any);
    query.include('admins' as any);
    const grupo = await query.get(id, { useMasterKey: true });

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({ status: 'error', message: 'El nombre no puede estar vacío' });
        return;
      }
      grupo.setName(name.trim());
    }
    if (fechaInicio !== undefined) {
      grupo.setFechaInicio(fechaInicio ? new Date(fechaInicio) : undefined!);
    }
    if (fechaFin !== undefined) {
      grupo.setFechaFin(fechaFin ? new Date(fechaFin) : undefined!);
    }
    if (urlAgendaEntrevistas !== undefined) {
      const url = sanitizarUrlHref(urlAgendaEntrevistas);
      if (url === null) {
        res.status(400).json({ status: 'error', message: 'La URL de la agenda debe empezar por http:// o https://' });
        return;
      }
      // '' limpia el campo: así se puede quitar el enlace de un grupo.
      if (url) grupo.setUrlAgendaEntrevistas(url);
      else grupo.unset('urlAgendaEntrevistas');
    }
    // Solo un array válido aplica ([] limpia); no-array se ignora.
    const coleccionesPtrs = colecciones !== undefined ? await resolverColecciones(colecciones) : null;
    if (coleccionesPtrs === 'invalido') {
      res.status(400).json({ status: 'error', message: 'Alguna colección indicada no existe' });
      return;
    }
    if (coleccionesPtrs) grupo.setColecciones(coleccionesPtrs);

    // Solo un array válido aplica ([] limpia); no-array (undefined) se ignora.
    const adminsPtrs = await resolverAdmins(req.body.admins);
    if (adminsPtrs === 'invalido') {
      res.status(400).json({ status: 'error', message: 'Alguno de los administradores indicados no existe o no es admin' });
      return;
    }
    if (adminsPtrs) grupo.setAdmins(adminsPtrs);

    await grupo.save(null, { useMasterKey: true });
    if (coleccionesPtrs) invalidateColeccionesPermitidas();

    res.json({ status: 'ok', grupo: grupo.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al actualizar grupo' });
  }
}

export async function archiveGrupo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const query = new Parse.Query<Grupo>('Grupo');
    query.equalTo('exists' as any, true as any);
    query.include('colecciones' as any);
    const grupo = await query.get(id, { useMasterKey: true });

    if (grupo.get('active')) {
      grupo.deactivate();
    } else {
      grupo.activate();
    }
    await grupo.save(null, { useMasterKey: true });
    // Archivar/reactivar cambia el acceso de todos sus alumnos al CMS.
    invalidateColeccionesPermitidas();

    res.json({ status: 'ok', grupo: grupo.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al cambiar estado del grupo' });
  }
}

export async function deleteGrupo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const query = new Parse.Query<Grupo>('Grupo');
    query.equalTo('exists' as any, true as any);
    const grupo = await query.get(id, { useMasterKey: true });

    grupo.softDelete();
    await grupo.save(null, { useMasterKey: true });

    res.json({ status: 'ok', message: 'Grupo eliminado' });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al eliminar grupo' });
  }
}
