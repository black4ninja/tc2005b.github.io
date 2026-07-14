import { useState } from 'react';
import { NavLink } from 'react-router';
import Icon from '../../atoms/Icon/Icon';
import styles from './DocusMenu.module.css';

/**
 * Una entrada del submenú "Contenidos" del grupo.
 *
 * Cada colección asignada al grupo aporta varias: su documentación (el visor,
 * externo) y sus Páginas y Competencias (pantallas del admin, internas). La
 * etiqueta va prefijada con la clave —"TC2005B — Páginas"— porque con más de una
 * colección, "Páginas" a secas no dice de cuál.
 */
export interface DocusLink {
  /** Clave única del ítem: varias entradas comparten el slug de la colección. */
  key: string;
  label: string;
  href: string;
  /** Abre en pestaña nueva (el visor). Los enlaces del admin, no. */
  externo?: boolean;
  icono?: string;
}

interface DocusMenuProps {
  items: DocusLink[];
  collapsed?: boolean;
  /** Si el submenú arranca abierto. Por defecto colapsado. */
  defaultOpen?: boolean;
}

/**
 * Ítem "Contenidos" del sidebar con submenú colapsable (colapsado por defecto).
 */
export default function DocusMenu({ items, collapsed, defaultOpen = false }: DocusMenuProps) {
  const [open, setOpen] = useState(defaultOpen);

  // Rail colapsado: solo el icono como afordancia (sin submenú expandible).
  if (collapsed) {
    return (
      <div className={`${styles.header} ${styles.collapsed}`} title="Contenidos">
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
        <span className={styles.headerLabel}>Contenidos</span>
        <Icon name={open ? 'expand_less' : 'expand_more'} size="sm" />
      </button>
      {open && (
        <div className={styles.list}>
          {items.length === 0 ? (
            <span className={styles.hint}>Sin contenidos asignados</span>
          ) : (
            items.map((it) =>
              it.externo ? (
                <a
                  key={it.key}
                  href={it.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                  title={it.label}
                >
                  {it.icono && <Icon name={it.icono} size="sm" />}
                  <span className={styles.linkLabel}>{it.label}</span>
                </a>
              ) : (
                // Enlaces del admin: navegación interna, sin pestaña nueva.
                <NavLink
                  key={it.key}
                  to={it.href}
                  className={({ isActive }) => `${styles.link} ${isActive ? styles.linkActive : ''}`}
                  title={it.label}
                >
                  {it.icono && <Icon name={it.icono} size="sm" />}
                  <span className={styles.linkLabel}>{it.label}</span>
                </NavLink>
              ),
            )
          )}
        </div>
      )}
    </div>
  );
}
