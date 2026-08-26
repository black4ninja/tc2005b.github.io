import { DURACION_MIN, DURACION_MAX } from '../constants/preguntas.js';

/**
 * Normalizadores del módulo "Preguntas".
 *
 * Viven fuera del controlador porque son las dos reglas del módulo que hay que
 * poder probar sin levantar Express ni Parse, y porque las usan los DOS
 * controladores: el del banco y el de la asignación por grupo (la duración a
 * medida de un alumno se valida igual que la de la pregunta).
 */

/** Tope de etiquetas por pregunta: más que esto no es clasificar, es escribir. */
const MAX_ETIQUETAS = 12;
const MAX_LARGO_ETIQUETA = 40;

/**
 * Normaliza las etiquetas a minúsculas y sin espacios en los bordes. Es lo que
 * hace que el filtro funcione: sin esto, "Trabajo en equipo" y "trabajo en
 * equipo" serían dos etiquetas distintas y el profesor no encontraría la mitad
 * de su banco al filtrar.
 */
export function normalizarEtiquetas(valor: unknown): string[] | { error: string } {
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor)) return { error: 'Las etiquetas tienen un formato inválido' };
  const salida: string[] = [];
  for (const e of valor) {
    if (typeof e !== 'string') return { error: 'Las etiquetas tienen un formato inválido' };
    const limpia = e.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!limpia) continue;
    if (limpia.length > MAX_LARGO_ETIQUETA) {
      return { error: `La etiqueta «${limpia.slice(0, 20)}…» es demasiado larga` };
    }
    if (!salida.includes(limpia)) salida.push(limpia);
  }
  if (salida.length > MAX_ETIQUETAS) {
    return { error: `Como mucho ${MAX_ETIQUETAS} etiquetas por pregunta` };
  }
  return salida;
}

/**
 * Duración en segundos. Fuera de rango se RECHAZA en vez de recortarse: un cero
 * silencioso deja el temporizador en 0 y el profesor lo descubre proyectando.
 */
export function normalizarDuracion(valor: unknown, porDefecto: number | undefined): number | { error: string } | undefined {
  if (valor === undefined || valor === null || valor === '') return porDefecto;
  const n = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { error: 'La duración debe ser un número entero de segundos' };
  }
  if (n < DURACION_MIN || n > DURACION_MAX) {
    return { error: `La duración debe estar entre ${DURACION_MIN} y ${DURACION_MAX} segundos` };
  }
  return n;
}
