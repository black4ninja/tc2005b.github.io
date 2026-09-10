import Icon from '../../atoms/Icon/Icon';
import {
  HORAS_ANTELACION_EVIDENCIA,
  evidenciaATiempo,
  fechaYHoraCorta,
  horasDeAntelacion,
} from '../../../../utils/agenda';
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
  /**
   * Hora de la cita a la que pertenecen, para poder decir cuáles llegaron
   * tarde. Sin esto la fecha de subida se enseña igual, pero sin juzgarla: es
   * el caso de las evidencias sueltas, que ya no son de ninguna cita.
   */
  citaInicio?: string | null;
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
/**
 * «3 h de antelación», «2 h de retraso». Para el rótulo de la que llegó tarde.
 *
 * En horas y no en «hace tanto» porque lo que importa no es cuándo se subió
 * respecto de hoy, sino respecto de SU cita, que puede haber sido en marzo.
 */
function resumenAntelacion(subidaIso: string, citaIso: string): string {
  const horas = horasDeAntelacion(subidaIso, citaIso);
  if (horas < 0) return `${Math.round(-horas)} h de retraso sobre su hora`;
  if (horas < 1) return 'menos de una hora de antelación';
  return `${Math.round(horas)} h de antelación`;
}

export default function ListaEvidencias({
  evidencias, enVuelo = null, conCompetencia = false, vacio, citaInicio = null, onQuitar,
}: Props) {
  if (evidencias.length === 0) {
    return vacio ? <p className={styles.vacio}>{vacio}</p> : null;
  }
  return (
    <ul className={styles.lista}>
      {evidencias.map((e) => {
        // La hora de SU cita gana a la del contexto: donde se enseñan varias
        // entrevistas juntas —la malla, por competencia— no hay una sola hora
        // contra la que medirlas, y con la del contexto se marcarían tarde unas
        // que llegaron a tiempo a la suya.
        const suCita = e.citaInicio ?? citaInicio;
        return (
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
          {/* CUÁNDO se subió. Va en la lista y no escondido en un `title`
              porque la entrega se pide con antelación, así que la hora es parte
              de la evidencia y no un dato de sistema. */}
          <span className={styles.subida} title={`Subida el ${fechaYHoraCorta(e.createdAt)}`}>
            {fechaYHoraCorta(e.createdAt)}
          </span>
          {suCita && !evidenciaATiempo(e.createdAt, suCita) && (
            <span
              className={styles.tarde}
              title={`Se pide con ${HORAS_ANTELACION_EVIDENCIA} horas de antelación y esta llegó con ${resumenAntelacion(e.createdAt, suCita)}`}
            >
              <Icon name="schedule" size="sm" />
              tarde
            </span>
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
        );
      })}
    </ul>
  );
}
