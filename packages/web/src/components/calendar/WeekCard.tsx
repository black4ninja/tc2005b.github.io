import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { confirmar } from '@/utils/dialogos';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import type { Semana, SemanaNormal, Actividad, ActividadTipo } from '@/types/calendario';
import type { ReorderUpdate } from '@/hooks/useCalendarReorder';
import DayColumn from './DayColumn';
import DaySummaryCell from './DaySummaryCell';
import { DragOverlayActivityItem } from './SortableActivityItem';
import { computeSessionSummaries } from '@/utils/durationUtils';
import styles from './WeekCard.module.css';

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const sDay = s.getDate();
  const eDay = e.getDate();
  const sMonth = MONTHS_ES[s.getMonth()];
  const eMonth = MONTHS_ES[e.getMonth()];
  if (sMonth === eMonth) {
    return `${sDay} al ${eDay} de ${sMonth}`;
  }
  return `${sDay} de ${sMonth} al ${eDay} de ${eMonth}`;
}

interface ActivityCounts {
  [key: string]: number;
}

function countActivitiesByType(semana: SemanaNormal): ActivityCounts {
  const counts: ActivityCounts = {};
  const dias = semana.dias;
  for (const day of Object.values(dias)) {
    if (!day) continue;
    const all = [...(day.previo || []), ...(day.actividades || [])];
    for (const act of all) {
      if (act.tipo !== 'break') {
        counts[act.tipo] = (counts[act.tipo] || 0) + 1;
      }
    }
  }
  return counts;
}

const SUMMARY_LABELS: Record<string, string> = {
  lab: 'Labs',
  lectura: 'Lecturas',
  ejercicio: 'Ejercicios',
  proyecto: 'Proyecto',
  evaluacion: 'Eval',
  trabajo: 'Trabajo',
  discusion: 'Discusión',
  info: 'Info',
};

const DAY_KEYS = ['lunes', 'martes', 'miercoles', 'jueves'] as const;

type DayKey = typeof DAY_KEYS[number];

interface DragHandleProps {
  listeners: any;
  attributes: Record<string, any>;
}

function isSemanaEmpty(semana: Semana): boolean {
  if (semana.tipo === 'especial') return true;
  const normal = semana as SemanaNormal;
  for (const dayKey of DAY_KEYS) {
    const day = normal.dias[dayKey];
    if (!day) continue;
    if ((day.previo?.length ?? 0) > 0) return false;
    if ((day.actividades?.length ?? 0) > 0) return false;
  }
  return true;
}

interface WeekCardProps {
  semana: Semana;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  isCurrentWeek: boolean;
  activeFilters: Set<ActividadTipo>;
  editable?: boolean;
  onReorder?: (weekIndex: number, updates: ReorderUpdate[], newSemana: SemanaNormal) => void;
  onAddActivity?: (semanaId: string, dayKey: string, isPrevio: boolean) => void;
  onEditActivity?: (semanaId: string, actividadId: string) => void;
  onDeleteActivity?: (semanaId: string, actividadId: string) => void;
  onDeleteWeek?: (semanaId: string) => void;
  dragHandleProps?: DragHandleProps;
}

// Parse container ID like "lunes-previo" or "martes-actividades"
function parseContainerId(id: string): { dia: DayKey; isPrevio: boolean } | null {
  for (const day of DAY_KEYS) {
    if (id.startsWith(`${day}-`)) {
      const section = id.slice(day.length + 1);
      if (section === 'previo') return { dia: day, isPrevio: true };
      if (section === 'actividades') return { dia: day, isPrevio: false };
    }
  }
  return null;
}

// Find which container an activity ID belongs to
function findContainer(semana: SemanaNormal, activeId: string): string | null {
  for (const dayKey of DAY_KEYS) {
    const day = semana.dias[dayKey];
    if (!day) continue;
    if (day.previo?.some((a) => a.id === activeId)) return `${dayKey}-previo`;
    if (day.actividades?.some((a) => a.id === activeId)) return `${dayKey}-actividades`;
  }
  return null;
}

function getActivitiesForContainer(semana: SemanaNormal, containerId: string): Actividad[] {
  const parsed = parseContainerId(containerId);
  if (!parsed) return [];
  const day = semana.dias[parsed.dia];
  if (!day) return [];
  return parsed.isPrevio ? (day.previo ?? []) : (day.actividades ?? []);
}

export default function WeekCard({
  semana,
  index,
  expanded,
  onToggle,
  isCurrentWeek,
  activeFilters,
  editable,
  onReorder,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onDeleteWeek,
  dragHandleProps,
}: WeekCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const isSpecial = semana.tipo === 'especial';
  const weekLabel = isSpecial ? semana.titulo : `Semana ${semana.numero}`;
  const dateRange = formatDateRange(semana.fechaInicio, semana.fechaFin);

  const cardClasses = [
    styles.weekCard,
    expanded ? styles.expanded : '',
    isSpecial ? styles.specialWeek : '',
    isCurrentWeek ? styles.currentWeek : '',
  ]
    .filter(Boolean)
    .join(' ');

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localSemana, setLocalSemana] = useState<SemanaNormal | null>(null);

  // Use localSemana during drag, otherwise use the prop
  const displaySemana = localSemana ?? (isSpecial ? null : semana as SemanaNormal);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Find the active actividad for DragOverlay
  const activeActividad = useMemo(() => {
    if (!activeId || !displaySemana) return null;
    for (const dayKey of DAY_KEYS) {
      const day = displaySemana.dias[dayKey];
      if (!day) continue;
      const found = day.previo?.find((a) => a.id === activeId)
        ?? day.actividades?.find((a) => a.id === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, displaySemana]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    if (!isSpecial) {
      setLocalSemana(structuredClone(semana as SemanaNormal));
    }
  }, [semana, isSpecial]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !localSemana) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const fromContainer = findContainer(localSemana, activeIdStr);
    if (!fromContainer) return;

    // Determine the target container
    let toContainer: string | null = null;

    // If over is a container ID (droppable zone)
    if (parseContainerId(overIdStr)) {
      toContainer = overIdStr;
    } else {
      // over is another activity — find its container
      toContainer = findContainer(localSemana, overIdStr);
    }

    if (!toContainer || fromContainer === toContainer) return;

    // Move item between containers
    setLocalSemana((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);

      const fromParsed = parseContainerId(fromContainer)!;
      const toParsed = parseContainerId(toContainer!)!;

      // Ensure dia objects exist
      if (!next.dias[fromParsed.dia]) next.dias[fromParsed.dia] = {};
      if (!next.dias[toParsed.dia]) next.dias[toParsed.dia] = {};

      const fromDay = next.dias[fromParsed.dia]!;
      const toDay = next.dias[toParsed.dia]!;

      const fromKey = fromParsed.isPrevio ? 'previo' : 'actividades';
      const toKey = toParsed.isPrevio ? 'previo' : 'actividades';

      if (!fromDay[fromKey]) fromDay[fromKey] = [];
      if (!toDay[toKey]) toDay[toKey] = [];

      const fromArr = fromDay[fromKey]!;
      const toArr = toDay[toKey]!;

      const itemIndex = fromArr.findIndex((a) => a.id === activeIdStr);
      if (itemIndex === -1) return prev;

      const [item] = fromArr.splice(itemIndex, 1);

      // Find insertion index
      if (parseContainerId(overIdStr)) {
        // Dropped on empty container
        toArr.push(item);
      } else {
        const overIndex = toArr.findIndex((a) => a.id === overIdStr);
        if (overIndex >= 0) {
          toArr.splice(overIndex, 0, item);
        } else {
          toArr.push(item);
        }
      }

      return next;
    });
  }, [localSemana]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!localSemana || !over) {
      setLocalSemana(null);
      return;
    }

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Handle reorder within same container
    const activeContainer = findContainer(localSemana, activeIdStr);
    if (!activeContainer) {
      setLocalSemana(null);
      return;
    }

    let targetContainer = activeContainer;
    if (parseContainerId(overIdStr)) {
      targetContainer = overIdStr;
    } else {
      const overContainer = findContainer(localSemana, overIdStr);
      if (overContainer) targetContainer = overContainer;
    }

    const finalSemana = structuredClone(localSemana);

    // If same container, handle reorder
    if (activeContainer === targetContainer) {
      const parsed = parseContainerId(activeContainer)!;
      const day = finalSemana.dias[parsed.dia];
      if (day) {
        const key = parsed.isPrevio ? 'previo' : 'actividades';
        const arr = day[key] ?? [];
        const oldIndex = arr.findIndex((a) => a.id === activeIdStr);
        const newIndex = arr.findIndex((a) => a.id === overIdStr);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const [item] = arr.splice(oldIndex, 1);
          arr.splice(newIndex, 0, item);
          day[key] = arr;
        }
      }
    }

    // Build updates for all affected activities
    const updates: ReorderUpdate[] = [];
    for (const dayKey of DAY_KEYS) {
      const day = finalSemana.dias[dayKey];
      if (!day) continue;
      if (day.previo) {
        day.previo.forEach((act, i) => {
          if (act.id) updates.push({ actividadId: act.id, dia: dayKey, isPrevio: true, orden: i });
        });
      }
      if (day.actividades) {
        day.actividades.forEach((act, i) => {
          if (act.id) updates.push({ actividadId: act.id, dia: dayKey, isPrevio: false, orden: i });
        });
      }
    }

    setLocalSemana(null);

    if (onReorder && updates.length > 0) {
      onReorder(index, updates, finalSemana);
    }
  }, [localSemana, index, onReorder]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setLocalSemana(null);
  }, []);

  // Scroll into view when this is the current week on first render
  useEffect(() => {
    if (isCurrentWeek && expanded && cardRef.current) {
      const timeout = setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderDayGrid = () => {
    const sem = displaySemana;
    if (!sem) return null;

    const grid = (
      <div className={styles.dayGrid}>
        {DAY_KEYS.map((dayKey) => (
          <DayColumn
            key={dayKey}
            dayKey={dayKey}
            day={sem.dias[dayKey]}
            activeFilters={activeFilters}
            editable={editable}
            fechaInicio={sem.fechaInicio}
            onAddActivity={editable && onAddActivity && sem.id
              ? (day, isPrevio) => onAddActivity(sem.id!, day, isPrevio)
              : undefined}
            onEditActivity={editable && onEditActivity && sem.id
              ? (actId) => onEditActivity(sem.id!, actId)
              : undefined}
            onDeleteActivity={editable && onDeleteActivity && sem.id
              ? (actId) => onDeleteActivity(sem.id!, actId)
              : undefined}
          />
        ))}
        {DAY_KEYS.map((dayKey) => {
          const day = sem.dias[dayKey];
          const sessions = computeSessionSummaries(day?.actividades ?? []);
          return <DaySummaryCell key={`${dayKey}-summary`} sessions={sessions} />;
        })}
      </div>
    );

    if (editable) {
      return (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {grid}
          <DragOverlay>
            {activeActividad ? <DragOverlayActivityItem actividad={activeActividad} /> : null}
          </DragOverlay>
        </DndContext>
      );
    }

    return grid;
  };

  return (
    <section
      className={cardClasses}
      id={`semana-${index}`}
      ref={cardRef}
    >
      <button
        className={styles.weekHeader}
        aria-expanded={expanded}
        onClick={onToggle}
      >
        {editable && dragHandleProps && (
          <span
            className={styles.weekDragHandle}
            {...dragHandleProps.listeners}
            {...dragHandleProps.attributes}
            onClick={(e) => e.stopPropagation()}
          >
            <i className="material-icons">drag_indicator</i>
          </span>
        )}
        <div className={`${styles.weekNumber} ${isSpecial ? styles.weekNumberSpecial : ''}`}>
          {String(semana.numero)}
        </div>
        <div className={styles.weekInfo}>
          <h2>{weekLabel}{isCurrentWeek && <span className={styles.currentLabel}> — Semana actual</span>}</h2>
          <span className={styles.weekDates}>{dateRange}</span>
        </div>

        {!isSpecial && !expanded && (
          <div className={styles.weekSummary}>
            {(() => {
              const counts = countActivitiesByType(semana as SemanaNormal);
              return Object.entries(counts)
                .filter(([key]) => SUMMARY_LABELS[key])
                .map(([key, count]) => (
                  <span
                    key={key}
                    className={styles.summaryChip}
                    style={{
                      '--chip-bg': `var(--color-${key}-light)`,
                      '--chip-color': `var(--color-${key})`,
                    } as React.CSSProperties}
                  >
                    {count} {SUMMARY_LABELS[key]}
                  </span>
                ));
            })()}
          </div>
        )}

        {editable && onDeleteWeek && semana.id && isSemanaEmpty(semana) && (
          <span
            className={styles.weekDeleteBtn}
            title="Eliminar semana vacía"
            onClick={async (e) => {
              e.stopPropagation();
              const ok = await confirmar({
                titulo: '¿Eliminar esta semana?',
                texto: 'La semana está vacía; esta acción no se puede deshacer.',
                confirmar: 'Eliminar',
                peligro: true,
              });
              if (ok) onDeleteWeek(semana.id!);
            }}
          >
            <i className="material-icons">delete_outline</i>
          </span>
        )}
        <i className={`material-icons ${styles.chevron}`}>expand_more</i>
      </button>

      <div className={styles.weekContent}>
        <div className={styles.weekContentInner}>
          {isSpecial ? (
            <div className={styles.specialContent}>
              <i className="material-icons">event_busy</i>
              <p><strong>{semana.mensaje}</strong></p>
              {semana.mensajeImportante && (
                <p className={styles.specialImportant}>
                  <strong>{semana.mensajeImportante}</strong>
                </p>
              )}
            </div>
          ) : renderDayGrid()}
        </div>
      </div>
    </section>
  );
}
