import type { Lab } from '@/types/lab';
import styles from './LabPage.module.css';

interface LabContentProps {
  lab: Lab;
}

export default function LabContent({ lab }: LabContentProps) {
  return (
    <div className={styles.labContent}>
      {/* Header */}
      <header className={styles.labHeader}>
        <div className={styles.labNumber}>
          <span className="material-icons">science</span>
          {lab.numero !== null ? `Laboratorio ${lab.numero}` : 'Laboratorio'}
        </div>
        <h1 className={styles.labTitle}>{lab.titulo}</h1>
        {lab.descripcion && (
          <p className={styles.labDescription}>{lab.descripcion}</p>
        )}
        {lab.modalidad && (
          <div className={styles.infoBadges}>
            <span className={styles.infoBadge}>
              <span className="material-icons">group</span>
              {lab.modalidad}
            </span>
          </div>
        )}
      </header>

      {/* Practica Section */}
      {lab.practica && (
        <section className={`${styles.sectionCard} ${styles.practica}`}>
          <div className={`${styles.sectionIcon} ${styles.practicaIcon}`}>
            <span className="material-icons">auto_stories</span>
          </div>
          <h2 className={styles.sectionTitle}>{lab.practica.titulo}</h2>
          <p className={styles.practicaDescripcion}>{lab.practica.descripcion}</p>
          <a
            href={lab.practica.enlace}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.practicaLink}
          >
            <span className="material-icons">open_in_new</span>
            Ir a la práctica
          </a>
        </section>
      )}

      {/* Objectives Section */}
      {lab.objetivos && lab.objetivos.length > 0 && (
        <section className={`${styles.sectionCard} ${styles.objetivos}`}>
          <div className={`${styles.sectionIcon} ${styles.objetivosIcon}`}>
            <span className="material-icons">check_circle</span>
          </div>
          <h2 className={styles.sectionTitle}>Objetivos</h2>
          <ul className={styles.objectivesList}>
            {lab.objetivos.map((obj, i) => (
              <li key={i} className={styles.objectiveItem}>
                <span className="material-icons">check</span>
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Instructions Section */}
      {lab.instruccionesHtml && (
        <section className={`${styles.sectionCard} ${styles.instrucciones}`}>
          <div className={`${styles.sectionIcon} ${styles.instruccionesIcon}`}>
            <span className="material-icons">list_alt</span>
          </div>
          <h2 className={styles.sectionTitle}>Instrucciones</h2>
          <div
            className={styles.instruccionesHtml}
            dangerouslySetInnerHTML={{ __html: lab.instruccionesHtml }}
          />
        </section>
      )}

      {/* Questions Section */}
      {lab.preguntas && lab.preguntas.length > 0 && (
        <section className={`${styles.sectionCard} ${styles.preguntas}`}>
          <div className={`${styles.sectionIcon} ${styles.preguntasIcon}`}>
            <span className="material-icons">help_outline</span>
          </div>
          <h2 className={styles.sectionTitle}>Preguntas</h2>
          <ol className={styles.preguntasList}>
            {lab.preguntas.map((pregunta, i) => (
              <li key={i} className={styles.preguntaItem}>
                <span className={styles.preguntaNumber}>{i + 1}</span>
                <span>{pregunta}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Resources Section */}
      {lab.recursos && lab.recursos.length > 0 && (
        <section className={`${styles.sectionCard} ${styles.recursos}`}>
          <div className={`${styles.sectionIcon} ${styles.recursosIcon}`}>
            <span className="material-icons">link</span>
          </div>
          <h2 className={styles.sectionTitle}>Recursos</h2>
          <ul className={styles.recursosList}>
            {lab.recursos.map((recurso, i) => (
              <li key={i}>
                <a
                  href={recurso.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.recursoItem}
                >
                  <span className="material-icons">
                    {recurso.externo ? 'open_in_new' : 'description'}
                  </span>
                  <span>{recurso.texto}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Delivery Section */}
      {lab.entrega && (
        <section className={`${styles.sectionCard} ${styles.entrega}`}>
          <div className={`${styles.sectionIcon} ${styles.entregaIcon}`}>
            <span className="material-icons">assignment_turned_in</span>
          </div>
          <h2 className={styles.sectionTitle}>Entrega</h2>
          <div className={styles.entregaContent}>
            <p>{lab.entrega}</p>
          </div>
        </section>
      )}
    </div>
  );
}
