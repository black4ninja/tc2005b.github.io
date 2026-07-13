/**
 * Migración: convierte el string `Grupo.curso` en un pointer `Grupo.materia`.
 *
 * Para cada grupo con `curso` no vacío y sin materia asignada:
 *   1. Busca (o crea) una Materia por `codigo === curso`.
 *   2. Enlaza `grupo.materia`.
 * El slug de la materia se deriva del curso en minúsculas (kebab).
 *
 * Los campos `curso`/`nombreCurso` ya se retiraron del modelo `Grupo` (nadie los
 * leía), así que este script lee las columnas crudas con `.get()`. Sigue aquí
 * para entornos cuya BD todavía tenga los strings legacy sin migrar; contra una
 * BD ya migrada es un no-op.
 *
 * Uso:
 *   cd packages/api && npx tsx scripts/migrate-grupo-curso-to-materia.ts --dry-run
 *   cd packages/api && npx tsx scripts/migrate-grupo-curso-to-materia.ts
 */

import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { Grupo } from '../src/models/Grupo.js';
import { Materia } from '../src/models/Materia.js';

const dryRun = process.argv.includes('--dry-run');

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita diacríticos combinantes
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function findOrCreateMateria(
  codigo: string,
  nombre: string,
  cache: Map<string, Materia>,
): Promise<Materia> {
  const codigoCanonico = codigo.trim().toUpperCase();
  const slug = toSlug(codigo);
  const cached = cache.get(codigoCanonico);
  if (cached) return cached;

  // Reusar si ya existe por código canónico O por slug (misma instancia Docusaurus),
  // para no crear duplicados que rompan la unicidad de slug/código.
  const byCodigo = new Parse.Query<Materia>('Materia');
  byCodigo.equalTo('codigo' as any, codigoCanonico as any);
  byCodigo.equalTo('exists' as any, true as any);
  const bySlug = new Parse.Query<Materia>('Materia');
  bySlug.equalTo('slug' as any, slug as any);
  bySlug.equalTo('exists' as any, true as any);
  let materia = await Parse.Query.or(byCodigo, bySlug).first({ useMasterKey: true });

  if (!materia) {
    materia = new Materia().initDefaults();
    materia.setCodigo(codigoCanonico);
    materia.setNombre(nombre || codigoCanonico);
    materia.setSlug(slug);
    if (!dryRun) {
      await materia.save(null, { useMasterKey: true });
      console.log(`  + Materia creada: ${codigoCanonico} (slug: ${slug}) → id: ${materia.id}`);
    } else {
      console.log(`  + Materia CREARÍA: ${codigoCanonico} (slug: ${slug})`);
    }
  }

  cache.set(codigoCanonico, materia);
  return materia;
}

async function main() {
  Parse.initialize(config.appId);
  (Parse as any).serverURL = config.serverURL;
  (Parse as any).masterKey = config.masterKey;

  if (dryRun) console.log('=== DRY RUN — no se guardará nada ===\n');
  console.log(`Conectando a Parse Server en ${config.serverURL}...\n`);

  const query = new Parse.Query<Grupo>('Grupo');
  query.equalTo('exists' as any, true as any);
  query.limit(10000);
  const grupos = await query.find({ useMasterKey: true });
  console.log(`Cargados ${grupos.length} grupos.\n`);

  const materiaCache = new Map<string, Materia>();
  let linked = 0;
  let already = 0;
  let sinCurso = 0;

  for (const grupo of grupos) {
    if (grupo.getMateria()) {
      already++;
      continue;
    }
    const curso = ((grupo.get('curso') as string) ?? '').trim();
    if (!curso) {
      sinCurso++;
      continue;
    }

    const materia = await findOrCreateMateria(curso, (grupo.get('nombreCurso') as string) ?? '', materiaCache);

    if (dryRun) {
      console.log(`  ENLAZARÍA grupo "${grupo.getName()}" → materia ${curso}`);
      linked++;
      continue;
    }

    grupo.setMateria(materia);
    await grupo.save(null, { useMasterKey: true });
    console.log(`  ✓ grupo "${grupo.getName()}" → materia ${curso}`);
    linked++;
  }

  console.log(
    `\n${dryRun ? 'Se enlazarían' : 'Enlazados'}: ${linked} grupos | ya tenían materia: ${already} | sin curso: ${sinCurso}`,
  );
  console.log('\nMigración completa.\n');
}

main().catch((error) => {
  console.error('Migración falló:', error);
  process.exit(1);
});
