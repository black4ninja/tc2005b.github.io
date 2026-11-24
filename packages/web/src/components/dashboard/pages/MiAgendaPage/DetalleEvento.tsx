import { Link } from 'react-router';
import Modal from '../../atoms/Modal/Modal';
import Icon from '../../atoms/Icon/Icon';
import ActivityItem from '../../../calendar/ActivityItem';
import { aMinutos, type EventoAgenda } from '../../../../utils/miAgenda';
import styles from './DetalleEvento.module.css';

interface Props {
  evento: EventoAgenda | null;
  grupo: string;
  color: string;
  /** Los eventos con los que se pisa, para decir con qué. */
  choques: EventoAgenda[];
  nombre: Map<string, string>;
  onCerrar: () => void;
}

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

function fechaLarga(f: string): string {
  const t = new Date(`${f}T12:00:00Z`).toLocaleDateString('es-MX', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * El detalle de un evento de «Mi agenda» sin salir de ella: de una sesión, sus
 * actividades como las pinta el calendario; de un bloque de entrevistas, hueco
 * por hueco quién viene y qué queda libre, como en el módulo de entrevistas. El
 * botón del pie lleva a esa pantalla, que es donde se edita.
 */
export default function DetalleEvento({ evento: ev, grupo, color, choques, nombre, onCerrar }: Props) {
  if (!ev) return null;
  const esSesion = ev.tipo === 'sesion';
  const destino = esSesion
    ? `/admin/grupos/${ev.grupoId}/calendario${ev.semana ? `?semana=${encodeURIComponent(ev.semana)}` : ''}`
    : `/admin/grupos/${ev.grupoId}/preguntas?dia=${encodeURIComponent(ev.id.replace(/^e-/, ''))}`;

  return (
    <Modal isOpen onClose={onCerrar} title={`${grupo} · ${esSesion ? 'Sesión' : 'Entrevistas'}`} wide>
      <div className={styles.cuerpo}>
        <p className={styles.cuando}>
          <span className={styles.muestra} style={{ background: color }} aria-hidden="true" />
          <Icon name="schedule" size="sm" />
          {fechaLarga(ev.fecha)} · {ev.inicio}–{ev.fin}
          {ev.cerrado && <span className={styles.etiqueta}><Icon name="lock" size="sm" /> Cerrado a reservas</span>}
        </p>

        {choques.length > 0 && (
          <div className={styles.choques} role="status">
            <Icon name="warning" size="sm" />
            <span>
              Se traslapa con{' '}
              {choques.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && ', '}
                  <strong>{nombre.get(c.grupoId)}</strong> ({c.tipo === 'sesion' ? 'sesión' : 'entrevistas'} {c.inicio}–{c.fin})
                </span>
              ))}
              .
            </span>
          </div>
        )}

        {esSesion ? <Sesion ev={ev} /> : <Entrevistas ev={ev} />}
      </div>

      <div className={styles.pie}>
        <button type="button" className={styles.secundario} onClick={onCerrar}>Cerrar</button>
        <Link to={destino} className={styles.primario}>
          <Icon name={esSesion ? 'calendar_month' : 'record_voice_over'} size="sm" />
          {esSesion ? 'Abrir en el calendario' : 'Abrir en Entrevistas'}
        </Link>
      </div>
    </Modal>
  );
}

function Sesion({ ev }: { ev: EventoAgenda }) {
  if (ev.actividades && ev.actividades.length > 0) {
    return (
      <div className={styles.actividades}>
        {ev.actividades.map((a, i) => <ActivityItem key={a.id ?? i} actividad={a} isFilteredOut={false} />)}
      </div>
    );
  }
  return <p className={styles.vacio}>{ev.titulo || 'Esta sesión no tiene actividades en el calendario.'}</p>;
}

function Entrevistas({ ev }: { ev: EventoAgenda }) {
  const h = ev.huecos;
  if (!h) return <p className={styles.vacio}>{ev.titulo || 'Sin detalle de los huecos.'}</p>;

  const citas = new Map(h.citas.map((c) => [c.inicio, c]));
  const cerrados = new Set(h.cerrados);
  const inicio = aMinutos(ev.inicio);
  const huecos = Array.from({ length: h.total }, (_, i) => hhmm(inicio + i * h.duracionMin));
  const abiertos = h.total - h.cerrados.length;
  const libres = abiertos - h.citas.length;

  return (
    <>
      {ev.titulo && <p className={styles.nota}><Icon name="info" size="sm" /> {ev.titulo}</p>}
      <div className={styles.resumen}>
        <span><strong>{h.citas.length}</strong> de {abiertos} lugares ocupados</span>
        <span><strong>{libres}</strong> libres</span>
        {h.cerrados.length > 0 && <span><strong>{h.cerrados.length}</strong> cerrados</span>}
        <span>Huecos de {h.duracionMin} min</span>
      </div>
      <div className={styles.barra} aria-hidden="true">
        <span style={{ width: `${abiertos > 0 ? (h.citas.length / abiertos) * 100 : 0}%` }} />
      </div>
      <ol className={styles.huecos}>
        {huecos.map((hora) => {
          const cita = citas.get(hora);
          const cerrado = cerrados.has(hora);
          return (
            <li key={hora} className={cita ? styles.ocupado : cerrado ? styles.cerrado : styles.libre}>
              <span className={styles.hora}>{hora}</span>
              {cita ? (
                <span className={styles.quien}>
                  <strong>{cita.alumno}</strong>
                  {cita.competencia && <span className={styles.competencia}>{cita.competencia}</span>}
                </span>
              ) : (
                <span className={styles.estado}>{cerrado ? 'Cerrado' : 'Libre'}</span>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
