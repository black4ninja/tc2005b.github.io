import type { Dia, SemanaNormal } from '@/types/calendario';

export const DIA_KEYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as const;

export type DiaKey = (typeof DIA_KEYS)[number];

export const DIA_NOMBRES: Record<DiaKey, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
};

export const DIA_CORTOS: Record<DiaKey, string> = {
  lunes: 'Lu',
  martes: 'Ma',
  miercoles: 'Mi',
  jueves: 'Ju',
  viernes: 'Vi',
};

/** Desplazamiento en días respecto al lunes de la semana. */
export const DIA_OFFSETS: Record<DiaKey, number> = {
  lunes: 0,
  martes: 1,
  miercoles: 2,
  jueves: 3,
  viernes: 4,
};

export const DIAS_POR_DEFECTO: DiaKey[] = ['lunes', 'martes', 'miercoles', 'jueves'];

export function esDiaKey(valor: string): valor is DiaKey {
  return (DIA_KEYS as readonly string[]).includes(valor);
}

/** Ordena de lunes a viernes y elimina duplicados. */
export function ordenarDias(dias: readonly string[]): DiaKey[] {
  const set = new Set(dias.filter(esDiaKey));
  return DIA_KEYS.filter((d) => set.has(d));
}

function tieneContenido(dia: Dia | undefined): boolean {
  if (!dia) return false;
  return Boolean(dia.nota) || (dia.previo?.length ?? 0) > 0 || (dia.actividades?.length ?? 0) > 0;
}

/**
 * Días con clase de una semana. Usa `diasActivos` cuando existe; las semanas
 * creadas antes de ese campo conservan el lunes–jueves de siempre. No se deduce
 * del rango de fechas: hay semanas viejas con un `fechaFin` que se pasa del
 * jueves, y ampliarlas solas cambiaría calendarios que nadie tocó.
 */
export function diasDeSemana(semana: SemanaNormal): DiaKey[] {
  const explicitos = ordenarDias(semana.diasActivos ?? []);
  const base = explicitos.length > 0 ? explicitos : DIAS_POR_DEFECTO;
  // Un día con contenido siempre se muestra, aunque no esté marcado.
  const conContenido = DIA_KEYS.filter((d) => tieneContenido(semana.dias[d]));
  return ordenarDias([...base, ...conContenido]);
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(fecha + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  return toISODate(d);
}

export function toISODate(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Lunes de la semana a la que pertenece la fecha dada. */
export function lunesDe(fecha: string): string {
  const d = new Date(fecha + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return fecha;
  const dow = d.getDay(); // 0 = domingo
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + offset);
  return toISODate(d);
}

export function lunesSiguiente(): string {
  const hoy = new Date();
  const dow = hoy.getDay();
  const offset = dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow;
  hoy.setDate(hoy.getDate() + offset);
  return toISODate(hoy);
}

/** Fecha del último día con clase, para derivar `fechaFin`. */
export function fechaFinDeDias(fechaInicio: string, dias: readonly DiaKey[]): string {
  const ordenados = ordenarDias(dias);
  const ultimo = ordenados[ordenados.length - 1] ?? 'lunes';
  return sumarDias(fechaInicio, DIA_OFFSETS[ultimo]);
}

/** Día del mes que corresponde a un día de clase dentro de la semana. */
export function diaDelMes(fechaInicio: string, dia: DiaKey): number {
  const d = new Date(fechaInicio + 'T00:00:00');
  d.setDate(d.getDate() + DIA_OFFSETS[dia]);
  return d.getDate();
}
