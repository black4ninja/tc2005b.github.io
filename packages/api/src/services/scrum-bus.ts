/**
 * Aviso en caliente de los cambios de un tablero, dentro del proceso.
 *
 * Un tablero lo mueven cinco personas a la vez y se proyecta en el cañón del
 * aula mientras tanto. Sondear cada segundo desde cada pantalla —cinco alumnos
 * más la proyección— sale carísimo contra una base remota para contestar «no ha
 * cambiado» casi siempre; así cada pantalla abre UNA conexión y el servidor le
 * avisa cuando alguien mueve algo.
 *
 * Es un bus de proceso, sin cola ni persistencia. Basta porque quien escribe y
 * quien escucha hablan con el mismo servidor; si algún día hubiera más de una
 * instancia, los clientes conservan un refresco lento de red de seguridad.
 *
 * Se separa del bus de la proyección de preguntas a propósito: aquello lleva el
 * estado del mando (qué pregunta, el reloj) y esto avisa de un cambio en un
 * tablero. Mismo mecanismo, dos conversaciones que no deben mezclarse.
 */

type Oyente = (carga: unknown) => void;

const oyentes = new Map<string, Set<Oyente>>();

/** Devuelve la función para darse de baja. Llamarla SIEMPRE al cerrar. */
export function suscribirTablero(dinamicaId: string, oyente: Oyente): () => void {
  const suyos = oyentes.get(dinamicaId) ?? new Set<Oyente>();
  suyos.add(oyente);
  oyentes.set(dinamicaId, suyos);
  return () => {
    suyos.delete(oyente);
    if (suyos.size === 0) oyentes.delete(dinamicaId);
  };
}

export function publicarTablero(dinamicaId: string, carga: unknown): void {
  for (const oyente of oyentes.get(dinamicaId) ?? []) {
    // Un oyente que falla —una conexión medio cerrada— no puede tumbar al resto
    // ni a la petición que está publicando.
    try { oyente(carga); } catch { /* la conexión se limpia sola al cerrarse */ }
  }
}

/** Cuántas pantallas escuchan esta dinámica. Solo para diagnóstico. */
export function cuantosEscuchanTablero(dinamicaId: string): number {
  return oyentes.get(dinamicaId)?.size ?? 0;
}
