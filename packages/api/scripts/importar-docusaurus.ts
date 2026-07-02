/**
 * Importador Docusaurus → CMS "Contenidos" (US-6, design §6).
 *
 * Traduce una instancia (packages/docusaurus/docs/<slug>) a una Coleccion
 * preservando el contenido y la navegación por índice:
 *   carpeta + _category_.json → Documento tipo categoria (label, position)
 *   archivo .md + sidebar_position → Documento md PUBLICADO (v1, render+toc)
 *   imágenes relativas junto al .md → Recurso del documento (recurso:)
 *   assets absolutos de static/ (/img, /ppts, …) → Recurso de colección
 *   enlaces internos .md → rutas /contenidos/<slug>/… (o reporte si no resuelven)
 *
 * Además genera/mezcla el mapa de redirects viejos → nuevos en
 * src/data/redirects-docs.json (los usa el middleware de la US-6, que se
 * enciende en el corte de la US-7).
 *
 * Uso (requiere el API corriendo, como los demás scripts):
 *   cd packages/api
 *   ./node_modules/.bin/tsx scripts/importar-docusaurus.ts --slug tc2005b --clave TC2005B \
 *       --nombre "Construcción de software y toma de decisiones" [--dry-run]
 *
 * La colección NO debe existir (idempotencia simple: bórrala del admin para
 * reintentar). --dry-run no escribe nada y imprime el reporte de paridad.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Parse from 'parse/node';
import { renderMarkdown, extraerToc } from '@tc2005b/contenido-pipeline';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { Coleccion } from '../src/models/Coleccion.js';
import { Documento } from '../src/models/Documento.js';
import { DocumentoVersion } from '../src/models/DocumentoVersion.js';
import { Recurso } from '../src/models/Recurso.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_DOCUSAURUS = path.resolve(__dirname, '../../docusaurus');
// Fuera de src/: tsc no copia .json a dist y producción corre desde dist/.
// src/middlewares y dist/middlewares resuelven ambos a esta misma ruta.
const RUTA_REDIRECTS = path.resolve(__dirname, '../data/redirects-docs.json');

/* ── CLI ── */
function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const dryRun = process.argv.includes('--dry-run');
const slugColeccion = arg('slug');
const claveColeccion = (arg('clave') ?? slugColeccion ?? '').toUpperCase();
const nombreColeccion = arg('nombre') ?? claveColeccion;

if (!slugColeccion) {
  console.error('Falta --slug <instancia> (p. ej. tc2005b)');
  process.exit(1);
}

/* ── Utilidades de nombres ── */
const EXT_ASSET = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'pdf', 'zip', 'html',
  'sql', 'css', 'js', 'mp3', 'wav', 'mp4', 'mov', 'webm', 'csv',
]);

function slugify(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Segmento de URL como lo genera Docusaurus: quita el prefijo numérico, conserva el case. */
function segmentoDocusaurus(nombre: string): string {
  return nombre.replace(/^[\d.]+[-_]/, '');
}

/** Slug del CMS para un segmento (kebab en minúsculas). */
function slugCms(nombre: string): string {
  return slugify(segmentoDocusaurus(nombre)) || slugify(nombre) || 'pagina';
}

/** Frontmatter mínimo: sidebar_position y title (suficiente para estas instancias). */
function parseFrontmatter(src: string): { cuerpo: string; sidebarPosition?: number; title?: string } {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { cuerpo: src };
  const bloque = m[1];
  const pos = bloque.match(/^sidebar_position:\s*([\d.]+)\s*$/m);
  const tit = bloque.match(/^title:\s*['"]?(.+?)['"]?\s*$/m);
  return {
    cuerpo: src.slice(m[0].length),
    sidebarPosition: pos ? Number(pos[1]) : undefined,
    title: tit?.[1],
  };
}

function tituloDesdeCuerpo(cuerpo: string, fallback: string): string {
  const h1 = cuerpo.match(/^#\s+(.+)$/m);
  return h1?.[1].trim() ?? fallback;
}

/* ── Modelo en memoria ── */
interface NodoImport {
  tipo: 'categoria' | 'md' | 'html';
  titulo: string;
  slug: string;         // slug del CMS
  segmentoUrl: string;  // segmento como en la URL de Docusaurus (para redirects)
  orden: number;
  archivo?: string;     // ruta absoluta del .md/.html
  cuerpo?: string;
  /** README.md: Docusaurus lo sirve en la URL de la CARPETA (índice). */
  esReadme?: boolean;
  hijos: NodoImport[];
}

interface Reporte {
  categorias: number;
  paginas: number;
  paginasHtml: number;
  assetsDocumento: number;
  assetsStatic: number;
  enlacesReescritos: number;
  enlacesInternos: number;
  sinResolver: string[];
  ignorados: string[];
  redirects: number;
}

const reporte: Reporte = {
  categorias: 0,
  paginas: 0,
  paginasHtml: 0,
  assetsDocumento: 0,
  assetsStatic: 0,
  enlacesReescritos: 0,
  enlacesInternos: 0,
  sinResolver: [],
  ignorados: [],
  redirects: 0,
};

/** Lee el árbol de la instancia desde el filesystem. */
function leerDirectorio(dir: string): NodoImport[] {
  const nodos: NodoImport[] = [];
  const entradas = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => !e.name.startsWith('.'));

  for (const e of entradas) {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) {
      // Carpetas con _ inicial: excluidas del build de Docusaurus (legacy).
      if (e.name.startsWith('_')) {
        reporte.ignorados.push(`${ruta} (carpeta _excluida de Docusaurus)`);
        continue;
      }
      let label = segmentoDocusaurus(e.name);
      let position: number | undefined;
      const catJson = path.join(ruta, '_category_.json');
      if (fs.existsSync(catJson)) {
        try {
          const cat = JSON.parse(fs.readFileSync(catJson, 'utf8'));
          if (typeof cat.label === 'string') label = cat.label;
          if (typeof cat.position === 'number') position = cat.position;
        } catch {
          reporte.sinResolver.push(`${catJson} (JSON inválido)`);
        }
      }
      const hijos = leerDirectorio(ruta);
      if (hijos.length === 0) {
        reporte.ignorados.push(`${ruta} (carpeta sin páginas)`);
        continue;
      }
      const prefijo = e.name.match(/^([\d.]+)[-_]/);
      nodos.push({
        tipo: 'categoria',
        titulo: label,
        slug: slugCms(e.name),
        segmentoUrl: segmentoDocusaurus(e.name),
        orden: position ?? (prefijo ? Number(prefijo[1]) : 999),
        hijos,
      });
      reporte.categorias += 1;
      continue;
    }

    const ext = path.extname(e.name).toLowerCase();
    if (ext === '.md' || ext === '.mdx') {
      const src = fs.readFileSync(ruta, 'utf8');
      const { cuerpo, sidebarPosition, title } = parseFrontmatter(src);
      const base = e.name.slice(0, -ext.length);
      const prefijo = base.match(/^([\d.]+)[-_]/);
      // README.md = página índice de la carpeta en Docusaurus: va primero.
      const esReadme = /^readme$/i.test(base) || /^index$/i.test(base);
      nodos.push({
        tipo: 'md',
        titulo: title ?? tituloDesdeCuerpo(cuerpo, segmentoDocusaurus(base)),
        slug: slugCms(base),
        segmentoUrl: segmentoDocusaurus(base),
        orden: esReadme ? -1 : (sidebarPosition ?? (prefijo ? Number(prefijo[1]) : 999)),
        archivo: ruta,
        cuerpo,
        esReadme,
        hijos: [],
      });
      reporte.paginas += 1;
    } else if (e.name === '_category_.json') {
      // ya procesado por el padre
    } else if (EXT_ASSET.has(ext.slice(1))) {
      // asset junto a los .md: se sube solo si alguna página lo referencia
    } else {
      reporte.ignorados.push(ruta);
    }
  }

  // Slugs duplicados en el mismo nivel: sufijo numérico determinista.
  const porSlug = new Map<string, number>();
  for (const n of nodos) {
    const visto = porSlug.get(n.slug) ?? 0;
    if (visto > 0) n.slug = `${n.slug}-${visto + 1}`;
    porSlug.set(n.slug, visto + 1);
  }
  nodos.sort((a, b) => a.orden - b.orden);
  return nodos;
}

/* ── Recursos (assets) ── */
const recursosSubidos = new Map<string, string>(); // ruta absoluta → referencia recurso:

function sanitizarNombreArchivo(original: string): string {
  const punto = original.lastIndexOf('.');
  const base = slugify(punto > 0 ? original.slice(0, punto) : original).slice(0, 80) || 'archivo';
  const ext = punto > 0 ? original.slice(punto + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) : '';
  return ext ? `${base}.${ext}` : base;
}

const MIME_POR_EXT: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  avif: 'image/avif', svg: 'image/svg+xml', pdf: 'application/pdf', zip: 'application/zip',
  html: 'text/html', sql: 'text/plain', css: 'text/css', js: 'text/javascript',
};

async function subirRecurso(
  rutaAbs: string,
  coleccion: Coleccion | null,
  documento: Documento | null,
): Promise<string | null> {
  const previa = recursosSubidos.get(rutaAbs);
  if (previa) return previa;
  if (!fs.existsSync(rutaAbs) || !fs.statSync(rutaAbs).isFile()) return null;

  const nombre = sanitizarNombreArchivo(path.basename(rutaAbs));
  if (dryRun) {
    const ref = `recurso:DRY/${nombre}`;
    recursosSubidos.set(rutaAbs, ref);
    return ref;
  }
  const buffer = fs.readFileSync(rutaAbs);
  const mime = MIME_POR_EXT[path.extname(rutaAbs).slice(1).toLowerCase()] ?? 'application/octet-stream';
  const parseFile = new Parse.File(nombre, { base64: buffer.toString('base64') }, mime);
  await parseFile.save({ useMasterKey: true });

  const recurso = new Recurso().initDefaults();
  recurso.setColeccion(coleccion!);
  // Dueño: el documento que lo referenció primero (los de static/ son de colección).
  recurso.setDocumento(documento);
  recurso.setNombre(nombre);
  recurso.setArchivo(parseFile);
  recurso.setMime(mime);
  recurso.setBytes(buffer.length);
  await recurso.save(null, { useMasterKey: true });

  const ref = `recurso:${recurso.id}/${nombre}`;
  recursosSubidos.set(rutaAbs, ref);
  return ref;
}

/* ── Reescritura de enlaces ── */
// Mapa archivo .md (ruta absoluta) → path del CMS (para enlaces internos).
const pathCmsPorArchivo = new Map<string, string>();

function indexarPaths(nodos: NodoImport[], prefijo = ''): void {
  for (const n of nodos) {
    const p = prefijo ? `${prefijo}/${n.slug}` : n.slug;
    if (n.tipo === 'categoria') indexarPaths(n.hijos, p);
    else if (n.archivo) pathCmsPorArchivo.set(n.archivo, p);
  }
}

// URL con UN nivel de paréntesis balanceados: nombres reales de capturas de
// pantalla incluyen "(s)" — con [^)\s]+ el enlace se truncaba y se ignoraba
// en silencio.
const RE_ENLACE_MD = /(!?)\[([^\]]*)\]\(<?([^()\s]*(?:\([^()\s]*\)[^()\s]*)*)>?(\s+"[^"]*")?\)/g;

/** Rangos [inicio, fin) de comentarios HTML (contenido legacy comentado). */
function rangosComentarios(cuerpo: string): [number, number][] {
  const rangos: [number, number][] = [];
  for (const m of cuerpo.matchAll(/<!--[\s\S]*?-->/g)) {
    rangos.push([m.index!, m.index! + m[0].length]);
  }
  return rangos;
}

async function reescribirCuerpo(
  cuerpo: string,
  dirMd: string,
  coleccion: Coleccion | null,
  documento: Documento | null,
): Promise<string> {
  // Ediciones POSICIONALES [inicio, fin) — replace() de primera ocurrencia
  // reescribía la copia comentada (o el texto del enlace) en vez del href.
  const ediciones: { inicio: number; fin: number; texto: string }[] = [];
  const comentarios = rangosComentarios(cuerpo);

  const resolverInterno = (url: string): string | null => {
    const base = url.startsWith('/')
      ? path.join(RAIZ_DOCUSAURUS, 'docs', slugColeccion!, decodeURIComponent(url))
      : path.resolve(dirMd, decodeURIComponent(url));
    // Candidatos: el archivo tal cual, .md/.mdx implícitos, o el índice de
    // carpeta (README/readme/index — el repo usa ambos cases).
    const candidatos = [
      base,
      `${base}.md`,
      `${base}.mdx`,
      path.join(base, 'README.md'),
      path.join(base, 'readme.md'),
      path.join(base, 'index.md'),
    ];
    for (const c of candidatos) {
      const destino = pathCmsPorArchivo.get(c);
      if (destino) return destino;
    }
    return null;
  };

  for (const m of cuerpo.matchAll(RE_ENLACE_MD)) {
    const [completo, bang, textoEnlace, urlCruda, tituloOpc] = m;
    // Enlaces dentro de comentarios HTML: no se renderizan — no tocar ni reportar.
    if (comentarios.some(([a, b]) => m.index! >= a && m.index! < b)) continue;
    // pathname:// es el protocolo de Docusaurus para servir archivos de
    // static/ sin pasar por el router SPA: equivale a una ruta absoluta.
    const [urlSinAncla, ...anclaPartes] = urlCruda.split('#');
    const url = urlSinAncla.replace(/^pathname:\/\//, '');
    if (!url || /^(https?:|mailto:|recurso:|#)/.test(urlCruda)) continue;

    const emitir = (nuevaUrl: string) => {
      ediciones.push({
        inicio: m.index!,
        fin: m.index! + completo.length,
        texto: `${bang}[${textoEnlace}](${nuevaUrl}${tituloOpc ?? ''})`,
      });
      reporte.enlacesReescritos += 1;
    };
    const ancla = anclaPartes.length ? `#${anclaPartes.join('#')}` : '';
    const ext = path.extname(url).slice(1).toLowerCase();

    // 1) Asset (relativo junto al .md, o absoluto de static/)
    if (EXT_ASSET.has(ext)) {
      const abs = url.startsWith('/')
        ? path.join(RAIZ_DOCUSAURUS, 'static', decodeURIComponent(url))
        : path.resolve(dirMd, decodeURIComponent(url));
      const ref = await subirRecurso(abs, coleccion, url.startsWith('/') ? null : documento);
      if (ref) {
        emitir(ref);
        if (url.startsWith('/')) reporte.assetsStatic += 1;
        else reporte.assetsDocumento += 1;
      } else {
        reporte.sinResolver.push(`${url} (asset no encontrado, en ${dirMd})`);
      }
      continue;
    }

    // 2) Enlace interno: .md/.mdx explícito, sin extensión, o carpeta (README)
    if (ext === 'md' || ext === 'mdx' || ext === '') {
      const destino = resolverInterno(url.replace(/\/+$/, ''));
      if (destino) {
        emitir(`/contenidos/${slugColeccion}/${destino}${ancla}`);
        reporte.enlacesInternos += 1;
      } else {
        reporte.sinResolver.push(`${url} (enlace interno no resuelto, en ${dirMd})`);
      }
      continue;
    }

    // 3) Extensión desconocida: NUNCA en silencio — el reporte de paridad
    // es lo que el admin usa para validar antes de publicar.
    reporte.sinResolver.push(`${url} (extensión no manejada, en ${dirMd})`);
  }

  // Aplicar de atrás hacia adelante (los rangos no se traslapan).
  let salida = cuerpo;
  for (const e of ediciones.sort((a, b) => b.inicio - a.inicio)) {
    salida = salida.slice(0, e.inicio) + e.texto + salida.slice(e.fin);
  }
  return salida;
}

/* ── Redirects viejo → nuevo ── */
const redirects: Record<string, string> = {};

function acumularRedirects(nodos: NodoImport[], prefijoViejo: string, prefijoNuevo: string): void {
  for (const n of nodos) {
    const viejo = `${prefijoViejo}/${n.segmentoUrl}`;
    const nuevo = `${prefijoNuevo}/${n.slug}`;
    if (n.tipo === 'categoria') acumularRedirects(n.hijos, viejo, nuevo);
    else {
      // README.md: Docusaurus lo sirve en la URL de la CARPETA — el redirect
      // real es carpeta → página readme del CMS (no /README, que nunca existió).
      redirects[n.esReadme ? prefijoViejo : viejo] = nuevo;
      reporte.redirects += 1;
    }
  }
}

/* ── Persistencia en Parse ── */
async function crearDocumentos(
  nodos: NodoImport[],
  coleccion: Coleccion,
  padre: Documento | null,
): Promise<void> {
  for (let i = 0; i < nodos.length; i += 1) {
    const n = nodos[i];
    const documento = new Documento().initDefaults();
    documento.setColeccion(coleccion);
    documento.setPadre(padre);
    documento.setTitulo(n.titulo);
    documento.setSlug(n.slug);
    documento.setTipo(n.tipo);
    documento.setOrden(i);
    documento.setPublicado(n.tipo !== 'categoria');
    await documento.save(null, { useMasterKey: true });

    if (n.tipo === 'categoria') {
      await crearDocumentos(n.hijos, coleccion, documento);
      continue;
    }

    const cuerpoFinal = await reescribirCuerpo(n.cuerpo ?? '', path.dirname(n.archivo!), coleccion, documento);
    const version = new DocumentoVersion().initDefaults();
    version.setDocumento(documento);
    version.setNumero(1);
    version.setCuerpo(cuerpoFinal);
    version.setMensaje('importado de Docusaurus');
    if (n.tipo === 'md') {
      const html = await renderMarkdown(cuerpoFinal);
      version.setCuerpoHtml(html);
      version.setToc(extraerToc(html));
    } else {
      version.setCuerpoHtml('');
      version.setToc([]);
    }
    await version.save(null, { useMasterKey: true });
    documento.setVersion(version);
    await documento.save(null, { useMasterKey: true });
  }
}

/** En dry-run igual recorremos cuerpos para llenar el reporte de enlaces. */
async function simularCuerpos(nodos: NodoImport[]): Promise<void> {
  for (const n of nodos) {
    if (n.tipo === 'categoria') await simularCuerpos(n.hijos);
    else await reescribirCuerpo(n.cuerpo ?? '', path.dirname(n.archivo!), null, null);
  }
}

/* ── Main ── */
async function main() {
  const dirInstancia = path.join(RAIZ_DOCUSAURUS, 'docs', slugColeccion!);
  if (!fs.existsSync(dirInstancia)) {
    console.error(`No existe la instancia: ${dirInstancia}`);
    process.exit(1);
  }

  if (dryRun) console.log('=== DRY RUN — no se escribirá nada (no requiere servidor) ===\n');
  console.log(`Instancia:  ${dirInstancia}`);
  console.log(`Colección:  ${slugColeccion} (${claveColeccion} — ${nombreColeccion})\n`);

  if (!dryRun) {
    Parse.initialize(config.appId);
    (Parse as any).serverURL = config.serverURL;
    (Parse as any).masterKey = config.masterKey;

    // La colección no debe existir (reintento = borrarla del admin primero).
    const existe = await new Parse.Query<Coleccion>('Coleccion')
      .equalTo('exists' as any, true as any)
      .equalTo('slug' as any, slugColeccion as any)
      .first({ useMasterKey: true });
    if (existe) {
      console.error(`Ya existe una colección con slug "${slugColeccion}". Bórrala del admin para reimportar.`);
      process.exit(1);
    }
  }

  const arbol = leerDirectorio(dirInstancia);
  indexarPaths(arbol);
  acumularRedirects(arbol, `/docs/${slugColeccion}`, `/contenidos/${slugColeccion}`);

  if (dryRun) {
    await simularCuerpos(arbol);
  } else {
    const coleccion = new Coleccion().initDefaults();
    coleccion.setNombre(nombreColeccion);
    coleccion.setSlug(slugColeccion!);
    coleccion.setClave(claveColeccion);
    coleccion.setPublicada(false); // el admin la publica al validar la paridad
    await coleccion.save(null, { useMasterKey: true });

    await crearDocumentos(arbol, coleccion, null);

    // Mezclar redirects con los existentes (varias instancias, varias corridas).
    let previos: Record<string, string> = {};
    if (fs.existsSync(RUTA_REDIRECTS)) {
      try { previos = JSON.parse(fs.readFileSync(RUTA_REDIRECTS, 'utf8')); } catch { /* regenerar */ }
    }
    fs.mkdirSync(path.dirname(RUTA_REDIRECTS), { recursive: true });
    fs.writeFileSync(RUTA_REDIRECTS, `${JSON.stringify({ ...previos, ...redirects }, null, 2)}\n`);
    console.log(`Redirects escritos en ${RUTA_REDIRECTS}`);
  }

  /* ── Reporte de paridad ── */
  console.log('\n===== REPORTE DE PARIDAD =====');
  console.log(`Categorías:            ${reporte.categorias}`);
  console.log(`Páginas md:            ${reporte.paginas}`);
  console.log(`Assets de documento:   ${reporte.assetsDocumento}`);
  console.log(`Assets de static:      ${reporte.assetsStatic}`);
  console.log(`Enlaces reescritos:    ${reporte.enlacesReescritos} (${reporte.enlacesInternos} internos)`);
  console.log(`Redirects generados:   ${reporte.redirects}`);
  console.log(`Ignorados:             ${reporte.ignorados.length}`);
  for (const x of reporte.ignorados.slice(0, 10)) console.log(`  · ${x}`);
  if (reporte.ignorados.length > 10) console.log(`  … y ${reporte.ignorados.length - 10} más`);
  console.log(`SIN RESOLVER:          ${reporte.sinResolver.length}`);
  for (const x of reporte.sinResolver) console.log(`  ✗ ${x}`);
  console.log('==============================\n');
  console.log(dryRun ? 'Dry-run terminado.' : `Importación terminada: la colección "${slugColeccion}" quedó como BORRADOR (publícala tras validar).`);
  process.exit(0);
}

main().catch((error) => {
  console.error('[importar-docusaurus] error:', error);
  process.exit(1);
});
