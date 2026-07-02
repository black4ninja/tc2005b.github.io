import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { Materia } from '../models/Materia.js';
import { invalidateMateriaSlugsCache, invalidateAllowedCache } from '../services/materia.service.js';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function listMaterias(_req: Request, res: Response): Promise<void> {
  try {
    const query = new Parse.Query<Materia>('Materia');
    query.equalTo('exists' as any, true as any);
    query.ascending('nombre');
    query.limit(1000);
    const materias = await query.find({ useMasterKey: true });

    res.json({ status: 'ok', materias: materias.map((m) => m.toSafeJSON()) });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener materias' });
  }
}

export async function createMateria(req: Request, res: Response): Promise<void> {
  const { nombre, slug, codigo } = req.body;

  if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
    res.status(400).json({ status: 'error', message: 'El nombre es requerido' });
    return;
  }
  if (!slug || typeof slug !== 'string' || !SLUG_REGEX.test(slug)) {
    res.status(400).json({ status: 'error', message: 'El slug es requerido y debe contener solo letras minúsculas, números y guiones' });
    return;
  }

  try {
    const existing = new Parse.Query<Materia>('Materia');
    existing.equalTo('slug' as any, slug as any);
    existing.equalTo('exists' as any, true as any);
    const found = await existing.first({ useMasterKey: true });
    if (found) {
      res.status(409).json({ status: 'error', message: 'Ya existe una materia con ese slug' });
      return;
    }

    const codigoCanonico = codigo ? String(codigo).trim().toUpperCase() : '';
    if (codigoCanonico) {
      const dupCodigo = new Parse.Query<Materia>('Materia');
      dupCodigo.equalTo('codigo' as any, codigoCanonico as any);
      dupCodigo.equalTo('exists' as any, true as any);
      if (await dupCodigo.first({ useMasterKey: true })) {
        res.status(409).json({ status: 'error', message: 'Ya existe una materia con ese código' });
        return;
      }
    }

    const materia = new Materia().initDefaults();
    materia.setNombre(nombre.trim());
    materia.setSlug(slug);
    if (codigoCanonico) materia.setCodigo(codigoCanonico);

    await materia.save(null, { useMasterKey: true });
    // El conjunto de slugs cambió → invalidar cache del gate.
    invalidateMateriaSlugsCache();
    invalidateAllowedCache();

    res.status(201).json({ status: 'ok', materia: materia.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear materia' });
  }
}

export async function updateMateria(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { nombre, slug, codigo } = req.body;

  try {
    const query = BaseModel.queryActive<Materia>('Materia');
    const materia = await query.get(id, { useMasterKey: true });

    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || nombre.trim() === '') {
        res.status(400).json({ status: 'error', message: 'El nombre no puede estar vacío' });
        return;
      }
      materia.setNombre(nombre.trim());
    }

    if (slug !== undefined) {
      if (typeof slug !== 'string' || !SLUG_REGEX.test(slug)) {
        res.status(400).json({ status: 'error', message: 'El slug debe contener solo letras minúsculas, números y guiones' });
        return;
      }
      if (slug !== materia.getSlug()) {
        const existing = new Parse.Query<Materia>('Materia');
        existing.equalTo('slug' as any, slug as any);
        existing.equalTo('exists' as any, true as any);
        existing.notEqualTo('objectId' as any, id as any);
        const found = await existing.first({ useMasterKey: true });
        if (found) {
          res.status(409).json({ status: 'error', message: 'Ya existe una materia con ese slug' });
          return;
        }
      }
      materia.setSlug(slug);
    }

    if (codigo !== undefined) {
      const codigoCanonico = (codigo ?? '').trim().toUpperCase();
      if (codigoCanonico && codigoCanonico !== materia.getCodigo()) {
        const dupCodigo = new Parse.Query<Materia>('Materia');
        dupCodigo.equalTo('codigo' as any, codigoCanonico as any);
        dupCodigo.equalTo('exists' as any, true as any);
        dupCodigo.notEqualTo('objectId' as any, id as any);
        if (await dupCodigo.first({ useMasterKey: true })) {
          res.status(409).json({ status: 'error', message: 'Ya existe una materia con ese código' });
          return;
        }
      }
      materia.setCodigo(codigoCanonico);
    }

    await materia.save(null, { useMasterKey: true });
    // slug/nombre pudieron cambiar → invalidar cache del gate.
    invalidateMateriaSlugsCache();
    invalidateAllowedCache();

    res.json({ status: 'ok', materia: materia.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Materia no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al actualizar materia' });
  }
}

export async function deleteMateria(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const query = new Parse.Query<Materia>('Materia');
    query.equalTo('exists' as any, true as any);
    const materia = await query.get(id, { useMasterKey: true });

    materia.softDelete();
    await materia.save(null, { useMasterKey: true });
    // La materia dejó de existir → invalidar cache del gate.
    invalidateMateriaSlugsCache();
    invalidateAllowedCache();

    res.json({ status: 'ok', message: 'Materia eliminada' });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Materia no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al eliminar materia' });
  }
}
