/**
 * Constantes del módulo "Preguntas".
 *
 * Aparte del modelo porque las usan tanto él como los normalizadores, y estos
 * tienen que poder cargarse sin arrastrar Parse detrás para poder probarlos.
 */

/** Duración por defecto de una pregunta, en segundos. */
export const DURACION_POR_DEFECTO = 180;
/** Topes del temporizador: por debajo no da tiempo ni a leer; por encima no es una entrevista. */
export const DURACION_MIN = 15;
export const DURACION_MAX = 60 * 60;

/**
 * Intentos por competencia y alumno: hasta dos entrevistas para la misma
 * competencia, cada una con su pregunta.
 *
 * Es un tope, no una obligación: casi todos los alumnos se quedan en el primero
 * y el segundo existe para quien necesita otra oportunidad. Vive aquí, y no
 * repartido por el código, para que subirlo sea cambiar un número.
 */
export const MAX_INTENTOS = 2;
