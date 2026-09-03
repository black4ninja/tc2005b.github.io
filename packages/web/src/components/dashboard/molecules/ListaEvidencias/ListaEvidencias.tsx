import Icon from '../../atoms/Icon/Icon';
import type { Evidencia } from '../../../../types/agenda';
import styles from './ListaEvidencias.module.css';

interface Props {
  evidencias: Evidencia[];
  /** Id de la evidencia cuyo borrado está en vuelo, para apagar su fila. */
  enVuelo?: string | null;
  /** Enseña de qué competencia es. Solo hace falta fuera de una cita. */
  conCompetencia?: boolean;
  /** Qué decir cuando no hay ninguna. Vacío = no se dice nada. */
  vacio?: string;
  /** Sin esto la lista es de solo lectura, que es como la ve el profesor. */
  onQuitar?: (evidenciaId: string) => void;
}

/**
 * Lo que el alumno entregó, en una lista.
 *
 * La misma en las dos pantallas —la del alumno, que puede quitar, y la del
 * profesor, que solo mira—, porque son la misma lista y en cuanto se escriben
 * dos se les va el formato del enlace por caminos distintos. Y la usará la malla
 * cuando enseñe estas evidencias.
 *
 * `rel="noopener noreferrer"` no es adorno: el enlace lo escribe un alumno y lo
 * abre el profesor desde su panel.
 */
export default function ListaEvidencias({
  evidencias, enVuelo = null, conCompetencia = false, vacio, onQuitar,
}: Props) {
  if (evidencias.length === 0) {
    return vacio ? <p className={styles.vacio}>{vacio}</p> : null;
  }
  return (
    <ul className={styles.lista}>
      {evidencias.map((e) => (
        <li key={e.id} className={`${styles.fila} ${enVuelo === e.id ? styles.filaEnVuelo : ''}`}>
          <Icon name="attachment" size="sm" />
          <a
            className={styles.enlace}
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            title={e.url}
          >
            {e.titulo || e.url}
          </a>
          {conCompetencia && e.competencia && (
            <span className={styles.competencia}>{e.competencia.nombre}</span>
          )}
          {onQuitar && (
            <button
              type="button"
              className={styles.quitar}
              disabled={enVuelo === e.id}
              onClick={() => onQuitar(e.id)}
              title="Quitar esta evidencia"
              aria-label="Quitar esta evidencia"
            >
              <Icon name="close" size="sm" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
