/**
 * Juez de ejercicios: compila y ejecuta código del alumno (Kotlin/Swift) aislado
 * con bubblewrap y lo evalúa contra casos entrada/salida (estilo UVA).
 *
 * API principal: `evaluar({ lenguaje, codigo, casos, limites? })`.
 */
import { config } from '../../config/index.js';
import { LENGUAJES, type Lenguaje } from './tipos.js';
import { getLenguaje } from './lenguajes.js';

export { evaluar, probarPrograma, type OpcionesEvaluacion, type OpcionesPrueba, type ResultadoPrueba } from './evaluar.js';
export { normalizarSalida, veredictoDeCorrida } from './comparacion.js';
export { LENGUAJES, esLenguaje, type Lenguaje } from './tipos.js';
export type {
  Caso,
  Limites,
  Veredicto,
  ResultadoCaso,
  ResultadoEvaluacion,
  ResultadoCorrida,
} from './tipos.js';

/**
 * ¿Está configurado el toolchain de este lenguaje? (rutas del compilador en env).
 * No verifica que el binario exista en disco; eso lo revela la primera corrida.
 */
export function lenguajeConfigurado(lenguaje: Lenguaje): boolean {
  if (lenguaje === 'kotlin') return !!config.juez.kotlin.home && !!config.juez.kotlin.javaHome;
  if (lenguaje === 'swift') return !!config.juez.swift.home;
  return false;
}

/** Lenguajes con toolchain configurado (para exponer al front / validar envíos). */
export function lenguajesDisponibles(): Lenguaje[] {
  return LENGUAJES.filter(lenguajeConfigurado);
}

/** Nombre visible del lenguaje (p. ej. 'Kotlin'). */
export function nombreLenguaje(lenguaje: Lenguaje): string {
  return getLenguaje(lenguaje).nombre;
}
