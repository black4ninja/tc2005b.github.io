import { useState, useEffect, useCallback } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import Modal from '../../atoms/Modal/Modal';
import IndicacionMallaForm from '../../organisms/IndicacionMallaForm/IndicacionMallaForm';
import CompetenciaForm from '../../organisms/CompetenciaForm/CompetenciaForm';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import styles from './CompetenciasPage.module.css';

interface IndicacionData {
  id: string;
  descripcion: string;
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
}

const API_BASE = '/api';

export default function CompetenciasPage() {
  const { sessionToken } = useAuth();

  const [indicaciones, setIndicaciones] = useState<IndicacionData[]>([]);
  const [competencias, setCompetencias] = useState<CompetenciaData[]>([]);
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

  useEffect(() => {
    fetchIndicaciones();
    fetchCompetencias();
  }, [fetchIndicaciones, fetchCompetencias]);

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
    if (!confirm(`¿Eliminar esta indicación? Esta acción no se puede deshacer.`)) return;
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
      const url = editCompetencia
        ? `${API_BASE}/admin/competencias/${editCompetencia.id}`
        : `${API_BASE}/admin/competencias`;
      const method = editCompetencia ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(data) });
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
    if (!confirm(`¿Eliminar la competencia "${comp.competencia}"? Esta acción no se puede deshacer.`)) return;
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
    compColumnHelper.accessor('nivel', { header: 'Nivel' }),
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
      <h1 className={styles.pageTitle}>Competencias</h1>

      {error && <div className={styles.error}>{error}</div>}

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
              data={competencias}
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
          onSave={handleSaveComp}
          onCancel={closeCompModal}
          loading={saving}
        />
      </Modal>
    </div>
  );
}
