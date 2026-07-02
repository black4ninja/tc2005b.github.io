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
import { extraerSnippet } from '../services/contenidos-busqueda.js';
import { DocumentoVersion } from '../models/DocumentoVersion.js';

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

/**
 * GET /api/contenidos/:slug/html/*path — el cuerpo CRUDO de una página tipo
 * `html`, con CSP propia, pensado para consumirse SOLO dentro de un
 * <iframe sandbox="allow-scripts"> (sin allow-same-origin: origen opaco —
 * sus scripts no ven cookies ni pueden llamar al API con credenciales).
 * Nunca se inyecta en el DOM de la app (design §3).
 */
export async function getHtmlCrudo(req: Request, res: Response): Promise<void> {
  try {
    const info = await autorizarColeccion(req, res);
    if (!info) return;

    const path = String((req.params as Record<string, string>)[0] ?? '')
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean);

    const arbol = construirArbolVisible(await getDocumentosPlanos(info.id));
    const resuelto = resolverPath(arbol, path);
    if (!resuelto || resuelto.nodo.tipo !== 'html') {
      res.status(404).json({ status: 'error', message: 'No encontrado' });
      return;
    }

    const q = new Parse.Query<Documento>('Documento');
    q.equalTo('exists' as any, true as any);
    q.include('version' as any);
    const documento = await q.get(resuelto.nodo.id, { useMasterKey: true }).catch(() => null);
    const version = documento?.getVersion();
    if (!documento || !version) {
      res.status(404).json({ status: 'error', message: 'No encontrado' });
      return;
    }

    // CSP del documento embebido: inline sí (es una demo autocontenida),
    // recursos externos no; solo embebible desde este mismo sitio.
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; frame-ancestors 'self'",
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.type('text/html; charset=utf-8').send(version.getCuerpo());
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al servir la página' });
  }
}

const BUSQUEDA_MAX = 20;

/**
 * GET /api/contenidos/busqueda?q=… — búsqueda full-text con SCOPE por
 * permisos (design §2): solo consulta las colecciones permitidas del
 * usuario; es imposible que sugiera títulos o contenido ajenos.
 * Usa el índice de texto de Mongo (scripts/crear-indices-busqueda.ts);
 * si aún no existe, degrada a regex (colecciones chicas: aceptable).
 */
export async function buscarContenidos(req: Request, res: Response): Promise<void> {
  const user = req.appUser;
  const q = String(req.query.q ?? '').trim();
  if (!user) {
    res.status(401).json({ status: 'error', message: 'Autenticación requerida' });
    return;
  }
  if (q.length < 2) {
    res.json({ status: 'ok', resultados: [] });
    return;
  }

  try {
    const permitidos = await getSlugsPermitidos(user);
    const porSlug = await getColeccionesPorSlug();
    const infos = [...porSlug.values()].filter((c) => permitidos.has(c.slug));
    if (infos.length === 0) {
      res.json({ status: 'ok', resultados: [] });
      return;
    }

    // Mapa documentoId → {path, coleccion} de TODO lo visible del usuario.
    const paginaPorId = new Map<string, { path: string; coleccion: string; clave: string | null; titulo: string }>();
    for (const info of infos) {
      const arbol = construirArbolVisible(await getDocumentosPlanos(info.id));
      for (const p of paginasEnOrden(arbol)) {
        paginaPorId.set(p.id, { path: p.path, coleccion: info.slug, clave: info.clave, titulo: p.titulo });
      }
    }

    const punteros = infos.map((i) => Parse.Object.extend('Coleccion').createWithoutData(i.id));

    // Query base de documentos publicados dentro del scope.
    const baseDocs = () => {
      const dq = new Parse.Query<Documento>('Documento');
      dq.equalTo('exists' as any, true as any);
      dq.equalTo('active' as any, true as any);
      dq.equalTo('publicado' as any, true as any);
      dq.containedIn('coleccion' as any, punteros as any);
      return dq;
    };

    // 1) Títulos que matchean (fullText → fallback regex sin índice).
    let docsTitulo: Documento[] = [];
    try {
      const dq = baseDocs();
      (dq as any).fullText('titulo', q);
      dq.include('version' as any);
      dq.limit(BUSQUEDA_MAX);
      docsTitulo = await dq.find({ useMasterKey: true });
    } catch {
      const dq = baseDocs();
      dq.matches('titulo' as any, new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') as any);
      dq.include('version' as any);
      dq.limit(BUSQUEDA_MAX);
      docsTitulo = await dq.find({ useMasterKey: true });
    }

    // 2) Cuerpos publicados que matchean: DocumentoVersion + verificación de
    //    que ES la versión publicada de un documento visible del scope.
    let versionesCuerpo: DocumentoVersion[] = [];
    const baseVersiones = () => {
      const vq = new Parse.Query<DocumentoVersion>('DocumentoVersion');
      vq.equalTo('exists' as any, true as any);
      vq.matchesQuery('documento' as any, baseDocs() as any);
      vq.include('documento' as any);
      vq.limit(BUSQUEDA_MAX * 3); // margen: se filtran borradores/versiones viejas
      return vq;
    };
    try {
      const vq = baseVersiones();
      (vq as any).fullText('cuerpo', q);
      versionesCuerpo = await vq.find({ useMasterKey: true });
    } catch {
      const vq = baseVersiones();
      vq.matches('cuerpo' as any, new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') as any);
      versionesCuerpo = await vq.find({ useMasterKey: true });
    }

    const resultados: { titulo: string; coleccion: string; clave: string | null; path: string; snippet: string }[] = [];
    const vistos = new Set<string>();

    for (const d of docsTitulo) {
      const pagina = paginaPorId.get(d.id);
      if (!pagina || vistos.has(d.id)) continue;
      vistos.add(d.id);
      resultados.push({
        titulo: pagina.titulo,
        coleccion: pagina.coleccion,
        clave: pagina.clave,
        path: pagina.path,
        snippet: extraerSnippet(d.getVersion()?.getCuerpo() ?? '', q),
      });
    }
    for (const v of versionesCuerpo) {
      const documento = v.getDocumento();
      if (!documento) continue;
      // Solo la versión PUBLICADA cuenta (no borradores ni historial).
      if ((documento.get('version') as Parse.Object | undefined)?.id !== v.id) continue;
      const pagina = paginaPorId.get(documento.id);
      if (!pagina || vistos.has(documento.id)) continue;
      vistos.add(documento.id);
      resultados.push({
        titulo: pagina.titulo,
        coleccion: pagina.coleccion,
        clave: pagina.clave,
        path: pagina.path,
        snippet: extraerSnippet(v.getCuerpo(), q),
      });
      if (resultados.length >= BUSQUEDA_MAX) break;
    }

    res.json({ status: 'ok', resultados: resultados.slice(0, BUSQUEDA_MAX) });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error en la búsqueda' });
  }
}
