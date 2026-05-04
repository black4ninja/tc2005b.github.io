import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Modal from '../../atoms/Modal/Modal';
import DashButton from '../../atoms/DashButton/DashButton';
import TruncatedText from '../../atoms/TruncatedText/TruncatedText';
import styles from './CompetenciasQuickModal.module.css';

const API_BASE = '/api';

const EVALUACION_OPTIONS = [
  { value: '', label: 'Sin evaluar' },
  { value: '0', label: 'Incipiente B (0%)' },
  { value: '15', label: 'Incipiente A (15%)' },
  { value: '70', label: 'Básico (70%)' },
  { value: '85', label: 'Sólido (85%)' },
  { value: '100', label: 'Destacado (100%)' },
];

const NUMBER_TO_LABEL: Record<number, string> = {
  0: 'Incipiente B (0%)',
  15: 'Incipiente A (15%)',
  70: 'Básico (70%)',
  85: 'Sólido (85%)',
  100: 'Destacado (100%)',
};

function evalLabel(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'number') return NUMBER_TO_LABEL[val] ?? '';
  return String(val);
}

interface CompetenciaAlumno {
  id: string;
  competencia: string;
  nivel: string;
  fechaIdealEvaluacion: string;
  valorPeriodo1: string | number;
  valorPeriodo2: string | number;
  retroPeriodo1: string;
  retroPeriodo2: string;
  esCalculada?: boolean;
  evidencias?: string[];
  orden?: number;
}

interface CompetenciasQuickModalProps {
  open: boolean;
  onClose: () => void;
  grupoId: string;
  alumnoId: string;
  alumnoNombre: string;
  sessionToken: string;
}

export default function CompetenciasQuickModal({
  open,
  onClose,
  grupoId,
  alumnoId,
  alumnoNombre,
  sessionToken,
}: CompetenciasQuickModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [competencias, setCompetencias] = useState<CompetenciaAlumno[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchCompetencias = useCallback(async () => {
    if (!grupoId || !alumnoId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${API_BASE}/admin/grupos/${grupoId}/alumnos/${alumnoId}/competencias`,
        { headers: { 'x-session-token': sessionToken } },
      );
      if (!res.ok) throw new Error('Error al cargar competencias');
      const data = await res.json();
      setCompetencias(Array.isArray(data.competencias) ? data.competencias : []);
    } catch (err: any) {
      setError(err?.message ?? 'Error al cargar competencias');
    } finally {
      setLoading(false);
    }
  }, [grupoId, alumnoId, sessionToken]);

  useEffect(() => {
    if (open) {
      fetchCompetencias();
    } else {
      // reset cuando se cierra
      setCompetencias([]);
      setError('');
      setToast('');
      setSavingId(null);
    }
  }, [open, fetchCompetencias]);

  async function handleEvalChange(
    compId: string,
    field: 'valorPeriodo1' | 'valorPeriodo2',
    value: string,
  ) {
    // Optimistic update
    setCompetencias((prev) =>
      prev.map((c) => (c.id === compId ? { ...c, [field]: value } : c)),
    );
    setSavingId(compId);
    try {
      const res = await fetch(
        `${API_BASE}/admin/grupos/${grupoId}/alumnos/${alumnoId}/competencias/${compId}`,
        {
          method: 'PUT',
          headers: {
            'x-session-token': sessionToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ [field]: value }),
        },
      );
      if (!res.ok) throw new Error('Error al guardar evaluación');
      // Re-fetch para reflejar competencias calculadas (si las hay)
      await fetchCompetencias();
      setToast('Evaluación guardada');
      setTimeout(() => setToast(''), 2000);
    } catch (err: any) {
      setError(err?.message ?? 'Error al guardar');
      await fetchCompetencias();
    } finally {
      setSavingId(null);
    }
  }

  function goToFullMalla() {
    onClose();
    navigate(`/admin/grupos/${grupoId}/alumnos/${alumnoId}/malla`);
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      extraWide
      title={`Competencias — ${alumnoNombre}`}
    >
      <div className={styles.container}>
        {error && <div className={styles.error}>{error}</div>}
        {toast && <div className={styles.toast}>{toast}</div>}

        <div className={styles.toolbar}>
          <span className={styles.summary}>
            {loading
              ? 'Cargando...'
              : `${competencias.length} competencia${competencias.length !== 1 ? 's' : ''}`}
          </span>
          <DashButton variant="outline" onClick={goToFullMalla}>
            <span className="material-icons" style={{ fontSize: 16 }}>open_in_new</span>
            Abrir malla completa
          </DashButton>
        </div>

        {loading ? (
          <p className={styles.empty}>Cargando competencias...</p>
        ) : competencias.length === 0 ? (
          <p className={styles.empty}>No hay competencias asignadas a este alumno.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Competencia</th>
                  <th>Nivel</th>
                  <th>Fecha Ideal</th>
                  <th>Eval. P1</th>
                  <th>Retro P1</th>
                  <th>Eval. P2</th>
                  <th>Retro P2</th>
                  <th>Evidencias</th>
                </tr>
              </thead>
              <tbody>
                {competencias.map((c) => {
                  const evidencias = Array.isArray(c.evidencias) ? c.evidencias : [];
                  const isSaving = savingId === c.id;
                  return (
                    <tr key={c.id} className={isSaving ? styles.savingRow : undefined}>
                      <td>
                        <span>
                          {c.competencia || '—'}
                          {c.esCalculada && (
                            <span className={styles.calcBadge} title="Calculada: MIN de dependencias">
                              Calc.
                            </span>
                          )}
                        </span>
                      </td>
                      <td>{c.nivel || '—'}</td>
                      <td>{c.fechaIdealEvaluacion || <span className={styles.zero}>—</span>}</td>
                      <td>
                        {c.esCalculada ? (
                          <span className={styles.evalChip} title="Calculada: MIN de dependencias">
                            {evalLabel(c.valorPeriodo1) || '—'}
                          </span>
                        ) : (
                          <select
                            className={styles.evalSelect}
                            value={String(c.valorPeriodo1 ?? '')}
                            disabled={isSaving}
                            onChange={(e) => handleEvalChange(c.id, 'valorPeriodo1', e.target.value)}
                          >
                            {EVALUACION_OPTIONS.map((opt) => (
                              <option key={opt.label} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className={styles.retroCell}>
                        <TruncatedText
                          text={c.retroPeriodo1}
                          lines={2}
                          placeholder={<span className={styles.zero}>—</span>}
                        />
                      </td>
                      <td>
                        {c.esCalculada ? (
                          <span className={styles.evalChip} title="Calculada: MIN de dependencias">
                            {evalLabel(c.valorPeriodo2) || '—'}
                          </span>
                        ) : (
                          <select
                            className={styles.evalSelect}
                            value={String(c.valorPeriodo2 ?? '')}
                            disabled={isSaving}
                            onChange={(e) => handleEvalChange(c.id, 'valorPeriodo2', e.target.value)}
                          >
                            {EVALUACION_OPTIONS.map((opt) => (
                              <option key={opt.label} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className={styles.retroCell}>
                        <TruncatedText
                          text={c.retroPeriodo2}
                          lines={2}
                          placeholder={<span className={styles.zero}>—</span>}
                        />
                      </td>
                      <td>
                        {evidencias.length === 0 ? (
                          <span className={styles.zero}>—</span>
                        ) : (
                          <div className={styles.evidencias}>
                            {evidencias.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.evidenciaLink}
                                title={url}
                              >
                                {url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 28)}
                                {url.length > 28 ? '…' : ''}
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className={styles.helpText}>
          La retroalimentación es solo lectura aquí. Para editarla, usa <strong>Abrir malla completa</strong>.
        </p>
      </div>
    </Modal>
  );
}
