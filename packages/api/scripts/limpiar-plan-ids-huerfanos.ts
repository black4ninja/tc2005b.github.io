/**
 * Limpieza: quita de `PlanEvaluacion.periodos[]` los ids que ya no apuntan a
 * nada vivo.
 *
 * `periodos[].competencias` y `periodos[].actividades` son ids sueltos en un
 * array JSON, sin FK ni cascada fiable. Cuando una actividad o competencia se
 * borra (soft-delete), su id se puede quedar colgado ahí. En producción había
 * dos así en el plan de un grupo.
 *
 * NO CAMBIA NINGUNA NOTA: esos ids ya no sumaban nada. Al borrarse la actividad
 * se borraron también las celdas de los alumnos, así que no entraban ni al
 * numerador ni al denominador. Se calculaba sobre las vivas, que es lo correcto.
 * Esto solo saca la basura.
 *
 * Sí evita, en cambio, que el plan quede ATASCADO: la validación nueva rechaza
 * los ids que apuntan a algo vivo de OTRO grupo, y esos ids muertos no se pintan
 * en la UI, así que un admin no podría quitarlos a mano.
 *
 *   ./node_modules/.bin/tsx scripts/limpiar-plan-ids-huerfanos.ts --dry-run
 *   ./node_modules/.bin/tsx scripts/limpiar-plan-ids-huerfanos.ts
 *
 * Idempotente. ⚠️ Dev comparte la BD de PRODUCCIÓN: corre --dry-run primero.
 */
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const qgr = new Parse.Query('Grupo');
  qgr.equalTo('exists', true);
  qgr.limit(500);
  const grupos = await qgr.find({ useMasterKey: true });
  const nombreDe = (id?: string) => grupos.find((g) => g.id === id)?.get('name') ?? '(?)';

  const qp = new Parse.Query('PlanEvaluacion');
  qp.equalTo('exists', true);
  qp.limit(500);
  const planes = await qp.find({ useMasterKey: true });

  const aGuardar: Parse.Object[] = [];

  for (const plan of planes) {
    const gid = plan.get('grupo')?.id;
    if (!gid) continue;
    const grupoPtr = Parse.Object.extend('Grupo').createWithoutData(gid);

    // Actividades VIVAS del grupo.
    const qa = new Parse.Query('ActividadEvaluacionGrupo');
    qa.equalTo('exists', true);
    qa.equalTo('grupo', grupoPtr);
    qa.limit(1000);
    const actsVivas = new Set((await qa.find({ useMasterKey: true })).map((a) => a.id!));

    // Competencias VIVAS de las colecciones del grupo.
    const grupo = grupos.find((g) => g.id === gid)!;
    const cols = ((grupo.get('colecciones') ?? []) as Parse.Object[]).filter((c) => c);
    let compsVivas = new Set<string>();
    if (cols.length > 0) {
      const qc = new Parse.Query('Competencia');
      qc.equalTo('exists', true);
      qc.equalTo('active', true);
      qc.containedIn('coleccion', cols);
      qc.limit(1000);
      compsVivas = new Set((await qc.find({ useMasterKey: true })).map((c) => c.id!));
    }

    const periodos = (plan.get('periodos') ?? []) as any[];
    let podadosAct = 0;
    let podadosComp = 0;

    for (const p of periodos) {
      const a0 = (p.actividades ?? []).length;
      p.actividades = (p.actividades ?? []).filter((id: string) => actsVivas.has(id));
      podadosAct += a0 - p.actividades.length;

      const c0 = (p.competencias ?? []).length;
      p.competencias = (p.competencias ?? []).filter((id: string) => compsVivas.has(id));
      podadosComp += c0 - p.competencias.length;
    }

    const total = podadosAct + podadosComp;
    const marca = total === 0 ? '[limpio]  ' : dryRun ? '[dry-run] ' : '[limpiar] ';
    console.log(`${marca} ${String(nombreDe(gid)).padEnd(12)} ids muertos: ${podadosAct} actividad(es), ${podadosComp} competencia(s)`);

    if (total > 0) {
      plan.set('periodos', periodos);
      aGuardar.push(plan);
    }
  }

  console.log(`\nPlanes con basura: ${aGuardar.length} de ${planes.length}`);
  console.log('NOTA: esto no cambia ninguna calificación — esos ids ya no sumaban nada.');

  if (aGuardar.length === 0) {
    console.log('\n✓ Nada que limpiar.');
    return;
  }
  if (dryRun) {
    console.log('\n--dry-run: no se escribió nada. Quita la bandera para aplicar.');
    return;
  }

  await Parse.Object.saveAll(aGuardar, { useMasterKey: true });
  console.log(`\n✓ ${aGuardar.length} plan(es) limpiados.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
