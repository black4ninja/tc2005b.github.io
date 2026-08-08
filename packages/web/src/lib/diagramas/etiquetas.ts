import {
  MOTORES,
  TIPOS,
  agrupado,
  esJuzgable,
  etiquetaMotor,
  etiquetaTipo,
  motorPorOmision,
  motoresDe,
  plantilla,
  type GrupoDeTipos,
  type Motor,
  type TipoDiagramaDef,
} from '@tc2005b/diagramas-catalogo';

/**
 * Puerta del cliente al catálogo compartido de tipos de diagrama.
 *
 * El catálogo vive en `@tc2005b/diagramas-catalogo` porque la API lo necesita
 * igual —para el juez, para las semillas y para validar lo que se guarda—, y
 * dos listas paralelas se desincronizan: el síntoma es un tipo que el servidor
 * sirve y el cliente pinta como su clave cruda.
 *
 * Este fichero no define nada; solo reexporta con los nombres que usan las
 * pantallas y añade lo que solo interesa aquí.
 */

export type { GrupoDeTipos, Motor, TipoDiagramaDef };

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

export const etiquetaTipoDiagrama = etiquetaTipo;
export const etiquetaMotorDiagrama = etiquetaMotor;
export const plantillaDiagrama = plantilla;
export const motoresDeTipo = motoresDe;
export const motorPorOmisionDeTipo = motorPorOmision;
export const esTipoJuzgable = esJuzgable;
export const agrupadoDiagramas = agrupado;

/**
 * Posición de un tipo en el orden del catálogo, para ordenar listas que vienen
 * del servidor. Los tipos que este cliente aún no conozca van al final en vez de
 * desaparecer.
 */
const POSICION = new Map(TIPOS.map((t, i) => [t.key, i]));

export function posicionDeTipo(key: string): number {
  return POSICION.get(key) ?? TIPOS.length;
}
