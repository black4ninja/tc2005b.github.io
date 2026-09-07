/**
 * Siembra un grupo DEMO de sector industrial para grabar el vídeo de expo.
 *
 * Todo lo que crea lleva el prefijo `DEMO ·` y se puede quitar entero con
 * `--limpiar`. NO crea cuentas: reutiliza los alumnos sintéticos que ya existen
 * en el grupo de pruebas, así que no hay ninguna persona real implicada.
 *
 *   cd packages/api
 *   ./node_modules/.bin/tsx scripts/demo-industrial.ts --dry-run
 *   ./node_modules/.bin/tsx scripts/demo-industrial.ts
 *   ./node_modules/.bin/tsx scripts/demo-industrial.ts --limpiar
 *
 * ⚠️ La BD de dev es la de PRODUCCIÓN. Por eso el prefijo y la marcha atrás.
 */
import Parse from 'parse/node';
import { config } from '../src/config/index.js';
import '../src/models/index.js';

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

const PREFIJO = 'DEMO ·';
const GRUPO_ORIGEN = 'GYnKXJKkj7'; // de aquí salen los alumnos sintéticos
const seco = process.argv.includes('--dry-run');
const limpiar = process.argv.includes('--limpiar');

const P = (className: string, objectId: string) =>
  ({ __type: 'Pointer', className, objectId } as any);

/** Niveles tal como los interpreta la malla. */
const NIVEL = { incipienteB: 0, incipienteA: 15, basico: 70, solido: 85, destacado: 100 };

/* ── Lo que se siembra ─────────────────────────────────────────────────── */

const COMPETENCIAS = [
  {
    competencia: 'Bloqueo y etiquetado de energías (LOTO)',
    nivel: 'Seguridad',
    puntos: 25,
    guiaEvidencias: 'Foto del punto bloqueado, tarjeta firmada y checklist de verificación de energía cero.',
    incipienteB: 'Interviene el equipo sin aislar la energía.',
    incipienteA: 'Aísla la energía pero no verifica el estado de energía cero.',
    basico: 'Aplica el procedimiento completo en equipos de una sola fuente.',
    solido: 'Aplica el procedimiento en equipos multi-energía y documenta la verificación.',
    destacado: 'Audita el bloqueo de terceros y corrige desviaciones en campo.',
  },
  {
    competencia: 'Lectura e interpretación de planos P&ID',
    nivel: 'Técnica',
    puntos: 20,
    guiaEvidencias: 'Plano marcado con el lazo de control identificado y su descripción.',
    incipienteB: 'No distingue la simbología básica del plano.',
    incipienteA: 'Identifica equipos, pero no sigue el recorrido de la línea.',
    basico: 'Sigue un lazo de control simple de principio a fin.',
    solido: 'Interpreta lazos con enclavamientos y explica su función.',
    destacado: 'Detecta inconsistencias entre el plano y la instalación real.',
  },
  {
    competencia: 'Arranque y paro seguro de línea',
    nivel: 'Operación',
    puntos: 20,
    guiaEvidencias: 'Bitácora de arranque con la secuencia y los parámetros registrados.',
    incipienteB: 'Omite pasos de la secuencia de arranque.',
    incipienteA: 'Sigue la secuencia con acompañamiento permanente.',
    basico: 'Ejecuta arranque y paro de forma autónoma en condiciones normales.',
    solido: 'Resuelve desviaciones de parámetros durante el arranque.',
    destacado: 'Entrena a otros y propone mejoras a la secuencia.',
  },
  {
    competencia: 'Diagnóstico de fallas en sistemas neumáticos',
    nivel: 'Técnica',
    puntos: 15,
    guiaEvidencias: 'Reporte de falla con hipótesis, prueba realizada y causa raíz.',
    incipienteB: 'Sustituye componentes sin diagnóstico previo.',
    incipienteA: 'Identifica el síntoma pero no aísla la causa.',
    basico: 'Aísla la causa en fallas frecuentes de actuadores y válvulas.',
    solido: 'Diagnostica fallas intermitentes con instrumentación.',
    destacado: 'Documenta causa raíz y previene la reincidencia.',
  },
  {
    competencia: 'Mantenimiento predictivo con análisis de vibración',
    nivel: 'Analítica',
    puntos: 10,
    guiaEvidencias: 'Espectro capturado, tendencia del punto y recomendación emitida.',
    incipienteB: 'No interpreta la lectura del equipo de medición.',
    incipienteA: 'Toma la lectura pero no la compara contra el histórico.',
    basico: 'Reconoce desbalanceo y desalineación en el espectro.',
    solido: 'Prioriza intervenciones por severidad y tendencia.',
    destacado: 'Ajusta la ruta de medición según el comportamiento del activo.',
  },
  {
    competencia: 'Registro y análisis de paros no programados',
    nivel: 'Mejora continua',
    puntos: 10,
    guiaEvidencias: 'Pareto de paros del periodo y acción correctiva propuesta.',
    incipienteB: 'No registra el paro o lo registra sin causa.',
    incipienteA: 'Registra el paro con causa genérica.',
    basico: 'Clasifica correctamente la causa y el tiempo de paro.',
    solido: 'Construye el Pareto del periodo y detecta el paro dominante.',
    destacado: 'Propone y da seguimiento a la acción correctiva.',
  },
];

const PREGUNTAS = [
  ['Bloqueo y etiquetado de energías (LOTO)', 'Llegas a un equipo que ya tiene una tarjeta de bloqueo puesta por el turno anterior y necesitas intervenirlo. ¿Qué haces, y por qué no basta con la tarjeta que ya está?'],
  ['Bloqueo y etiquetado de energías (LOTO)', 'Un equipo tiene alimentación eléctrica, aire comprimido y una masa suspendida. Describe cómo verificas energía cero en los tres casos.'],
  ['Lectura e interpretación de planos P&ID', 'En el plano hay un lazo de control de nivel. Explica qué hace cada elemento del lazo y qué pasa si falla el transmisor.'],
  ['Lectura e interpretación de planos P&ID', 'Encuentras una válvula en campo que no aparece en el P&ID. ¿Qué haces con esa diferencia y a quién le corresponde resolverla?'],
  ['Arranque y paro seguro de línea', 'Durante el arranque, la presión de la línea sube más lento de lo normal. ¿Qué revisas, en qué orden y cuándo decides abortar el arranque?'],
  ['Arranque y paro seguro de línea', '¿Cuál es la diferencia entre un paro de emergencia y un paro programado desde el punto de vista del equipo, y qué implica cada uno para el siguiente arranque?'],
  ['Diagnóstico de fallas en sistemas neumáticos', 'Un actuador se mueve más lento de lo normal solo en el turno de la tarde. ¿Qué hipótesis manejas y cómo las descartas una por una?'],
  ['Diagnóstico de fallas en sistemas neumáticos', 'Cambiaste una electroválvula y la falla volvió a la semana. ¿Qué te dice eso y cómo cambias tu diagnóstico?'],
  ['Mantenimiento predictivo con análisis de vibración', 'El espectro de un motor muestra un pico dominante a 1× la velocidad de giro. ¿Qué sugiere y qué medirías para confirmarlo?'],
  ['Mantenimiento predictivo con análisis de vibración', 'Tienes dos activos con la misma severidad de vibración pero uno es cuello de botella de la línea. ¿Cómo priorizas y con qué argumento lo defiendes?'],
  ['Registro y análisis de paros no programados', 'El Pareto del mes dice que el 60 % del tiempo de paro viene de una sola causa. ¿Qué haces con esa información y qué NO concluyes de ella?'],
  ['Registro y análisis de paros no programados', 'Dos operadores registran el mismo tipo de paro con causas distintas. ¿Qué problema revela eso y cómo lo corriges?'],
];

const ETAPAS = [
  ['Planeación del turno', '#2563eb', 'Se acuerda el objetivo del turno y se comprometen los trabajos.'],
  ['Arranque', '#0891b2', 'Reparto de trabajos y verificación de condiciones de seguridad.'],
  ['Ejecución', '#16a34a', 'El trabajo avanza por el tablero; se registran bloqueos.'],
  ['Junta de piso', '#f59e0b', 'Tres preguntas: qué se hizo, qué sigue, qué está bloqueando.'],
  ['Cierre de turno', '#7c3aed', 'Se revisa lo entregado contra lo comprometido.'],
  ['Mejora', '#db2777', 'Qué salió bien, qué no, y qué se cambia el próximo turno.'],
];

const EQUIPOS = [
  {
    nombre: 'Turno A · Mecánico',
    color: '#2563eb',
    epicas: ['Parada mayor de línea 3', 'Rutas predictivas'],
    historias: [
      ['Como responsable de línea', 'quiero el bloqueo LOTO verificado por dos personas', 'Nadie interviene con energía residual', 8, 'alta', 'done', 0],
      ['Como técnico mecánico', 'quiero la ruta de vibración del mes cargada', 'Priorizar los activos críticos del mes', 5, 'alta', 'done', 1],
      ['Como supervisor', 'quiero el Pareto de paros de la semana', 'Atacar la causa dominante de los paros', 5, 'media', 'doing', 1],
      ['Como técnico', 'quiero el P&ID actualizado de la zona de bombeo', 'No diagnosticar sobre un plano viejo', 3, 'media', 'doing', 1],
      ['Como operador', 'quiero la secuencia de arranque en tarjeta plastificada', 'No depender de la memoria en el arranque', 2, 'baja', 'planned', 0],
      ['Como jefe de mantenimiento', 'quiero el histórico de fallas neumáticas por activo', 'Decidir el reemplazo con el histórico', 8, 'media', 'backlog', 1],
    ],
  },
  {
    nombre: 'Turno B · Eléctrico',
    color: '#16a34a',
    epicas: ['Confiabilidad eléctrica'],
    historias: [
      ['Como electricista', 'quiero el termograma del tablero principal', 'Detectar puntos calientes antes del paro', 5, 'alta', 'done', 0],
      ['Como supervisor', 'quiero la bitácora de arranques del turno', 'Comparar el turno contra los parámetros', 3, 'media', 'doing', 0],
      ['Como técnico', 'quiero el listado de enclavamientos por línea', 'No puentear lo que protege a la gente', 8, 'alta', 'planned', 0],
    ],
  },
];

/* ── Utilidades ────────────────────────────────────────────────────────── */

async function buscar(clase: string, filtro: (q: Parse.Query) => void): Promise<any[]> {
  const q = new Parse.Query(clase);
  filtro(q);
  q.limit(1000);
  return q.find({ useMasterKey: true });
}

async function borrarTodo(clase: string, filtro: (q: Parse.Query) => void): Promise<number> {
  const objs = await buscar(clase, filtro);
  for (const o of objs) await o.destroy({ useMasterKey: true });
  return objs.length;
}

/* ── Marcha atrás ──────────────────────────────────────────────────────── */

async function limpiarTodo() {
  const grupos = await buscar('Grupo', (q) => q.startsWith('name', PREFIJO));
  const cols = await buscar('Coleccion', (q) => q.startsWith('nombre', PREFIJO));
  let total = 0;
  for (const g of grupos) {
    const gp = P('Grupo', g.id);
    for (const clase of ['HistoriaUsuario', 'EpicaScrum', 'EquipoScrum', 'SprintScrum']) {
      // Cuelgan de la dinámica; se resuelven por dinámica más abajo.
      void clase;
    }
    const dins = await buscar('DinamicaScrum', (q) => q.equalTo('grupo', gp));
    for (const d of dins) {
      const dp = P('DinamicaScrum', d.id);
      const eqs = await buscar('EquipoScrum', (q) => q.equalTo('dinamica', dp));
      for (const e of eqs) {
        const ep = P('EquipoScrum', e.id);
        total += await borrarTodo('HistoriaUsuario', (q) => q.equalTo('equipo', ep));
        total += await borrarTodo('EpicaScrum', (q) => q.equalTo('equipo', ep));
        await e.destroy({ useMasterKey: true }); total += 1;
      }
      total += await borrarTodo('SprintScrum', (q) => q.equalTo('dinamica', dp));
      await d.destroy({ useMasterKey: true }); total += 1;
    }
    for (const clase of ['EtapaScrum', 'GrupoAlumno', 'CompetenciaAlumno', 'DiaEntrevistas',
      'CitaEntrevista', 'PreguntaAsignacion', 'EvidenciaCompetencia']) {
      total += await borrarTodo(clase, (q) => q.equalTo('grupo', gp));
    }
    await g.destroy({ useMasterKey: true }); total += 1;
  }
  for (const c of cols) {
    const cp = P('Coleccion', c.id);
    total += await borrarTodo('Pregunta', (q) => q.equalTo('coleccion', cp));
    total += await borrarTodo('Competencia', (q) => q.equalTo('coleccion', cp));
    await c.destroy({ useMasterKey: true }); total += 1;
  }
  console.log(`limpiados ${total} objetos (${grupos.length} grupos, ${cols.length} colecciones)`);
}

/* ── Siembra ───────────────────────────────────────────────────────────── */

async function sembrar() {
  const yaGrupo = await buscar('Grupo', (q) => q.startsWith('name', PREFIJO));
  if (yaGrupo.length > 0) {
    console.log('Ya existe el grupo DEMO. Corre --limpiar primero si quieres rehacerlo.');
    return;
  }

  // El personal: los sintéticos que ya existen. NO se crea ninguna cuenta.
  const vinculos = await buscar('GrupoAlumno', (q) => {
    q.equalTo('grupo', P('Grupo', GRUPO_ORIGEN));
    q.equalTo('exists', true as any);
    q.include('alumno');
  });
  const personal = vinculos.map((v) => v.get('alumno')).filter(Boolean).slice(0, 10);
  console.log(`personal reutilizado: ${personal.length} personas sintéticas`);
  if (personal.length < 6) throw new Error('no hay suficientes alumnos sintéticos que reutilizar');

  if (seco) {
    console.log('--dry-run: se crearían');
    console.log(`  1 colección, 1 grupo, ${COMPETENCIAS.length} competencias, ${PREGUNTAS.length} preguntas`);
    console.log(`  ${personal.length} vínculos de personal y ${personal.length * COMPETENCIAS.length} registros de nivel`);
    console.log(`  ${ETAPAS.length} etapas, 1 dinámica, ${EQUIPOS.length} equipos`);
    console.log(`  ${EQUIPOS.reduce((t, e) => t + e.historias.length, 0)} historias`);
    return;
  }

  const Coleccion: any = Parse.Object.extend('Coleccion');
  const coleccion = new Coleccion();
  coleccion.set('nombre', `${PREFIJO} Mantenimiento Industrial`);
  coleccion.set('slug', 'demo-mantenimiento-industrial');
  coleccion.set('clave', 'MTTO-DEMO');
  coleccion.set('descripcion', 'Programa de certificación interna de personal de mantenimiento.');
  coleccion.set('publicada', true);
  coleccion.set('active', true); coleccion.set('exists', true);
  await coleccion.save(null, { useMasterKey: true });

  const Grupo: any = Parse.Object.extend('Grupo');
  const grupo = new Grupo();
  grupo.set('name', `${PREFIJO} Línea 3 — Mantenimiento`);
  grupo.set('salon', 'Planta Querétaro · Nave 2');
  grupo.set('colecciones', [P('Coleccion', coleccion.id)]);
  grupo.set('preguntasDuracionSegundos', 600);
  grupo.set('active', true); grupo.set('exists', true);
  await grupo.save(null, { useMasterKey: true });
  const gp = P('Grupo', grupo.id);
  console.log(`grupo ${grupo.id} · colección ${coleccion.id}`);

  // Competencias
  const Competencia: any = Parse.Object.extend('Competencia');
  const comps: any[] = [];
  for (const [i, c] of COMPETENCIAS.entries()) {
    const o = new Competencia();
    o.set('coleccion', P('Coleccion', coleccion.id));
    o.set('competencia', c.competencia);
    o.set('nivel', c.nivel);
    o.set('guiaEvidencias', c.guiaEvidencias);
    o.set('incipienteB', c.incipienteB); o.set('incipienteA', c.incipienteA);
    o.set('basico', c.basico); o.set('solido', c.solido); o.set('destacado', c.destacado);
    o.set('puntos', c.puntos); o.set('orden', i + 1);
    o.set('active', true); o.set('exists', true);
    await o.save(null, { useMasterKey: true });
    comps.push(o);
  }
  console.log(`competencias: ${comps.length}`);

  // Personal del grupo y su nivel por competencia
  const GrupoAlumno: any = Parse.Object.extend('GrupoAlumno');
  const CompetenciaAlumno: any = Parse.Object.extend('CompetenciaAlumno');
  // Una distribución creíble: casi todos básicos o sólidos, algunos destacados,
  // unos pocos aún en incipiente. Es lo que hace que el panel se lea como real.
  const REPARTO = [
    NIVEL.destacado, NIVEL.solido, NIVEL.solido, NIVEL.basico, NIVEL.basico,
    NIVEL.basico, NIVEL.incipienteA, NIVEL.solido, NIVEL.destacado, NIVEL.basico,
  ];
  let niveles = 0;
  for (const [i, alumno] of personal.entries()) {
    const v = new GrupoAlumno();
    v.set('alumno', P('AppUser', alumno.id)); v.set('grupo', gp);
    v.set('perfilCompleto', true);
    v.set('active', true); v.set('exists', true);
    await v.save(null, { useMasterKey: true });

    for (const [j, comp] of comps.entries()) {
      const ca = new CompetenciaAlumno();
      ca.set('grupo', gp); ca.set('alumno', P('AppUser', alumno.id));
      ca.set('competencia', P('Competencia', comp.id));
      ca.set('valorPeriodo1', REPARTO[(i + j) % REPARTO.length]);
      ca.set('active', true); ca.set('exists', true);
      await ca.save(null, { useMasterKey: true });
      niveles += 1;
    }
  }
  console.log(`personal vinculado: ${personal.length} · niveles: ${niveles}`);

  // Banco de preguntas
  const Pregunta: any = Parse.Object.extend('Pregunta');
  const porNombre = new Map(comps.map((c) => [c.get('competencia'), c]));
  let preguntas = 0;
  for (const [nombreComp, texto] of PREGUNTAS) {
    const comp = porNombre.get(nombreComp);
    const p = new Pregunta();
    p.set('coleccion', P('Coleccion', coleccion.id));
    if (comp) p.set('competencia', P('Competencia', comp.id));
    p.set('texto', texto);
    p.set('active', true); p.set('exists', true);
    await p.save(null, { useMasterKey: true });
    preguntas += 1;
  }
  console.log(`preguntas: ${preguntas}`);

  // Etapas del ciclo, con nombres de planta
  const EtapaScrum: any = Parse.Object.extend('EtapaScrum');
  const etapas: any[] = [];
  for (const [i, [nombre, color, pista]] of ETAPAS.entries()) {
    const e = new EtapaScrum();
    e.set('grupo', gp); e.set('nombre', nombre); e.set('color', color);
    e.set('pista', pista); e.set('orden', i + 1);
    e.set('active', true); e.set('exists', true);
    await e.save(null, { useMasterKey: true });
    etapas.push(e);
  }

  // Dinámica, equipos, épicas e historias
  const DinamicaScrum: any = Parse.Object.extend('DinamicaScrum');
  const din = new DinamicaScrum();
  din.set('grupo', gp);
  din.set('nombre', 'Turno 1 · Parada programada de línea 3');
  din.set('inicio', new Date());
  din.set('etapaActual', P('EtapaScrum', etapas[2].id));
  din.set('etapaIniciadaEn', new Date());
  din.set('definicionDone', [
    'Trabajo verificado por el supervisor',
    'Bitácora y evidencia cargadas',
    'Área liberada y herramienta recogida',
  ]);
  din.set('active', true); din.set('exists', true);
  await din.save(null, { useMasterKey: true });

  const SprintScrum: any = Parse.Object.extend('SprintScrum');
  const sprint = new SprintScrum();
  sprint.set('dinamica', P('DinamicaScrum', din.id));
  sprint.set('numero', 1);
  sprint.set('objetivo', 'Dejar la línea 3 lista para arranque sin paros por mantenimiento.');
  sprint.set('cerrado', false);
  sprint.set('active', true); sprint.set('exists', true);
  await sprint.save(null, { useMasterKey: true });
  din.set('sprintActual', P('SprintScrum', sprint.id));
  await din.save(null, { useMasterKey: true });

  const EquipoScrum: any = Parse.Object.extend('EquipoScrum');
  const EpicaScrum: any = Parse.Object.extend('EpicaScrum');
  const HistoriaUsuario: any = Parse.Object.extend('HistoriaUsuario');
  let historias = 0;
  let cursor = 0;
  for (const [i, eq] of EQUIPOS.entries()) {
    const miembros = personal.slice(cursor, cursor + 4);
    cursor += 4;
    const e = new EquipoScrum();
    e.set('dinamica', P('DinamicaScrum', din.id));
    e.set('nombre', eq.nombre); e.set('color', eq.color); e.set('orden', i + 1);
    e.set('miembros', miembros.map((m: any) => P('AppUser', m.id)));
    if (miembros[0]) e.set('po', P('AppUser', miembros[0].id));
    e.set('active', true); e.set('exists', true);
    await e.save(null, { useMasterKey: true });

    const epicas: any[] = [];
    for (const [j, nombre] of eq.epicas.entries()) {
      const ep = new EpicaScrum();
      ep.set('equipo', P('EquipoScrum', e.id));
      ep.set('nombre', nombre);
      ep.set('color', j === 0 ? '#0ea5e9' : '#f97316');
      ep.set('orden', j + 1);
      ep.set('active', true); ep.set('exists', true);
      await ep.save(null, { useMasterKey: true });
      epicas.push(ep);
    }
    if (epicas[0]) { e.set('epicaActual', P('EpicaScrum', epicas[0].id)); await e.save(null, { useMasterKey: true }); }

    for (const [k, h] of eq.historias.entries()) {
      const [como, que, porQue, puntos, prioridad, columna, quien] = h as any[];
      const o = new HistoriaUsuario();
      o.set('equipo', P('EquipoScrum', e.id));
      o.set('como', como); o.set('que', que); o.set('porQue', porQue);
      o.set('puntos', puntos); o.set('prioridad', prioridad); o.set('columna', columna);
      o.set('orden', k + 1);
      if (epicas[0]) o.set('epica', P('EpicaScrum', epicas[Math.min(quien, epicas.length - 1)].id));
      if (columna !== 'backlog' && miembros[quien % miembros.length]) {
        o.set('responsable', P('AppUser', miembros[quien % miembros.length].id));
      }
      o.set('active', true); o.set('exists', true);
      await o.save(null, { useMasterKey: true });
      historias += 1;
    }
  }
  console.log(`etapas: ${etapas.length} · equipos: ${EQUIPOS.length} · historias: ${historias}`);
  console.log(`\nLISTO. Grupo DEMO: /admin/grupos/${grupo.id}`);
}

(async () => {
  if (limpiar) await limpiarTodo();
  else await sembrar();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
