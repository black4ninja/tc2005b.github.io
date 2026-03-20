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

  async function fetchCompetenciasList() {
    try {
      const res = await fetch(`${API_BASE}/admin/competencias`, {
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

  function gradeBadge(val: number | null | undefined) {
    if (val == null) return '—';
    const cls = val < 50 ? styles.gradeRed : val < 70 ? styles.gradeOrange : styles.gradeGreen;
    return <span className={`${styles.gradeBadge} ${cls}`}>{val.toFixed(1)}%</span>;
  }

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
      id: 'perfil',
      header: 'Perfil',
      cell: ({ row }) => {
        const a = row.original;
        const hasProfile = a.experiencia || a.expectativas || a.compromiso || a.situacionesEspeciales;
        return (
          <div className={styles.profileTooltipWrap}>
            <span
              className="material-icons"
              style={{ fontSize: 20, color: hasProfile ? 'var(--dash-primary)' : 'var(--text-secondary)', cursor: 'default' }}
            >
              {hasProfile ? 'info' : 'info_outline'}
            </span>
            {hasProfile && (
              <div className={styles.profileTooltip}>
                {a.experiencia && <div><strong>Experiencia:</strong> {a.experiencia}</div>}
                {a.expectativas && <div><strong>Expectativas:</strong> {a.expectativas}</div>}
                {a.compromiso && <div><strong>Compromiso:</strong> {a.compromiso}</div>}
                {a.situacionesEspeciales && <div><strong>Situaciones Especiales:</strong> {a.situacionesEspeciales}</div>}
              </div>
            )}
          </div>
        );
      },
    }),
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
        <DashButton variant="outline" onClick={openPropagarModal}>
          <span className="material-icons" style={{ fontSize: 18 }}>content_copy</span>
          Propagar Competencias
        </DashButton>
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

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
