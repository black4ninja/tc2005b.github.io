import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { labLoaders, labIndex } from '@/data/labs';
import type { Lab } from '@/types/lab';
import LabContent from './LabContent';
import LabPrevNext from './LabPrevNext';
import styles from './LabPage.module.css';

export default function LabPage() {
  const { labId } = useParams<{ labId: string }>();
  const [lab, setLab] = useState<Lab | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLab(null);
    setError(false);
    const loader = labId ? labLoaders[labId] : undefined;
    if (!loader) { setError(true); return; }
    loader().then(m => setLab(m.default)).catch(() => setError(true));
  }, [labId]);

  if (error) return (
    <div className={styles.errorState}>
      <span className="material-icons">error_outline</span>
      <p>No se encontró el laboratorio solicitado.</p>
    </div>
  );

  if (!lab) return (
    <div className={styles.loadingState}>
      <p>Cargando...</p>
    </div>
  );

  return (
    <>
      <LabContent lab={lab} />
      <LabPrevNext currentId={lab.id} />
    </>
  );
}
