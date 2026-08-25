import { useState, useMemo, useRef, useEffect } from 'react';
import Modal from '../../atoms/Modal/Modal';
import Icon from '../../atoms/Icon/Icon';
import type { CompetenciaEnBanco, Pregunta } from '../../../../types/preguntas';
import styles from './SelectorPregunta.module.css';

interface SelectorPreguntaProps {
  preguntas: Pregunta[];
  titulo: string;
  /** Píldoras de competencia; vacío = no se ofrece el filtro. */
  competencias?: CompetenciaEnBanco[];
  /** Competencia con la que abrir el filtro (el hueco que se está llenando). */
  competenciaInicial?: string | null;
  /**
   * Preguntas que ESTE alumno ya tiene en la misma competencia (el otro
   * intento). Se marcan pero no se bloquean: repetirle la misma no evalúa nada,
   * pero la decisión sigue siendo del profesor.
   */
  yaDelAlumno?: Set<string>;
  onElegir: (pregunta: Pregunta) => void;
  onCerrar: () => void;
}

/**
 * Elegir una pregunta del banco.
 *
 * Se abre con el cursor puesto y responde al teclado, pero la lista muestra el
 * enunciado ENTERO y no un recorte: para decidir si una pregunta le va a un
 * alumno hay que leerla, y con el recorte había que abrir el banco en otra
 * pestaña para saber cuál era cuál.
 *
 * Las tomadas se listan igualmente, apagadas y diciendo de quién son. Ocultarlas
 * dejaría al profesor buscando una pregunta que él recuerda haber visto sin
 * ninguna pista de por qué ya no está.
 */
export default function SelectorPregunta({
  preguntas, titulo, competencias = [], competenciaInicial = null,
  yaDelAlumno = new Set(), onElegir, onCerrar,
}: SelectorPreguntaProps) {
  const [texto, setTexto] = useState('');
  const [competencia, setCompetencia] = useState<string | null>(competenciaInicial);
  const [indice, setIndice] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtradas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return preguntas.filter((p) => {
      if (competencia && (p.competenciaId ?? 'sin-competencia') !== competencia) return false;
      if (!q) return true;
      return p.texto.toLowerCase().includes(q)
        || p.etiquetas.some((e) => e.includes(q))
        || (p.competencia?.competencia ?? '').toLowerCase().includes(q);
    });
  }, [preguntas, texto, competencia]);

  // Al filtrar, la selección vuelve arriba: si no, Enter elegiría una pregunta
  // que ya no está donde el profesor la vio.
  useEffect(() => { setIndice(0); }, [texto, competencia]);

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

  const sinUsar = filtradas.filter((p) => !p.uso).length;

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

        {competencias.length > 1 && (
          <div className={styles.chips}>
            <button
              className={`${styles.filtroChip} ${competencia === null ? styles.filtroChipActivo : ''}`}
              onClick={() => setCompetencia(null)}
            >
              todas
            </button>
            {competencias.map((c) => (
              <button
                key={c.id}
                className={`${styles.filtroChip} ${competencia === c.id ? styles.filtroChipActivo : ''}`}
                onClick={() => setCompetencia(competencia === c.id ? null : c.id)}
              >
                {c.nombre} <span className={styles.contadorChip}>{c.total}</span>
              </button>
            ))}
          </div>
        )}

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
                  <span className={styles.opcionMeta}>
                    {/* La competencia primero y con otro tinte: es el eje por
                        el que se elige, las etiquetas solo matizan. */}
                    {p.competencia && (
                      <span className={styles.competencia}>{p.competencia.competencia}</span>
                    )}
                    {p.etiquetas.map((e) => <span key={e} className={styles.chip}>{e}</span>)}
                    {yaDelAlumno.has(p.id) && (
                      <span className={styles.mismoAlumno}>
                        <Icon name="replay" size="sm" />
                        ya se la pusiste a este alumno
                      </span>
                    )}
                    {p.uso && (
                      <span className={styles.tomada} title={p.uso.quienes.join('\n')}>
                        <Icon name="history" size="sm" />
                        ya en {p.uso.veces}
                      </span>
                    )}
                  </span>
                  <span className={styles.opcionTexto}>{p.texto}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className={styles.atajos}>
          ↑ ↓ para moverte · Enter para elegir · Esc para cerrar
          <span className={styles.libres}>{sinUsar} sin usar de {filtradas.length}</span>
        </p>
      </div>
    </Modal>
  );
}
