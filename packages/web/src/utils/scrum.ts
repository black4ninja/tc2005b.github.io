/**
 * Tipos y reglas de pintado del módulo "Actividad de Scrum".
 *
 * Vive aparte de los componentes porque lo comparten tres pantallas que no se
 * conocen entre sí: el tablero del alumno, el panel del profesor y la
 * proyección. Cualquier divergencia entre ellas se nota en clase, que es cuando
 * las tres están abiertas a la vez.
 */

export type Columna = 'backlog' | 'planned' | 'doing' | 'review' | 'done';

export const COLUMNAS: { key: Columna; label: string }[] = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'planned', label: 'Planned' },
  { key: 'doing', label: 'Doing' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

/**
 * Las cuatro del sprint backlog: lo que el equipo se comprometió a terminar.
 * `backlog` queda fuera porque es el producto, no el sprint — y por eso en
 * pantalla el recuadro punteado rodea solo a estas.
 */
export const COLUMNAS_SPRINT = COLUMNAS.slice(1);

export type Prioridad = 'must' | 'should' | 'could' | 'wont';

export const PRIORIDADES: { key: Prioridad; label: string }[] = [
  { key: 'must', label: 'Must' },
  { key: 'should', label: 'Should' },
  { key: 'could', label: 'Could' },
  { key: 'wont', label: "Won't" },
];

/** Fibonacci recortado, como en planning poker. 0 = sin estimar. */
export const PUNTOS = [0, 1, 2, 3, 5, 8, 13, 21];

export interface Persona {
  id: string;
  name: string;
  matricula?: string;
}

export interface Historia {
  id: string;
  porQue: string;
  que: string;
  como: string;
  puntos: number;
  prioridad: Prioridad;
  columna: Columna;
  orden: number;
  responsable: Persona | null;
}

export interface EquipoTablero {
  id: string;
  nombre: string;
  color: string;
  objetivo: string;
  orden: number;
  miembros: Persona[];
  historias: Historia[];
}

export interface Etapa {
  id: string;
  nombre: string;
  color: string;
  pista: string;
  orden: number;
}

export interface Dinamica {
  id: string;
  nombre: string;
  inicio: string | null;
  fin: string | null;
  cerrada: boolean;
  etapaActual: Omit<Etapa, 'orden'> | null;
  /** Solo en el listado del profesor. */
  equipos?: number;
  alumnos?: number;
}

/** Las historias de un equipo repartidas por columna, ya en orden. */
export function agruparPorColumna(historias: Historia[]): Record<Columna, Historia[]> {
  const vacio = {
    backlog: [] as Historia[],
    planned: [] as Historia[],
    doing: [] as Historia[],
    review: [] as Historia[],
    done: [] as Historia[],
  };
  for (const h of historias) {
    (vacio[h.columna] ?? vacio.backlog).push(h);
  }
  return vacio;
}

export type Escala = 'full' | 'md' | 'sm';

/**
 * Cómo se reparte la pantalla proyectada entre N tableros.
 *
 * No es solo dividir en columnas: a partir de cuatro equipos, seguir estirando
 * la fila deja tarjetas de dos centímetros que nadie lee desde el fondo del
 * aula. Se pasa a rejilla de dos y tres filas, y con ella baja también el
 * detalle de cada tarjeta.
 *
 * Nueve es el tope y por eso la tabla acaba ahí: es lo último que se lee.
 */
export function rejillaProyeccion(n: number): { cols: number; filas: number; escala: Escala } {
  if (n <= 1) return { cols: 1, filas: 1, escala: 'full' };
  if (n === 2) return { cols: 2, filas: 1, escala: 'md' };
  if (n === 3) return { cols: 3, filas: 1, escala: 'md' };
  if (n === 4) return { cols: 2, filas: 2, escala: 'md' };
  if (n <= 6) return { cols: 3, filas: 2, escala: 'md' };
  return { cols: 3, filas: 3, escala: 'sm' };
}

/** Iniciales para el avatar de un responsable. */
export function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Suma de puntos de una lista. Se enseña en la cabecera de cada columna. */
export function sumaPuntos(historias: Historia[]): number {
  return historias.reduce((total, h) => total + (h.puntos ?? 0), 0);
}

/** `8 – 19 sep`, o solo una fecha, o vacío. Para la cabecera de la dinámica. */
export function rangoFechas(inicio: string | null, fin: string | null): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  if (inicio && fin) return `${fmt(inicio)} – ${fmt(fin)}`;
  if (inicio) return `desde el ${fmt(inicio)}`;
  if (fin) return `hasta el ${fmt(fin)}`;
  return '';
}
