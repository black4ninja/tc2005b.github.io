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
}

interface LocalEdit {
  profesorId: string;
  comentario: string;
  valorAsignado: string;
  periodo: string;
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

    // Pre-load valorAsignado from compAlumno if the evaluacion doesn't have one yet
    const compKey = `${ev.alumno.id}-${ev.competencia.id}`;
    const ca = compAlumnoMap[compKey];
    const defaultPeriodo = ev.periodo || periodoMap[ev.competencia.id] || '';

    let preloadedValor = ev.valorAsignado || '';
    if (!preloadedValor && ca && defaultPeriodo) {
      if (defaultPeriodo.includes('1')) preloadedValor = ca.valorPeriodo1;
      else if (defaultPeriodo.includes('2')) preloadedValor = ca.valorPeriodo2;
    }

    return {
      profesorId: ev.profesor?.id ?? '',
      comentario: ev.comentario ?? '',
      valorAsignado: preloadedValor,
      periodo: defaultPeriodo,
    };
  }

  function setEdit(evalId: string, field: keyof LocalEdit, value: string) {
    setLocalEdits((prev) => {
      const next = new Map(prev);
      const ev = evaluaciones.find((e) => e.id === evalId);
      const existing = next.get(evalId) ?? {
        profesorId: ev?.profesor?.id ?? '',
        comentario: ev?.comentario ?? '',
        valorAsignado: ev?.valorAsignado ?? '',
        periodo: ev?.periodo || (ev ? periodoMap[ev.competencia.id] : '') || '',
      };
      next.set(evalId, { ...existing, [field]: value });
      return next;
    });
  }

  function hasChanges(evalId: string, ev: EvaluacionData): boolean {
    const local = localEdits.get(evalId);
    if (!local) return false;
    const origProfesor = ev.profesor?.id ?? '';
    const origComentario = ev.comentario ?? '';
    const origValor = ev.valorAsignado ?? '';
    const origPeriodo = ev.periodo || periodoMap[ev.competencia.id] || '';
    return (
      local.profesorId !== origProfesor ||
      local.comentario !== origComentario ||
      local.valorAsignado !== origValor ||
      local.periodo !== origPeriodo
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

    const ev = evaluaciones.find((e) => e.id === evalId);
    if (!ev) return;

    const compKey = `${ev.alumno.id}-${ev.competencia.id}`;
    const ca = compAlumnoMap[compKey];

    setSavingCellId(evalId);
    setError('');
    try {
      const res = await fetch(`${basePath}/${evalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          profesorId: local.profesorId || null,
          comentario: local.comentario,
          valorAsignado: local.valorAsignado,
          periodo: local.periodo,
          compAlumnoId: ca?.id || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al guardar');
      }

      const result = await res.json();

      // Update compAlumnoMap locally if the server returned updated data
      if (result.compAlumno) {
        setCompAlumnoMap((prev) => ({
          ...prev,
          [compKey]: result.compAlumno,
        }));
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
                          <select
                            className={styles.cellSelect}
                            value={local.profesorId}
                            onChange={(e) => setEdit(ev.id, 'profesorId', e.target.value)}
                            disabled={isSaving}
                          >
                            <option value="">— Sin profesor —</option>
                            {profesores.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>

                          <label className={styles.cellLabel}>Nivel</label>
                          <select
                            className={`${styles.cellSelect} ${local.valorAsignado ? styles.cellSelectLevel : ''}`}
                            value={local.valorAsignado}
                            onChange={(e) => setEdit(ev.id, 'valorAsignado', e.target.value)}
                            disabled={isSaving}
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
                            disabled={isSaving}
                          />

                          <div className={styles.cellFooter}>
                            {currentMalla && (
                              <span className={styles.currentValue}>
                                Valor actual: {currentMalla}
                              </span>
                            )}
                            <button
                              className={styles.cellSaveBtn}
                              disabled={!changed || isSaving}
                              onClick={() => handleSaveCell(ev.id)}
                            >
                              {isSaving ? 'Guardando...' : 'Guardar'}
                            </button>
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
