import { Link } from 'react-router';
import styles from './LoginPage.module.css';
import Icon from '../../atoms/Icon/Icon';
import LoginForm from '../../organisms/LoginForm/LoginForm';

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoWrap}>
            <Icon name="school" size="lg" />
          </div>
          <h1 className={styles.title}>TC2005B</h1>
          <p className={styles.subtitle}>Construcción de Software y Toma de Decisiones</p>
        </div>

        <LoginForm />

        <div className={styles.footer}>
          <Link to="/" className={styles.backLink}>
            <Icon name="arrow_back" size="sm" />
            Volver al sitio
          </Link>
        </div>
      </div>
    </div>
  );
}
