import { useState, useRef, useEffect } from 'react';
import styles from './ActionMenu.module.css';

export interface ActionItem {
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface ActionMenuProps {
  actions: ActionItem[];
}

export default function ActionMenu({ actions }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className={styles.wrapper} ref={ref}>
      <button className={styles.trigger} onClick={() => setOpen(!open)}>
        <span className="material-icons">more_vert</span>
      </button>
      {open && (
        <div className={styles.dropdown}>
          {actions.map((action) => (
            <button
              key={action.label}
              className={`${styles.item} ${action.variant === 'danger' ? styles.danger : ''}`}
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
            >
              {action.icon && <span className="material-icons" style={{ fontSize: 18 }}>{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
