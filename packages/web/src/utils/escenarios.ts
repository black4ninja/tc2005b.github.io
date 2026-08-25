/** Utilidades puras del módulo "Escenarios". */

/** `95` → `1:35`. El temporizador se lee en minutos, no en segundos sueltos. */
export function formatearDuracion(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const min = Math.floor(s / 60);
  const resto = s % 60;
  return `${min}:${String(resto).padStart(2, '0')}`;
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
