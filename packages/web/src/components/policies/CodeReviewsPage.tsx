import styles from './CodeReviewsPage.module.css';

export default function CodeReviewsPage() {
  return (
    <div className={styles.pageContent}>
      {/* Header */}
      <header className={styles.pageHeader}>
        <div className={styles.pageLabel}>
          <span className="material-icons">policy</span>
          Política
        </div>
        <h1 className={styles.pageTitle}>Política de trabajo en equipo</h1>
      </header>

      {/* Descripción */}
      <section className={styles.sectionCard}>
        <div className={`${styles.sectionIcon} ${styles.descripcionIcon}`}>
          <span className="material-icons">info</span>
        </div>
        <h2 className={styles.sectionTitle}>Descripción</h2>
        <div className={styles.sectionBody}>
          <p>
            Una política es un principio de gobierno, típicamente usado como la base
            para la definición de procedimientos dentro de una organización. En nuestro
            caso, la política de trabajo en equipo, tiene como propósito maximizar el
            desarrollo de habilidades y la efectividad de los miembros del equipo,
            además de mejorar la calidad del producto final por medio de la detección
            temprana de defectos.
          </p>
          <p>
            Las revisiones de código y la programación en parejas son buenas prácticas
            de la industria para remover defectos en el software y al mismo tiempo
            promueven el desarrollo de habilidades. Es por ello que incorporaremos
            estas prácticas en nuestro trabajo diario.
          </p>
        </div>
      </section>

      {/* Modalidad */}
      <section className={styles.sectionCard}>
        <div className={`${styles.sectionIcon} ${styles.modalidadIcon}`}>
          <span className="material-icons">group</span>
        </div>
        <h2 className={styles.sectionTitle}>Modalidad</h2>
        <div className={styles.sectionBody}>
          <p>En pares.</p>
        </div>
      </section>

      {/* Objetivos */}
      <section className={styles.sectionCard}>
        <div className={`${styles.sectionIcon} ${styles.objetivosIcon}`}>
          <span className="material-icons">check_circle</span>
        </div>
        <h2 className={styles.sectionTitle}>Objetivos</h2>
        <ul className={styles.objectivesList}>
          <li className={styles.objectiveItem}>
            <span className="material-icons">check</span>
            <span>Encontrar defectos en el código</span>
          </li>
          <li className={styles.objectiveItem}>
            <span className="material-icons">check</span>
            <span>Desarrollar tus habilidades aprendiendo de los demás</span>
          </li>
          <li className={styles.objectiveItem}>
            <span className="material-icons">check</span>
            <span>Transmitir tus habilidades</span>
          </li>
          <li className={styles.objectiveItem}>
            <span className="material-icons">check</span>
            <span>Brindar y recibir retroalimentación de manera oportuna</span>
          </li>
          <li className={styles.objectiveItem}>
            <span className="material-icons">check</span>
            <span>Crear una comunidad de aprendizaje activo</span>
          </li>
        </ul>
      </section>

      {/* Política de trabajo en equipo */}
      <section className={styles.sectionCard}>
        <div className={`${styles.sectionIcon} ${styles.instruccionesIcon}`}>
          <span className="material-icons">list_alt</span>
        </div>
        <h2 className={styles.sectionTitle}>Política de trabajo en equipo</h2>
        <div className={styles.policyList}>
          <div className={styles.policyItem}>
            <p>
              Es una buena práctica que vayas creando <em>commits</em> cada vez que
              avances en tu trabajo, esto permite ver el trabajo realizado y gestionar
              las versiones de tu código para que puedas modificarlo con confianza.
            </p>
          </div>
          <div className={styles.policyItem}>
            <p>
              En la medida de lo posible, procura que todo tu trabajo en el proyecto se
              realice con la práctica Pair Programming. Incluso, puedes aplicar esta
              práctica también en los laboratorios.
            </p>
            <p>
              La practica de Pair Programming, básicamente consiste en que 2 personas
              trabajan en 1 tarea, compartiendo 1 sola pantalla y teclado. Esto permite
              que el observador guíe y encuentre defectos en el momento que se inyectan,
              además de que ambos mejoran sus habilidades tanto de observar, como de la
              retroalimentación que reciben.
            </p>
            <p>
              Para que esta práctica sea efectiva, traten de trabajar sin distracciones
              en periodos de alrededor de 45min + 10min de descanso, y ajusten conformen
              se sienten más cómodos y productivos.
            </p>
            <p>
              Es indispensable un ambiente de respecto, confianza y altamente
              constructivo. El trabajo no debe realizarse para juzgar al compañero, sino
              para que ambos mejoren sus habilidades y para que mejore la calidad del
              producto.
            </p>
          </div>
          <div className={styles.policyItem}>
            <p>
              Para el trabajo que no se realice en parejas, es posible también transferir
              habilidades y mejorar su calidad por medio de las revisiones de código.
            </p>
            <p>
              Idealmente, antes de integrar a la rama <code>develop</code>, es importante
              crear un <em>Pull Request</em> y asignar como revisores a 2 miembros de tu
              equipo.
            </p>
            <p>
              Para los revisores, se espera que además de encontrar defectos de claridad
              en el código, documentación, seguridad, eficiencia, y buenas prácticas,
              apoyen a los autores en mejorar su práctica o aprendan algo de ellos. Por lo
              que se pide que en la revisión, hagan comentarios enfocados en lo que sus
              compañeros pueden mejorar, o en lo que aprendieron del código que revisaron.
            </p>
            <p>
              La retroalimentación debe ser <strong>constructiva y significativa</strong>.
              Es decir, no se aceptarán comentarios ofensivos hacia la persona, ni que
              desprecien el trabajo. De ser necesario incluye material de apoyo como un
              artículo. Describe claramente lo que se puede mejorar y cómo realizarlo, así
              como lo que potencialmente podría causar problemas. O bien, específicamente
              las lecciones aprendidas del código que se revisó.
            </p>
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section className={styles.sectionCard}>
        <div className={`${styles.sectionIcon} ${styles.recursosIcon}`}>
          <span className="material-icons">link</span>
        </div>
        <h2 className={styles.sectionTitle}>Recursos</h2>
        <ul className={styles.recursosList}>
          <li>
            <a
              href="https://martinfowler.com/articles/on-pair-programming.html"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.recursoItem}
            >
              <span className="material-icons">open_in_new</span>
              <span>On Pair Programming</span>
            </a>
          </li>
          <li>
            <a
              href="https://medium.engineering/the-code-review-mindset-3280a4af0a89"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.recursoItem}
            >
              <span className="material-icons">open_in_new</span>
              <span>The Code Review Mindset</span>
            </a>
          </li>
          <li>
            <a
              href="https://medium.com/listen-to-my-story/why-i-code-reviews-a2f3df8037a3"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.recursoItem}
            >
              <span className="material-icons">open_in_new</span>
              <span>Why I Love Code Reviews</span>
            </a>
          </li>
          <li>
            <a
              href="https://slack.engineering/how-about-code-reviews-2695fb10d034"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.recursoItem}
            >
              <span className="material-icons">open_in_new</span>
              <span>How About Code Reviews?</span>
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
