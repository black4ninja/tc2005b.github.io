import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

async function main() {
  // Check ActividadEvaluacionGrupo
  const q1 = new Parse.Query('ActividadEvaluacionGrupo');
  q1.equalTo('active', true);
  q1.include('grupo');
  q1.limit(200);
  const acts = await q1.find({ useMasterKey: true });
  console.log('ActividadEvaluacionGrupo total:', acts.length);
  for (const a of acts.slice(0, 10)) {
    console.log(' ', a.id, a.get('nombre'), 'semana:', a.get('semanaPlaneada'), 'grupo:', a.get('grupo')?.id, a.get('grupo')?.get('name'));
  }
  if (acts.length > 10) console.log('  ... and', acts.length - 10, 'more');

  // Check ActividadEvaluacion (template)
  const q2 = new Parse.Query('ActividadEvaluacion');
  q2.equalTo('active', true);
  q2.limit(200);
  const templates = await q2.find({ useMasterKey: true });
  console.log('\nActividadEvaluacion (template) total:', templates.length);
  for (const t of templates.slice(0, 10)) {
    console.log(' ', t.id, t.get('nombre'), 'semana:', t.get('semanaPlaneada'));
  }
  if (templates.length > 10) console.log('  ... and', templates.length - 10, 'more');

  // Check PlanEvaluacion
  const q3 = new Parse.Query('PlanEvaluacion');
  q3.equalTo('active', true);
  q3.include('grupo');
  q3.limit(10);
  const plans = await q3.find({ useMasterKey: true });
  console.log('\nPlanEvaluacion total:', plans.length);
  for (const p of plans) {
    const periodos = p.get('periodos') || [];
    console.log(' ', p.id, 'grupo:', p.get('grupo')?.get('name'), 'periodos:', periodos.length);
    for (const per of periodos) {
      console.log('   ', per.nombre, '- actividades:', per.actividades?.length, '- competencias:', per.competencias?.length);
    }
  }
}

main().catch(console.error);
