import { Link } from 'react-router';
import styles from './Navbar.module.css';
import { APP_NAME, APP_TAGLINE } from '../../config/app';
import { ENLACES_SITIO } from '../../config/enlaces';

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
          href={ENLACES_SITIO.agendaEntrevistas}
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
