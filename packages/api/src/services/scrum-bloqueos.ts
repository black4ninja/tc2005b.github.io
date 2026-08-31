/**
 * Semáforo de edición: quién está tocando qué, ahora mismo.
 *
 * Cinco personas comparten un tablero y una sola computadora por equipo no
 * siempre se respeta. Sin esto, dos abren la misma historia, cada una guarda lo
 * suyo y gana la última: el trabajo de la otra desaparece sin que nadie se
 * entere. Con esto, la segunda ve que está ocupada y por quién.
 *
 * Vive EN MEMORIA a propósito. Es estado de treinta segundos: perderlo al
 * reiniciar el servidor no rompe nada —los candados simplemente se sueltan— y
 * guardarlo en la base costaría dos viajes por cada vez que alguien abre una
 * tarjeta, que es justo lo que se está intentando ahorrar.
 *
 * Cada candado CADUCA solo. Es la única defensa contra el caso normal en un
 * aula: alguien abre una historia y cierra la pestaña, o se le acaba la batería.
 * Sin caducidad esa tarjeta quedaría bloqueada para siempre.
 */

export interface Bloqueo {
  recurso: string;
  quien: string;
  nombre: string;
  hasta: number;
}

/** Cuánto vale un candado sin refrescarlo. El cliente late cada 10 s. */
const VIGENCIA_MS = 30000;

const porDinamica = new Map<string, Map<string, Bloqueo>>();

function tabla(dinamicaId: string): Map<string, Bloqueo> {
  const suya = porDinamica.get(dinamicaId) ?? new Map<string, Bloqueo>();
  porDinamica.set(dinamicaId, suya);
  return suya;
}

/** Tira los caducados. Se llama en cada lectura: no hace falta temporizador. */
function limpiar(suya: Map<string, Bloqueo>): void {
  const ahora = Date.now();
  for (const [recurso, b] of suya) {
    if (b.hasta <= ahora) suya.delete(recurso);
  }
}

/**
 * Toma o refresca el candado. Devuelve el candado ajeno si lo tiene otro, o
 * `null` si es tuyo. Refrescar el propio es gratis: el cliente late mientras
 * tenga el formulario abierto.
 */
export function tomarBloqueo(
  dinamicaId: string,
  recurso: string,
  quien: string,
  nombre: string,
): Bloqueo | null {
  const suya = tabla(dinamicaId);
  limpiar(suya);
  const actual = suya.get(recurso);
  if (actual && actual.quien !== quien) return actual;
  suya.set(recurso, { recurso, quien, nombre, hasta: Date.now() + VIGENCIA_MS });
  return null;
}

/** Suelta el candado, solo si es tuyo. */
export function soltarBloqueo(dinamicaId: string, recurso: string, quien: string): void {
  const suya = tabla(dinamicaId);
  const actual = suya.get(recurso);
  if (actual && actual.quien === quien) suya.delete(recurso);
}

/** Quién tiene ese recurso, si es alguien distinto de `quien`. */
export function ocupadoPor(
  dinamicaId: string,
  recurso: string,
  quien: string,
): Bloqueo | null {
  const suya = tabla(dinamicaId);
  limpiar(suya);
  const actual = suya.get(recurso);
  return actual && actual.quien !== quien ? actual : null;
}

/** Todo lo ocupado ahora mismo, para que cada pantalla lo pinte. */
export function bloqueosVigentes(dinamicaId: string): Bloqueo[] {
  const suya = tabla(dinamicaId);
  limpiar(suya);
  return [...suya.values()];
}

/** Suelta todo lo de una persona. Al cerrar la pestaña o al salir del tablero. */
export function soltarTodoDe(dinamicaId: string, quien: string): void {
  const suya = tabla(dinamicaId);
  for (const [recurso, b] of suya) {
    if (b.quien === quien) suya.delete(recurso);
  }
}
