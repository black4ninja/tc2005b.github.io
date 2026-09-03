import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../atoms/Icon/Icon';
import { useClickOutside } from '../../../../hooks/useClickOutside';
import styles from './SaltoProyeccion.module.css';

export interface Saltable {
  id: string;
  nombre: string;
  /** Lo que distingue dos filas del mismo alumno: su hora, o su competencia. */
  pista: string;
}

interface Props {
  opciones: Saltable[];
  /** Dónde está la proyección ahora, o -1 si no es de esta lista. */
  indice: number;
  deshabilitado: boolean;
  onElegir: (indice: number) => void;
}

/**
 * Saltar a cualquiera de la fila, desde el mando de la proyección.
 *
 * Era un `<select>`, y con cuarenta alumnos eso es una lista nativa que hay que
 * recorrer a ojo: no se puede escribir para filtrar, y en algunos navegadores
 * ni siquiera cabe en pantalla. Aquí se teclea y la lista se reduce, que es lo
 * que se hace cuando alguien pide su turno y hay que encontrarlo ya.
 *
 * Se abre sobre el mando y no en un modal: el mando se usa con la clase
 * delante, y tapar la pantalla entera para elegir un nombre es demasiado gesto.
 */
export default function SaltoProyeccion({ opciones, indice, deshabilitado, onElegir }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [resaltado, setResaltado] = useState(0);
  const buscador = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const caja = useClickOutside<HTMLDivElement>(() => setAbierto(false));

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase();
    const con = opciones.map((o, i) => ({ ...o, i }));
    if (!q) return con;
    return con.filter((o) => `${o.nombre} ${o.pista}`.toLowerCase().includes(q));
  }, [opciones, texto]);

  useEffect(() => {
    if (!abierto) return;
    setTexto('');
    // Al abrir, el cursor ya está en el buscador: se llega escribiendo, no
    // apuntando.
    buscador.current?.focus();
  }, [abierto]);

  useEffect(() => { setResaltado(0); }, [texto]);

  useEffect(() => {
    lista.current?.querySelector<HTMLElement>('[data-activo="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [resaltado, abierto]);

  const actual = indice >= 0 ? opciones[indice] : null;

  function elegir(i: number) {
    onElegir(i);
    setAbierto(false);
  }

  function alTeclear(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setResaltado((n) => Math.min(n + 1, filtrados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setResaltado((n) => Math.max(n - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const elegido = filtrados[resaltado];
      if (elegido) elegir(elegido.i);
    } else if (e.key === 'Escape') {
      setAbierto(false);
    }
  }

  return (
    <div className={styles.caja} ref={caja}>
      <button
        type="button"
        className={styles.disparador}
        disabled={deshabilitado || opciones.length === 0}
        onClick={() => setAbierto((v) => !v)}
        title="Saltar a cualquiera de la lista"
        aria-expanded={abierto}
      >
        <span className={styles.actual}>
          {actual ? `${actual.pista} · ${actual.nombre}` : 'Elige a quién proyectar…'}
        </span>
        <Icon name="expand_more" size="sm" />
      </button>

      {abierto && (
        <div className={styles.panel} onKeyDown={alTeclear}>
          <div className={styles.buscadorFila}>
            <Icon name="search" size="sm" />
            <input
              ref={buscador}
              className={styles.buscador}
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar por nombre…"
            />
            {texto && (
              <span className={styles.cuenta}>{filtrados.length} de {opciones.length}</span>
            )}
          </div>

          {filtrados.length === 0 ? (
            <p className={styles.vacio}>Nadie coincide.</p>
          ) : (
            <ul className={styles.lista} ref={lista}>
              {filtrados.map((o, n) => (
                <li key={o.id}>
                  <button
                    type="button"
                    className={`${styles.opcion} ${n === resaltado ? styles.opcionResaltada : ''} ${o.i === indice ? styles.opcionActual : ''}`}
                    data-activo={n === resaltado}
                    onMouseEnter={() => setResaltado(n)}
                    onClick={() => elegir(o.i)}
                  >
                    <span className={styles.pista}>{o.pista}</span>
                    <span className={styles.nombre}>{o.nombre}</span>
                    {o.i === indice && <Icon name="cast" size="sm" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
