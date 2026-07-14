import { useState, useEffect, useCallback } from 'react';
import { confirmar, avisar } from '../../../../utils/dialogos';
import { useParams, useNavigate } from 'react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import Modal from '../../atoms/Modal/Modal';
import DashButton from '../../atoms/DashButton/DashButton';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import type { ActividadTipo } from '@/types/calendario';
import styles from './ActividadesGrupoPage.module.css';

interface ActividadEvaluacionData {
  id: string;
  nombre: string;
  tipo: ActividadTipo;
  aprendizajePlaneado: number;
  semanaPlaneada: number;
  orden: number;
  congelada: boolean;
}

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

const TIPOS_AGREGAR: ActividadTipo[] = [
  'actividad', 'lab', 'lectura', 'ejercicio', 'proyecto',
  'evaluacion', 'trabajo', 'discusion', 'info',
];

interface FormData {
  nombre: string;
  tipo: ActividadTipo;
  aprendizajePlaneado: number;
  semanaPlaneada: number;
}

const EMPTY_FORM: FormData = {
  nombre: '',
  tipo: 'actividad',
  aprendizajePlaneado: 0,
  semanaPlaneada: 0,
};

interface AlumnoProgresoRow {
  alumnoId: string;
  name: string;
  email: string;
  matricula: string;
  registroId: string | null;
  aprendizajePlaneado: number;
  aprendizajeGanado: number;
  semanaCompletada: number;
  observaciones: string;
  completada: boolean;
}

type ProgresoFilter = 'todos' | 'completados' | 'pendientes';

export default function ActividadesGrupoPage() {
  const { id: grupoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessionToken } = useAuth();

  const [data, setData] = useState<ActividadEvaluacionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ActividadEvaluacionData | undefined>();
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });

  // Stats de completado por actividad: { [actId]: completados }, totalAlumnos del grupo
  const [stats, setStats] = useState<Record<string, number>>({});
  const [totalAlumnos, setTotalAlumnos] = useState<number>(0);

  // Modal de progreso de alumnos por actividad
  const [progresoOpen, setProgresoOpen] = useState(false);
  const [progresoActividad, setProgresoActividad] = useState<ActividadEvaluacionData | null>(null);
  const [progresoLoading, setProgresoLoading] = useState(false);
  const [progresoRows, setProgresoRows] = useState<AlumnoProgresoRow[]>([]);
  const [progresoFilter, setProgresoFilter] = useState<ProgresoFilter>('todos');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  };

  const baseUrl = `${API_BASE}/admin/grupos/${grupoId}/actividades-evaluacion`;

  const fetchActividades = useCallback(async () => {
    try {
      setLoading(true);
      const [actRes, statsRes] = await Promise.all([
        fetch(baseUrl, { headers: { 'x-session-token': sessionToken ?? '' } }),
        fetch(`${baseUrl}/completion-stats`, { headers: { 'x-session-token': sessionToken ?? '' } }),
      ]);
      if (!actRes.ok) throw new Error('Error al cargar actividades de evaluación');
      const json = await actRes.json();
      setData(json.actividades);
      if (statsRes.ok) {
        const sj = await statsRes.json();
        setStats(sj.stats ?? {});
        setTotalAlumnos(sj.totalAlumnos ?? 0);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionToken, baseUrl]);

  async function openProgresoModal(item: ActividadEvaluacionData) {
    setProgresoActividad(item);
    setProgresoOpen(true);
    setProgresoLoading(true);
    setProgresoRows([]);
    setProgresoFilter('todos');
    try {
      const res = await fetch(`${baseUrl}/${item.id}/alumnos-progreso`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al cargar progreso');
      }
      const json = await res.json();
      setProgresoRows(json.alumnos ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProgresoLoading(false);
    }
  }

  function closeProgresoModal() {
    setProgresoOpen(false);
    setProgresoActividad(null);
    setProgresoRows([]);
  }

  useEffect(() => {
    fetchActividades();
  }, [fetchActividades]);

  async function handleCopiarPlantilla() {
    setCopying(true);
    setError('');
    try {
      const res = await fetch(`${baseUrl}/copiar-plantilla`, {
        method: 'POST',
        headers,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Error al copiar plantilla');
      }
      // Copiar es ahora incremental (antes daba 409 si el grupo ya tenía algo).
      // Sin este aviso, volver a copiar cuando ya está todo no daría ninguna
      // señal: parecería que el botón no hizo nada.
      if (json.copiadas === 0) {
        await avisar({
          titulo: 'No había nada nuevo que copiar',
          texto: `Las ${json.omitidas} actividades de la plantilla de este grupo ya estaban.`,
        });
      }
      await fetchActividades();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCopying(false);
    }
  }

  function openCreate() {
    setEditItem(undefined);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function openEdit(item: ActividadEvaluacionData) {
    setEditItem(item);
    setForm({
      nombre: item.nombre,
      tipo: item.tipo,
      aprendizajePlaneado: item.aprendizajePlaneado,
      semanaPlaneada: item.semanaPlaneada,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditItem(undefined);
  }

  async function handleSave() {
    if (!form.nombre.trim()) return;
    setSaving(true);
    setError('');
    try {
      const url = editItem
        ? `${baseUrl}/${editItem.id}`
        : baseUrl;
      const method = editItem ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al guardar');
      }
      closeModal();
      await fetchActividades();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: ActividadEvaluacionData) {
    if (!(await confirmar({ titulo: `¿Eliminar "${item.nombre}"?`, texto: `Esta acción no se puede deshacer.`, confirmar: 'Eliminar', peligro: true }))) return;
    try {
      const res = await fetch(`${baseUrl}/${item.id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Error al eliminar');
      await fetchActividades();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleToggleCongelada(item: ActividadEvaluacionData) {
    try {
      const res = await fetch(`${baseUrl}/${item.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ congelada: !item.congelada }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al cambiar estado de congelada');
      }
      await fetchActividades();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const columnHelper = createColumnHelper<ActividadEvaluacionData>();

  const columns = [
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
      cell: (info) => {
        const row = info.row.original;
        return (
          <span className={styles.nombreCell} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {row.congelada && (
              <span
                className="material-icons"
                title="Congelada — los alumnos no pueden modificar la semana completada"
                style={{ fontSize: 16, color: 'var(--color-warning, #b58900)' }}
              >
                lock
              </span>
            )}
            {info.getValue()}
          </span>
        );
      },
    }),
    columnHelper.accessor('aprendizajePlaneado', {
      header: 'Aprendizaje planeado',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor('semanaPlaneada', {
      header: 'Semana planeada',
      cell: (info) => info.getValue() || '—',
    }),
    columnHelper.display({
      id: 'completados',
      header: 'Completados',
      cell: (info) => {
        const row = info.row.original;
        const completados = stats[row.id] ?? 0;
        const total = totalAlumnos;
        if (total === 0) {
          return <span className={styles.completionCell}>—</span>;
        }
        const cls =
          completados === 0
            ? styles.completionBadgeNone
            : completados >= total
            ? styles.completionBadgeAll
            : styles.completionBadge;
        return (
          <span className={styles.completionCell}>
            <span className={`${styles.completionBadge} ${cls}`}>
              {completados}/{total}
            </span>
          </span>
        );
      },
    }),
  ];

  const getActions = (row: ActividadEvaluacionData): ActionItem[] => [
    { label: 'Editar', icon: 'edit', onClick: () => openEdit(row) },
    { label: 'Ver progreso de alumnos', icon: 'people', onClick: () => openProgresoModal(row) },
    {
      label: row.congelada ? 'Descongelar' : 'Congelar',
      icon: row.congelada ? 'lock_open' : 'lock',
      onClick: () => handleToggleCongelada(row),
    },
    { label: 'Malla de Evaluación', icon: 'grid_view', onClick: () => navigate(`/admin/grupos/${grupoId}/actividades-evaluacion/${row.id}/malla`) },
    { label: 'Eliminar', icon: 'delete', onClick: () => handleDelete(row), variant: 'danger' },
  ];

  const isEmpty = !loading && data.length === 0;

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Actividades de Evaluación del Grupo</h1>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <p>Cargando...</p>
      ) : isEmpty ? (
        <div className={styles.emptyState}>
          <p>Este grupo aún no tiene actividades de evaluación.</p>
          <DashButton onClick={handleCopiarPlantilla} disabled={copying}>
            {copying ? 'Copiando...' : 'Obtener actividades de evaluación globales'}
          </DashButton>
        </div>
      ) : (
        <AdminTable
          title="Malla de Evaluación del Grupo"
          columns={columns}
          data={data}
          onAdd={openCreate}
          addLabel="Agregar actividad"
          searchPlaceholder="Buscar actividad..."
          emptyMessage="No hay actividades de evaluación"
          pagination={false}
          actions={getActions}
        />
      )}

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editItem ? 'Editar actividad' : 'Agregar actividad'}
      >
        <div className={styles.form}>
          <label className={styles.formLabel}>
            Nombre
            <input
              type="text"
              className={styles.formInput}
              value={form.nombre}
              placeholder="Nombre de la actividad"
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            />
          </label>
          <label className={styles.formLabel}>
            Tipo
            <select
              className={styles.formInput}
              value={form.tipo}
              onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as ActividadTipo }))}
            >
              {TIPOS_AGREGAR.map((t) => (
                <option key={t} value={t}>{TIPO_CONFIG[t].label}</option>
              ))}
            </select>
          </label>
          <div className={styles.formRow}>
            <label className={styles.formLabel}>
              Aprendizaje planeado
              <input
                type="number"
                className={styles.formInput}
                value={form.aprendizajePlaneado}
                min={0}
                onChange={(e) =>
                  setForm((f) => ({ ...f, aprendizajePlaneado: Number(e.target.value) || 0 }))
                }
              />
            </label>
            <label className={styles.formLabel}>
              Semana planeada
              <input
                type="number"
                className={styles.formInput}
                value={form.semanaPlaneada}
                min={0}
                max={11}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(11, Number(e.target.value) || 0));
                  setForm((f) => ({ ...f, semanaPlaneada: val }));
                }}
              />
            </label>
          </div>
          <div className={styles.formActions}>
            <DashButton variant="outline" onClick={closeModal}>
              Cancelar
            </DashButton>
            <DashButton onClick={handleSave} disabled={!form.nombre.trim() || saving}>
              {saving ? 'Guardando...' : editItem ? 'Guardar cambios' : 'Agregar'}
            </DashButton>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={progresoOpen}
        onClose={closeProgresoModal}
        extraWide
        title={`Progreso de alumnos — ${progresoActividad?.nombre ?? ''}`}
      >
        {(() => {
          const total = progresoRows.length;
          const completados = progresoRows.filter((r) => r.completada).length;
          const pendientes = total - completados;
          const visibleRows = progresoRows.filter((r) => {
            if (progresoFilter === 'completados') return r.completada;
            if (progresoFilter === 'pendientes') return !r.completada;
            return true;
          });
          return (
            <div>
              <div className={styles.progresoToolbar}>
                <div className={styles.progresoSummary}>
                  <strong>{completados} de {total} alumnos han marcado la actividad</strong>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className={styles.filterChips} role="tablist">
                  <button
                    type="button"
                    className={`${styles.filterChip} ${progresoFilter === 'todos' ? styles.filterChipActive : ''}`}
                    onClick={() => setProgresoFilter('todos')}
                  >
                    Todos ({total})
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterChip} ${progresoFilter === 'completados' ? styles.filterChipActive : ''}`}
                    onClick={() => setProgresoFilter('completados')}
                  >
                    Completados ({completados})
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterChip} ${progresoFilter === 'pendientes' ? styles.filterChipActive : ''}`}
                    onClick={() => setProgresoFilter('pendientes')}
                  >
                    Pendientes ({pendientes})
                  </button>
                </div>
              </div>

              {progresoLoading ? (
                <p>Cargando progreso...</p>
              ) : visibleRows.length === 0 ? (
                <p style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No hay alumnos en este filtro.
                </p>
              ) : (
                <div className={styles.progresoTableWrap}>
                  <table className={styles.progresoTable}>
                    <thead>
                      <tr>
                        <th style={{ width: '4%' }}>#</th>
                        <th>Alumno</th>
                        <th className={styles.numCell}>Aprend. Planeado</th>
                        <th className={styles.numCell}>Aprend. Ganado</th>
                        <th className={styles.numCell}>Sem. Completada</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((r, i) => (
                        <tr
                          key={r.alumnoId}
                          className={!r.completada ? styles.progresoRowIncomplete : undefined}
                        >
                          <td>{i + 1}</td>
                          <td>
                            <div className={styles.alumnoNameCell}>
                              <strong>{r.name || '—'}</strong>
                              <small>
                                {r.matricula ? `${r.matricula} · ` : ''}{r.email}
                              </small>
                            </div>
                          </td>
                          <td className={styles.numCell}>{r.aprendizajePlaneado}</td>
                          <td className={styles.numCell}>
                            {r.aprendizajeGanado === 0 ? (
                              <span className={styles.zeroValue}>0</span>
                            ) : (
                              r.aprendizajeGanado
                            )}
                          </td>
                          <td className={styles.numCell}>
                            {r.semanaCompletada === 0 ? (
                              <span className={styles.zeroValue}>—</span>
                            ) : (
                              r.semanaCompletada
                            )}
                          </td>
                          <td>
                            {r.completada ? (
                              <span className={`${styles.statusBadge} ${styles.statusBadgeOk}`}>
                                <span className="material-icons" style={{ fontSize: 14 }}>check_circle</span>
                                Completada
                              </span>
                            ) : (
                              <span className={`${styles.statusBadge} ${styles.statusBadgePending}`}>
                                <span className="material-icons" style={{ fontSize: 14 }}>radio_button_unchecked</span>
                                Pendiente
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
