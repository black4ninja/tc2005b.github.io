import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { confirmar } from '../../../../utils/dialogos';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import Icon from '../../atoms/Icon/Icon';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import type { EjercicioData } from '../../../../types/contenidos';
import styles from './EjerciciosColeccionPage.module.css';

const API_BASE = '/api';

const NOMBRE_LENGUAJE: Record<string, string> = { kotlin: 'Kotlin', swift: 'Swift' };

/** Admin del módulo "Ejercicios": lista los ejercicios de una colección. */
export default function EjerciciosColeccionPage() {
  const { id } = useParams<{ id: string }>();
  const { sessionToken } = useAuth();
  const navigate = useNavigate();
  const [ejercicios, setEjercicios] = useState<EjercicioData[]>([]);
  const [nombreColeccion, setNombreColeccion] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  };

  const fetchEjercicios = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/colecciones/${id}/ejercicios`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) throw new Error('Error al cargar ejercicios');
      const data = await res.json();
      setEjercicios(data.ejercicios ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, sessionToken]);

  const fetchNombre = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/colecciones`, { headers: { 'x-session-token': sessionToken ?? '' } });
      if (!res.ok) return;
      const data = await res.json();
      const c = (data.colecciones ?? []).find((x: any) => x.id === id);
      if (c) setNombreColeccion(c.clave ? `${c.clave} — ${c.nombre}` : c.nombre);
    } catch {
      // el nombre es cosmético; ignorar
    }
  }, [id, sessionToken]);

  useEffect(() => {
    fetchEjercicios();
    fetchNombre();
  }, [fetchEjercicios, fetchNombre]);

  async function handleTogglePublicado(ej: EjercicioData) {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/ejercicios/${ej.id}/publicacion`, {
        method: 'PUT', headers, body: JSON.stringify({ publicado: !ej.publicado }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al cambiar la publicación');
      }
      await fetchEjercicios();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(ej: EjercicioData) {
    if (!(await confirmar({ titulo: `¿Eliminar el ejercicio "${ej.titulo}"?`, texto: 'Esta acción no se puede deshacer.', confirmar: 'Eliminar', peligro: true }))) return;
    try {
      const res = await fetch(`${API_BASE}/admin/ejercicios/${ej.id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Error al eliminar');
      await fetchEjercicios();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const columnHelper = createColumnHelper<EjercicioData>();
  const columns = [
    columnHelper.accessor('titulo', { header: 'Título' }),
    columnHelper.accessor('slug', {
      header: 'Slug',
      cell: (info) => <code className={styles.slug}>{info.getValue()}</code>,
    }),
    columnHelper.accessor((row) => row.lenguajes.map((l) => NOMBRE_LENGUAJE[l] ?? l).join(', '), {
      id: 'lenguajes',
      header: 'Lenguajes',
      cell: (info) => info.getValue() || '—',
    }),
    columnHelper.accessor((row) => row.casos.length, {
      id: 'casos',
      header: 'Casos',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor('publicado', {
      header: 'Estado',
      cell: (info) => (
        <span className={`${styles.badge} ${info.getValue() ? styles.badgeActive : styles.badgeDraft}`}>
          {info.getValue() ? 'Publicado' : 'Borrador'}
        </span>
      ),
    }),
  ];

  const getActions = (ej: EjercicioData): ActionItem[] => [
    { label: 'Editar', icon: 'edit', onClick: () => navigate(`/admin/contenidos/${id}/ejercicios/${ej.id}`) },
    {
      label: ej.publicado ? 'Despublicar' : 'Publicar',
      icon: ej.publicado ? 'visibility_off' : 'visibility',
      onClick: () => handleTogglePublicado(ej),
    },
    { label: 'Eliminar', icon: 'delete', onClick: () => handleDelete(ej), variant: 'danger' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to={`/admin/contenidos/${id}`} className={styles.volver}>
          <Icon name="arrow_back" size="sm" />
          <span>Colección</span>
        </Link>
        <h1 className={styles.pageTitle}>Ejercicios{nombreColeccion ? ` — ${nombreColeccion}` : ''}</h1>
      </div>

      {error && <div className={styles.error} onClick={() => setError('')}>{error}</div>}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <AdminTable
          title="Ejercicios de programación"
          columns={columns}
          data={ejercicios}
          actions={getActions}
          onAdd={() => navigate(`/admin/contenidos/${id}/ejercicios/nuevo`)}
          addLabel="Nuevo Ejercicio"
          emptyMessage="Esta colección aún no tiene ejercicios."
          searchPlaceholder="Buscar ejercicio..."
        />
      )}
    </div>
  );
}
