/** Configuración de un periodo, tal como vive en `PlanEvaluacion.periodos[]`. */
export interface PeriodoConfig {
  nombre: string;
  pesoFinal: number;
  pesoCompetencias: number;
  pesoActividades: number;
  competencias: string[];
  actividades: string[];
  acumulativo: boolean;
}

/**
 * Lo MÍNIMO que el cálculo necesita de una actividad del alumno.
 *
 * Sin índice de firma a propósito: cada pantalla pasa su propio tipo, más rico
 * (con `nombre`, `tipo`, `semanaCompletada`…), y las funciones son genéricas
 * sobre él para devolvérselo intacto en `actividadesContadas`.
 */
export interface ActividadCalc {
  actividadGrupoId: string;
  aprendizajePlaneado: number;
  aprendizajeGanado: number;
}

/** Lo mínimo que el cálculo necesita de una competencia del alumno. */
export interface CompetenciaCalc {
  competenciaId: string;
  valorPeriodo1?: string | number | null;
  valorPeriodo2?: string | number | null;
  /**
   * Peso de la competencia dentro del bloque, del catálogo (`Competencia.puntos`).
   * Ausente o 0 = sin asignar; si NINGUNA del periodo tiene puntos, el bloque se
   * promedia simple, como siempre.
   */
  puntos?: number | null;
}

export interface PeriodoScore<A = ActividadCalc> {
  nombre: string;
  actScore: number;
  compScore: number;
  totalPlaneado: number;
  totalGanado: number;
  actividadesContadas: A[];
  competenciasContadas: number;
  /** El bloque de competencias del periodo se ponderó por puntos. */
  competenciasPonderadas: boolean;
  /** Competencias del periodo que NO cuentan por no tener puntos habiendo otras que sí. */
  competenciasSinPuntos: number;
  pesoFinal: number;
  pesoActividades: number;
  pesoCompetencias: number;
  /** Nota del periodo ANTES de descontar las penalizaciones. */
  periodoScoreBruto: number;
  /** Cuántas «Incipiente B −30 pts» tiene el alumno en este periodo. */
  penalizaciones: number;
  /** Puntos descontados por ellas (30 cada una). */
  puntosPenalizados: number;
  /** Nota del periodo ya penalizada, con suelo en 0. */
  periodoScore: number;
}

/** Valor centinela de «Incipiente B −30 pts» en `valorPeriodoN`. */
export declare const PENALIZACION_VALOR: number;
/** Puntos que resta CADA penalización a la nota del periodo. */
export declare const PENALIZACION_PUNTOS: number;
export declare function esPenalizacion(valor: unknown): boolean;
export declare function contarPenalizaciones(
  competencias: CompetenciaCalc[],
  periodoIdx: number,
): number;

export declare function parseValorCompetencia(valor: unknown): number;
export declare function parsePuntosCompetencia(puntos: unknown): number;
export declare function campoValorPeriodo(periodoIdx: number): 'valorPeriodo1' | 'valorPeriodo2';
export declare function idsActividadesDelPeriodo(periodos: PeriodoConfig[], i: number): Set<string>;

export declare function calcActividadesScore<A extends ActividadCalc>(
  actividades: A[],
  ids: Set<string>,
): { planeado: number; ganado: number; contadas: A[]; score: number };

export declare function calcCompetenciasScore(
  competencias: CompetenciaCalc[],
  ids: Set<string>,
  periodoIdx: number,
): {
  /** Suma ponderada (valor × puntos); sin puntos, la suma de valores de siempre. */
  suma: number;
  cuenta: number;
  ponderada: boolean;
  sinPuntos: number;
  score: number;
};

export declare function calcPeriodoScore<A extends ActividadCalc>(
  periodos: PeriodoConfig[],
  i: number,
  actividades: A[],
  competencias: CompetenciaCalc[],
): PeriodoScore<A>;

export declare function calcCalificacion<A extends ActividadCalc>(
  periodos: PeriodoConfig[],
  actividades: A[],
  competencias: CompetenciaCalc[],
): { periodos: PeriodoScore<A>[]; calificacionActual: number };

export declare function round1(n: number): number;
