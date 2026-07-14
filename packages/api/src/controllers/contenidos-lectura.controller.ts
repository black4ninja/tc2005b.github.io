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
    oculto: d.getOculto(),
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
 * Resolución compartida de una página publicada: path → árbol visible →
 * documento con su versión publicada. null = 404 (no visible/no publicada).
 * La usan getPagina y getHtmlCrudo (misma semántica de visibilidad).
 */
async function resolverPaginaPublicada(
  coleccionId: string,
  rawPath: string,
): Promise<{
  arbol: ReturnType<typeof construirArbolVisible>;
  nodo: NonNullable<ReturnType<typeof resolverPath>>['nodo'];
  breadcrumb: { titulo: string; slug: string }[];
  documento: Documento;
  version: DocumentoVersion;
} | null> {
  const path = String(rawPath ?? '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  const arbol = construirArbolVisible(await getDocumentosPlanos(coleccionId));

  // Resolver SOBRE el árbol visible: lo no publicado no existe para el visor.
  const resuelto = resolverPath(arbol, path);
  if (!resuelto) return null;

  const q = new Parse.Query<Documento>('Documento');
  q.equalTo('exists' as any, true as any);
  q.include('version' as any);
  const documento = await q.get(resuelto.nodo.id, { useMasterKey: true }).catch(() => null);
  const version = documento?.getVersion();
  if (!documento || !version) return null;

  return { arbol, nodo: resuelto.nodo, breadcrumb: resuelto.breadcrumb, documento, version };
}

/**
 * GET /api/contenidos/:slug/pagina/*path — la página publicada con todo lo
 * que el visor necesita: cuerpoHtml, toc, breadcrumb, prev/next.
 */
export async function getPagina(req: Request, res: Response): Promise<void> {
  try {
    const info = await autorizarColeccion(req, res);
    if (!info) return;

    const resuelto = await resolverPaginaPublicada(info.id, (req.params as Record<string, string>)[0]);
    if (!resuelto) {
      res.status(404).json({ status: 'error', message: 'No encontrado' });
      return;
    }
    const { arbol, nodo, breadcrumb, documento, version } = resuelto;

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

    const resuelto = await resolverPaginaPublicada(info.id, (req.params as Record<string, string>)[0]);
    if (!resuelto || resuelto.nodo.tipo !== 'html') {
      res.status(404).json({ status: 'error', message: 'No encontrado' });
      return;
    }

    // CSP del documento: inline sí (demo autocontenida), recursos externos
    // no. La directiva `sandbox` fuerza el origen opaco EN EL SERVIDOR:
    // incluso abierto top-level (link directo, fuera del iframe) el
    // documento corre sandboxeado — sin cookies, sin same-origin, sin forms.
    res.setHeader(
      'Content-Security-Policy',
      "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; form-action 'none'; frame-ancestors 'self'",
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Sin cache: el cuerpo depende de la autorización de ESTE request
    // (despublicar o revocar acceso debe surtir efecto de inmediato).
    res.setHeader('Cache-Control', 'private, no-store');
    res.type('text/html; charset=utf-8').send(resuelto.version.getCuerpo());
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al servir la página' });
  }
}

const BUSQUEDA_MAX = 20;

// Disponibilidad del índice de texto, memoizada por campo: sin esto, un
// entorno sin índices pagaría DOS $text fallidos por cada tecleo, siempre.
const indiceTexto = new Map<string, boolean>();

function escaparRegex(q: string): string {
  return q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** fullText si el índice existe (memoizado); si no, regex contains. */
async function buscarConIndice<T extends Parse.Object>(
  crearQuery: () => Parse.Query<T>,
  campo: string,
  q: string,
  configurar: (query: Parse.Query<T>) => void,
): Promise<T[]> {
  if (indiceTexto.get(campo) !== false) {
    try {
      const query = crearQuery();
      (query as any).fullText(campo, q);
      configurar(query);
      const out = await query.find({ useMasterKey: true });
      indiceTexto.set(campo, true);
      return out;
    } catch {
      indiceTexto.set(campo, false); // sin índice: regex de aquí en adelante
    }
  }
  const query = crearQuery();
  query.matches(campo as any, new RegExp(escaparRegex(q), 'i') as any);
  configurar(query);
  return query.find({ useMasterKey: true });
}

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

    // Mapa documentoId → {path, coleccion} de TODO lo visible del usuario
    // (árboles en paralelo: una espera por colección secuencial sumaría).
    const paginaPorId = new Map<string, { path: string; coleccion: string; clave: string | null; titulo: string; tipo?: string }>();
    const arboles = await Promise.all(
      infos.map(async (info) => ({ info, arbol: construirArbolVisible(await getDocumentosPlanos(info.id)) })),
    );
    for (const { info, arbol } of arboles) {
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

    // 1) Títulos que matchean y 2) cuerpos cuya versión ES la publicada de
    // un documento del scope (matchesKeyInQuery contra Documento.version:
    // sin ventanas post-filtradas que dejarían fuera publicadas cuando el
    // historial/borradores dominan los matches). En paralelo.
    const [docsTitulo, versionesCuerpo] = await Promise.all([
      buscarConIndice<Documento>(baseDocs, 'titulo', q, (query) => {
        query.include('version' as any);
        query.limit(BUSQUEDA_MAX);
      }),
      buscarConIndice<DocumentoVersion>(
        () => {
          const vq = new Parse.Query<DocumentoVersion>('DocumentoVersion');
          vq.equalTo('exists' as any, true as any);
          (vq as any).matchesKeyInQuery('objectId', 'version.objectId', baseDocs());
          return vq;
        },
        'cuerpo',
        q,
        (query) => {
          query.include('documento' as any);
          query.limit(BUSQUEDA_MAX);
        },
      ),
    ]);

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
