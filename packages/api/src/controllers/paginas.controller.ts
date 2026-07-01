import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { Pagina } from '../models/Pagina.js';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const VALID_BLOCK_TYPES = [
  'encabezado', 'objetivos', 'instrucciones', 'preguntas',
  'recursos', 'entrega', 'practica', 'texto',
];

function validateBloques(bloques: unknown): boolean {
  if (!Array.isArray(bloques)) return false;
  return bloques.every(
    (b: any) =>
      typeof b.id === 'string' &&
      typeof b.tipo === 'string' &&
      VALID_BLOCK_TYPES.includes(b.tipo) &&
      typeof b.datos === 'object' &&
      b.datos !== null,
  );
}

// ─── Admin endpoints ────────────────────────────────────────────

export async function listPaginas(_req: Request, res: Response): Promise<void> {
  try {
    const query = new Parse.Query<Pagina>('Pagina');
    query.equalTo('exists' as any, true as any);
    query.ascending('slug');
    query.include('grupo' as any);
    query.limit(1000);
    const paginas = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      paginas: paginas.map((p) => p.toSafeJSON()),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener páginas' });
  }
}

export async function getPagina(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const query = BaseModel.queryActive<Pagina>('Pagina');
    query.include('grupo' as any);
    const pagina = await query.get(id, { useMasterKey: true });

    res.json({ status: 'ok', pagina: pagina.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Página no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al obtener página' });
  }
}

export async function createPagina(req: Request, res: Response): Promise<void> {
  const { titulo, slug, descripcion, icono, grupoId, bloques, publicado, orden, etiquetas } = req.body;

  if (!titulo || typeof titulo !== 'string' || titulo.trim() === '') {
    res.status(400).json({ status: 'error', message: 'El título es requerido' });
    return;
  }
  if (!slug || typeof slug !== 'string' || !SLUG_REGEX.test(slug)) {
    res.status(400).json({ status: 'error', message: 'El slug es requerido y debe contener solo letras minúsculas, números y guiones' });
    return;
  }

  try {
    // Check slug uniqueness
    const existing = new Parse.Query<Pagina>('Pagina');
    existing.equalTo('slug' as any, slug as any);
    existing.equalTo('exists' as any, true as any);
    const found = await existing.first({ useMasterKey: true });
    if (found) {
      res.status(409).json({ status: 'error', message: 'Ya existe una página con ese slug' });
      return;
    }

    const pagina = new Pagina().initDefaults();
    pagina.setTitulo(titulo.trim());
    pagina.setSlug(slug);
    if (descripcion) pagina.setDescripcion(descripcion.trim());
    if (icono) pagina.setIcono(icono.trim());
    if (grupoId) {
      const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId);
      pagina.setGrupo(grupoPointer);
    }
    if (bloques && validateBloques(bloques)) {
      pagina.setBloques(bloques);
    } else {
      pagina.setBloques([]);
    }
    pagina.setPublicado(publicado === true);
    if (orden !== undefined) pagina.setOrden(Number(orden));
    if (Array.isArray(etiquetas) && etiquetas.every((e: any) => typeof e === 'string')) {
      pagina.setEtiquetas(etiquetas);
    }

    await pagina.save(null, { useMasterKey: true });

    res.status(201).json({ status: 'ok', pagina: pagina.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear página' });
  }
}

export async function updatePagina(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { titulo, slug, descripcion, icono, grupoId, bloques, publicado, orden, etiquetas } = req.body;

  try {
    const query = BaseModel.queryActive<Pagina>('Pagina');
    const pagina = await query.get(id, { useMasterKey: true });

    if (titulo !== undefined) {
      if (typeof titulo !== 'string' || titulo.trim() === '') {
        res.status(400).json({ status: 'error', message: 'El título no puede estar vacío' });
        return;
      }
      pagina.setTitulo(titulo.trim());
    }

    if (slug !== undefined) {
      if (typeof slug !== 'string' || !SLUG_REGEX.test(slug)) {
        res.status(400).json({ status: 'error', message: 'El slug debe contener solo letras minúsculas, números y guiones' });
        return;
      }
      // Check uniqueness if slug changed
      if (slug !== pagina.getSlug()) {
        const existing = new Parse.Query<Pagina>('Pagina');
        existing.equalTo('slug' as any, slug as any);
        existing.equalTo('exists' as any, true as any);
        existing.notEqualTo('objectId' as any, id as any);
        const found = await existing.first({ useMasterKey: true });
        if (found) {
          res.status(409).json({ status: 'error', message: 'Ya existe una página con ese slug' });
          return;
        }
      }
      pagina.setSlug(slug);
    }

    if (descripcion !== undefined) pagina.setDescripcion((descripcion ?? '').trim());
    if (icono !== undefined) pagina.setIcono((icono ?? 'article').trim());

    if (grupoId !== undefined) {
      if (grupoId === null || grupoId === '') {
        pagina.unset('grupo');
      } else {
        const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId);
        pagina.setGrupo(grupoPointer);
      }
    }

    if (bloques !== undefined) {
      if (validateBloques(bloques)) {
        pagina.setBloques(bloques);
      } else {
        res.status(400).json({ status: 'error', message: 'Formato de bloques inválido' });
        return;
      }
    }

    if (publicado !== undefined) pagina.setPublicado(publicado === true);
    if (orden !== undefined) pagina.setOrden(Number(orden));
    if (etiquetas !== undefined) {
      if (Array.isArray(etiquetas) && etiquetas.every((e: any) => typeof e === 'string')) {
        pagina.setEtiquetas(etiquetas);
      }
    }

    await pagina.save(null, { useMasterKey: true });

    res.json({ status: 'ok', pagina: pagina.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Página no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al actualizar página' });
  }
}

export async function deletePagina(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const query = new Parse.Query<Pagina>('Pagina');
    query.equalTo('exists' as any, true as any);
    const pagina = await query.get(id, { useMasterKey: true });

    pagina.softDelete();
    await pagina.save(null, { useMasterKey: true });

    res.json({ status: 'ok', message: 'Página eliminada' });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Página no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al eliminar página' });
  }
}

// ─── Public endpoints ───────────────────────────────────────────

export async function getPaginaPublica(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;

  try {
    const query = BaseModel.queryActive<Pagina>('Pagina');
    query.equalTo('slug' as any, slug as any);
    query.equalTo('publicado' as any, true as any);
    const pagina = await query.first({ useMasterKey: true });

    if (!pagina) {
      res.status(404).json({ status: 'error', message: 'Página no encontrada' });
      return;
    }

    res.json({ status: 'ok', pagina: pagina.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener página' });
  }
}

export async function listPaginasPublicas(_req: Request, res: Response): Promise<void> {
  try {
    const query = BaseModel.queryActive<Pagina>('Pagina');
    query.equalTo('publicado' as any, true as any);
    query.ascending('orden');
    query.select('titulo' as any, 'slug' as any);
    const paginas = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      paginas: paginas.map((p) => ({
        id: p.id,
        slug: p.getSlug(),
        titulo: p.getTitulo(),
      })),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener páginas' });
  }
}
