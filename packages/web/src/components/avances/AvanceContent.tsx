import type { Avance } from '@/types/avance';
import styles from './AvancePage.module.css';

interface AvanceContentProps {
  avance: Avance;
}

export default function AvanceContent({ avance }: AvanceContentProps) {
  return (
    <div className={styles.avanceContent}>
      {/* Header */}
      <header className={styles.avanceHeader}>
        <div className={styles.avanceNumber}>
          <span className="material-icons">flag</span>
          Avance {avance.numero}
        </div>
        <h1 className={styles.avanceTitle}>{avance.titulo}</h1>
        <p className={styles.avanceDescription}>{avance.descripcion}</p>
        <div className={styles.infoBadges}>
          <span className={styles.infoBadge}>
            <span className="material-icons">group</span>
            {avance.modalidad}
          </span>
          <span className={`${styles.infoBadge} ${styles.infoBadgeDate}`}>
            <span className="material-icons">event</span>
            {avance.fechaEntrega}
          </span>
          {avance.entrega.tag && (
            <span className={`${styles.infoBadge} ${styles.infoBadgeTag}`}>
              <span className="material-icons">label</span>
              {avance.entrega.tag}
            </span>
          )}
          {avance.entrega.video && (
            <span className={`${styles.infoBadge} ${styles.infoBadgeWarning}`}>
              <span className="material-icons">videocam</span>
              Video requerido
            </span>
          )}
          {avance.entrega.coevaluacion && (
            <span className={`${styles.infoBadge} ${styles.infoBadgeWarning}`}>
              <span className="material-icons">rate_review</span>
              Coevaluación
            </span>
          )}
        </div>
      </header>

      {/* Objectives Section */}
      {avance.objetivos.length > 0 && (
        <section className={`${styles.sectionCard} ${styles.objetivos}`}>
          <div className={`${styles.sectionIcon} ${styles.objetivosIcon}`}>
            <span className="material-icons">check_circle</span>
          </div>
          <h2 className={styles.sectionTitle}>Objetivos</h2>
          <ul className={styles.objectivesList}>
            {avance.objetivos.map((obj, i) => (
              <li key={i} className={styles.objectiveItem}>
                <span className="material-icons">check</span>
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Instructions Section */}
      {avance.instrucciones.length > 0 && (
        <section className={`${styles.sectionCard} ${styles.instrucciones}`}>
          <div className={`${styles.sectionIcon} ${styles.instruccionesIcon}`}>
            <span className="material-icons">list_alt</span>
          </div>
          <h2 className={styles.sectionTitle}>Instrucciones</h2>
          <div className={styles.instructionsList}>
            {avance.instrucciones.map((instruccion, i) => (
              <div
                key={i}
                className={
                  instruccion.titulo
                    ? styles.instructionItem
                    : styles.instructionPlain
                }
              >
                {instruccion.titulo && (
                  <h3 className={styles.instructionTitle}>
                    {instruccion.titulo}
                  </h3>
                )}
                {instruccion.contenido && (
                  <div
                    className={styles.instructionContent}
                    dangerouslySetInnerHTML={{ __html: instruccion.contenido }}
                  />
                )}
                {instruccion.items && instruccion.items.length > 0 && (
                  <ul className={styles.instructionItems}>
                    {instruccion.items.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Delivery Section */}
      <section className={`${styles.sectionCard} ${styles.entrega}`}>
        <div className={`${styles.sectionIcon} ${styles.entregaIcon}`}>
          <span className="material-icons">assignment_turned_in</span>
        </div>
        <h2 className={styles.sectionTitle}>Entrega</h2>
        <div
          className={styles.entregaContent}
          dangerouslySetInnerHTML={{ __html: avance.entrega.contenido }}
        />
        {(avance.entrega.video || avance.entrega.coevaluacion) && (
          <div className={styles.entregaExtras}>
            {avance.entrega.video && (
              <div className={`${styles.entregaExtra} ${styles.entregaExtraVideo}`}>
                <span className="material-icons">videocam</span>
                <span>Este avance requiere la entrega de un video demostrativo.</span>
              </div>
            )}
            {avance.entrega.coevaluacion && (
              <div className={`${styles.entregaExtra} ${styles.entregaExtraCoeval}`}>
                <span className="material-icons">rate_review</span>
                <span>
                  Este avance requiere coevaluación.
                  {avance.entrega.coevaluacionUrl && (
                    <>
                      {' '}
                      <a href={avance.entrega.coevaluacionUrl} target="_blank" rel="noopener noreferrer">
                        Ir al formulario
                      </a>
                    </>
                  )}
                </span>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
