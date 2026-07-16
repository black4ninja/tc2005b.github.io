import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { Grupo } from '../models/Grupo.js';
import { esModuloValido } from '../models/modulos-contenido.js';
import { invalidateColeccionesPermitidas } from '../services/contenidos.service.js';
import { getGruposDeStaff } from '../services/grupo-admin.service.js';
import { sanitizarUrlHref } from '../utils/url.js';

export async function listGrupos(req: Request, res: Response): Promise<void> {
  try {
    // El profesor solo ve SUS grupos (donde figura en Grupo.admins); el admin,
    // todos. Es lo que hace que su vista de grupo funcione sin exponerle el resto.
    if (req.appUser?.isProfesor()) {
      const grupos = await getGruposDeStaff(req.appUser.id);
      res.json({ status: 'ok', grupos: grupos.map((g) => g.toSafeJSON()) });
      return;
    }

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
 * ids de personal → pointers VALIDADOS. Igual que resolverColecciones, pero
 * además exige que cada id sea un AppUser activo de tipo STAFF (admin o
 * profesor): así un alumno no puede colarse como admin de un grupo por
 * manipular el payload. null = no-array (se ignora); 'invalido' = algún id no
 * es staff (400).
 */
async function resolverAdmins(value: unknown): Promise<Parse.Object[] | 'invalido' | null> {
  if (!Array.isArray(value)) return null;
  const ids = [...new Set(value.filter((s): s is string => typeof s === 'string' && s.trim() !== ''))];
  if (ids.length === 0) return [];
  const q = BaseModel.queryActive('AppUser');
  q.containedIn('userType' as any, ['admin', 'profesor'] as any);
  q.containedIn('objectId' as any, ids as any);
  const encontrados = await q.find({ useMasterKey: true });
  if (encontrados.length !== ids.length) return 'invalido';
  return encontrados;
}

export async function createGrupo(req: Request, res: Response): Promise<void> {
  const { name, fechaInicio, fechaFin, urlAgendaEntrevistas } = req.body;

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

    // Las colecciones (y sus módulos) NO se asignan aquí: van por la acción
    // "Asignaciones" (PUT /admin/grupos/:id/asignaciones). Un grupo nace vacío.
    const adminsPtrs = await resolverAdmins(req.body.admins);
    if (adminsPtrs === 'invalido') {
      res.status(400).json({ status: 'error', message: 'Alguno de los administradores indicados no existe o no es admin' });
      return;
    }
    if (adminsPtrs) grupo.setAdmins(adminsPtrs);

    await grupo.save(null, { useMasterKey: true });

    res.status(201).json({ status: 'ok', grupo: grupo.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear grupo' });
  }
}

export async function updateGrupo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, fechaInicio, fechaFin, urlAgendaEntrevistas } = req.body;

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
    // Los administradores del grupo son CONFIGURACIÓN: solo el admin los reasigna
    // (un profesor edita nombre/fechas/agenda, no esto — se ignora si lo manda).
    // Las COLECCIONES y sus módulos ya no van por aquí: viven en la acción
    // "Asignaciones" (PUT /admin/grupos/:id/asignaciones).
    if (req.appUser?.isAdmin() === true) {
      const adminsPtrs = await resolverAdmins(req.body.admins);
      if (adminsPtrs === 'invalido') {
        res.status(400).json({ status: 'error', message: 'Alguno de los administradores indicados no existe o no es staff' });
        return;
      }
      if (adminsPtrs) grupo.setAdmins(adminsPtrs);
    }

    await grupo.save(null, { useMasterKey: true });

    res.json({ status: 'ok', grupo: grupo.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al actualizar grupo' });
  }
}

/**
 * PUT /admin/grupos/:id/asignaciones — { asignaciones: [{ coleccionId, deshabilitados: string[] }] }
 *
 * Fija QUÉ colecciones tiene el grupo y, por colección, qué MÓDULOS quedan
 * apagados (Documentación/Páginas/Competencias/Actividades). Reemplaza al viejo
 * campo `colecciones` del form de editar. Guarda `colecciones` (las asignadas) y
 * `modulosDeshabilitados` (solo entradas con algo apagado — vacío = todo on).
 */
export async function setAsignacionesGrupo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { asignaciones } = req.body ?? {};

  if (!Array.isArray(asignaciones)) {
    res.status(400).json({ status: 'error', message: 'asignaciones debe ser un arreglo' });
    return;
  }

  // Normalizar: id de colección + keys apagadas válidas (dedup, sin basura).
  const coleccionIds: string[] = [];
  const deshabilitadosPorColeccion: Record<string, string[]> = {};
  for (const a of asignaciones) {
    const coleccionId = a?.coleccionId;
    if (typeof coleccionId !== 'string' || !coleccionId.trim()) {
      res.status(400).json({ status: 'error', message: 'Cada asignación necesita un coleccionId' });
      return;
    }
    const off = Array.isArray(a?.deshabilitados) ? a.deshabilitados : [];
    if (off.some((k: unknown) => !esModuloValido(k))) {
      res.status(400).json({ status: 'error', message: 'Módulo inválido en deshabilitados' });
      return;
    }
    coleccionIds.push(coleccionId);
    const unicos = [...new Set(off as string[])];
    if (unicos.length > 0) deshabilitadosPorColeccion[coleccionId] = unicos;
  }

  try {
    const query = BaseModel.queryActive<Grupo>('Grupo');
    query.include('colecciones' as any);
    query.include('admins' as any);
    const grupo = await query.get(id, { useMasterKey: true });

    const coleccionesPtrs = await resolverColecciones(coleccionIds);
    if (coleccionesPtrs === 'invalido') {
      res.status(400).json({ status: 'error', message: 'Alguna colección indicada no existe' });
      return;
    }
    grupo.setColecciones(coleccionesPtrs ?? []);
    // Solo se guardan las entradas de colecciones REALMENTE asignadas (ignora
    // deshabilitados de colecciones que se quitaron).
    const asignadas = new Set((coleccionesPtrs ?? []).map((c) => c.id));
    const limpio: Record<string, string[]> = {};
    for (const [cid, off] of Object.entries(deshabilitadosPorColeccion)) {
      if (asignadas.has(cid)) limpio[cid] = off;
    }
    grupo.setModulosDeshabilitados(limpio);

    await grupo.save(null, { useMasterKey: true });
    invalidateColeccionesPermitidas();

    res.json({ status: 'ok', grupo: grupo.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al guardar las asignaciones' });
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
