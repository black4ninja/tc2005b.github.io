import type { Dia, ActividadTipo } from '@/types/calendario';
import ActivityItem from './ActivityItem';
import styles from './DayColumn.module.css';

const DAY_NAMES: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
};

interface DayColumnProps {
  dayKey: 'lunes' | 'martes' | 'miercoles' | 'jueves';
  day: Dia | undefined;
  activeFilters: Set<ActividadTipo>;
}

export default function DayColumn({ dayKey, day, activeFilters }: DayColumnProps) {
  if (!day) return null;

  const isFiltered = (tipo: ActividadTipo): boolean => {
    if (activeFilters.size === 0) return false;
    if (tipo === 'break') return false;
    return !activeFilters.has(tipo);
  };

  return (
    <div className={styles.dayColumn}>
      <h3 className={styles.dayName}>{DAY_NAMES[dayKey]}</h3>

      {day.nota && <div className={styles.dayNote}>{day.nota}</div>}

      {day.previo && day.previo.length > 0 && (
        <div className={styles.preSession}>
          <div className={styles.preSessionLabel}>Previo a la sesión</div>
          {day.previo.map((act, i) => (
            <ActivityItem
              key={i}
              actividad={act}
              isFilteredOut={isFiltered(act.tipo)}
            />
          ))}
        </div>
      )}

      {day.actividades && (
        <div className={styles.activityList}>
          {day.actividades.map((act, i) => (
            <ActivityItem
              key={i}
              actividad={act}
              isFilteredOut={isFiltered(act.tipo)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
