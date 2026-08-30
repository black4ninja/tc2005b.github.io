import { useCallback, useRef } from 'react';
import PostItHistoria from '../PostItHistoria/PostItHistoria';
import { useArrastre } from '../../../../hooks/useArrastre';
import {
  COLUMNAS, COLUMNAS_SPRINT, agruparPorColumna, sumaPuntos,
  type Columna, type Escala, type EquipoTablero, type Historia,
} from '../../../../utils/scrum';
import styles from './TableroScrum.module.css';

interface Props {
  equipo: EquipoTablero;
  escala?: Escala;
  /** Sin esto el tablero es de lectura: es como lo ve la proyección. */
  editable?: boolean;
  onNuevaHistoria?: () => void;
  onAbrirHistoria?: (historia: Historia) => void;
  onMover?: (historiaId: string, columna: Columna) => void;
  onEditarObjetivo?: () => void;
}

const CLAVES = new Set<string>(COLUMNAS.map((c) => c.key));

/**
 * El tablero de un equipo.
 *
 * La forma es la enseñanza: `backlog` queda FUERA del recuadro punteado y las
 * otras cuatro dentro. Ese recuadro es el sprint backlog —a lo que el equipo se
 * comprometió— y lleva el objetivo del sprint dentro, no encima, porque el
 * objetivo es lo que da sentido a que esas tarjetas y no otras estén ahí.
 *
 * El mismo componente sirve para el tablero del alumno y para cada panel de la
 * proyección; lo único que cambia es la escala y si acepta que le toquen algo.
 */
export default function TableroScrum({
  equipo,
  escala = 'full',
  editable = false,
  onNuevaHistoria,
  onAbrirHistoria,
  onMover,
  onEditarObjetivo,
}: Props) {
  const porColumna = agruparPorColumna(equipo.historias);
  const tablero = useRef<HTMLDivElement>(null);

  const soltar = useCallback(
    (historia: Historia, zona: string) => {
      // La zona viene de un `data-zona` del DOM, así que se comprueba: entre
      // las columnas hay otros elementos con atributos y no todos son destinos.
      if (CLAVES.has(zona) && zona !== historia.columna) onMover?.(historia.id, zona as Columna);
    },
    [onMover],
  );

  const seMueve = editable && !!onMover;
  const { iniciar, arrastrando, posicion, zona } = useArrastre<Historia>({
    alSoltar: soltar,
    contenedor: tablero,
  });

  function columna(key: Columna, label: string, conAlta: boolean) {
    const historias = porColumna[key];
    const puntos = sumaPuntos(historias);
    const destino = !!arrastrando && zona === key && key !== arrastrando.columna;
    return (
      <section
        key={key}
        data-zona={key}
        className={`${styles.columna} ${destino ? styles.columnaDestino : ''}`}
      >
        <header className={styles.columnaCabecera}>
          <span className={styles.columnaTitulo}>{label}</span>
          <span className={styles.contador}>
            {historias.length}
            {puntos > 0 && escala === 'full' && (
              <span className={styles.puntosCol}>{`· ${puntos} pts`}</span>
            )}
          </span>
        </header>

        {historias.map((h) => (
          <PostItHistoria
            key={h.id}
            historia={h}
            escala={escala}
            onAbrir={editable && onAbrirHistoria ? onAbrirHistoria : undefined}
            onPointerDown={seMueve ? iniciar(h) : undefined}
            atenuada={arrastrando?.id === h.id}
          />
        ))}

        {/* El alta va SOLO en Backlog: las historias nacen ahí y de ahí se
            mueven. Meterlas directamente en «doing» es el hábito contra el que
            existe el sprint backlog. */}
        {conAlta && editable && onNuevaHistoria && (
          <button type="button" className={styles.alta} onClick={onNuevaHistoria}>
            <span className="material-icons">add</span>
            Nueva historia
          </button>
        )}
      </section>
    );
  }

  return (
    <div
      ref={tablero}
      className={`${styles.tablero} ${styles[escala]} ${arrastrando ? styles.enArrastre : ''}`}
    >
      {columna('backlog', 'Backlog', true)}

      <div className={styles.sprint}>
        <span className={styles.leyenda}>Sprint backlog</span>

        <div className={styles.objetivo}>
          <span className={styles.objetivoEtiqueta}>Objetivo del sprint</span>
          <span className={equipo.objetivo ? styles.objetivoTexto : styles.objetivoVacio}>
            {equipo.objetivo || 'Sin definir'}
          </span>
          {editable && onEditarObjetivo && (
            <button
              type="button"
              className={styles.objetivoBtn}
              onClick={onEditarObjetivo}
              title="Editar el objetivo del sprint"
            >
              <span className="material-icons">edit</span>
            </button>
          )}
        </div>

        <div className={styles.columnas}>
          {COLUMNAS_SPRINT.map((c) => columna(c.key, c.label, false))}
        </div>
      </div>

      {/* La copia que sigue al dedo. Va fuera de la columna —y en `fixed`— para
          que no la recorte, y sin eventos para que se vea qué hay debajo. */}
      {arrastrando && posicion && (
        <div
          className={styles.capaFantasma}
          style={{ transform: `translate(${posicion.x - 116}px, ${posicion.y - 40}px)` }}
        >
          <PostItHistoria historia={arrastrando} escala="full" fantasma />
        </div>
      )}
    </div>
  );
}
