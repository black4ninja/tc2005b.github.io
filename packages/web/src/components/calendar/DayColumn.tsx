import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Dia, ActividadTipo } from '@/types/calendario';
import { DIA_NOMBRES, diaDelMes, type DiaKey } from '@/utils/diasSemana';
import ActivityItem from './ActivityItem';
import SortableActivityItem from './SortableActivityItem';
import styles from './DayColumn.module.css';

interface DayColumnProps {
  dayKey: DiaKey;
  day: Dia | undefined;
  activeFilters: Set<ActividadTipo>;
  editable?: boolean;
  onAddActivity?: (dayKey: string, isPrevio: boolean) => void;
  onEditActivity?: (actividadId: string) => void;
  onDeleteActivity?: (actividadId: string) => void;
  fechaInicio?: string;
}

function DroppableZone({ id, children, isEmpty }: { id: string; children?: React.ReactNode; isEmpty?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${isEmpty ? styles.emptyDropZone : ''} ${isOver ? styles.dropTarget : ''}`}
    >
      {children}
    </div>
  );
}

export default function DayColumn({ dayKey, day, activeFilters, editable, onAddActivity, onEditActivity, onDeleteActivity, fechaInicio }: DayColumnProps) {
  const dayHeader = (
    <h3 className={styles.dayName}>
      {DIA_NOMBRES[dayKey]}
      {fechaInicio && <span className={styles.dayDate}> {diaDelMes(fechaInicio, dayKey)}</span>}
    </h3>
  );

  const isFiltered = (tipo: ActividadTipo): boolean => {
    if (activeFilters.size === 0) return false;
    return !activeFilters.has(tipo);
  };

  const previo = day?.previo ?? [];
  const actividades = day?.actividades ?? [];

  const previoIds = editable ? previo.map((a, i) => a.id ?? `${dayKey}-previo-${i}`) : [];
  const actIds = editable ? actividades.map((a, i) => a.id ?? `${dayKey}-act-${i}`) : [];

  if (!day && editable) {
    // Empty day in editable mode — show drop zones
    return (
      <div className={styles.dayColumn}>
        {dayHeader}
        <DroppableZone id={`${dayKey}-previo`} isEmpty>
          <div className={styles.preSession}>
            <div className={styles.preSessionLabel}>Previo a la sesión</div>
          </div>
        </DroppableZone>
        <DroppableZone id={`${dayKey}-actividades`} isEmpty />
        {onAddActivity && (
          <button className={styles.addActivityBtn} onClick={() => onAddActivity(dayKey, false)}>
            <i className="material-icons">add</i>
            Agregar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.dayColumn}>
      {dayHeader}

      {day?.nota && <div className={styles.dayNote}>{day.nota}</div>}

      {editable ? (
        <>
          <SortableContext items={previoIds} strategy={verticalListSortingStrategy} id={`${dayKey}-previo`}>
            <DroppableZone id={`${dayKey}-previo`} isEmpty={previo.length === 0}>
              <div className={styles.preSession}>
                <div className={styles.preSessionLabel}>Previo a la sesión</div>
                {previo.map((act, i) => (
                  <SortableActivityItem
                    key={previoIds[i]}
                    id={previoIds[i]}
                    actividad={act}
                    isFilteredOut={isFiltered(act.tipo)}
                    editable={editable}
                    onEdit={onEditActivity}
                    onDelete={onDeleteActivity}
                  />
                ))}
              </div>
              {onAddActivity && (
                <button className={styles.addActivityBtn} onClick={() => onAddActivity(dayKey, true)}>
                  <i className="material-icons">add</i>
                  Agregar previo
                </button>
              )}
            </DroppableZone>
          </SortableContext>

          <SortableContext items={actIds} strategy={verticalListSortingStrategy} id={`${dayKey}-actividades`}>
            <DroppableZone id={`${dayKey}-actividades`} isEmpty={actividades.length === 0}>
              <div className={styles.activityList}>
                {actividades.map((act, i) => (
                  <SortableActivityItem
                    key={actIds[i]}
                    id={actIds[i]}
                    actividad={act}
                    isFilteredOut={isFiltered(act.tipo)}
                    editable={editable}
                    onEdit={onEditActivity}
                    onDelete={onDeleteActivity}
                  />
                ))}
              </div>
            </DroppableZone>
          </SortableContext>
          {onAddActivity && (
            <button className={styles.addActivityBtn} onClick={() => onAddActivity(dayKey, false)}>
              <i className="material-icons">add</i>
              Agregar
            </button>
          )}
        </>
      ) : (
        <>
          {previo.length > 0 && (
            <div className={styles.preSession}>
              <div className={styles.preSessionLabel}>Previo a la sesión</div>
              {previo.map((act, i) => (
                <ActivityItem
                  key={i}
                  actividad={act}
                  isFilteredOut={isFiltered(act.tipo)}
                />
              ))}
            </div>
          )}

          {actividades.length > 0 && (
            <div className={styles.activityList}>
              {actividades.map((act, i) => (
                <ActivityItem
                  key={i}
                  actividad={act}
                  isFilteredOut={isFiltered(act.tipo)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
