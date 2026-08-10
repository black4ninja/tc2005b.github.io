import { useState, useEffect, useCallback } from 'react';
import { confirmar, avisar } from '../../../../utils/dialogos';
import { useNavigate } from 'react-router';
import { createColumnHelper, type Row } from '@tanstack/react-table';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import Modal from '../../atoms/Modal/Modal';
import GrupoForm, { type AdminRef } from '../../organisms/GrupoForm/GrupoForm';
import AsignacionesModal, { type Asignacion } from '../../organisms/AsignacionesModal/AsignacionesModal';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import type { ColeccionRef } from '../../../../types/contenidos';
import styles from './GruposPage.module.css';

interface GrupoData {
  id: string;
  name: string;
  fechaInicio?: string;
  fechaFin?: string;
  active: boolean;
  /** false = borrado lógico. Solo llega así con los filtros "eliminados"/"todos". */
  exists?: boolean;
  colecciones?: ColeccionRef[];
  admins?: AdminRef[];
  modulosDeshabilitados?: Record<string, string[]>;
  urlAgendaEntrevistas?: string | null;
  /** Campos del perfil que este grupo NO pide (vacío = los pide todos). */
  camposPerfilDeshabilitados?: string[];
}

const API_BASE = '/api';

/**
 * Filtro de estado. Se resuelve en el SERVIDOR (`?estado=`), no en el cliente:
 * por defecto solo se traen los activos, y los eliminados solo viajan si se
 * piden expresamente.
 */
const FILTROS = [
  { valor: 'activos', label: 'Activos' },
  { valor: 'inactivos', label: 'Inactivos' },
  { valor: 'eliminados', label: 'Eliminados' },
  { valor: 'todos', label: 'Todos' },
] as const;

type FiltroEstado = (typeof FILTROS)[number]['valor'];

/** Un grupo eliminado (borrado lógico) solo se muestra; ya no se opera sobre él. */
function estaEliminado(grupo: GrupoData): boolean {
  return grupo.exists === false;
}

/** ms de la fecha; las que faltan o no parsean van al final del orden ascendente. */
function tiempo(valor: unknown): number {
  if (typeof valor !== 'string' || !valor) return Number.POSITIVE_INFINITY;
  const ms = new Date(valor).getTime();
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
}

/**
 * Orden de una columna de fecha POR INSTANTE, no por el texto ISO que guarda el
 * accessor (que está ahí para que el buscador de la tabla siga encontrando por
 * fecha). Comparar el texto funcionaría de casualidad mientras el formato no
 * cambie; comparar timestamps es lo que se quiere decir.
 */
function ordenarPorFecha(filaA: Row<GrupoData>, filaB: Row<GrupoData>, columnaId: string): number {
  const a = tiempo(filaA.getValue(columnaId));
  const b = tiempo(filaB.getValue(columnaId));
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export default function GruposPage() {
  const { sessionToken } = useAuth();
  const navigate = useNavigate();
  const [grupos, setGrupos] = useState<GrupoData[]>([]);
  const [colecciones, setColecciones] = useState<ColeccionRef[]>([]);
  const [admins, setAdmins] = useState<AdminRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editGrupo, setEditGrupo] = useState<GrupoData | undefined>();
  // Filtro de estado — no persistente (solo durante esta visita).
  const [filtro, setFiltro] = useState<FiltroEstado>('activos');

  // Modal de asignaciones (colecciones + módulos por colección).
  const [asignGrupo, setAsignGrupo] = useState<GrupoData | null>(null);
  const [savingAsign, setSavingAsign] = useState(false);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-session-token': sessionToken ?? '',
  };

  const fetchGrupos = useCallback(async () => {
    try {
      setLoading(true);
      // Una recarga con éxito deja la pantalla en un estado coherente, así que
      // se lleva por delante el error de la operación anterior. Si no, la banda
      // roja sobrevive al cambio de filtro y hasta se cuela en el modal de
      // asignaciones, que aparece "roto" antes de enviar nada.
      setError('');
      const res = await fetch(`${API_BASE}/admin/grupos?estado=${filtro}`, { headers: { 'x-session-token': sessionToken ?? '' } });
      if (!res.ok) throw new Error('Error al cargar grupos');
      const data = await res.json();
      setGrupos(data.grupos);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionToken, filtro]);

  const fetchColecciones = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/colecciones`, { headers: { 'x-session-token': sessionToken ?? '' } });
      if (!res.ok) return;
      const data = await res.json();
      setColecciones(data.colecciones ?? []);
    } catch {
      // opcional en el form; ignorar error de carga
    }
  }, [sessionToken]);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/administradores`, { headers: { 'x-session-token': sessionToken ?? '' } });
      if (!res.ok) return;
      const data = await res.json();
      setAdmins(data.administradores ?? []);
    } catch {
      // opcional en el form; ignorar error de carga
    }
  }, [sessionToken]);

  // Los grupos se recargan al cambiar de filtro; los catálogos del formulario
  // (colecciones y administradores) NO dependen del filtro. En un solo efecto,
  // cada clic de chip volvía a pedir los tres, y `/admin/administradores` es la
  // consulta cara.
  useEffect(() => {
    fetchGrupos();
  }, [fetchGrupos]);

  useEffect(() => {
    fetchColecciones();
    fetchAdmins();
  }, [fetchColecciones, fetchAdmins]);

  function openCreate() {
    setEditGrupo(undefined);
    setModalOpen(true);
  }

  function openEdit(grupo: GrupoData) {
    setEditGrupo(grupo);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditGrupo(undefined);
  }

  // `fechaInicio`/`fechaFin` en null = quitar la fecha (el servidor las borra).
  async function handleSave(data: { name: string; fechaInicio?: string | null; fechaFin?: string | null; admins?: string[]; urlAgendaEntrevistas?: string; camposPerfilDeshabilitados?: string[] }) {
    setSaving(true);
    setError('');
    try {
      const url = editGrupo
        ? `${API_BASE}/admin/grupos/${editGrupo.id}`
        : `${API_BASE}/admin/grupos`;
      const method = editGrupo ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers, body: JSON.stringify(data) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al guardar');
      }
      const creando = !editGrupo;
      closeModal();
      // Un grupo nace ACTIVO, así que recargar con el filtro puesto en
      // "Eliminados" o "Inactivos" lo dejaría fuera de la lista: el admin ve
      // que no aparece, cree que falló y lo crea otra vez. Se salta al filtro
      // donde sí está (el cambio de filtro ya dispara la recarga).
      if (creando && filtro !== 'activos' && filtro !== 'todos') {
        setFiltro('activos');
      } else {
        await fetchGrupos();
      }
      if (creando) {
        await avisar({ titulo: 'Grupo creado', texto: `"${data.name}" ya está en la lista.`, icono: 'success' });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAsignaciones(asignaciones: Asignacion[]) {
    if (!asignGrupo) return;
    setSavingAsign(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${asignGrupo.id}/asignaciones`, {
        method: 'PUT', headers, body: JSON.stringify({ asignaciones }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al guardar las asignaciones');
      }
      setAsignGrupo(null);
      await fetchGrupos();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingAsign(false);
    }
  }

  async function handleToggleActive(grupo: GrupoData) {
    const action = grupo.active ? 'Desactivar' : 'Activar';
    if (!(await confirmar({ titulo: `¿${action} el grupo "${grupo.name}"?` }))) return;
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupo.id}/archive`, { method: 'PATCH', headers });
      if (!res.ok) throw new Error(`Error al ${action.toLowerCase()}`);
      await fetchGrupos();
      // Bajo el filtro "Activos" el grupo desactivado se cae de la lista, y una
      // fila que se esfuma sin más es indistinguible de un borrado. Se avisa de
      // dónde ha ido.
      if (grupo.active && filtro === 'activos') {
        await avisar({
          titulo: 'Grupo desactivado',
          texto: `"${grupo.name}" ya no aparece aquí; está en el filtro "Inactivos".`,
          icono: 'success',
        });
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(grupo: GrupoData) {
    if (!(await confirmar({ titulo: `¿Eliminar el grupo "${grupo.name}"?`, texto: `Esta acción no se puede deshacer.`, confirmar: 'Eliminar', peligro: true }))) return;
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${grupo.id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Error al eliminar');
      await fetchGrupos();
    } catch (err: any) {
      setError(err.message);
    }
  }

  // Se pinta en UTC porque así se guarda: son días de calendario anclados a la
  // medianoche UTC (ver `parseFechaDia()` en la API). Sin `timeZone`, el
  // navegador las traduce a la hora local y en México (UTC-6) la medianoche del
  // 10-ago cae el 9-ago: la tabla enseñaba el día anterior al que se capturó.
  function formatDate(value?: string): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('es-MX', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  const columnHelper = createColumnHelper<GrupoData>();

  const columns = [
    columnHelper.accessor('name', { header: 'Nombre' }),
    columnHelper.accessor((row) => (row.colecciones ?? []).map((c) => c.clave ?? c.slug).join(', '), {
      id: 'colecciones',
      header: 'Colecciones',
      cell: (info) => info.getValue() || '—',
    }),
    columnHelper.accessor((row) => (row.admins ?? []).map((a) => a.name || a.email).join(', '), {
      id: 'admins',
      header: 'Administradores',
      cell: (info) => info.getValue() || '—',
    }),
    // El accessor sigue siendo el texto ISO para que el buscador de la tabla lo
    // encuentre ("2026-08"); el orden NO puede depender de ese texto, así que va
    // por timestamp en un sortingFn propio, con las vacías siempre al final.
    columnHelper.accessor('fechaInicio', {
      header: 'Fecha Inicio',
      cell: (info) => formatDate(info.getValue()),
      sortingFn: ordenarPorFecha,
      sortUndefined: 'last',
    }),
    columnHelper.accessor('fechaFin', {
      header: 'Fecha Fin',
      cell: (info) => formatDate(info.getValue()),
      sortingFn: ordenarPorFecha,
      sortUndefined: 'last',
    }),
    columnHelper.accessor((row) => (estaEliminado(row) ? 'Eliminado' : row.active ? 'Activo' : 'Inactivo'), {
      id: 'estado',
      header: 'Estado',
      cell: (info) => {
        const estado = info.getValue();
        const clase =
          estado === 'Eliminado' ? styles.badgeDeleted : estado === 'Activo' ? styles.badgeActive : styles.badgeInactive;
        return <span className={`${styles.badge} ${clase}`}>{estado}</span>;
      },
    }),
  ];

  const getActions = (grupo: GrupoData): ActionItem[] => {
    // Un grupo eliminado se lista para consulta, pero no se opera: los endpoints
    // que quedan filtran por `exists` y responderían 404. Un grupo INACTIVO sí
    // se edita y se configura (updateGrupo y setAsignacionesGrupo consultan por
    // `exists`, no por `active`), así que aquí solo se mira el borrado.
    if (estaEliminado(grupo)) return [];
    return [
      { label: 'Ver', icon: 'visibility', onClick: () => navigate(`/admin/grupos/${grupo.id}`) },
      { label: 'Editar', icon: 'edit', onClick: () => openEdit(grupo) },
      { label: 'Asignaciones', icon: 'library_books', onClick: () => setAsignGrupo(grupo) },
      {
        label: grupo.active ? 'Desactivar' : 'Activar',
        icon: grupo.active ? 'toggle_off' : 'toggle_on',
        onClick: () => handleToggleActive(grupo),
      },
      { label: 'Eliminar', icon: 'delete', onClick: () => handleDelete(grupo), variant: 'danger' },
    ];
  };

  const vacio =
    filtro === 'eliminados'
      ? 'No hay grupos eliminados'
      : filtro === 'inactivos'
        ? 'No hay grupos inactivos'
        : 'No hay grupos registrados';

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Grupos</h1>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.filtros}>
        <span className={styles.filtrosLabel}>
          <span className="material-icons">filter_list</span>
          Mostrar:
        </span>
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            className={`${styles.filtroBtn} ${filtro === f.valor ? styles.filtroBtnActive : ''}`}
            aria-pressed={filtro === f.valor}
            onClick={() => setFiltro(f.valor)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* La tabla se renderiza SIEMPRE, con su prop `loading`: sustituirla por
          un "Cargando..." la desmonta en cada cambio de filtro y su estado
          interno (búsqueda, orden, página) vuelve a cero. */}
      <AdminTable
        title="Grupos registrados"
        columns={columns}
        data={grupos}
        loading={loading}
        actions={getActions}
        onAdd={openCreate}
        addLabel="Nuevo Grupo"
        emptyMessage={vacio}
        searchPlaceholder="Buscar grupo..."
        initialSorting={[{ id: 'fechaInicio', desc: false }]}
      />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editGrupo ? 'Editar Grupo' : 'Nuevo Grupo'}>
        <GrupoForm
          grupo={editGrupo}
          admins={admins}
          onSave={handleSave}
          onCancel={closeModal}
          loading={saving}
        />
      </Modal>

      <AsignacionesModal
        isOpen={asignGrupo !== null}
        grupo={asignGrupo}
        colecciones={colecciones}
        onSave={handleSaveAsignaciones}
        onCancel={() => setAsignGrupo(null)}
        loading={savingAsign}
        error={asignGrupo ? error : ''}
      />
    </div>
  );
}
