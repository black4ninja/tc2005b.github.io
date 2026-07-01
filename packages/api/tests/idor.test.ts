/**
 * IDOR (Insecure Direct Object Reference) Security Tests
 *
 * Prerequisites:
 *   - API server running on localhost:3006 in development mode
 *   - Database seeded with at least one grupo, competencias, and policies
 *
 * These tests verify that:
 *   1. An alumno cannot modify another alumno's malla actividad
 *   2. An alumno cannot modify another alumno's competencia evidencias
 *   3. An alumno CAN modify their own resources
 *   4. An alumno cannot access admin endpoints
 */

import Parse from 'parse/node';
import bcrypt from 'bcryptjs';

const API_BASE = 'http://localhost:3006/api';

// Parse SDK config — must match the running API server
const PARSE_APP_ID = '311a4db6e0de89ee6db248791a6535d9';
const PARSE_SERVER_URL = 'http://localhost:3006/parse';
const PARSE_MASTER_KEY = 'a8cec955a1b0732085fdbb6869448b2c47e55ffbdc90d39653eba6db7d489fad';

// Test state
let grupoId: string;
let alumnoA_Id: string;
let alumnoB_Id: string;
let actividadAlumnoA_Id: string;
let actividadAlumnoB_Id: string;
let compAlumnoA_Id: string;
let compAlumnoB_Id: string;

// Helper: make authenticated request as a specific user (dev mode)
function authHeaders(userId: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-app-user-id': userId,
  };
}

// Helper: create a Parse object directly
async function createParseObject(className: string, attrs: Record<string, any>): Promise<string> {
  const obj = new Parse.Object(className);
  for (const [key, value] of Object.entries(attrs)) {
    obj.set(key, value);
  }
  await obj.save(null, { useMasterKey: true });
  return obj.id;
}

beforeAll(async () => {
  // Initialize Parse SDK
  Parse.initialize(PARSE_APP_ID);
  (Parse as any).serverURL = PARSE_SERVER_URL;
  (Parse as any).masterKey = PARSE_MASTER_KEY;

  // 1. Find or create a test grupo
  const grupoQuery = new Parse.Query('Grupo');
  grupoQuery.equalTo('name', '__test_idor__');
  let grupo = await grupoQuery.first({ useMasterKey: true });

  if (!grupo) {
    grupoId = await createParseObject('Grupo', {
      name: '__test_idor__',
      curso: 'TEST',
      nombreCurso: 'Test IDOR',
      salon: 'TEST',
      active: true,
      exists: true,
    });
  } else {
    grupoId = grupo.id;
  }

  const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId);
  const passwordHash = await bcrypt.hash('test12345', 10);

  // 2. Create two test alumnos
  alumnoA_Id = await createParseObject('AppUser', {
    email: '__test_alumnoA@test.com',
    name: 'Test Alumno A',
    userType: 'alumno',
    passwordHash,
    active: true,
    exists: true,
  });

  alumnoB_Id = await createParseObject('AppUser', {
    email: '__test_alumnoB@test.com',
    name: 'Test Alumno B',
    userType: 'alumno',
    passwordHash,
    active: true,
    exists: true,
  });

  const alumnoA_Pointer = Parse.Object.extend('AppUser').createWithoutData(alumnoA_Id);
  const alumnoB_Pointer = Parse.Object.extend('AppUser').createWithoutData(alumnoB_Id);

  // 3. Enroll both alumnos in the grupo (GrupoAlumno)
  await createParseObject('GrupoAlumno', {
    grupo: grupoPointer,
    alumno: alumnoA_Pointer,
    active: true,
    exists: true,
  });

  await createParseObject('GrupoAlumno', {
    grupo: grupoPointer,
    alumno: alumnoB_Pointer,
    active: true,
    exists: true,
  });

  // 4. Create a test ActividadEvaluacionGrupo (shared template)
  const actGrupoId = await createParseObject('ActividadEvaluacionGrupo', {
    nombre: '__test_actividad__',
    tipo: 'lab',
    aprendizajePlaneado: 10,
    semanaPlaneada: 1,
    orden: 1,
    grupo: grupoPointer,
    active: true,
    exists: true,
  });
  const actGrupoPointer = Parse.Object.extend('ActividadEvaluacionGrupo').createWithoutData(actGrupoId);

  // 5. Create ActividadEvaluacionAlumno for each alumno
  actividadAlumnoA_Id = await createParseObject('ActividadEvaluacionAlumno', {
    grupo: grupoPointer,
    alumno: alumnoA_Pointer,
    actividadGrupo: actGrupoPointer,
    aprendizajePlaneado: 10,
    aprendizajeGanado: 0,
    semanaCompletada: 0,
    observaciones: '',
    active: true,
    exists: true,
  });

  actividadAlumnoB_Id = await createParseObject('ActividadEvaluacionAlumno', {
    grupo: grupoPointer,
    alumno: alumnoB_Pointer,
    actividadGrupo: actGrupoPointer,
    aprendizajePlaneado: 10,
    aprendizajeGanado: 0,
    semanaCompletada: 0,
    observaciones: '',
    active: true,
    exists: true,
  });

  // 6. Create a test Competencia
  const compId = await createParseObject('Competencia', {
    competencia: '__test_comp__',
    nivel: 'Test',
    orden: 999,
    esCalculada: false,
    dependencias: [],
    active: true,
    exists: true,
  });
  const compPointer = Parse.Object.extend('Competencia').createWithoutData(compId);

  // 7. Create CompetenciaAlumno for each alumno
  compAlumnoA_Id = await createParseObject('CompetenciaAlumno', {
    grupo: grupoPointer,
    alumno: alumnoA_Pointer,
    competencia: compPointer,
    valorPeriodo1: 0,
    valorPeriodo2: 0,
    retroPeriodo1: '',
    retroPeriodo2: '',
    evidencias: [],
    active: true,
    exists: true,
  });

  compAlumnoB_Id = await createParseObject('CompetenciaAlumno', {
    grupo: grupoPointer,
    alumno: alumnoB_Pointer,
    competencia: compPointer,
    valorPeriodo1: 0,
    valorPeriodo2: 0,
    retroPeriodo1: '',
    retroPeriodo2: '',
    evidencias: [],
    active: true,
    exists: true,
  });

  console.log('Test data created:', {
    grupoId,
    alumnoA_Id,
    alumnoB_Id,
    actividadAlumnoA_Id,
    actividadAlumnoB_Id,
    compAlumnoA_Id,
    compAlumnoB_Id,
  });
});

afterAll(async () => {
  // Cleanup: delete all test objects
  const classesToClean = [
    'CompetenciaAlumno',
    'ActividadEvaluacionAlumno',
    'ActividadEvaluacionGrupo',
    'GrupoAlumno',
    'Competencia',
    'AppUser',
    'Grupo',
  ];

  for (const className of classesToClean) {
    const query = new Parse.Query(className);

    if (className === 'Grupo') {
      query.equalTo('name', '__test_idor__');
    } else if (className === 'AppUser') {
      query.startsWith('email', '__test_');
    } else if (className === 'Competencia') {
      query.equalTo('competencia', '__test_comp__');
    } else if (className === 'ActividadEvaluacionGrupo') {
      query.equalTo('nombre', '__test_actividad__');
    } else {
      // For join tables, find by grupo pointer
      const grupoPointer = Parse.Object.extend('Grupo').createWithoutData(grupoId);
      query.equalTo('grupo', grupoPointer);
    }

    const objects = await query.find({ useMasterKey: true });
    if (objects.length > 0) {
      await Parse.Object.destroyAll(objects, { useMasterKey: true });
    }
  }

  console.log('Test data cleaned up');
});

// ─── IDOR Tests: Malla (ActividadEvaluacionAlumno) ──────────────

describe('IDOR: PUT /alumno/grupos/:grupoId/malla/:actividadId', () => {
  it('should DENY alumno A from modifying alumno B actividad (403)', async () => {
    const res = await fetch(
      `${API_BASE}/alumno/grupos/${grupoId}/malla/${actividadAlumnoB_Id}`,
      {
        method: 'PUT',
        headers: authHeaders(alumnoA_Id),
        body: JSON.stringify({ semanaCompletada: 5 }),
      },
    );

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.status).toBe('error');
  });

  it('should ALLOW alumno A to modify their own actividad (200)', async () => {
    const res = await fetch(
      `${API_BASE}/alumno/grupos/${grupoId}/malla/${actividadAlumnoA_Id}`,
      {
        method: 'PUT',
        headers: authHeaders(alumnoA_Id),
        body: JSON.stringify({ semanaCompletada: 3 }),
      },
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('should DENY alumno B from modifying alumno A actividad (403)', async () => {
    const res = await fetch(
      `${API_BASE}/alumno/grupos/${grupoId}/malla/${actividadAlumnoA_Id}`,
      {
        method: 'PUT',
        headers: authHeaders(alumnoB_Id),
        body: JSON.stringify({ semanaCompletada: 9 }),
      },
    );

    expect(res.status).toBe(403);
  });
});

// ─── IDOR Tests: Competencias (CompetenciaAlumno) ───────────────

describe('IDOR: PUT /alumno/grupos/:grupoId/competencias/:compAlumnoId', () => {
  it('should DENY alumno A from modifying alumno B competencia evidencias (403)', async () => {
    const res = await fetch(
      `${API_BASE}/alumno/grupos/${grupoId}/competencias/${compAlumnoB_Id}`,
      {
        method: 'PUT',
        headers: authHeaders(alumnoA_Id),
        body: JSON.stringify({ evidencias: ['https://evil.com/fake'] }),
      },
    );

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.status).toBe('error');
  });

  it('should ALLOW alumno A to modify their own competencia evidencias (200)', async () => {
    const res = await fetch(
      `${API_BASE}/alumno/grupos/${grupoId}/competencias/${compAlumnoA_Id}`,
      {
        method: 'PUT',
        headers: authHeaders(alumnoA_Id),
        body: JSON.stringify({ evidencias: ['https://github.com/my-repo'] }),
      },
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('should DENY alumno B from modifying alumno A competencia evidencias (403)', async () => {
    const res = await fetch(
      `${API_BASE}/alumno/grupos/${grupoId}/competencias/${compAlumnoA_Id}`,
      {
        method: 'PUT',
        headers: authHeaders(alumnoB_Id),
        body: JSON.stringify({ evidencias: ['https://evil.com/tamper'] }),
      },
    );

    expect(res.status).toBe(403);
  });
});

// ─── Role Isolation: Alumno cannot access Admin endpoints ───────

describe('Role isolation: Alumno cannot access admin endpoints', () => {
  it('should DENY alumno access to GET /admin/grupos (403)', async () => {
    const res = await fetch(`${API_BASE}/admin/grupos`, {
      headers: authHeaders(alumnoA_Id),
    });

    expect(res.status).toBe(403);
  });

  it('should DENY alumno access to GET /admin/competencias (403)', async () => {
    const res = await fetch(`${API_BASE}/admin/competencias`, {
      headers: authHeaders(alumnoA_Id),
    });

    expect(res.status).toBe(403);
  });

  it('should DENY alumno access to GET /admin/paginas (403)', async () => {
    const res = await fetch(`${API_BASE}/admin/paginas`, {
      headers: authHeaders(alumnoA_Id),
    });

    expect(res.status).toBe(403);
  });

  it('should DENY alumno access to PUT /admin/cambiar-password (403)', async () => {
    const res = await fetch(`${API_BASE}/admin/cambiar-password`, {
      method: 'PUT',
      headers: authHeaders(alumnoA_Id),
      body: JSON.stringify({ newPassword: 'hacked123', confirmPassword: 'hacked123' }),
    });

    expect(res.status).toBe(403);
  });
});

// ─── Unauthenticated access ─────────────────────────────────────

describe('Unauthenticated access denied', () => {
  it('should DENY unauthenticated access to alumno endpoints (401)', async () => {
    const res = await fetch(`${API_BASE}/alumno/grupos/${grupoId}/malla`, {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(401);
  });

  it('should DENY unauthenticated access to admin endpoints (401)', async () => {
    const res = await fetch(`${API_BASE}/admin/grupos`, {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(401);
  });
});
