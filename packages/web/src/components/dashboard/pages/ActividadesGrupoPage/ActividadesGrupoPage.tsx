import { useState, useEffect, useCallback } from 'react';
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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  };

  const baseUrl = `${API_BASE}/admin/grupos/${grupoId}/actividades-evaluacion`;

  const fetchActividades = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(baseUrl, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) throw new Error('Error al cargar actividades de evaluación');
      const json = await res.json();
      setData(json.actividades);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionToken, baseUrl]);

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
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al copiar plantilla');
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
    if (!confirm(`¿Eliminar "${item.nombre}"? Esta acción no se puede deshacer.`)) return;
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
      cell: (info) => <span className={styles.nombreCell}>{info.getValue()}</span>,
    }),
    columnHelper.accessor('aprendizajePlaneado', {
      header: 'Aprendizaje planeado',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor('semanaPlaneada', {
      header: 'Semana planeada',
      cell: (info) => info.getValue() || '—',
    }),
  ];

  const getActions = (row: ActividadEvaluacionData): ActionItem[] => [
    { label: 'Editar', icon: 'edit', onClick: () => openEdit(row) },
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
    </div>
  );
}
