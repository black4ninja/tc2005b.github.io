import { Link } from 'react-router';
import { calendarioGrupo2 } from '@/data/calendario';
import styles from './Footer.module.css';

const enlaces = calendarioGrupo2.enlaces;

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <h3 className={styles.title}>Enlaces importantes</h3>
        <div className={styles.links}>
          <a href="https://calendar.app.google/YjY5BqzNsrFAxkpJ6" target="_blank" rel="noopener noreferrer">
            Solicitud de asesoría (Denisse / Alex)
          </a>
          <Link to="/politicas">Políticas de trabajo en equipo</Link>
          <a href={enlaces.integridadMIT} target="_blank" rel="noopener noreferrer">
            Guía de integridad académica del MIT
          </a>
          <a href={enlaces.mallaEvaluacion} target="_blank" rel="noopener noreferrer">
            Malla de evaluación
          </a>
          {enlaces.agendaEntrevistas && (
            <a href={enlaces.agendaEntrevistas} target="_blank" rel="noopener noreferrer">
              Agenda de entrevistas
            </a>
          )}
        </div>
        <div className={styles.copyright}>
          &copy; {currentYear} Escuela de Ingeniería y Ciencias &mdash; Tecnológico de Monterrey, Campus Querétaro.
        </div>
      </div>
    </footer>
  );
}
