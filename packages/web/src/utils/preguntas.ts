/** Utilidades puras del módulo "Preguntas". */

/** `95` → `1:35`. El temporizador se lee en minutos, no en segundos sueltos. */
export function formatearDuracion(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const min = Math.floor(s / 60);
  const resto = s % 60;
  return `${min}:${String(resto).padStart(2, '0')}`;
}

/**
 * El rótulo con el que se reconoce una pregunta en una lista.
 *
 * Sustituye al título que el banco tenía al principio: mantener título y
 * enunciado a la vez solo servía para que acabaran diciendo cosas distintas, y
 * el enunciado recortado identifica igual de bien. Se limpian las marcas de
 * Markdown porque en una celda de tabla no se renderizan y se leerían crudas.
 */
export function resumenPregunta(texto: string, maximo = 90): string {
  const plano = texto
    // Enlaces: se queda el texto, se va el destino.
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Marcas de bloque al principio de línea: encabezados, citas, viñetas.
    .replace(/^[#>\s-]*\s*/gm, '')
    // Énfasis y código en línea.
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (plano.length <= maximo) return plano;
  // Se corta por la última palabra entera: partir a media palabra se lee peor
  // que perder dos caracteres.
  const cortado = plano.slice(0, maximo);
  const ultimoEspacio = cortado.lastIndexOf(' ');
  return `${(ultimoEspacio > maximo * 0.6 ? cortado.slice(0, ultimoEspacio) : cortado).trimEnd()}…`;
}

/** "Ética, Trabajo en equipo " → ['ética', 'trabajo en equipo'] */
export function parsearEtiquetas(texto: string): string[] {
  const salida: string[] = [];
  for (const bruta of texto.split(',')) {
    const limpia = bruta.trim().toLowerCase().replace(/\s+/g, ' ');
    if (limpia && !salida.includes(limpia)) salida.push(limpia);
  }
  return salida;
}

/**
 * Reparte preguntas entre alumnos sin repetir mientras queden por usar.
 *
 * Es el «rellena a los que faltan» del roster. Reparte en vez de sortear una a
 * una a propósito: con un banco de 5 preguntas y 30 alumnos, sortear
 * independientemente deja a media clase con la misma —y en una entrevista eso se
 * nota en cuanto el primero sale del aula—. Aquí se agota la vuelta antes de
 * empezar la siguiente, así que el reparto es lo más plano posible.
 *
 * `aleatorio` se inyecta para poder probarla: por defecto, `Math.random`.
 */
export function repartirPreguntas<T>(
  alumnoIds: string[],
  preguntaIds: T[],
  aleatorio: () => number = Math.random,
): { alumnoId: string; preguntaId: T }[] {
  if (alumnoIds.length === 0 || preguntaIds.length === 0) return [];
  const salida: { alumnoId: string; preguntaId: T }[] = [];
  let bolsa: T[] = [];
  for (const alumnoId of alumnoIds) {
    if (bolsa.length === 0) bolsa = [...preguntaIds];
    const i = Math.floor(aleatorio() * bolsa.length);
    // `aleatorio()` puede devolver algo ≥ 1 si quien la inyecta se equivoca;
    // sin el tope, `splice` devolvería vacío y el alumno se quedaría sin nada.
    const [elegida] = bolsa.splice(Math.min(i, bolsa.length - 1), 1);
    salida.push({ alumnoId, preguntaId: elegida });
  }
  return salida;
}

/**
 * Plan de reparto de UN hueco: a cada alumno pendiente, una pregunta libre
 * distinta.
 *
 * No recicla la bolsa —al revés que `repartirPreguntas`— porque aquí repetir
 * está prohibido: una pregunta es de un alumno y de nadie más mientras el grupo
 * siga en curso. Cuando el banco no da para todos, el reparto se queda corto a
 * propósito y devuelve cuántos se quedaron fuera, que es lo que hay que decirle
 * al profesor en vez de fallar a medias o repetir en silencio.
 */
export function planearReparto(
  pendientes: string[],
  libres: string[],
  aleatorio: () => number = Math.random,
): { pares: { alumnoId: string; preguntaId: string }[]; faltaron: number } {
  const alcanzan = pendientes.slice(0, libres.length);
  const pares = repartirPreguntas(alcanzan, libres, aleatorio)
    .map((r) => ({ alumnoId: r.alumnoId, preguntaId: r.preguntaId }));
  return { pares, faltaron: pendientes.length - alcanzan.length };
}
