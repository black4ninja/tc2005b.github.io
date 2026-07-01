import { Link } from 'react-router';
import styles from './LoginPage.module.css';
import Icon from '../../atoms/Icon/Icon';
import LoginForm from '../../organisms/LoginForm/LoginForm';
import { APP_NAME, APP_TAGLINE } from '../../../../config/app';

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoWrap}>
            <Icon name="school" size="lg" />
          </div>
          <h1 className={styles.title}>{APP_NAME}</h1>
          <p className={styles.subtitle}>{APP_TAGLINE}</p>
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
