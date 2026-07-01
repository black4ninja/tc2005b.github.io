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
  console.log(`\n=== Diagnóstico bulk-congelar para grupo ${TARGET_GRUPO} ===\n`);

  // 1) PlanEvaluacion
  const grupo = Parse.Object.extend('Grupo').createWithoutData(TARGET_GRUPO) as any;
  const planQ = new Parse.Query('PlanEvaluacion');
  planQ.equalTo('grupo', grupo);
  planQ.equalTo('active', true);
  const plan = await planQ.first({ useMasterKey: true });
  if (!plan) {
    console.log('NO hay PlanEvaluacion para este grupo');
    return;
  }
  const periodos = plan.get('periodos') ?? [];
  console.log(`PlanEvaluacion id=${plan.id} con ${periodos.length} periodos\n`);

  // 2) Para cada periodo, listar IDs y verificar si existen en ActividadEvaluacionGrupo
  for (let i = 0; i < periodos.length; i++) {
    const p = periodos[i];
    const ids: string[] = p.actividades ?? [];
    console.log(`--- Periodo ${i + 1}: "${p.nombre}" (${ids.length} actividades) ---`);

    if (ids.length === 0) {
      console.log('  (vacío, skip)\n');
      continue;
    }

    const actQ = new Parse.Query('ActividadEvaluacionGrupo');
    actQ.equalTo('exists', true);
    actQ.equalTo('grupo', grupo);
    actQ.containedIn('objectId', ids);
    actQ.limit(ids.length);
    const acts = await actQ.find({ useMasterKey: true });
    console.log(`  Encontrados en BD (active+belongs to grupo): ${acts.length}/${ids.length}`);

    if (acts.length !== ids.length) {
      const foundIds = new Set(acts.map((a) => a.id));
      const missing = ids.filter((id) => !foundIds.has(id));
      console.log(`  ⚠️  IDs FALTANTES (${missing.length}):`);
      for (const m of missing) {
        // Verificar si existe sin filtro
        const checkQ = new Parse.Query('ActividadEvaluacionGrupo');
        checkQ.equalTo('objectId', m);
        const found = await checkQ.first({ useMasterKey: true });
        if (!found) {
          console.log(`    ${m} → NO EXISTE en BD (huérfano en plan)`);
        } else {
          const exists = found.get('exists');
          const grupoOf = found.get('grupo')?.id;
          console.log(`    ${m} → exists=${exists} grupo=${grupoOf} (${grupoOf === TARGET_GRUPO ? 'MISMO grupo' : 'OTRO grupo'})`);
        }
      }
    }
    console.log('');
  }

  // 3) Hacer petición real al endpoint
  console.log('--- Probando endpoint bulk-congelar con primer periodo ---');
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
      break;
    }
  }
  if (!adminToken) {
    console.log('No hay sesión admin para probar');
    return;
  }

  if (periodos.length > 0) {
    const ids = periodos[0].actividades ?? [];
    if (ids.length === 0) {
      console.log('Primer periodo no tiene actividades');
      return;
    }
    const res = await fetch(
      `http://localhost:3006/api/admin/grupos/${TARGET_GRUPO}/actividades-evaluacion/bulk-congelar`,
      {
        method: 'POST',
        headers: { 'x-session-token': adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ actividadIds: ids, congelada: false }),
      },
    );
    const body = await res.json() as any;
    console.log(`Status: ${res.status}`);
    console.log(`Body: ${JSON.stringify(body, null, 2)}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
