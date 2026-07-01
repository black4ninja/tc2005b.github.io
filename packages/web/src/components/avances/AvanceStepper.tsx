import { Link } from 'react-router';
import { avancesNav } from '@/data/avances';
import styles from './AvancePage.module.css';

interface AvanceStepperProps {
  currentId: string;
}

export default function AvanceStepper({ currentId }: AvanceStepperProps) {
  const currentIndex = avancesNav.findIndex(entry => entry.id === currentId);

  return (
    <div className={styles.stepperContainer}>
      <div className={styles.stepper}>
        {avancesNav.map((entry, i) => {
          let stepClass = styles.future;
          if (i < currentIndex) stepClass = styles.completed;
          else if (i === currentIndex) stepClass = styles.active;

          const connectorClass =
            i < currentIndex ? styles.connectorCompleted : '';

          return (
            <div key={entry.id} style={{ display: 'contents' }}>
              <Link
                to={`/avances/${entry.id}`}
                className={`${styles.step} ${stepClass}`}
              >
                <div className={styles.stepCircle}>
                  {i < currentIndex ? (
                    <span className="material-icons" style={{ fontSize: 16 }}>check</span>
                  ) : (
                    entry.numero
                  )}
                </div>
                <span className={styles.stepLabel}>{entry.titulo}</span>
              </Link>
              {i < avancesNav.length - 1 && (
                <div className={`${styles.stepConnector} ${connectorClass}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
