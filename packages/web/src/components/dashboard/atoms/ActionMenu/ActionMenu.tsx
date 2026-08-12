import { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './ActionMenu.module.css';

export interface ActionItem {
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface ActionMenuProps {
  actions: ActionItem[];
  /** Para el `aria-label` del disparador: "Acciones de AgoDic26 TC2008B 101". */
  etiqueta?: string;
}

/**
 * Acciones de una fila detrás de un botón ⋮.
 *
 * El desplegable se pinta en un PORTAL con posición fija, no dentro de la celda:
 * la tabla vive en un contenedor con `overflow-x: auto` para poder desplazarse,
 * y ahí dentro un menú absoluto se recorta por el borde. Es el mismo patrón que
 * ya usa el menú de "Columnas" de la tabla.
 *
 * Como está fuera del flujo, hay que reponer a mano lo que se pierde: cerrar al
 * hacer clic fuera —comprobando el botón Y el menú, que están en árboles
 * distintos—, cerrar con Escape devolviendo el foco, y recolocarlo mientras se
 * hace scroll para que no se quede flotando lejos de su fila.
 */
export default function ActionMenu({ actions, etiqueta }: ActionMenuProps) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;

    function alClicFuera(e: MouseEvent) {
      const destino = e.target as Node;
      if (boton.current?.contains(destino) || menu.current?.contains(destino)) return;
      setAbierto(false);
    }
    function alTeclear(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setAbierto(false);
      boton.current?.focus();
    }

    document.addEventListener('mousedown', alClicFuera);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alClicFuera);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  // `useLayoutEffect` y no `useEffect`: colocarlo después de pintar lo enseña un
  // fotograma en la esquina y da un salto visible.
  useLayoutEffect(() => {
    if (!abierto) {
      setPos(null);
      return;
    }
    function recolocar() {
      const rect = boton.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    recolocar();
    // `capture: true` para enterarse del scroll de CUALQUIER ancestro, incluido
    // el de la propia tabla, que no burbujea.
    window.addEventListener('scroll', recolocar, true);
    window.addEventListener('resize', recolocar);
    return () => {
      window.removeEventListener('scroll', recolocar, true);
      window.removeEventListener('resize', recolocar);
    };
  }, [abierto]);

  return (
    <>
      <button
        ref={boton}
        type="button"
        className={styles.disparador}
        onClick={() => setAbierto((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={etiqueta ? `Acciones de ${etiqueta}` : 'Acciones'}
        title="Acciones"
      >
        <span className="material-icons" aria-hidden="true">more_vert</span>
      </button>

      {abierto &&
        pos &&
        createPortal(
          <div
            ref={menu}
            className={styles.menu}
            role="menu"
            style={{ top: pos.top, right: pos.right }}
          >
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                className={`${styles.item} ${action.variant === 'danger' ? styles.itemPeligro : ''}`}
                onClick={() => {
                  setAbierto(false);
                  action.onClick();
                }}
              >
                {action.icon && (
                  <span className="material-icons" aria-hidden="true">{action.icon}</span>
                )}
                {action.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
