import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../../../../context/AuthContext';
import styles from './AvancesEquipoPage.module.css';

interface ActividadData {
  id: string;
  nombre: string;
  tipo: string;
  aprendizajePlaneado: number;
  semanaPlaneada: number;
  orden: number;
}

interface EvaluacionAlumno {
  alumnoId: string;
  alumnoName: string;
  actividadAlumnoId: string;
  aprendizajePlaneado: number;
  aprendizajeGanado: number;
  observaciones: string;
}

interface EquipoData {
  id: string;
  nombre: string;
  miembros: Array<{ id: string; name: string; email: string }>;
}

const API_BASE = '/api';

export default function AvancesEquipoPage() {
  const { id: grupoId, equipoId } = useParams<{ id: string; equipoId: string }>();
  const navigate = useNavigate();
  const { sessionToken } = useAuth();

  const [equipo, setEquipo] = useState<EquipoData | null>(null);
  const [actividades, setActividades] = useState<ActividadData[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<Record<string, EvaluacionAlumno[]>>({});
  const [selectedActId, setSelectedActId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  };

  const fetchData = useCallback(async () => {
    if (!grupoId || !equipoId) return;
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE}/admin/grupos/${grupoId}/equipos/${equipoId}/avances`,
        { headers: { 'x-session-token': sessionToken ?? '' } },
      );
      if (!res.ok) throw new Error('Error al cargar avances del equipo');
      const data = await res.json();
      setEquipo(data.equipo);
      setActividades(data.actividades);
      setEvaluaciones(data.evaluaciones);
      if (data.actividades.length > 0 && !selectedActId) {
        setSelectedActId(data.actividades[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [grupoId, equipoId, sessionToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function deriveCalificacion(ev: EvaluacionAlumno): number {
    if (ev.aprendizajePlaneado === 0) return 0;
    return Math.round((ev.aprendizajeGanado / ev.aprendizajePlaneado) * 100);
  }

  function computeGanado(planeado: number, calificacion: number): number {
    return Math.round(planeado * (calificacion / 100) * 100) / 100;
  }

  async function handleCalificacionBlur(ev: EvaluacionAlumno, rawValue: string) {
    const calificacion = Math.max(0, Math.min(100, parseInt(rawValue, 10) || 0));
    const newGanado = computeGanado(ev.aprendizajePlaneado, calificacion);

    if (newGanado === ev.aprendizajeGanado) return;

    // Optimistic update
    setEvaluaciones((prev) => {
      const updated = { ...prev };
      updated[selectedActId] = updated[selectedActId].map((e) =>
        e.actividadAlumnoId === ev.actividadAlumnoId
          ? { ...e, aprendizajeGanado: newGanado }
          : e,
      );
      return updated;
    });

    await saveEvaluacion(ev.actividadAlumnoId, { calificacion });
  }

  async function handleObservacionesBlur(ev: EvaluacionAlumno, observaciones: string) {
    if (observaciones === ev.observaciones) return;

    // Optimistic update
    setEvaluaciones((prev) => {
      const updated = { ...prev };
      updated[selectedActId] = updated[selectedActId].map((e) =>
        e.actividadAlumnoId === ev.actividadAlumnoId
          ? { ...e, observaciones }
          : e,
      );
      return updated;
    });

    await saveEvaluacion(ev.actividadAlumnoId, { observaciones });
  }

  async function saveEvaluacion(
    actividadAlumnoId: string,
    body: { calificacion?: number; observaciones?: string },
  ) {
    setSavingIds((prev) => new Set(prev).add(actividadAlumnoId));
    try {
      const res = await fetch(
        `${API_BASE}/admin/grupos/${grupoId}/equipos/${equipoId}/avances/${actividadAlumnoId}`,
        { method: 'PUT', headers, body: JSON.stringify(body) },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Error al guardar');
      }
    } catch (err: any) {
      setError(err.message);
      await fetchData();
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(actividadAlumnoId);
        return next;
      });
    }
  }

  const currentEvals = evaluaciones[selectedActId] ?? [];

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate(`/admin/grupos/${grupoId}/equipos`)}>
        <span className="material-icons" style={{ fontSize: 18 }}>arrow_back</span>
        Volver a equipos
      </button>

      <h1 className={styles.pageTitle}>
        Evaluación de Avances{equipo ? `: ${equipo.nombre}` : ''}
      </h1>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <p>Cargando...</p>
      ) : actividades.length === 0 ? (
        <div className={styles.placeholder}>
          <span className="material-icons" style={{ fontSize: 48, opacity: 0.4 }}>assignment</span>
          <p>No hay actividades de tipo "proyecto" en este grupo.</p>
          <p>Crea actividades de evaluación con tipo "proyecto" para poder evaluar avances.</p>
        </div>
      ) : (
        <>
          <div>
            <span className={styles.sectionLabel}>Actividad</span>
            <div className={styles.actividadList}>
              {actividades.map((act) => (
                <button
                  key={act.id}
                  className={`${styles.actividadBtn} ${selectedActId === act.id ? styles.actividadBtnActive : ''}`}
                  onClick={() => setSelectedActId(act.id)}
                >
                  {act.nombre}
                </button>
              ))}
            </div>
          </div>

          {currentEvals.length === 0 ? (
            <div className={styles.placeholder}>
              <span className="material-icons" style={{ fontSize: 48, opacity: 0.4 }}>people</span>
              <p>No hay evaluaciones para los miembros de este equipo en esta actividad.</p>
              <p>Asegúrate de haber creado las mallas de evaluación del grupo.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Aprend. Planeado</th>
                    <th>Calificación %</th>
                    <th>Aprend. Ganado</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEvals.map((ev) => {
                    const isSaving = savingIds.has(ev.actividadAlumnoId);
                    const calif = deriveCalificacion(ev);
                    return (
                      <tr key={ev.actividadAlumnoId} className={isSaving ? styles.saving : ''}>
                        <td className={styles.alumnoName}>{ev.alumnoName}</td>
                        <td className={styles.readOnly}>{ev.aprendizajePlaneado}</td>
                        <td>
                          <input
                            type="number"
                            className={styles.inlineNumberInput}
                            min={0}
                            max={100}
                            defaultValue={calif}
                            key={`${ev.actividadAlumnoId}-${calif}`}
                            onBlur={(e) => handleCalificacionBlur(ev, e.target.value)}
                          />
                        </td>
                        <td className={ev.aprendizajeGanado === 0 ? styles.zeroValue : styles.readOnly}>
                          {ev.aprendizajeGanado}
                        </td>
                        <td>
                          <input
                            type="text"
                            className={styles.obsInput}
                            defaultValue={ev.observaciones}
                            key={`obs-${ev.actividadAlumnoId}-${ev.observaciones}`}
                            placeholder="Observaciones..."
                            onBlur={(e) => handleObservacionesBlur(ev, e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
