import type { ActividadTipo } from '@/types/calendario';
import styles from './FilterBar.module.css';

interface FilterPillData {
  type: ActividadTipo;
  label: string;
  icon: string;
}

const FILTER_PILLS: FilterPillData[] = [
  { type: 'lab', label: 'Labs', icon: 'assignment' },
  { type: 'lectura', label: 'Lecturas', icon: 'menu_book' },
  { type: 'ejercicio', label: 'Ejercicios', icon: 'edit' },
  { type: 'proyecto', label: 'Proyecto', icon: 'stars' },
  { type: 'evaluacion', label: 'Evaluación', icon: 'check_circle' },
  { type: 'trabajo', label: 'Trabajo', icon: 'work' },
];

interface FilterBarProps {
  activeFilters: Set<ActividadTipo>;
  onToggleFilter: (type: ActividadTipo) => void;
  allExpanded: boolean;
  onToggleExpandAll: () => void;
}

export default function FilterBar({
  activeFilters,
  onToggleFilter,
  allExpanded,
  onToggleExpandAll,
}: FilterBarProps) {
  return (
    <div className={styles.filterBar}>
      <span className={styles.filterLabel}>Filtrar:</span>
      {FILTER_PILLS.map((pill) => (
        <button
          key={pill.type}
          className={`${styles.filterPill} ${activeFilters.has(pill.type) ? styles.active : ''}`}
          style={{ '--pill-color': `var(--color-${pill.type})` } as React.CSSProperties}
          onClick={() => onToggleFilter(pill.type)}
        >
          <i className="material-icons">{pill.icon}</i>
          {pill.label}
        </button>
      ))}
      <button className={styles.btnExpandAll} onClick={onToggleExpandAll}>
        {allExpanded ? 'Colapsar todo' : 'Expandir todo'}
      </button>
    </div>
  );
}
