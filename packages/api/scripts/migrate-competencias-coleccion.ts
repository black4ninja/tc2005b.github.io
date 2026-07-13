/**
 * Backfill: `Competencia.coleccion` + colección para los grupos que no tienen.
 *
 * Las competencias eran GLOBALES: una sola lista que se materializaba para todos
 * los alumnos de todos los grupos. Ahora la malla se arma con las competencias de
 * las colecciones del grupo (`Grupo.colecciones` → `Competencia.coleccion`).
 *
 * Sin este backfill, una competencia sin colección **no le llega a nadie** y un
 * grupo sin colecciones se queda sin malla.
 *
 * NO TOCA NINGUNA CALIFICACIÓN. `CompetenciaAlumno`, `PlanEvaluacion`,
 * `Entrevista` y `EvaluacionEntrevista` se quedan exactamente como están: siguen
 * apuntando a las mismas competencias por pointer/id. Lo único que cambia es de
 * qué colección es cada competencia.
 *
 * Idempotente: solo toca lo que aún no tiene colección.
 *
 *   ./node_modules/.bin/tsx scripts/migrate-competencias-coleccion.ts --coleccion tc2005b --dry-run
 *   ./node_modules/.bin/tsx scripts/migrate-competencias-coleccion.ts --coleccion tc2005b
 *
 * ⚠️ Dev comparte la BD de PRODUCCIÓN. Corre --dry-run primero, y córrelo ANTES
 *    de desplegar: el código viejo ignora el campo, pero el nuevo, sin backfill,
 *    dejaría a todos los grupos sin competencias.
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
    console.error('Uso: migrate-competencias-coleccion.ts --coleccion <slug> [--dry-run]');
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

  /* ── 1. Competencias sin colección ── */
  const qk = new Parse.Query('Competencia');
  qk.equalTo('exists', true);
  qk.doesNotExist('coleccion');
  qk.ascending('orden');
  qk.limit(1000);
  const huerfanas = await qk.find({ useMasterKey: true });

  console.log(`── COMPETENCIAS sin colección: ${huerfanas.length}`);
  for (const c of huerfanas) {
    const tipo = c.get('esCalculada') ? 'calculada' : 'directa  ';
    console.log(`   ${dryRun ? '[dry-run]' : '[migrar] '} ${tipo}  ${c.get('competencia')}`);
  }

  /* ── 2. Grupos sin colecciones ──
     Un grupo sin colecciones se queda sin competencias: no podría crear la malla
     de un alumno nuevo. Se le asigna la misma colección. */
  const qg = new Parse.Query('Grupo');
  qg.equalTo('exists', true);
  qg.include('colecciones');
  qg.limit(500);
  const grupos = await qg.find({ useMasterKey: true });
  const sinColecciones = grupos.filter(
    (g) => ((g.get('colecciones') ?? []) as Parse.Object[]).filter((c) => c && c.get('exists') !== false).length === 0,
  );

  console.log(`\n── GRUPOS sin colecciones: ${sinColecciones.length} de ${grupos.length}`);
  for (const g of grupos) {
    const cols = ((g.get('colecciones') ?? []) as Parse.Object[]).filter((c) => c && c.get('exists') !== false);
    const marca = cols.length === 0 ? (dryRun ? '[dry-run]' : '[asignar]') : '[ya tiene]';
    console.log(`   ${marca} ${String(g.get('name')).padEnd(12)} [${cols.map((c) => c.get('slug')).join(', ') || '(ninguna)'}]`);
  }

  /* ── 3. Comprobación de seguridad: nada de calificaciones se toca ── */
  const qca = new Parse.Query('CompetenciaAlumno');
  qca.equalTo('exists', true);
  qca.limit(5000);
  const celdas = await qca.find({ useMasterKey: true });
  console.log(`\n── CALIFICACIONES: ${celdas.length} celdas de malla — NO se tocan (siguen apuntando a las mismas competencias).`);

  if (huerfanas.length === 0 && sinColecciones.length === 0) {
    console.log('\n✓ Nada que migrar.');
    return;
  }
  if (dryRun) {
    console.log('\n--dry-run: no se escribió nada. Quita la bandera para aplicar.');
    return;
  }

  if (huerfanas.length > 0) {
    for (const c of huerfanas) c.set('coleccion', coleccion);
    await Parse.Object.saveAll(huerfanas, { useMasterKey: true });
    console.log(`\n✓ ${huerfanas.length} competencia(s) asignadas a "${slug}".`);
  }
  if (sinColecciones.length > 0) {
    for (const g of sinColecciones) g.set('colecciones', [coleccion]);
    await Parse.Object.saveAll(sinColecciones, { useMasterKey: true });
    console.log(`✓ ${sinColecciones.length} grupo(s) con la colección "${slug}" asignada.`);
    console.log('  (esto también les da acceso a la documentación de esa colección en el CMS)');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
