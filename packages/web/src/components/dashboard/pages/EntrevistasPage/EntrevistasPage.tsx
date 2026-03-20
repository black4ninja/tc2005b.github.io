import { useState, useEffect, useCallback } from 'react';
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

  const authHeaders: Record<string, string> = {
    'x-session-token': sessionToken ?? '',
  };

  const fetchData = useCallback(async () => {
    if (!grupoId) return;
    try {
      setLoading(true);
      const [entrevistasRes, equiposRes, profesoresRes, competenciasRes] = await Promise.all([
        fetch(`${API_BASE}/admin/grupos/${grupoId}/entrevistas`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/grupos/${grupoId}/equipos`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/profesores`, { headers: authHeaders }),
        fetch(`${API_BASE}/admin/competencias`, { headers: authHeaders }),
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
        setCompetencias(competenciasData.competencias);
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

  async function handleSave(data: { equipoId: string; profesores: string[]; competencias: string[]; fecha: string }) {
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
    if (!confirm(`¿Eliminar la entrevista del equipo "${entrevista.equipo.nombre}"? Esta acción no se puede deshacer.`)) return;
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
  ];

  const getActions = (entrevista: EntrevistaData): ActionItem[] => [
    { label: 'Ver', icon: 'visibility', onClick: () => navigate(`/admin/grupos/${grupoId}/entrevistas/${entrevista.id}/evaluacion`) },
    { label: 'Editar', icon: 'edit', onClick: () => openEdit(entrevista) },
    { label: 'Eliminar', icon: 'delete', onClick: () => handleDelete(entrevista), variant: 'danger' },
  ];

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Entrevistas</h1>

      {error && <div className={styles.error}>{error}</div>}

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
    </div>
  );
}
