import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Dia, ActividadTipo } from '@/types/calendario';
import ActivityItem from './ActivityItem';
import SortableActivityItem from './SortableActivityItem';
import styles from './DayColumn.module.css';

const DAY_NAMES: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
};

const DAY_OFFSETS: Record<string, number> = {
  lunes: 0,
  martes: 1,
  miercoles: 2,
  jueves: 3,
};

function getDayDate(fechaInicio: string, dayKey: string): number {
  const date = new Date(fechaInicio + 'T00:00:00');
  date.setDate(date.getDate() + DAY_OFFSETS[dayKey]);
  return date.getDate();
}

interface DayColumnProps {
  dayKey: 'lunes' | 'martes' | 'miercoles' | 'jueves';
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
  if (!day && !editable) return null;

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
        <h3 className={styles.dayName}>{DAY_NAMES[dayKey]}{fechaInicio && <span className={styles.dayDate}> {getDayDate(fechaInicio, dayKey)}</span>}</h3>
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
      <h3 className={styles.dayName}>{DAY_NAMES[dayKey]}</h3>

      {day!.nota && <div className={styles.dayNote}>{day!.nota}</div>}

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
