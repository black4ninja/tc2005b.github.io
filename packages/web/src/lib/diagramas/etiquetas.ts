import {
  BLOQUES_CURSO,
  MOTORES,
  TIPOS,
  agrupado,
  esJuzgable,
  etiquetaMotor,
  etiquetaTipo,
  posicionDeTipo,
  type GrupoDeTipos,
  type Motor,
  type TipoDiagramaDef,
  type TipoJuzgable,
} from '@tc2005b/diagramas-catalogo/catalogo';

/**
 * Puerta del cliente al catálogo compartido de tipos de diagrama.
 *
 * El catálogo vive en `@tc2005b/diagramas-catalogo` porque la API lo necesita
 * igual —para el juez, para las semillas y para validar lo que se guarda—, y
 * dos listas paralelas se desincronizan: el síntoma es un tipo que el servidor
 * sirve y el cliente pinta como su clave cruda.
 *
 * Se importa la subruta `/catalogo` y NO el barrel a propósito: el barrel
 * arrastra la tabla de plantillas de arranque, decenas de kilobytes que las
 * pantallas de listado —que solo necesitan un rótulo— no pintan nunca. Lo que
 * sí necesita plantillas vive en `plantillas.ts`, al lado.
 */

export type { GrupoDeTipos, Motor, TipoDiagramaDef, TipoJuzgable };

/**
 * TODOS los tipos del catálogo, en orden canónico. Es lo que ofrece el modo
 * libre, donde no hay juez y basta con que el motor sepa dibujarlo.
 */
export const TIPOS_CATALOGO: TipoDiagramaDef[] = TIPOS;

/**
 * Solo los tipos que el juez sabe evaluar. Es lo que puede ofrecer el editor de
 * ejercicios: dar de alta un ejercicio de un tipo sin normalizador crea algo que
 * nadie puede resolver, porque el envío se rechaza siempre.
 */
export const TIPOS_JUZGABLES: TipoDiagramaDef[] = TIPOS.filter((t) => t.motoresJuez.length > 0);

export const MOTORES_DIAGRAMA = MOTORES;
export { BLOQUES_CURSO };

export const etiquetaTipoDiagrama = etiquetaTipo;
export const etiquetaMotorDiagrama = etiquetaMotor;
export const esTipoJuzgable = esJuzgable;
export const agrupadoDiagramas = agrupado;
export const posicionDeTipoDiagrama = posicionDeTipo;

/**
 * Motores en los que el JUEZ acepta ese tipo. Es lo que puede ofrecer el editor
 * de autoría: cualquier otro motor produce un ejercicio cuyo envío responde 500
 * porque no hay normalizador que lo lea.
 */
export function motoresJuezDeTipo(key: string): Motor[] {
  return TIPOS.find((t) => t.key === key)?.motoresJuez ?? [];
}
