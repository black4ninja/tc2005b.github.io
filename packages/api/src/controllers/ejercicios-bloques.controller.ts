import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { Coleccion } from '../models/Coleccion.js';
import { BloqueEjercicios } from '../models/BloqueEjercicios.js';
import { CategoriaEjercicio } from '../models/CategoriaEjercicio.js';
import { getColeccionActiva } from './cms-documentos.controller.js';

/**
 * CRUD de bloques: el nivel por encima de la categoría. Espejo de
 * `ejercicios-categorias.controller.ts`, incluida la semántica de borrado
 * (soft-delete + desasignar, nunca borrar lo que cuelga).
 */

/** Busca un bloque existente con su colección viva (solo `exists`). */
async function buscarBloque(id: string): Promise<BloqueEjercicios | null> {
  try {
    const q = new Parse.Query<BloqueEjercicios>('BloqueEjercicios');
    q.equalTo('exists' as any, true as any);
    q.include('coleccion' as any);
    const bloque = await q.get(id, { useMasterKey: true });
    const col = bloque.getColeccion();
    if (!col || col.get('exists') === false) return null;
    return bloque;
  } catch {
    return null;
  }
}

/** GET /admin/colecciones/:id/bloques-ejercicios */
export async function listBloquesEjercicio(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const coleccion = await getColeccionActiva(id);
    if (!coleccion) {
      res.status(404).json({ status: 'error', message: 'Colección no encontrada' });
      return;
    }
    const q = new Parse.Query<BloqueEjercicios>('BloqueEjercicios');
    q.equalTo('coleccion' as any, Coleccion.createWithoutData(id) as any);
    q.equalTo('exists' as any, true as any);
    q.ascending('orden');
    q.limit(1000);
    const bloques = await q.find({ useMasterKey: true });
    res.json({ status: 'ok', bloques: bloques.map((b) => b.toSafeJSON()) });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener bloques' });
  }
}

/** POST /admin/colecciones/:id/bloques-ejercicios */
export async function createBloqueEjercicio(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { nombre, descripcion, orden } = req.body ?? {};
  if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
    res.status(400).json({ status: 'error', message: 'El nombre es requerido' });
    return;
  }
  try {
    const coleccion = await getColeccionActiva(id);
    if (!coleccion) {
      res.status(404).json({ status: 'error', message: 'Colección no encontrada' });
      return;
    }
    const bloque = new BloqueEjercicios().initDefaults();
    bloque.setColeccion(coleccion);
    bloque.setNombre(nombre.trim());
    if (typeof descripcion === 'string') bloque.setDescripcion(descripcion.trim());
    bloque.setOrden(typeof orden === 'number' ? orden : 0);
    await bloque.save(null, { useMasterKey: true });
    res.status(201).json({ status: 'ok', bloque: bloque.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al crear bloque' });
  }
}

/** PUT /admin/bloques-ejercicios/:id */
export async function updateBloqueEjercicio(req: Request, res: Response): Promise<void> {
  const bloque = await buscarBloque(req.params.id);
  if (!bloque) {
    res.status(404).json({ status: 'error', message: 'Bloque no encontrado' });
    return;
  }
  const { nombre, descripcion, orden } = req.body ?? {};
  try {
    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || !nombre.trim()) {
        res.status(400).json({ status: 'error', message: 'El nombre no puede estar vacío' });
        return;
      }
      bloque.setNombre(nombre.trim());
    }
    if (descripcion !== undefined) bloque.setDescripcion(String(descripcion ?? '').trim());
    if (orden !== undefined && typeof orden === 'number') bloque.setOrden(orden);
    await bloque.save(null, { useMasterKey: true });
    res.json({ status: 'ok', bloque: bloque.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al actualizar bloque' });
  }
}

/** DELETE /admin/bloques-ejercicios/:id — soft-delete; sus categorías quedan sin bloque. */
export async function deleteBloqueEjercicio(req: Request, res: Response): Promise<void> {
  const bloque = await buscarBloque(req.params.id);
  if (!bloque) {
    res.status(404).json({ status: 'error', message: 'Bloque no encontrado' });
    return;
  }
  try {
    // Desasigna el bloque de sus categorías (no las borra): caen al grupo
    // residual del listado, igual que las que nunca tuvieron bloque.
    const q = new Parse.Query<CategoriaEjercicio>('CategoriaEjercicio');
    q.equalTo('bloque' as any, bloque as any);
    q.equalTo('exists' as any, true as any);
    q.limit(1000);
    const categorias = await q.find({ useMasterKey: true });
    for (const c of categorias) c.setBloque(null);
    if (categorias.length) await Parse.Object.saveAll(categorias, { useMasterKey: true });

    bloque.softDelete();
    await bloque.save(null, { useMasterKey: true });
    res.json({ status: 'ok', message: 'Bloque eliminado' });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al eliminar bloque' });
  }
}

/**
 * Resuelve `bloqueId` a un bloque de ESTA colección, para asignarlo a una
 * categoría. Devuelve el bloque, `null` (sin bloque) o 'invalido' (id ajeno) —
 * mismo contrato que `resolverCategoria` en el controller de ejercicios, y por
 * la misma razón: sin esta validación se colarían bloques de otra colección.
 */
export async function resolverBloque(
  bloqueId: unknown,
  coleccionId: string,
): Promise<BloqueEjercicios | null | 'invalido'> {
  if (bloqueId === null || bloqueId === undefined || bloqueId === '') return null;
  if (typeof bloqueId !== 'string') return 'invalido';
  const q = new Parse.Query<BloqueEjercicios>('BloqueEjercicios');
  q.equalTo('coleccion' as any, Coleccion.createWithoutData(coleccionId) as any);
  q.equalTo('exists' as any, true as any);
  const bloque = await q.get(bloqueId, { useMasterKey: true }).catch(() => null);
  return bloque ?? 'invalido';
}
