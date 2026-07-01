/**
 * Seed de materias base. Idempotente (salta si el slug ya existe).
 *
 * Uso:
 *   cd packages/api && npx tsx scripts/seed-materias.ts
 *   cd packages/api && npx tsx scripts/seed-materias.ts --dry-run
 */

import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { Materia } from '../src/models/Materia.js';

const dryRun = process.argv.includes('--dry-run');

interface MateriaInput {
  nombre: string;
  slug: string;
  codigo: string;
}

const MATERIAS: MateriaInput[] = [
  {
    nombre: 'Construcción de Software y Toma de Decisiones',
    slug: 'tc2005b',
    codigo: 'TC2005B',
  },
  {
    nombre: 'Integración de seguridad informática en redes y sistemas de software',
    slug: 'tc2007b',
    codigo: 'TC2007B',
  },
];

async function main() {
  Parse.initialize(config.appId);
  (Parse as any).serverURL = config.serverURL;
  (Parse as any).masterKey = config.masterKey;

  if (dryRun) console.log('=== DRY RUN — no se guardará nada ===\n');
  console.log(`Conectando a Parse Server en ${config.serverURL}...\n`);

  let created = 0;
  let skipped = 0;

  for (const data of MATERIAS) {
    const existing = new Parse.Query<Materia>('Materia');
    existing.equalTo('slug' as any, data.slug as any);
    existing.equalTo('exists' as any, true as any);
    const found = await existing.first({ useMasterKey: true });

    if (found) {
      console.log(`  SKIP ${data.slug}: ya existe (id: ${found.id})`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  CREARÍA ${data.slug}: "${data.nombre}" (${data.codigo})`);
      created++;
      continue;
    }

    const materia = new Materia().initDefaults();
    materia.setNombre(data.nombre);
    materia.setSlug(data.slug);
    materia.setCodigo(data.codigo);
    await materia.save(null, { useMasterKey: true });
    console.log(`  ✓ ${data.slug}: "${data.nombre}" → id: ${materia.id}`);
    created++;
  }

  console.log(`\n${dryRun ? 'Se crearían' : 'Creadas'}: ${created}, saltadas: ${skipped}`);
  console.log('\nSeed materias completo.\n');
}

main().catch((error) => {
  console.error('Seed materias falló:', error);
  process.exit(1);
});
