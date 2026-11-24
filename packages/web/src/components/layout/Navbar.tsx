import { Link } from 'react-router';
import styles from './Navbar.module.css';
import { APP_NAME, APP_TAGLINE } from '../../config/app';

export default function Navbar() {
  return (
    <nav className={styles.topBar}>
      <Link to="/" className={styles.brand}>
        {APP_NAME}
      </Link>
      <span className={styles.subtitle}>
        {APP_TAGLINE}
      </span>
    </nav>
  );
}
