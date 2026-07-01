/**
 * Migración: reescribe las URLs viejas del Docusaurus en las páginas de la BD.
 *
 * Cambia cualquier ocurrencia de "/docs/docs/" por "/docs/" dentro de los
 * bloques de cada objeto Pagina (Parse/MongoDB). Necesario porque el Docusaurus
 * pasó de servir en /docs/docs/... a /docs/... (routeBasePath: '/').
 *
 * Uso:
 *   cd packages/api && npx tsx scripts/migrate-paginas-docs-url.ts --dry-run
 *   cd packages/api && npx tsx scripts/migrate-paginas-docs-url.ts
 */

import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { Pagina } from '../src/models/Pagina.js';

const dryRun = process.argv.includes('--dry-run');

const OLD = '/docs/docs/';
const NEW = '/docs/';

async function main() {
  Parse.initialize(config.appId);
  (Parse as any).serverURL = config.serverURL;
  (Parse as any).masterKey = config.masterKey;

  if (dryRun) {
    console.log('=== DRY RUN — no se guardará nada ===\n');
  }
  console.log(`Conectando a Parse Server en ${config.serverURL}...\n`);

  const query = new Parse.Query<Pagina>('Pagina');
  query.equalTo('exists' as any, true as any);
  query.limit(10000);
  const paginas = await query.find({ useMasterKey: true });

  console.log(`Cargadas ${paginas.length} páginas.\n`);

  let updated = 0;
  let untouched = 0;

  for (const pagina of paginas) {
    const bloques = pagina.getBloques();
    const serialized = JSON.stringify(bloques);

    if (!serialized.includes(OLD)) {
      untouched++;
      continue;
    }

    const count = serialized.split(OLD).length - 1;
    const newBloques = JSON.parse(serialized.split(OLD).join(NEW));

    if (dryRun) {
      console.log(`  CAMBIARÍA ${pagina.getSlug()}: ${count} ocurrencia(s)`);
      updated++;
      continue;
    }

    pagina.setBloques(newBloques);
    await pagina.save(null, { useMasterKey: true });
    console.log(`  ✓ ${pagina.getSlug()}: ${count} ocurrencia(s) reescrita(s)`);
    updated++;
  }

  console.log(
    `\n${dryRun ? 'Se actualizarían' : 'Actualizadas'}: ${updated} páginas, sin cambios: ${untouched}`,
  );
  console.log('\nMigración completa.\n');
}

main().catch((error) => {
  console.error('Migración fallida:', error);
  process.exit(1);
});
