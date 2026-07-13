import { useState, useEffect, useCallback } from 'react';
import { confirmar } from '../../../../utils/dialogos';
import { useParams, useNavigate } from 'react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import Modal from '../../atoms/Modal/Modal';
import EntrevistaForm from '../../organisms/EntrevistaForm/EntrevistaForm';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import styles from './EntrevistasPage.module.css';

interface MiembroData {
  id: string;
  name: string;
  email: string;
}

interface EntrevistaData {
  id: string;
  fecha: string;
  equipo: { id: string; nombre: string; miembros: MiembroData[] };
  profesores: MiembroData[];
  competencias: { id: string; competencia: string; nivel: string }[];
  asignacionProfesores?: Record<string, string>;
  liberada?: boolean;
}

interface ProgressData {
  porProfesor: Record<string, { name: string; total: number; evaluadas: number }>;
}

interface EquipoOption {
  id: string;
  nombre: string;
  miembros: MiembroData[];
}

interface ProfesorOption {
  id: string;
  name: string;
  email: string;
}

interface CompetenciaOption {
  id: string;
  competencia: string;
  nivel: string;
}

const API_BASE = '/api';

export default function EntrevistasPage() {
  const { id: grupoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessionToken } = useAuth();

  const [entrevistas, setEntrevistas] = useState<EntrevistaData[]>([]);
  const [equipos, setEquipos] = useState<EquipoOption[]>([]);
  const [profesores, setProfesores] = useState<ProfesorOption[]>([]);
  const [competencias, setCompetencias] = useState<CompetenciaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editEntrevista, setEditEntrevista] = useState<EntrevistaData | undefined>();
  const [progress, setProgress] = useState<Record<string, ProgressData>>({});
  const [periodoNames, setPeriodoNames] = useState<string[]>([]);
  const [liberarModal, setLiberarModal] = useState<EntrevistaData | null>(null);
  const [liberarPeriodo, setLiberarPeriodo] = useState('');
  const [liberando, setLiberando] = useState(false);

  const authHeaders: Record<string, string> = {
    'x-session-token': sessionToken ?? '',
  };

  const fetchData = useCallback(async () => {
    if (!grupoId) return;
    try {
      setLoading(true);
      const [entrevistasRes, equiposRes, profesoresRes, competenciasRes, progressRes] = await Promise.all([
        fetch(`${API_BASE}/admin/grupos/${grupoId}/entrevistas`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/grupos/${grupoId}/equipos`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/profesores`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/competencias`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/grupos/${grupoId}/entrevistas/progress`, { headers: authHeaders }),
      ]);

      if (!entrevistasRes.ok) throw new Error('Error al cargar entrevistas');
      const entrevistasData = await entrevistasRes.json();
      setEntrevistas(entrevistasData.entrevistas);

      if (equiposRes.ok) {
        const equiposData = await equiposRes.json();
        setEquipos(equiposData.equipos);
      }

      if (profesoresRes.ok) {
        const profesoresData = await profesoresRes.json();
        setProfesores(profesoresData.profesores);
      }

      if (competenciasRes.ok) {
        const competenciasData = await competenciasRes.json();
        setCompetencias(
          competenciasData.competencias.filter((c: any) => !c.esCalculada),
        );
      }

      if (progressRes.ok) {
        const progressData = await progressRes.json();
        setProgress(progressData.progress);
        if (progressData.periodoNames) setPeriodoNames(progressData.periodoNames);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [grupoId, sessionToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreate() {
    setEditEntrevista(undefined);
    setModalOpen(true);
  }

  function openEdit(entrevista: EntrevistaData) {
    setEditEntrevista(entrevista);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditEntrevista(undefined);
  }

  async function handleSave(data: { equipoId: string; profesores: string[]; competencias: string[]; fecha: string; asignacionProfesores: Record<string, string> }) {
    setSaving(true);
    setError('');
    try {
      const url = editEntrevista
        ? `${API_BASE}/admin/grupos/${grupoId}/entrevistas/${editEntrevista.id}`
        : `${API_BASE}/admin/grupos/${grupoId}/entrevistas`;
      const method = editEntrevista ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Error al guardar');

      closeModal();
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entrevista: EntrevistaData) {
    if (!(await confirmar({ titulo: `¿Eliminar la entrevista del equipo "${entrevista.equipo.nombre}"?`, texto: `Esta acción no se puede deshacer.`, confirmar: 'Eliminar', peligro: true }))) return;
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/entrevistas/${entrevista.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
      });
      if (!res.ok) throw new Error('Error al eliminar');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleLiberar() {
    if (!liberarModal || !liberarPeriodo) return;
    setLiberando(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/entrevistas/${liberarModal.id}/liberar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ periodo: liberarPeriodo }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Error al liberar');
      setLiberarModal(null);
      setLiberarPeriodo('');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLiberando(false);
    }
  }

  const columnHelper = createColumnHelper<EntrevistaData>();

  const columns = [
    columnHelper.accessor('fecha', {
      header: 'Fecha',
      cell: (info) => {
        const val = info.getValue();
        if (!val) return '—';
        const [y, m, d] = val.split('-');
        return new Date(+y, +m - 1, +d).toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      },
    }),
    columnHelper.accessor('equipo', {
      header: 'Equipo',
      cell: (info) => info.getValue()?.nombre ?? '—',
      enableSorting: false,
    }),
    columnHelper.accessor('profesores', {
      header: 'Profesores',
      cell: (info) => {
        const profs = info.getValue();
        if (!profs?.length) return '—';
        return (
          <div className={styles.chips}>
            {profs.map((p) => (
              <span key={p.id} className={styles.chip} title={p.email}>{p.name}</span>
            ))}
          </div>
        );
      },
      enableSorting: false,
    }),
    columnHelper.accessor('competencias', {
      header: 'Competencias',
      cell: (info) => {
        const comps = info.getValue();
        if (!comps?.length) return '—';
        return (
          <div className={styles.chips}>
            {comps.map((c) => (
              <span key={c.id} className={styles.chip}>{c.competencia}</span>
            ))}
          </div>
        );
      },
      enableSorting: false,
    }),
    columnHelper.display({
      id: 'estado',
      header: 'Estado',
      cell: (info) => {
        const ent = info.row.original;
        if (ent.liberada) {
          return <span className={styles.badgeLiberada}>Liberada</span>;
        }
        return <span className={styles.badgeBorrador}>Borrador</span>;
      },
    }),
    columnHelper.display({
      id: 'progresoProfesores',
      header: 'Profesores',
      cell: (info) => {
        const ent = info.row.original;
        const prog = progress[ent.id];
        if (!prog) return '—';
        const entries = Object.values(prog.porProfesor);
        if (entries.length === 0) return <span className={styles.progressText}>Sin asignar</span>;
        return (
          <div className={styles.profesorProgress}>
            {entries.map((p) => (
              <div key={p.name} className={styles.profesorRow}>
                <span className={styles.profesorName}>{p.name}</span>
                <span className={p.evaluadas === p.total && p.total > 0 ? styles.progressComplete : styles.progressPending}>
                  {p.evaluadas}/{p.total}
                </span>
              </div>
            ))}
          </div>
        );
      },
    }),
  ];

  const getActions = (entrevista: EntrevistaData): ActionItem[] => {
    const actions: ActionItem[] = [
      { label: 'Ver', icon: 'visibility', onClick: () => navigate(`/admin/grupos/${grupoId}/entrevistas/${entrevista.id}/evaluacion`) },
    ];
    if (!entrevista.liberada) {
      actions.push(
        { label: 'Editar', icon: 'edit', onClick: () => openEdit(entrevista) },
        { label: 'Liberar', icon: 'publish', onClick: () => { setLiberarModal(entrevista); setLiberarPeriodo(periodoNames[0] ?? ''); } },
        { label: 'Eliminar', icon: 'delete', onClick: () => handleDelete(entrevista), variant: 'danger' },
      );
    }
    return actions;
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Entrevistas</h1>

      {error && <div className={styles.error}>{error}</div>}

      <details className={styles.helpSection}>
        <summary className={styles.helpSummary}>
          <span className="material-icons" style={{ fontSize: '1rem' }}>help_outline</span>
          ¿Cómo funcionan las entrevistas?
        </summary>
        <div className={styles.helpContent}>
          <ol className={styles.helpSteps}>
            <li><strong>Crear entrevista:</strong> Selecciona un equipo, los profesores que participan, las competencias a evaluar y asigna qué profesor evalúa cada competencia por alumno.</li>
            <li><strong>Evaluar (borrador):</strong> Desde la vista de evaluación, cada profesor asigna un nivel y escribe retroalimentación para cada alumno. Los cambios se guardan como borrador y son visibles para todos los profesores.</li>
            <li><strong>Revisar progreso:</strong> En la columna "Profesores" puedes ver cuántas evaluaciones ha completado cada profesor. Una evaluación se considera completa cuando tiene <strong>nivel asignado</strong> y <strong>retroalimentación</strong>.</li>
            <li><strong>Liberar evaluación:</strong> Una vez que todos los profesores terminaron, presiona "Liberar" para escribir los valores a la malla de competencias. Deberás seleccionar el periodo correspondiente. La entrevista quedará en modo solo lectura.</li>
          </ol>
        </div>
      </details>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <AdminTable
          title="Entrevistas del grupo"
          columns={columns}
          data={entrevistas}
          actions={getActions}
          onAdd={openCreate}
          addLabel="Nueva Entrevista"
          emptyMessage="No hay entrevistas registradas"
          searchPlaceholder="Buscar entrevista..."
        />
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editEntrevista ? 'Editar Entrevista' : 'Nueva Entrevista'} wide>
        <EntrevistaForm
          entrevista={editEntrevista}
          equipos={equipos}
          profesores={profesores}
          competencias={competencias}
          onSave={handleSave}
          onCancel={closeModal}
          loading={saving}
        />
      </Modal>

      <Modal isOpen={!!liberarModal} onClose={() => setLiberarModal(null)} title="Liberar Evaluación">
        {liberarModal && (
          <div className={styles.liberarContent}>
            <p className={styles.liberarDesc}>
              Al liberar, los valores de la evaluación se escribirán a la malla de competencias.
              Esta acción no se puede deshacer.
            </p>
            <p className={styles.liberarEquipo}>
              Equipo: <strong>{liberarModal.equipo.nombre}</strong>
            </p>
            {progress[liberarModal.id] && (() => {
              const entries = Object.values(progress[liberarModal.id].porProfesor);
              if (entries.length === 0) return null;
              return (
                <div className={styles.liberarProfesores}>
                  <span className={styles.liberarLabel}>Progreso por profesor</span>
                  <p className={styles.liberarHint}>Completa = nivel asignado + retroalimentación</p>
                  {entries.map((p) => (
                    <div key={p.name} className={styles.profesorRow}>
                      <span className={styles.profesorName}>{p.name}</span>
                      <span className={p.evaluadas === p.total && p.total > 0 ? styles.progressComplete : styles.progressPending}>
                        {p.evaluadas}/{p.total}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
            <div className={styles.liberarField}>
              <label className={styles.liberarLabel}>Periodo</label>
              <select
                className={styles.liberarSelect}
                value={liberarPeriodo}
                onChange={(e) => setLiberarPeriodo(e.target.value)}
                disabled={liberando}
              >
                <option value="">Seleccionar periodo...</option>
                {periodoNames.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className={styles.liberarActions}>
              <button className={styles.liberarCancel} onClick={() => setLiberarModal(null)} disabled={liberando}>
                Cancelar
              </button>
              <button
                className={styles.liberarBtn}
                onClick={handleLiberar}
                disabled={!liberarPeriodo || liberando}
              >
                {liberando ? 'Liberando...' : 'Liberar Evaluación'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
