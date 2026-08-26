/**
 * Cómo describir un fallo de render para que el reporte lleve información.
 *
 * Es lo que separa «sale una ventana en blanco» de «pone tal cosa»: sin esto,
 * cualquier excepción produce el MISMO síntoma indistinguible y hay que llegar
 * a la causa desde cero. Vivió una tarde entera de depuración de un juez de
 * programación que solo decía eso.
 */

export interface ErrorDescrito {
  /** Una línea, legible por quien no programa. */
  mensaje: string;
  /** El detalle técnico, para pegar en el reporte. Vacío si no lo hay. */
  detalle: string;
}

/**
 * `unknown` porque en JavaScript se puede lanzar cualquier cosa: un `Error`, una
 * cadena, un objeto suelto o `undefined`. Los tres últimos son justo los que
 * revientan a quien asume `error.message`.
 */
export function describirError(error: unknown): ErrorDescrito {
  if (error instanceof Error) {
    return {
      mensaje: error.message || error.name || 'Error sin mensaje',
      detalle: error.stack ?? '',
    };
  }
  if (typeof error === 'string' && error.trim()) {
    return { mensaje: error, detalle: '' };
  }
  if (error && typeof error === 'object') {
    // Un objeto que no es Error: se serializa lo que se pueda. Con referencias
    // circulares `JSON.stringify` lanza, y lanzar DENTRO del manejador de
    // errores deja otra vez la pantalla en blanco.
    try {
      const texto = JSON.stringify(error);
      if (texto && texto !== '{}') return { mensaje: 'Error inesperado', detalle: texto };
    } catch {
      /* se cae al genérico */
    }
  }
  return { mensaje: 'Error inesperado', detalle: String(error) };
}
