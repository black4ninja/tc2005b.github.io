import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';
import { Grupo } from '../src/models/Grupo.js';
import { Competencia } from '../src/models/Competencia.js';
import { ActividadEvaluacionGrupo } from '../src/models/ActividadEvaluacionGrupo.js';
import { PlanEvaluacion } from '../src/models/PlanEvaluacion.js';
import type { PeriodoConfig } from '../src/models/PlanEvaluacion.js';
import { BaseModel } from '../src/models/BaseModel.js';

const dryRun = process.argv.includes('--dry-run');

/** Competencia codes that belong to P1 */
const P1_COMP_CODES = ['STC0202', 'STC0203', 'SEG0303'];

async function main() {
  Parse.initialize(config.appId);
  (Parse as any).serverURL = config.serverURL;
  (Parse as any).masterKey = config.masterKey;

  if (dryRun) {
    console.log('=== DRY RUN MODE — no changes will be saved ===');
  }

  console.log(`\nConnecting to Parse Server at ${config.serverURL}...`);
  console.log('\n--- Seed Plan de Evaluación ---');

  // 1. Fetch all active groups
  const grupoQuery = BaseModel.queryActive<Grupo>('Grupo');
  grupoQuery.limit(1000);
  const grupos = await grupoQuery.find({ useMasterKey: true });
  console.log(`Found ${grupos.length} active grupo(s)`);

  if (grupos.length === 0) {
    console.log('No groups found. Nothing to do.');
    return;
  }

  // 2. Fetch all active competencias (global, not per group)
  const compQuery = BaseModel.queryActive<Competencia>('Competencia');
  compQuery.limit(1000);
  const allCompetencias = await compQuery.find({ useMasterKey: true });
  console.log(`Found ${allCompetencias.length} active competencia(s)`);

  // Identify P1 competencias by matching code in the competencia name
  const p1CompIds: string[] = [];
  const allCompIds: string[] = [];

  for (const comp of allCompetencias) {
    allCompIds.push(comp.id);
    const name = comp.getCompetencia();
    if (P1_COMP_CODES.some((code) => name.includes(code))) {
      p1CompIds.push(comp.id);
    }
  }

  console.log(`P1 competencias (${P1_COMP_CODES.join(', ')}): matched ${p1CompIds.length} of ${P1_COMP_CODES.length} expected`);
  if (p1CompIds.length !== P1_COMP_CODES.length) {
    console.warn('⚠ Not all P1 competencia codes were found. Check the data.');
  }

  let created = 0;
  let updated = 0;

  // 3. For each group, build and upsert the plan
  for (const grupo of grupos) {
    console.log(`\nProcessing grupo: ${grupo.getName()} (${grupo.id})`);

    // Fetch actividades for this group
    const actQuery = BaseModel.queryActive<ActividadEvaluacionGrupo>('ActividadEvaluacionGrupo');
    actQuery.equalTo('grupo', grupo);
    actQuery.limit(1000);
    const groupActividades = await actQuery.find({ useMasterKey: true });
    console.log(`  ${groupActividades.length} actividades in grupo`);

    // Split actividades by semanaPlaneada
    const p1ActIds: string[] = [];
    const p2ActIds: string[] = [];

    for (const act of groupActividades) {
      const semana = act.getSemanaPlaneada();
      if (semana >= 1 && semana <= 5) {
        p1ActIds.push(act.id);
      } else if (semana >= 6 && semana <= 11) {
        p2ActIds.push(act.id);
      }
      // semana 0 or >11 are not assigned to any period
    }

    console.log(`  P1 actividades (semanas 1-5): ${p1ActIds.length}`);
    console.log(`  P2 actividades (semanas 6-11): ${p2ActIds.length}`);

    const periodos: PeriodoConfig[] = [
      {
        nombre: 'Periodo 1',
        pesoFinal: 30,
        pesoCompetencias: 20,
        pesoActividades: 80,
        competencias: p1CompIds,
        actividades: p1ActIds,
        acumulativo: false,
      },
      {
        nombre: 'Periodo 2',
        pesoFinal: 70,
        pesoCompetencias: 70,
        pesoActividades: 30,
        competencias: allCompIds,
        actividades: p2ActIds,
        acumulativo: true,
      },
    ];

    // Check for existing plan
    const planQuery = BaseModel.queryActive<PlanEvaluacion>('PlanEvaluacion');
    planQuery.equalTo('grupo', grupo);
    planQuery.limit(1);
    const existingPlans = await planQuery.find({ useMasterKey: true });

    if (existingPlans.length > 0) {
      const plan = existingPlans[0];
      plan.setPeriodos(periodos);
      if (!dryRun) {
        await plan.save(null, { useMasterKey: true });
      }
      console.log(`  ${dryRun ? 'DRY-RUN UPDATE' : 'UPDATED'} existing plan (${plan.id})`);
      updated++;
    } else {
      const plan = new PlanEvaluacion().initDefaults();
      plan.setGrupo(grupo);
      plan.setPeriodos(periodos);
      if (!dryRun) {
        await plan.save(null, { useMasterKey: true });
      }
      console.log(`  ${dryRun ? 'DRY-RUN CREATE' : 'CREATED'} new plan`);
      created++;
    }
  }

  console.log(`\nSeed plan de evaluación done: ${created} created, ${updated} updated`);
}

main().catch((error) => {
  console.error('Seed plan de evaluación failed:', error);
  process.exit(1);
});
