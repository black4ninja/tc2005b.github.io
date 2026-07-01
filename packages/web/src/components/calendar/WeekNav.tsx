import { useRef, useEffect } from 'react';
import type { Semana } from '@/types/calendario';
import styles from './WeekNav.module.css';

interface WeekNavProps {
  semanas: Semana[];
  activeIndex: number;
  currentWeekIndex: number;
  onSelectWeek: (index: number) => void;
}

export default function WeekNav({
  semanas,
  activeIndex,
  currentWeekIndex,
  onSelectWeek,
}: WeekNavProps) {
  const navRef = useRef<HTMLElement>(null);
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Keep the active pill visible in the scrollable strip
  useEffect(() => {
    const nav = navRef.current;
    const pill = pillRefs.current[activeIndex];
    if (!nav || !pill) return;

    const pillLeft = pill.offsetLeft;
    const pillRight = pillLeft + pill.offsetWidth;
    const navScroll = nav.scrollLeft;
    const navWidth = nav.clientWidth;

    if (pillLeft < navScroll) {
      nav.scrollLeft = pillLeft - 12;
    } else if (pillRight > navScroll + navWidth) {
      nav.scrollLeft = pillRight - navWidth + 12;
    }
  }, [activeIndex]);

  return (
    <nav className={styles.weekNav} ref={navRef}>
      {semanas.map((sem, i) => {
        const isSpecial = sem.tipo === 'especial';
        const label = isSpecial ? sem.titulo : `Sem ${sem.numero}`;

        const classNames = [
          styles.weekPill,
          i === activeIndex ? styles.active : '',
          i === currentWeekIndex ? styles.current : '',
          isSpecial ? styles.special : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={i}
            ref={(el) => { pillRefs.current[i] = el; }}
            className={classNames}
            onClick={() => onSelectWeek(i)}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}
