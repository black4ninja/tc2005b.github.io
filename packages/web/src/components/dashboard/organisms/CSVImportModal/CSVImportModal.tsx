import { useState, useRef } from 'react';
import DashButton from '../../atoms/DashButton/DashButton';
import styles from './CSVImportModal.module.css';

interface ImportResult {
  imported: number;
  skipped: { email: string; reason: string }[];
  credentials: { email: string; name: string; password: string }[];
}

interface CSVImportModalProps {
  grupoId: string;
  sessionToken: string;
  onDone: () => void;
  onCancel: () => void;
}

const API_BASE = '/api';

export default function CSVImportModal({ grupoId, sessionToken, onDone, onCancel }: CSVImportModalProps) {
  const [csvContent, setCsvContent] = useState('');
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvContent(text);
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      setRowCount(Math.max(0, lines.length - 1));
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!csvContent) {
      setError('Selecciona un archivo CSV primero');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/alumnos/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionToken,
        },
        body: JSON.stringify({ csv: csvContent }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al importar');

      setResult({
        imported: data.imported,
        skipped: data.skipped,
        credentials: data.credentials,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyCredentials() {
    if (!result) return;
    const text = result.credentials
      .map((c) => `${c.name}\t${c.email}\t${c.password}`)
      .join('\n');
    navigator.clipboard.writeText(`Nombre\tCorreo\tContraseña\n${text}`);
  }

  if (result) {
    return (
      <div className={styles.results}>
        <div className={styles.resultSummary}>
          <span className={styles.resultSuccess}>{result.imported} importados</span>
          {result.skipped.length > 0 && (
            <span className={styles.resultSkipped}>{result.skipped.length} omitidos</span>
          )}
        </div>

        {result.skipped.length > 0 && (
          <ul className={styles.skippedList}>
            {result.skipped.map((s, i) => (
              <li key={i}>{s.email}: {s.reason}</li>
            ))}
          </ul>
        )}

        {result.credentials.length > 0 && (
          <>
            <table className={styles.credentialsTable}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Contraseña</th>
                </tr>
              </thead>
              <tbody>
                {result.credentials.map((c, i) => (
                  <tr key={i}>
                    <td>{c.name}</td>
                    <td>{c.email}</td>
                    <td><code>{c.password}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className={styles.copyBtn} onClick={copyCredentials}>
              <span className="material-icons" style={{ fontSize: 16 }}>content_copy</span>
              Copiar credenciales
            </button>
          </>
        )}

        <div className={styles.actions}>
          <DashButton onClick={onDone}>Cerrar</DashButton>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.content}>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className={styles.fileInput}
        onChange={handleFileChange}
        disabled={loading}
      />

      {rowCount > 0 && (
        <div className={styles.preview}>
          {rowCount} fila{rowCount !== 1 ? 's' : ''} detectada{rowCount !== 1 ? 's' : ''}
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.actions}>
        <DashButton variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </DashButton>
        <DashButton onClick={handleImport} disabled={loading || !csvContent}>
          {loading ? 'Importando...' : 'Importar'}
        </DashButton>
      </div>
    </div>
  );
}
