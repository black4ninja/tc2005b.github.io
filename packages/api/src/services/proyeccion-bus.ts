/**
 * Aviso en caliente de los cambios de proyección, dentro del proceso.
 *
 * La pantalla proyectada preguntaba «¿ha cambiado algo?» una vez por segundo, y
 * cada pregunta costaba validar la sesión —con su escritura—, comprobar el
 * acceso al grupo y leer la fila: casi un segundo de ida y vuelta a Atlas para,
 * casi siempre, contestar «no». Ahora la pantalla abre UNA conexión y el
 * servidor le avisa cuando el profesor pulsa algo.
 *
 * Es un bus de proceso, sin cola ni persistencia, y eso basta: quien escribe
 * (el panel) y quien escucha (la pantalla) hablan con el mismo servidor. Si
 * algún día hubiera más de una instancia, el cliente sigue teniendo su sondeo
 * lento de red de seguridad —por eso no se quitó del todo—.
 */

type Oyente = (estado: unknown) => void;

const oyentes = new Map<string, Set<Oyente>>();

/** Devuelve la función para darse de baja. Llamarla SIEMPRE al cerrar. */
export function suscribir(grupoId: string, oyente: Oyente): () => void {
  const delGrupo = oyentes.get(grupoId) ?? new Set<Oyente>();
  delGrupo.add(oyente);
  oyentes.set(grupoId, delGrupo);
  return () => {
    delGrupo.delete(oyente);
    if (delGrupo.size === 0) oyentes.delete(grupoId);
  };
}

export function publicar(grupoId: string, estado: unknown): void {
  for (const oyente of oyentes.get(grupoId) ?? []) {
    // Un oyente que falla —una conexión ya medio cerrada— no puede tumbar al
    // resto ni al PUT que está publicando.
    try { oyente(estado); } catch { /* la conexión se limpia sola al cerrarse */ }
  }
}

/** Cuántas pantallas hay escuchando. Solo para diagnóstico. */
export function cuantosEscuchan(grupoId: string): number {
  return oyentes.get(grupoId)?.size ?? 0;
}
