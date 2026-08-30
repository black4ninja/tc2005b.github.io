import { useState, type DragEvent } from 'react';
import PostItHistoria from '../PostItHistoria/PostItHistoria';
import {
  COLUMNAS_SPRINT, agruparPorColumna, sumaPuntos,
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
  const [encima, setEncima] = useState<Columna | null>(null);

  function alSoltar(e: DragEvent<HTMLElement>, columna: Columna) {
    e.preventDefault();
    setEncima(null);
    const id = e.dataTransfer.getData('text/historia');
    if (id && onMover) onMover(id, columna);
  }

  function columna(key: Columna, label: string, conAlta: boolean) {
    const historias = porColumna[key];
    const puntos = sumaPuntos(historias);
    return (
      <section
        key={key}
        className={`${styles.columna} ${encima === key ? styles.columnaDestino : ''}`}
        onDragOver={editable && onMover ? (e) => { e.preventDefault(); setEncima(key); } : undefined}
        onDragLeave={editable && onMover ? () => setEncima(null) : undefined}
        onDrop={editable && onMover ? (e) => alSoltar(e, key) : undefined}
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
            onDragStart={
              editable && onMover
                ? (e, historia) => e.dataTransfer.setData('text/historia', historia.id)
                : undefined
            }
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
    <div className={`${styles.tablero} ${styles[escala]}`}>
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
    </div>
  );
}
