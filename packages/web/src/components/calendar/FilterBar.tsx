import type { ActividadTipo } from '@/types/calendario';
import { colorTipo, iconoTipo, pluralTipo } from '@/data/tiposActividad';
import styles from './FilterBar.module.css';

interface FilterBarProps {
  activeFilters: Set<ActividadTipo>;
  onToggleFilter: (type: ActividadTipo) => void;
  /**
   * Tipos que este calendario usa de verdad, ya ordenados. Solo se pinta una
   * píldora por cada uno: un filtro para algo que el grupo no tiene únicamente
   * puede vaciar la pantalla, y de paso sugiere tipos de actividad que no le
   * corresponden.
   */
  tiposDisponibles: ActividadTipo[];
  allExpanded: boolean;
  onToggleExpandAll: () => void;
}

export default function FilterBar({
  activeFilters,
  onToggleFilter,
  tiposDisponibles,
  allExpanded,
  onToggleExpandAll,
}: FilterBarProps) {
  return (
    <div className={styles.filterBar}>
      {/* Sin tipos no hay nada que filtrar; la etiqueta «Filtrar:» suelta sobre
          una fila vacía solo desconcierta. El expandir/colapsar se queda: no
          depende de los filtros. */}
      {tiposDisponibles.length > 0 && (
        <>
          <span className={styles.filterLabel}>Filtrar:</span>
          {tiposDisponibles.map((tipo) => (
            <button
              key={tipo}
              className={`${styles.filterPill} ${activeFilters.has(tipo) ? styles.active : ''}`}
              style={{ '--pill-color': colorTipo(tipo) } as React.CSSProperties}
              onClick={() => onToggleFilter(tipo)}
              aria-pressed={activeFilters.has(tipo)}
            >
              <i className="material-icons">{iconoTipo(tipo)}</i>
              {pluralTipo(tipo)}
            </button>
          ))}
        </>
      )}
      <button className={styles.btnExpandAll} onClick={onToggleExpandAll}>
        {allExpanded ? 'Colapsar todo' : 'Expandir todo'}
      </button>
    </div>
  );
}
