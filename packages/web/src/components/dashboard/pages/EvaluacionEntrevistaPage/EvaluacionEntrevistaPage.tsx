import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import styles from './EvaluacionEntrevistaPage.module.css';

interface AlumnoData {
  id: string;
  name: string;
  email: string;
}

interface CompetenciaData {
  id: string;
  competencia: string;
  nivel: string;
  descripcionNivel: string;
  incipienteB: string;
  incipienteA: string;
  basico: string;
  solido: string;
  destacado: string;
  orden: number;
  fechaIdealEvaluacion: string;
}

interface ProfesorData {
  id: string;
  name: string;
  email: string;
}

interface EvaluacionData {
  id: string;
  alumno: AlumnoData;
  competencia: CompetenciaData;
  profesor: ProfesorData | null;
  comentario: string;
  valorAsignado: string;
  periodo: string;
}

interface CompAlumnoData {
  id: string;
  valorPeriodo1: string;
  valorPeriodo2: string;
  retroPeriodo1: string;
  retroPeriodo2: string;
  evidencias: string[];
}

interface EntrevistaDetail {
  id: string;
  fecha: string;
  equipo: { id: string; nombre: string; miembros: AlumnoData[] };
  profesores: ProfesorData[];
  competencias: CompetenciaData[];
  liberada?: boolean;
}

interface LocalEdit {
  comentario: string;
  valorAsignado: string;
}

const PROFESOR_COLORS = [
  { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  { bg: '#fce7f3', color: '#9d174d', border: '#f9a8d4' },
  { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  { bg: '#e0e7ff', color: '#3730a3', border: '#a5b4fc' },
  { bg: '#ffe4e6', color: '#9f1239', border: '#fda4af' },
  { bg: '#ccfbf1', color: '#134e4a', border: '#5eead4' },
  { bg: '#f3e8ff', color: '#6b21a8', border: '#c4b5fd' },
];

function getProfesorColor(profesorId: string) {
  let hash = 0;
  for (let i = 0; i < profesorId.length; i++) {
    hash = ((hash << 5) - hash + profesorId.charCodeAt(i)) | 0;
  }
  return PROFESOR_COLORS[Math.abs(hash) % PROFESOR_COLORS.length];
}

const EVALUACION_OPTIONS = [
  { value: '', label: 'Sin evaluar' },
  { value: 'Incipiente B (0%)', label: 'Incipiente B (0%)' },
  { value: 'Incipiente A (15%)', label: 'Incipiente A (15%)' },
  { value: 'Básico (70%)', label: 'Básico (70%)' },
  { value: 'Sólido (85%)', label: 'Sólido (85%)' },
  { value: 'Destacado (100%)', label: 'Destacado (100%)' },
];

export default function EvaluacionEntrevistaPage() {
  const { id: grupoId, entrevistaId } = useParams<{ id: string; entrevistaId: string }>();
  const navigate = useNavigate();
  const { sessionToken } = useAuth();

  const [entrevista, setEntrevista] = useState<EntrevistaDetail | null>(null);
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionData[]>([]);
  const [localEdits, setLocalEdits] = useState<Map<string, LocalEdit>>(new Map());
  const [periodoMap, setPeriodoMap] = useState<Record<string, string>>({});
  const [periodoNames, setPeriodoNames] = useState<string[]>([]);
  const [compAlumnoMap, setCompAlumnoMap] = useState<Record<string, CompAlumnoData>>({});
  const [loading, setLoading] = useState(true);
  const [savingCellId, setSavingCellId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [evidenciasModal, setEvidenciasModal] = useState<{ alumnoName: string; compName: string; urls: string[] } | null>(null);

  const authHeaders: Record<string, string> = {
    'x-session-token': sessionToken ?? '',
  };

  const basePath = `/api/admin/grupos/${grupoId}/entrevistas/${entrevistaId}/evaluaciones`;

  const fetchEvaluaciones = useCallback(async () => {
    try {
      const res = await fetch(basePath, { headers: authHeaders });
      if (!res.ok) throw new Error('Error al cargar evaluaciones');
      const data = await res.json();
      setEntrevista(data.entrevista);
      setEvaluaciones(data.evaluaciones);
      if (data.periodoMap) setPeriodoMap(data.periodoMap);
      if (data.periodoNames) setPeriodoNames(data.periodoNames);
      if (data.compAlumnoMap) setCompAlumnoMap(data.compAlumnoMap);
    } catch (err: any) {
      setError(err.message);
    }
  }, [grupoId, entrevistaId, sessionToken]);

  useEffect(() => {
    async function init() {
      if (!grupoId || !entrevistaId) return;
      setLoading(true);
      try {
        await fetch(`${basePath}/init`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
        });
        await fetchEvaluaciones();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [grupoId, entrevistaId, sessionToken]);

  // Build lookup: `${alumnoId}-${competenciaId}` → EvaluacionData
  const evaluacionMap = useMemo(() => {
    const map = new Map<string, EvaluacionData>();
    for (const ev of evaluaciones) {
      if (ev.alumno && ev.competencia) {
        map.set(`${ev.alumno.id}-${ev.competencia.id}`, ev);
      }
    }
    return map;
  }, [evaluaciones]);

  function getLocalEdit(evalId: string, ev: EvaluacionData): LocalEdit {
    const local = localEdits.get(evalId);
    if (local) return local;

    return {
      comentario: ev.comentario ?? '',
      valorAsignado: ev.valorAsignado ?? '',
    };
  }

  function setEdit(evalId: string, field: keyof LocalEdit, value: string) {
    setLocalEdits((prev) => {
      const next = new Map(prev);
      const ev = evaluaciones.find((e) => e.id === evalId);
      const existing = next.get(evalId) ?? {
        comentario: ev?.comentario ?? '',
        valorAsignado: ev?.valorAsignado ?? '',
      };
      next.set(evalId, { ...existing, [field]: value });
      return next;
    });
  }

  function hasChanges(evalId: string, ev: EvaluacionData): boolean {
    const local = localEdits.get(evalId);
    if (!local) return false;
    const origComentario = ev.comentario ?? '';
    const origValor = ev.valorAsignado ?? '';
    return (
      local.comentario !== origComentario ||
      local.valorAsignado !== origValor
    );
  }

  function getCurrentMallaValue(ev: EvaluacionData): string {
    const compKey = `${ev.alumno.id}-${ev.competencia.id}`;
    const ca = compAlumnoMap[compKey];
    if (!ca) return '';
    const p = periodoMap[ev.competencia.id] || '';
    if (p.includes('1')) return ca.valorPeriodo1;
    if (p.includes('2')) return ca.valorPeriodo2;
    return '';
  }

  async function handleSaveCell(evalId: string) {
    const local = localEdits.get(evalId);
    if (!local) return;

    setSavingCellId(evalId);
    setError('');
    try {
      const res = await fetch(`${basePath}/${evalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          comentario: local.comentario,
          valorAsignado: local.valorAsignado,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al guardar');
      }

      setLocalEdits((prev) => {
        const next = new Map(prev);
        next.delete(evalId);
        return next;
      });
      await fetchEvaluaciones();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingCellId(null);
    }
  }

  const alumnos = entrevista?.equipo?.miembros ?? [];
  const competencias = entrevista?.competencias ?? [];
  const profesores = entrevista?.profesores ?? [];
  const isLiberada = entrevista?.liberada === true;

  const fechaFormatted = entrevista?.fecha
    ? (() => {
        const [y, m, d] = entrevista.fecha.split('-');
        return new Date(+y, +m - 1, +d).toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      })()
    : '';

  if (loading) {
    return <div className={styles.page}><p>Cargando...</p></div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => navigate(`/admin/grupos/${grupoId}/entrevistas`)}
        >
          <span className="material-icons" style={{ fontSize: '1rem' }}>arrow_back</span>
          Volver
        </button>
        <h1 className={styles.title}>
          Evaluación — {entrevista?.equipo?.nombre ?? ''} — {fechaFormatted}
        </h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {isLiberada && (
        <div className={styles.liberadaBanner}>
          <span className="material-icons" style={{ fontSize: '1rem' }}>check_circle</span>
          Esta evaluación ya fue liberada a la malla de competencias (solo lectura)
        </div>
      )}

      {alumnos.length === 0 || competencias.length === 0 ? (
        <p>No hay alumnos o competencias configuradas para esta entrevista.</p>
      ) : (
        <div className={styles.gridWrapper}>
          <table className={styles.grid}>
            <thead>
              <tr>
                {alumnos.map((a) => (
                  <th key={a.id}>{a.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {competencias.map((comp) => (
                <tr key={comp.id}>
                  {alumnos.map((alumno) => {
                    const ev = evaluacionMap.get(`${alumno.id}-${comp.id}`);
                    if (!ev) return <td key={alumno.id}>—</td>;

                    const local = getLocalEdit(ev.id, ev);
                    const changed = hasChanges(ev.id, ev);
                    const isSaving = savingCellId === ev.id;
                    const currentMalla = getCurrentMallaValue(ev);

                    return (
                      <td key={alumno.id}>
                        <div className={styles.cell}>
                          <div className={styles.cellCompHeader}>
                            <div className={styles.cellCompName}>
                              {comp.competencia}
                            </div>
                            {(() => {
                              const compKey = `${alumno.id}-${comp.id}`;
                              const ca = compAlumnoMap[compKey];
                              const evs = ca?.evidencias ?? [];
                              return (
                                <button
                                  className={`${styles.evidenciasBtn} ${evs.length > 0 ? styles.evidenciasBtnActive : ''}`}
                                  onClick={() => setEvidenciasModal({
                                    alumnoName: alumno.name,
                                    compName: comp.competencia,
                                    urls: evs,
                                  })}
                                  title="Ver evidencias"
                                >
                                  <span className="material-icons" style={{ fontSize: '1rem' }}>attach_file</span>
                                  {evs.length > 0 && <span className={styles.evidenciasBadge}>{evs.length}</span>}
                                </button>
                              );
                            })()}
                          </div>
                          <label className={styles.cellLabel}>Profesor</label>
                          {ev.profesor ? (() => {
                            const pc = getProfesorColor(ev.profesor.id);
                            return (
                              <span
                                className={styles.profesorBadge}
                                style={{ background: pc.bg, color: pc.color, borderColor: pc.border }}
                              >
                                {ev.profesor.name}
                              </span>
                            );
                          })() : (
                            <span className={styles.profesorTextMuted}>Sin asignar</span>
                          )}
                          {currentMalla && (
                            <span className={styles.currentValue}>
                              Valor actual: {currentMalla}
                            </span>
                          )}

                          <label className={styles.cellLabel}>Nivel</label>
                          <select
                            className={`${styles.cellSelect} ${local.valorAsignado ? styles.cellSelectLevel : ''}`}
                            value={local.valorAsignado}
                            onChange={(e) => setEdit(ev.id, 'valorAsignado', e.target.value)}
                            disabled={isSaving || isLiberada}
                          >
                            {EVALUACION_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>

                          <label className={styles.cellLabel}>Retroalimentación</label>
                          <textarea
                            className={styles.cellTextarea}
                            value={local.comentario}
                            onChange={(e) => setEdit(ev.id, 'comentario', e.target.value)}
                            placeholder="Retroalimentación..."
                            disabled={isSaving || isLiberada}
                          />

                          <div className={styles.cellFooter}>
                            {!isLiberada && (
                              <button
                                className={styles.cellSaveBtn}
                                disabled={!changed || isSaving}
                                onClick={() => handleSaveCell(ev.id)}
                              >
                                {isSaving ? 'Guardando...' : 'Guardar'}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {evidenciasModal && (
        <div className={styles.modalOverlay} onClick={() => setEvidenciasModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Evidencias</h2>
              <button className={styles.modalClose} onClick={() => setEvidenciasModal(null)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <p className={styles.modalSubtitle}>
              {evidenciasModal.alumnoName} — {evidenciasModal.compName}
            </p>
            {evidenciasModal.urls.length === 0 ? (
              <p className={styles.modalEmpty}>No hay evidencias subidas.</p>
            ) : (
              <ul className={styles.modalList}>
                {evidenciasModal.urls.map((url, i) => (
                  <li key={i}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className={styles.modalLink}>
                      {url.length > 60 ? url.slice(0, 60) + '...' : url}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
