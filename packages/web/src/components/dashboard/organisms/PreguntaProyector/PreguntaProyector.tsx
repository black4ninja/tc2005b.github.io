import { useEffect } from 'react';
import Icon from '../../atoms/Icon/Icon';
import { formatearDuracion } from '../../../../utils/preguntas';
import type { FaseProyeccion } from '../../../../types/preguntas';
import '../../../../styles/contenido-render.css';
import styles from './PreguntaProyector.module.css';

interface PreguntaProyectorProps {
  /** A quién se le está preguntando. */
  alumno?: { name: string } | null;
  /** Qué se le evalúa. Va bajo el nombre: es el contexto de la pregunta. */
  competencia?: string | null;
  textoHtml: string;
  fase: FaseProyeccion;
  /** Segundos que quedan, ya calculados fuera. */
  restante: number;
  /** El total, que es lo que enseña el reloj antes de arrancar. */
  duracionSegundos: number;
  /** ¿Toca enseñar el enunciado? Lo decide `faseProyeccion`, no esta pantalla. */
  visible: boolean;
  /** Se perdió el contacto con el panel. Aviso, no control. */
  sinConexion?: boolean;
  /**
   * Solo para la VISTA PREVIA del banco, que se abre encima de su pantalla y
   * necesita una salida. La pestaña proyectada no lo pasa: ahí no hay controles
   * porque no se maneja desde ahí.
   */
  onSalir?: (() => void) | null;
}

/** Lo que se pinta cuando la pregunta no está puesta. */
function reposo(fase: FaseProyeccion): string {
  if (fase === 'sin-pregunta') return 'Sin pregunta en pantalla';
  if (fase === 'finalizada') return 'Tiempo terminado';
  return 'Preparados';
}

/**
 * La pantalla que ve el alumno: su pregunta a tamaño de aula y el reloj.
 *
 * No tiene controles ni atajos, y no es un descuido: se abre en OTRO aparato
 * —el iPad del alumno, el cañón— y se dirige desde el panel del profesor. Aquí
 * solo se lee. Lo que llega ya viene decidido; esta pantalla ni siquiera cuenta
 * el tiempo, lo recibe.
 *
 * Sin diseño propio a propósito: usa los tokens del tema, así que hereda el
 * claro/oscuro y el contraste sale de ahí. Lo único que se toca es el tamaño de
 * letra, que es lo que hace falta para leerlo a tres metros.
 *
 * ⚠️ Las NOTAS de la pregunta no se pintan aquí, ni siquiera plegadas. Son justo
 * lo que el alumno no debe ver.
 *
 * El enunciado entra y sale con un FUNDIDO, y se queda unos segundos después del
 * cero (`GRACIA_SEGUNDOS`): que la pantalla cambie de golpe mientras el alumno
 * está hablando se vive como un portazo.
 */
export default function PreguntaProyector({
  alumno, competencia, textoHtml, fase, restante, duracionSegundos, visible,
  sinConexion = false, onSalir = null,
}: PreguntaProyectorProps) {
  useEffect(() => {
    if (!onSalir) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onSalir!(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onSalir]);

  const agotado = fase === 'gracia' || fase === 'finalizada';
  // Últimos 30 s: el color avisa sin que haya que estar mirando el número.
  const apurado = fase === 'corriendo' && restante <= 30;
  const enReposo = fase === 'espera' || fase === 'detenida' || fase === 'sin-pregunta';

  return (
    <div className={styles.overlay}>
      <header className={styles.barra}>
        <div className={styles.quien}>
          {alumno?.name && <span className={styles.nombre}>{alumno.name}</span>}
          {/* Debajo del nombre y no al lado: es de qué va la pregunta, no un
              dato más del alumno. */}
          {competencia && <span className={styles.competencia}>{competencia}</span>}
        </div>

        <div
          className={`${styles.reloj} ${agotado ? styles.relojAgotado : ''} ${apurado ? styles.relojApurado : ''} ${enReposo ? styles.relojEnReposo : ''}`}
          role="timer"
          aria-live="off"
        >
          {agotado ? 'Tiempo' : formatearDuracion(enReposo ? duracionSegundos : restante)}
        </div>
      </header>

      {/* Las dos capas se superponen y se cruzan por opacidad: si una sustituyera
          a la otra, el hueco de un fotograma se vería como un parpadeo. */}
      <main className={styles.escena}>
        <div
          className={`${styles.capa} ${styles.texto} contenido-render ${visible ? styles.capaVisible : ''}`}
          aria-hidden={!visible}
          dangerouslySetInnerHTML={{ __html: textoHtml }}
        />
        <p className={`${styles.capa} ${styles.reposo} ${visible ? '' : styles.capaVisible}`} aria-hidden={visible}>
          {reposo(fase)}
        </p>
      </main>

      {onSalir && (
        <button className={styles.salir} onClick={onSalir} title="Cerrar la vista previa (Esc)">
          <Icon name="close" size="sm" /> Cerrar
        </button>
      )}

      {sinConexion && (
        <p className={styles.sinConexion}>Sin contacto con el panel; reintentando…</p>
      )}
    </div>
  );
}
