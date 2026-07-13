import { useState, useEffect, useCallback } from 'react';
import { confirmar } from '../../../../utils/dialogos';
import { useNavigate, Link } from 'react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import Icon from '../../atoms/Icon/Icon';
import Modal from '../../atoms/Modal/Modal';
import ColeccionForm from '../../organisms/ColeccionForm/ColeccionForm';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import type { ColeccionData } from '../../../../types/contenidos';
import styles from './ContenidosPage.module.css';

const API_BASE = '/api';

/** Admin del CMS "Contenidos": lista de colecciones (design §5.1). */
export default function ContenidosPage() {
  const { sessionToken } = useAuth();
  const navigate = useNavigate();
  const [colecciones, setColecciones] = useState<ColeccionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editColeccion, setEditColeccion] = useState<ColeccionData | undefined>();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  };

  const fetchColecciones = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/colecciones`, { headers: { 'x-session-token': sessionToken ?? '' } });
      if (!res.ok) throw new Error('Error al cargar colecciones');
      const data = await res.json();
      setColecciones(data.colecciones);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchColecciones();
  }, [fetchColecciones]);

  function openCreate() {
    setEditColeccion(undefined);
    setError('');
    setModalOpen(true);
  }

  function openEdit(coleccion: ColeccionData) {
    setEditColeccion(coleccion);
    setError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditColeccion(undefined);
    setError('');
  }

  async function handleSave(data: { nombre: string; slug: string; clave?: string; descripcion?: string; publicada?: boolean }) {
    setSaving(true);
    setError('');
    try {
      const url = editColeccion
        ? `${API_BASE}/admin/colecciones/${editColeccion.id}`
        : `${API_BASE}/admin/colecciones`;
      const method = editColeccion ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers, body: JSON.stringify(data) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al guardar');
      }
      closeModal();
      await fetchColecciones();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(coleccion: ColeccionData) {
    if (!(await confirmar({ titulo: `¿Eliminar la colección "${coleccion.nombre}"?`, texto: `Sus páginas dejarán de ser accesibles.`, confirmar: 'Eliminar', peligro: true }))) return;
    try {
      const res = await fetch(`${API_BASE}/admin/colecciones/${coleccion.id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Error al eliminar');
      await fetchColecciones();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const columnHelper = createColumnHelper<ColeccionData>();

  const columns = [
    columnHelper.accessor('clave', {
      header: 'Clave',
      cell: (info) => info.getValue() || '—',
    }),
    columnHelper.accessor('nombre', { header: 'Nombre' }),
    columnHelper.accessor('slug', {
      header: 'Slug',
      cell: (info) => <code className={styles.slug}>{info.getValue()}</code>,
    }),
    columnHelper.accessor('publicada', {
      header: 'Estado',
      cell: (info) => (
        <span className={`${styles.badge} ${info.getValue() ? styles.badgeActive : styles.badgeDraft}`}>
          {info.getValue() ? 'Publicada' : 'Borrador'}
        </span>
      ),
    }),
  ];

  const getActions = (coleccion: ColeccionData): ActionItem[] => [
    // "Abrir" = el árbol de documentación (Documento). "Páginas" = las páginas de
    // bloques (Pagina) que se sirven en /paginas/:slug. Son dos contenidos
    // distintos de la misma colección; de ahí las dos acciones.
    { label: 'Abrir documentación', icon: 'account_tree', onClick: () => navigate(`/admin/contenidos/${coleccion.id}`) },
    { label: 'Páginas', icon: 'article', onClick: () => navigate(`/admin/paginas?coleccion=${coleccion.id}`) },
    { label: 'Competencias', icon: 'emoji_events', onClick: () => navigate(`/admin/competencias?coleccion=${coleccion.id}`) },
    { label: 'Editar', icon: 'edit', onClick: () => openEdit(coleccion) },
    { label: 'Eliminar', icon: 'delete', onClick: () => handleDelete(coleccion), variant: 'danger' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Contenidos</h1>
        {/* Sin esto, al quitar "Páginas" del menú lateral solo se llegaría a las
            páginas YA filtradas por colección: se perdería la vista de conjunto
            (todas, filtro por etiqueta) y las páginas sin colección quedarían
            inalcanzables. */}
        <Link to="/admin/paginas" className={styles.verTodas}>
          <Icon name="article" size="sm" />
          <span>Ver todas las páginas</span>
        </Link>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <AdminTable
          title="Colecciones"
          columns={columns}
          data={colecciones}
          actions={getActions}
          onAdd={openCreate}
          addLabel="Nueva Colección"
          emptyMessage="No hay colecciones registradas"
          searchPlaceholder="Buscar colección..."
        />
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editColeccion ? 'Editar Colección' : 'Nueva Colección'}>
        <ColeccionForm
          coleccion={editColeccion}
          errorExterno={error}
          onSave={handleSave}
          onCancel={closeModal}
          loading={saving}
        />
      </Modal>
    </div>
  );
}
