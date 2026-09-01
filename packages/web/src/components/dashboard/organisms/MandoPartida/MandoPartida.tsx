import BarraEtapasScrum from '../BarraEtapasScrum/BarraEtapasScrum';
import type { Dinamica, Etapa, Sprint } from '../../../../utils/scrum';
import styles from './MandoPartida.module.css';

interface Props {
  dinamica: Dinamica;
  etapas: Etapa[];
  sprint: Sprint | null;
  /** El id de la etapa que se está aplicando, o `'ninguna'` al quitarla. */
  aplicando: string | null;
  /** Hay una petición larga en marcha —cerrar el sprint recorre el tablero—. */
  enVuelo: boolean;
  onCambiarEtapa: (etapaId: string | null) => void;
  onNuevoSprint: () => void;
  onCerrarSprint: () => void;
  onObjetivo: () => void;
  onInvitar: () => void;
  onFinalizar: () => void;
}

/**
 * Los mandos del ciclo, en manos del alumno.
 *
 * En una partida de práctica no hay profesor: el alumno abre las etapas, cierra
 * el sprint y termina la partida. Son los MISMOS gestos que el profesor hace en
 * el panel y llaman a los mismos endpoints, por eso esto es literalmente su
 * barra —`BarraEtapasScrum`— con los botones del sprint dentro, y no una copia.
 *
 * Va debajo de la banda de la etapa y no encima: lo primero que el alumno tiene
 * que leer sigue siendo en qué etapa está y qué le deja hacer, igual que en
 * clase. El mando es lo segundo. Y por eso mismo la barra aquí NO lleva reloj:
 * la banda de arriba ya lo enseña en grande, a un centímetro.
 */
export default function MandoPartida({
  dinamica, etapas, sprint, aplicando, enVuelo,
  onCambiarEtapa, onNuevoSprint, onCerrarSprint, onObjetivo, onInvitar, onFinalizar,
}: Props) {
  const cerrado = sprint?.cerrado ?? true;

  return (
    <BarraEtapasScrum
      etapas={etapas}
      etapaActualId={dinamica.etapaActual?.id ?? null}
      aplicando={aplicando}
      deshabilitada={enVuelo || dinamica.finalizada}
      titulo="Tú conduces"
      nota=""
      onCambiar={onCambiarEtapa}
      extra={(
        <div className={styles.botones}>
          <button
            type="button"
            className={styles.boton}
            onClick={onObjetivo}
            disabled={enVuelo || !sprint || cerrado}
          >
            <span className="material-icons">flag</span>
            Objetivo
          </button>
          <button
            type="button"
            className={styles.boton}
            onClick={onInvitar}
            disabled={enVuelo}
          >
            <span className="material-icons">group_add</span>
            Invitar
          </button>
          {cerrado ? (
            <button
              type="button"
              className={styles.boton}
              onClick={onNuevoSprint}
              disabled={enVuelo}
            >
              <span className="material-icons">play_arrow</span>
              Siguiente sprint
            </button>
          ) : (
            <button
              type="button"
              className={styles.boton}
              onClick={onCerrarSprint}
              disabled={enVuelo}
            >
              <span className="material-icons">lock</span>
              Cerrar sprint
            </button>
          )}
          <button
            type="button"
            className={`${styles.boton} ${styles.terminar}`}
            onClick={onFinalizar}
            disabled={enVuelo}
          >
            <span className="material-icons">check_circle</span>
            Terminar
          </button>
        </div>
      )}
    />
  );
}
