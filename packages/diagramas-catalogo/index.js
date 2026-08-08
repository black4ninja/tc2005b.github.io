/**
 * Catálogo de tipos de diagrama. Fuente única para la API y para el web.
 *
 * Ver `catalogo.js` para las definiciones y `plantillas.js` para los esqueletos
 * de arranque. Aquí solo vive lo que se consulta desde fuera.
 */
import { BLOQUES_CURSO, GRUPOS_CATALOGO, TIPOS } from './catalogo.js';
import { PLANTILLAS } from './plantillas.js';

export { BLOQUES_CURSO, GRUPOS_CATALOGO, TIPOS, PLANTILLAS };

export const MOTORES = [
  { key: 'mermaid', label: 'Mermaid' },
  { key: 'plantuml', label: 'PlantUML' },
];

const POR_KEY = new Map(TIPOS.map((t) => [t.key, t]));

/** Todas las claves, en el orden canónico del catálogo. */
export const KEYS = TIPOS.map((t) => t.key);

/**
 * Claves que el JUEZ sabe evaluar en al menos un motor.
 *
 * Es lo que valida el controlador al dar de alta un ejercicio: un ejercicio de
 * un tipo sin normalizador no se puede corregir, así que no debe poder crearse.
 * El modo libre NO usa esta lista —ahí vale cualquier tipo con plantilla—.
 */
export const KEYS_JUZGABLES = TIPOS.filter((t) => t.motoresJuez.length > 0).map((t) => t.key);

/** La definición de un tipo, o `undefined` si la clave no existe. */
export function tipoDiagrama(key) {
  return POR_KEY.get(key);
}

export function esTipoConocido(key) {
  return POR_KEY.has(key);
}

/**
 * Rótulo visible de un tipo. Cae a la clave cruda si no se conoce, para que un
 * dato más nuevo que este cliente se lea raro pero no rompa la pantalla.
 */
export function etiquetaTipo(key) {
  return POR_KEY.get(key)?.label ?? key;
}

export function etiquetaMotor(key) {
  return MOTORES.find((m) => m.key === key)?.label ?? key;
}

/**
 * Motores en los que el tipo se DIBUJA, es decir, en los que tiene plantilla.
 * No confundir con `motoresJuez`; ver la cabecera de `catalogo.js`.
 */
export function motoresDe(key) {
  const p = PLANTILLAS[key];
  return p ? MOTORES.map((m) => m.key).filter((m) => typeof p[m] === 'string') : [];
}

/** Si el juez sabe evaluar ese tipo en ese motor. */
export function esJuzgable(key, motor) {
  return POR_KEY.get(key)?.motoresJuez.includes(motor) ?? false;
}

/** Esqueleto de arranque, o cadena vacía si esa combinación no se dibuja. */
export function plantilla(key, motor) {
  return PLANTILLAS[key]?.[motor] ?? '';
}

/**
 * Motor por omisión de un tipo: el primero que el juez acepta y, si no hay
 * ninguno, el primero que lo dibuja.
 *
 * El orden importa. Elegir el motor de dibujo antes que el del juez dejaría al
 * alumno arrancando un ejercicio de clases en PlantUML —que se dibuja— para que
 * el envío se rechazara después.
 */
export function motorPorOmision(key) {
  const def = POR_KEY.get(key);
  return def?.motoresJuez[0] ?? motoresDe(key)[0] ?? 'mermaid';
}

/**
 * El catálogo agrupado tal y como se navega: primero los bloques del curso, en
 * el orden del temario, y después los grupos del catálogo adicional.
 *
 * Se construye aquí y no en la pantalla porque el listado de ejercicios, el
 * selector del modo libre y el editor de autoría tienen que ofrecer el MISMO
 * agrupado; tres derivaciones independientes acabarían divergiendo.
 */
export function agrupado() {
  const grupo = (ambito, nombres) =>
    nombres
      .map((nombre) => ({
        ambito,
        nombre,
        tipos: TIPOS.filter((t) => t.ambito === ambito && t.agrupacion === nombre),
      }))
      .filter((g) => g.tipos.length > 0);

  return [...grupo('curso', BLOQUES_CURSO), ...grupo('catalogo', GRUPOS_CATALOGO)];
}
