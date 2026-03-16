import { useState, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { useParams } from 'react-router';
import { calendarioGrupo2 } from '@/data/calendario';
import type { Calendario } from '@/types/calendario';
import { useCalendarFilter } from '@/hooks/useCalendarFilter';
import { useWeekNavigation } from '@/hooks/useWeekNavigation';
import FilterBar from './FilterBar';
import WeekNav from './WeekNav';
import WeekCard from './WeekCard';
import styles from './CalendarPage.module.css';

const CALENDARIO_MAP: Record<string, Calendario> = {
  '501': calendarioGrupo2,
};

export default function CalendarPage() {
  const { grupoId } = useParams<{ grupoId: string }>();
  const calendario = CALENDARIO_MAP[grupoId ?? '501'];

  const semanas = calendario?.semanas ?? [];
  const currentWeekIndex = useWeekNavigation(semanas);
  const { activeFilters, toggleFilter } = useCalendarFilter();

  // Restore expanded state from sessionStorage, or default to current week
  const [expandedMap, setExpandedMap] = useState<Record<number, boolean>>(() => {
    try {
      const saved = sessionStorage.getItem('cal-expanded');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });
  const [allExpanded, setAllExpanded] = useState(false);
  const [activeNavIndex, setActiveNavIndex] = useState(currentWeekIndex);

  // Persist expanded state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('cal-expanded', JSON.stringify(expandedMap));
    } catch {}
  }, [expandedMap]);

  // Save scroll position when navigating away
  useEffect(() => {
    return () => {
      sessionStorage.setItem('cal-scroll', String(window.scrollY));
    };
  }, []);

  // Restore scroll position synchronously before paint
  useLayoutEffect(() => {
    const saved = sessionStorage.getItem('cal-scroll');
    if (saved) {
      window.scrollTo(0, parseInt(saved, 10));
    }
  }, []);

  // On first load (nothing saved), auto-expand the current week
  useEffect(() => {
    if (currentWeekIndex >= 0) {
      setExpandedMap((prev) => {
        const hasAnySaved = Object.keys(prev).length > 0;
        if (hasAnySaved) return prev;
        return { ...prev, [currentWeekIndex]: true };
      });
      setActiveNavIndex(currentWeekIndex);
    }
  }, [currentWeekIndex]);

  const toggleWeek = useCallback((index: number) => {
    setExpandedMap((prev) => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const toggleExpandAll = useCallback(() => {
    setAllExpanded((prev) => {
      const next = !prev;
      const map: Record<number, boolean> = {};
      for (let i = 0; i < semanas.length; i++) {
        map[i] = next;
      }
      setExpandedMap(map);
      return next;
    });
  }, [semanas.length]);

  const handleSelectWeek = useCallback((index: number) => {
    setActiveNavIndex(index);
    setExpandedMap((prev) => ({ ...prev, [index]: true }));
    const el = document.getElementById(`semana-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  if (!calendario) {
    return (
      <div className={styles.calendarContent}>
        <p>Grupo no encontrado.</p>
      </div>
    );
  }

  return (
    <div className={styles.calendarPage}>
      <div className={styles.stickyControls}>
        <FilterBar
          activeFilters={activeFilters}
          onToggleFilter={toggleFilter}
          allExpanded={allExpanded}
          onToggleExpandAll={toggleExpandAll}
        />
        <WeekNav
          semanas={semanas}
          activeIndex={activeNavIndex}
          currentWeekIndex={currentWeekIndex}
          onSelectWeek={handleSelectWeek}
        />
      </div>

      <main className={styles.calendarContent}>
        {semanas.map((semana, index) => (
          <WeekCard
            key={index}
            semana={semana}
            index={index}
            expanded={!!expandedMap[index]}
            onToggle={() => toggleWeek(index)}
            isCurrentWeek={index === currentWeekIndex}
            activeFilters={activeFilters}
          />
        ))}
      </main>
    </div>
  );
}
