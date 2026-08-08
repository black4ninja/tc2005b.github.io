/**
 * Catálogo de tipos de diagrama. Fuente única para la API y para el web.
 *
 * Este barrel lo reexporta TODO y por eso arrastra las plantillas. Sirve para el
 * servidor, donde el peso del módulo da igual. En el cliente, quien solo necesita
 * rótulos y agrupados debe importar la subruta `/catalogo`, que no las incluye.
 *
 * Ver `catalogo.js` para las definiciones y `plantillas.js` para los esqueletos.
 */
export {
  BLOQUES_CURSO,
  GRUPOS_CATALOGO,
  KEYS,
  KEYS_JUZGABLES,
  MOTORES,
  TIPOS,
  agrupado,
  esJuzgable,
  esTipoConocido,
  etiquetaMotor,
  etiquetaTipo,
  posicionDeTipo,
  tipoDiagrama,
} from './catalogo.js';

export { PLANTILLAS, motorPorOmision, motoresDe, plantilla } from './plantillas.js';
