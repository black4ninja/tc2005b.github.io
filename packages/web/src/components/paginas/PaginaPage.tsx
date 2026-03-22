import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import type { PaginaData } from '@/types/pagina';
import PaginaContent from './PaginaContent';
import styles from '../labs/LabPage.module.css';

const API_BASE = '/api';

export default function PaginaPage() {
  const { slug } = useParams<{ slug: string }>();
  const [pagina, setPagina] = useState<PaginaData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setPagina(null);
    setError(false);
    if (!slug) { setError(true); return; }

    fetch(`${API_BASE}/paginas/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => setPagina(data.pagina))
      .catch(() => setError(true));
  }, [slug]);

  if (error) return (
    <div className={styles.errorState}>
      <span className="material-icons">error_outline</span>
      <p>No se encontró la página solicitada.</p>
    </div>
  );

  if (!pagina) return (
    <div className={styles.loadingState}>
      <p>Cargando...</p>
    </div>
  );

  return <PaginaContent pagina={pagina} />;
}
