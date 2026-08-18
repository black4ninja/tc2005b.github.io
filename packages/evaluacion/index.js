// Cálculo de calificaciones — implementación ÚNICA.
//
// Antes vivía copiado en cuatro sitios: el API (`calificaciones.controller`),
// la malla del profesor (`MallaEvaluacionPage`), el export XLSX (`mallaExport`)
// y el dashboard del alumno (`AlumnoDashboard`). Las cuatro copias divergieron,
// y la del alumno se quedó sin leer los valores nuevos: mostraba TODAS las
// competencias como 0, lo que en producción deflactaba su nota hasta 52 puntos.
//
// Por eso esto es un paquete y no un helper suelto: la nota de un alumno no
// puede depender de qué pantalla la pinte.

/**
 * Valor de una competencia → porcentaje (0–100).
 *
 * Acepta las tres formas que conviven en la BD:
 *   - number  → 85            (el formato actual; las 396 celdas de prod son así)
 *   - string numérico → '85'
 *   - string legacy   → 'Sólido (85%)'
 *
 * Sin evaluar (null/undefined/'') vale 0 y SÍ cuenta en el promedio: una
 * competencia asignada al periodo y no evaluada baja la nota. Es una decisión
 * de política, no un accidente — está fijada en los tests.
 */
/**
 * Valor con el que se marca «Incipiente B −30 pts» en `valorPeriodoN`.
 *
 * Es un centinela, no un porcentaje. Se eligió un número imposible entre los
 * niveles reales (0/15/70/85/100) para que sea inconfundible mirando la BD y
 * para que ningún consumidor pueda tomarlo por una nota.
 */
export const PENALIZACION_VALOR = -30;

/** Puntos que resta CADA penalización a la nota del periodo. */
export const PENALIZACION_PUNTOS = 30;

/** ¿Este valor es la penalización por conducta, y no un nivel de logro? */
export function esPenalizacion(valor) {
  if (typeof valor === 'number') return valor === PENALIZACION_VALOR;
  if (typeof valor === 'string') return valor.trim() === String(PENALIZACION_VALOR);
  return false;
}

export function parseValorCompetencia(valor) {
  // La penalización vale 0 COMO NIVEL —es un Incipiente B— y su castigo se
  // aplica aparte, como puntos directos sobre la nota del periodo. Si entrara
  // aquí como −30, su efecto dependería de cuántas competencias haya, que es
  // justo lo contrario de «30 puntos de golpe y sin excepción».
  if (esPenalizacion(valor)) return 0;
  if (valor === null || valor === undefined || valor === '') return 0;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  if (typeof valor === 'string') {
    const t = valor.trim();
    if (t === '') return 0;
    const n = Number(t);
    if (Number.isFinite(n)) return n;
    const m = t.match(/(\d+)\s*%/);
    return m ? parseInt(m[1], 10) : 0;
  }
  return 0;
}

/**
 * Campo de `CompetenciaAlumno` que le toca a un periodo.
 *
 * ⚠ El modelo solo tiene `valorPeriodo1` y `valorPeriodo2`. Un plan con 3+
 * periodos haría que el 3º en adelante REUSARA la evaluación del 2º. Hoy los
 * tres planes de producción tienen exactamente 2 periodos, así que no se
 * dispara; si algún día se permiten más, el modelo necesita más campos y esto
 * hay que revisarlo.
 */
export function campoValorPeriodo(periodoIdx) {
  return periodoIdx === 0 ? 'valorPeriodo1' : 'valorPeriodo2';
}

/**
 * Ids de las actividades que cuentan para el periodo `i`.
 *
 * Un periodo `acumulativo` arrastra las actividades de todos los anteriores.
 * Es un Set a propósito: si una actividad estuviera en dos periodos previos,
 * sumarla por cada uno la contaría DOS VECES —que es lo que hacían las copias
 * de la web—. Hoy ninguna actividad está en 2+ periodos, así que el bug no
 * llegó a morder, pero estaba armado.
 */
export function idsActividadesDelPeriodo(periodos, i) {
  const ids = new Set();
  const desde = periodos[i].acumulativo ? 0 : i;
  for (let j = desde; j <= i; j++) {
    for (const id of periodos[j].actividades ?? []) ids.add(id);
  }
  return ids;
}

/**
 * Score de actividades: aprendizaje ganado / planeado, en porcentaje.
 * Sin nada planeado el score es 0 (no NaN, que es lo que daría la división).
 */
export function calcActividadesScore(actividades, ids) {
  let planeado = 0;
  let ganado = 0;
  const contadas = [];
  for (const act of actividades) {
    if (!ids.has(act.actividadGrupoId)) continue;
    planeado += act.aprendizajePlaneado ?? 0;
    ganado += act.aprendizajeGanado ?? 0;
    contadas.push(act);
  }
  return {
    planeado,
    ganado,
    contadas,
    score: planeado === 0 ? 0 : (ganado / planeado) * 100,
  };
}

/**
 * Puntos que pesa una competencia dentro del bloque. Sin asignar = 0.
 *
 * Vive en el CATÁLOGO (`Competencia.puntos`), no en el plan: la misma materia
 * debe calificar igual en todos sus grupos.
 */
export function parsePuntosCompetencia(puntos) {
  const n = typeof puntos === 'number' ? puntos : Number(puntos);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Score de competencias del periodo: promedio PONDERADO por los puntos de cada
 * competencia, normalizado por los puntos de las que ese periodo evalúa.
 *
 * Lo de normalizar no es un detalle: en el formato de TC2005B un periodo evalúa
 * 3 de 9 competencias, así que si se dividiera entre el total del catálogo ese
 * periodo no podría llegar a 100 ni con todo perfecto.
 *
 * **Sin puntos asignados sigue siendo el promedio simple de siempre**, que es lo
 * que tienen todos los grupos existentes: si ninguna de las competencias del
 * periodo tiene puntos, todas pesan igual y el resultado es idéntico al anterior.
 *
 * `sinPuntos` cuenta las que se quedaron fuera por no tener puntos habiendo
 * otras que sí: son competencias que el profesor ve en la malla y que **no
 * cuentan nada**, y eso hay que poder decirlo en pantalla en vez de que se
 * descuente en silencio.
 */
export function calcCompetenciasScore(competencias, ids, periodoIdx) {
  const campo = campoValorPeriodo(periodoIdx);
  const delPeriodo = competencias.filter((c) => ids.has(c.competenciaId));

  const totalPuntos = delPeriodo.reduce((t, c) => t + parsePuntosCompetencia(c.puntos), 0);
  const ponderada = totalPuntos > 0;

  let suma = 0;
  let peso = 0;
  let cuenta = 0;
  let sinPuntos = 0;
  for (const comp of delPeriodo) {
    const valor = parseValorCompetencia(comp[campo]);
    const puntos = parsePuntosCompetencia(comp.puntos);
    if (ponderada && puntos === 0) {
      sinPuntos++;
      continue;
    }
    const p = ponderada ? puntos : 1;
    suma += valor * p;
    peso += p;
    cuenta++;
  }

  return {
    suma,
    cuenta,
    ponderada,
    sinPuntos,
    score: peso === 0 ? 0 : suma / peso,
  };
}

/**
 * Cuántas penalizaciones «Incipiente B −30 pts» tiene el alumno en el periodo.
 *
 * Se cuentan sobre TODAS sus competencias, no solo las que ese periodo evalúa:
 * es una sanción por conducta, no la nota de una competencia, y esconderla
 * porque la competencia donde se marcó no entró en la selección del plan la
 * dejaría sin efecto sin que nadie se entere.
 */
export function contarPenalizaciones(competencias, periodoIdx) {
  const campo = campoValorPeriodo(periodoIdx);
  let n = 0;
  for (const comp of competencias) if (esPenalizacion(comp[campo])) n++;
  return n;
}

/**
 * Nota de un periodo: mezcla ponderada de actividades y competencias, menos las
 * penalizaciones por conducta.
 *
 * La penalización son PUNTOS DIRECTOS sobre la nota del periodo, no un
 * porcentaje que entre al promedio: 30 de golpe por cada una, se acumulan, y el
 * suelo es 0 —nunca hay nota negativa—. En un grupo 50/50 con las competencias
 * perfectas, una penalización deja el periodo en 70 y dos lo dejan en 40.
 *
 * Ojo con el alcance: son 30 puntos del PERIODO. Lo que le quita a la nota final
 * depende del `pesoFinal` de ese periodo. En un plan de un solo periodo al 100%
 * —el formato de TC2007B, que es para el que se hizo esto— las dos cosas
 * coinciden y son 30 puntos de la final, literal.
 */
export function calcPeriodoScore(periodos, i, actividades, competencias) {
  const periodo = periodos[i];
  const act = calcActividadesScore(actividades, idsActividadesDelPeriodo(periodos, i));
  const comp = calcCompetenciasScore(competencias, new Set(periodo.competencias ?? []), i);
  const penalizaciones = contarPenalizaciones(competencias, i);
  const puntosPenalizados = penalizaciones * PENALIZACION_PUNTOS;

  return {
    nombre: periodo.nombre || `P${i + 1}`,
    actScore: act.score,
    compScore: comp.score,
    totalPlaneado: act.planeado,
    totalGanado: act.ganado,
    actividadesContadas: act.contadas,
    competenciasContadas: comp.cuenta,
    // Para poder avisar en pantalla: el periodo pondera, y cuántas de sus
    // competencias no cuentan por no tener puntos.
    competenciasPonderadas: comp.ponderada,
    competenciasSinPuntos: comp.sinPuntos,
    pesoFinal: periodo.pesoFinal,
    pesoActividades: periodo.pesoActividades,
    pesoCompetencias: periodo.pesoCompetencias,
    // La nota ANTES de penalizar, para poder enseñar de dónde viene la caída.
    // Sin esto, en pantalla la nota baja 30 puntos sin ninguna explicación.
    periodoScoreBruto:
      (act.score * periodo.pesoActividades + comp.score * periodo.pesoCompetencias) / 100,
    penalizaciones,
    puntosPenalizados,
    periodoScore: Math.max(
      0,
      (act.score * periodo.pesoActividades + comp.score * periodo.pesoCompetencias) / 100 -
        puntosPenalizados,
    ),
  };
}

/**
 * Nota final del alumno: suma de las notas de periodo ponderadas por `pesoFinal`.
 *
 * NO se redondea nada intermedio. El API redondeaba la nota de cada periodo
 * antes de ponderarla y la web no, así que el mismo alumno podía tener dos notas
 * oficiales con 0.1 de diferencia según la pantalla. Se redondea UNA vez, al
 * mostrar, con `round1`.
 */
export function calcCalificacion(periodos, actividades, competencias) {
  const scores = periodos.map((_, i) =>
    calcPeriodoScore(periodos, i, actividades, competencias),
  );
  const calificacionActual = scores.reduce(
    (sum, p) => sum + (p.periodoScore * p.pesoFinal) / 100,
    0,
  );
  return { periodos: scores, calificacionActual };
}

/** Redondeo a 1 decimal. El ÚNICO redondeo; se aplica al presentar. */
export function round1(n) {
  return Math.round(n * 10) / 10;
}
