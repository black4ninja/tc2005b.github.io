/**
 * Migración: reescribe los enlaces internos del Docusaurus en las páginas de la
 * BD tras pasar a multi-instancia (contenido de TC2005B bajo /docs/tc2005b/).
 *
 * Cambia `/docs/backend/…` → `/docs/tc2005b/backend/…` dentro de los bloques.
 * Se ancla en la comilla previa (`"/docs/backend/`) para NO tocar enlaces
 * externos como https://meeplab2015.github.io/tc2005b-docusaurus/docs/backend/…
 *
 * Uso:
 *   cd packages/api && npx tsx scripts/migrate-paginas-tc2005b.ts --dry-run
 *   cd packages/api && npx tsx scripts/migrate-paginas-tc2005b.ts
 */

import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { Pagina } from '../src/models/Pagina.js';

const dryRun = process.argv.includes('--dry-run');

const OLD = '"/docs/backend/';
const NEW = '"/docs/tc2005b/backend/';

async function main() {
  Parse.initialize(config.appId);
  (Parse as any).serverURL = config.serverURL;
  (Parse as any).masterKey = config.masterKey;

  if (dryRun) console.log('=== DRY RUN — no se guardará nada ===\n');
  console.log(`Conectando a Parse Server en ${config.serverURL}...\n`);

  const query = new Parse.Query<Pagina>('Pagina');
  query.equalTo('exists' as any, true as any);
  query.limit(10000);
  const paginas = await query.find({ useMasterKey: true });
  console.log(`Cargadas ${paginas.length} páginas.\n`);

  let updated = 0;
  let untouched = 0;

  for (const pagina of paginas) {
    const serialized = JSON.stringify(pagina.getBloques());
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
    console.log(`  ✓ ${pagina.getSlug()}: ${count} ocurrencia(s)`);
    updated++;
  }

  console.log(`\n${dryRun ? 'Se actualizarían' : 'Actualizadas'}: ${updated} | sin cambios: ${untouched}`);
  console.log('\nMigración completa.\n');
}

main().catch((error) => {
  console.error('Migración falló:', error);
  process.exit(1);
});
