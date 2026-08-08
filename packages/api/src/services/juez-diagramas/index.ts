/**
 * Juez de diagramas: evalúa el diagrama de un alumno contra un catálogo cerrado
 * de aserciones sobre su MODELO, no sobre su texto.
 *
 * API principal: `evaluarDiagrama({ motor, tipoDiagrama, codigo, aserciones })`.
 */
export { evaluarDiagrama, parsear, type OpcionesEvaluacion, type DiagramaContexto } from './evaluar.js';
export { CATALOGO, TIPOS_ASERCION, esTipoDeAsercionValido, nodosDuplicados } from './catalogo.js';
export { describir } from './describir.js';
export { normalizarMermaid, SOPORTADOS_MERMAID } from './normalizar-mermaid.js';
export { SOPORTADOS_PLANTUML } from './normalizar-plantuml.js';
export { normalizarJerarquia, SOPORTADOS_JERARQUIA } from './normalizar-jerarquia.js';
export { normalizarActividad } from './normalizar-actividad.js';
export { normalizarGrafo, SOPORTADOS_GRAFO } from './normalizar-grafo.js';
export {
  ErrorSintaxisDiagrama, TIPOS_DIAGRAMA, ROTULO_OCULTA, CODIGO_MAX,
  type Asercion, type Arista, type ContextoEvaluacion, type Mensaje, type Miembro,
  type ModeloDiagrama, type Motor, type Nodo, type ResultadoAsercion,
  type ResultadoDiagrama, type TipoArista, type TipoDiagrama, type TipoMensaje,
  type Veredicto,
} from './tipos.js';
