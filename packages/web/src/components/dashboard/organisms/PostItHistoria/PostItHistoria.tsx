import { useEffect, useRef, useState, type PointerEvent } from 'react';
import {
  iniciales, puntosTexto, type Epica, type Escala, type Historia, type Persona,
} from '../../../../utils/scrum';
import styles from './PostItHistoria.module.css';

interface Props {
  historia: Historia;
  /** `full` en el tablero, `md` y `sm` según cuántos equipos se proyecten. */
  escala?: Escala;
  /** La épica a la que pertenece: pinta el borde de arriba. */
  epica?: Epica | null;
  /** Para la asignación rápida. Sin esto el pie es solo informativo. */
  miembros?: Persona[];
  /** Sin esto la tarjeta es solo lectura: es lo que ve la proyección. */
  onAbrir?: (historia: Historia) => void;
  /** Asignar sin abrir el detalle: el gesto que más se repite. */
  onAsignar?: (historiaId: string, alumnoId: string | null) => void;
  /** Arranca el arrastre (dedo, ratón o lápiz). Ver `useArrastre`. */
  onPointerDown?: (e: PointerEvent<HTMLElement>) => void;
  /** La está arrastrando: se apaga y el fantasma es el que sigue al dedo. */
  atenuada?: boolean;
  /** Copia que va pegada al puntero mientras se arrastra. */
  fantasma?: boolean;
  /** Quién la tiene abierta ahora mismo. Si hay alguien, no se toca. */
  bloqueadaPor?: string;
}

/**
 * Una historia de usuario como post-it.
 *
 * En el tablero se ve SOLO el título. El «por qué» —qué valor aporta— y el
 * «cómo» se escriben y se leen al abrirla: con los tres campos la tarjeta crecía
 * tanto que en una columna cabían dos y el tablero dejaba de leerse de un
 * vistazo, que es justo para lo que sirve un tablero.
 *
 * El borde de arriba es el color de su ÉPICA. Es lo que deja ver sin leer nada
 * si en el sprint se coló un trozo de otro modelo, que es la restricción que
 * más se rompe.
 *
 * Al reducir la escala se cae el pie. Lo último que sobrevive son la prioridad y
 * los puntos, que son color y una cifra: es lo que sigue diciendo algo desde el
 * fondo del aula cuando se proyectan nueve tableros.
 */
export default function PostItHistoria({
  historia, escala = 'full', epica, miembros, onAbrir, onAsignar,
  onPointerDown, atenuada, fantasma, bloqueadaPor,
}: Props) {
  const completo = escala === 'full';
  const quien = historia.responsable;
  const [menuAbierto, setMenuAbierto] = useState(false);
  const caja = useRef<HTMLElement>(null);

  // Un menú abierto que no se cierra al pulsar fuera acaba tapando la columna
  // de al lado justo cuando alguien intenta soltar una tarjeta ahí.
  useEffect(() => {
    if (!menuAbierto) return;
    function fuera(e: MouseEvent) {
      if (!caja.current?.contains(e.target as Node)) setMenuAbierto(false);
    }
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [menuAbierto]);

  function asignar(alumnoId: string | null) {
    setMenuAbierto(false);
    onAsignar?.(historia.id, alumnoId);
  }

  // En el backlog nadie es responsable de nada: el reparto pertenece al sprint,
  // así que ahí no hay ni pie ni menú. Si una historia vieja arrastra un dueño,
  // se enseña —pero apagado— en vez de esconderlo sin más.
  const enBacklog = historia.columna === 'backlog';
  const puedeAsignar = !!onAsignar && !!miembros?.length && completo && !bloqueadaPor && !enBacklog;

  return (
    <article
      ref={caja}
      className={[
        styles.postit,
        styles[escala],
        onAbrir ? styles.pulsable : '',
        onPointerDown ? styles.arrastrable : '',
        atenuada ? styles.atenuada : '',
        fantasma ? styles.fantasma : '',
        bloqueadaPor ? styles.bloqueada : '',
      ].filter(Boolean).join(' ')}
      style={epica ? { borderTopColor: epica.color } : undefined}
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
      {bloqueadaPor && completo && (
        <div className={styles.candado} title={`${bloqueadaPor} la está editando`}>
          <span className="material-icons">lock</span>
          {bloqueadaPor.split(' ')[0]} la está editando
        </div>
      )}

      <header className={styles.cabecera}>
        <span className={`${styles.prioridad} ${styles[historia.prioridad]}`}>
          {historia.prioridad === 'wont' ? "Won't" : historia.prioridad}
        </span>
        <span
          className={`${styles.puntos} ${historia.puntos <= 0 ? styles.puntosSinEstimar : ''}`}
          title={
            historia.puntos === 0 ? 'Sin estimar'
              : historia.puntos < 0 ? 'Demasiado grande: conviene partirla'
                : 'Puntos de historia'
          }
        >
          {puntosTexto(historia.puntos)}
        </span>
      </header>

      {/* El titular es el «por qué»: el valor que aporta. Las historias
          escritas antes de que fuera el campo principal pueden no tenerlo, y
          una tarjeta en blanco no se puede ni arrastrar con criterio: en ese
          caso se enseña el «qué», que es lo que entonces se pedía. */}
      <div className={styles.titulo}>{historia.porQue || historia.que}</div>

      {/* Una persona o ninguna, nunca varias: en Scrum la historia tiene un
          dueño. El hueco se ve a propósito — es la señal de que falta repartir —
          y el pie entero es el botón de asignar, sin abrir el detalle. */}
      {escala !== 'sm' && (!enBacklog || !!quien) && (
        <div className={styles.pieCaja}>
          <button
            type="button"
            className={`${styles.pie} ${puedeAsignar ? styles.pieAsignable : ''}`}
            disabled={!puedeAsignar}
            onClick={(e) => {
              e.stopPropagation();
              if (puedeAsignar) setMenuAbierto((v) => !v);
            }}
            title={puedeAsignar ? 'Asignar responsable' : undefined}
          >
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
            {puedeAsignar && <span className="material-icons">expand_more</span>}
          </button>

          {menuAbierto && (
            <div className={styles.menu} onClick={(e) => e.stopPropagation()}>
              <div className={styles.menuTitulo}>Asignar a</div>
              <button
                type="button"
                className={`${styles.menuItem} ${!quien ? styles.menuItemActivo : ''}`}
                onClick={() => asignar(null)}
              >
                <span className={styles.avatarVacio} />
                Sin asignar
              </button>
              {miembros!.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`${styles.menuItem} ${quien?.id === m.id ? styles.menuItemActivo : ''}`}
                  onClick={() => asignar(m.id)}
                >
                  <span className={styles.avatar}>{iniciales(m.name)}</span>
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
