import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { avanceLoaders } from '@/data/avances';
import type { Avance } from '@/types/avance';
import AvanceStepper from './AvanceStepper';
import AvanceContent from './AvanceContent';
import styles from './AvancePage.module.css';

export default function AvancePage() {
  const { avanceId } = useParams<{ avanceId: string }>();
  const [avance, setAvance] = useState<Avance | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setAvance(null);
    setError(false);
    const loader = avanceId ? avanceLoaders[avanceId] : undefined;
    if (!loader) { setError(true); return; }
    loader().then(m => setAvance(m.default)).catch(() => setError(true));
  }, [avanceId]);

  if (error) return (
    <div className={styles.errorState}>
      <span className="material-icons">error_outline</span>
      <p>No se encontró el avance solicitado.</p>
    </div>
  );

  if (!avance) return (
    <div className={styles.loadingState}>
      <p>Cargando...</p>
    </div>
  );

  return (
    <>
      <AvanceStepper currentId={avance.id} />
      <AvanceContent avance={avance} />
    </>
  );
}
