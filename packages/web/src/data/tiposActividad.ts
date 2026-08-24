import type { ActividadTipo } from '@/types/calendario';

/**
 * Catálogo único de los tipos de actividad.
 *
 * Antes de esto había SIETE tablas paralelas —etiquetas en el Hub, en la barra
 * de filtros, en el resumen de la semana, en el formulario, en la exportación a
 * Excel y en tres pantallas del panel— y se habían desincronizado sin que nadie
 * lo notara: al formulario del calendario le faltaba `actividad`, a la barra de
 * filtros le faltaban `discusion`, `info` y `asueto`, y la exportación escribía
 * «presentacion» en crudo porque ese tipo no estaba en su mapa.
 *
 * El síntoma de las tablas paralelas nunca es «falta un rótulo»: es que el tipo
 * desaparece de una pantalla y sigue en las demás. Con una sola tabla, dar de
 * alta un tipo lo pone en todas.
 *
 * ## Por qué varios rótulos por tipo
 *
 * No es redundancia: cada sitio habla de otra cosa. Un desplegable necesita
 * explicar qué cubre el tipo («Discusión / Resolución de dudas»), un filtro
 * habla de conjuntos («Discusiones»), un chip estrecho necesita caber («Eval») y
 * el título de una actividad sin nombre necesita leerse como un nombre
 * («Discusión»). Colapsarlos en uno obligaría a que alguno de los cuatro sitios
 * quedara mal.
 *
 * Los colores NO se guardan aquí: salen de `var(--color-<tipo>)` y
 * `var(--color-<tipo>-light)` en `variables.css`, que es donde el tema claro y
 * el oscuro los redefinen.
 */
export interface TipoActividad {
  /**
   * Singular completo. Es el nombre del tipo: lo usa el desplegable del
   * formulario y sirve de título cuando una actividad no tiene el suyo.
   */
  nombre: string;
  /** Singular breve, para chips y celdas estrechas. Por defecto, `nombre`. */
  corta?: string;
  /** Plural, para hablar de conjuntos: las píldoras de filtro del calendario. */
  plural: string;
  /**
   * Rótulo del contador en el resumen de la semana.
   *
   * **Ausente = ese tipo no cuenta en el resumen.** Antes era un hueco en el
   * mapa de rótulos, que hacía lo mismo pero sin decirlo.
   */
  resumen?: string;
  /**
   * Texto del desplegable, cuando hace falta desambiguar qué cubre el tipo.
   * Por defecto, `nombre`.
   */
  formulario?: string;
  /** Icono de Material Icons. */
  icono: string;
}

/**
 * El catálogo. **El orden de las claves es el orden canónico** en el que los
 * tipos se ofrecen y se listan en toda la aplicación.
 */
export const TIPOS_ACTIVIDAD: Record<ActividadTipo, TipoActividad> = {
  lab: { nombre: 'Laboratorio', corta: 'Lab', plural: 'Labs', resumen: 'Labs', icono: 'assignment' },
  lectura: { nombre: 'Lectura', plural: 'Lecturas', resumen: 'Lecturas', icono: 'menu_book' },
  ejercicio: { nombre: 'Ejercicio', plural: 'Ejercicios', resumen: 'Ejercicios', icono: 'edit' },
  proyecto: { nombre: 'Proyecto', plural: 'Proyecto', resumen: 'Proyecto', icono: 'stars' },
  evaluacion: { nombre: 'Evaluación', plural: 'Evaluación', resumen: 'Eval', icono: 'check_circle' },
  trabajo: {
    nombre: 'Trabajo',
    plural: 'Trabajo',
    resumen: 'Trabajo',
    formulario: 'Trabajo en clase',
    icono: 'work',
  },
  discusion: {
    nombre: 'Discusión',
    plural: 'Discusiones',
    resumen: 'Discusión',
    formulario: 'Discusión / Resolución de dudas',
    icono: 'forum',
  },
  info: {
    nombre: 'Información',
    corta: 'Info',
    plural: 'Información',
    resumen: 'Info',
    formulario: 'Información / Caso de estudio',
    icono: 'info_outline',
  },
  // Sin `resumen`: los chips del resumen de semana no lo cuentan.
  actividad: { nombre: 'Actividad', plural: 'Actividades', icono: 'assignment' },
  presentacion: {
    nombre: 'Presentación',
    plural: 'Presentaciones',
    resumen: 'Presentaciones',
    icono: 'slideshow',
  },
  // Los dos días sin clase tampoco cuentan en el resumen: lo que mide es cuánto
  // trabajo trae la semana.
  break: { nombre: 'Receso', plural: 'Recesos', formulario: 'Descanso', icono: 'free_breakfast' },
  asueto: { nombre: 'Asueto', plural: 'Asuetos', icono: 'event_busy' },
};

/** Los tipos en orden canónico. */
export const ORDEN_TIPOS = Object.keys(TIPOS_ACTIVIDAD) as ActividadTipo[];

/**
 * Tipos que NO se crean a mano desde el calendario: llegan desde el plan de
 * evaluación del grupo. Ofrecerlos en el formulario del calendario invitaría a
 * duplicar a mano algo que ya se genera.
 */
const SOLO_DESDE_EL_PLAN = new Set<ActividadTipo>(['actividad']);

/** Lo que ofrece el desplegable del formulario del calendario, en orden. */
export const TIPOS_FORMULARIO_CALENDARIO = ORDEN_TIPOS.filter((t) => !SOLO_DESDE_EL_PLAN.has(t));

/**
 * Lo que ofrece «añadir actividad» en el plan de evaluación, en orden.
 *
 * Es una lista propia y no un filtro del catálogo porque el orden es curado:
 * `actividad` va primero al ser el caso habitual ahí. Y quedan fuera los tipos
 * que no se evalúan: una presentación, un receso o un asueto no llevan nota.
 */
export const TIPOS_PLAN_EVALUACION: ActividadTipo[] = [
  'actividad', 'lab', 'lectura', 'ejercicio', 'proyecto',
  'evaluacion', 'trabajo', 'discusion', 'info',
];

/* ── Accesores ──
   Todos toleran un `string`: un tipo nuevo en la BD que aún no esté aquí debe
   verse con su clave cruda, no desaparecer de la pantalla. */

/** Nombre completo. */
export function nombreTipo(tipo: string): string {
  return TIPOS_ACTIVIDAD[tipo as ActividadTipo]?.nombre ?? tipo;
}

/** Nombre breve, para chips y celdas estrechas. */
export function cortaTipo(tipo: string): string {
  const def = TIPOS_ACTIVIDAD[tipo as ActividadTipo];
  return def ? (def.corta ?? def.nombre) : tipo;
}

/** Plural, para hablar de conjuntos. */
export function pluralTipo(tipo: string): string {
  return TIPOS_ACTIVIDAD[tipo as ActividadTipo]?.plural ?? tipo;
}

/** Rótulo del resumen de semana, o `null` si ese tipo no cuenta ahí. */
export function resumenTipo(tipo: string): string | null {
  return TIPOS_ACTIVIDAD[tipo as ActividadTipo]?.resumen ?? null;
}

/** Texto del desplegable del formulario. */
export function formularioTipo(tipo: string): string {
  const def = TIPOS_ACTIVIDAD[tipo as ActividadTipo];
  return def ? (def.formulario ?? def.nombre) : tipo;
}

/** Icono de Material Icons. */
export function iconoTipo(tipo: string): string {
  return TIPOS_ACTIVIDAD[tipo as ActividadTipo]?.icono ?? 'info_outline';
}

/** Color de acento del tipo, como valor CSS. */
export function colorTipo(tipo: string): string {
  return `var(--color-${tipo})`;
}

/** Color de fondo suave del tipo, como valor CSS. */
export function fondoTipo(tipo: string): string {
  return `var(--color-${tipo}-light)`;
}

/**
 * Rótulo + colores de cada tipo, para las pantallas del panel que pintan un
 * chip. Se deriva del catálogo en vez de repetirlo doce veces por pantalla.
 */
export const TIPO_CHIP: Record<ActividadTipo, { label: string; color: string; bg: string }> =
  Object.fromEntries(
    ORDEN_TIPOS.map((t) => [t, { label: cortaTipo(t), color: colorTipo(t), bg: fondoTipo(t) }]),
  ) as Record<ActividadTipo, { label: string; color: string; bg: string }>;
