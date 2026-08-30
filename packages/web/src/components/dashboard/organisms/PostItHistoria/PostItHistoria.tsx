import type { DragEvent } from 'react';
import { iniciales, type Escala, type Historia } from '../../../../utils/scrum';
import styles from './PostItHistoria.module.css';

interface Props {
  historia: Historia;
  /** `full` en el tablero, `md` y `sm` según cuántos equipos se proyecten. */
  escala?: Escala;
  /** Sin esto la tarjeta es solo lectura: es lo que ve la proyección. */
  onAbrir?: (historia: Historia) => void;
  onDragStart?: (e: DragEvent<HTMLElement>, historia: Historia) => void;
}

/**
 * Una historia de usuario como post-it.
 *
 * Los tres campos van etiquetados y separados —«¿por qué?», «¿qué?», «¿cómo?»—
 * en vez de en una frase con plantilla. Es lo que obliga a escribir el porqué,
 * que es la parte que se cae cuando el formato es texto libre.
 *
 * Al reducir la escala se quedan la prioridad, los puntos y el «qué»: es lo que
 * sigue siendo legible desde el fondo del aula cuando se proyectan nueve
 * tableros. El color de la prioridad hace entonces el trabajo que el texto ya no
 * puede hacer.
 */
export default function PostItHistoria({ historia, escala = 'full', onAbrir, onDragStart }: Props) {
  const completo = escala === 'full';
  const quien = historia.responsable;

  const contenido = completo ? (
    <>
      <Campo etiqueta="¿Por qué?" texto={historia.porQue} clase={styles.linea} />
      <Campo etiqueta="¿Qué?" texto={historia.que} clase={styles.que} />
      <Campo etiqueta="¿Cómo?" texto={historia.como} clase={styles.linea} />
    </>
  ) : (
    <div className={styles.que}>{historia.que}</div>
  );

  return (
    <article
      className={`${styles.postit} ${styles[escala]} ${onAbrir ? styles.pulsable : ''}`}
      draggable={!!onDragStart}
      onDragStart={onDragStart ? (e) => onDragStart(e, historia) : undefined}
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

function Campo({ etiqueta, texto, clase }: { etiqueta: string; texto: string; clase: string }) {
  if (!texto) return null;
  return (
    <div>
      <div className={styles.etiqueta}>{etiqueta}</div>
      <div className={clase}>{texto}</div>
    </div>
  );
}
