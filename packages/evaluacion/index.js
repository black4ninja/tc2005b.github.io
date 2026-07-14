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
export function parseValorCompetencia(valor) {
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

/** Score de competencias: promedio simple de las del periodo. */
export function calcCompetenciasScore(competencias, ids, periodoIdx) {
  const campo = campoValorPeriodo(periodoIdx);
  let suma = 0;
  let cuenta = 0;
  for (const comp of competencias) {
    if (!ids.has(comp.competenciaId)) continue;
    suma += parseValorCompetencia(comp[campo]);
    cuenta++;
  }
  return { suma, cuenta, score: cuenta === 0 ? 0 : suma / cuenta };
}

/** Nota de un periodo: mezcla ponderada de actividades y competencias. */
export function calcPeriodoScore(periodos, i, actividades, competencias) {
  const periodo = periodos[i];
  const act = calcActividadesScore(actividades, idsActividadesDelPeriodo(periodos, i));
  const comp = calcCompetenciasScore(competencias, new Set(periodo.competencias ?? []), i);

  return {
    nombre: periodo.nombre || `P${i + 1}`,
    actScore: act.score,
    compScore: comp.score,
    totalPlaneado: act.planeado,
    totalGanado: act.ganado,
    actividadesContadas: act.contadas,
    competenciasContadas: comp.cuenta,
    pesoFinal: periodo.pesoFinal,
    pesoActividades: periodo.pesoActividades,
    pesoCompetencias: periodo.pesoCompetencias,
    periodoScore:
      (act.score * periodo.pesoActividades + comp.score * periodo.pesoCompetencias) / 100,
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
