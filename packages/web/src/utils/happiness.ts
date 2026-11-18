import type { EstadoHappiness } from '../types/happiness';

/**
 * El orden de las columnas del tablero y de los botones del formulario. Va de
 * mejor a peor, que es como se lee una Happiness Door de izquierda a derecha.
 */
export const ESTADOS_HAPPINESS: { key: EstadoHappiness; label: string; icono: string }[] = [
  { key: 'positivo', label: 'Positivo', icono: 'sentiment_very_satisfied' },
  { key: 'neutral', label: 'Neutral', icono: 'sentiment_neutral' },
  { key: 'negativo', label: 'Negativo', icono: 'sentiment_very_dissatisfied' },
];

export const TEXTO_HAPPINESS_MAX = 5000;

/**
 * Zona del curso. El servidor fija el `dia` de cada entrada en esta zona, así
 * que las horas se enseñan en ella también: si no, una entrada de las 18:30 del
 * miércoles podía salir «jueves 00:30» para quien la lee desde otra zona.
 */
export const ZONA_CURSO = 'America/Mexico_City';

/** Hora de un instante, en la zona del curso. */
export function horaCurso(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: ZONA_CURSO });
}

const ROLES: Record<string, string> = { alumno: 'Alumno', profesor: 'Profesor', admin: 'Administrador' };

export function nombreRol(rol: string): string {
  return ROLES[rol] ?? rol;
}

/**
 * `2026-11-19` → «jueves 19 de noviembre de 2026». Se lee a mediodía UTC para
 * que ninguna zona horaria lo corra al día anterior.
 */
export function fechaLargaDia(dia: string): string {
  const d = new Date(`${dia}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return dia;
  return d.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}
