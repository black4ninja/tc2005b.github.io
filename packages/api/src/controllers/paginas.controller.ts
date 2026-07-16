import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { Pagina } from '../models/Pagina.js';
import { coleccionesDeGrupo } from '../services/grupo-colecciones.service.js';

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

/**
 * Resuelve un coleccionId a un pointer, verificando que la colección exista y
 * no esté soft-deleted. Devuelve `null` si el id no corresponde a ninguna.
 */
async function resolverColeccion(coleccionId: string): Promise<Parse.Object | null> {
  const query = new Parse.Query('Coleccion');
  query.equalTo('exists' as any, true as any);
  try {
    return await query.get(coleccionId, { useMasterKey: true });
  } catch {
    return null;
  }
}

/**
 * ids de etiquetas → pointers VALIDADOS. `null` = payload no-array (se ignora);
 * `'invalido'` = algún id no corresponde a una Etiqueta viva (400).
 *
 * Antes se guardaba el array de strings tal cual, sin comprobar nada: por eso en
 * producción acabaron páginas con el literal `"eval"` (el nombre de la etiqueta)
 * en vez de su objectId, y el visor las descartaba en silencio.
 */
async function resolverEtiquetas(value: unknown): Promise<Parse.Object[] | 'invalido' | null> {
  if (!Array.isArray(value)) return null;
  const ids = [...new Set(value.filter((s): s is string => typeof s === 'string' && s.trim() !== ''))];
  if (ids.length === 0) return [];
  const q = BaseModel.queryActive('Etiqueta');
  q.containedIn('objectId' as any, ids as any);
  const encontradas = await q.find({ useMasterKey: true });
  if (encontradas.length !== ids.length) return 'invalido';
  return encontradas;
}


// ─── Admin endpoints ────────────────────────────────────────────

export async function listPaginas(req: Request, res: Response): Promise<void> {
  const { coleccionId } = req.query;

  try {
    const query = new Parse.Query<Pagina>('Pagina');
    query.equalTo('exists' as any, true as any);
    query.ascending('slug');
    query.include(['coleccion', 'etiquetas'] as any);
    query.limit(1000);

    if (typeof coleccionId === 'string' && coleccionId) {
      if (coleccionId === 'sin-coleccion') {
        query.doesNotExist('coleccion' as any);
      } else {
        const coleccion = await resolverColeccion(coleccionId);
        if (!coleccion) {
          res.status(404).json({ status: 'error', message: 'Colección no encontrada' });
          return;
        }
        query.equalTo('coleccion' as any, coleccion as any);
      }
    }

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
    query.include(['coleccion', 'etiquetas'] as any);
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
  const { titulo, slug, descripcion, icono, coleccionId, bloques, publicado, orden, etiquetas } = req.body;

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
    if (coleccionId) {
      const coleccion = await resolverColeccion(coleccionId);
      if (!coleccion) {
        res.status(400).json({ status: 'error', message: 'La colección indicada no existe' });
        return;
      }
      pagina.setColeccion(coleccion);
    }
    if (bloques && validateBloques(bloques)) {
      pagina.setBloques(bloques);
    } else {
      pagina.setBloques([]);
    }
    pagina.setPublicado(publicado === true);
    if (orden !== undefined) pagina.setOrden(Number(orden));
    const etiquetasPtrs = await resolverEtiquetas(etiquetas);
    if (etiquetasPtrs === 'invalido') {
      res.status(400).json({ status: 'error', message: 'Alguna etiqueta indicada no existe' });
      return;
    }
    if (etiquetasPtrs) pagina.setEtiquetas(etiquetasPtrs);

    await pagina.save(null, { useMasterKey: true });

    res.status(201).json({ status: 'ok', pagina: pagina.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear página' });
  }
}

export async function updatePagina(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { titulo, slug, descripcion, icono, coleccionId, bloques, publicado, orden, etiquetas } = req.body;

  try {
    const query = BaseModel.queryActive<Pagina>('Pagina');
    // include: sin esto, una página que no cambia de colección devolvería el
    // pointer sin datos y `toSafeJSON()` la expondría con nombre/slug en null.
    query.include(['coleccion', 'etiquetas'] as any);
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

    if (coleccionId !== undefined) {
      if (coleccionId === null || coleccionId === '') {
        pagina.unset('coleccion');
      } else {
        const coleccion = await resolverColeccion(coleccionId);
        if (!coleccion) {
          res.status(400).json({ status: 'error', message: 'La colección indicada no existe' });
          return;
        }
        pagina.setColeccion(coleccion);
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
      const etiquetasPtrs = await resolverEtiquetas(etiquetas);
      if (etiquetasPtrs === 'invalido') {
        res.status(400).json({ status: 'error', message: 'Alguna etiqueta indicada no existe' });
        return;
      }
      if (etiquetasPtrs) pagina.setEtiquetas(etiquetasPtrs);
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
    // Sin include, el pointer llega sin datos y `toSafeJSON()` expondría la
    // colección con nombre/slug/clave en null.
    query.include(['coleccion', 'etiquetas'] as any);
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

/**
 * Listado público de páginas publicadas.
 *
 * Con `?grupoId=`, acota a las páginas de las colecciones asignadas a ese grupo
 * (`Grupo.colecciones`) — es lo que consume el picker del calendario, para que
 * al armar una actividad solo se ofrezcan páginas de la materia del grupo. Si el
 * grupo no tiene colecciones asignadas, se devuelven **todas** y se avisa con
 * `filtrado: false`, para no dejar el picker vacío sin explicación.
 *
 * Sin `grupoId` el comportamiento es el de siempre: todas las publicadas.
 */
export async function listPaginasPublicas(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.query;

  try {
    const query = BaseModel.queryActive<Pagina>('Pagina');
    query.equalTo('publicado' as any, true as any);
    query.ascending('orden');
    query.select('titulo' as any, 'slug' as any);

    let filtrado = false;
    if (typeof grupoId === 'string' && grupoId) {
      const colecciones = await coleccionesDeGrupo(grupoId, 'paginas');
      if (colecciones.length > 0) {
        query.containedIn('coleccion' as any, colecciones as any);
        filtrado = true;
      }
    }

    const paginas = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      filtrado,
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
