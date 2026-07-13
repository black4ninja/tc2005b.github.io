import { Link } from 'react-router';
import { ENLACES_SITIO } from '@/config/enlaces';
import styles from './Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <h3 className={styles.title}>Enlaces importantes</h3>
        <div className={styles.links}>
          <a href={ENLACES_SITIO.asesoria} target="_blank" rel="noopener noreferrer">
            Solicitud de asesoría (Denisse / Alex)
          </a>
          <Link to="/politicas">Políticas de trabajo en equipo</Link>
          <a href={ENLACES_SITIO.integridadMIT} target="_blank" rel="noopener noreferrer">
            Guía de integridad académica del MIT
          </a>
          <a href={ENLACES_SITIO.mallaEvaluacion} target="_blank" rel="noopener noreferrer">
            Malla de evaluación
          </a>
          <a href={ENLACES_SITIO.agendaEntrevistas} target="_blank" rel="noopener noreferrer">
            Agenda de entrevistas
          </a>
        </div>
        <div className={styles.copyright}>
          &copy; {currentYear} Escuela de Ingeniería y Ciencias &mdash; Tecnológico de Monterrey, Campus Querétaro.
        </div>
      </div>
    </footer>
  );
}
