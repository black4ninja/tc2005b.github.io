/**
 * Escapa un texto para meterlo LITERAL dentro de una expresión regular.
 *
 * Toda búsqueda que traduzca lo que teclea el usuario a un `RegExp` tiene que
 * pasar por aquí. Sin escapar, un `(((` es una regex inválida (y un 500), y un
 * `(a+)+$` es retroceso exponencial: una sola petición deja al servidor
 * masticando. Los dos llegan escribiendo en un cuadro de búsqueda.
 */
export function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
