import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router';
import { confirmar } from '../../../../utils/dialogos';
import { createColumnHelper } from '@tanstack/react-table';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import Modal from '../../atoms/Modal/Modal';
import DashButton from '../../atoms/DashButton/DashButton';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import type { ActividadTipo } from '@/types/calendario';
import type { ColeccionRef } from '../../../../types/contenidos';
import styles from './ActividadesPage.module.css';

interface ActividadEvaluacionData {
  id: string;
  nombre: string;
  tipo: ActividadTipo;
  aprendizajePlaneado: number;
  semanaPlaneada: number;
  orden: number;
  coleccionId?: string | null;
  coleccion?: { id: string; nombre: string | null; slug: string | null; clave: string | null } | null;
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
  coleccionId: string;
}

const EMPTY_FORM: FormData = {
  nombre: '',
  tipo: 'actividad',
  aprendizajePlaneado: 0,
  semanaPlaneada: 0,
  coleccionId: '',
};

export default function ActividadesPage() {
  const { sessionToken } = useAuth();

  const [data, setData] = useState<ActividadEvaluacionData[]>([]);
  const [colecciones, setColecciones] = useState<ColeccionRef[]>([]);

  // El filtro por colección vive en la URL: la acción "Actividades" de la tabla
  // de Contenidos llega aquí ya filtrada, y el enlace se puede compartir.
  const [searchParams] = useSearchParams();
  const filtroColeccion = searchParams.get('coleccion') ?? '';
  // Si se llegó desde el menú de un grupo, volver debe devolver AL GRUPO.
  const grupoOrigen = searchParams.get('grupo');
  const volverA = grupoOrigen ? `/admin/grupos/${grupoOrigen}` : '/admin/contenidos';
  const volverLabel = grupoOrigen ? 'Grupo' : 'Contenidos';

  const coleccionActiva = useMemo(
    () => colecciones.find((c) => c.id === filtroColeccion) ?? null,
    [colecciones, filtroColeccion],
  );
  const dataFiltrada = useMemo(
    () => (filtroColeccion ? data.filter((a) => a.coleccionId === filtroColeccion) : data),
    [data, filtroColeccion],
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ActividadEvaluacionData | undefined>();
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  };

  const fetchColecciones = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/colecciones`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) return;
      const json = await res.json();
      setColecciones(json.colecciones ?? []);
    } catch {
      // no crítico: sin colecciones el form no deja crear, que es lo correcto
    }
  }, [sessionToken]);

  const fetchActividades = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/actividades-evaluacion`, {
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
  }, [sessionToken]);

  useEffect(() => {
    fetchActividades();
    fetchColecciones();
  }, [fetchActividades, fetchColecciones]);

  function openCreate() {
    setEditItem(undefined);
    // Si se entró filtrando por una colección, se preselecciona: es la que se
    // quiere el 99% de las veces.
    setForm({ ...EMPTY_FORM, coleccionId: filtroColeccion });
    setShowModal(true);
  }

  function openEdit(item: ActividadEvaluacionData) {
    setEditItem(item);
    setForm({
      nombre: item.nombre,
      tipo: item.tipo,
      aprendizajePlaneado: item.aprendizajePlaneado,
      semanaPlaneada: item.semanaPlaneada,
      coleccionId: item.coleccionId ?? '',
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditItem(undefined);
  }

  async function handleSave() {
    if (!form.nombre.trim()) return;
    if (!form.coleccionId) {
      setError('La colección es requerida: sin ella la actividad no se copia a ningún grupo');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const url = editItem
        ? `${API_BASE}/admin/actividades-evaluacion/${editItem.id}`
        : `${API_BASE}/admin/actividades-evaluacion`;
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
      const res = await fetch(`${API_BASE}/admin/actividades-evaluacion/${item.id}`, {
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
    // Solo en la vista global: filtrando, la colección ya está en el título.
    ...(coleccionActiva
      ? []
      : [
          columnHelper.accessor('coleccion', {
            header: 'Colección',
            cell: (info) => {
              const col = info.getValue();
              if (!col) return <span style={{ color: 'var(--dash-danger)' }}>Sin asignar</span>;
              return <span>{col.clave ?? col.slug}</span>;
            },
          }),
        ]),
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
    { label: 'Eliminar', icon: 'delete', onClick: () => handleDelete(row), variant: 'danger' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        {coleccionActiva && (
          <Link to={volverA} className={styles.volver}>
            <span className="material-icons">arrow_back</span>
            <span>{volverLabel}</span>
          </Link>
        )}
        <h1 className={styles.pageTitle}>
          Actividades de Evaluación
          {coleccionActiva && (
            <span className={styles.pageTitleSub}>
              {coleccionActiva.clave ?? coleccionActiva.slug} — {coleccionActiva.nombre}
            </span>
          )}
        </h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <AdminTable
          title="Plantilla de Malla de Evaluación"
          columns={columns}
          data={dataFiltrada}
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
            Colección (materia) *
            <select
              className={styles.formInput}
              value={form.coleccionId}
              onChange={(e) => { setForm((f) => ({ ...f, coleccionId: e.target.value })); setError(''); }}
            >
              <option value="">Selecciona una colección…</option>
              {colecciones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clave ? `${c.clave} — ${c.nombre}` : c.nombre}
                </option>
              ))}
            </select>
          </label>
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
