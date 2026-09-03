import { useState, useMemo, useRef, useEffect } from 'react';
import Modal from '../../atoms/Modal/Modal';
import Icon from '../../atoms/Icon/Icon';
import TagIntento from '../../atoms/TagIntento/TagIntento';
import type { CompetenciaEnBanco, Pregunta } from '../../../../types/preguntas';
import styles from './SelectorPregunta.module.css';

interface SelectorPreguntaProps {
  preguntas: Pregunta[];
  titulo: string;
  /** Línea bajo el título: a qué hueco va lo que se elija. */
  subtitulo?: string;
  /** Píldoras de competencia; vacío = no se ofrece el filtro. */
  competencias?: CompetenciaEnBanco[];
  /** Competencia con la que abrir el filtro (el hueco que se está llenando). */
  competenciaInicial?: string | null;
  /**
   * Las que este alumno YA tiene en esta competencia, y EN QUÉ INTENTO va cada
   * una. Se marcan con su número y se pueden quitar.
   *
   * Un mapa y no un conjunto porque el número es lo que contesta la pregunta que
   * uno se hace mirando la lista: no «¿le puse esta?», sino «¿esta es la de su
   * primera entrevista o la de la segunda?».
   */
  asignadas?: Map<string, number>;
  /**
   * false = el alumno llegó al tope de intentos. Las ya asignadas se siguen
   * pudiendo quitar; las demás quedan apagadas.
   */
  permiteAgregar?: boolean;
  /**
   * Hay un guardado en vuelo: la lista no admite clics hasta que vuelva. Dos
   * altas solapadas calculan su hueco con un estado que el servidor todavía no
   * ha visto, y lo que queda guardado no es lo que se ve.
   */
  guardando?: boolean;
  /**
   * Elegir una NO seleccionada la asigna; elegir una ya seleccionada la quita.
   * El modal NO se cierra: se ve el cambio en la propia lista y se sigue.
   */
  onAlternar: (pregunta: Pregunta) => void;
  onCerrar: () => void;
}

/**
 * Elegir las preguntas de un alumno en una competencia.
 *
 * Es una lista de INTERRUPTORES y no un menú de un solo uso: cada alumno lleva
 * hasta dos preguntas por competencia, así que cerrar el modal en cuanto se
 * pulsa una obligaba a reabrirlo para poner la segunda, y no dejaba ver si lo
 * que se acababa de pulsar había entrado. Ahora se queda abierto, lo elegido se
 * marca, y volver a pulsarlo lo quita.
 *
 * La lista muestra el enunciado ENTERO y no un recorte: para decidir si una
 * pregunta le va a un alumno hay que leerla.
 *
 * Al llegar al tope de intentos las no elegidas se APAGAN en vez de sustituir a
 * una en silencio: pulsar y que cambie otra cosa sin avisar es peor que no poder
 * pulsar. Quitar una sigue disponible, que es el camino para cambiarla.
 */
export default function SelectorPregunta({
  preguntas, titulo, subtitulo, competencias = [], competenciaInicial = null,
  asignadas = new Map(), permiteAgregar = true, guardando = false, onAlternar, onCerrar,
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
      if (guardando) return;
      if (elegida && (asignadas.has(elegida.id) || permiteAgregar)) onAlternar(elegida);
    }
  }

  const sinUsar = filtradas.filter((p) => !p.uso).length;

  return (
    <Modal isOpen onClose={onCerrar} title={titulo} wide>
      <div className={styles.caja} onKeyDown={onKeyDown}>
        {subtitulo && (
          <p className={`${styles.subtitulo} ${permiteAgregar ? '' : styles.subtituloTope}`}>
            {!permiteAgregar && <Icon name="info" size="sm" />}
            {subtitulo}
          </p>
        )}

        <div className={styles.buscadorFila}>
          <Icon name="search" size="sm" />
          <input
            ref={inputRef}
            className={styles.buscador}
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por competencia o contenido…"
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
            {filtradas.map((p, i) => {
              const intento = asignadas.get(p.id);
              const elegida = intento !== undefined;
              const apagada = guardando || (!elegida && !permiteAgregar);
              return (
                <li key={p.id}>
                  <button
                    className={`${styles.opcion} ${i === indice ? styles.opcionActiva : ''} ${elegida ? styles.opcionElegida : ''} ${apagada ? styles.opcionApagada : ''}`}
                    data-activo={i === indice}
                    disabled={apagada}
                    onMouseEnter={() => setIndice(i)}
                    onClick={() => onAlternar(p)}
                    title={guardando
                      ? 'Guardando el cambio anterior…'
                      : elegida
                        ? 'Pulsa para quitársela'
                        : apagada
                          ? 'Ya tiene todos sus intentos: quita una para poner esta'
                          : 'Pulsa para asignársela'}
                  >
                    <span className={styles.opcionMeta}>
                      {/* La marca de elegida va primero: es lo que contesta a
                          «¿entró o no?» sin tener que cerrar y volver a mirar. */}
                      {/* Con dos intentos por competencia, «asignada» a secas
                          no dice cuál de las dos es: el número —y su color— es
                          lo que se viene a mirar. */}
                      {elegida && <TagIntento intento={intento} icono="check_circle" />}
                      {p.competencia && (
                        <span className={styles.competencia}>{p.competencia.competencia}</span>
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
          <span className={styles.libres}>{sinUsar} sin usar de {filtradas.length}</span>
        </p>
      </div>
    </Modal>
  );
}
