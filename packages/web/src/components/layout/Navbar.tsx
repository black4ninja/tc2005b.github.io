import { Link } from 'react-router';
import styles from './Navbar.module.css';

const AGENDA_ENTREVISTAS_URL =
  'https://docs.google.com/spreadsheets/d/1U1fbfaBWMp4Nje13qi2C3mhjhW0B8NxC-JXD0ff6fNQ/edit?gid=32307462#gid=32307462';

export default function Navbar() {
  return (
    <nav className={styles.topBar}>
      <Link to="/" className={styles.brand}>
        TC2005B
      </Link>
      <span className={styles.subtitle}>
        Construcción de Software y Toma de Decisiones
      </span>
      <div className={styles.navLinks}>
        <a
          href={AGENDA_ENTREVISTAS_URL}
          className={styles.agendaBtn}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="material-icons">calendar_month</span>
          Agendar Entrevistas
        </a>
      </div>
    </nav>
  );
}
