/**
 * Migración: reescribe los enlaces del Docusaurus viejo (`/docs/...`) en las
 * Páginas del sitio (modelo `Pagina`) hacia el visor del CMS Contenidos
 * (`/contenidos/...`), usando el mismo mapa que el middleware de redirects
 * (`data/redirects-docs.json`).
 *
 * Recorre TODOS los valores string de los bloques de cada página (no solo el
 * `enlace` de la práctica), normaliza cada `/docs/...` (quita `/` final y
 * ancla), lo busca en el mapa y conserva la `#ancla`. Los `/docs/...` que no
 * estén en el mapa se reportan como "sin resolver" para revisión humana.
 *
 * Uso:
 *   cd packages/api && ./node_modules/.bin/tsx scripts/migrate-paginas-contenidos-url.ts --dry-run
 *   cd packages/api && ./node_modules/.bin/tsx scripts/migrate-paginas-contenidos-url.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { Pagina } from '../src/models/Pagina.js';

const dryRun = process.argv.includes('--dry-run');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MAPA: Record<string, string> = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../data/redirects-docs.json'), 'utf8'),
);

const RE_DOCS = /\/docs\/[A-Za-z0-9_\-/]+\/?(?:#[A-Za-z0-9_-]+)?/g;

interface Reporte { mapeados: number; sinResolver: Set<string>; }

function reescribirString(s: string, rep: Reporte): string {
  return s.replace(RE_DOCS, (full) => {
    const [rutaCruda, ancla] = full.split('#');
    const limpia = rutaCruda.replace(/\/+$/, '');
    // 1) match directo; 2) fallback formato viejo sin `/tc2005b` (p. ej.
    //    `/docs/backend/...`): probamos con el prefijo insertado. Ambos casos
    //    dependen de que la clave EXISTA en el mapa, así que los `/docs/...`
    //    externos (MDN, Node, Tailwind…) nunca colisionan y quedan intactos.
    const destino = MAPA[limpia] ?? MAPA[`/docs/tc2005b${limpia.slice('/docs'.length)}`];
    if (destino) {
      rep.mapeados += 1;
      return ancla ? `${destino}#${ancla}` : destino;
    }
    rep.sinResolver.add(full);
    return full;
  });
}

/** Reescribe recursivamente todos los strings de un valor JSON. */
function reescribir(valor: unknown, rep: Reporte): unknown {
  if (typeof valor === 'string') return reescribirString(valor, rep);
  if (Array.isArray(valor)) return valor.map((v) => reescribir(v, rep));
  if (valor && typeof valor === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor)) out[k] = reescribir(v, rep);
    return out;
  }
  return valor;
}

async function main() {
  Parse.initialize(config.appId);
  (Parse as any).serverURL = config.serverURL;
  (Parse as any).masterKey = config.masterKey;

  if (dryRun) console.log('=== DRY RUN — no se guardará nada ===\n');
  console.log(`Parse: ${config.serverURL}\n`);

  const q = new Parse.Query<Pagina>('Pagina');
  q.equalTo('exists' as any, true as any);
  q.limit(10000);
  const paginas = await q.find({ useMasterKey: true });
  console.log(`Cargadas ${paginas.length} páginas.\n`);

  const rep: Reporte = { mapeados: 0, sinResolver: new Set() };
  let cambiadas = 0;
  let sinCambio = 0;

  for (const pagina of paginas) {
    const bloques = pagina.getBloques();
    const antes = JSON.stringify(bloques);
    if (!antes.includes('/docs/')) { sinCambio += 1; continue; }

    const nuevos = reescribir(bloques, rep) as typeof bloques;
    const despues = JSON.stringify(nuevos);
    if (antes === despues) { sinCambio += 1; continue; } // solo tenía /docs/ sin mapeo

    const n = (antes.match(/\/docs\//g) ?? []).length;
    if (dryRun) {
      console.log(`  CAMBIARÍA ${pagina.getSlug()} (${n} enlace/s /docs/)`);
    } else {
      pagina.setBloques(nuevos);
      await pagina.save(null, { useMasterKey: true });
      console.log(`  ✓ ${pagina.getSlug()} (${n} enlace/s /docs/)`);
    }
    cambiadas += 1;
  }

  console.log('\n===== REPORTE =====');
  console.log(`${dryRun ? 'Se cambiarían' : 'Cambiadas'}:   ${cambiadas} páginas`);
  console.log(`Sin cambios:     ${sinCambio}`);
  console.log(`Enlaces mapeados:${rep.mapeados}`);
  console.log(`Sin resolver:    ${rep.sinResolver.size}`);
  for (const x of [...rep.sinResolver].sort()) console.log(`  ✗ ${x}`);
  console.log('===================\n');
  process.exit(0);
}

main().catch((error) => { console.error('Migración fallida:', error); process.exit(1); });
