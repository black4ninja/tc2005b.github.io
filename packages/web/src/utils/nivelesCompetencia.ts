/**
 * Los niveles de la rúbrica, en un solo sitio.
 *
 * La escala estaba copiada a mano en cada pantalla que la ofrece —la malla, el
 * panel rápido de competencias, el export— y las copias ya habían divergido: la
 * del panel rápido se quedó sin «Incipiente B −30 pts», así que desde ahí la
 * sanción no se podía poner aunque la materia la admitiera. Cada copia nueva es
 * otra oportunidad de que eso vuelva a pasar.
 *
 * El valor de cada opción es lo que viaja al API en `valorPeriodoN`: una cadena,
 * porque sale de un `<select>`, y vacía cuando no hay nota.
 */
import { PENALIZACION_VALOR } from '@tc2005b/evaluacion';

export interface OpcionNivel {
  value: string;
  label: string;
}

export const PENALIZACION_LABEL = 'Incipiente B −30 pts';

/** No es un nivel, es la ausencia de nota: por eso encabeza la lista. */
export const OPCION_SIN_EVALUAR: OpcionNivel = { value: '', label: 'Sin evaluar' };

/** La sanción, solo para las competencias que la admiten. */
export const OPCION_PENALIZACION: OpcionNivel = {
  value: String(PENALIZACION_VALOR),
  label: PENALIZACION_LABEL,
};

/** Los niveles de siempre, de menos a más. */
export const NIVELES: OpcionNivel[] = [
  { value: '0', label: 'Incipiente B (0%)' },
  { value: '15', label: 'Incipiente A (15%)' },
  { value: '70', label: 'Básico (70%)' },
  { value: '85', label: 'Sólido (85%)' },
  { value: '100', label: 'Destacado (100%)' },
];

export const EVALUACION_OPTIONS: OpcionNivel[] = [OPCION_SIN_EVALUAR, ...NIVELES];

/**
 * Con la sanción, y va PRIMERA de los niveles: −30 es el valor más bajo de
 * todos y la lista está ordenada de menos a más, así que ponerla al final la
 * dejaba después del 100 %, que se lee como si fuera lo más alto.
 */
export const EVALUACION_OPTIONS_CON_SANCION: OpcionNivel[] = [
  OPCION_SIN_EVALUAR, OPCION_PENALIZACION, ...NIVELES,
];

/** Las opciones que le tocan a una competencia según admita o no la sanción. */
export function opcionesEvaluacion(admitePenalizacion?: boolean): OpcionNivel[] {
  return admitePenalizacion ? EVALUACION_OPTIONS_CON_SANCION : EVALUACION_OPTIONS;
}

const NUMBER_TO_LABEL: Record<number, string> = {
  [PENALIZACION_VALOR]: PENALIZACION_LABEL,
  0: 'Incipiente B (0%)',
  15: 'Incipiente A (15%)',
  70: 'Básico (70%)',
  85: 'Sólido (85%)',
  100: 'Destacado (100%)',
};

/**
 * Cómo se lee un valor guardado. Acepta número (lo que hay en la base) y cadena
 * (lo que sale del `<select>` y lo que guardaron las versiones viejas, que
 * escribían la etiqueta entera).
 */
export function etiquetaNivel(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'number') return NUMBER_TO_LABEL[val] ?? '';
  const comoNumero = Number(val);
  if (!Number.isNaN(comoNumero) && NUMBER_TO_LABEL[comoNumero]) return NUMBER_TO_LABEL[comoNumero];
  return String(val);
}
