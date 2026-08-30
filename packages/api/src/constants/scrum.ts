/**
 * Constantes del módulo "Actividad de Scrum".
 *
 * El módulo es de APRENDIZAJE: los alumnos practican el ciclo de Scrum en clase,
 * no gestionan un proyecto real. Por eso todo está deliberadamente corto —cinco
 * columnas, una historia con tres campos, una persona por historia— y las reglas
 * que se hacen cumplir son las que enseñan algo al romperse.
 */

/** Las cinco columnas del tablero, en orden de izquierda a derecha. */
export const COLUMNAS = ['backlog', 'planned', 'doing', 'review', 'done'] as const;
export type Columna = (typeof COLUMNAS)[number];

/**
 * Las cuatro de `planned` en adelante son el SPRINT BACKLOG: lo que el equipo se
 * comprometió a terminar en este sprint. `backlog` es el product backlog, que
 * vive fuera del compromiso. La interfaz lo dibuja con un recuadro punteado
 * alrededor de estas cuatro, y aquí está la misma frontera en datos.
 */
export const COLUMNAS_DEL_SPRINT: Columna[] = ['planned', 'doing', 'review', 'done'];

/** Prioridad MoSCoW. `wont` sin apóstrofo: es una clave, no una etiqueta. */
export const PRIORIDADES = ['must', 'should', 'could', 'wont'] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export const PRIORIDAD_POR_DEFECTO: Prioridad = 'should';

/**
 * Estimación en puntos de historia. Fibonacci recortado, que es lo que se usa en
 * planning poker: la serie crece a propósito para que estimar una historia
 * grande sea impreciso y dé pie a partirla.
 *
 * El 0 existe para la historia recién escrita que todavía nadie ha estimado.
 */
export const PUNTOS_VALIDOS = [0, 1, 2, 3, 5, 8, 13, 21] as const;

/** Tope de cada campo de la historia. Un post-it que no cabe deja de ser un post-it. */
export const LARGO_CAMPO = 200;

/**
 * Nueve equipos por dinámica. No es una limitación técnica: es lo que cabe en la
 * proyección en una rejilla de 3 × 3 sin que las tarjetas dejen de leerse desde
 * el fondo del aula.
 */
export const MAX_EQUIPOS = 9;

/** Tope de nombre de dinámica y de equipo, para que quepan en la cabecera. */
export const LARGO_NOMBRE = 60;

/** Tope del objetivo del sprint: una frase, que es de lo que se trata. */
export const LARGO_OBJETIVO = 160;

/**
 * Las cinco etapas del ciclo con las que nace cada grupo. Son una SEMILLA, no
 * una lista cerrada: el profesor renombra, recolorea, reordena y añade las
 * suyas. Los colores salen de `PALETA_CATEGORIAS`, la misma con la que ya se
 * pintan las categorías de grupo.
 */
export const ETAPAS_SEMILLA = [
  { nombre: 'Planning', color: '#2563eb', pista: 'Se elige el objetivo y se llena el sprint backlog' },
  { nombre: 'Grooming', color: '#9333ea', pista: 'Se depura y estima el product backlog' },
  { nombre: 'Daily', color: '#16a34a', pista: '15 min: qué hice, qué haré, qué me bloquea' },
  { nombre: 'Review', color: '#ea580c', pista: 'Se demuestra el incremento terminado' },
  { nombre: 'Retrospectiva', color: '#0891b2', pista: 'Qué mantener y qué cambiar para el siguiente sprint' },
] as const;

/**
 * Colores con los que se van creando los equipos, en este orden. Sirven para
 * distinguir los paneles de la proyección de un vistazo, así que se reparten
 * cíclicamente y solo se repiten pasados nueve equipos, que es el tope.
 */
export const COLORES_EQUIPO = [
  '#2563eb', '#9333ea', '#16a34a', '#ea580c', '#0891b2',
  '#db2777', '#ca8a04', '#dc2626', '#6366f1',
] as const;

/**
 * Paleta que se ofrece al elegir el color de una etapa. Es la misma que la de
 * las categorías de grupo: ocho tonos que se distinguen entre sí también en
 * visión con deficiencia rojo-verde. Se reexporta con otro nombre para que el
 * módulo no dependa de dónde vive.
 */
export const PALETA_ETAPAS = [
  '#2563eb', '#9333ea', '#db2777', '#dc2626',
  '#ea580c', '#ca8a04', '#16a34a', '#0891b2',
] as const;

export function esColumna(v: unknown): v is Columna {
  return typeof v === 'string' && (COLUMNAS as readonly string[]).includes(v);
}

export function esPrioridad(v: unknown): v is Prioridad {
  return typeof v === 'string' && (PRIORIDADES as readonly string[]).includes(v);
}

export function esPuntos(v: unknown): v is number {
  return typeof v === 'number' && (PUNTOS_VALIDOS as readonly number[]).includes(v);
}
