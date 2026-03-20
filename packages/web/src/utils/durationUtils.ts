import type { Actividad } from '@/types/calendario';

/**
 * Parsea strings de duración como "20 min", "1h 50min", "1h" a minutos totales.
 */
export function parseDurationToMinutes(duracion: string): number {
  const match = duracion.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*min)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  return hours * 60 + minutes;
}

/**
 * Convierte minutos a formato legible: "1h 50min", "55 min".
 */
export function formatMinutesToDuration(minutes: number): string {
  if (minutes <= 0) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}

/**
 * Calcula resúmenes de sesión para un día.
 * Los breaks delimitan sesiones. Las actividades "previo" no se incluyen.
 * Retorna array de strings formateados por sesión.
 */
export function computeSessionSummaries(actividades: Actividad[]): string[] {
  const sessions: number[] = [];
  let current = 0;

  for (const act of actividades) {
    if (act.tipo === 'break') {
      sessions.push(current);
      current = 0;
      continue;
    }
    if (act.duracion) {
      current += parseDurationToMinutes(act.duracion);
    }
  }
  sessions.push(current);

  const nonEmpty = sessions.filter((m) => m > 0);
  return nonEmpty.map((m) => formatMinutesToDuration(m));
}
