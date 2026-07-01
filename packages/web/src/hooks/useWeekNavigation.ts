import { useMemo } from 'react';
import type { Semana } from '@/types/calendario';

export function useWeekNavigation(semanas: Semana[]): number {
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1) Find week that contains today
    for (let i = 0; i < semanas.length; i++) {
      const start = new Date(semanas[i].fechaInicio + 'T00:00:00');
      const end = new Date(semanas[i].fechaFin + 'T23:59:59');
      if (today >= start && today <= end) {
        return i;
      }
    }

    // 2) Find nearest upcoming week
    let bestIndex = -1;
    let bestDist = Infinity;
    for (let i = 0; i < semanas.length; i++) {
      const start = new Date(semanas[i].fechaInicio + 'T00:00:00');
      const dist = start.getTime() - today.getTime();
      if (dist >= 0 && dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    }

    // 3) All weeks in the past — pick the last one
    if (bestIndex === -1) {
      bestIndex = semanas.length - 1;
    }

    return bestIndex;
  }, [semanas]);
}
