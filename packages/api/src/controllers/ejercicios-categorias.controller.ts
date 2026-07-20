import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { Coleccion } from '../models/Coleccion.js';
import { CategoriaEjercicio } from '../models/CategoriaEjercicio.js';
import { EjercicioProgramacion } from '../models/EjercicioProgramacion.js';
import { getColeccionActiva } from './cms-documentos.controller.js';

/** Busca una categoría existente con su colección viva (solo `exists`). */
async function buscarCategoria(id: string): Promise<CategoriaEjercicio | null> {
  try {
    const q = new Parse.Query<CategoriaEjercicio>('CategoriaEjercicio');
    q.equalTo('exists' as any, true as any);
    q.include('coleccion' as any);
    const cat = await q.get(id, { useMasterKey: true });
    const col = cat.getColeccion();
    if (!col || col.get('exists') === false) return null;
    return cat;
  } catch {
    return null;
  }
}

/** GET /admin/colecciones/:id/categorias-ejercicios */
export async function listCategoriasEjercicio(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const coleccion = await getColeccionActiva(id);
    if (!coleccion) {
      res.status(404).json({ status: 'error', message: 'Colección no encontrada' });
      return;
    }
    const q = new Parse.Query<CategoriaEjercicio>('CategoriaEjercicio');
    q.equalTo('coleccion' as any, Coleccion.createWithoutData(id) as any);
    q.equalTo('exists' as any, true as any);
    q.ascending('orden');
    q.limit(1000);
    const categorias = await q.find({ useMasterKey: true });
    res.json({ status: 'ok', categorias: categorias.map((c) => c.toSafeJSON()) });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener categorías' });
  }
}

/** POST /admin/colecciones/:id/categorias-ejercicios */
export async function createCategoriaEjercicio(req: Request, res: Response): Promise<void> {
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
    const cat = new CategoriaEjercicio().initDefaults();
    cat.setColeccion(coleccion);
    cat.setNombre(nombre.trim());
    if (typeof descripcion === 'string') cat.setDescripcion(descripcion.trim());
    cat.setOrden(typeof orden === 'number' ? orden : 0);
    await cat.save(null, { useMasterKey: true });
    res.status(201).json({ status: 'ok', categoria: cat.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al crear categoría' });
  }
}

/** PUT /admin/categorias-ejercicios/:id */
export async function updateCategoriaEjercicio(req: Request, res: Response): Promise<void> {
  const cat = await buscarCategoria(req.params.id);
  if (!cat) {
    res.status(404).json({ status: 'error', message: 'Categoría no encontrada' });
    return;
  }
  const { nombre, descripcion, orden } = req.body ?? {};
  try {
    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || !nombre.trim()) {
        res.status(400).json({ status: 'error', message: 'El nombre no puede estar vacío' });
        return;
      }
      cat.setNombre(nombre.trim());
    }
    if (descripcion !== undefined) cat.setDescripcion(String(descripcion ?? '').trim());
    if (orden !== undefined && typeof orden === 'number') cat.setOrden(orden);
    await cat.save(null, { useMasterKey: true });
    res.json({ status: 'ok', categoria: cat.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al actualizar categoría' });
  }
}

/** DELETE /admin/categorias-ejercicios/:id — soft-delete; sus ejercicios quedan sin categoría. */
export async function deleteCategoriaEjercicio(req: Request, res: Response): Promise<void> {
  const cat = await buscarCategoria(req.params.id);
  if (!cat) {
    res.status(404).json({ status: 'error', message: 'Categoría no encontrada' });
    return;
  }
  try {
    // Desasigna la categoría de sus ejercicios (no los borra).
    const q = new Parse.Query<EjercicioProgramacion>('EjercicioProgramacion');
    q.equalTo('categoria' as any, cat as any);
    q.equalTo('exists' as any, true as any);
    q.limit(1000);
    const ejercicios = await q.find({ useMasterKey: true });
    for (const e of ejercicios) e.setCategoria(null);
    if (ejercicios.length) await Parse.Object.saveAll(ejercicios, { useMasterKey: true });

    cat.softDelete();
    await cat.save(null, { useMasterKey: true });
    res.json({ status: 'ok', message: 'Categoría eliminada' });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al eliminar categoría' });
  }
}
