import { useState, useEffect, useCallback } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import Modal from '../../atoms/Modal/Modal';
import PaginaForm from '../../organisms/PaginaForm/PaginaForm';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import type { PaginaData } from '../../../../types/pagina';
import styles from './PaginasPage.module.css';

const API_BASE = '/api';

export default function PaginasPage() {
  const { sessionToken } = useAuth();

  const [paginas, setPaginas] = useState<PaginaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editPagina, setEditPagina] = useState<PaginaData | undefined>();
  const [previewPagina, setPreviewPagina] = useState<PaginaData | undefined>();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  };

  const fetchPaginas = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/paginas`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) throw new Error('Error al cargar páginas');
      const data = await res.json();
      setPaginas(data.paginas);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchPaginas();
  }, [fetchPaginas]);

  function openCreate() {
    setEditPagina(undefined);
    setPreviewPagina(undefined);
    setModalOpen(true);
  }

  function openEdit(pagina: PaginaData) {
    setEditPagina(pagina);
    setPreviewPagina(undefined);
    setModalOpen(true);
  }

  function openPreview(pagina: PaginaData) {
    setPreviewPagina(pagina);
    setEditPagina(undefined);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditPagina(undefined);
    setPreviewPagina(undefined);
  }

  async function handleSave(data: Omit<PaginaData, 'id' | 'createdAt' | 'updatedAt'>) {
    setSaving(true);
    setError('');
    try {
      const url = editPagina
        ? `${API_BASE}/admin/paginas/${editPagina.id}`
        : `${API_BASE}/admin/paginas`;
      const method = editPagina ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(data) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al guardar');
      }
      closeModal();
      await fetchPaginas();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(pagina: PaginaData) {
    if (!confirm(`¿Eliminar la página "${pagina.titulo}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/paginas/${pagina.id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Error al eliminar');
      await fetchPaginas();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleTogglePublicado(pagina: PaginaData) {
    try {
      const res = await fetch(`${API_BASE}/admin/paginas/${pagina.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ publicado: !pagina.publicado }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      await fetchPaginas();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const columnHelper = createColumnHelper<PaginaData>();
  const columns = [
    columnHelper.accessor('titulo', {
      header: 'Título',
      cell: (info) => <span className={styles.truncate} title={info.getValue()}>{info.getValue()}</span>,
    }),
    columnHelper.accessor('slug', {
      header: 'Slug',
      cell: (info) => <code>/paginas/{info.getValue()}</code>,
    }),
    columnHelper.accessor('publicado', {
      header: 'Estado',
      cell: (info) => info.getValue()
        ? <span className={`${styles.badge} ${styles.badgePublicado}`}>Publicado</span>
        : <span className={`${styles.badge} ${styles.badgeBorrador}`}>Borrador</span>,
    }),
    columnHelper.accessor('grupoId', {
      header: 'Alcance',
      cell: (info) => info.getValue()
        ? <span>Grupo</span>
        : <span className={`${styles.badge} ${styles.badgeGlobal}`}>Global</span>,
    }),
    columnHelper.accessor('bloques', {
      header: 'Bloques',
      cell: (info) => info.getValue()?.length ?? 0,
    }),
  ];

  const getActions = (pagina: PaginaData): ActionItem[] => [
    { label: 'Editar', icon: 'edit', onClick: () => openEdit(pagina) },
    { label: 'Vista previa', icon: 'visibility', onClick: () => openPreview(pagina) },
    {
      label: pagina.publicado ? 'Despublicar' : 'Publicar',
      icon: pagina.publicado ? 'unpublished' : 'publish',
      onClick: () => handleTogglePublicado(pagina),
    },
    { label: 'Eliminar', icon: 'delete', onClick: () => handleDelete(pagina), variant: 'danger' },
  ];

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Páginas</h1>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <AdminTable
          title="Páginas del sitio"
          columns={columns}
          data={paginas}
          actions={getActions}
          onAdd={openCreate}
          addLabel="Crear Página"
          emptyMessage="No hay páginas registradas"
          searchPlaceholder="Buscar página..."
          pagination={100}
          initialSorting={[{ id: 'slug', desc: false }]}
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={previewPagina ? `Vista previa: ${previewPagina.titulo}` : (editPagina ? 'Editar Página' : 'Nueva Página')}
        wide
      >
        <PaginaForm
          pagina={editPagina ?? previewPagina}
          onSave={handleSave}
          onCancel={closeModal}
          loading={saving}
          previewMode={!!previewPagina}
        />
      </Modal>
    </div>
  );
}
