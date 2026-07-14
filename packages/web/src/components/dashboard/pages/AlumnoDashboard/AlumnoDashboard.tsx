import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { calcCalificacion, type PeriodoConfig } from '@tc2005b/evaluacion';
import { useAuth } from '../../../../context/AuthContext';
import styles from './AlumnoDashboard.module.css';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ActividadAlumnoData {
  id: string;
  actividadGrupoId: string;
  nombre: string;
  tipo: string;
  aprendizajePlaneado: number;
  semanaPlaneada: number;
  aprendizajeGanado: number;
  semanaCompletada: number;
  observaciones: string;
  orden: number;
}

interface CompetenciaAlumnoData {
  competenciaId: string;
  [key: string]: unknown;
}

interface ChartPoint {
  semana: string;
  planeado: number;
  ganado: number;
}

interface PerfilData {
  experiencia: string;
  expectativas: string;
  compromiso: string;
  repositorioIndividual: string;
  situacionesEspeciales: string;
}

const PERFIL_EMPTY: PerfilData = {
  experiencia: '',
  expectativas: '',
  compromiso: '',
  repositorioIndividual: '',
  situacionesEspeciales: '',
};

const API_BASE = '/api';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildChartData(actividades: ActividadAlumnoData[]): ChartPoint[] {
  if (actividades.length === 0) return [];

  const maxSemana = Math.max(
    ...actividades.map((a) => a.semanaPlaneada),
    ...actividades.filter((a) => a.semanaCompletada > 0).map((a) => a.semanaCompletada),
  );

  const planeadoBySemana: Record<number, number> = {};
  const ganadoBySemana: Record<number, number> = {};

  for (const act of actividades) {
    planeadoBySemana[act.semanaPlaneada] =
      (planeadoBySemana[act.semanaPlaneada] ?? 0) + act.aprendizajePlaneado;
    if (act.semanaCompletada > 0) {
      ganadoBySemana[act.semanaCompletada] =
        (ganadoBySemana[act.semanaCompletada] ?? 0) + act.aprendizajeGanado;
    }
  }

  const data: ChartPoint[] = [];
  let cumPlaneado = 0;
  let cumGanado = 0;

  for (let s = 1; s <= maxSemana; s++) {
    cumPlaneado += planeadoBySemana[s] ?? 0;
    cumGanado += ganadoBySemana[s] ?? 0;
    data.push({
      semana: `Sem ${s}`,
      planeado: Math.round(cumPlaneado * 100) / 100,
      ganado: Math.round(cumGanado * 100) / 100,
    });
  }

  return data;
}

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

function validatePerfil(draft: PerfilData): Record<string, string> {
  const errors: Record<string, string> = {};

  if (draft.experiencia.trim().length < 10) {
    errors.experiencia = 'Debe tener al menos 10 caracteres';
  }
  if (draft.expectativas.trim().length < 10) {
    errors.expectativas = 'Debe tener al menos 10 caracteres';
  }
  if (draft.compromiso.trim().length < 10) {
    errors.compromiso = 'Debe tener al menos 10 caracteres';
  }
  if (!draft.repositorioIndividual.trim().includes('github.com')) {
    errors.repositorioIndividual = 'Debe ser una URL válida de GitHub (github.com)';
  } else {
    try {
      new URL(draft.repositorioIndividual.trim());
    } catch {
      errors.repositorioIndividual = 'Debe ser una URL válida';
    }
  }
  if (draft.situacionesEspeciales.trim().length < 5) {
    errors.situacionesEspeciales = 'Debe tener al menos 5 caracteres';
  }

  return errors;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AlumnoDashboard() {
  const { user, sessionToken, updateUser } = useAuth();
  const grupoId = user?.grupos?.[0]?.id;

  const [periodos, setPeriodos] = useState<PeriodoConfig[]>([]);
  const [actividades, setActividades] = useState<ActividadAlumnoData[]>([]);
  const [competencias, setCompetencias] = useState<CompetenciaAlumnoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [perfil, setPerfil] = useState<PerfilData>(PERFIL_EMPTY);
  const [perfilDraft, setPerfilDraft] = useState<PerfilData>(PERFIL_EMPTY);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [perfilCompleto, setPerfilCompleto] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState('');

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const authHeaders: Record<string, string> = {
    'x-session-token': sessionToken ?? '',
  };

  useEffect(() => {
    if (!grupoId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError('');

        const [mallaRes, planRes] = await Promise.all([
          fetch(`${API_BASE}/alumno/grupos/${grupoId}/malla`, { headers: authHeaders }),
          fetch(`${API_BASE}/alumno/grupos/${grupoId}/plan-evaluacion`, { headers: authHeaders }),
        ]);

        if (!mallaRes.ok) throw new Error('Error al cargar malla');
        if (!planRes.ok) throw new Error('Error al cargar plan de evaluación');

        const [mallaJson, planJson] = await Promise.all([mallaRes.json(), planRes.json()]);

        if (cancelled) return;

        setActividades(mallaJson.actividades ?? []);
        if (planJson.plan?.periodos) {
          setPeriodos(planJson.plan.periodos);
        }

        // Fetch competencias and perfil (both optional)
        try {
          const [compRes, perfilRes] = await Promise.all([
            fetch(`${API_BASE}/alumno/grupos/${grupoId}/competencias`, { headers: authHeaders }),
            fetch(`${API_BASE}/alumno/grupos/${grupoId}/perfil`, { headers: authHeaders }),
          ]);
          if (compRes.ok) {
            const compJson = await compRes.json();
            if (!cancelled) setCompetencias(compJson.competencias ?? []);
          }
          if (perfilRes.ok) {
            const perfilJson = await perfilRes.json();
            if (!cancelled) {
              const p = { ...PERFIL_EMPTY, ...perfilJson.perfil };
              setPerfil(p);
              setPerfilDraft(p);
              const isComplete = perfilJson.perfil?.perfilCompleto ?? false;
              setPerfilCompleto(isComplete);
              updateUser({ perfilCompleto: isComplete });
              if (!isComplete) {
                setEditingProfile(true);
              }
            }
          }
        } catch {
          // Competencias and perfil are optional
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [grupoId]);

  /* ---------- Computed ---------- */

  const { periodos: periodoScores, calificacionActual } = useMemo(
    () => calcCalificacion(periodos, actividades, competencias),
    [periodos, actividades, competencias],
  );

  const chartData = useMemo(() => buildChartData(actividades), [actividades]);

  async function handleSavePerfil() {
    if (!grupoId) return;

    // Frontend validation
    const errors = validatePerfil(perfilDraft);

    // Password validation (only if user entered something)
    let hasPassword = false;
    if (newPassword || confirmPassword) {
      hasPassword = true;
      if (newPassword.length < 8) {
        errors.newPassword = 'La contraseña debe tener al menos 8 caracteres';
      } else if (newPassword !== confirmPassword) {
        errors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    // If profile is not complete, password is required
    if (!perfilCompleto && !hasPassword) {
      errors.newPassword = 'Debes establecer una contraseña';
    }

    setFieldErrors(errors);
    setPasswordError('');
    setSaveError('');

    if (Object.keys(errors).length > 0) return;

    setSavingProfile(true);
    try {
      // Change password first if provided
      if (hasPassword) {
        const pwRes = await fetch(`${API_BASE}/alumno/grupos/${grupoId}/cambiar-password`, {
          method: 'PUT',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword, confirmPassword }),
        });
        if (!pwRes.ok) {
          const pwJson = await pwRes.json();
          setPasswordError(pwJson.message || 'Error al cambiar contraseña');
          setSavingProfile(false);
          return;
        }
      }

      // Save profile
      const res = await fetch(`${API_BASE}/alumno/grupos/${grupoId}/perfil`, {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(perfilDraft),
      });

      if (res.ok) {
        const json = await res.json();
        const p = { ...PERFIL_EMPTY, ...json.perfil };
        setPerfil(p);
        setPerfilDraft(p);
        setEditingProfile(false);
        setPerfilCompleto(true);
        updateUser({ perfilCompleto: true });
        setNewPassword('');
        setConfirmPassword('');
        setFieldErrors({});
      } else {
        const json = await res.json();
        if (json.errors) {
          setFieldErrors(json.errors);
        } else {
          setSaveError(json.message || 'Error al guardar perfil');
        }
      }
    } catch {
      setSaveError('Error de conexión al guardar');
    } finally {
      setSavingProfile(false);
    }
  }

  /* ---------- Render ---------- */

  if (loading) {
    return (
      <div className={styles.page}>
        <h1 className={styles.heading}>Mi Dashboard</h1>
        <p>Cargando...</p>
      </div>
    );
  }

  const profileFields = [
    { key: 'experiencia' as const, label: 'Experiencia (disciplinar y extracurricular)' },
    { key: 'expectativas' as const, label: 'Expectativas de la UF' },
    { key: 'compromiso' as const, label: 'Compromiso con la UF' },
    { key: 'repositorioIndividual' as const, label: 'Repositorio individual' },
    { key: 'situacionesEspeciales' as const, label: 'Situaciones especiales' },
  ] as const;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Mi Dashboard</h1>

      {error && <div className={styles.error}>{error}</div>}

      {!perfilCompleto && (
        <div className={styles.profileBanner}>
          <span className="material-icons">info</span>
          Completa tu perfil y establece tu contraseña para acceder a la malla de evaluación
        </div>
      )}

      {/* Stats cards */}
      <div className={styles.statsRow}>
        {periodoScores.map((ps) => (
          <div key={ps.nombre} className={styles.statCard}>
            <span className={`material-icons ${styles.statIcon}`} style={{ color: '#5d87ff' }}>
              assignment
            </span>
            <div className={styles.statContent}>
              <span className={styles.statTitle}>{ps.nombre}</span>
              <span className={styles.statValue}>
                {ps.totalGanado.toFixed(1)} / {ps.totalPlaneado.toFixed(1)} pts
              </span>
              <span className={styles.statSub}>
                {ps.totalPlaneado > 0
                  ? `${((ps.totalGanado / ps.totalPlaneado) * 100).toFixed(0)}% completado`
                  : 'Sin actividades'}
              </span>
            </div>
          </div>
        ))}

        <div className={styles.statCard}>
          <span className={`material-icons ${styles.statIcon}`} style={{ color: '#13deb9' }}>
            emoji_events
          </span>
          <div className={styles.statContent}>
            <span className={styles.statTitle}>Calificación Acumulada</span>
            <span className={styles.statValue}>{calificacionActual.toFixed(1)}</span>
            <span className={styles.statSub}>sobre 100</span>
          </div>
        </div>
      </div>

      {/* Chart + Profile row */}
      <div className={styles.chartRow}>
        {chartData.length > 0 && (
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Aprendizaje Planeado vs Ganado</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="semana" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="planeado"
                  name="Plan de aprendizaje"
                  stroke="#5d87ff"
                  fill="#5d87ff"
                  fillOpacity={0.2}
                  dot={{ r: 4, strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="ganado"
                  name="Aprendizaje real"
                  stroke="#13deb9"
                  fill="#13deb9"
                  fillOpacity={0.2}
                  dot={{ r: 4, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className={styles.profileCard}>
          <h3 className={styles.chartTitle}>Mi Perfil</h3>

          {saveError && <div className={styles.fieldError}>{saveError}</div>}

          {profileFields.map(({ key, label }) => (
            <div key={key} className={styles.profileField}>
              <span className={styles.profileLabel}>{label}</span>
              {editingProfile ? (
                <>
                  {key === 'repositorioIndividual' ? (
                    <input
                      className={`${styles.profileInput} ${fieldErrors[key] ? styles.inputError : ''}`}
                      type="url"
                      value={perfilDraft[key]}
                      onChange={(e) => setPerfilDraft({ ...perfilDraft, [key]: e.target.value })}
                      placeholder="https://github.com/..."
                    />
                  ) : (
                    <textarea
                      className={`${styles.profileTextarea} ${fieldErrors[key] ? styles.inputError : ''}`}
                      value={perfilDraft[key]}
                      onChange={(e) => setPerfilDraft({ ...perfilDraft, [key]: e.target.value })}
                      rows={2}
                    />
                  )}
                  {fieldErrors[key] && (
                    <span className={styles.fieldError}>{fieldErrors[key]}</span>
                  )}
                  {key === 'repositorioIndividual' && (
                    <span className={styles.repoWarning}>
                      Verifica que el repositorio sea público y visible para los profesores. Si al momento de evaluar no es visible, se asignará un 0 de calificación aunque se hayan realizado las actividades.
                    </span>
                  )}
                </>
              ) : (
                key === 'repositorioIndividual' && perfil[key] ? (
                  <a href={perfil[key]} target="_blank" rel="noopener noreferrer" className={styles.profileLink}>
                    {perfil[key]}
                  </a>
                ) : perfil[key] ? (
                  <span className={styles.profileValue}>{perfil[key]}</span>
                ) : (
                  <span className={styles.profileEmpty}>Sin información</span>
                )
              )}
            </div>
          ))}

          {/* Password section */}
          {editingProfile && (
            <div className={styles.passwordSection}>
              <h4 className={styles.passwordTitle}>
                {perfilCompleto ? 'Cambiar contraseña (opcional)' : 'Establecer contraseña'}
              </h4>
              <div className={styles.profileField}>
                <span className={styles.profileLabel}>Nueva contraseña</span>
                <input
                  className={`${styles.profileInput} ${fieldErrors.newPassword ? styles.inputError : ''}`}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                />
                {fieldErrors.newPassword && (
                  <span className={styles.fieldError}>{fieldErrors.newPassword}</span>
                )}
              </div>
              <div className={styles.profileField}>
                <span className={styles.profileLabel}>Confirmar contraseña</span>
                <input
                  className={`${styles.profileInput} ${fieldErrors.confirmPassword ? styles.inputError : ''}`}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                />
                {fieldErrors.confirmPassword && (
                  <span className={styles.fieldError}>{fieldErrors.confirmPassword}</span>
                )}
              </div>
              {passwordError && (
                <span className={styles.fieldError}>{passwordError}</span>
              )}
            </div>
          )}

          <div className={styles.profileActions}>
            {editingProfile ? (
              <>
                <button className={styles.btnSave} onClick={handleSavePerfil} disabled={savingProfile}>
                  {savingProfile ? 'Guardando...' : 'Guardar'}
                </button>
                {perfilCompleto && (
                  <button
                    className={styles.btnCancel}
                    onClick={() => {
                      setPerfilDraft(perfil);
                      setEditingProfile(false);
                      setFieldErrors({});
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError('');
                      setSaveError('');
                    }}
                    disabled={savingProfile}
                  >
                    Cancelar
                  </button>
                )}
              </>
            ) : (
              <button className={styles.btnEdit} onClick={() => setEditingProfile(true)}>
                Editar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
