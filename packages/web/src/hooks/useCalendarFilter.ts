import { useState, useCallback, useEffect } from 'react';
import type { ActividadTipo } from '@/types/calendario';

/**
 * Filtro por tipo de actividad del calendario.
 *
 * Un conjunto vacío significa «no he filtrado», no «no quiero nada»: es la
 * lectura que espera quien no ha tocado nada todavía.
 *
 * @param tiposDisponibles tipos que el calendario usa de verdad. Se usa para
 *   PODAR la selección: si el único laboratorio del calendario desaparece
 *   mientras se filtra por «Labs», su píldora se va con él y el filtro quedaría
 *   escondiendo cosas sin ningún control con el que deshacerlo.
 */
/**
 * Quita de la selección los tipos que ya no existen. Devuelve el MISMO conjunto
 * cuando no hay nada que quitar: uno nuevo volvería a renderizar el calendario
 * entero en cada carga, y el efecto que lo llama se dispara en cada fetch.
 */
export function podarFiltros(
  activos: Set<ActividadTipo>,
  disponibles: Set<ActividadTipo>,
): Set<ActividadTipo> {
  const podado = new Set([...activos].filter((t) => disponibles.has(t)));
  return podado.size === activos.size ? activos : podado;
}

export function useCalendarFilter(tiposDisponibles: ActividadTipo[] = []) {
  const [activeFilters, setActiveFilters] = useState<Set<ActividadTipo>>(new Set());

  // Clave estable: el array llega nuevo en cada render aunque no cambie nada.
  const claveDisponibles = tiposDisponibles.join(',');

  useEffect(() => {
    const disponibles = new Set(claveDisponibles ? (claveDisponibles.split(',') as ActividadTipo[]) : []);
    setActiveFilters((prev) => podarFiltros(prev, disponibles));
  }, [claveDisponibles]);

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
