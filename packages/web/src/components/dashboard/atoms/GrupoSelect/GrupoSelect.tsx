import { useEffect, useId, useRef, useState } from 'react';
import NombreGrupo, { type CategoriaRef } from '../NombreGrupo/NombreGrupo';
import styles from './GrupoSelect.module.css';

export interface GrupoOpcion {
  id: string;
  name: string;
  categoria?: CategoriaRef | null;
}

interface GrupoSelectProps {
  grupos: GrupoOpcion[];
  valor: string;
  onCambiar: (grupoId: string) => void;
  /** Con un solo grupo se muestra igual, pero sin desplegable. */
  disabled?: boolean;
  /** Texto del `aria-label`; el control no lleva etiqueta visible. */
  etiqueta?: string;
  title?: string;
}

/**
 * Selector de grupo con color y sección destacada.
 *
 * Es un listbox propio y no un `<select>`: dentro de un `<option>` no se puede
 * pintar de forma fiable ni el punto de color ni la insignia de la sección —los
 * navegadores ignoran casi todo el estilo ahí—, y esas dos señales son justo el
 * motivo del cambio.
 *
 * A cambio hay que reponer a mano lo que el nativo daba gratis: cerrar al
 * hacer clic fuera, cerrar con Escape y devolver el foco al botón. El teclado
 * queda cubierto por el patrón de botón + lista: Tab entra, Enter/Espacio abre,
 * y las opciones son botones enfocables.
 */
export default function GrupoSelect({
  grupos,
  valor,
  onCambiar,
  disabled = false,
  etiqueta = 'Grupo',
  title,
}: GrupoSelectProps) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const listaId = useId();

  const seleccionado = grupos.find((g) => g.id === valor) ?? grupos[0];
  const bloqueado = disabled || grupos.length <= 1;

  useEffect(() => {
    if (!abierto) return;

    function alClicFuera(e: MouseEvent) {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    }
    function alTeclear(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setAbierto(false);
      // Sin esto el foco se queda en el limbo del documento y el siguiente Tab
      // arranca desde el principio de la página.
      boton.current?.focus();
    }

    document.addEventListener('mousedown', alClicFuera);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alClicFuera);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  function elegir(grupoId: string) {
    setAbierto(false);
    boton.current?.focus();
    if (grupoId !== valor) onCambiar(grupoId);
  }

  return (
    <div className={styles.contenedor} ref={contenedor}>
      <button
        ref={boton}
        type="button"
        className={styles.disparador}
        onClick={() => !bloqueado && setAbierto((a) => !a)}
        disabled={bloqueado}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? listaId : undefined}
        aria-label={etiqueta}
        title={title}
      >
        <NombreGrupo nombre={seleccionado?.name ?? ''} categoria={seleccionado?.categoria} />
        {!bloqueado && <span className={`material-icons ${styles.flecha}`} aria-hidden="true">expand_more</span>}
      </button>

      {abierto && (
        <ul className={styles.lista} id={listaId} role="listbox" aria-label={etiqueta}>
          {grupos.map((grupo) => (
            <li key={grupo.id} role="none">
              <button
                type="button"
                role="option"
                aria-selected={grupo.id === valor}
                className={`${styles.opcion} ${grupo.id === valor ? styles.opcionActiva : ''}`}
                onClick={() => elegir(grupo.id)}
              >
                <NombreGrupo nombre={grupo.name} categoria={grupo.categoria} mostrarCategoria />
                {grupo.id === valor && <span className={`material-icons ${styles.palomita}`} aria-hidden="true">check</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
