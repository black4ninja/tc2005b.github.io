import type { Actividad, ActividadTipo } from '@/types/calendario';
import styles from './ActivityItem.module.css';

const ICON_MAP: Record<ActividadTipo, string> = {
  lab: 'assignment',
  lectura: 'menu_book',
  ejercicio: 'edit',
  proyecto: 'stars',
  evaluacion: 'check_circle',
  break: 'free_breakfast',
  asueto: 'event_busy',
  trabajo: 'work',
  discusion: 'forum',
  info: 'info_outline',
  actividad: 'assignment',
  presentacion: 'slideshow',
};

/** Extensiones que el API sirve inline; el resto se descarga. */
function abreEnElNavegador(nombre: string): boolean {
  const n = nombre.toLowerCase();
  return n.endsWith('.html') || n.endsWith('.htm');
}

interface ActivityItemProps {
  actividad: Actividad;
  isFilteredOut: boolean;
}

export default function ActivityItem({ actividad, isFilteredOut }: ActivityItemProps) {
  const icon = ICON_MAP[actividad.tipo] || 'info_outline';

  // Presentación con archivo: el enlace apunta al endpoint que lo sirve. Un
  // HTML abre en pestaña nueva; cualquier otro formato lo descarga el navegador.
  const archivo = actividad.archivoNombre && actividad.id
    ? {
        url: `/api/calendario/actividad/${actividad.id}/archivo`,
        nombre: actividad.archivoNombre,
        inline: abreEnElNavegador(actividad.archivoNombre),
      }
    : null;

  return (
    <div
      // Ancla para llegar desde el Hub: al volver al calendario se resalta la
      // actividad concreta, no solo su semana.
      id={actividad.id ? `actividad-${actividad.id}` : undefined}
      className={`${styles.activity} ${isFilteredOut ? styles.filteredOut : ''}`}
      data-type={actividad.tipo}
    >
      <i className="material-icons">{icon}</i>
      <div className={styles.activityBody}>
        {archivo ? (
          <a
            href={archivo.url}
            target={archivo.inline ? '_blank' : undefined}
            rel={archivo.inline ? 'noopener noreferrer' : undefined}
            download={archivo.inline ? undefined : archivo.nombre}
            title={archivo.inline ? 'Abrir la presentación' : `Descargar ${archivo.nombre}`}
          >
            {actividad.titulo || archivo.nombre}
            <i className={`material-icons ${styles.archivoIcon}`}>
              {archivo.inline ? 'open_in_new' : 'download'}
            </i>
          </a>
        ) : actividad.enlace ? (
          <a
            href={actividad.enlace}
            target={actividad.externo ? '_blank' : undefined}
            rel={actividad.externo ? 'noopener noreferrer' : undefined}
          >
            {actividad.titulo}
          </a>
        ) : actividad.titulo ? (
          <span>{actividad.titulo}</span>
        ) : null}

        {actividad.descripcion && (
          <em className={styles.descripcion}> ({actividad.descripcion})</em>
        )}

        {actividad.enlacesExtra && actividad.enlacesExtra.length > 0 && (
          <span>
            {' ('}
            {actividad.enlacesExtra.map((extra, i) => {
              const isExternal =
                extra.url.startsWith('http') || extra.url.startsWith('//');
              return (
                <span key={i}>
                  {i > 0 && ', '}
                  <a
                    href={extra.url}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                  >
                    {extra.texto}
                  </a>
                </span>
              );
            })}
            {')'}
          </span>
        )}

        {actividad.fechaEntrega && (
          <span className={styles.entregaBadge}>
            <i className="material-icons" style={{ fontSize: 12 }}>event</i>
            {actividad.fechaEntrega}
          </span>
        )}
      </div>

      {actividad.duracion && (
        <span className={styles.timeBadge}>{actividad.duracion}</span>
      )}
    </div>
  );
}
