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

/**
 * Segundos que la pregunta sigue en pantalla después de que el reloj llegue a
 * cero, antes de retirarla.
 *
 * Sin ellos, el instante en que el alumno se queda sin tiempo y el instante en
 * que pierde el enunciado son el mismo, y la pantalla le cambia justo mientras
 * está hablando. Cinco segundos bastan para cerrar la frase.
 */
export const GRACIA_SEGUNDOS = 5;

/**
 * Zona en la que se decide qué día de la semana es.
 *
 * La agenda guarda instantes absolutos, que no necesitan zona para compararse;
 * la necesita la regla de las 24 horas HÁBILES, que tiene que saber si un
 * momento cae en sábado. El curso es presencial y en Querétaro: aquí no hay
 * varias zonas que atender, hay una.
 */
export const ZONA_CURSO = 'America/Mexico_City';

/**
 * Antelación mínima para que un alumno agende, contando solo días hábiles.
 *
 * Es la regla que la hoja de cálculo llevaba escrita arriba: da tiempo al
 * profesor a preparar la pregunta de esa competencia, y evita que alguien
 * aparezca en la lista media hora antes.
 */
export const HORAS_HABILES_ANTELACION = 24;

/**
 * Hasta cuándo puede el alumno cancelar su cita, en minutos antes de su hora.
 * Pasado ese margen la cita se da por celebrada aunque no se presente.
 */
export const MARGEN_CANCELACION_MINUTOS = 5;

/**
 * Cuántos bloques se pueden abrir de una vez.
 *
 * No es una regla de diseño, es de cordura: cada bloque es una escritura contra
 * una base remota, y un rango de fechas mal puesto —dos años en vez de dos
 * semanas— pediría cientos. Un semestre de entrevistas cabe de sobra.
 */
export const MAX_BLOQUES_POR_LOTE = 120;
