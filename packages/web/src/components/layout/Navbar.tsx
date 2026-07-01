import { Link } from 'react-router';
import styles from './Navbar.module.css';
import { APP_NAME, APP_TAGLINE } from '../../config/app';

const AGENDA_ENTREVISTAS_URL =
  'https://docs.google.com/spreadsheets/d/1U1fbfaBWMp4Nje13qi2C3mhjhW0B8NxC-JXD0ff6fNQ/edit?gid=32307462#gid=32307462';

export default function Navbar() {
  return (
    <nav className={styles.topBar}>
      <Link to="/" className={styles.brand}>
        {APP_NAME}
      </Link>
      <span className={styles.subtitle}>
        {APP_TAGLINE}
      </span>
      <div className={styles.navLinks}>
        <a
          href={AGENDA_ENTREVISTAS_URL}
          className={styles.agendaBtn}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="material-icons">event_available</span>
          <span>Agendar Entrevistas</span>
        </a>
      </div>
    </nav>
  );
}
