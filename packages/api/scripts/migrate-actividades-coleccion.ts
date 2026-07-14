/**
 * Backfill: `ActividadEvaluacion.coleccion` (la plantilla de la malla).
 *
 * La plantilla era GLOBAL: `copiarPlantilla` la estampaba entera en cualquier
 * grupo, fuera de su materia o no. Ahora solo se copian las plantillas de las
 * colecciones del grupo.
 *
 * NO TOCA NINGUNA CALIFICACIÓN, y esta vez es literal: la plantilla es un TROQUEL
 * de un solo uso. `copiarPlantilla` la copia POR VALOR a `ActividadEvaluacionGrupo`
 * y no guarda referencia de vuelta. El plan de evaluación, la malla del alumno y
 * el cálculo de la nota trabajan sobre esas copias y **nunca miran la plantilla**.
 * Cambiar de qué colección es una plantilla no puede mover nada ya estampado.
 *
 * Sin colección, una plantilla no se copia a ningún grupo: de ahí el backfill.
 *
 * Idempotente: solo toca las plantillas que aún no tienen colección.
 *
 *   ./node_modules/.bin/tsx scripts/migrate-actividades-coleccion.ts --coleccion tc2005b --dry-run
 *   ./node_modules/.bin/tsx scripts/migrate-actividades-coleccion.ts --coleccion tc2005b
 *
 * ⚠️ Dev comparte la BD de PRODUCCIÓN. Corre --dry-run primero, y córrelo ANTES
 *    de desplegar: el código viejo ignora el campo, pero el nuevo, sin backfill,
 *    dejaría a `copiarPlantilla` sin nada que copiar en ningún grupo.
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
    console.error('Uso: migrate-actividades-coleccion.ts --coleccion <slug> [--dry-run]');
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
  console.log(`Colección destino: ${coleccion.get('nombre')} (${coleccion.get('clave')})\n`);

  const qa = new Parse.Query('ActividadEvaluacion');
  qa.equalTo('exists', true);
  qa.doesNotExist('coleccion');
  qa.ascending('orden');
  qa.limit(1000);
  const huerfanas = await qa.find({ useMasterKey: true });

  console.log(`── PLANTILLA (ActividadEvaluacion) sin colección: ${huerfanas.length}`);
  for (const a of huerfanas.slice(0, 15)) {
    console.log(`   ${dryRun ? '[dry-run]' : '[migrar] '} [${String(a.get('tipo')).padEnd(10)}] ${a.get('nombre')}`);
  }
  if (huerfanas.length > 15) console.log(`   … y ${huerfanas.length - 15} más`);

  // Lo ya estampado no se toca: se cuenta solo para dejarlo por escrito.
  const qg = new Parse.Query('ActividadEvaluacionGrupo');
  qg.equalTo('exists', true);
  qg.limit(5000);
  const delGrupo = await qg.find({ useMasterKey: true });

  const qal = new Parse.Query('ActividadEvaluacionAlumno');
  qal.equalTo('exists', true);
  qal.limit(10000);
  const delAlumno = await qal.find({ useMasterKey: true });

  console.log(`\n── YA ESTAMPADO (no se toca):`);
  console.log(`   ActividadEvaluacionGrupo:  ${delGrupo.length}  (las actividades reales de los grupos)`);
  console.log(`   ActividadEvaluacionAlumno: ${delAlumno.length}  (las celdas de malla con la nota)`);
  console.log(`   La copia es POR VALOR: nada de esto apunta a la plantilla.`);

  if (huerfanas.length === 0) {
    console.log('\n✓ Nada que migrar.');
    return;
  }
  if (dryRun) {
    console.log('\n--dry-run: no se escribió nada. Quita la bandera para aplicar.');
    return;
  }

  for (const a of huerfanas) a.set('coleccion', coleccion);
  await Parse.Object.saveAll(huerfanas, { useMasterKey: true });
  console.log(`\n✓ ${huerfanas.length} plantilla(s) asignadas a "${slug}".`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
