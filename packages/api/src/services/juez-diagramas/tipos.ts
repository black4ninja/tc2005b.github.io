/**
 * Modelo normalizado de un diagrama, y el vocabulario del juez.
 *
 * Es el ÚNICO sustrato sobre el que se evalúan las aserciones: ni el catálogo ni
 * `describir()` saben si detrás hubo Mermaid o PlantUML. Esa frontera es lo que
 * permite que Mermaid cambie su API interna —que no es contractual— sin tocar
 * una línea del catálogo.
 *
 * REGLA DURA: aquí no entra ningún código numérico de ningún motor. Los códigos
 * de Mermaid se traducen a nombres en `codigos-mermaid.ts`, que es el único
 * fichero que los conoce.
 */

export type TipoDiagrama =
  | 'clases'
  | 'secuencia'
  | 'estados'
  | 'er'
  | 'flujo'
  | 'casos-de-uso'
  | 'componentes'
  | 'paquetes';

export const TIPOS_DIAGRAMA: TipoDiagrama[] = [
  'clases', 'secuencia', 'estados', 'er', 'flujo', 'casos-de-uso', 'componentes', 'paquetes',
];

export type Motor = 'mermaid' | 'plantuml';

/** Qué clase de cosa es un nodo. Transversal a los ocho tipos de diagrama. */
export type ClaseNodo =
  | 'clase'
  | 'interfaz'
  | 'participante'   // línea de vida de secuencia
  | 'actor'
  | 'estado'
  | 'pseudoestado'   // inicial, final, choice, junction…
  | 'entidad'
  | 'caso-de-uso'
  | 'componente'
  | 'paquete'
  | 'nodo';          // genérico de flujo

/** Un atributo o una operación. `tipo` es el tipo del atributo o el retorno. */
export interface Miembro {
  nombre: string;
  tipo?: string;
  parametros?: string;
  visibilidad?: '+' | '-' | '#' | '~';
}

export interface Nodo {
  id: string;
  /** Etiqueta visible. Cae al `id` cuando el motor no da una distinta. */
  nombre: string;
  clase: ClaseNodo;
  atributos: Miembro[];
  operaciones: Miembro[];
  /** `<<interface>>`, `<<enumeration>>`, estereotipos en general. */
  anotaciones: string[];
  /** Id del paquete o rectángulo contenedor, si lo hay. */
  contenedor?: string;
  /**
   * Papel del pseudoestado: 'inicial' | 'final' | 'choice' | 'junction'…
   * Solo se llena cuando `clase === 'pseudoestado'`.
   */
  papel?: string;
  /** Forma del nodo en diagramas de flujo: 'decision' | 'inicio-fin' | 'proceso'. */
  forma?: string;
}

export type TipoArista =
  | 'asociacion'
  | 'agregacion'
  | 'composicion'
  | 'herencia'
  | 'implementacion'
  | 'dependencia'
  | 'transicion'
  | 'flujo'
  | 'incluye'
  | 'extiende'
  | 'participa'
  | 'relacion-er';

/**
 * Una arista dirigida. La dirección está NORMALIZADA por significado, no por
 * cómo se escribió en el motor:
 *  - `composicion`/`agregacion`: origen = el todo, destino = la parte.
 *  - `herencia`/`implementacion`: origen = el hijo, destino = el padre.
 *  - `transicion`/`flujo`: origen = de dónde sale, destino = a dónde llega.
 * Sin esta normalización, cada aserción tendría que saber la convención del
 * motor y volveríamos a filtrar detalles del parser al catálogo.
 */
export interface Arista {
  origen: string;
  destino: string;
  tipo: TipoArista;
  etiqueta?: string;
  cardinalidadOrigen?: string;
  cardinalidadDestino?: string;
}

/** Semántica UML del mensaje, ya libre de los códigos numéricos del motor. */
export type TipoMensaje =
  | 'sincrono'
  | 'asincrono'
  | 'retorno'
  | 'destruccion'
  | 'activacion'
  | 'desactivacion'
  | 'otro';

export interface Mensaje {
  /** Posición en la secuencia, empezando en 1. Incluye activaciones. */
  orden: number;
  de: string;
  /** Ausente en activaciones/desactivaciones, que son de un solo extremo. */
  a?: string;
  texto: string;
  tipo: TipoMensaje;
}

export interface ModeloDiagrama {
  tipo: TipoDiagrama;
  motor: Motor;
  nodos: Nodo[];
  aristas: Arista[];
  /** Vacío salvo en secuencia. */
  mensajes: Mensaje[];
}

/** Modelo vacío del tipo dado; punto de partida de los normalizadores. */
export function modeloVacio(tipo: TipoDiagrama, motor: Motor): ModeloDiagrama {
  return { tipo, motor, nodos: [], aristas: [], mensajes: [] };
}

// ---------------------------------------------------------------------------
// Aserciones
// ---------------------------------------------------------------------------

/**
 * Una aserción del catálogo. `tipo` selecciona el evaluador; el resto de claves
 * son sus parámetros, validados por el propio evaluador.
 *
 * `oculta` sigue la semántica de los casos ocultos del juez de programación: el
 * alumno ve que falló, no POR QUÉ. La literatura es explícita en que dar
 * demasiada retroalimentación equivale a entregar la solución.
 */
export interface Asercion {
  tipo: string;
  oculta?: boolean;
  /** Texto que sustituye a la descripción automática, si el autor quiere otro. */
  rotulo?: string;
  /**
   * Parámetros de la comprobación, en su propio objeto y NO sueltos junto a
   * `tipo`.
   *
   * Aplanarlos parecía más cómodo hasta que chocaron: `clase-tiene-atributo`
   * necesita un parámetro «tipo» (el del atributo) y `mensaje-entre` otro (el
   * del mensaje), y ambos pisaban la clave que discrimina qué aserción es. El
   * fallo era silencioso —la aserción comparaba el tipo del atributo contra el
   * nombre de la propia aserción— y solo salió al escribir los casos negativos.
   * Anidarlos hace que la colisión sea imposible por construcción.
   */
  parametros?: Record<string, unknown>;
}

export interface ResultadoAsercion {
  indice: number;
  oculta: boolean;
  paso: boolean;
  /** Lo que ve el alumno: la descripción de la comprobación. */
  comprobacion: string;
  /** Detalle del fallo. Se omite en las ocultas. */
  detalle?: string;
}

export type Veredicto = 'aceptado' | 'error_sintaxis' | 'aserciones_fallidas';

export interface ResultadoDiagrama {
  veredicto: Veredicto;
  /** Mensaje del parser cuando `veredicto === 'error_sintaxis'`. */
  errorSintaxis?: string;
  asercionesPasadas: number;
  asercionesTotales: number;
  aserciones: ResultadoAsercion[];
}

/**
 * Contexto que recibe un evaluador: el diagrama del alumno más los diagramas ya
 * dados por el ejercicio, indexados por nombre.
 *
 * Los `contexto` son la pieza que hace posible la verificación CRUZADA, que es
 * donde están los errores dominantes medidos en alumnos (mensajes a operaciones
 * inexistentes, disparadores que no son operaciones del clasificador). Sin
 * ellos el juez solo puede comprobar la coherencia interna de un diagrama
 * aislado, que es justo lo que los alumnos ya hacen bien.
 */
export interface ContextoEvaluacion {
  modelo: ModeloDiagrama;
  contexto: Map<string, ModeloDiagrama>;
}

/** Un evaluador: decide si la aserción se cumple y, si no, por qué. */
export type Evaluador = (
  asercion: Asercion,
  ctx: ContextoEvaluacion,
) => { paso: boolean; detalle?: string };

/** Error de sintaxis del diagrama; lo lanza el normalizador que corresponda. */
export class ErrorSintaxisDiagrama extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorSintaxisDiagrama';
  }
}
