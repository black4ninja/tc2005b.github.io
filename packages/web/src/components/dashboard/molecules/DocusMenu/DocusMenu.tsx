import { useState } from 'react';
import Icon from '../../atoms/Icon/Icon';
import styles from './DocusMenu.module.css';

/**
 * Una documentación habilitada para el grupo: destino + etiqueta
 * "CLAVE — Nombre" (Docusaurus /docs/<slug>/ o colección /contenidos/<slug>/).
 */
export interface DocusLink {
  slug: string;
  label: string;
  href: string;
}

interface DocusMenuProps {
  items: DocusLink[];
  collapsed?: boolean;
  /** Si el submenú arranca abierto. Por defecto colapsado. */
  defaultOpen?: boolean;
}

/**
 * Ítem "Docusaurus" del sidebar con submenú colapsable (colapsado por
 * defecto) que lista la documentación habilitada del grupo (Docusaurus y
 * colecciones del CMS). Abre en pestaña nueva; etiqueta a una sola línea.
 */
export default function DocusMenu({ items, collapsed, defaultOpen = false }: DocusMenuProps) {
  const [open, setOpen] = useState(defaultOpen);

  // Rail colapsado: solo el icono como afordancia (sin submenú expandible).
  if (collapsed) {
    return (
      <div className={`${styles.header} ${styles.collapsed}`} title="Docusaurus">
        <Icon name="menu_book" size="sm" />
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Icon name="menu_book" size="sm" />
        <span className={styles.headerLabel}>Docusaurus</span>
        <Icon name={open ? 'expand_less' : 'expand_more'} size="sm" />
      </button>
      {open && (
        <div className={styles.list}>
          {items.length === 0 ? (
            <span className={styles.hint}>Sin Docusaurus asignados</span>
          ) : (
            items.map((it) => (
              <a
                key={it.slug}
                href={it.href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
                title={it.label}
              >
                {it.label}
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
