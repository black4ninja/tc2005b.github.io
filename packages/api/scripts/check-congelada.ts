import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Parse from 'parse/node';
import '../src/models/index.js';
import { ActividadEvaluacionGrupo } from '../src/models/ActividadEvaluacionGrupo.js';
import { ActividadEvaluacionAlumno } from '../src/models/ActividadEvaluacionAlumno.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const APP_ID = process.env.APP_ID!;
const MASTER_KEY = process.env.MASTER_KEY!;
const SERVER_URL = process.env.SERVER_URL!;

Parse.initialize(APP_ID);
(Parse as any).serverURL = SERVER_URL;
(Parse as any).masterKey = MASTER_KEY;

const TARGET_GRUPO = process.argv[2] || 'fC1d8fNuFu';

async function main() {
  console.log(`Conectando a Parse: ${SERVER_URL} appId=${APP_ID.slice(0,8)}...`);
  const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(TARGET_GRUPO) as any;

  const q = new Parse.Query<ActividadEvaluacionGrupo>('ActividadEvaluacionGrupo');
  q.equalTo('exists' as any, true as any);
  q.equalTo('grupo' as any, grupoPointer);
  q.ascending('orden');
  q.limit(1000);
  const acts = await q.find({ useMasterKey: true });
  console.log(`\n=== Grupo ${TARGET_GRUPO}: ${acts.length} actividades ===`);
  let congelados = 0;
  for (const a of acts) {
    const congelada = a.get('congelada');
    if (congelada === true) {
      congelados++;
      console.log(`  CONGELADA  id=${a.id} orden=${a.get('orden')} nombre="${a.get('nombre')}"`);
    }
  }
  console.log(`\nTotal congeladas en grupo: ${congelados}`);
  if (congelados === 0) {
    console.log('\n>>> NO hay actividades congeladas en este grupo. Verifica que congelaste en el grupo correcto.');
    return;
  }

  // Hacer una petición HTTP real al endpoint del alumno usando un session token
  // existente para verificar exactamente lo que el frontend recibe
  const SessionClass = Parse.Object.extend('AppSession');
  const sessionQ = new Parse.Query(SessionClass);
  sessionQ.equalTo('exists', true);
  sessionQ.equalTo('active', true);
  sessionQ.descending('createdAt');
  sessionQ.include('user');
  sessionQ.limit(20);
  const sessions = await sessionQ.find({ useMasterKey: true });
  console.log(`\n=== Sesiones activas: ${sessions.length} ===`);

  // Buscar una sesión cuyo usuario sea alumno del grupo
  const alumnoIds = ['AWB1WhZAlI', '2CkCtH7b7y'];
  let foundToken: string | null = null;
  let foundAlumno: string | null = null;
  for (const s of sessions) {
    const user = s.get('user');
    if (user && alumnoIds.includes(user.id)) {
      foundToken = s.get('token');
      foundAlumno = user.id;
      console.log(`  Sesión encontrada para alumno ${user.id}`);
      break;
    }
  }
  if (!foundToken) {
    console.log('  No hay sesión activa para AWB1WhZAlI ni 2CkCtH7b7y. No puedo simular request.');
    return;
  }

  const httpRes = await fetch(`http://localhost:3006/api/alumno/grupos/${TARGET_GRUPO}/malla`, {
    headers: { 'x-session-token': foundToken },
  });
  console.log(`\n=== HTTP /api/alumno/grupos/${TARGET_GRUPO}/malla ===`);
  console.log(`Status: ${httpRes.status}`);
  const body = await httpRes.json() as any;
  if (body.actividades) {
    const congeladasInResp = body.actividades.filter((a: any) => a.congelada === true);
    console.log(`Total actividades en respuesta: ${body.actividades.length}`);
    console.log(`Con congelada=true: ${congeladasInResp.length}`);
    for (const a of congeladasInResp) {
      console.log(`  ${a.nombre}: congelada=${a.congelada}`);
    }
    if (congeladasInResp.length === 0) {
      console.log('  >>> RESPUESTA NO TIENE NINGUNA congelada=true. Bug en backend!');
      console.log('  Primer item:', JSON.stringify(body.actividades[0], null, 2));
    }
  } else {
    console.log('Body:', JSON.stringify(body).slice(0, 500));
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
