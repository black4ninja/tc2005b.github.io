import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router';
import { confirmar } from '../../../../utils/dialogos';
import { createColumnHelper } from '@tanstack/react-table';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import Modal from '../../atoms/Modal/Modal';
import type { ColeccionRef } from '../../../../types/contenidos';
import IndicacionMallaForm from '../../organisms/IndicacionMallaForm/IndicacionMallaForm';
import CompetenciaForm from '../../organisms/CompetenciaForm/CompetenciaForm';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import styles from './CompetenciasPage.module.css';

interface IndicacionData {
  id: string;
  descripcion: string;
}

interface DependenciaRef {
  id: string;
  competencia: string;
}

interface CompetenciaData {
  id: string;
  orden?: number;
  competencia: string;
  nivel: string;
  descripcionNivel?: string;
  guiaEvidencias?: string;
  incipienteB?: string;
  incipienteA?: string;
  basico?: string;
  solido?: string;
  destacado?: string;
  fechaIdealEvaluacion?: string;
  esCalculada?: boolean;
  dependencias?: DependenciaRef[];
  coleccionId?: string | null;
  coleccion?: { id: string; nombre: string | null; slug: string | null; clave: string | null } | null;
}

const API_BASE = '/api';

export default function CompetenciasPage() {
  const { sessionToken } = useAuth();

  const [indicaciones, setIndicaciones] = useState<IndicacionData[]>([]);
  const [competencias, setCompetencias] = useState<CompetenciaData[]>([]);
  const [colecciones, setColecciones] = useState<ColeccionRef[]>([]);

  // El filtro por colección vive en la URL: la acción "Competencias" de la tabla
  // de Contenidos llega aquí ya filtrada, y el enlace se puede compartir.
  const [searchParams] = useSearchParams();
  const filtroColeccion = searchParams.get('coleccion') ?? '';
  // Igual que en Páginas: si se llegó desde un grupo, volver devuelve al grupo.
  const grupoOrigen = searchParams.get('grupo');
  const volverA = grupoOrigen ? `/admin/grupos/${grupoOrigen}` : '/admin/contenidos';
  const volverLabel = grupoOrigen ? 'Grupo' : 'Contenidos';

  const coleccionActiva = useMemo(
    () => colecciones.find((c) => c.id === filtroColeccion) ?? null,
    [colecciones, filtroColeccion],
  );

  const competenciasFiltradas = useMemo(
    () => (filtroColeccion ? competencias.filter((c) => c.coleccionId === filtroColeccion) : competencias),
    [competencias, filtroColeccion],
  );
  const [loadingInd, setLoadingInd] = useState(true);
  const [loadingComp, setLoadingComp] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [indModalOpen, setIndModalOpen] = useState(false);
  const [editIndicacion, setEditIndicacion] = useState<IndicacionData | undefined>();

  const [compModalOpen, setCompModalOpen] = useState(false);
  const [editCompetencia, setEditCompetencia] = useState<CompetenciaData | undefined>();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  };

  const fetchIndicaciones = useCallback(async () => {
    try {
      setLoadingInd(true);
      const res = await fetch(`${API_BASE}/admin/indicaciones-malla`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) throw new Error('Error al cargar indicaciones');
      const data = await res.json();
      setIndicaciones(data.indicaciones);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingInd(false);
    }
  }, [sessionToken]);

  // Siempre se piden TODAS: el filtro por colección se aplica en cliente porque
  // el formulario necesita la lista completa para el picker de dependencias (que
  // luego acota a la colección elegida).
  const fetchCompetencias = useCallback(async () => {
    try {
      setLoadingComp(true);
      const res = await fetch(`${API_BASE}/admin/competencias`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) throw new Error('Error al cargar competencias');
      const data = await res.json();
      setCompetencias(data.competencias);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingComp(false);
    }
  }, [sessionToken]);

  const fetchColecciones = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/colecciones`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) return;
      const data = await res.json();
      setColecciones(data.colecciones ?? []);
    } catch {
      // no crítico: sin colecciones el form no deja crear, que es lo correcto
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchIndicaciones();
    fetchCompetencias();
    fetchColecciones();
  }, [fetchIndicaciones, fetchCompetencias, fetchColecciones]);

  // --- Indicaciones CRUD ---
  function openCreateInd() {
    setEditIndicacion(undefined);
    setIndModalOpen(true);
  }
  function openEditInd(ind: IndicacionData) {
    setEditIndicacion(ind);
    setIndModalOpen(true);
  }
  function closeIndModal() {
    setIndModalOpen(false);
    setEditIndicacion(undefined);
  }

  async function handleSaveInd(data: { descripcion: string }) {
    setSaving(true);
    setError('');
    try {
      const url = editIndicacion
        ? `${API_BASE}/admin/indicaciones-malla/${editIndicacion.id}`
        : `${API_BASE}/admin/indicaciones-malla`;
      const method = editIndicacion ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(data) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al guardar');
      }
      closeIndModal();
      await fetchIndicaciones();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteInd(ind: IndicacionData) {
    if (!(await confirmar({ titulo: `¿Eliminar esta indicación?`, texto: `Esta acción no se puede deshacer.`, confirmar: 'Eliminar', peligro: true }))) return;
    try {
      const res = await fetch(`${API_BASE}/admin/indicaciones-malla/${ind.id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Error al eliminar');
      await fetchIndicaciones();
    } catch (err: any) {
      setError(err.message);
    }
  }

  // --- Competencias CRUD ---
  function openCreateComp() {
    setEditCompetencia(undefined);
    setCompModalOpen(true);
  }
  function openEditComp(comp: CompetenciaData) {
    setEditCompetencia(comp);
    setCompModalOpen(true);
  }
  function closeCompModal() {
    setCompModalOpen(false);
    setEditCompetencia(undefined);
  }

  async function handleSaveComp(data: Omit<CompetenciaData, 'id'>) {
    setSaving(true);
    setError('');
    try {
      // Transform dependencias from [{id, competencia}] to array of IDs for the backend
      const payload = {
        ...data,
        dependencias: (data.dependencias ?? []).map((d) => d.id),
      };
      const url = editCompetencia
        ? `${API_BASE}/admin/competencias/${editCompetencia.id}`
        : `${API_BASE}/admin/competencias`;
      const method = editCompetencia ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al guardar');
      }
      closeCompModal();
      await fetchCompetencias();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteComp(comp: CompetenciaData) {
    if (!(await confirmar({ titulo: `¿Eliminar la competencia "${comp.competencia}"?`, texto: `Esta acción no se puede deshacer.`, confirmar: 'Eliminar', peligro: true }))) return;
    try {
      const res = await fetch(`${API_BASE}/admin/competencias/${comp.id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Error al eliminar');
      await fetchCompetencias();
    } catch (err: any) {
      setError(err.message);
    }
  }

  // --- Column definitions ---
  const indColumnHelper = createColumnHelper<IndicacionData>();
  const indColumns = [
    indColumnHelper.accessor('descripcion', { header: 'Descripción' }),
  ];

  const compColumnHelper = createColumnHelper<CompetenciaData>();
  const compColumns = [
    compColumnHelper.accessor('orden', { header: 'Orden', cell: (info) => info.getValue() ?? '—' }),
    compColumnHelper.accessor('competencia', { header: 'Competencia' }),
    // Solo en la vista global: filtrando, la colección ya está en el título y la
    // columna sería la misma palabra repetida en todas las filas.
    ...(coleccionActiva
      ? []
      : [
          compColumnHelper.accessor('coleccion', {
            header: 'Colección',
            cell: (info) => {
              const col = info.getValue();
              if (!col) return <span style={{ color: 'var(--dash-danger)' }}>Sin asignar</span>;
              return <span>{col.clave ?? col.slug}</span>;
            },
          }),
        ]),
    compColumnHelper.accessor('nivel', { header: 'Nivel' }),
    compColumnHelper.accessor('esCalculada', {
      header: 'Tipo',
      cell: (info) => info.getValue()
        ? <span style={{ color: 'var(--color-proyecto)', fontWeight: 500 }}>Calculada</span>
        : <span style={{ color: 'var(--text-secondary)' }}>Directa</span>,
    }),
    compColumnHelper.accessor('dependencias', {
      header: 'Dependencias',
      cell: (info) => {
        const deps = info.getValue();
        if (!deps || deps.length === 0) return <span className={styles.truncate}>—</span>;
        return (
          <span className={styles.truncate} title={deps.map((d) => d.competencia).join(', ')}>
            {deps.map((d) => d.competencia).join(', ')}
          </span>
        );
      },
    }),
    compColumnHelper.accessor('descripcionNivel', {
      header: 'Descripción Nivel',
      cell: (info) => <span className={styles.truncate} title={info.getValue()}>{info.getValue() || '—'}</span>,
    }),
    compColumnHelper.accessor('guiaEvidencias', {
      header: 'Guía Evidencias',
      cell: (info) => <span className={styles.truncate} title={info.getValue()}>{info.getValue() || '—'}</span>,
    }),
    compColumnHelper.accessor('incipienteB', {
      header: 'Incipiente B (0%)',
      cell: (info) => <span className={styles.truncate} title={info.getValue()}>{info.getValue() || '—'}</span>,
    }),
    compColumnHelper.accessor('incipienteA', {
      header: 'Incipiente A (15%)',
      cell: (info) => <span className={styles.truncate} title={info.getValue()}>{info.getValue() || '—'}</span>,
    }),
    compColumnHelper.accessor('basico', {
      header: 'Básico (70%)',
      cell: (info) => <span className={styles.truncate} title={info.getValue()}>{info.getValue() || '—'}</span>,
    }),
    compColumnHelper.accessor('solido', {
      header: 'Sólido (85%)',
      cell: (info) => <span className={styles.truncate} title={info.getValue()}>{info.getValue() || '—'}</span>,
    }),
    compColumnHelper.accessor('destacado', {
      header: 'Destacado (100%)',
      cell: (info) => <span className={styles.truncate} title={info.getValue()}>{info.getValue() || '—'}</span>,
    }),
    compColumnHelper.accessor('fechaIdealEvaluacion', {
      header: 'Fecha Evaluación',
      cell: (info) => info.getValue() || '—',
    }),
  ];

  const getIndActions = (ind: IndicacionData): ActionItem[] => [
    { label: 'Editar', icon: 'edit', onClick: () => openEditInd(ind) },
    { label: 'Eliminar', icon: 'delete', onClick: () => handleDeleteInd(ind), variant: 'danger' },
  ];

  const getCompActions = (comp: CompetenciaData): ActionItem[] => [
    { label: 'Editar', icon: 'edit', onClick: () => openEditComp(comp) },
    { label: 'Eliminar', icon: 'delete', onClick: () => handleDeleteComp(comp), variant: 'danger' },
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
          Competencias
          {coleccionActiva && (
            <span className={styles.pageTitleSub}>
              {coleccionActiva.clave ?? coleccionActiva.slug} — {coleccionActiva.nombre}
            </span>
          )}
        </h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Las Indicaciones de Malla NO tienen colección: son globales. Mostrarlas
          bajo el título de una colección haría creer que son suyas, así que solo
          aparecen en la vista sin filtrar. */}
      {!coleccionActiva && (
        <details className={styles.panel}>
          <summary className={styles.panelSummary}>
            <span className="material-icons">chevron_right</span>
            Indicaciones para Malla de Competencias
          </summary>
          <div className={styles.panelContent}>
            {loadingInd ? (
              <p>Cargando...</p>
            ) : (
              <AdminTable
                title="Indicaciones"
                columns={indColumns}
                data={indicaciones}
                actions={getIndActions}
                onAdd={openCreateInd}
                addLabel="Agregar Indicación"
                emptyMessage="No hay indicaciones registradas"
                searchPlaceholder="Buscar indicación..."
              />
            )}
          </div>
        </details>
      )}

      <details open className={styles.panel}>
        <summary className={styles.panelSummary}>
          <span className="material-icons">chevron_right</span>
          Competencias
        </summary>
        <div className={styles.panelContent}>
          {loadingComp ? (
            <p>Cargando...</p>
          ) : (
            <AdminTable
              title="Competencias registradas"
              columns={compColumns}
              data={competenciasFiltradas}
              actions={getCompActions}
              onAdd={openCreateComp}
              addLabel="Agregar Competencia"
              emptyMessage="No hay competencias registradas"
              searchPlaceholder="Buscar competencia..."
              pagination={10}
            />
          )}
        </div>
      </details>

      <Modal isOpen={indModalOpen} onClose={closeIndModal} title={editIndicacion ? 'Editar Indicación' : 'Nueva Indicación'}>
        <IndicacionMallaForm
          indicacion={editIndicacion}
          onSave={handleSaveInd}
          onCancel={closeIndModal}
          loading={saving}
        />
      </Modal>

      <Modal isOpen={compModalOpen} onClose={closeCompModal} title={editCompetencia ? 'Editar Competencia' : 'Nueva Competencia'} wide>
        <CompetenciaForm
          competencia={editCompetencia}
          allCompetencias={competencias}
          colecciones={colecciones}
          coleccionInicial={filtroColeccion || undefined}
          onSave={handleSaveComp}
          onCancel={closeCompModal}
          loading={saving}
        />
      </Modal>
    </div>
  );
}
