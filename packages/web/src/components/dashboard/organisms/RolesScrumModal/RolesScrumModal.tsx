import Modal from '../../atoms/Modal/Modal';
import { iniciales, type Persona } from '../../../../utils/scrum';
import styles from './RolesScrumModal.module.css';

interface Props {
  abierto: boolean;
  miembros: Persona[];
  poId: string | null;
  editable?: boolean;
  onElegir: (alumnoId: string | null) => void;
  onCerrar: () => void;
}

const ROLES = [
  {
    k: 'po',
    n: 'Product Owner',
    d: 'Escribe y prioriza las historias, decide qué entra al sprint y reporta en el review las restricciones que no se cumplieron. Uno por equipo.',
  },
  {
    k: 'tm',
    n: 'Team Member',
    d: 'Estima, jala historias del sprint backlog y las lleva hasta terminado. Todos entran con este rol.',
  },
];

/**
 * Quién es el Product Owner.
 *
 * Lo elige el propio equipo, no el profesor: repartirse los roles es parte de
 * lo que se practica. Y la descripción va al lado, no en un manual: el rol
 * cambia lo que se espera de esa persona, y eso hay que poder leerlo en el
 * momento de elegirla.
 */
export default function RolesScrumModal({
  abierto, miembros, poId, editable = true, onElegir, onCerrar,
}: Props) {
  return (
    <Modal isOpen={abierto} onClose={onCerrar} title="Roles del equipo">
      <div className={styles.cuerpo}>
        <p className={styles.intro}>
          Todos empiezan como Team Member. Elijan a UNA persona como Product Owner: el rol cambia
          lo que se espera de ella, no solo la insignia.
        </p>

        <ul className={styles.lista}>
          {miembros.map((m) => {
            const esPo = poId === m.id;
            return (
              <li key={m.id} className={styles.fila}>
                <span className={`${styles.avatar} ${esPo ? styles.avatarPo : ''}`}>
                  {iniciales(m.name)}
                </span>
                <span className={styles.nombre}>{m.name}</span>
                <div className={styles.fichas}>
                  <button
                    type="button"
                    className={`${styles.ficha} ${esPo ? styles.fichaActiva : ''}`}
                    disabled={!editable}
                    onClick={() => onElegir(m.id)}
                    aria-pressed={esPo}
                  >
                    PO
                  </button>
                  <button
                    type="button"
                    className={`${styles.ficha} ${!esPo ? styles.fichaActiva : ''}`}
                    disabled={!editable}
                    onClick={() => esPo && onElegir(null)}
                    aria-pressed={!esPo}
                  >
                    Team Member
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className={styles.ayuda}>
          {ROLES.map((r) => (
            <p key={r.k} className={styles.rol}>
              <strong>{r.n}.</strong> {r.d}
            </p>
          ))}
          <p className={styles.nota}>
            El <strong>Scrum Master</strong> lo hacen los profesores para todos los equipos: no se
            asigna aquí.
          </p>
        </div>
      </div>
    </Modal>
  );
}
