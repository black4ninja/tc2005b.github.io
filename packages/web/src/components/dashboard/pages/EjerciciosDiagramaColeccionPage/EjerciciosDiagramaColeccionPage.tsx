import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { createColumnHelper } from '@tanstack/react-table';
import { confirmar } from '../../../../utils/dialogos';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import Icon from '../../atoms/Icon/Icon';
import CategoriasEjerciciosModal from '../../organisms/CategoriasEjerciciosModal/CategoriasEjerciciosModal';
import { etiquetaMotorDiagrama, etiquetaTipoDiagrama } from '../../../../lib/diagramas/etiquetas';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import type { EjercicioDiagramaData } from '../../../../types/contenidos';
import styles from './EjerciciosDiagramaColeccionPage.module.css';

const API_BASE = '/api';

/** Mensaje legible de un error atrapado, sin recurrir a `any`. */
function mensajeDeError(e: unknown, porDefecto: string): string {
  return e instanceof Error && e.message ? e.message : porDefecto;
}

interface CategoriaLigera { id: string; nombre: string; bloqueId: string | null }
interface BloqueLigero { id: string; nombre: string }

/** Admin del módulo "Diagramas": lista los ejercicios de diseño de una colección. */
export default function EjerciciosDiagramaColeccionPage() {
  const { id } = useParams<{ id: string }>();
  const { sessionToken } = useAuth();
  const navigate = useNavigate();
  const [ejercicios, setEjercicios] = useState<EjercicioDiagramaData[]>([]);
  const [nombreColeccion, setNombreColeccion] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const [categorias, setCategorias] = useState<CategoriaLigera[]>([]);
  const [bloques, setBloques] = useState<BloqueLigero[]>([]);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  };

  const fetchEjercicios = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/colecciones/${id}/ejercicios-diagrama`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) throw new Error('Error al cargar ejercicios de diagrama');
      const data = (await res.json()) as { ejercicios?: EjercicioDiagramaData[] };
      setEjercicios(data.ejercicios ?? []);
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al cargar ejercicios de diagrama'));
    } finally {
      setLoading(false);
    }
  }, [id, sessionToken]);

  const fetchNombre = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/colecciones`, { headers: { 'x-session-token': sessionToken ?? '' } });
      if (!res.ok) return;
      const data = (await res.json()) as { colecciones?: { id: string; nombre: string; clave: string | null }[] };
      const c = (data.colecciones ?? []).find((x) => x.id === id);
      if (c) setNombreColeccion(c.clave ? `${c.clave} — ${c.nombre}` : c.nombre);
    } catch {
      // el nombre es cosmético; ignorar
    }
  }, [id, sessionToken]);

  const fetchCategorias = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/colecciones/${id}/categorias-ejercicios`, { headers: { 'x-session-token': sessionToken ?? '' } });
      if (!res.ok) return;
      const data = (await res.json()) as { categorias?: { id: string; nombre: string; bloqueId?: string | null }[] };
      setCategorias((data.categorias ?? []).map((c) => ({ id: c.id, nombre: c.nombre, bloqueId: c.bloqueId ?? null })));
    } catch { /* ignore */ }
  }, [id, sessionToken]);

  const fetchBloques = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/colecciones/${id}/bloques-ejercicios`, { headers: { 'x-session-token': sessionToken ?? '' } });
      if (!res.ok) return;
      const data = (await res.json()) as { bloques?: { id: string; nombre: string }[] };
      setBloques((data.bloques ?? []).map((b) => ({ id: b.id, nombre: b.nombre })));
    } catch { /* ignore */ }
  }, [id, sessionToken]);

  useEffect(() => {
    fetchEjercicios();
    fetchNombre();
    fetchCategorias();
    fetchBloques();
  }, [fetchEjercicios, fetchNombre, fetchCategorias, fetchBloques]);

  // "Bloque › Categoría" en una sola columna, en vez de añadir otra: con dos
  // bloques, un nombre de categoría suelto ("Colecciones") ya no identifica nada.
  const etiquetaPorCategoria = useMemo(() => {
    const nombreBloque = new Map(bloques.map((b) => [b.id, b.nombre]));
    return new Map(
      categorias.map((c) => {
        const bloque = c.bloqueId ? nombreBloque.get(c.bloqueId) : undefined;
        return [c.id, bloque ? `${bloque} › ${c.nombre}` : c.nombre];
      }),
    );
  }, [categorias, bloques]);
  const nombreCategoria = (catId: string | null) => (catId && etiquetaPorCategoria.get(catId)) || '—';

  async function handleTogglePublicado(ej: EjercicioDiagramaData) {
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/ejercicios-diagrama/${ej.id}/publicacion`, {
        method: 'PUT', headers, body: JSON.stringify({ publicado: !ej.publicado }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message || 'Error al cambiar la publicación');
      }
      await fetchEjercicios();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al cambiar la publicación'));
    }
  }

  async function handleDelete(ej: EjercicioDiagramaData) {
    if (!(await confirmar({ titulo: `¿Eliminar el ejercicio "${ej.titulo}"?`, texto: 'Esta acción no se puede deshacer.', confirmar: 'Eliminar', peligro: true }))) return;
    try {
      const res = await fetch(`${API_BASE}/admin/ejercicios-diagrama/${ej.id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Error al eliminar');
      await fetchEjercicios();
    } catch (err: unknown) {
      setError(mensajeDeError(err, 'Error al eliminar'));
    }
  }

  const columnHelper = createColumnHelper<EjercicioDiagramaData>();
  const columns = [
    columnHelper.accessor('orden', { header: 'Orden' }),
    columnHelper.accessor('titulo', { header: 'Título' }),
    columnHelper.accessor((row) => nombreCategoria(row.categoriaId), {
      id: 'categoria',
      header: 'Categoría',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor('slug', {
      header: 'Slug',
      cell: (info) => <code className={styles.slug}>{info.getValue()}</code>,
    }),
    columnHelper.accessor((row) => etiquetaTipoDiagrama(row.tipoDiagrama), {
      id: 'tipoDiagrama',
      header: 'Tipo de diagrama',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor((row) => etiquetaMotorDiagrama(row.motor), {
      id: 'motor',
      header: 'Motor',
      cell: (info) => info.getValue(),
    }),
    // Un ejercicio sin aserciones no comprueba nada, así que el número es el
    // primer indicador de que algo está a medias.
    columnHelper.accessor((row) => row.aserciones.length, {
      id: 'aserciones',
      header: 'Aserciones',
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

  const getActions = (ej: EjercicioDiagramaData): ActionItem[] => [
    { label: 'Editar', icon: 'edit', onClick: () => navigate(`/admin/contenidos/${id}/diagramas/${ej.id}`) },
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
        <div className={styles.headerFila}>
          <h1 className={styles.pageTitle}>Diagramas{nombreColeccion ? ` — ${nombreColeccion}` : ''}</h1>
          <button className={styles.catBtn} onClick={() => setCatOpen(true)}>
            <Icon name="folder" size="sm" /> Categorías
          </button>
        </div>
      </div>

      {error && <div className={styles.error} onClick={() => setError('')}>{error}</div>}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <AdminTable
          title="Ejercicios de diseño"
          columns={columns}
          data={ejercicios}
          actions={getActions}
          onAdd={() => navigate(`/admin/contenidos/${id}/diagramas/nuevo`)}
          addLabel="Nuevo Ejercicio"
          emptyMessage="Esta colección aún no tiene ejercicios de diagrama."
          searchPlaceholder="Buscar ejercicio..."
          initialSorting={[{ id: 'orden', desc: false }]}
        />
      )}

      {/* Las categorías y los bloques son los MISMOS que usan los ejercicios de
          programación: el modal se comparte a propósito para que un autor no
          tenga que mantener dos taxonomías paralelas de la misma colección.
          Al cerrar hay que refrescar ambos, porque el modal permite crearlos y
          renombrarlos y la columna de la tabla los usa. */}
      {id && <CategoriasEjerciciosModal isOpen={catOpen} coleccionId={id} onClose={() => { setCatOpen(false); fetchCategorias(); fetchBloques(); fetchEjercicios(); }} />}
    </div>
  );
}
