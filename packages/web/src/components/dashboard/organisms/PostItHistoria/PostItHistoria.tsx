import type { PointerEvent } from 'react';
import { iniciales, type Escala, type Historia } from '../../../../utils/scrum';
import styles from './PostItHistoria.module.css';

interface Props {
  historia: Historia;
  /** `full` en el tablero, `md` y `sm` según cuántos equipos se proyecten. */
  escala?: Escala;
  /** Sin esto la tarjeta es solo lectura: es lo que ve la proyección. */
  onAbrir?: (historia: Historia) => void;
  /** Arranca el arrastre (dedo, ratón o lápiz). Ver `useArrastre`. */
  onPointerDown?: (e: PointerEvent<HTMLElement>) => void;
  /** La está arrastrando: se apaga y el fantasma es el que sigue al dedo. */
  atenuada?: boolean;
  /** Copia que va pegada al puntero mientras se arrastra. */
  fantasma?: boolean;
}

/**
 * Una historia de usuario como post-it.
 *
 * En el tablero se ve SOLO el «qué», con su rótulo. El «por qué» y el «cómo» se
 * escriben y se leen al abrir la historia: con los tres campos, la tarjeta
 * crecía tanto que en una columna cabían dos y el tablero dejaba de leerse de
 * un vistazo, que es justo para lo que sirve un tablero.
 *
 * Al reducir la escala se caen el rótulo y el responsable. Lo último que
 * sobrevive son la prioridad y los puntos, que son color y una cifra: es lo que
 * sigue diciendo algo desde el fondo del aula cuando se proyectan nueve
 * tableros y el texto ya no se lee.
 */
export default function PostItHistoria({
  historia, escala = 'full', onAbrir, onPointerDown, atenuada, fantasma,
}: Props) {
  const completo = escala === 'full';
  const quien = historia.responsable;

  const contenido = completo ? (
    <div>
      <div className={styles.etiqueta}>¿Qué?</div>
      <div className={styles.que}>{historia.que}</div>
    </div>
  ) : (
    <div className={styles.que}>{historia.que}</div>
  );

  return (
    <article
      className={[
        styles.postit,
        styles[escala],
        onAbrir ? styles.pulsable : '',
        onPointerDown ? styles.arrastrable : '',
        atenuada ? styles.atenuada : '',
        fantasma ? styles.fantasma : '',
      ].filter(Boolean).join(' ')}
      onPointerDown={onPointerDown}
      onClick={onAbrir ? () => onAbrir(historia) : undefined}
      role={onAbrir ? 'button' : undefined}
      tabIndex={onAbrir ? 0 : undefined}
      onKeyDown={
        onAbrir
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onAbrir(historia);
              }
            }
          : undefined
      }
    >
      <header className={styles.cabecera}>
        <span className={`${styles.prioridad} ${styles[historia.prioridad]}`}>
          {historia.prioridad === 'wont' ? "Won't" : historia.prioridad}
        </span>
        <span className={styles.puntos} title={historia.puntos === 0 ? 'Sin estimar' : 'Puntos de historia'}>
          {historia.puntos === 0 ? '–' : historia.puntos}
        </span>
      </header>

      {contenido}

      {/* Una persona o ninguna, nunca varias: en Scrum la historia tiene un
          dueño. El hueco se ve a propósito — es la señal de que falta repartir. */}
      {escala !== 'sm' && (
        <footer className={styles.pie}>
          {quien ? (
            <>
              <span className={styles.avatar}>{iniciales(quien.name)}</span>
              <span className={styles.quien}>
                {completo ? quien.name : quien.name.split(' ')[0]}
              </span>
            </>
          ) : (
            <>
              <span className={styles.avatarVacio} />
              <span className={styles.sinAsignar}>Sin asignar</span>
            </>
          )}
        </footer>
      )}
    </article>
  );
}
