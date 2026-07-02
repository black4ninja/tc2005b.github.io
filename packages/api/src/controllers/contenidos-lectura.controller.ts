import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { renderMarkdown, extraerToc } from '@tc2005b/contenido-pipeline';
import { Documento } from '../models/Documento.js';
import {
  getColeccionesPermitidas,
  getColeccionesPorSlug,
  getSlugsPermitidos,
  type ColeccionInfo,
} from '../services/contenidos.service.js';
import {
  construirArbolVisible,
  paginasEnOrden,
  resolverPath,
  type DocPlano,
} from '../services/contenidos-arbol.js';

/**
 * Lectura del CMS "Contenidos" (design §2/§4): NINGÚN byte de contenido sale
 * sin autorización de ese request. Slug no permitido (o inexistente) ⇒ 404
 * idéntico — no se filtra existencia. Anónimo ⇒ 401 uniforme del middleware.
 */

/**
 * 404 si el slug no existe O no está permitido (mismo mensaje: sin fugas).
 * Devuelve la info del cache de slugs — sin round-trip extra a Parse: es el
 * camino más caliente del visor y el cache se invalida en el CRUD.
 */
async function autorizarColeccion(req: Request, res: Response): Promise<ColeccionInfo | null> {
  const user = req.appUser;
  const { slug } = req.params;
  if (!user) {
    res.status(401).json({ status: 'error', message: 'Autenticación requerida' });
    return null;
  }
  const permitidos = await getSlugsPermitidos(user);
  const porSlug = await getColeccionesPorSlug();
  const info = porSlug.get(slug);
  if (!info || !permitidos.has(slug)) {
    res.status(404).json({ status: 'error', message: 'No encontrado' });
    return null;
  }
  return info;
}

/** Documentos vivos de la colección, aplanados para la lógica pura del árbol. */
async function getDocumentosPlanos(coleccionId: string): Promise<DocPlano[]> {
  const puntero = Parse.Object.extend('Coleccion').createWithoutData(coleccionId);
  const q = new Parse.Query<Documento>('Documento');
  q.equalTo('exists' as any, true as any);
  q.equalTo('active' as any, true as any);
  q.equalTo('coleccion' as any, puntero as any);
  q.ascending('orden');
  q.limit(10000);
  const documentos = await q.find({ useMasterKey: true });
  return documentos.map((d) => ({
    id: d.id,
    titulo: d.getTitulo(),
    slug: d.getSlug(),
    tipo: d.getTipo(),
    orden: d.getOrden(),
    padreId: d.getPadre()?.id ?? null,
    publicado: d.getPublicado(),
  }));
}

/** GET /api/me/colecciones — colecciones del usuario (para sidebar/visor). */
export async function getMisColecciones(req: Request, res: Response): Promise<void> {
  const user = req.appUser;
  if (!user) {
    res.status(401).json({ status: 'error', message: 'Autenticación requerida' });
    return;
  }
  try {
    const colecciones = await getColeccionesPermitidas(user);
    res.json({ status: 'ok', colecciones });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener colecciones' });
  }
}

/** GET /api/contenidos/:slug/arbol — árbol de navegación calculado por usuario. */
export async function getArbolColeccion(req: Request, res: Response): Promise<void> {
  try {
    const info = await autorizarColeccion(req, res);
    if (!info) return;

    const arbol = construirArbolVisible(await getDocumentosPlanos(info.id));

    res.json({
      status: 'ok',
      coleccion: { slug: info.slug, nombre: info.nombre, clave: info.clave },
      arbol,
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener el árbol' });
  }
}

/**
 * GET /api/contenidos/:slug/pagina/*path — la página publicada con todo lo
 * que el visor necesita: cuerpoHtml, toc, breadcrumb, prev/next.
 */
export async function getPagina(req: Request, res: Response): Promise<void> {
  try {
    const info = await autorizarColeccion(req, res);
    if (!info) return;

    const path = String((req.params as Record<string, string>)[0] ?? '')
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean);

    const arbol = construirArbolVisible(await getDocumentosPlanos(info.id));

    // Resolver SOBRE el árbol visible: lo no publicado no existe para el visor.
    const resuelto = resolverPath(arbol, path);
    if (!resuelto) {
      res.status(404).json({ status: 'error', message: 'No encontrado' });
      return;
    }
    const { nodo, breadcrumb } = resuelto;

    // Versión publicada (incluida) del documento resuelto.
    const q = new Parse.Query<Documento>('Documento');
    q.equalTo('exists' as any, true as any);
    q.include('version' as any);
    const documento = await q.get(nodo.id, { useMasterKey: true }).catch(() => null);
    const version = documento?.getVersion();
    if (!documento || !version) {
      res.status(404).json({ status: 'error', message: 'No encontrado' });
      return;
    }

    // Curación perezosa: versiones publicadas ANTES de que el pipeline
    // generara ids/TOC (toc === undefined) se re-renderizan una vez con el
    // MISMO cuerpo fuente y se persisten — no es mutar el pasado, es
    // completar el render cacheado de ese mismo contenido.
    if (documento.getTipo() === 'md' && version.get('toc') === undefined) {
      const cuerpoHtml = await renderMarkdown(version.getCuerpo());
      version.setCuerpoHtml(cuerpoHtml);
      version.setToc(extraerToc(cuerpoHtml));
      await version.save(null, { useMasterKey: true });
    }

    // prev/next sobre el orden de lectura (DFS de páginas visibles).
    const lineal = paginasEnOrden(arbol);
    const idx = lineal.findIndex((p) => p.id === nodo.id);
    const prev = idx > 0 ? lineal[idx - 1] : null;
    const next = idx >= 0 && idx < lineal.length - 1 ? lineal[idx + 1] : null;

    res.json({
      status: 'ok',
      pagina: {
        titulo: documento.getTitulo(),
        tipo: documento.getTipo(),
        // md: HTML renderizado y sanitizado al publicar. html: vacío — el
        // crudo se sirve solo por su endpoint sandboxeado (US-5).
        cuerpoHtml: documento.getTipo() === 'md' ? (version.getCuerpoHtml() ?? '') : '',
        toc: version.getToc(),
        breadcrumb,
        prev: prev ? { titulo: prev.titulo, path: prev.path } : null,
        next: next ? { titulo: next.titulo, path: next.path } : null,
      },
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener la página' });
  }
}
