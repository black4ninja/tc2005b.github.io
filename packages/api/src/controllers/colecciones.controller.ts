import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { Coleccion } from '../models/Coleccion.js';
import {
  invalidateColeccionSlugsCache,
  invalidateColeccionesPermitidas,
} from '../services/contenidos.service.js';

/** El conjunto/estado de colecciones cambió: invalidar caches del visor. */
function invalidarCachesVisor(): void {
  invalidateColeccionSlugsCache();
  invalidateColeccionesPermitidas();
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Segmentos que el router del visor usa como literales bajo /contenidos/:
// una colección con este slug quedaría inalcanzable (shadowing de rutas).
const SLUGS_RESERVADOS = new Set(['recursos']);

function validarSlug(slug: unknown): string | null {
  if (typeof slug !== 'string' || !SLUG_REGEX.test(slug) || SLUGS_RESERVADOS.has(slug)) return null;
  return slug;
}

/** Duplicado de slug/clave entre colecciones existentes (excluyendo excludeId). */
async function existeDuplicado(campo: 'slug' | 'clave', valor: string, excludeId?: string): Promise<boolean> {
  const q = new Parse.Query<Coleccion>('Coleccion');
  q.equalTo(campo as any, valor as any);
  q.equalTo('exists' as any, true as any);
  if (excludeId) q.notEqualTo('objectId' as any, excludeId as any);
  return !!(await q.first({ useMasterKey: true }));
}

export async function listColecciones(_req: Request, res: Response): Promise<void> {
  try {
    const query = new Parse.Query<Coleccion>('Coleccion');
    query.equalTo('exists' as any, true as any);
    query.ascending('nombre');
    query.limit(1000);
    const colecciones = await query.find({ useMasterKey: true });

    res.json({ status: 'ok', colecciones: colecciones.map((c) => c.toSafeJSON()) });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener colecciones' });
  }
}

export async function createColeccion(req: Request, res: Response): Promise<void> {
  const { nombre, slug, clave, descripcion, icono } = req.body;

  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    res.status(400).json({ status: 'error', message: 'El nombre es requerido' });
    return;
  }
  const slugValido = validarSlug(slug);
  if (!slugValido) {
    res.status(400).json({ status: 'error', message: 'El slug es requerido, debe contener solo letras minúsculas, números y guiones, y no puede ser una palabra reservada' });
    return;
  }

  try {
    if (await existeDuplicado('slug', slugValido)) {
      res.status(409).json({ status: 'error', message: 'Ya existe una colección con ese slug' });
      return;
    }

    const claveCanonica = clave ? String(clave).trim().toUpperCase() : '';
    if (claveCanonica && (await existeDuplicado('clave', claveCanonica))) {
      res.status(409).json({ status: 'error', message: 'Ya existe una colección con esa clave' });
      return;
    }

    const coleccion = new Coleccion().initDefaults();
    coleccion.setNombre(nombre.trim());
    coleccion.setSlug(slugValido);
    if (claveCanonica) coleccion.setClave(claveCanonica);
    if (typeof descripcion === 'string' && descripcion.trim()) coleccion.setDescripcion(descripcion.trim());
    if (typeof icono === 'string' && icono.trim()) coleccion.setIcono(icono.trim());
    coleccion.setPublicada(false); // nace como borrador

    await coleccion.save(null, { useMasterKey: true });
    invalidarCachesVisor();

    res.status(201).json({ status: 'ok', coleccion: coleccion.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear colección' });
  }
}

export async function updateColeccion(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { nombre, slug, clave, descripcion, icono, publicada } = req.body;

  try {
    // Solo `exists`: el admin también edita colecciones desactivadas
    // (mismo criterio que list/delete y que los documentos).
    const query = new Parse.Query<Coleccion>('Coleccion');
    query.equalTo('exists' as any, true as any);
    const coleccion = await query.get(id, { useMasterKey: true });

    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || nombre.trim() === '') {
        res.status(400).json({ status: 'error', message: 'El nombre no puede estar vacío' });
        return;
      }
      coleccion.setNombre(nombre.trim());
    }

    if (slug !== undefined) {
      const slugValido = validarSlug(slug);
      if (!slugValido) {
        res.status(400).json({ status: 'error', message: 'El slug debe contener solo letras minúsculas, números y guiones, y no puede ser una palabra reservada' });
        return;
      }
      if (slugValido !== coleccion.getSlug() && (await existeDuplicado('slug', slugValido, id))) {
        res.status(409).json({ status: 'error', message: 'Ya existe una colección con ese slug' });
        return;
      }
      coleccion.setSlug(slugValido);
    }

    if (clave !== undefined) {
      const claveCanonica = String(clave ?? '').trim().toUpperCase();
      if (claveCanonica && claveCanonica !== coleccion.getClave() && (await existeDuplicado('clave', claveCanonica, id))) {
        res.status(409).json({ status: 'error', message: 'Ya existe una colección con esa clave' });
        return;
      }
      coleccion.setClave(claveCanonica);
    }

    if (descripcion !== undefined) coleccion.setDescripcion(String(descripcion ?? '').trim());
    if (icono !== undefined && typeof icono === 'string' && icono.trim()) coleccion.setIcono(icono.trim());
    if (publicada !== undefined) coleccion.setPublicada(publicada === true);

    await coleccion.save(null, { useMasterKey: true });
    // slug/publicada pudieron cambiar → el gate del visor debe verlo ya.
    invalidarCachesVisor();

    res.json({ status: 'ok', coleccion: coleccion.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Colección no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al actualizar colección' });
  }
}

export async function deleteColeccion(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const query = new Parse.Query<Coleccion>('Coleccion');
    query.equalTo('exists' as any, true as any);
    const coleccion = await query.get(id, { useMasterKey: true });

    // Soft-delete de la colección: sus documentos quedan intactos (y ocultos,
    // porque todo acceso pasa por la existencia de la colección).
    coleccion.softDelete();
    await coleccion.save(null, { useMasterKey: true });
    invalidarCachesVisor();

    res.json({ status: 'ok', message: 'Colección eliminada' });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Colección no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al eliminar colección' });
  }
}
