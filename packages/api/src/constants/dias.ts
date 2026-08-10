/** Días con clase posibles dentro de una semana, en orden. */
export const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const;

export type DiaSemana = (typeof DIAS_SEMANA)[number];

export const DIAS_POR_DEFECTO: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves'];

export function esDiaValido(valor: unknown): valor is DiaSemana {
  return typeof valor === 'string' && (DIAS_SEMANA as readonly string[]).includes(valor);
}

/** Ordena de lunes a viernes y elimina duplicados e inválidos. */
export function normalizarDias(dias: unknown): DiaSemana[] {
  if (!Array.isArray(dias)) return [];
  const set = new Set(dias.filter(esDiaValido));
  return DIAS_SEMANA.filter((d) => set.has(d));
}
