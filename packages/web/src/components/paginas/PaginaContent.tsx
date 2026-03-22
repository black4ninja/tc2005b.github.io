import type { PaginaData, ContentBlock } from '@/types/pagina';
import styles from '../labs/LabPage.module.css';

interface PaginaContentProps {
  pagina: PaginaData;
}

function renderBlock(block: ContentBlock, pagina: PaginaData) {
  const datos = block.datos;

  switch (block.tipo) {
    case 'encabezado':
      return (
        <header className={styles.labHeader} key={block.id}>
          <div className={styles.labNumber}>
            <span className="material-icons">{pagina.icono ?? 'article'}</span>
            Página
          </div>
          <h1 className={styles.labTitle}>{pagina.titulo}</h1>
          {(datos.subtitulo as string) && (
            <p className={styles.labDescription}>{datos.subtitulo as string}</p>
          )}
          {(datos.modalidad as string) && (
            <div className={styles.infoBadges}>
              <span className={styles.infoBadge}>
                <span className="material-icons">group</span>
                {datos.modalidad as string}
              </span>
            </div>
          )}
        </header>
      );

    case 'practica':
      return (
        <section className={`${styles.sectionCard} ${styles.practica}`} key={block.id}>
          <div className={`${styles.sectionIcon} ${styles.practicaIcon}`}>
            <span className="material-icons">auto_stories</span>
          </div>
          <h2 className={styles.sectionTitle}>{datos.titulo as string}</h2>
          <p className={styles.practicaDescripcion}>{datos.descripcion as string}</p>
          {(datos.enlace as string) && (
            <a
              href={datos.enlace as string}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.practicaLink}
            >
              <span className="material-icons">open_in_new</span>
              Ir a la práctica
            </a>
          )}
        </section>
      );

    case 'objetivos': {
      const items = (datos.items as string[]) ?? [];
      if (items.length === 0) return null;
      return (
        <section className={`${styles.sectionCard} ${styles.objetivos}`} key={block.id}>
          <div className={`${styles.sectionIcon} ${styles.objetivosIcon}`}>
            <span className="material-icons">check_circle</span>
          </div>
          <h2 className={styles.sectionTitle}>Objetivos</h2>
          <ul className={styles.objectivesList}>
            {items.map((obj, i) => (
              <li key={i} className={styles.objectiveItem}>
                <span className="material-icons">check</span>
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </section>
      );
    }

    case 'instrucciones':
      if (!(datos.html as string)) return null;
      return (
        <section className={`${styles.sectionCard} ${styles.instrucciones}`} key={block.id}>
          <div className={`${styles.sectionIcon} ${styles.instruccionesIcon}`}>
            <span className="material-icons">list_alt</span>
          </div>
          <h2 className={styles.sectionTitle}>Instrucciones</h2>
          <div
            className={styles.instruccionesHtml}
            dangerouslySetInnerHTML={{ __html: datos.html as string }}
          />
        </section>
      );

    case 'preguntas': {
      const items = (datos.items as string[]) ?? [];
      if (items.length === 0) return null;
      return (
        <section className={`${styles.sectionCard} ${styles.preguntas}`} key={block.id}>
          <div className={`${styles.sectionIcon} ${styles.preguntasIcon}`}>
            <span className="material-icons">help_outline</span>
          </div>
          <h2 className={styles.sectionTitle}>Preguntas</h2>
          <ol className={styles.preguntasList}>
            {items.map((pregunta, i) => (
              <li key={i} className={styles.preguntaItem}>
                <span className={styles.preguntaNumber}>{i + 1}</span>
                <span>{pregunta}</span>
              </li>
            ))}
          </ol>
        </section>
      );
    }

    case 'recursos': {
      const items = (datos.items as Array<{ texto: string; url: string; externo: boolean }>) ?? [];
      if (items.length === 0) return null;
      return (
        <section className={`${styles.sectionCard} ${styles.recursos}`} key={block.id}>
          <div className={`${styles.sectionIcon} ${styles.recursosIcon}`}>
            <span className="material-icons">link</span>
          </div>
          <h2 className={styles.sectionTitle}>Recursos</h2>
          <ul className={styles.recursosList}>
            {items.map((recurso, i) => (
              <li key={i}>
                <a
                  href={recurso.url}
                  target={recurso.externo ? '_blank' : undefined}
                  rel={recurso.externo ? 'noopener noreferrer' : undefined}
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
      );
    }

    case 'entrega':
      if (!(datos.contenido as string)) return null;
      return (
        <section className={`${styles.sectionCard} ${styles.entrega}`} key={block.id}>
          <div className={`${styles.sectionIcon} ${styles.entregaIcon}`}>
            <span className="material-icons">assignment_turned_in</span>
          </div>
          <h2 className={styles.sectionTitle}>Entrega</h2>
          <div className={styles.entregaContent}>
            <p>{datos.contenido as string}</p>
          </div>
        </section>
      );

    case 'texto':
      if (!(datos.html as string)) return null;
      return (
        <section className={`${styles.sectionCard} ${styles.instrucciones}`} key={block.id}>
          <div className={`${styles.sectionIcon} ${styles.instruccionesIcon}`}>
            <span className="material-icons">article</span>
          </div>
          {(datos.tituloSeccion as string) && (
            <h2 className={styles.sectionTitle}>{datos.tituloSeccion as string}</h2>
          )}
          <div
            className={styles.instruccionesHtml}
            dangerouslySetInnerHTML={{ __html: datos.html as string }}
          />
        </section>
      );

    default:
      return null;
  }
}

export default function PaginaContent({ pagina }: PaginaContentProps) {
  const hasEncabezado = pagina.bloques.some((b) => b.tipo === 'encabezado');

  return (
    <div className={styles.labContent}>
      {/* Default header if no encabezado block */}
      {!hasEncabezado && (
        <header className={styles.labHeader}>
          <div className={styles.labNumber}>
            <span className="material-icons">{pagina.icono ?? 'article'}</span>
            Página
          </div>
          <h1 className={styles.labTitle}>{pagina.titulo}</h1>
          {pagina.descripcion && (
            <p className={styles.labDescription}>{pagina.descripcion}</p>
          )}
        </header>
      )}

      {pagina.bloques.map((block) => renderBlock(block, pagina))}
    </div>
  );
}
