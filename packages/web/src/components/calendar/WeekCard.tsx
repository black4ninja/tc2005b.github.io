import { useRef, useEffect } from 'react';
import type { Semana, SemanaNormal, ActividadTipo } from '@/types/calendario';
import DayColumn from './DayColumn';
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

interface WeekCardProps {
  semana: Semana;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  isCurrentWeek: boolean;
  activeFilters: Set<ActividadTipo>;
}

export default function WeekCard({
  semana,
  index,
  expanded,
  onToggle,
  isCurrentWeek,
  activeFilters,
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

  // Scroll into view when this is the current week on first render
  useEffect(() => {
    if (isCurrentWeek && expanded && cardRef.current) {
      const timeout = setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          ) : (
            <div className={styles.dayGrid}>
              {DAY_KEYS.map((dayKey) => (
                <DayColumn
                  key={dayKey}
                  dayKey={dayKey}
                  day={(semana as SemanaNormal).dias[dayKey]}
                  activeFilters={activeFilters}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
