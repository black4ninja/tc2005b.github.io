import { useState, useMemo, useRef, useEffect } from 'react';
import Modal from '../../atoms/Modal/Modal';
import Icon from '../../atoms/Icon/Icon';
import type { AlumnoConPregunta } from '../../../../types/preguntas';
import styles from './SelectorAlumno.module.css';

interface SelectorAlumnoProps {
  alumnos: AlumnoConPregunta[];
  titulo: string;
  /** Quiénes ya agotaron sus intentos en esa competencia: no se les puede añadir. */
  sinHuecos?: Set<string>;
  onElegir: (alumno: AlumnoConPregunta) => void;
  onCerrar: () => void;
}

/**
 * Elegir alumno con el teclado, el reflejo del selector de preguntas.
 *
 * Existe para el camino inverso: el profesor lee una pregunta entera y decide a
 * quién le va. A quien ya agotó sus intentos en esa competencia se le apaga en
 * vez de esconderlo: hay que verlo para entender por qué no está disponible, y
 * el camino para cambiárselo es quitarle una desde su fila.
 */
export default function SelectorAlumno({
  alumnos, titulo, sinHuecos = new Set(), onElegir, onCerrar,
}: SelectorAlumnoProps) {
  const [texto, setTexto] = useState('');
  const [indice, setIndice] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase();
    if (!q) return alumnos;
    return alumnos.filter(
      (a) => a.name.toLowerCase().includes(q) || a.matricula.toLowerCase().includes(q),
    );
  }, [alumnos, texto]);

  useEffect(() => { setIndice(0); }, [texto]);

  useEffect(() => {
    listaRef.current?.querySelector<HTMLElement>('[data-activo="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [indice]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndice((i) => Math.min(i + 1, filtrados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndice((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const elegido = filtrados[indice];
      if (elegido && !sinHuecos.has(elegido.id)) onElegir(elegido);
    }
  }

  return (
    <Modal isOpen onClose={onCerrar} title={titulo}>
      <div className={styles.caja} onKeyDown={onKeyDown}>
        <div className={styles.buscadorFila}>
          <Icon name="search" size="sm" />
          <input
            ref={inputRef}
            className={styles.buscador}
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por nombre o matrícula…"
          />
        </div>

        {filtrados.length === 0 ? (
          <p className={styles.vacio}>Ningún alumno coincide.</p>
        ) : (
          <ul className={styles.lista} ref={listaRef}>
            {filtrados.map((a, i) => {
              const lleno = sinHuecos.has(a.id);
              return (
                <li key={a.id}>
                  <button
                    className={`${styles.opcion} ${i === indice ? styles.opcionActiva : ''} ${lleno ? styles.opcionApagada : ''}`}
                    data-activo={i === indice}
                    disabled={lleno}
                    onMouseEnter={() => setIndice(i)}
                    onClick={() => onElegir(a)}
                    title={lleno ? 'Ya tiene todos sus intentos en esta competencia' : undefined}
                  >
                    <span className={styles.nombre}>{a.name}</span>
                    <span className={styles.matricula}>{a.matricula}</span>
                    {lleno && <span className={styles.sinHueco}>sin intentos libres</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className={styles.atajos}>↑ ↓ para moverte · Enter para elegir · Esc para cerrar</p>
      </div>
    </Modal>
  );
}
