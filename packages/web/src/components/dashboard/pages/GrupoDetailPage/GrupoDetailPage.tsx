import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import Modal from '../../atoms/Modal/Modal';
import AlumnoForm from '../../organisms/AlumnoForm/AlumnoForm';
import CSVImportModal from '../../organisms/CSVImportModal/CSVImportModal';
import DashButton from '../../atoms/DashButton/DashButton';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import styles from './GrupoDetailPage.module.css';

interface AlumnoData {
  id: string;
  name: string;
  email: string;
  matricula: string;
  active: boolean;
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

  const [periodos, setPeriodos] = useState<PeriodoInfo[]>([]);
  const [calificacionesMap, setCalificacionesMap] = useState<Map<string, CalificacionAlumno>>(new Map());

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
    fetchMallaStatus();
  }, [fetchMallaStatus]);

  useEffect(() => {
    fetchCompetenciaStatus();
  }, [fetchCompetenciaStatus]);

  useEffect(() => {
    fetchCalificaciones();
  }, [fetchCalificaciones]);

  async function handleCrearCompetencias() {
    if (!confirm('¿Crear competencias para los alumnos pendientes?')) return;
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

  async function handleCrearMallas() {
    if (!confirm('¿Crear mallas de evaluación para los alumnos pendientes?')) return;
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
        alert(`Alumno creado. Contraseña generada: ${result.generatedPassword}`);
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
    if (!confirm(`¿${action} al alumno "${alumno.name}"?`)) return;
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
    if (!confirm(`¿Eliminar al alumno "${alumno.name}"? Esta acción no se puede deshacer.`)) return;
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

  const columnHelper = createColumnHelper<AlumnoData>();

  const gradeColumns = periodos.map((p, i) =>
    columnHelper.display({
      id: `periodo_${i}`,
      header: p.nombre,
      cell: ({ row }) => {
        const cal = calificacionesMap.get(row.original.id);
        const val = cal?.periodos[i];
        return val != null ? `${val.toFixed(1)}%` : '—';
      },
    })
  );

  const finalGradeColumn = periodos.length > 0
    ? [columnHelper.display({
        id: 'calif_final',
        header: 'Calif. Final',
        cell: ({ row }) => {
          const cal = calificacionesMap.get(row.original.id);
          return cal != null ? `${cal.final.toFixed(1)}%` : '—';
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
    columnHelper.accessor('matricula', { header: 'Matrícula' }),
    ...gradeColumns,
    ...finalGradeColumn,
    columnHelper.accessor('active', {
      header: 'Estado',
      cell: (info) => (
        <span className={`${styles.badge} ${info.getValue() ? styles.badgeActive : styles.badgeInactive}`}>
          {info.getValue() ? 'Activo' : 'Inactivo'}
        </span>
      ),
    }),
  ];

  const getActions = (alumno: AlumnoData): ActionItem[] => [
    { label: 'Editar', icon: 'edit', onClick: () => openEditAlumno(alumno) },
    { label: 'Malla de Evaluación', icon: 'grid_view', onClick: () => navigate(`/admin/grupos/${id}/alumnos/${alumno.id}/malla`) },
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
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <AdminTable
          title="Alumnos del grupo"
          columns={columns}
          data={alumnos}
          actions={getActions}
          onAdd={openCreateAlumno}
          addLabel="Agregar Alumno"
          emptyMessage="No hay alumnos registrados"
          searchPlaceholder="Buscar alumno..."
        />
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

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
