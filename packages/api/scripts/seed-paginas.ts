/**
 * Seed script: Inserta páginas migradas desde labs en la BD
 *
 * Prerrequisito: ejecutar generate-paginas-json.ts desde packages/web
 * Uso: cd packages/api && npx tsx scripts/seed-paginas.ts
 *      cd packages/api && npx tsx scripts/seed-paginas.ts --dry-run
 *      cd packages/api && npx tsx scripts/seed-paginas.ts --file avances-data.json
 *      cd packages/api && npx tsx scripts/seed-paginas.ts --coleccion tc2005b
 *
 * Sin --coleccion las páginas nacen sin colección y NO aparecen en el picker del
 * calendario (que filtra por las colecciones del grupo). Pásala salvo que quieras
 * asignarlas después con migrate-paginas-coleccion.ts.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { Pagina } from '../src/models/Pagina.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dryRun = process.argv.includes('--dry-run');
const fileArgIndex = process.argv.indexOf('--file');
const dataFilename = fileArgIndex !== -1 && process.argv[fileArgIndex + 1]
  ? process.argv[fileArgIndex + 1]
  : 'paginas-data.json';
const coleccionArgIndex = process.argv.indexOf('--coleccion');
const coleccionSlug = coleccionArgIndex !== -1 ? process.argv[coleccionArgIndex + 1] : undefined;

interface ContentBlock {
  id: string;
  tipo: string;
  datos: Record<string, unknown>;
}

interface PaginaInput {
  titulo: string;
  slug: string;
  descripcion?: string;
  icono: string;
  bloques: ContentBlock[];
  publicado: boolean;
  orden: number;
}

async function main() {
  // Initialize Parse SDK
  Parse.initialize(config.appId);
  (Parse as any).serverURL = config.serverURL;
  (Parse as any).masterKey = config.masterKey;

  if (dryRun) {
    console.log('=== DRY RUN MODE — no changes will be saved ===\n');
  }

  console.log(`Connecting to Parse Server at ${config.serverURL}...`);

  let coleccion: Parse.Object | undefined;
  if (coleccionSlug) {
    const q = new Parse.Query('Coleccion');
    q.equalTo('slug', coleccionSlug);
    q.equalTo('exists', true);
    coleccion = await q.first({ useMasterKey: true });
    if (!coleccion) {
      console.error(`✗ No existe la colección con slug "${coleccionSlug}". Abortado.`);
      process.exit(1);
    }
    console.log(`Colección destino: ${coleccion.get('nombre')} (${coleccion.get('clave')})`);
  } else {
    console.warn('⚠ Sin --coleccion: las páginas quedarán sin colección y no saldrán en el picker del calendario.');
  }

  // Read the generated JSON
  const dataPath = resolve(__dirname, dataFilename);
  const raw = readFileSync(dataPath, 'utf-8');
  const paginas: PaginaInput[] = JSON.parse(raw);

  console.log(`\nLoaded ${paginas.length} pages from ${dataFilename}\n`);

  let created = 0;
  let skipped = 0;

  for (const data of paginas) {
    // Check if page with this slug already exists
    const existingQuery = new Parse.Query<Pagina>('Pagina');
    existingQuery.equalTo('slug' as any, data.slug as any);
    existingQuery.equalTo('exists' as any, true as any);
    const existing = await existingQuery.first({ useMasterKey: true });

    if (existing) {
      console.log(`  SKIP ${data.slug}: already exists (id: ${existing.id})`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  WOULD CREATE ${data.slug}: "${data.titulo}" (${data.bloques.length} bloques)`);
      created++;
      continue;
    }

    const pagina = new Pagina().initDefaults();
    pagina.setTitulo(data.titulo);
    pagina.setSlug(data.slug);
    if (data.descripcion) pagina.setDescripcion(data.descripcion);
    pagina.setIcono(data.icono);
    pagina.setBloques(data.bloques);
    pagina.setPublicado(data.publicado);
    pagina.setOrden(data.orden);
    if (coleccion) pagina.setColeccion(coleccion);

    await pagina.save(null, { useMasterKey: true });
    console.log(`  ✓ ${data.slug}: "${data.titulo}" (${data.bloques.length} bloques) → id: ${pagina.id}`);
    created++;
  }

  console.log(`\n${dryRun ? 'Would create' : 'Created'}: ${created} pages, Skipped: ${skipped}`);
  console.log('\nSeed paginas complete.\n');
}

main().catch((error) => {
  console.error('Seed paginas failed:', error);
  process.exit(1);
});
