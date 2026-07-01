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
};

interface ActivityItemProps {
  actividad: Actividad;
  isFilteredOut: boolean;
}

export default function ActivityItem({ actividad, isFilteredOut }: ActivityItemProps) {
  const icon = ICON_MAP[actividad.tipo] || 'info_outline';

  return (
    <div
      className={`${styles.activity} ${isFilteredOut ? styles.filteredOut : ''}`}
      data-type={actividad.tipo}
    >
      <i className="material-icons">{icon}</i>
      <div className={styles.activityBody}>
        {actividad.enlace ? (
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
