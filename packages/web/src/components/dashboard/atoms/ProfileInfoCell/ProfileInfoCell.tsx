import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ProfileInfoCell.module.css';

interface ProfileInfoCellProps {
  alumno: {
    experiencia?: string;
    expectativas?: string;
    compromiso?: string;
    situacionesEspeciales?: string;
  };
}

/**
 * Tooltip de perfil del alumno renderizado vía portal para escapar el `overflow:hidden`
 * del container de AdminTable. Posicionado con position: fixed basado en getBoundingClientRect
 * del icono. Si no cabe a la derecha, se coloca a la izquierda.
 */
export default function ProfileInfoCell({ alumno }: ProfileInfoCellProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const hasProfile = !!(
    alumno.experiencia ||
    alumno.expectativas ||
    alumno.compromiso ||
    alumno.situacionesEspeciales
  );

  useLayoutEffect(() => {
    if (!open || !hasProfile) {
      setPos(null);
      return;
    }
    function updatePos() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const tooltipWidth = 360;
      const margin = 8;

      let left = rect.right + margin;
      if (left + tooltipWidth > window.innerWidth - 8) {
        left = Math.max(8, rect.left - margin - tooltipWidth);
      }
      const top = rect.top + rect.height / 2;
      setPos({ top, left });
    }
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, hasProfile]);

  return (
    <span
      ref={triggerRef}
      className={styles.profileTooltipWrap}
      onMouseEnter={() => hasProfile && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => hasProfile && setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={hasProfile ? 0 : -1}
    >
      <span
        className="material-icons"
        style={{
          fontSize: 20,
          color: hasProfile ? 'var(--dash-primary)' : 'var(--text-secondary)',
          cursor: hasProfile ? 'help' : 'default',
        }}
      >
        {hasProfile ? 'info' : 'info_outline'}
      </span>
      {open && hasProfile && pos && createPortal(
        <div
          className={styles.profileTooltip}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translateY(-50%)',
          }}
        >
          {alumno.experiencia && <div><strong>Experiencia:</strong> {alumno.experiencia}</div>}
          {alumno.expectativas && <div><strong>Expectativas:</strong> {alumno.expectativas}</div>}
          {alumno.compromiso && <div><strong>Compromiso:</strong> {alumno.compromiso}</div>}
          {alumno.situacionesEspeciales && (
            <div><strong>Situaciones Especiales:</strong> {alumno.situacionesEspeciales}</div>
          )}
        </div>,
        document.body,
      )}
    </span>
  );
}
