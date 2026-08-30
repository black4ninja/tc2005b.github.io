/**
 * Catálogo de módulos de contenido que una colección puede habilitar por grupo.
 * Espejo de `packages/api/src/models/modulos-contenido.ts`. Los iconos son los
 * mismos que usa el sidebar para cada sección.
 *
 * Dos clases según su default:
 *  - **default ON** (los 4 primeros): la lista guardada por colección enumera lo
 *    APAGADO; un módulo nuevo default-on nace encendido sin migración.
 *  - **opt-in / default OFF** (`ejercicios`, `diagramas`, `preguntas`): la lista enumera lo
 *    ENCENDIDO; nacen apagados y se encienden por grupo.
 * `moduloEsOptIn` desambigua ambas semánticas sobre el mismo mapa.
 */
export interface ModuloContenido {
  key: string;
  label: string;
  icon: string;
  /** true = nace apagado (opt-in). Ausente/false = nace encendido. */
  optIn?: boolean;
}

export const MODULOS_CONTENIDO: ModuloContenido[] = [
  // La key sigue siendo `documentacion` (la usa el backend); solo cambia cómo
  // se llama en pantalla.
  { key: 'documentacion', label: 'Wiki', icon: 'menu_book' },
  { key: 'paginas', label: 'Páginas', icon: 'article' },
  { key: 'competencias', label: 'Competencias', icon: 'emoji_events' },
  // "Actividades" es también la fuente de la malla del alumno y de su
  // calificación acumulada: apagarlo le quita las tres cosas. La etiqueta lo
  // dice para que no haya que saberse el modelo de datos.
  { key: 'actividades', label: 'Actividades y malla', icon: 'assignment' },
  { key: 'ejercicios', label: 'Ejercicios', icon: 'terminal', optIn: true },
  { key: 'diagramas', label: 'Diagramas', icon: 'schema', optIn: true },
  // Preguntas de entrevista. Solo la ve el profesor: encenderla NO le añade
  // nada al alumno, al revés que el resto de módulos de esta lista.
  { key: 'preguntas', label: 'Preguntas', icon: 'quiz', optIn: true },
  // Actividad de Scrum. Al revés que Preguntas, encenderlo SÍ le añade una
  // pantalla al alumno: el tablero de su equipo.
  { key: 'scrum', label: 'Actividad de Scrum', icon: 'view_kanban', optIn: true },
];

const OPT_IN = new Set(MODULOS_CONTENIDO.filter((m) => m.optIn).map((m) => m.key));

/** ¿El módulo es opt-in (default apagado)? */
export function moduloEsOptIn(moduloKey: string): boolean {
  return OPT_IN.has(moduloKey);
}

/**
 * True si el módulo está habilitado para esa colección. La lista guarda solo
 * overrides al default: para default-on, presente = apagado; para opt-in,
 * presente = encendido.
 */
export function moduloHabilitado(
  modulosDeshabilitados: Record<string, string[]> | undefined,
  coleccionId: string,
  moduloKey: string,
): boolean {
  const lista = modulosDeshabilitados?.[coleccionId];
  const presente = !!lista && lista.includes(moduloKey);
  return moduloEsOptIn(moduloKey) ? presente : !presente;
}
