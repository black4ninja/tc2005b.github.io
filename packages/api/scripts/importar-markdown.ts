/**
 * Importa una carpeta de Markdown a una colección del CMS "Contenidos".
 *
 * Pensado para el flujo de autoría con agentes de IA: el agente escribe los
 * `.md`, se revisan con `preview-contenido.ts`, y este script los sube como
 * BORRADOR (o publicados con --publish). Es IDEMPOTENTE: re-ejecutarlo tras
 * editar los archivos actualiza el borrador de cada página (no duplica).
 *
 * Requiere el API corriendo (como el resto de los scripts).
 *
 * Uso:
 *   cd packages/api
 *   ./node_modules/.bin/tsx scripts/importar-markdown.ts \
 *       --coleccion <slug> [--padre <slug/slug/...>] [--publish] [--dry-run] <carpeta>
 *
 * Estructura de la carpeta:
 *   subcarpetas  → categorías (agrupan páginas); `_category_.json` opcional
 *                  ({ "label": "...", "position": N }) da nombre/orden.
 *   archivos .md → páginas. Frontmatter opcional: title, slug, sidebar_position.
 *   imágenes relativas junto al .md → se suben como Recurso y se referencian.
 */
import fs from 'fs';
import path from 'path';
import Parse from 'parse/node';
import { renderMarkdown, extraerToc } from '@tc2005b/contenido-pipeline';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { Coleccion } from '../src/models/Coleccion.js';
import { Documento } from '../src/models/Documento.js';
import { DocumentoVersion } from '../src/models/DocumentoVersion.js';
import { Recurso } from '../src/models/Recurso.js';

/* ── CLI ── */
function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const dryRun = process.argv.includes('--dry-run');
const publicar = process.argv.includes('--publish');
const coleccionSlug = arg('coleccion');
const padreRuta = arg('padre'); // slug/slug/... de una categoría existente
const carpeta = process.argv.slice(2).find(
  (a, i, arr) => !a.startsWith('--') && arr[i - 1] !== '--coleccion' && arr[i - 1] !== '--padre',
);

if (!coleccionSlug || !carpeta) {
  console.error('Uso: importar-markdown.ts --coleccion <slug> [--padre <ruta>] [--publish] [--dry-run] <carpeta>');
  process.exit(1);
}

const EXT_IMG = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg']);
const MIME: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', avif: 'image/avif', svg: 'image/svg+xml',
};

function slugify(t: string): string {
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function segmento(nombre: string): string {
  return nombre.replace(/^[\d.]+[-_]/, '');
}
function parseFrontmatter(src: string): { cuerpo: string; sidebarPosition?: number; title?: string; slug?: string } {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { cuerpo: src };
  const b = m[1];
  const pos = b.match(/^sidebar_position:\s*([\d.]+)\s*$/m);
  const tit = b.match(/^title:\s*['"]?(.+?)['"]?\s*$/m);
  const slg = b.match(/^slug:\s*['"]?([a-z0-9-]+)['"]?\s*$/m);
  return { cuerpo: src.slice(m[0].length), sidebarPosition: pos ? Number(pos[1]) : undefined, title: tit?.[1], slug: slg?.[1] };
}
function tituloH1(cuerpo: string, fallback: string): string {
  return cuerpo.match(/^#\s+(.+)$/m)?.[1].trim() ?? fallback;
}
/** ¿La carpeta contiene algún .md/.mdx (recursivo)? Si no, es solo de assets. */
function tieneMarkdown(dir: string): boolean {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (tieneMarkdown(full)) return true; }
    else if (/\.mdx?$/.test(e.name)) return true;
  }
  return false;
}

const reporte = { categorias: 0, paginasNuevas: 0, paginasActualizadas: 0, recursos: 0, publicadas: 0, sinResolver: [] as string[] };

/* ── Subida de imágenes relativas → Recurso (idempotente por ruta absoluta) ── */
const recursosSubidos = new Map<string, string>();
async function subirImagen(abs: string, coleccion: Coleccion, documento: Documento): Promise<string | null> {
  if (recursosSubidos.has(abs)) return recursosSubidos.get(abs)!;
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
  const nombre = slugify(path.basename(abs).replace(/\.[^.]+$/, '')).slice(0, 80) + path.extname(abs).toLowerCase();
  const mime = MIME[path.extname(abs).slice(1).toLowerCase()] ?? 'application/octet-stream';
  if (dryRun) { const r = `recurso:DRY/${nombre}`; recursosSubidos.set(abs, r); return r; }
  const buffer = fs.readFileSync(abs);
  const file = new Parse.File(nombre, { base64: buffer.toString('base64') }, mime);
  await file.save({ useMasterKey: true });
  // Reusar el Recurso existente de este documento con el mismo nombre (idempotencia:
  // re-importar tras editar no debe dejar Recursos huérfanos en la BD ni en S3).
  const recurso = (await new Parse.Query<Recurso>('Recurso')
    .equalTo('documento' as any, documento as any)
    .equalTo('nombre' as any, nombre as any)
    .first({ useMasterKey: true })) ?? new Recurso().initDefaults();
  recurso.setColeccion(coleccion);
  recurso.setDocumento(documento);
  recurso.setNombre(nombre);
  recurso.setArchivo(file);
  recurso.setMime(mime);
  recurso.setBytes(buffer.length);
  await recurso.save(null, { useMasterKey: true });
  const ref = `recurso:${recurso.id}/${nombre}`;
  recursosSubidos.set(abs, ref);
  return ref;
}

const RE_IMG = /(!\[[^\]]*\]\()([^)\s]+)(\))/g;
async function reescribir(cuerpo: string, dirMd: string, coleccion: Coleccion, documento: Documento): Promise<string> {
  const tareas: { de: string; a: string }[] = [];
  for (const m of cuerpo.matchAll(RE_IMG)) {
    const url = m[2];
    if (/^(https?:|recurso:|\/)/.test(url)) continue; // externas/absolutas/ya-recurso: se dejan
    const abs = path.resolve(dirMd, decodeURIComponent(url));
    const ref = await subirImagen(abs, coleccion, documento);
    if (ref) { tareas.push({ de: m[0], a: `${m[1]}${ref}${m[3]}` }); reporte.recursos += 1; }
    else reporte.sinResolver.push(`${url} (imagen no encontrada, en ${dirMd})`);
  }
  let out = cuerpo;
  for (const t of tareas) out = out.replace(t.de, t.a);
  return out;
}

/* ── Hijos existentes de un padre en la colección (para idempotencia) ── */
function queryDocs(coleccion: Coleccion) {
  const q = new Parse.Query<Documento>('Documento');
  q.equalTo('exists' as any, true as any);
  q.equalTo('coleccion' as any, coleccion as any);
  return q;
}
async function hallarPorSlug(coleccion: Coleccion, padre: Documento | null, slug: string): Promise<Documento | null> {
  const q = queryDocs(coleccion).equalTo('slug' as any, slug as any);
  if (padre) q.equalTo('padre' as any, padre as any); else q.doesNotExist('padre' as any);
  q.include(['version', 'borrador'] as any);
  return (await q.first({ useMasterKey: true })) ?? null;
}
async function nHermanos(coleccion: Coleccion, padre: Documento | null): Promise<number> {
  const q = queryDocs(coleccion);
  if (padre) q.equalTo('padre' as any, padre as any); else q.doesNotExist('padre' as any);
  return q.count({ useMasterKey: true });
}

/** Resuelve --padre (slug/slug/...) a un Documento categoría existente. */
async function resolverPadre(coleccion: Coleccion, ruta: string): Promise<Documento | null> {
  let padre: Documento | null = null;
  for (const slug of ruta.split('/').filter(Boolean)) {
    const encontrado = await hallarPorSlug(coleccion, padre, slug);
    if (!encontrado || encontrado.getTipo() !== 'categoria') {
      console.error(`--padre: no existe la categoría "${slug}" en la ruta indicada.`);
      process.exit(1);
    }
    padre = encontrado;
  }
  return padre;
}

/* ── Crea/actualiza una página (idempotente) ── */
async function upsertPagina(
  coleccion: Coleccion, padre: Documento | null, archivo: string, orden: number,
): Promise<void> {
  const src = fs.readFileSync(archivo, 'utf8');
  const { cuerpo, sidebarPosition, title, slug: slugFm } = parseFrontmatter(src);
  const base = path.basename(archivo).replace(/\.mdx?$/, '');
  const slug = slugFm ?? (slugify(segmento(base)) || 'pagina');
  const titulo = title ?? tituloH1(cuerpo, segmento(base));

  let doc = await hallarPorSlug(coleccion, padre, slug);
  const esNueva = !doc;
  if (dryRun) {
    console.log(`${esNueva ? 'CREARÍA' : 'ACTUALIZARÍA'} página: ${slug} ("${titulo}")`);
    await reescribir(cuerpo, path.dirname(archivo), coleccion, doc as any); // cuenta recursos
    esNueva ? reporte.paginasNuevas++ : reporte.paginasActualizadas++;
    return;
  }
  if (!doc) {
    doc = new Documento().initDefaults();
    doc.setColeccion(coleccion);
    doc.setPadre(padre);
    doc.setTipo('md');
    doc.setSlug(slug);
    doc.setOrden(sidebarPosition ?? orden);
    doc.setPublicado(false);
    reporte.paginasNuevas++;
  } else {
    reporte.paginasActualizadas++;
  }
  doc.setTitulo(titulo);
  if (sidebarPosition !== undefined) doc.setOrden(sidebarPosition);
  await doc.save(null, { useMasterKey: true });

  const cuerpoFinal = await reescribir(cuerpo, path.dirname(archivo), coleccion, doc);

  // Guardar/actualizar el BORRADOR único de la página.
  let borrador = doc.getBorrador();
  if (!borrador) {
    borrador = new DocumentoVersion().initDefaults();
    borrador.setDocumento(doc);
    borrador.setNumero((doc.getVersion()?.getNumero() ?? 0) + 1);
  }
  borrador.setCuerpo(cuerpoFinal);
  borrador.setMensaje('importado de markdown');
  await borrador.save(null, { useMasterKey: true });
  if (!doc.getBorrador()) { doc.setBorrador(borrador); await doc.save(null, { useMasterKey: true }); }

  if (publicar) {
    const html = await renderMarkdown(cuerpoFinal);
    borrador.setCuerpoHtml(html);
    borrador.setToc(extraerToc(html));
    borrador.setNumero((doc.getVersion()?.getNumero() ?? 0) + 1);
    await borrador.save(null, { useMasterKey: true });
    doc.setVersion(borrador);
    doc.setBorrador(null);
    doc.setPublicado(true);
    await doc.save(null, { useMasterKey: true });
    reporte.publicadas++;
  }
}

/* ── Recorre la carpeta creando categorías + páginas ── */
async function procesar(coleccion: Coleccion, dir: string, padre: Documento | null): Promise<void> {
  const entradas = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => !e.name.startsWith('.')).sort((a, b) => a.name.localeCompare(b.name));
  let orden = 0;
  for (const e of entradas) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // Carpetas sin markdown (imagenes/, assets/…) solo guardan recursos: no son categorías.
      if (!tieneMarkdown(full)) continue;
      let label = segmento(e.name);
      let position: number | undefined;
      const catJson = path.join(full, '_category_.json');
      if (fs.existsSync(catJson)) {
        try { const c = JSON.parse(fs.readFileSync(catJson, 'utf8')); if (c.label) label = c.label; if (typeof c.position === 'number') position = c.position; } catch { /* ignore */ }
      }
      const slug = slugify(segmento(e.name)) || 'cat';
      let cat = await hallarPorSlug(coleccion, padre, slug);
      if (dryRun) {
        console.log(`${cat ? 'EXISTE' : 'CREARÍA'} categoría: ${slug} ("${label}")`);
        reporte.categorias++;
      } else if (!cat) {
        cat = new Documento().initDefaults();
        cat.setColeccion(coleccion); cat.setPadre(padre); cat.setTipo('categoria');
        cat.setTitulo(label); cat.setSlug(slug); cat.setOrden(position ?? orden); cat.setPublicado(false);
        await cat.save(null, { useMasterKey: true });
        reporte.categorias++;
      }
      await procesar(coleccion, full, cat);
    } else if (/\.mdx?$/.test(e.name)) {
      await upsertPagina(coleccion, padre, full, orden);
    }
    orden += 1;
  }
}

async function main() {
  const abs = path.resolve(process.cwd(), carpeta!);
  if (!fs.existsSync(abs)) { console.error(`No existe la carpeta: ${abs}`); process.exit(1); }

  Parse.initialize(config.appId);
  (Parse as any).serverURL = config.serverURL;
  (Parse as any).masterKey = config.masterKey;

  const coleccion = await new Parse.Query<Coleccion>('Coleccion')
    .equalTo('slug' as any, coleccionSlug as any).equalTo('exists' as any, true as any)
    .first({ useMasterKey: true });
  if (!coleccion) { console.error(`No existe la colección "${coleccionSlug}".`); process.exit(1); }

  const padre = padreRuta ? await resolverPadre(coleccion, padreRuta) : null;

  if (dryRun) console.log('=== DRY RUN — no se escribe nada ===\n');
  console.log(`Colección: ${coleccionSlug}${padreRuta ? ` · bajo /${padreRuta}` : ''} · modo: ${publicar ? 'PUBLICAR' : 'BORRADOR'}\n`);

  // orden base = después de los hijos ya existentes del destino
  const base = await nHermanos(coleccion, padre);
  await procesar(coleccion, abs, padre);
  void base;

  console.log('\n===== REPORTE =====');
  console.log(`Categorías:            ${reporte.categorias}`);
  console.log(`Páginas nuevas:        ${reporte.paginasNuevas}`);
  console.log(`Páginas actualizadas:  ${reporte.paginasActualizadas}`);
  console.log(`Imágenes subidas:      ${reporte.recursos}`);
  console.log(`Publicadas:            ${reporte.publicadas}`);
  console.log(`Sin resolver:          ${reporte.sinResolver.length}`);
  for (const x of reporte.sinResolver) console.log(`  ✗ ${x}`);
  console.log('===================\n');
  console.log(dryRun ? 'Dry-run terminado.' : `Listo. ${publicar ? 'Publicado.' : 'Quedó como BORRADOR — revísalo en el visor (admin) y publícalo.'}`);
  process.exit(0);
}

main().catch((error) => { console.error('[importar-markdown] error:', error); process.exit(1); });
