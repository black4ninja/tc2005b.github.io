/**
 * Catálogo de MÓDULOS de contenido que una colección puede habilitar por grupo.
 *
 * Un grupo tiene colecciones asignadas (`Grupo.colecciones`) y, por colección,
 * un mapa `Grupo.modulosDeshabilitados` con overrides al DEFAULT de cada módulo.
 *
 * Hay dos clases de módulo según su default:
 *  - **default ON** (Documentación/Páginas/Competencias/Actividades): un módulo
 *    nuevo aquí nace encendido en todos los grupos sin migrar nada. La lista
 *    guardada para la colección lista lo que está APAGADO.
 *  - **opt-in / default OFF** (`ejercicios`): nace apagado; hay que encenderlo por
 *    grupo. Para estos, la lista guardada lista lo que está ENCENDIDO.
 *
 * En ambos casos se guarda solo lo que DIFIERE del default (grupos sin el campo =
 * todo en su default, cero migración). El mismo mapa mezcla ambas semánticas sin
 * ambigüedad porque las keys son únicas y `moduloEsOptIn` desambigua.
 *
 * Para agregar un módulo futuro: añade su key aquí (y a MODULOS_OPT_IN si aplica)
 * más su gate en el read-path correspondiente. El front espeja este catálogo.
 */
export const MODULOS_CONTENIDO = [
  'documentacion',
  'paginas',
  'competencias',
  'actividades',
  'ejercicios',
] as const;

export type ModuloContenido = (typeof MODULOS_CONTENIDO)[number];

/** Módulos que nacen APAGADOS y se encienden explícitamente por grupo. */
const MODULOS_OPT_IN: ReadonlySet<ModuloContenido> = new Set<ModuloContenido>(['ejercicios']);

export function esModuloValido(v: unknown): v is ModuloContenido {
  return typeof v === 'string' && (MODULOS_CONTENIDO as readonly string[]).includes(v);
}

/** ¿El módulo es opt-in (default apagado)? Si no, es default encendido. */
export function moduloEsOptIn(modulo: ModuloContenido): boolean {
  return MODULOS_OPT_IN.has(modulo);
}

/**
 * ¿Está habilitado `modulo` para `coleccionId` en este grupo? Puro (recibe el
 * mapa `modulosDeshabilitados`, no el Grupo) para poder probarlo sin Parse.
 *
 * La lista de la colección guarda solo overrides al default:
 *  - default ON  → habilitado salvo que la key esté en la lista (= apagado).
 *  - opt-in/OFF  → habilitado solo si la key está en la lista (= encendido).
 * Ausente o sin entrada = cada módulo en su default.
 */
export function moduloHabilitado(
  modulosDeshabilitados: Record<string, string[]> | undefined,
  coleccionId: string,
  modulo: ModuloContenido,
): boolean {
  const lista = modulosDeshabilitados?.[coleccionId];
  const presente = !!lista && lista.includes(modulo);
  return moduloEsOptIn(modulo) ? presente : !presente;
}
