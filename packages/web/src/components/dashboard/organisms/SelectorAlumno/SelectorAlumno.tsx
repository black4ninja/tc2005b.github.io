import { useState, useMemo, useRef, useEffect } from 'react';
import Modal from '../../atoms/Modal/Modal';
import Icon from '../../atoms/Icon/Icon';
import type { AlumnoConPregunta } from '../../../../types/preguntas';
import styles from './SelectorAlumno.module.css';

interface SelectorAlumnoProps {
  alumnos: AlumnoConPregunta[];
  titulo: string;
  /** Quiénes ya tienen una pregunta de esa competencia: se les sustituiría. */
  yaTienen?: Set<string>;
  onElegir: (alumno: AlumnoConPregunta) => void;
  onCerrar: () => void;
}

/**
 * Elegir alumno con el teclado, el reflejo del selector de preguntas.
 *
 * Existe para el camino inverso: el profesor lee una pregunta entera y decide a
 * quién le va. A quien ya tenga una de esa competencia no se le esconde —a veces
 * cambiársela es justo lo que se busca—, se le marca para que la sustitución no
 * ocurra a ciegas.
 */
export default function SelectorAlumno({
  alumnos, titulo, yaTienen = new Set(), onElegir, onCerrar,
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
      if (elegido) onElegir(elegido);
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
            {filtrados.map((a, i) => (
              <li key={a.id}>
                <button
                  className={`${styles.opcion} ${i === indice ? styles.opcionActiva : ''}`}
                  data-activo={i === indice}
                  onMouseEnter={() => setIndice(i)}
                  onClick={() => onElegir(a)}
                >
                  <span className={styles.nombre}>{a.name}</span>
                  <span className={styles.matricula}>{a.matricula}</span>
                  {yaTienen.has(a.id) && (
                    <span className={styles.sustituye} title="Se le cambia la que ya tenía de esta competencia">
                      sustituye
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.atajos}>↑ ↓ para moverte · Enter para elegir · Esc para cerrar</p>
      </div>
    </Modal>
  );
}
