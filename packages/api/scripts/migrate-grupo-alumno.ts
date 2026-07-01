/**
 * Script histórico de migración one-time: AppUser.grupo → GrupoAlumno.
 * Ejecutado durante Fase 2. No es necesario volver a ejecutarlo.
 */
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

const dryRun = process.argv.includes('--dry-run');

async function main() {
  console.log('=== Migración: crear GrupoAlumno desde AppUser.grupo ===');
  if (dryRun) console.log('*** DRY RUN — no se guardarán cambios ***\n');

  let skip = 0;
  const batchSize = 200;
  let created = 0;
  let skipped = 0;
  let total = 0;

  while (true) {
    const query = new Parse.Query('AppUser');
    query.equalTo('userType', 'alumno');
    query.exists('grupo');
    query.equalTo('exists', true);
    query.limit(batchSize);
    query.skip(skip);
    query.ascending('createdAt');

    const alumnos = await query.find({ useMasterKey: true });
    if (alumnos.length === 0) break;

    total += alumnos.length;

    for (const alumno of alumnos) {
      const grupo = alumno.get('grupo');
      if (!grupo?.id) {
        skipped++;
        continue;
      }

      // Verificar si ya existe un GrupoAlumno
      const linkQuery = new Parse.Query('GrupoAlumno');
      linkQuery.equalTo('alumno', alumno);
      linkQuery.equalTo('grupo', grupo);
      const existing = await linkQuery.first({ useMasterKey: true });

      if (existing) {
        skipped++;
        continue;
      }

      if (dryRun) {
        console.log(`  [DRY] Crearía GrupoAlumno: alumno=${alumno.id} (${alumno.get('email')}), grupo=${grupo.id}, active=${alumno.get('active')}`);
      } else {
        const link = new Parse.Object('GrupoAlumno');
        link.set('alumno', alumno);
        link.set('grupo', grupo);
        link.set('active', alumno.get('active') ?? true);
        link.set('exists', true);
        await link.save(null, { useMasterKey: true });
      }
      created++;
    }

    skip += alumnos.length;
    console.log(`  Procesados ${total} alumnos...`);
  }

  console.log(`\n=== Resultado ===`);
  console.log(`Total alumnos procesados: ${total}`);
  console.log(`GrupoAlumno creados: ${created}`);
  console.log(`Omitidos (ya existían o sin grupo): ${skipped}`);
  if (dryRun) console.log('\n*** DRY RUN — ejecutar sin --dry-run para aplicar cambios ***');
}

main().catch((err) => {
  console.error('Error en migración:', err);
  process.exit(1);
});
