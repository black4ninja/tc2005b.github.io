/**
 * Constantes del módulo "Escenarios".
 *
 * Aparte del modelo porque las usan tanto él como los normalizadores, y estos
 * tienen que poder cargarse sin arrastrar Parse detrás para poder probarlos.
 */

/** Duración por defecto de un escenario, en segundos. */
export const DURACION_POR_DEFECTO = 180;
/** Topes del temporizador: por debajo no da tiempo ni a leer; por encima no es una entrevista. */
export const DURACION_MIN = 15;
export const DURACION_MAX = 60 * 60;
