/**
 * Preview local de contenido del CMS "Contenidos" — SIN servidor ni BD.
 *
 * Renderiza uno o más `.md` con el MISMO pipeline que usa el visor en
 * producción (@tc2005b/contenido-pipeline) y los estilos reales
 * (contenido-render.css), genera un HTML autocontenido y lo abre en el
 * navegador. Recupera el "escribir y probar directo antes de desplegar" que
 * daba Docusaurus, pero contra este CMS.
 *
 * Uso:
 *   cd packages/api
 *   ./node_modules/.bin/tsx scripts/preview-contenido.ts <archivo.md | carpeta> [--no-open]
 *
 * Ejemplos:
 *   ./node_modules/.bin/tsx scripts/preview-contenido.ts ../../borradores/mi-tutorial.md
 *   ./node_modules/.bin/tsx scripts/preview-contenido.ts ../../borradores/modulo-nuevo/
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { renderMarkdown } from '@tc2005b/contenido-pipeline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSS_VISOR = path.resolve(__dirname, '../../web/src/styles/contenido-render.css');

// Tokens de tema claro (subconjunto de variables.css que usa contenido-render).
const TOKENS = `:root{
  --bg-page:#f8fafc; --bg-card:#ffffff; --text-primary:#0f172a;
  --text-secondary:#475569; --text-muted:#94a3b8; --border-color:#e2e8f0;
  --sidebar-active-color:#2563eb; --dash-primary:#5d87ff; --dash-success:#13deb9;
  --dash-warning:#ffae1f; --dash-danger:#fa896b; --dash-info:#539bff;
}
body{margin:0;background:var(--bg-page);font-family:Inter,-apple-system,"Segoe UI",Roboto,sans-serif;}
.pagina{max-width:820px;margin:0 auto;padding:32px 40px;background:var(--bg-card);}
.aviso{max-width:820px;margin:0 auto;padding:8px 40px;color:var(--text-muted);font-size:12.5px;}
.sep{max-width:820px;margin:24px auto;border:none;border-top:2px dashed var(--border-color);}`;

const args = process.argv.slice(2);
const noOpen = args.includes('--no-open');
const target = args.find((a) => !a.startsWith('--'));

if (!target) {
  console.error('Uso: preview-contenido.ts <archivo.md | carpeta> [--no-open]');
  process.exit(1);
}

/** Recolecta los .md/.mdx del target (archivo suelto o carpeta, recursivo). */
function recolectar(p: string): string[] {
  const stat = fs.statSync(p);
  if (stat.isFile()) return /\.mdx?$/.test(p) ? [p] : [];
  const out: string[] = [];
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(p, e.name);
    if (e.isDirectory()) out.push(...recolectar(full));
    else if (/\.mdx?$/.test(e.name)) out.push(full);
  }
  return out.sort();
}

/** Quita el frontmatter YAML del cuerpo (el preview no lo renderiza). */
function sinFrontmatter(src: string): string {
  const m = src.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return m ? src.slice(m[0].length) : src;
}

async function main() {
  const abs = path.resolve(process.cwd(), target!);
  if (!fs.existsSync(abs)) {
    console.error(`No existe: ${abs}`);
    process.exit(1);
  }

  const archivos = recolectar(abs);
  if (archivos.length === 0) {
    console.error('No se encontraron archivos .md/.mdx.');
    process.exit(1);
  }

  const css = fs.existsSync(CSS_VISOR) ? fs.readFileSync(CSS_VISOR, 'utf8') : '';
  const secciones: string[] = [];
  for (const f of archivos) {
    const rel = path.relative(abs, f) || path.basename(f);
    const html = await renderMarkdown(sinFrontmatter(fs.readFileSync(f, 'utf8')));
    // NOTA: los recursos (recurso:/api/...) no resuelven fuera del CMS; en el
    // preview local las imágenes por referencia recurso: no cargan (es esperado).
    secciones.push(`<div class="aviso">📄 ${rel}</div><article class="pagina contenido-render">${html}</article>`);
  }

  const doc = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preview — Contenidos</title><style>${TOKENS}\n${css}</style></head>
<body>${secciones.join('<hr class="sep">')}</body></html>`;

  const salida = path.join(os.tmpdir(), `preview-contenidos-${archivos.length}p.html`);
  fs.writeFileSync(salida, doc);
  console.log(`✓ ${archivos.length} página(s) renderizada(s) → ${salida}`);

  if (!noOpen) {
    const abrir = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    execFile(abrir, [salida], (err) => {
      if (err) console.log(`(ábrelo manualmente: ${salida})`);
    });
  }
}

main().catch((error) => {
  console.error('[preview-contenido] error:', error);
  process.exit(1);
});
