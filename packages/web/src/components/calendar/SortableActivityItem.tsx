import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Actividad, ActividadTipo } from '@/types/calendario';
import ActivityItem from './ActivityItem';
import styles from './SortableActivityItem.module.css';

interface SortableActivityItemProps {
  id: string;
  actividad: Actividad;
  isFilteredOut: boolean;
  editable?: boolean;
  onEdit?: (actividadId: string) => void;
  onDelete?: (actividadId: string) => void;
}

export default function SortableActivityItem({ id, actividad, isFilteredOut, editable, onEdit, onDelete }: SortableActivityItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.sortableItem} ${isDragging ? styles.dragging : ''} ${editable ? styles.editable : ''}`}
    >
      <span className={styles.dragHandle} {...attributes} {...listeners}>
        <span className="material-icons">drag_indicator</span>
      </span>
      <div className={styles.sortableInner}>
        <div className={styles.activityWrapper}>
          <ActivityItem actividad={actividad} isFilteredOut={isFilteredOut} />
        </div>
        {editable && (
          <div className={styles.actionButtons}>
            <button
              className={`${styles.actionBtn} ${styles.actionBtnEdit}`}
              title="Editar"
              onClick={(e) => { e.stopPropagation(); onEdit?.(actividad.id!); }}
            >
              <i className="material-icons">edit</i>
            </button>
            <button
              className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
              title="Eliminar"
              onClick={(e) => { e.stopPropagation(); onDelete?.(actividad.id!); }}
            >
              <i className="material-icons">delete_outline</i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function DragOverlayActivityItem({ actividad }: { actividad: Actividad }) {
  return (
    <div className={styles.dragOverlay}>
      <div className={styles.sortableInner}>
        <div className={styles.activityWrapper}>
          <ActivityItem actividad={actividad} isFilteredOut={false} />
        </div>
      </div>
    </div>
  );
}
