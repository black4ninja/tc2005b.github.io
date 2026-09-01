import Modal from '../../atoms/Modal/Modal';
import { iniciales, type Persona } from '../../../../utils/scrum';
import styles from './InvitadosPartidaModal.module.css';

interface Props {
  abierto: boolean;
  miembros: Persona[];
  /** Quién abrió la partida: no se puede sacar, para eso está borrarla. */
  propietarioId: string | null;
  /** Hay una petición en marcha: se ve, y no se acepta otra encima. */
  enVuelo: boolean;
  onInvitar: () => void;
  onSacar: (alumnoId: string) => void;
  onCerrar: () => void;
}

/**
 * Quién juega esta partida.
 *
 * Invitar no puede ser de una sola dirección: quien se equivoca de compañero se
 * quedaba sin salida —la única forma de deshacerlo era borrar la partida y
 * empezar de cero—. Así que sacar vive en el mismo sitio donde se invita, que es
 * donde se va a buscar.
 *
 * A quien la abrió no se le saca: sin dueño la partida se queda sin nadie que
 * responda por ella, y el tope de partidas vivas dejaría de contar para alguien.
 */
export default function InvitadosPartidaModal({
  abierto, miembros, propietarioId, enVuelo, onInvitar, onSacar, onCerrar,
}: Props) {
  return (
    <Modal isOpen={abierto} onClose={onCerrar} title="Quién juega">
      <div className={styles.cuerpo}>
        <p className={styles.intro}>
          Los que están dentro juegan como un equipo: mueven el tablero y también
          conducen el ciclo, por turnos. Solo pueden ser compañeros de tu grupo.
        </p>

        <ul className={styles.lista}>
          {miembros.map((m) => {
            const dueño = m.id === propietarioId;
            return (
              <li key={m.id} className={styles.fila}>
                <span className={styles.avatar}>{iniciales(m.name)}</span>
                <span className={styles.nombre}>{m.name}</span>
                {dueño ? (
                  <span className={styles.tag}>la abrió</span>
                ) : (
                  <button
                    type="button"
                    className={styles.sacar}
                    disabled={enVuelo}
                    onClick={() => onSacar(m.id)}
                    title={`Sacar a ${m.name}`}
                    aria-label={`Sacar a ${m.name}`}
                  >
                    <span className="material-icons">close</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className={styles.invitar}
          disabled={enVuelo}
          onClick={onInvitar}
        >
          <span className="material-icons">group_add</span>
          Invitar a alguien
        </button>
      </div>
    </Modal>
  );
}
