import type { ReactNode } from 'react';
import { useCuentaRegresiva } from '../../../../hooks/useCuentaRegresiva';
import type { Etapa } from '../../../../utils/scrum';
import styles from './BarraEtapasScrum.module.css';

interface Props {
  etapas: Etapa[];
  etapaActualId: string | null;
  /** Cuándo se abrió la etapa en curso, para contar lo que le queda. */
  iniciadaEn?: string | null;
  /** El id que se está aplicando, o `'ninguna'` al quitar la etapa. */
  aplicando: string | null;
  /** Sin dinámica abierta no hay a qué aplicarla. */
  deshabilitada?: boolean;
  /** Qué se dice a la derecha: a qué dinámica se le aplica, o por qué no. */
  nota: string;
  /**
   * El rótulo de la izquierda. En el panel del profesor dice qué etapa está
   * puesta, porque eso no se ve en ningún otro sitio de la pantalla; en el
   * tablero del alumno la banda de arriba ya lo grita, y ahí el rótulo tiene
   * que decir para qué sirven los botones.
   */
  titulo?: string;
  /** Mandos que acompañan a la barra —abrir sprint, cerrarlo, invitar—. */
  extra?: ReactNode;
  onCambiar: (etapaId: string | null) => void;
  onConfigurar?: () => void;
}

/**
 * La barra de la etapa del Scrum.
 *
 * Es lo único que el profesor toca durante la clase, y por eso vive en los dos
 * sitios donde puede estar mirando: el listado de dinámicas y la dinámica
 * abierta, donde están los demás mandos. Pulsar una etapa reescribe la
 * instrucción de treinta pantallas a la vez, así que el botón dice que está
 * viajando: sin eso el profesor cree que no pulsó y vuelve a pulsar.
 *
 * Lleva el mismo reloj que ve el alumno. El tiempo de la etapa es lo que marca
 * el ritmo de la clase y quien decide cuándo se corta es el profesor: tenerlo
 * solo en la pantalla de enfrente le obligaba a leerlo del proyector.
 */
export default function BarraEtapasScrum({
  etapas, etapaActualId, iniciadaEn = null, aplicando, deshabilitada = false,
  nota, titulo = 'Etapa en curso', extra, onCambiar, onConfigurar,
}: Props) {
  const actual = etapas.find((e) => e.id === etapaActualId) ?? null;
  const reloj = useCuentaRegresiva(iniciadaEn, actual?.politica.duracionSegundos ?? null);

  return (
    <section className={styles.barra}>
      <div className={styles.izquierda}>
        <span className={styles.titulo}>{titulo}</span>
        <div className={styles.etapas}>
          {etapas.map((e) => {
            const activa = etapaActualId === e.id;
            const enMarcha = aplicando === e.id;
            return (
              <button
                key={e.id}
                type="button"
                className={`${styles.etapa} ${activa ? styles.etapaActiva : ''}`}
                style={activa ? { background: e.color, borderColor: e.color } : undefined}
                onClick={() => onCambiar(activa ? null : e.id)}
                disabled={deshabilitada || !!aplicando}
                title={e.pista || e.nombre}
                aria-pressed={activa}
                aria-busy={enMarcha}
              >
                {enMarcha
                  ? <span className={styles.girando} aria-hidden />
                  : !activa && <span className={styles.punto} style={{ background: e.color }} />}
                {e.nombre}
              </button>
            );
          })}
        </div>
      </div>
      <div className={styles.derecha}>
        {/* Solo mientras la etapa esté viva. Con la dinámica cerrada el contador
            seguiría corriendo sobre la última que se abrió y enseñaría las horas
            que han pasado desde la clase, que no es un dato de nada. */}
        {reloj && !deshabilitada && (
          <span className={`${styles.reloj} ${reloj.agotado ? styles.relojAgotado : ''}`}>
            <span className={styles.relojEtiqueta}>{reloj.agotado ? 'De más' : 'Queda'}</span>
            <span className={styles.relojCifra}>{reloj.texto}</span>
          </span>
        )}
        <span className={styles.nota}>{nota}</span>
        {extra}
        {onConfigurar && (
          <button type="button" className={styles.enlace} onClick={onConfigurar}>
            Configurar etapas
          </button>
        )}
      </div>
    </section>
  );
}
