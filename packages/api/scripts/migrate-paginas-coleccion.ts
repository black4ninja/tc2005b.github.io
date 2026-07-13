/**
 * Backfill: asigna `Pagina.coleccion` a las páginas que no la tienen.
 *
 * Contexto: las páginas nacieron sin noción de materia (el seed las creó con
 * `grupoId: null`). Al atar Pagina -> Coleccion, las existentes quedan huérfanas
 * y desaparecerían del picker del calendario, que ahora filtra por las
 * colecciones del grupo. Este script las adopta en la colección indicada.
 *
 * Idempotente: solo toca las páginas SIN colección. Correrlo dos veces no hace
 * nada la segunda vez.
 *
 *   ./node_modules/.bin/tsx scripts/migrate-paginas-coleccion.ts --coleccion tc2005b --dry-run
 *   ./node_modules/.bin/tsx scripts/migrate-paginas-coleccion.ts --coleccion tc2005b
 *
 * ⚠️ Dev comparte la BD de PRODUCCIÓN. Corre --dry-run primero.
 */
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

function parseArgs() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const i = argv.indexOf('--coleccion');
  const slug = i >= 0 ? argv[i + 1] : undefined;
  if (!slug) {
    console.error('Uso: migrate-paginas-coleccion.ts --coleccion <slug> [--dry-run]');
    process.exit(1);
  }
  return { slug, dryRun };
}

async function main() {
  const { slug, dryRun } = parseArgs();

  const qc = new Parse.Query('Coleccion');
  qc.equalTo('slug', slug);
  qc.equalTo('exists', true);
  const coleccion = await qc.first({ useMasterKey: true });
  if (!coleccion) {
    console.error(`✗ No existe la colección con slug "${slug}". Abortado.`);
    process.exit(1);
  }
  console.log(`Colección destino: ${coleccion.get('nombre')} (${coleccion.get('clave')}) id=${coleccion.id}\n`);

  const qp = new Parse.Query('Pagina');
  qp.equalTo('exists', true);
  qp.doesNotExist('coleccion');
  qp.ascending('slug');
  qp.limit(1000);
  const huerfanas = await qp.find({ useMasterKey: true });

  if (huerfanas.length === 0) {
    console.log('✓ No hay páginas sin colección. Nada que hacer.');
    return;
  }

  console.log(`${huerfanas.length} página(s) sin colección:`);
  for (const p of huerfanas) {
    console.log(`  ${dryRun ? '[dry-run]' : '[migrar] '} /paginas/${p.get('slug')}  "${p.get('titulo')}"`);
  }

  if (dryRun) {
    console.log(`\n--dry-run: no se escribió nada. Quita la bandera para aplicar.`);
    return;
  }

  for (const p of huerfanas) {
    p.set('coleccion', coleccion);
  }
  await Parse.Object.saveAll(huerfanas, { useMasterKey: true });
  console.log(`\n✓ ${huerfanas.length} página(s) asignadas a "${slug}".`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
