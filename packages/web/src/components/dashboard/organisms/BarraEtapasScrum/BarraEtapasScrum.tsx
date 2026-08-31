import type { Etapa } from '../../../../utils/scrum';
import styles from './BarraEtapasScrum.module.css';

interface Props {
  etapas: Etapa[];
  etapaActualId: string | null;
  /** El id que se está aplicando, o `'ninguna'` al quitar la etapa. */
  aplicando: string | null;
  /** Sin dinámica abierta no hay a qué aplicarla. */
  deshabilitada?: boolean;
  /** Qué se dice a la derecha: a qué dinámica se le aplica, o por qué no. */
  nota: string;
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
 */
export default function BarraEtapasScrum({
  etapas, etapaActualId, aplicando, deshabilitada = false, nota, onCambiar, onConfigurar,
}: Props) {
  return (
    <section className={styles.barra}>
      <div className={styles.izquierda}>
        <span className={styles.titulo}>Etapa en curso</span>
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
        <span className={styles.nota}>{nota}</span>
        {onConfigurar && (
          <button type="button" className={styles.enlace} onClick={onConfigurar}>
            Configurar etapas
          </button>
        )}
      </div>
    </section>
  );
}
