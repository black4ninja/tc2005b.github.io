import { useState, useCallback } from 'react';
import { useClickOutside } from '../../../../hooks/useClickOutside';
import styles from './DropdownMenu.module.css';

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
}

export default function DropdownMenu({ trigger, children, align = 'right' }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside<HTMLDivElement>(close);

  return (
    <div className={styles.wrapper} ref={ref}>
      <button className={styles.trigger} onClick={() => setOpen(!open)} aria-expanded={open}>
        {trigger}
      </button>
      {open && (
        <div className={`${styles.menu} ${styles[align]}`}>
          {children}
        </div>
      )}
    </div>
  );
}
