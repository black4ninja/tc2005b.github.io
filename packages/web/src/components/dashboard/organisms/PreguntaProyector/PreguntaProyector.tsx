import { useState, useEffect, useCallback, useRef } from 'react';
import Icon from '../../atoms/Icon/Icon';
import { formatearDuracion } from '../../../../utils/preguntas';
import type { Pregunta } from '../../../../types/preguntas';
import '../../../../styles/contenido-render.css';
import styles from './PreguntaProyector.module.css';

interface PreguntaProyectorProps {
  pregunta: Pregunta;
  /**
   * Segundos de ESTA proyección. Llega resuelto de fuera (grupo → materia →
   * módulo): el proyector no sabe de dónde sale el tiempo, solo lo cuenta.
   */
  duracionSegundos: number;
  /** A quién se le está preguntando. Ausente = vista previa desde el banco. */
  alumno?: { name: string; matricula: string } | null;
  /** "3 / 28" en la barra: sitúa al profesor dentro de la sesión. */
  posicion?: { indice: number; total: number } | null;
  onAnterior?: (() => void) | null;
  onSiguiente?: (() => void) | null;
  onSalir: () => void;
}

/**
 * La pregunta a pantalla completa con su temporizador: lo que se le proyecta al
 * alumno durante la entrevista.
 *
 * Sin diseño propio a propósito. Usa los tokens del tema, así que hereda el
 * claro/oscuro que el profesor ya tenga puesto y el contraste sale de ahí; lo
 * único que se toca es el tamaño de letra, que es lo que hace falta para leerlo
 * a tres metros.
 *
 * ⚠️ Las NOTAS de la pregunta no se pintan aquí, ni siquiera plegadas. Esta
 * pantalla se proyecta, y son justo lo que el alumno no debe ver.
 *
 * El temporizador arranca PARADO: entre que se proyecta y el alumno termina de
 * leer pasan unos segundos que no son suyos.
 */
export default function PreguntaProyector({
  pregunta, duracionSegundos, alumno, posicion, onAnterior, onSiguiente, onSalir,
}: PreguntaProyectorProps) {
  const total = duracionSegundos;
  const [restante, setRestante] = useState(total);
  const [corriendo, setCorriendo] = useState(false);
  // Fin absoluto en vez de ir restando: un `setInterval` acumula deriva y a los
  // tres minutos ya va corto respecto al reloj de la pared.
  const finRef = useRef<number>(0);

  // Cambiar de alumno o de pregunta reinicia el reloj: seguir contando el tiempo
  // del anterior sería peor que no tener temporizador.
  useEffect(() => {
    setRestante(total);
    setCorriendo(false);
  }, [pregunta.id, total]);

  useEffect(() => {
    if (!corriendo) return;
    finRef.current = Date.now() + restante * 1000;
    const id = window.setInterval(() => {
      const quedan = Math.max(0, Math.round((finRef.current - Date.now()) / 1000));
      setRestante(quedan);
      if (quedan === 0) setCorriendo(false);
    }, 200);
    return () => window.clearInterval(id);
    // `restante` solo se lee al arrancar la cuenta; incluirlo reiniciaría el
    // intervalo en cada tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corriendo]);

  const alternar = useCallback(() => {
    if (restante === 0) {
      setRestante(total);
      setCorriendo(true);
      return;
    }
    setCorriendo((c) => !c);
  }, [restante, total]);

  const reiniciar = useCallback(() => {
    setCorriendo(false);
    setRestante(total);
  }, [total]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onSalir(); return; }
      if (e.code === 'Space') { e.preventDefault(); alternar(); return; }
      if (e.key === 'r' || e.key === 'R') { reiniciar(); return; }
      if (e.key === 'ArrowRight' && onSiguiente) { onSiguiente(); return; }
      if (e.key === 'ArrowLeft' && onAnterior) { onAnterior(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [alternar, reiniciar, onSalir, onSiguiente, onAnterior]);

  const agotado = restante === 0;
  // Últimos 30 s: el color avisa sin que haya que estar mirando el número.
  const apurado = !agotado && restante <= 30;

  return (
    <div className={styles.overlay}>
      <header className={styles.barra}>
        <div className={styles.quien}>
          {alumno ? (
            <>
              <span className={styles.nombre}>{alumno.name}</span>
              {alumno.matricula && <span className={styles.matricula}>{alumno.matricula}</span>}
            </>
          ) : (
            <span className={styles.matricula}>Vista previa</span>
          )}
          {posicion && (
            <span className={styles.posicion}>{posicion.indice} / {posicion.total}</span>
          )}
        </div>

        <div
          className={`${styles.reloj} ${agotado ? styles.relojAgotado : ''} ${apurado ? styles.relojApurado : ''}`}
          role="timer"
          aria-live="off"
        >
          {agotado ? 'Tiempo' : formatearDuracion(restante)}
        </div>
      </header>

      <main className={styles.escena}>
        <div
          className={`${styles.texto} contenido-render`}
          dangerouslySetInnerHTML={{ __html: pregunta.textoHtml }}
        />
      </main>

      <footer className={styles.controles}>
        <button className={styles.boton} onClick={onSalir} title="Salir (Esc)">
          <Icon name="close" size="sm" /> Salir
        </button>
        {onAnterior && (
          <button className={styles.boton} onClick={onAnterior} title="Alumno anterior (←)">
            <Icon name="chevron_left" size="sm" /> Anterior
          </button>
        )}
        <button className={`${styles.boton} ${styles.botonPrincipal}`} onClick={alternar} title="Iniciar o pausar (Espacio)">
          <Icon name={corriendo ? 'pause' : 'play_arrow'} size="sm" />
          {corriendo ? 'Pausar' : agotado ? 'Otra vez' : 'Iniciar'}
        </button>
        <button className={styles.boton} onClick={reiniciar} title="Reiniciar el reloj (R)">
          <Icon name="restart_alt" size="sm" /> Reiniciar
        </button>
        {onSiguiente && (
          <button className={styles.boton} onClick={onSiguiente} title="Alumno siguiente (→)">
            Siguiente <Icon name="chevron_right" size="sm" />
          </button>
        )}
        <span className={styles.atajos}>Espacio · R · ← → · Esc</span>
      </footer>
    </div>
  );
}
