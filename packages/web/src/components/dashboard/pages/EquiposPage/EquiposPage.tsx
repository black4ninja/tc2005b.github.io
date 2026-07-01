import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import Modal from '../../atoms/Modal/Modal';
import EquipoForm from '../../organisms/EquipoForm/EquipoForm';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import styles from './EquiposPage.module.css';

interface MiembroData {
  id: string;
  name: string;
  email: string;
}

interface EquipoData {
  id: string;
  nombre: string;
  repositorio: string;
  miembros: MiembroData[];
  active: boolean;
}

interface AlumnoData {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

const API_BASE = '/api';

export default function EquiposPage() {
  const { id: grupoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessionToken } = useAuth();

  const [equipos, setEquipos] = useState<EquipoData[]>([]);
  const [alumnos, setAlumnos] = useState<AlumnoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editEquipo, setEditEquipo] = useState<EquipoData | undefined>();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  };

  const fetchData = useCallback(async () => {
    if (!grupoId) return;
    try {
      setLoading(true);
      const [equiposRes, alumnosRes] = await Promise.all([
        fetch(`${API_BASE}/admin/grupos/${grupoId}/equipos`, {
          headers: { 'x-session-token': sessionToken ?? '' },
        }),
        fetch(`${API_BASE}/admin/grupos/${grupoId}/alumnos`, {
          headers: { 'x-session-token': sessionToken ?? '' },
        }),
      ]);

      if (!equiposRes.ok) throw new Error('Error al cargar equipos');
      const equiposData = await equiposRes.json();
      setEquipos(equiposData.equipos);

      if (alumnosRes.ok) {
        const alumnosData = await alumnosRes.json();
        setAlumnos(alumnosData.alumnos.filter((a: AlumnoData) => a.active));
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
    setEditEquipo(undefined);
    setModalOpen(true);
  }

  function openEdit(equipo: EquipoData) {
    setEditEquipo(equipo);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditEquipo(undefined);
  }

  async function handleSave(data: { nombre: string; repositorio: string; miembros: string[] }) {
    setSaving(true);
    setError('');
    try {
      const url = editEquipo
        ? `${API_BASE}/admin/grupos/${grupoId}/equipos/${editEquipo.id}`
        : `${API_BASE}/admin/grupos/${grupoId}/equipos`;
      const method = editEquipo ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers, body: JSON.stringify(data) });
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

  async function handleDelete(equipo: EquipoData) {
    if (!confirm(`¿Eliminar el equipo "${equipo.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupoId}/equipos/${equipo.id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Error al eliminar');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const columnHelper = createColumnHelper<EquipoData>();

  const columns = [
    columnHelper.accessor('nombre', { header: 'Nombre' }),
    columnHelper.accessor('repositorio', {
      header: 'Repositorio',
      cell: (info) => {
        const url = info.getValue();
        if (!url) return <span className={styles.noRepo}>—</span>;
        return (
          <a href={url} target="_blank" rel="noopener noreferrer" className={styles.repoLink}>
            <span className="material-icons" style={{ fontSize: 16 }}>open_in_new</span>
            {url.replace(/^https?:\/\/(www\.)?github\.com\//, '')}
          </a>
        );
      },
    }),
    columnHelper.accessor('miembros', {
      header: 'Miembros',
      cell: (info) => {
        const miembros = info.getValue();
        if (!miembros.length) return <span className={styles.noRepo}>Sin miembros</span>;
        return (
          <div className={styles.chips}>
            {miembros.map((m) => (
              <span key={m.id} className={styles.chip} title={m.email}>
                {m.name}
              </span>
            ))}
          </div>
        );
      },
      enableSorting: false,
    }),
  ];

  const getActions = (equipo: EquipoData): ActionItem[] => [
    { label: 'Editar', icon: 'edit', onClick: () => openEdit(equipo) },
    { label: 'Evaluación de Avances', icon: 'assessment', onClick: () => navigate(`/admin/grupos/${grupoId}/equipos/${equipo.id}/avances`) },
    { label: 'Eliminar', icon: 'delete', onClick: () => handleDelete(equipo), variant: 'danger' },
  ];

  const alumnoOptions = alumnos.map((a) => ({ id: a.id, name: a.name, email: a.email }));

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Equipos</h1>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <AdminTable
          title="Equipos del grupo"
          columns={columns}
          data={equipos}
          actions={getActions}
          onAdd={openCreate}
          addLabel="Nuevo Equipo"
          emptyMessage="No hay equipos registrados"
          searchPlaceholder="Buscar equipo..."
        />
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editEquipo ? 'Editar Equipo' : 'Nuevo Equipo'}>
        <EquipoForm
          equipo={editEquipo}
          alumnos={alumnoOptions}
          onSave={handleSave}
          onCancel={closeModal}
          loading={saving}
        />
      </Modal>
    </div>
  );
}
