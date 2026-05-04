import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Parse from 'parse/node';
import '../src/models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const APP_ID = process.env.APP_ID!;
const MASTER_KEY = process.env.MASTER_KEY!;
const SERVER_URL = process.env.SERVER_URL!;

Parse.initialize(APP_ID);
(Parse as any).serverURL = SERVER_URL;
(Parse as any).masterKey = MASTER_KEY;

const TARGET_GRUPO = process.argv[2] || 'ABYXbnDQ28';

async function main() {
  console.log(`Conectando a Parse para grupo ${TARGET_GRUPO}\n`);

  // 1) Verificar que el grupo existe
  const grupoQ = new Parse.Query('Grupo');
  const grupo = await grupoQ.get(TARGET_GRUPO, { useMasterKey: true }).catch(() => null);
  if (!grupo) {
    console.log('GRUPO NO EXISTE');
    return;
  }
  console.log(`Grupo: "${grupo.get('name')}" (active=${grupo.get('active')}, exists=${grupo.get('exists')})`);

  // 2) Buscar PlanEvaluacion para este grupo (con varias variantes de query)
  const planQ1 = new Parse.Query('PlanEvaluacion');
  planQ1.equalTo('grupo', grupo);
  planQ1.equalTo('active', true);
  const plan1 = await planQ1.first({ useMasterKey: true });
  console.log(`\nPlanEvaluacion (active=true): ${plan1 ? 'ENCONTRADO id=' + plan1.id : 'NO ENCONTRADO'}`);

  const planQ2 = new Parse.Query('PlanEvaluacion');
  planQ2.equalTo('grupo', grupo);
  const plan2 = await planQ2.first({ useMasterKey: true });
  console.log(`PlanEvaluacion (sin filtro active): ${plan2 ? 'ENCONTRADO id=' + plan2.id + ' active=' + plan2.get('active') + ' exists=' + plan2.get('exists') : 'NO ENCONTRADO'}`);

  if (plan2) {
    const periodos = plan2.get('periodos');
    console.log(`Periodos: ${Array.isArray(periodos) ? periodos.length : 'NO ES ARRAY (' + typeof periodos + ')'}`);
    if (Array.isArray(periodos)) {
      for (const p of periodos) {
        console.log(`  - ${p.nombre}: pesoFinal=${p.pesoFinal}% comp=${p.competencias?.length ?? 0} act=${p.actividades?.length ?? 0}`);
      }
    }
  }

  // 3) Hacer fetch real al endpoint
  const SessionClass = Parse.Object.extend('AppSession');
  const sessionQ = new Parse.Query(SessionClass);
  sessionQ.equalTo('exists', true);
  sessionQ.equalTo('active', true);
  sessionQ.descending('createdAt');
  sessionQ.include('user');
  sessionQ.limit(20);
  const sessions = await sessionQ.find({ useMasterKey: true });
  let adminToken: string | null = null;
  for (const s of sessions) {
    const user = s.get('user');
    if (user && user.get('userType') === 'admin') {
      adminToken = s.get('token');
      console.log(`\nSesión admin encontrada para: ${user.get('email')}`);
      break;
    }
  }
  if (!adminToken) {
    console.log('\nNo hay sesión admin activa. No puedo hacer fetch HTTP.');
    return;
  }

  const httpRes = await fetch(`http://localhost:3006/api/admin/grupos/${TARGET_GRUPO}/calificaciones`, {
    headers: { 'x-session-token': adminToken },
  });
  const body = await httpRes.json() as any;
  console.log(`\nHTTP /api/admin/grupos/${TARGET_GRUPO}/calificaciones`);
  console.log(`Status: ${httpRes.status}`);
  console.log(`Body keys: ${Object.keys(body).join(', ')}`);
  console.log(`periodos.length: ${body.periodos?.length ?? 'undefined'}`);
  console.log(`calificaciones.length: ${body.calificaciones?.length ?? 'undefined'}`);
  if (body.message) console.log(`message: ${body.message}`);
  if (body.calificaciones && body.calificaciones.length > 0) {
    console.log(`\nPrimera calificacion:`, JSON.stringify(body.calificaciones[0], null, 2));
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error('ERROR:', e); process.exit(1); });
