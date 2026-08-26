import { useState, useMemo, useRef, useEffect } from 'react';
import Modal from '../../atoms/Modal/Modal';
import Icon from '../../atoms/Icon/Icon';
import type { AlumnoConPregunta } from '../../../../types/preguntas';
import styles from './SelectorAlumno.module.css';

interface SelectorAlumnoProps {
  alumnos: AlumnoConPregunta[];
  titulo: string;
  /** Línea bajo el título: qué pregunta se está repartiendo y a cuántos va ya. */
  subtitulo?: string;
  /** Quiénes ya tienen ESTA pregunta. Se marcan y volver a pulsarlos la quita. */
  seleccionados?: Set<string>;
  /** Quiénes agotaron sus intentos en esa competencia: no se les puede añadir. */
  sinHuecos?: Set<string>;
  /** Cuántos intentos lleva cada alumno en la competencia de la pregunta. */
  llenosPorAlumno?: Map<string, number>;
  maxIntentos?: number;
  /**
   * Hay un guardado en vuelo: la lista no admite clics hasta que vuelva. Dos
   * altas solapadas calculan su hueco con un estado que el servidor todavía no
   * ha visto, y lo que queda guardado no es lo que se ve.
   */
  guardando?: boolean;
  /**
   * Pulsar un alumno que NO la tiene se la asigna; pulsar uno que ya la tiene se
   * la quita. El modal NO se cierra: la misma pregunta suele ir a varios.
   */
  onAlternar: (alumno: AlumnoConPregunta) => void;
  onCerrar: () => void;
}

/**
 * Repartir UNA pregunta entre los alumnos del grupo.
 *
 * Es el camino inverso al selector de preguntas: el profesor lee el enunciado
 * entero y decide a quién le va. Y como una pregunta puede repetirse cuantas
 * veces haga falta, es una lista de INTERRUPTORES y no un menú de un solo uso:
 * cerrarse al primer clic obligaba a reabrirlo por cada alumno y no dejaba ver
 * quién la tenía ya.
 *
 * A quien agotó sus intentos en esa competencia se le APAGA en vez de
 * esconderlo: hay que verlo para entender por qué no está disponible, y el
 * camino para cambiárselo es quitarle una.
 */
export default function SelectorAlumno({
  alumnos, titulo, subtitulo, seleccionados = new Set(), sinHuecos = new Set(),
  llenosPorAlumno, maxIntentos = 2, guardando = false, onAlternar, onCerrar,
}: SelectorAlumnoProps) {
  const [texto, setTexto] = useState('');
  const [soloLibres, setSoloLibres] = useState(false);
  const [indice, setIndice] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return alumnos.filter((a) => {
      // «Solo a quien le falta» deja ver a los que ya la tienen: si no, quitarla
      // obligaría a apagar el filtro para encontrarlos.
      if (soloLibres && sinHuecos.has(a.id) && !seleccionados.has(a.id)) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.matricula.toLowerCase().includes(q);
    });
  }, [alumnos, texto, soloLibres, sinHuecos, seleccionados]);

  useEffect(() => { setIndice(0); }, [texto, soloLibres]);

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
      if (guardando) return;
      const elegido = filtrados[indice];
      if (elegido && (seleccionados.has(elegido.id) || !sinHuecos.has(elegido.id))) {
        onAlternar(elegido);
      }
    }
  }

  return (
    <Modal isOpen onClose={onCerrar} title={titulo}>
      <div className={styles.caja} onKeyDown={onKeyDown}>
        {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}

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
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={soloLibres}
              onChange={(e) => setSoloLibres(e.target.checked)}
            />
            <span>Solo con hueco</span>
          </label>
        </div>

        {filtrados.length === 0 ? (
          <p className={styles.vacio}>Ningún alumno coincide.</p>
        ) : (
          <ul className={styles.lista} ref={listaRef}>
            {filtrados.map((a, i) => {
              const elegido = seleccionados.has(a.id);
              const lleno = sinHuecos.has(a.id);
              const apagada = guardando || (!elegido && lleno);
              const llevados = llenosPorAlumno?.get(a.id);
              return (
                <li key={a.id}>
                  <button
                    className={`${styles.opcion} ${i === indice ? styles.opcionActiva : ''} ${elegido ? styles.opcionElegida : ''} ${apagada ? styles.opcionApagada : ''}`}
                    data-activo={i === indice}
                    disabled={apagada}
                    onMouseEnter={() => setIndice(i)}
                    onClick={() => onAlternar(a)}
                    title={guardando
                      ? 'Guardando el cambio anterior…'
                      : elegido
                        ? 'Pulsa para quitársela'
                        : lleno
                          ? 'Ya tiene todos sus intentos en esta competencia'
                          : 'Pulsa para asignársela'}
                  >
                    {/* La marca va primero: es lo que contesta a «¿entró o no?»
                        sin tener que cerrar y volver a mirar. */}
                    <span className={`${styles.marca} ${elegido ? styles.marcaOn : ''}`}>
                      <Icon name={elegido ? 'check_circle' : 'add_circle'} size="sm" />
                    </span>
                    <span className={styles.nombre}>{a.name}</span>
                    <span className={styles.matricula}>{a.matricula}</span>
                    {llevados != null && (
                      <span className={`${styles.intentos} ${lleno ? styles.intentosLleno : ''}`}>
                        {llevados}/{maxIntentos}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className={styles.atajos}>
          {guardando ? (
            <span className={styles.guardando}>
              <Icon name="sync" size="sm" /> Guardando…
            </span>
          ) : (
            <>↑ ↓ para moverte · Enter para asignar o quitar · Esc para cerrar</>
          )}
        </p>
      </div>
    </Modal>
  );
}
