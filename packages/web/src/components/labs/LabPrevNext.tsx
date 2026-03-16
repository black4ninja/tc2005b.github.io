import { Link } from 'react-router';
import { labIndex } from '@/data/labs';
import styles from './LabPage.module.css';

interface LabPrevNextProps {
  currentId: string;
}

export default function LabPrevNext({ currentId }: LabPrevNextProps) {
  const currentIndex = labIndex.findIndex(entry => entry.id === currentId);
  if (currentIndex === -1) return null;

  const prev = currentIndex > 0 ? labIndex[currentIndex - 1] : null;
  const next = currentIndex < labIndex.length - 1 ? labIndex[currentIndex + 1] : null;

  if (!prev && !next) return null;

  return (
    <nav className={styles.prevNextNav}>
      {prev ? (
        <Link to={`/labs/${prev.id}`} className={`${styles.navBtn} ${styles.navBtnPrev}`}>
          <span className="material-icons">arrow_back</span>
          <div className={styles.navBtnInfo}>
            <span className={styles.navBtnDir}>Anterior</span>
            <span className={styles.navBtnTitle}>
              {prev.numero !== null ? `${prev.numero}. ` : ''}{prev.titulo}
            </span>
          </div>
        </Link>
      ) : (
        <span />
      )}

      {next ? (
        <Link to={`/labs/${next.id}`} className={`${styles.navBtn} ${styles.navBtnNext}`}>
          <div className={styles.navBtnInfo}>
            <span className={styles.navBtnDir}>Siguiente</span>
            <span className={styles.navBtnTitle}>
              {next.numero !== null ? `${next.numero}. ` : ''}{next.titulo}
            </span>
          </div>
          <span className="material-icons">arrow_forward</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
