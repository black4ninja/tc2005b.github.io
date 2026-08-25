import { useState, useMemo, useRef, useEffect } from 'react';
import Modal from '../../atoms/Modal/Modal';
import Icon from '../../atoms/Icon/Icon';
import { resumenPregunta } from '../../../../utils/preguntas';
import type { Pregunta } from '../../../../types/preguntas';
import styles from './SelectorPregunta.module.css';

interface SelectorPreguntaProps {
  preguntas: Pregunta[];
  titulo: string;
  onElegir: (pregunta: Pregunta) => void;
  onCerrar: () => void;
}

/**
 * Elegir una pregunta del banco con el teclado y sin ratón: se abre con el
 * cursor puesto, se teclea y se pulsa Enter.
 *
 * Es la pieza que hace viable personalizar con muchos alumnos. Un desplegable
 * normal obliga a leer la lista entera por cada alumno; aquí la lista se filtra
 * por título Y por etiqueta mientras se escribe, así que el gesto completo es
 * tres letras y un Enter.
 */
export default function SelectorPregunta({ preguntas, titulo, onElegir, onCerrar }: SelectorPreguntaProps) {
  const [texto, setTexto] = useState('');
  const [indice, setIndice] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtradas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    if (!q) return preguntas;
    return preguntas.filter(
      (p) => p.etiquetas.some((e) => e.includes(q))
      || (p.competencia?.competencia ?? '').toLowerCase().includes(q)
        || p.texto.toLowerCase().includes(q),
    );
  }, [preguntas, texto]);

  // Al filtrar, la selección vuelve arriba: si no, Enter elegiría una pregunta
  // que ya no está donde el profesor la vio.
  useEffect(() => { setIndice(0); }, [texto]);

  useEffect(() => {
    listaRef.current?.querySelector<HTMLElement>('[data-activo="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [indice]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndice((i) => Math.min(i + 1, filtradas.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndice((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const elegida = filtradas[indice];
      if (elegida) onElegir(elegida);
    }
  }

  return (
    <Modal isOpen onClose={onCerrar} title={titulo} wide>
      <div className={styles.caja} onKeyDown={onKeyDown}>
        <div className={styles.buscadorFila}>
          <Icon name="search" size="sm" />
          <input
            ref={inputRef}
            className={styles.buscador}
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por competencia, etiqueta o contenido…"
          />
        </div>

        {filtradas.length === 0 ? (
          <p className={styles.vacio}>
            Ninguna pregunta coincide. El banco se llena en <strong>Contenidos → la materia → Preguntas</strong>.
          </p>
        ) : (
          <ul className={styles.lista} ref={listaRef}>
            {filtradas.map((p, i) => (
              <li key={p.id}>
                <button
                  className={`${styles.opcion} ${i === indice ? styles.opcionActiva : ''}`}
                  data-activo={i === indice}
                  onMouseEnter={() => setIndice(i)}
                  onClick={() => onElegir(p)}
                >
                  <span className={styles.opcionTitulo}>{resumenPregunta(p.texto)}</span>
                  <span className={styles.opcionMeta}>
                    {/* La competencia primero y con otro tinte: es el eje por
                        el que se elige, las etiquetas solo matizan. */}
                    {p.competencia && (
                      <span className={styles.competencia}>{p.competencia.competencia}</span>
                    )}
                    {p.etiquetas.map((e) => <span key={e} className={styles.chip}>{e}</span>)}
                  </span>
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
