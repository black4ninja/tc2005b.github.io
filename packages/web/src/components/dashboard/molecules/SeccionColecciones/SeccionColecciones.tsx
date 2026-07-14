import { useState } from 'react';
import { NavLink } from 'react-router';
import Icon from '../../atoms/Icon/Icon';
import styles from './SeccionColecciones.module.css';

/** Una colección dentro de una sección del menú del grupo. */
export interface EnlaceColeccion {
  key: string;
  /** Etiqueta dentro del submenú: la clave de la colección ("TC2005B"). */
  label: string;
  href: string;
  /** Abre en pestaña nueva (el visor). Los enlaces del admin, no. */
  externo?: boolean;
}

interface SeccionColeccionesProps {
  /** "Contenido", "Páginas", "Competencias", "Actividades". */
  titulo: string;
  icono: string;
  items: EnlaceColeccion[];
  collapsed?: boolean;
  /** Si el submenú arranca abierto. Por defecto colapsado. */
  defaultOpen?: boolean;
}

/**
 * Una sección del menú del grupo: la MISMA acción para cada colección asignada
 * ("Páginas" → TC2005B, TC2007B, TC2008B).
 *
 * El menú se agrupa por ACCIÓN y no por colección porque con 3 colecciones lo
 * segundo daba una lista plana de 12 entradas. Así son 4 secciones, y abres solo
 * la que buscas.
 *
 * Con UNA sola colección el submenú sobra —sería un desplegable de un elemento—:
 * la sección se aplana a un enlace directo con el nombre de la acción. Que es el
 * caso normal: la mayoría de los grupos tienen una materia.
 */
export default function SeccionColecciones({
  titulo,
  icono,
  items,
  collapsed,
  defaultOpen = false,
}: SeccionColeccionesProps) {
  const [open, setOpen] = useState(defaultOpen);

  const contenido = (label: string) => (
    <>
      <Icon name={icono} size="sm" />
      {!collapsed && <span className={styles.headerLabel}>{label}</span>}
    </>
  );

  // Una sola colección: enlace directo, sin desplegable.
  if (items.length === 1) {
    const unico = items[0];
    const clase = `${styles.header} ${collapsed ? styles.collapsed : ''}`;
    return unico.externo ? (
      <a
        href={unico.href}
        target="_blank"
        rel="noopener noreferrer"
        className={clase}
        title={titulo}
      >
        {contenido(titulo)}
      </a>
    ) : (
      <NavLink
        to={unico.href}
        className={({ isActive }) => `${clase} ${isActive ? styles.headerActive : ''}`}
        title={titulo}
      >
        {contenido(titulo)}
      </NavLink>
    );
  }

  // Rail colapsado: solo el icono como afordancia (sin submenú expandible).
  if (collapsed) {
    return (
      <div className={`${styles.header} ${styles.collapsed}`} title={titulo}>
        <Icon name={icono} size="sm" />
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
        <Icon name={icono} size="sm" />
        <span className={styles.headerLabel}>{titulo}</span>
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
