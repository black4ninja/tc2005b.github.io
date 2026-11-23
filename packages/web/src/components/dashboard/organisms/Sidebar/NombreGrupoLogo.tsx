import { useLayoutEffect, useRef, useState } from 'react';
import styles from './Sidebar.module.css';

/**
 * Nombre del grupo en el lugar del logo, para el alumno con un solo grupo.
 *
 * Va en una sola línea al tamaño del logo mientras quepa. Si no cabe, baja de
 * tamaño y se parte en dos líneas, siempre dentro de la misma altura que tenía
 * el logo: la cabecera del sidebar no cambia de alto según el nombre del grupo.
 * Más de dos líneas se recorta con puntos suspensivos y el nombre completo
 * queda en el `title`.
 *
 * Se mide una sola vez, al montar: quien lo usa le pone `key={nombre}`, así
 * que un nombre nuevo vuelve a empezar en una línea y se mide de cero.
 */
export default function NombreGrupoLogo({ nombre }: { nombre: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [compacto, setCompacto] = useState(false);

  useLayoutEffect(() => {
    // Se mide en una línea y al tamaño grande; solo así se sabe si cabe.
    const medir = () => {
      const el = ref.current;
      if (el && el.scrollWidth > el.clientWidth) setCompacto(true);
    };
    medir();
    // Con la fuente aún cargando, la medida de arriba es con la de respaldo.
    document.fonts?.ready.then(medir).catch(() => {});
  }, []);

  return (
    <span
      ref={ref}
      className={`${styles.logoGrupo} ${compacto ? styles.logoGrupoCompacto : ''}`}
      title={nombre}
    >
      {nombre}
    </span>
  );
}
