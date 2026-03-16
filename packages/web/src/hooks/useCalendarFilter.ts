import { useState, useCallback } from 'react';
import type { ActividadTipo } from '@/types/calendario';

export function useCalendarFilter() {
  const [activeFilters, setActiveFilters] = useState<Set<ActividadTipo>>(new Set());

  const toggleFilter = useCallback((type: ActividadTipo) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const isFiltered = useCallback(
    (type: ActividadTipo): boolean => {
      if (activeFilters.size === 0) return false;
      return !activeFilters.has(type);
    },
    [activeFilters],
  );

  return { activeFilters, toggleFilter, isFiltered } as const;
}
