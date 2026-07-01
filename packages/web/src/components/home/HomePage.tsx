import { Link } from 'react-router';
import styles from './HomePage.module.css';
import { APP_NAME, APP_TAGLINE } from '../../config/app';

export default function HomePage() {
  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>{APP_NAME}</h1>
        <p className={styles.heroSubtitle}>
          {APP_TAGLINE}
        </p>
        <p className={styles.heroMeta}>
          Tecnológico de Monterrey &mdash; Campus Querétaro
        </p>
      </section>

      <section className={styles.cards}>
        <Link to="/calendario/501" className={styles.card}>
          <h2 className={styles.cardTitle}>Grupo 501</h2>
          <p className={styles.cardDescription}>Salón 4205</p>
          <span className={styles.cardAction}>Ver calendario &rarr;</span>
        </Link>
      </section>

      <section className={styles.quickLinks}>
        <h3 className={styles.sectionTitle}>Recursos</h3>
        <div className={styles.linksGrid}>
          <a
            href="/docs/"
            className={styles.linkCard}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className={styles.linkTitle}>Documentación</span>
            <span className={styles.linkDesc}>
              Material del curso y guías de laboratorio
            </span>
          </a>
          <Link to="/politicas" className={styles.linkCard}>
            <span className={styles.linkTitle}>Políticas</span>
            <span className={styles.linkDesc}>
              Lineamientos de trabajo en equipo y code reviews
            </span>
          </Link>
        </div>
      </section>

      <section className={styles.footerLinks}>
        <h3 className={styles.sectionTitle}>Asesorías y Contacto</h3>
        <div className={styles.linksGrid}>
          <a
            href="https://calendar.google.com"
            className={styles.linkCard}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className={styles.linkTitle}>Agendar Asesoría</span>
            <span className={styles.linkDesc}>
              Agenda una sesión de asesoría por Google Calendar
            </span>
          </a>
          <a
            href="https://github.com/tc2005b"
            className={styles.linkCard}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className={styles.linkTitle}>GitHub</span>
            <span className={styles.linkDesc}>
              Repositorios y recursos del curso
            </span>
          </a>
        </div>
      </section>
    </div>
  );
}
