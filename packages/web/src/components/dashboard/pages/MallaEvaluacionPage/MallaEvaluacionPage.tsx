import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import Modal from '../../atoms/Modal/Modal';
import DashButton from '../../atoms/DashButton/DashButton';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import type { ActividadTipo } from '@/types/calendario';
import styles from './MallaEvaluacionPage.module.css';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PeriodoConfig {
  nombre: string;
  pesoFinal: number;
  pesoCompetencias: number;
  pesoActividades: number;
  competencias: string[];
  actividades: string[];
  acumulativo: boolean;
}

interface ActividadData {
  id: string;
  nombre: string;
  tipo: string;
  aprendizajePlaneado: number;
  semanaPlaneada: number;
}

interface ActividadAlumnoData {
  id: string;
  actividadGrupoId: string;
  nombre: string;
  tipo: ActividadTipo;
  aprendizajePlaneado: number;
  semanaPlaneada: number;
  aprendizajeGanado: number;
  semanaCompletada: number;
  observaciones: string;
  orden: number;
}

interface CompetenciaAlumnoData {
  id: string;
  competencia: string;
  nivel: string;
  descripcionNivel: string;
  orden: number;
  valorPeriodo1: string;
  valorPeriodo2: string;
  retroPeriodo1: string;
  retroPeriodo2: string;
  guiaEvidencias: string;
  incipienteB: string;
  incipienteA: string;
  basico: string;
  solido: string;
  destacado: string;
  fechaIdealEvaluacion: string;
  grupoId: string;
  alumnoId: string;
  competenciaId: string;
  evidencias: string[];
}

interface AlumnoInfo {
  id: string;
  name: string;
  email: string;
}

interface IndicacionData {
  id: string;
  descripcion: string;
}

type TabKey = 'actividades' | 'competencias';

const API_BASE = '/api';

const TIPO_CONFIG: Record<ActividadTipo, { label: string; color: string; bg: string }> = {
  lab: { label: 'Lab', color: 'var(--color-lab)', bg: 'var(--color-lab-light)' },
  lectura: { label: 'Lectura', color: 'var(--color-lectura)', bg: 'var(--color-lectura-light)' },
  ejercicio: { label: 'Ejercicio', color: 'var(--color-ejercicio)', bg: 'var(--color-ejercicio-light)' },
  proyecto: { label: 'Proyecto', color: 'var(--color-proyecto)', bg: 'var(--color-proyecto-light)' },
  evaluacion: { label: 'Evaluación', color: 'var(--color-evaluacion)', bg: 'var(--color-evaluacion-light)' },
  break: { label: 'Receso', color: 'var(--color-break)', bg: 'var(--color-break-light)' },
  asueto: { label: 'Asueto', color: 'var(--color-asueto)', bg: 'var(--color-asueto-light)' },
  trabajo: { label: 'Trabajo', color: 'var(--color-trabajo)', bg: 'var(--color-trabajo-light)' },
  discusion: { label: 'Discusión', color: 'var(--color-discusion)', bg: 'var(--color-discusion-light)' },
  info: { label: 'Info', color: 'var(--color-info)', bg: 'var(--color-info-light)' },
  actividad: { label: 'Actividad', color: 'var(--color-actividad)', bg: 'var(--color-actividad-light)' },
};

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

function evalLabel(val: string | number): string {
  if (typeof val === 'number') return NUMBER_TO_LABEL[val] ?? '';
  return val || '';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MallaEvaluacionPage() {
  const { id: grupoId, alumnoId } = useParams<{ id: string; alumnoId: string }>();
  const { sessionToken } = useAuth();
  const location = useLocation();

  // Detect if we're in alumno context
  const isAlumno = location.pathname.startsWith('/alumno/');

  const [periodos, setPeriodos] = useState<PeriodoConfig[]>([]);
  const [actividades, setActividades] = useState<ActividadData[]>([]);
  const [actividadesAlumno, setActividadesAlumno] = useState<ActividadAlumnoData[]>([]);
  const [alumnoInfo, setAlumnoInfo] = useState<AlumnoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('actividades');

  // Competencias
  const [competenciasAlumno, setCompetenciasAlumno] = useState<CompetenciaAlumnoData[]>([]);
  const [loadingCompetencias, setLoadingCompetencias] = useState(false);

  // Indicaciones
  const [indicaciones, setIndicaciones] = useState<IndicacionData[]>([]);
  const [indicacionesOpen, setIndicacionesOpen] = useState(false);
  const [indicacionesLeidas, setIndicacionesLeidas] = useState(() => {
    return localStorage.getItem(`indicaciones-leidas-${grupoId}`) === 'true';
  });

  // Modal for observaciones
  const [showObsModal, setShowObsModal] = useState(false);
  const [obsItem, setObsItem] = useState<ActividadAlumnoData | null>(null);
  const [obsText, setObsText] = useState('');
  const [savingObs, setSavingObs] = useState(false);

  // Modal for competencia retro edit
  const [showCompModal, setShowCompModal] = useState(false);
  const [compItem, setCompItem] = useState<CompetenciaAlumnoData | null>(null);
  const [compForm, setCompForm] = useState({ retroPeriodo1: '', retroPeriodo2: '' });
  const [savingComp, setSavingComp] = useState(false);

  // Evidencias input state
  const [evidenciaInputs, setEvidenciaInputs] = useState<Record<string, string>>({});

  const authHeaders: Record<string, string> = {
    'x-session-token': sessionToken ?? '',
  };

  // Determine if this is an "alumno viewing own malla" or "admin viewing alumno malla"
  const hasAlumnoData = isAlumno || !!alumnoId;

  /* ---------- Data fetching ---------- */

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (isAlumno) {
        // Alumno viewing own malla
        const [mallaRes, planRes] = await Promise.all([
          fetch(`${API_BASE}/alumno/grupos/${grupoId}/malla`, { headers: authHeaders }),
          fetch(`${API_BASE}/alumno/grupos/${grupoId}/plan-evaluacion`, { headers: authHeaders }),
        ]);

        if (!mallaRes.ok) throw new Error('Error al cargar malla');
        if (!planRes.ok) throw new Error('Error al cargar plan de evaluación');

        const [mallaJson, planJson] = await Promise.all([mallaRes.json(), planRes.json()]);

        setActividadesAlumno(mallaJson.actividades ?? []);
        setAlumnoInfo(mallaJson.alumno ?? null);
        setActividades((mallaJson.actividades ?? []).map((a: ActividadAlumnoData) => ({
          id: a.id,
          nombre: a.nombre,
          tipo: a.tipo,
          aprendizajePlaneado: a.aprendizajePlaneado,
          semanaPlaneada: a.semanaPlaneada,
        })));

        if (planJson.plan?.periodos) {
          setPeriodos(planJson.plan.periodos);
        }
      } else if (alumnoId) {
        // Admin viewing alumno's malla
        const [mallaRes, planRes] = await Promise.all([
          fetch(`${API_BASE}/admin/grupos/${grupoId}/alumnos/${alumnoId}/malla`, { headers: authHeaders }),
          fetch(`${API_BASE}/admin/grupos/${grupoId}/plan-evaluacion`, { headers: authHeaders }),
        ]);

        if (!mallaRes.ok) throw new Error('Error al cargar malla del alumno');
        if (!planRes.ok) throw new Error('Error al cargar plan de evaluación');

        const [mallaJson, planJson] = await Promise.all([mallaRes.json(), planRes.json()]);

        setActividadesAlumno(mallaJson.actividades ?? []);
        setAlumnoInfo(mallaJson.alumno ?? null);
        setActividades((mallaJson.actividades ?? []).map((a: ActividadAlumnoData) => ({
          id: a.id,
          nombre: a.nombre,
          tipo: a.tipo,
          aprendizajePlaneado: a.aprendizajePlaneado,
          semanaPlaneada: a.semanaPlaneada,
        })));

        if (planJson.plan?.periodos) {
          setPeriodos(planJson.plan.periodos);
        }
      } else {
        // Original: fetch group data
        const [planRes, actRes] = await Promise.all([
          fetch(`${API_BASE}/admin/grupos/${grupoId}/plan-evaluacion`, { headers: authHeaders }),
          fetch(`${API_BASE}/admin/grupos/${grupoId}/actividades-evaluacion`, { headers: authHeaders }),
        ]);

        if (!planRes.ok || !actRes.ok) throw new Error('Error al cargar datos');

        const [planJson, actJson] = await Promise.all([planRes.json(), actRes.json()]);

        setActividades(actJson.actividades ?? []);
        if (planJson.plan?.periodos) {
          setPeriodos(planJson.plan.periodos);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [grupoId, alumnoId, sessionToken, isAlumno]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------- Competencias fetching ---------- */

  const fetchCompetencias = useCallback(async () => {
    if (!hasAlumnoData || !grupoId) return;
    try {
      setLoadingCompetencias(true);
      const url = isAlumno
        ? `${API_BASE}/alumno/grupos/${grupoId}/competencias`
        : `${API_BASE}/admin/grupos/${grupoId}/alumnos/${alumnoId}/competencias`;
      const res = await fetch(url, { headers: authHeaders });
      if (!res.ok) throw new Error('Error al cargar competencias');
      const json = await res.json();
      setCompetenciasAlumno(json.competencias ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingCompetencias(false);
    }
  }, [grupoId, alumnoId, sessionToken, isAlumno, hasAlumnoData]);

  useEffect(() => {
    if (hasAlumnoData) {
      fetchCompetencias();
    }
  }, [fetchCompetencias, hasAlumnoData]);

  /* ---------- Indicaciones fetching ---------- */

  const fetchIndicaciones = useCallback(async () => {
    if (!isAlumno || !grupoId) return;
    try {
      const res = await fetch(`${API_BASE}/alumno/grupos/${grupoId}/indicaciones-malla`, {
        headers: authHeaders,
      });
      if (!res.ok) return;
      const json = await res.json();
      setIndicaciones(json.indicaciones ?? []);
    } catch {
      // silently fail — indicaciones are non-critical
    }
  }, [grupoId, sessionToken, isAlumno]);

  useEffect(() => {
    if (activeTab === 'competencias' && isAlumno) {
      fetchIndicaciones();
      // Forzar apertura si no han sido leídas
      if (!indicacionesLeidas) {
        setIndicacionesOpen(true);
      }
    }
  }, [activeTab, fetchIndicaciones, isAlumno, indicacionesLeidas]);

  /* ---------- Competencia edit handlers (admin only) ---------- */

  function openCompModal(item: CompetenciaAlumnoData) {
    setCompItem(item);
    setCompForm({
      retroPeriodo1: item.retroPeriodo1,
      retroPeriodo2: item.retroPeriodo2,
    });
    setShowCompModal(true);
  }

  function closeCompModal() {
    setShowCompModal(false);
    setCompItem(null);
  }

  async function handleSaveComp() {
    if (!compItem) return;
    setSavingComp(true);
    setError('');
    try {
      const res = await fetch(
        `${API_BASE}/admin/grupos/${grupoId}/alumnos/${alumnoId}/competencias/${compItem.id}`,
        {
          method: 'PUT',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify(compForm),
        },
      );
      if (!res.ok) throw new Error('Error al guardar competencia');
      closeCompModal();
      await fetchCompetencias();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingComp(false);
    }
  }

  /* ---------- Inline eval change handler (admin only) ---------- */

  async function handleEvalChange(compId: string, field: 'valorPeriodo1' | 'valorPeriodo2', value: string) {
    // Optimistic update
    setCompetenciasAlumno((prev) =>
      prev.map((c) => (c.id === compId ? { ...c, [field]: value } : c)),
    );
    try {
      const res = await fetch(
        `${API_BASE}/admin/grupos/${grupoId}/alumnos/${alumnoId}/competencias/${compId}`,
        {
          method: 'PUT',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value }),
        },
      );
      if (!res.ok) throw new Error('Error al guardar evaluación');
    } catch (err: any) {
      setError(err.message);
      await fetchCompetencias();
    }
  }

  /* ---------- Aprendizaje planeado inline edit (admin only) ---------- */

  async function handleAprendizajePlaneadoChange(actId: string, value: number) {
    // Optimistic update
    setActividadesAlumno((prev) =>
      prev.map((a) => (a.id === actId ? { ...a, aprendizajePlaneado: value } : a)),
    );
    setActividades((prev) =>
      prev.map((a) => (a.id === actId ? { ...a, aprendizajePlaneado: value } : a)),
    );
    try {
      const res = await fetch(
        `${API_BASE}/admin/grupos/${grupoId}/alumnos/${alumnoId}/malla/${actId}`,
        {
          method: 'PUT',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ aprendizajePlaneado: value }),
        },
      );
      if (!res.ok) throw new Error('Error al guardar aprendizaje planeado');
    } catch (err: any) {
      setError(err.message);
      await fetchData();
    }
  }

  /* ---------- Semana completada inline edit (alumno) ---------- */

  async function handleSemanaCompletadaChange(actId: string, value: number) {
    setActividadesAlumno((prev) =>
      prev.map((a) => {
        if (a.id !== actId) return a;
        const updated: typeof a = { ...a, semanaCompletada: value };
        // Auto-asignar aprendizaje ganado (excepto proyectos)
        if (a.tipo !== 'proyecto') {
          updated.aprendizajeGanado = value > 0 ? a.aprendizajePlaneado : 0;
        }
        return updated;
      }),
    );
    try {
      const res = await fetch(
        `${API_BASE}/alumno/grupos/${grupoId}/malla/${actId}`,
        {
          method: 'PUT',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ semanaCompletada: value }),
        },
      );
      if (!res.ok) throw new Error('Error al guardar semana completada');
    } catch (err: any) {
      setError(err.message);
      await fetchData();
    }
  }

  /* ---------- Evidencias handlers (alumno) ---------- */

  async function handleAddEvidencia(compId: string) {
    const url = (evidenciaInputs[compId] ?? '').trim();
    if (!url) return;

    try {
      new URL(url);
    } catch {
      setError('URL no válida');
      return;
    }

    const comp = competenciasAlumno.find((c) => c.id === compId);
    if (!comp) return;

    const newEvidencias = [...(comp.evidencias ?? []), url];

    // Optimistic update
    setCompetenciasAlumno((prev) =>
      prev.map((c) => (c.id === compId ? { ...c, evidencias: newEvidencias } : c)),
    );
    setEvidenciaInputs((prev) => ({ ...prev, [compId]: '' }));

    try {
      const res = await fetch(
        `${API_BASE}/alumno/grupos/${grupoId}/competencias/${compId}`,
        {
          method: 'PUT',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ evidencias: newEvidencias }),
        },
      );
      if (!res.ok) throw new Error('Error al agregar evidencia');
    } catch (err: any) {
      setError(err.message);
      await fetchCompetencias();
    }
  }

  async function handleRemoveEvidencia(compId: string, index: number) {
    const comp = competenciasAlumno.find((c) => c.id === compId);
    if (!comp) return;

    const newEvidencias = (comp.evidencias ?? []).filter((_, i) => i !== index);

    // Optimistic update
    setCompetenciasAlumno((prev) =>
      prev.map((c) => (c.id === compId ? { ...c, evidencias: newEvidencias } : c)),
    );

    try {
      const res = await fetch(
        `${API_BASE}/alumno/grupos/${grupoId}/competencias/${compId}`,
        {
          method: 'PUT',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ evidencias: newEvidencias }),
        },
      );
      if (!res.ok) throw new Error('Error al eliminar evidencia');
    } catch (err: any) {
      setError(err.message);
      await fetchCompetencias();
    }
  }

  /* ---------- Observaciones handlers (admin only) ---------- */

  function openObsModal(item: ActividadAlumnoData) {
    setObsItem(item);
    setObsText(item.observaciones);
    setShowObsModal(true);
  }

  function closeObsModal() {
    setShowObsModal(false);
    setObsItem(null);
  }

  async function handleSaveObs() {
    if (!obsItem) return;
    setSavingObs(true);
    setError('');
    try {
      const res = await fetch(
        `${API_BASE}/admin/grupos/${grupoId}/alumnos/${alumnoId}/malla/${obsItem.id}`,
        {
          method: 'PUT',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ observaciones: obsText }),
        },
      );
      if (!res.ok) throw new Error('Error al guardar observaciones');
      closeObsModal();
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingObs(false);
    }
  }

  /* ---------- Compute totals ---------- */

  function getActividadesTotals(periodo: PeriodoConfig, periodoIdx: number) {
    const ownIds = new Set(periodo.actividades);
    let ownPoints = 0;
    for (const act of actividades) {
      if (ownIds.has(act.id)) ownPoints += act.aprendizajePlaneado;
    }

    let inheritedPoints = 0;
    if (periodo.acumulativo && periodoIdx > 0) {
      for (let pi = 0; pi < periodoIdx; pi++) {
        const prevIds = new Set(periodos[pi].actividades);
        for (const act of actividades) {
          if (prevIds.has(act.id) && !ownIds.has(act.id)) {
            inheritedPoints += act.aprendizajePlaneado;
          }
        }
      }
    }

    return { ownPoints, inheritedPoints, totalPoints: ownPoints + inheritedPoints };
  }

  /* ---------- Table columns for alumno (admin view) ---------- */

  const columnHelper = createColumnHelper<ActividadAlumnoData>();

  const adminAlumnoColumns = [
    columnHelper.display({
      id: 'index',
      header: '#',
      cell: (info) => info.row.index + 1,
      enableSorting: false,
    }),
    columnHelper.accessor('tipo', {
      header: 'Tipo',
      cell: (info) => {
        const tipo = info.getValue();
        const config = TIPO_CONFIG[tipo];
        if (!config) return tipo;
        return (
          <span
            className={styles.tipoChip}
            style={{
              '--chip-color': config.color,
              '--chip-bg': config.bg,
            } as React.CSSProperties}
          >
            {config.label}
          </span>
        );
      },
    }),
    columnHelper.accessor('nombre', {
      header: 'Actividad',
      cell: (info) => <span className={styles.nombreCell}>{info.getValue()}</span>,
    }),
    columnHelper.accessor('aprendizajePlaneado', {
      header: 'Aprend. Planeado',
      cell: (info) => {
        const row = info.row.original;
        return (
          <input
            type="number"
            className={styles.inlineNumberInput}
            defaultValue={info.getValue()}
            min={0}
            onBlur={(e) => {
              const val = Number(e.target.value);
              if (!isNaN(val) && val !== info.getValue()) {
                handleAprendizajePlaneadoChange(row.id, val);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        );
      },
    }),
    columnHelper.accessor('semanaPlaneada', {
      header: 'Sem. Planeada',
      cell: (info) => info.getValue() || '—',
    }),
    columnHelper.accessor('aprendizajeGanado', {
      header: 'Aprend. Ganado',
      cell: (info) => {
        const val = info.getValue();
        return val === 0 ? <span className={styles.zeroValue}>0</span> : val;
      },
    }),
    columnHelper.accessor('semanaCompletada', {
      header: 'Sem. Completada',
      cell: (info) => {
        const val = info.getValue();
        return val === 0 ? <span className={styles.zeroValue}>0</span> : val;
      },
    }),
    columnHelper.accessor('observaciones', {
      header: 'Observaciones',
      cell: (info) => {
        const val = info.getValue();
        return val ? <span className={styles.obsCell}>{val}</span> : <span className={styles.zeroValue}>—</span>;
      },
    }),
  ];

  /* ---------- Table columns for alumno (alumno's own view) ---------- */

  const alumnoOwnColumns = [
    columnHelper.display({
      id: 'index',
      header: '#',
      cell: (info) => info.row.index + 1,
      enableSorting: false,
    }),
    columnHelper.accessor('tipo', {
      header: 'Tipo',
      cell: (info) => {
        const tipo = info.getValue();
        const config = TIPO_CONFIG[tipo];
        if (!config) return tipo;
        return (
          <span
            className={styles.tipoChip}
            style={{
              '--chip-color': config.color,
              '--chip-bg': config.bg,
            } as React.CSSProperties}
          >
            {config.label}
          </span>
        );
      },
    }),
    columnHelper.accessor('nombre', {
      header: 'Actividad',
      cell: (info) => <span className={styles.nombreCell}>{info.getValue()}</span>,
    }),
    columnHelper.accessor('aprendizajePlaneado', {
      header: 'Aprend. Planeado',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor('semanaPlaneada', {
      header: 'Sem. Planeada',
      cell: (info) => info.getValue() || '—',
    }),
    columnHelper.accessor('aprendizajeGanado', {
      header: 'Aprend. Ganado',
      cell: (info) => {
        const val = info.getValue();
        return val === 0 ? <span className={styles.zeroValue}>0</span> : val;
      },
    }),
    columnHelper.accessor('semanaCompletada', {
      header: 'Sem. Completada',
      cell: (info) => {
        const row = info.row.original;
        return (
          <input
            type="number"
            className={styles.inlineNumberInput}
            defaultValue={info.getValue()}
            min={0}
            onBlur={(e) => {
              const val = Number(e.target.value);
              if (!isNaN(val) && val !== info.getValue()) {
                handleSemanaCompletadaChange(row.id, val);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        );
      },
    }),
    columnHelper.accessor('observaciones', {
      header: 'Observaciones',
      cell: (info) => {
        const val = info.getValue();
        return val ? <span className={styles.obsCell}>{val}</span> : <span className={styles.zeroValue}>—</span>;
      },
    }),
  ];

  const getAlumnoActions = (row: ActividadAlumnoData): ActionItem[] => [
    { label: 'Editar observaciones', icon: 'edit_note', onClick: () => openObsModal(row) },
  ];

  /* ---------- Table columns for competencias (admin) ---------- */

  const compColumnHelper = createColumnHelper<CompetenciaAlumnoData>();

  const adminCompColumns = [
    compColumnHelper.accessor('competencia', { header: 'Competencia' }),
    compColumnHelper.accessor('nivel', { header: 'Nivel' }),
    compColumnHelper.accessor('fechaIdealEvaluacion', {
      header: 'Fecha Ideal',
      cell: (info) => {
        const val = info.getValue();
        return val || <span className={styles.zeroValue}>—</span>;
      },
    }),
    compColumnHelper.accessor('valorPeriodo1', {
      header: 'Eval. P1',
      cell: (info) => {
        const row = info.row.original;
        return (
          <select
            className={styles.evalSelect}
            value={String(info.getValue() ?? '')}
            onChange={(e) => handleEvalChange(row.id, 'valorPeriodo1', e.target.value)}
          >
            {EVALUACION_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      },
    }),
    compColumnHelper.accessor('retroPeriodo1', {
      header: 'Retro P1',
      cell: (info) => {
        const val = info.getValue();
        return val ? <span className={styles.obsCell}>{val}</span> : <span className={styles.zeroValue}>—</span>;
      },
    }),
    compColumnHelper.accessor('valorPeriodo2', {
      header: 'Eval. P2',
      cell: (info) => {
        const row = info.row.original;
        return (
          <select
            className={styles.evalSelect}
            value={String(info.getValue() ?? '')}
            onChange={(e) => handleEvalChange(row.id, 'valorPeriodo2', e.target.value)}
          >
            {EVALUACION_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      },
    }),
    compColumnHelper.accessor('retroPeriodo2', {
      header: 'Retro P2',
      cell: (info) => {
        const val = info.getValue();
        return val ? <span className={styles.obsCell}>{val}</span> : <span className={styles.zeroValue}>—</span>;
      },
    }),
    compColumnHelper.display({
      id: 'evidencias',
      header: 'Evidencias',
      cell: (info) => {
        const row = info.row.original;
        const evs = row.evidencias ?? [];
        if (evs.length === 0) return <span className={styles.zeroValue}>—</span>;
        return (
          <div className={styles.evidenciasList}>
            {evs.map((url, i) => (
              <div key={i} className={styles.evidenciaRow}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.evidenciaLink}
                  title={url}
                >
                  {url.length > 40 ? url.slice(0, 40) + '...' : url}
                </a>
              </div>
            ))}
          </div>
        );
      },
      enableSorting: false,
    }),
  ];

  /* ---------- Table columns for competencias (alumno) ---------- */

  const alumnoCompColumns = [
    compColumnHelper.accessor('competencia', { header: 'Competencia' }),
    compColumnHelper.accessor('nivel', { header: 'Nivel' }),
    compColumnHelper.accessor('fechaIdealEvaluacion', {
      header: 'Fecha Ideal',
      cell: (info) => {
        const val = info.getValue();
        return val || <span className={styles.zeroValue}>—</span>;
      },
    }),
    compColumnHelper.accessor('valorPeriodo1', {
      header: 'Eval. P1',
      cell: (info) => {
        const val = info.getValue();
        const label = evalLabel(val);
        return label ? <span className={styles.evalChip}>{label}</span> : <span className={styles.zeroValue}>Sin evaluar</span>;
      },
    }),
    compColumnHelper.accessor('retroPeriodo1', {
      header: 'Retro P1',
      cell: (info) => {
        const val = info.getValue();
        return val ? <span className={styles.obsCell}>{val}</span> : <span className={styles.zeroValue}>—</span>;
      },
    }),
    compColumnHelper.accessor('valorPeriodo2', {
      header: 'Eval. P2',
      cell: (info) => {
        const val = info.getValue();
        const label = evalLabel(val);
        return label ? <span className={styles.evalChip}>{label}</span> : <span className={styles.zeroValue}>Sin evaluar</span>;
      },
    }),
    compColumnHelper.accessor('retroPeriodo2', {
      header: 'Retro P2',
      cell: (info) => {
        const val = info.getValue();
        return val ? <span className={styles.obsCell}>{val}</span> : <span className={styles.zeroValue}>—</span>;
      },
    }),
    compColumnHelper.display({
      id: 'evidencias',
      header: 'Evidencias',
      cell: (info) => {
        const row = info.row.original;
        const evs = row.evidencias ?? [];
        return (
          <div className={styles.evidenciasList}>
            {evs.map((url, i) => (
              <div key={i} className={styles.evidenciaRow}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.evidenciaLink}
                  title={url}
                >
                  {url.length > 40 ? url.slice(0, 40) + '...' : url}
                </a>
                <button
                  className={styles.evidenciaRemove}
                  onClick={() => handleRemoveEvidencia(row.id, i)}
                  title="Eliminar"
                >
                  &times;
                </button>
              </div>
            ))}
            <div className={styles.evidenciaAddRow}>
              <input
                type="url"
                className={styles.evidenciaInput}
                placeholder="https://..."
                value={evidenciaInputs[row.id] ?? ''}
                onChange={(e) =>
                  setEvidenciaInputs((prev) => ({ ...prev, [row.id]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddEvidencia(row.id);
                }}
              />
              <button
                className={styles.evidenciaAddBtn}
                onClick={() => handleAddEvidencia(row.id)}
              >
                Agregar
              </button>
            </div>
          </div>
        );
      },
      enableSorting: false,
    }),
  ];

  const getCompActions = (row: CompetenciaAlumnoData): ActionItem[] => [
    { label: 'Editar retro', icon: 'edit_note', onClick: () => openCompModal(row) },
  ];

  /* ---------- Derived ---------- */

  const totalPesoFinal = periodos.reduce((sum, p) => sum + p.pesoFinal, 0);

  /* ---------- Calificación acumulada actual ---------- */

  function parseCompetenciaPercent(valor: string | number): number {
    if (typeof valor === 'number') return valor;
    if (!valor) return 0;
    const match = valor.match(/\((\d+)%\)/);
    return match ? Number(match[1]) : 0;
  }

  function calcPeriodoScore(periodo: PeriodoConfig, periodoIdx: number) {
    // Actividades: ganado / planeado
    const ownIds = new Set(periodo.actividades);
    let totalPlaneado = 0;
    let totalGanado = 0;
    const actSource = hasAlumnoData ? actividadesAlumno : [];
    const faltantes: { nombre: string; tipo: string; ganado: number; planeado: number }[] = [];

    for (const act of actSource) {
      if (ownIds.has(act.actividadGrupoId)) {
        totalPlaneado += act.aprendizajePlaneado;
        totalGanado += act.aprendizajeGanado;
        if (act.aprendizajeGanado < act.aprendizajePlaneado) {
          faltantes.push({ nombre: act.nombre, tipo: act.tipo, ganado: act.aprendizajeGanado, planeado: act.aprendizajePlaneado });
        }
      }
    }
    // Acumulativo: sumar periodos anteriores
    if (periodo.acumulativo && periodoIdx > 0) {
      for (let pi = 0; pi < periodoIdx; pi++) {
        const prevIds = new Set(periodos[pi].actividades);
        for (const act of actSource) {
          if (prevIds.has(act.actividadGrupoId) && !ownIds.has(act.actividadGrupoId)) {
            totalPlaneado += act.aprendizajePlaneado;
            totalGanado += act.aprendizajeGanado;
            if (act.aprendizajeGanado < act.aprendizajePlaneado) {
              faltantes.push({ nombre: act.nombre, tipo: act.tipo, ganado: act.aprendizajeGanado, planeado: act.aprendizajePlaneado });
            }
          }
        }
      }
    }
    const actScore = totalPlaneado > 0 ? (totalGanado / totalPlaneado) * 100 : 0;

    // Competencias: promedio de valores del periodo
    const compIds = new Set(periodo.competencias);
    const compSource = hasAlumnoData ? competenciasAlumno : [];
    let compSum = 0;
    let compCount = 0;
    const valorField = periodoIdx === 0 ? 'valorPeriodo1' : 'valorPeriodo2';
    for (const comp of compSource) {
      if (compIds.has(comp.competenciaId)) {
        const pct = parseCompetenciaPercent(comp[valorField]);
        compSum += pct;
        compCount++;
      }
    }
    const compScore = compCount > 0 ? compSum / compCount : 0;

    // Ponderado del periodo
    const periodoScore = (actScore * periodo.pesoActividades + compScore * periodo.pesoCompetencias) / 100;

    return { actScore, compScore, periodoScore, totalPlaneado, totalGanado, faltantes };
  }

  const periodoScores = periodos.map((p, i) => ({ ...calcPeriodoScore(p, i), nombre: p.nombre || `P${i + 1}`, pesoFinal: p.pesoFinal }));
  const calificacionActual = periodoScores.reduce((sum, ps) => sum + (ps.periodoScore * ps.pesoFinal) / 100, 0);

  /* ---------- Render ---------- */

  if (loading) {
    return (
      <div className={styles.page}>
        <h1 className={styles.pageTitle}>Malla de Evaluación</h1>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Malla de Evaluación</h1>
      {hasAlumnoData && alumnoInfo && (
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Alumno: <strong>{alumnoInfo.name}</strong> ({alumnoInfo.email})
        </p>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {/* Calificación Final overview */}
      {periodos.length > 0 && (
        <div className={styles.finalCard}>
          <div className={styles.finalHeader}>
            <span className="material-icons" style={{ fontSize: '20px' }}>functions</span>
            <h2 className={styles.finalTitle}>Calificación Final</h2>
          </div>
          <div className={styles.finalFormula}>
            <span className={styles.finalFormulaText}>
              Final ={' '}
              {periodos.map((p, i) => (
                <span key={i}>
                  {i > 0 && ' + '}
                  <strong>{p.nombre || `P${i + 1}`}</strong> × {p.pesoFinal}%
                </span>
              ))}
            </span>
          </div>
          <div className={styles.finalWeightsRow}>
            {periodos.map((p, i) => {
              const totals = getActividadesTotals(p, i);
              return (
                <div key={i} className={styles.finalWeightItem}>
                  <span className={styles.finalWeightName}>{p.nombre || `P${i + 1}`}</span>
                  <span className={styles.finalWeightValue}>{p.pesoFinal}%</span>
                  <span className={styles.finalWeightDetail}>
                    Comp. {p.pesoCompetencias}% ({p.competencias.length} sel.)
                    {' · '}
                    Act. {p.pesoActividades}% ({totals.totalPoints} pts)
                  </span>
                </div>
              );
            })}
            <div className={styles.finalWeightTotal}>
              <span className={styles.finalWeightName}>Total</span>
              <span className={totalPesoFinal === 100 ? styles.finalWeightOk : styles.finalWeightError}>
                {totalPesoFinal}%
              </span>
              {totalPesoFinal !== 100 && (
                <span className={styles.finalWeightWarn}>Debe sumar 100%</span>
              )}
            </div>
          </div>
          <div className={styles.finalDesglose}>
            {periodos.map((p, i) => (
              <div key={i} className={styles.finalDesgloseItem}>
                <span className={styles.finalDesgloseName}>{p.nombre || `P${i + 1}`}</span>
                <span className={styles.finalDesgloseFormula}>
                  = Competencias × {p.pesoCompetencias}% + Actividades × {p.pesoActividades}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calificación acumulada actual */}
      {hasAlumnoData && periodos.length > 0 && (
        <div className={styles.currentGradeCard}>
          <div className={styles.currentGradeHeader}>
            <span className="material-icons" style={{ fontSize: '20px' }}>trending_up</span>
            <h3 className={styles.currentGradeTitle}>Calificación Acumulada Actual</h3>
            <span className={styles.currentGradeValue}>
              {calificacionActual.toFixed(1)}
            </span>
          </div>
          <div className={styles.currentGradeBreakdown}>
            {periodoScores.map((ps, i) => (
              <div key={i} className={styles.currentGradePeriodo}>
                <div className={styles.currentGradePeriodoHeader}>
                  <span className={styles.currentGradePeriodoName}>{ps.nombre}</span>
                  <span className={styles.currentGradePeriodoPercent}>
                    {ps.periodoScore.toFixed(1)}%
                  </span>
                </div>
                <span className={styles.currentGradePoints}>
                  Aprendizaje: {ps.totalGanado} / {ps.totalPlaneado} pts
                </span>
                {ps.faltantes.length > 0 && (
                  <details className={styles.faltantesDetails}>
                    <summary className={styles.faltantesSummary}>
                      {ps.faltantes.length} actividad(es) incompleta(s)
                    </summary>
                    <ul className={styles.faltantesList}>
                      {ps.faltantes.map((f, j) => (
                        <li key={j}>
                          <span className={styles.faltanteTipo}>{TIPO_CONFIG[f.tipo as ActividadTipo]?.label ?? f.tipo}</span>
                          {f.nombre} — {f.ganado}/{f.planeado} pts
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <div className={styles.currentGradeDetails}>
                  <span>Act: {ps.actScore.toFixed(1)}% × {periodos[i].pesoActividades}%</span>
                  <span>Comp: {ps.compScore.toFixed(1)}% × {periodos[i].pesoCompetencias}%</span>
                </div>
                <div className={styles.currentGradeBar}>
                  <div
                    className={styles.currentGradeBarFill}
                    style={{ width: `${Math.min(ps.periodoScore, 100)}%` }}
                  />
                </div>
                <span className={styles.currentGradePeriodoScore}>
                  {ps.periodoScore.toFixed(1)} × {ps.pesoFinal}% = {((ps.periodoScore * ps.pesoFinal) / 100).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'actividades' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('actividades')}
        >
          Actividades
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'competencias' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('competencias')}
        >
          Competencias
        </button>
      </div>

      {/* Tab panel */}
      <div className={styles.tabPanel}>
        {/* Actividades tab — admin viewing alumno */}
        {activeTab === 'actividades' && !isAlumno && alumnoId && (
          <AdminTable
            title={`Actividades del Alumno${alumnoInfo ? ` — ${alumnoInfo.name}` : ''}`}
            columns={adminAlumnoColumns}
            data={actividadesAlumno}
            searchPlaceholder="Buscar actividad..."
            emptyMessage="No hay actividades de evaluación para este alumno"
            pagination={false}
            actions={getAlumnoActions}
          />
        )}
        {/* Actividades tab — alumno viewing own */}
        {activeTab === 'actividades' && isAlumno && (
          <AdminTable
            title={`Mis Actividades${alumnoInfo ? ` — ${alumnoInfo.name}` : ''}`}
            columns={alumnoOwnColumns}
            data={actividadesAlumno}
            searchPlaceholder="Buscar actividad..."
            emptyMessage="No hay actividades de evaluación asignadas"
            pagination={false}
          />
        )}
        {/* Actividades tab — no alumno context */}
        {activeTab === 'actividades' && !isAlumno && !alumnoId && (
          <div className={styles.placeholder}>
            <span className="material-icons" style={{ fontSize: '48px', opacity: 0.4 }}>assignment</span>
            <p>Panel de actividades — próximamente</p>
          </div>
        )}

        {/* Competencias tab — admin viewing alumno */}
        {activeTab === 'competencias' && !isAlumno && alumnoId && (
          loadingCompetencias ? (
            <p>Cargando competencias...</p>
          ) : (
            <AdminTable
              title={`Competencias del Alumno${alumnoInfo ? ` — ${alumnoInfo.name}` : ''}`}
              columns={adminCompColumns}
              data={competenciasAlumno}
              searchPlaceholder="Buscar competencia..."
              emptyMessage="No hay competencias asignadas a este alumno"
              pagination={false}
              actions={getCompActions}
            />
          )
        )}
        {/* Competencias tab — alumno viewing own */}
        {activeTab === 'competencias' && isAlumno && (
          loadingCompetencias ? (
            <p>Cargando competencias...</p>
          ) : (
            <>
              {/* Indicaciones block — colapsable, forzar lectura la primera vez */}
              {indicaciones.length > 0 && (
                <div className={`${styles.indicacionesBlock} ${!indicacionesLeidas ? styles.indicacionesUnread : ''}`}>
                  <button
                    type="button"
                    className={styles.indicacionesToggle}
                    onClick={() => {
                      const willOpen = !indicacionesOpen;
                      setIndicacionesOpen(willOpen);
                      if (willOpen && !indicacionesLeidas) {
                        setIndicacionesLeidas(true);
                        localStorage.setItem(`indicaciones-leidas-${grupoId}`, 'true');
                      }
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: '18px' }}>
                      {indicacionesOpen ? 'expand_less' : 'expand_more'}
                    </span>
                    <span className="material-icons" style={{ fontSize: '18px' }}>info</span>
                    <strong>Indicaciones — leer antes de evaluar</strong>
                    {!indicacionesLeidas && (
                      <span className={styles.indicacionesBadge}>Sin leer</span>
                    )}
                  </button>
                  {indicacionesOpen && (
                    <ul className={styles.indicacionesList}>
                      {indicaciones.map((ind) => (
                        <li key={ind.id} className={styles.indicacionItem}>
                          {ind.descripcion}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <AdminTable
                title={`Mis Competencias${alumnoInfo ? ` — ${alumnoInfo.name}` : ''}`}
                columns={alumnoCompColumns}
                data={competenciasAlumno}
                searchPlaceholder="Buscar competencia..."
                emptyMessage="No hay competencias asignadas"
                pagination={false}
              />
            </>
          )
        )}
        {/* Competencias tab — no alumno context */}
        {activeTab === 'competencias' && !isAlumno && !alumnoId && (
          <div className={styles.placeholder}>
            <span className="material-icons" style={{ fontSize: '48px', opacity: 0.4 }}>school</span>
            <p>Panel de competencias — próximamente</p>
          </div>
        )}
      </div>

      {/* Modal for editing observaciones (admin only) */}
      <Modal
        isOpen={showObsModal}
        onClose={closeObsModal}
        title={`Observaciones — ${obsItem?.nombre ?? ''}`}
      >
        <div className={styles.form}>
          <label className={styles.formLabel}>
            Observaciones
            <textarea
              className={styles.formTextarea}
              value={obsText}
              onChange={(e) => setObsText(e.target.value)}
              placeholder="Escribe observaciones sobre esta actividad..."
            />
          </label>
          <div className={styles.formActions}>
            <DashButton variant="outline" onClick={closeObsModal}>
              Cancelar
            </DashButton>
            <DashButton onClick={handleSaveObs} disabled={savingObs}>
              {savingObs ? 'Guardando...' : 'Guardar'}
            </DashButton>
          </div>
        </div>
      </Modal>

      {/* Modal for editing competencia retro (admin only) */}
      <Modal
        isOpen={showCompModal}
        onClose={closeCompModal}
        title={`Retroalimentación — ${compItem?.competencia ?? ''}`}
      >
        <div className={styles.form}>
          <label className={styles.formLabel}>
            Retroalimentación Periodo 1
            <textarea
              className={styles.formTextarea}
              value={compForm.retroPeriodo1}
              onChange={(e) => setCompForm({ ...compForm, retroPeriodo1: e.target.value })}
              placeholder="Retroalimentación del periodo 1..."
            />
          </label>
          <label className={styles.formLabel}>
            Retroalimentación Periodo 2
            <textarea
              className={styles.formTextarea}
              value={compForm.retroPeriodo2}
              onChange={(e) => setCompForm({ ...compForm, retroPeriodo2: e.target.value })}
              placeholder="Retroalimentación del periodo 2..."
            />
          </label>
          <div className={styles.formActions}>
            <DashButton variant="outline" onClick={closeCompModal}>
              Cancelar
            </DashButton>
            <DashButton onClick={handleSaveComp} disabled={savingComp}>
              {savingComp ? 'Guardando...' : 'Guardar'}
            </DashButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
