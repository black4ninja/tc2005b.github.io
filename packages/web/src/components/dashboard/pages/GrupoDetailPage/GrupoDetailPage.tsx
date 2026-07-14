import { useState, useEffect, useCallback, useMemo } from 'react';
import { confirmar, avisar, escapar } from '../../../../utils/dialogos';
import { useParams, useNavigate } from 'react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import Modal from '../../atoms/Modal/Modal';
import AlumnoForm from '../../organisms/AlumnoForm/AlumnoForm';
import CSVImportModal from '../../organisms/CSVImportModal/CSVImportModal';
import CompetenciasQuickModal from '../../organisms/CompetenciasQuickModal/CompetenciasQuickModal';
import ProfileInfoCell from '../../atoms/ProfileInfoCell/ProfileInfoCell';
import DashButton from '../../atoms/DashButton/DashButton';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import {
  buildMallaWorkbook,
  downloadBlob,
  exportMallaAlumnoXlsx,
  fetchMallaExportData,
  fetchPlanPeriodos,
  mallaFileName,
  sanitizeFileName,
} from '../../../../utils/mallaExport';
import styles from './GrupoDetailPage.module.css';

interface AlumnoData {
  id: string;
  name: string;
  email: string;
  matricula: string;
  active: boolean;
  repositorioIndividual: string;
  experiencia: string;
  expectativas: string;
  compromiso: string;
  situacionesEspeciales: string;
  perfilCompleto: boolean;
}

interface GrupoInfo {
  id: string;
  name: string;
}

interface PeriodoInfo {
  nombre: string;
  pesoFinal: number;
}

interface CalificacionAlumno {
  alumnoId: string;
  periodos: number[];
  final: number;
}

interface MallaStatus {
  totalAlumnos: number;
  alumnosConMalla: number;
  alumnosSinMalla: number;
}

interface CompetenciaStatus {
  totalAlumnos: number;
  alumnosConCompetencias: number;
  alumnosSinCompetencias: number;
}

interface AlumnoEquipoInfo {
  equipoId: string;
  nombre: string;
  repositorio: string;
}

const API_BASE = '/api';

export default function GrupoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessionToken } = useAuth();

  const [grupo, setGrupo] = useState<GrupoInfo | null>(null);
  const [alumnos, setAlumnos] = useState<AlumnoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [alumnoModalOpen, setAlumnoModalOpen] = useState(false);
  const [editAlumno, setEditAlumno] = useState<AlumnoData | undefined>();
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [createdPassword, setCreatedPassword] = useState('');
  const [toast, setToast] = useState('');

  const [mallaStatus, setMallaStatus] = useState<MallaStatus | null>(null);
  const [creatingMallas, setCreatingMallas] = useState(false);

  const [competenciaStatus, setCompetenciaStatus] = useState<CompetenciaStatus | null>(null);
  const [creatingCompetencias, setCreatingCompetencias] = useState(false);

  const [propagarModalOpen, setPropagarModalOpen] = useState(false);
  const [propagarLoading, setPropagarLoading] = useState(false);
  const [periodoOrigen, setPeriodoOrigen] = useState('valorPeriodo1');
  const [periodoDestino, setPeriodoDestino] = useState('valorPeriodo2');
  const [competenciasList, setCompetenciasList] = useState<{ id: string; competencia: string; esCalculada: boolean }[]>([]);
  const [selectedCompetenciaId, setSelectedCompetenciaId] = useState('');

  const [periodos, setPeriodos] = useState<PeriodoInfo[]>([]);
  const [calificacionesMap, setCalificacionesMap] = useState<Map<string, CalificacionAlumno>>(new Map());
  const [equiposMap, setEquiposMap] = useState<Map<string, AlumnoEquipoInfo>>(new Map());

  // Filtro por equipo — NO persistente (sólo durante esta visita).
  // '' = todos, '__none__' = sin equipo, otro valor = equipoId.
  const [equipoFilter, setEquipoFilter] = useState<string>('');

  // Modal de competencias rápidas
  const [compModalAlumno, setCompModalAlumno] = useState<AlumnoData | null>(null);

  // Export de mallas a XLSX
  const [exportingMallas, setExportingMallas] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [exportingAlumnoId, setExportingAlumnoId] = useState<string | null>(null);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  };

  const fetchMallaStatus = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${id}/mallas-evaluacion/status`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (res.ok) {
        const data = await res.json();
        setMallaStatus({
          totalAlumnos: data.totalAlumnos,
          alumnosConMalla: data.alumnosConMalla,
          alumnosSinMalla: data.alumnosSinMalla,
        });
      }
    } catch {
      // silently fail — status is non-critical
    }
  }, [id, sessionToken]);

  const fetchCompetenciaStatus = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${id}/competencias-alumno/status`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (res.ok) {
        const data = await res.json();
        setCompetenciaStatus({
          totalAlumnos: data.totalAlumnos,
          alumnosConCompetencias: data.alumnosConCompetencias,
          alumnosSinCompetencias: data.alumnosSinCompetencias,
        });
      }
    } catch {
      // silently fail — status is non-critical
    }
  }, [id, sessionToken]);

  const fetchCalificaciones = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${id}/calificaciones`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (res.ok) {
        const data = await res.json();
        setPeriodos(data.periodos ?? []);
        const map = new Map<string, CalificacionAlumno>();
        for (const cal of (data.calificaciones ?? [])) {
          map.set(cal.alumnoId, cal);
        }
        setCalificacionesMap(map);
      }
    } catch {
      // non-critical
    }
  }, [id, sessionToken]);

  const fetchEquipos = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${id}/equipos`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) return;
      const data = await res.json();
      const map = new Map<string, AlumnoEquipoInfo>();
      for (const eq of data.equipos ?? []) {
        const info: AlumnoEquipoInfo = {
          equipoId: eq?.id ?? '',
          nombre: typeof eq?.nombre === 'string' ? eq.nombre : '',
          repositorio: typeof eq?.repositorio === 'string' ? eq.repositorio : '',
        };
        const miembros = Array.isArray(eq?.miembros) ? eq.miembros : [];
        for (const m of miembros) {
          const aid = m?.id;
          if (typeof aid === 'string' && aid && !map.has(aid)) {
            // Si un alumno aparece en >1 equipo (no debería), conserva el primero (más reciente
            // por createdAt descendente del backend).
            map.set(aid, info);
          }
        }
      }
      setEquiposMap(map);
    } catch {
      // non-critical — la columna mostrará "—" para todos
    }
  }, [id, sessionToken]);

  const fetchAlumnos = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [grupoRes, alumnosRes] = await Promise.all([
        fetch(`${API_BASE}/admin/grupos`, { headers: { 'x-session-token': sessionToken ?? '' } }),
        fetch(`${API_BASE}/admin/grupos/${id}/alumnos`, { headers: { 'x-session-token': sessionToken ?? '' } }),
      ]);

      if (grupoRes.ok) {
        const grupoData = await grupoRes.json();
        const found = grupoData.grupos?.find((g: any) => g.id === id);
        if (found) setGrupo({ id: found.id, name: found.name });
      }

      if (!alumnosRes.ok) throw new Error('Error al cargar alumnos');
      const data = await alumnosRes.json();
      setAlumnos(data.alumnos);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, sessionToken]);

  useEffect(() => {
    fetchAlumnos();
  }, [fetchAlumnos]);

  useEffect(() => {
    fetchEquipos();
  }, [fetchEquipos]);

  useEffect(() => {
    fetchMallaStatus();
  }, [fetchMallaStatus]);

  useEffect(() => {
    fetchCompetenciaStatus();
  }, [fetchCompetenciaStatus]);

  useEffect(() => {
    fetchCalificaciones();
  }, [fetchCalificaciones]);

  async function handleCrearCompetencias() {
    if (!(await confirmar({ titulo: '¿Crear competencias para los alumnos pendientes?', confirmar: 'Crear' }))) return;
    setCreatingCompetencias(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${id}/competencias-alumno`, {
        method: 'POST',
        headers,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Error al crear competencias');

      setToast(`Competencias creadas: ${result.created} alumnos, ${result.skipped} ya tenían`);
      setTimeout(() => setToast(''), 3000);
      await fetchCompetenciaStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingCompetencias(false);
    }
  }

  async function fetchCompetenciasList() {
    try {
      const res = await fetch(`${API_BASE}/admin/competencias?grupoId=${id}`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (res.ok) {
        const data = await res.json();
        setCompetenciasList(
          (data.competencias ?? []).map((c: any) => ({ id: c.id, competencia: c.competencia, esCalculada: c.esCalculada }))
        );
      }
    } catch {
      // non-critical
    }
  }

  function openPropagarModal() {
    setSelectedCompetenciaId('');
    setPropagarModalOpen(true);
    fetchCompetenciasList();
  }

  async function handlePropagar() {
    setPropagarLoading(true);
    setError('');
    try {
      const body: any = { periodoOrigen, periodoDestino };
      if (selectedCompetenciaId) body.competenciaId = selectedCompetenciaId;
      const res = await fetch(`${API_BASE}/admin/grupos/${id}/competencias-alumno/propagar`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Error al propagar competencias');

      setToast(`Competencias propagadas: ${result.updated} registros actualizados`);
      setTimeout(() => setToast(''), 3000);
      setPropagarModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPropagarLoading(false);
    }
  }

  async function handleCrearMallas() {
    if (!(await confirmar({ titulo: '¿Crear mallas de evaluación para los alumnos pendientes?', confirmar: 'Crear' }))) return;
    setCreatingMallas(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${id}/mallas-evaluacion`, {
        method: 'POST',
        headers,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Error al crear mallas');

      setToast(`Mallas creadas: ${result.created} alumnos, ${result.skipped} ya tenían`);
      setTimeout(() => setToast(''), 3000);
      await fetchMallaStatus();
      await fetchCompetenciaStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingMallas(false);
    }
  }

  function openCreateAlumno() {
    setEditAlumno(undefined);
    setCreatedPassword('');
    setAlumnoModalOpen(true);
  }

  function openEditAlumno(alumno: AlumnoData) {
    setEditAlumno(alumno);
    setCreatedPassword('');
    setAlumnoModalOpen(true);
  }

  function closeAlumnoModal() {
    setAlumnoModalOpen(false);
    setEditAlumno(undefined);
    setCreatedPassword('');
  }

  async function handleSaveAlumno(data: { name: string; email: string; matricula: string }) {
    setSaving(true);
    setError('');
    try {
      const url = editAlumno
        ? `${API_BASE}/admin/grupos/${id}/alumnos/${editAlumno.id}`
        : `${API_BASE}/admin/grupos/${id}/alumnos`;
      const method = editAlumno ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers, body: JSON.stringify(data) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Error al guardar');

      if (!editAlumno && result.generatedPassword) {
        setCreatedPassword(result.generatedPassword);
        await avisar({
          titulo: 'Alumno creado',
          html:
            'Contraseña generada:<br><code class="swal-codigo">' +
            escapar(result.generatedPassword) +
            '</code><span class="swal-aviso">Cópiala ahora: no vuelve a mostrarse.</span>',
          icono: 'success',
        });
      }

      closeAlumnoModal();
      await fetchAlumnos();
      await fetchMallaStatus();
      await fetchCalificaciones();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(alumno: AlumnoData) {
    const action = alumno.active ? 'Desactivar' : 'Activar';
    if (!(await confirmar({ titulo: `¿${action} al alumno "${alumno.name}"?` }))) return;
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${id}/alumnos/${alumno.id}/archive`, { method: 'PATCH', headers });
      if (!res.ok) throw new Error(`Error al ${action.toLowerCase()}`);
      await fetchAlumnos();
      await fetchMallaStatus();
      await fetchCalificaciones();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteAlumno(alumno: AlumnoData) {
    if (!(await confirmar({ titulo: `¿Eliminar al alumno "${alumno.name}"?`, texto: `Esta acción no se puede deshacer.`, confirmar: 'Eliminar', peligro: true }))) return;
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${id}/alumnos/${alumno.id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Error al eliminar');
      await fetchAlumnos();
      await fetchMallaStatus();
      await fetchCalificaciones();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDownloadTemplate() {
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${id}/alumnos/template`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) throw new Error('Error al descargar plantilla');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_alumnos.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleExportMallaAlumno(alumno: AlumnoData) {
    if (!id) return;
    setExportingAlumnoId(alumno.id);
    setError('');
    try {
      const [periodos, data] = await Promise.all([
        fetchPlanPeriodos(id, sessionToken ?? ''),
        fetchMallaExportData(id, alumno.id, sessionToken ?? ''),
      ]);
      await exportMallaAlumnoXlsx({
        alumno: { name: alumno.name, email: alumno.email, matricula: alumno.matricula },
        grupoNombre: grupo?.name ?? '',
        actividades: data.actividades,
        competencias: data.competencias,
        periodos,
      });
      setToast(`Malla de ${alumno.name} exportada`);
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExportingAlumnoId(null);
    }
  }

  async function handleExportMallasGrupo() {
    if (!id) return;
    // Respeta el filtro de equipo activo; sólo alumnos activos.
    const targets = filteredAlumnos.filter((a) => a.active);
    if (targets.length === 0) {
      setToast('No hay alumnos activos para exportar');
      setTimeout(() => setToast(''), 3000);
      return;
    }
    if (!(await confirmar({ titulo: `¿Exportar la malla de evaluación de ${targets.length} alumno(s) en un ZIP?` }))) return;

    setExportingMallas(true);
    setExportProgress(`0/${targets.length}`);
    setError('');
    try {
      const periodos = await fetchPlanPeriodos(id, sessionToken ?? '');
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const errores: string[] = [];
      let done = 0;

      const BATCH = 4;
      for (let i = 0; i < targets.length; i += BATCH) {
        const batch = targets.slice(i, i + BATCH);
        await Promise.all(
          batch.map(async (alumno) => {
            try {
              const data = await fetchMallaExportData(id, alumno.id, sessionToken ?? '');
              const buffer = await buildMallaWorkbook({
                alumno: { name: alumno.name, email: alumno.email, matricula: alumno.matricula },
                grupoNombre: grupo?.name ?? '',
                actividades: data.actividades,
                competencias: data.competencias,
                periodos,
              });
              zip.file(mallaFileName({ name: alumno.name, email: alumno.email, matricula: alumno.matricula }), buffer);
            } catch {
              errores.push(alumno.name);
            } finally {
              done++;
              setExportProgress(`${done}/${targets.length}`);
            }
          }),
        );
      }

      const exportados = targets.length - errores.length;
      if (exportados === 0) throw new Error('No se pudo exportar ninguna malla');

      const blob = await zip.generateAsync({ type: 'blob' });
      const fecha = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `Mallas_${sanitizeFileName(grupo?.name ?? 'grupo')}_${fecha}.zip`);

      setToast(
        errores.length > 0
          ? `${exportados} mallas exportadas. Fallaron: ${errores.join(', ')}`
          : `${exportados} mallas exportadas`,
      );
      setTimeout(() => setToast(''), 6000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExportingMallas(false);
      setExportProgress('');
    }
  }

  function gradeBadge(val: number | null | undefined) {
    if (val == null) return '—';
    const cls = val < 50 ? styles.gradeRed : val < 70 ? styles.gradeOrange : styles.gradeGreen;
    return <span className={`${styles.gradeBadge} ${cls}`}>{val.toFixed(1)}%</span>;
  }

  // Equipos únicos para el select (deduplicados por equipoId)
  const equiposUnicos = useMemo(() => {
    const seen = new Map<string, string>(); // equipoId → nombre
    for (const info of equiposMap.values()) {
      if (info.equipoId && !seen.has(info.equipoId)) {
        seen.set(info.equipoId, info.nombre || '(sin nombre)');
      }
    }
    return Array.from(seen.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [equiposMap]);

  // Lista filtrada de alumnos según el filtro de equipo
  const filteredAlumnos = useMemo(() => {
    if (!equipoFilter) return alumnos;
    if (equipoFilter === '__none__') {
      return alumnos.filter((a) => !equiposMap.has(a.id));
    }
    return alumnos.filter((a) => equiposMap.get(a.id)?.equipoId === equipoFilter);
  }, [alumnos, equiposMap, equipoFilter]);

  const columnHelper = createColumnHelper<AlumnoData>();

  const gradeColumns = periodos.map((p, i) =>
    columnHelper.display({
      id: `periodo_${i}`,
      header: p.nombre,
      cell: ({ row }) => {
        const cal = calificacionesMap.get(row.original.id);
        return gradeBadge(cal?.periodos[i]);
      },
    })
  );

  const finalGradeColumn = periodos.length > 0
    ? [columnHelper.display({
        id: 'calif_final',
        header: 'Calif. Final',
        cell: ({ row }) => {
          const cal = calificacionesMap.get(row.original.id);
          return gradeBadge(cal?.final ?? null);
        },
      })]
    : [];

  const columns = [
    columnHelper.accessor('name', { header: 'Nombre' }),
    columnHelper.accessor('email', {
      header: 'Correo',
      cell: (info) => (
        <span className={styles.emailCell}>
          {info.getValue()}
          <button
            className={styles.copyIcon}
            title="Copiar correo"
            onClick={() => {
              navigator.clipboard.writeText(info.getValue());
              setToast('Correo copiado');
              setTimeout(() => setToast(''), 2000);
            }}
          >
            <span className="material-icons" style={{ fontSize: 16 }}>content_copy</span>
          </button>
        </span>
      ),
    }),
    columnHelper.accessor('repositorioIndividual', {
      header: 'Repositorio',
      cell: (info) => {
        const url = info.getValue();
        if (!url) return <span className={styles.emptyField}>—</span>;
        return (
          <span className={styles.repoCell}>
            <a href={url} target="_blank" rel="noopener noreferrer" className={styles.repoLink} title={url}>
              {url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 30)}
              {url.replace(/^https?:\/\/(www\.)?/, '').length > 30 ? '…' : ''}
            </a>
            <button
              className={styles.copyIcon}
              title="Copiar URL"
              onClick={() => {
                navigator.clipboard.writeText(url);
                setToast('URL copiada');
                setTimeout(() => setToast(''), 2000);
              }}
            >
              <span className="material-icons" style={{ fontSize: 16 }}>content_copy</span>
            </button>
          </span>
        );
      },
    }),
    columnHelper.accessor('matricula', { header: 'Matrícula' }),
    columnHelper.display({
      id: 'equipo',
      header: 'Equipo',
      cell: ({ row }) => {
        const eq = equiposMap.get(row.original.id);
        if (!eq || !eq.nombre) return <span className={styles.emptyField}>—</span>;
        return <span>{eq.nombre}</span>;
      },
    }),
    columnHelper.display({
      id: 'repoEquipo',
      header: 'Repo Equipo',
      cell: ({ row }) => {
        const eq = equiposMap.get(row.original.id);
        const url = eq?.repositorio ?? '';
        if (!url) return <span className={styles.emptyField}>—</span>;
        const display = url.replace(/^https?:\/\/(www\.)?/, '');
        const short = display.length > 30 ? display.slice(0, 30) + '…' : display;
        // Solo renderizar como link si es URL válida; si no, mostrar texto plano para evitar
        // generar enlaces rotos hacia rutas relativas del propio sitio.
        const isHttpUrl = /^https?:\/\//i.test(url);
        return (
          <span className={styles.repoCell}>
            {isHttpUrl ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.repoLink}
                title={url}
              >
                {short}
              </a>
            ) : (
              <span title={url}>{short}</span>
            )}
            <button
              className={styles.copyIcon}
              title="Copiar URL"
              onClick={() => {
                navigator.clipboard.writeText(url);
                setToast('URL copiada');
                setTimeout(() => setToast(''), 2000);
              }}
            >
              <span className="material-icons" style={{ fontSize: 16 }}>content_copy</span>
            </button>
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'perfil',
      header: 'Perfil',
      cell: ({ row }) => <ProfileInfoCell alumno={row.original} />,
    }),
    ...gradeColumns,
    ...finalGradeColumn,
    columnHelper.accessor('active', {
      header: 'Estado',
      cell: (info) => (
        <span className={`${styles.badge} ${info.getValue() ? styles.badgeActive : styles.badgeInactive}`}>
          {info.getValue() ? 'Activo' : 'Dado de baja'}
        </span>
      ),
    }),
  ];

  const getActions = (alumno: AlumnoData): ActionItem[] => [
    { label: 'Editar', icon: 'edit', onClick: () => openEditAlumno(alumno) },
    { label: 'Malla de Evaluación', icon: 'grid_view', onClick: () => navigate(`/admin/grupos/${id}/alumnos/${alumno.id}/malla`) },
    {
      label: exportingAlumnoId === alumno.id ? 'Exportando...' : 'Exportar malla (XLSX)',
      icon: 'file_download',
      onClick: () => handleExportMallaAlumno(alumno),
    },
    { label: 'Competencias rápidas', icon: 'school', onClick: () => setCompModalAlumno(alumno) },
    {
      label: alumno.active ? 'Desactivar' : 'Activar',
      icon: alumno.active ? 'toggle_off' : 'toggle_on',
      onClick: () => handleToggleActive(alumno),
    },
    { label: 'Eliminar', icon: 'delete', onClick: () => handleDeleteAlumno(alumno), variant: 'danger' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <button className={styles.backBtn} onClick={() => navigate('/admin/grupos')}>
          <span className="material-icons">arrow_back</span>
        </button>
        <h1 className={styles.pageTitle}>{grupo?.name ?? 'Detalle del Grupo'}</h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.toolbar}>
        <DashButton variant="outline" onClick={handleDownloadTemplate}>
          <span className="material-icons" style={{ fontSize: 18 }}>download</span>
          Descargar Plantilla
        </DashButton>
        <DashButton variant="outline" onClick={() => setCsvModalOpen(true)}>
          <span className="material-icons" style={{ fontSize: 18 }}>upload_file</span>
          Importar CSV
        </DashButton>
        {mallaStatus && mallaStatus.alumnosSinMalla > 0 && (
          <DashButton
            variant="primary"
            onClick={handleCrearMallas}
            disabled={creatingMallas}
          >
            <span className="material-icons" style={{ fontSize: 18 }}>grid_view</span>
            {creatingMallas
              ? 'Creando...'
              : `Crear Mallas (${mallaStatus.alumnosSinMalla} pendientes)`}
          </DashButton>
        )}
        {competenciaStatus && competenciaStatus.alumnosSinCompetencias > 0 && (
          <DashButton
            variant="primary"
            onClick={handleCrearCompetencias}
            disabled={creatingCompetencias}
          >
            <span className="material-icons" style={{ fontSize: 18 }}>school</span>
            {creatingCompetencias
              ? 'Creando...'
              : `Crear Competencias (${competenciaStatus.alumnosSinCompetencias} pendientes)`}
          </DashButton>
        )}
        <DashButton variant="outline" onClick={openPropagarModal}>
          <span className="material-icons" style={{ fontSize: 18 }}>content_copy</span>
          Propagar Competencias
        </DashButton>
        <DashButton
          variant="outline"
          onClick={handleExportMallasGrupo}
          disabled={exportingMallas || loading}
        >
          <span className="material-icons" style={{ fontSize: 18 }}>file_download</span>
          {exportingMallas ? `Exportando ${exportProgress}...` : 'Exportar Mallas (XLSX)'}
        </DashButton>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <>
          {(equiposUnicos.length > 0 || equipoFilter) && (
            <div className={styles.equipoFilterBar}>
              <label className={styles.equipoFilterLabel} htmlFor="equipo-filter">
                <span className="material-icons" style={{ fontSize: 18 }}>filter_list</span>
                Filtrar por equipo
              </label>
              <select
                id="equipo-filter"
                className={styles.equipoFilterSelect}
                value={equipoFilter}
                onChange={(e) => setEquipoFilter(e.target.value)}
              >
                <option value="">Todos los equipos ({alumnos.length})</option>
                <option value="__none__">
                  Sin equipo ({alumnos.filter((a) => !equiposMap.has(a.id)).length})
                </option>
                {equiposUnicos.map((eq) => {
                  const count = alumnos.filter(
                    (a) => equiposMap.get(a.id)?.equipoId === eq.id,
                  ).length;
                  return (
                    <option key={eq.id} value={eq.id}>
                      {eq.nombre} ({count})
                    </option>
                  );
                })}
              </select>
              {equipoFilter && (
                <>
                  <span className={styles.equipoFilterCount}>
                    Mostrando {filteredAlumnos.length} de {alumnos.length}
                  </span>
                  <button
                    type="button"
                    className={styles.equipoFilterClear}
                    onClick={() => setEquipoFilter('')}
                    title="Limpiar filtro"
                  >
                    <span className="material-icons" style={{ fontSize: 16 }}>close</span>
                    Limpiar
                  </button>
                </>
              )}
            </div>
          )}
          <AdminTable
            title="Alumnos del grupo"
            columns={columns}
            data={filteredAlumnos}
            actions={getActions}
            onAdd={openCreateAlumno}
            addLabel="Agregar Alumno"
            emptyMessage={
              equipoFilter
                ? 'No hay alumnos en este filtro'
                : 'No hay alumnos registrados'
            }
            searchPlaceholder="Buscar alumno..."
            getRowClassName={(a) => (a.active ? undefined : styles.rowInactive)}
            tableId="grupo-alumnos"
          />
        </>
      )}

      <Modal isOpen={alumnoModalOpen} onClose={closeAlumnoModal} title={editAlumno ? 'Editar Alumno' : 'Nuevo Alumno'}>
        <AlumnoForm
          alumno={editAlumno}
          onSave={handleSaveAlumno}
          onCancel={closeAlumnoModal}
          loading={saving}
        />
      </Modal>

      <Modal isOpen={csvModalOpen} onClose={() => setCsvModalOpen(false)} title="Importar Alumnos desde CSV">
        <CSVImportModal
          grupoId={id!}
          sessionToken={sessionToken ?? ''}
          onDone={() => { setCsvModalOpen(false); fetchAlumnos(); fetchMallaStatus(); fetchCalificaciones(); }}
          onCancel={() => setCsvModalOpen(false)}
        />
      </Modal>

      <Modal isOpen={propagarModalOpen} onClose={() => setPropagarModalOpen(false)} title="Propagar Competencias">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
            Esto sobrescribirá los valores del periodo destino con los del periodo origen para los alumnos del grupo.
          </p>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            Competencia
            <select value={selectedCompetenciaId} onChange={e => setSelectedCompetenciaId(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--dash-border)' }}>
              <option value="">— Seleccionar competencia —</option>
              {competenciasList.filter(c => !c.esCalculada).map(c => (
                <option key={c.id} value={c.id}>{c.competencia}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            Periodo origen
            <select value={periodoOrigen} onChange={e => setPeriodoOrigen(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--dash-border)' }}>
              <option value="valorPeriodo1">Periodo 1</option>
              <option value="valorPeriodo2">Periodo 2</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            Periodo destino
            <select value={periodoDestino} onChange={e => setPeriodoDestino(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--dash-border)' }}>
              <option value="valorPeriodo1">Periodo 1</option>
              <option value="valorPeriodo2">Periodo 2</option>
            </select>
          </label>
          {periodoOrigen === periodoDestino && (
            <p style={{ margin: 0, color: 'var(--dash-danger)', fontSize: 13 }}>
              El periodo origen y destino deben ser diferentes.
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <DashButton variant="outline" onClick={() => setPropagarModalOpen(false)}>
              Cancelar
            </DashButton>
            <DashButton
              variant="primary"
              onClick={handlePropagar}
              disabled={propagarLoading || periodoOrigen === periodoDestino || !selectedCompetenciaId}
            >
              {propagarLoading ? 'Propagando...' : 'Propagar'}
            </DashButton>
          </div>
        </div>
      </Modal>

      <CompetenciasQuickModal
        open={!!compModalAlumno}
        onClose={() => setCompModalAlumno(null)}
        grupoId={id ?? ''}
        alumnoId={compModalAlumno?.id ?? ''}
        alumnoNombre={compModalAlumno?.name ?? ''}
        sessionToken={sessionToken ?? ''}
      />

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}

