/**
 * Tipos y reglas de pintado del módulo "Actividad de Scrum".
 *
 * Vive aparte de los componentes porque lo comparten pantallas que no se
 * conocen entre sí: el tablero del alumno, el panel del profesor, la
 * retrospectiva y la proyección. Cualquier divergencia entre ellas se nota en
 * clase, que es cuando están todas abiertas a la vez.
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

/**
 * La escala de estimación. Dos de las opciones NO son números:
 *  - `0` es **?**: todavía no se sabe.
 *  - `-1` es **∞**: demasiado grande, hay que partirla.
 *
 * Ninguna de las dos deja entrar la historia al sprint. El ∞ no es un castigo:
 * es la manera de que partirla sea el único camino hacia adelante.
 */
export const PUNTOS_DESCONOCIDO = 0;
export const PUNTOS_DEMASIADO = -1;

export const ESTIMACIONES: { valor: number; etiqueta: string; descripcion: string }[] = [
  { valor: PUNTOS_DESCONOCIDO, etiqueta: '?', descripcion: 'Desconocido, todavía no se puede estimar' },
  { valor: 1, etiqueta: '1', descripcion: 'Muy simple' },
  { valor: 2, etiqueta: '2', descripcion: 'Simple' },
  { valor: 3, etiqueta: '3', descripcion: 'Con varias partes' },
  { valor: 5, etiqueta: '5', descripcion: 'Compleja' },
  { valor: PUNTOS_DEMASIADO, etiqueta: '∞', descripcion: 'Demasiado grande, conviene partirla' },
];

/** Cómo se enseña la estimación en la tarjeta: `?` y `∞` no son cifras. */
export function puntosTexto(puntos: number): string {
  if (puntos === PUNTOS_DESCONOCIDO) return '?';
  if (puntos < 0) return '∞';
  return String(puntos);
}

export function estaEstimada(puntos: number): boolean {
  return puntos > 0;
}

export interface Persona {
  id: string;
  name: string;
  matricula?: string;
}

export interface Epica {
  id: string;
  nombre: string;
  color: string;
  orden: number;
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
  epica: string | null;
  archivada: boolean;
}

export type ColumnaRetro = 'bien' | 'mal' | 'mejorar';

export interface TarjetaRetro {
  id: string;
  columna: ColumnaRetro;
  texto: string;
  estado: 'cumplido' | 'fallado' | null;
  sprint: string;
  responsable: Persona | null;
}

export interface CorteBurndown {
  en: string;
  etiqueta: string;
  restantes: number;
}

export interface Marcador {
  id: string;
  planeados: number;
  cerrados: number;
  abiertas: number;
  abiertosPts: number;
  penalizaciones: number;
  bloqueo: number;
  devueltos: number;
  cortes: CorteBurndown[];
  equipo?: string;
  numero?: number;
  objetivo?: string;
}

export interface EquipoTablero {
  id: string;
  nombre: string;
  color: string;
  objetivo: string;
  orden: number;
  po: string | null;
  epicaActual: string | null;
  bloqueoPendiente: number;
  miembros: Persona[];
  historias: Historia[];
  epicas: Epica[];
  retro: TarjetaRetro[];
  compromisos: TarjetaRetro[];
  marcador: Marcador | null;
  /** Cuántas terminó en sprints anteriores. La columna «Archived» va plegada. */
  archivadas: number;
}

/* ── Política de la etapa ─────────────────────────────────────────────── */

export type Visibilidad = 'editable' | 'lectura' | 'plegado' | 'oculto';
export type Movimiento =
  | 'todos' | 'backlog-a-planned' | 'dentro-backlog' | 'dentro-sprint' | 'ninguno';

export interface PoliticaEtapa {
  backlog: Visibilidad;
  sprint: Visibilidad;
  movimientos: Movimiento;
  burndown: boolean;
  retro: boolean;
  cobraDeuda: boolean;
  duracionSegundos: number | null;
}

/** La base sobre la que se monta la política de cada etapa: lo que no diga, se puede. */
export const POLITICA_POR_DEFECTO: PoliticaEtapa = {
  backlog: 'editable',
  sprint: 'editable',
  movimientos: 'todos',
  burndown: false,
  retro: false,
  cobraDeuda: false,
  duracionSegundos: null,
};

/**
 * Sin etapa abierta no se toca nada: el tablero se ve y se lee. La misma que
 * aplica el servidor —aquí solo evita enseñar mandos que van a ser rechazados—.
 */
export const POLITICA_SIN_ETAPA: PoliticaEtapa = {
  backlog: 'lectura',
  sprint: 'lectura',
  movimientos: 'ninguno',
  burndown: false,
  retro: false,
  cobraDeuda: false,
  duracionSegundos: null,
};

export const VISIBILIDADES: { key: Visibilidad; label: string }[] = [
  { key: 'editable', label: 'Editable' },
  { key: 'lectura', label: 'Solo lectura' },
  { key: 'plegado', label: 'Plegado' },
  { key: 'oculto', label: 'Oculto' },
];

export const MOVIMIENTOS: { key: Movimiento; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'backlog-a-planned', label: 'Backlog → Planned' },
  { key: 'dentro-backlog', label: 'Dentro del backlog' },
  { key: 'dentro-sprint', label: 'Dentro del sprint' },
  { key: 'ninguno', label: 'Ninguno' },
];

export interface Etapa {
  id: string;
  nombre: string;
  color: string;
  pista: string;
  politica: PoliticaEtapa;
  orden: number;
}

/** Quién está editando qué. Ver `scrum-bloqueos` en el servidor. */
export interface Bloqueo {
  recurso: string;
  quien: string;
  nombre: string;
}

/** El candado de un recurso, si lo tiene alguien que no sea `yo`. */
export function bloqueoAjeno(
  bloqueos: Bloqueo[],
  recurso: string,
  yo: string,
): Bloqueo | null {
  return bloqueos.find((b) => b.recurso === recurso && b.quien !== yo) ?? null;
}

export interface Sprint {
  id: string;
  numero: number;
  objetivo: string;
  cerrado: boolean;
  cerradoEn?: string | null;
}

export interface Dinamica {
  id: string;
  nombre: string;
  inicio: string | null;
  fin: string | null;
  cerrada: boolean;
  finalizada: boolean;
  definicionDone: string[];
  restricciones: string[];
  etapaIniciadaEn: string | null;
  etapaActual: { id: string; nombre: string; color: string; pista: string } | null;
  /** Solo en el listado del profesor. */
  equipos?: number;
  alumnos?: number;
}

/**
 * Espejo de la regla del servidor. Se repite en el cliente a propósito: la
 * pantalla tiene que poder apagar lo que no se puede arrastrar ANTES de que
 * alguien lo intente, y el servidor la vuelve a comprobar porque la lección es
 * la regla, no el aviso.
 */
export function permiteMover(
  movimientos: Movimiento,
  desde: Columna,
  hasta: Columna,
): boolean {
  if (desde === hasta) return true;
  switch (movimientos) {
    case 'todos': return true;
    case 'ninguno': return false;
    case 'backlog-a-planned': return desde === 'backlog' && hasta === 'planned';
    case 'dentro-backlog': return desde === 'backlog' && hasta === 'backlog';
    case 'dentro-sprint': return desde !== 'backlog' && hasta !== 'backlog';
    default: return false;
  }
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
 * aula. Se pasa a rejilla de dos y tres filas, y con ella baja el detalle de
 * cada tarjeta. Nueve es el tope y por eso la tabla acaba ahí.
 */
export function rejillaProyeccion(n: number): { cols: number; filas: number; escala: Escala } {
  if (n <= 1) return { cols: 1, filas: 1, escala: 'full' };
  if (n === 2) return { cols: 2, filas: 1, escala: 'md' };
  if (n === 3) return { cols: 3, filas: 1, escala: 'md' };
  if (n === 4) return { cols: 2, filas: 2, escala: 'md' };
  if (n <= 6) return { cols: 3, filas: 2, escala: 'md' };
  return { cols: 3, filas: 3, escala: 'sm' };
}

/** Iniciales para el avatar. */
export function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Suma de puntos; `?` y `∞` no suman. */
export function sumaPuntos(historias: Historia[]): number {
  return historias.reduce((total, h) => total + Math.max(0, h.puntos ?? 0), 0);
}

/**
 * Historias del sprint que NO son de la épica en curso.
 *
 * «Solo se puede trabajar en 1 modelo a la vez»: si aparecen dos épicas dentro
 * del recuadro, la restricción está rota y hay que decirlo donde se vea.
 */
export function historiasDeOtraEpica(equipo: EquipoTablero): Historia[] {
  if (!equipo.epicaActual) return [];
  return equipo.historias.filter(
    (h) => h.columna !== 'backlog' && h.epica && h.epica !== equipo.epicaActual,
  );
}

/** `mm:ss` de lo que queda de la etapa, o null si no lleva tiempo. */
export function cuentaRegresiva(
  iniciadaEn: string | null,
  duracionSegundos: number | null,
  ahora: number,
): { texto: string; agotado: boolean } | null {
  if (!iniciadaEn || !duracionSegundos) return null;
  const pasado = Math.floor((ahora - new Date(iniciadaEn).getTime()) / 1000);
  const resta = duracionSegundos - pasado;
  const agotado = resta <= 0;
  const abs = Math.abs(resta);
  const texto = `${agotado ? '-' : ''}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
  return { texto, agotado };
}

/** `8 – 19 sep`, o solo una fecha, o vacío. */
export function rangoFechas(inicio: string | null, fin: string | null): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  if (inicio && fin) return `${fmt(inicio)} – ${fmt(fin)}`;
  if (inicio) return `desde el ${fmt(inicio)}`;
  if (fin) return `hasta el ${fmt(fin)}`;
  return '';
}
