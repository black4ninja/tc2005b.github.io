import { useState, useEffect, useCallback } from 'react';
import { confirmar, avisar } from '../../../../utils/dialogos';
import { useNavigate } from 'react-router';
import { createColumnHelper, type Row } from '@tanstack/react-table';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import Modal from '../../atoms/Modal/Modal';
import GrupoForm, { type AdminRef } from '../../organisms/GrupoForm/GrupoForm';
import AsignacionesModal, { type Asignacion } from '../../organisms/AsignacionesModal/AsignacionesModal';
import CategoriasGrupoModal from '../../organisms/CategoriasGrupoModal/CategoriasGrupoModal';
import NombreGrupo, { type CategoriaRef } from '../../atoms/NombreGrupo/NombreGrupo';
import DashButton from '../../atoms/DashButton/DashButton';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import type { ColeccionRef } from '../../../../types/contenidos';
import { formatPeriodo } from '../../../../utils/periodoGrupo';
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
  modulosGrupo?: string[];
  urlAgendaEntrevistas?: string | null;
  /** Campos del perfil que este grupo NO pide (vacío = los pide todos). */
  camposPerfilDeshabilitados?: string[];
  /** Categoría desplegada (de ella sale el color). null = sin clasificar. */
  categoria?: CategoriaRef | null;
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

  // Catálogo de categorías: alimenta el formulario, los chips y su propio modal.
  const [categorias, setCategorias] = useState<CategoriaRef[]>([]);
  const [categoriasModalOpen, setCategoriasModalOpen] = useState(false);
  // '' = todas. A diferencia del filtro de estado, este se resuelve en el
  // cliente: la categoría ya viaja dentro de cada grupo y pedirlos otra vez al
  // servidor solo por filtrar sería un viaje de más.
  const [categoriaFiltro, setCategoriaFiltro] = useState('');

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

  const fetchCategorias = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/categorias-grupo`, { headers: { 'x-session-token': sessionToken ?? '' } });
      if (!res.ok) return;
      const data = await res.json();
      setCategorias(data.categorias ?? []);
    } catch {
      // El catálogo es opcional: sin él la tabla se pinta igual, en gris.
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
    fetchCategorias();
  }, [fetchColecciones, fetchAdmins, fetchCategorias]);

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
  async function handleSave(data: { name: string; fechaInicio?: string | null; fechaFin?: string | null; admins?: string[]; urlAgendaEntrevistas?: string; camposPerfilDeshabilitados?: string[]; categoriaId?: string | null }) {
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

  async function handleSaveAsignaciones(asignaciones: Asignacion[], modulosGrupo: string[]) {
    if (!asignGrupo) return;
    setSavingAsign(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/grupos/${asignGrupo.id}/asignaciones`, {
        method: 'PUT', headers, body: JSON.stringify({ asignaciones, modulosGrupo }),
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

  const columnHelper = createColumnHelper<GrupoData>();

  const columns = [
    // El accessor sigue siendo el nombre plano: es lo que busca el filtro global
    // de la tabla. Lo que cambia es cómo se PINTA — franja de color y sección
    // destacada — para que dos grupos que comparten prefijo no se confundan.
    columnHelper.accessor('name', {
      header: 'Nombre',
      cell: (info) => (
        <NombreGrupo nombre={info.getValue()} categoria={info.row.original.categoria} marca="barra" />
      ),
    }),
    columnHelper.accessor((row) => row.categoria?.nombre ?? '', {
      id: 'categoria',
      header: 'Categoría',
      cell: (info) => {
        const categoria = info.row.original.categoria;
        if (!categoria) return <span className={styles.sinCategoria}>Sin categoría</span>;
        return (
          <span className={styles.chipCategoria} style={{ background: categoria.color }}>
            {categoria.nombre}
          </span>
        );
      },
    }),
    columnHelper.accessor((row) => (row.colecciones ?? []).map((c) => c.clave ?? c.slug).join(', '), {
      id: 'colecciones',
      header: 'Colecciones',
      cell: (info) => info.getValue() || '—',
    }),
    // El accessor sigue siendo la lista COMPLETA: es lo que busca el filtro de
    // la tabla, y buscar por el segundo administrador tiene que seguir dando con
    // la fila aunque en pantalla solo se lea el primero.
    columnHelper.accessor((row) => (row.admins ?? []).map((a) => a.name || a.email).join(', '), {
      id: 'admins',
      header: 'Administradores',
      cell: (info) => {
        const nombres = (info.row.original.admins ?? []).map((a) => a.name || a.email);
        if (nombres.length === 0) return '—';
        return (
          <span className={styles.admins} title={nombres.join(', ')}>
            {nombres[0]}
            {nombres.length > 1 && <span className={styles.adminsMas}>+{nombres.length - 1}</span>}
          </span>
        );
      },
    }),
    // Las dos fechas en UNA columna: se leen como un rango y por separado
    // ocupaban el doble. El accessor sigue siendo el ISO de la fecha de inicio
    // para que el buscador encuentre por "2026-08" y el orden sea por inicio;
    // el fin es información de apoyo, no un criterio de orden.
    columnHelper.accessor('fechaInicio', {
      id: 'periodo',
      header: 'Periodo',
      cell: (info) => formatPeriodo(info.getValue(), info.row.original.fechaFin),
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

  // El filtro de categoría se aplica sobre lo que ya trajo el de estado: son
  // independientes y se acumulan.
  const gruposVisibles = categoriaFiltro
    ? grupos.filter((g) => g.categoria?.id === categoriaFiltro)
    : grupos;

  // Con el filtro de categoría puesto, el mensaje tiene que hablar de ÉL: decir
  // "no hay grupos registrados" cuando sí los hay, pero de otra categoría, haría
  // pensar que se perdieron.
  const vacio = categoriaFiltro
    ? `Ningún grupo de "${categorias.find((c) => c.id === categoriaFiltro)?.nombre ?? 'esta categoría'}" con este estado`
    : filtro === 'eliminados'
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

      {/* La fila de categorías solo aparece cuando hay catálogo: sin él sería
          un filtro con una sola opción y un botón perdido. */}
      <div className={styles.filtros}>
        <span className={styles.filtrosLabel}>
          <span className="material-icons">label</span>
          Categoría:
        </span>
        <button
          type="button"
          className={`${styles.filtroBtn} ${categoriaFiltro === '' ? styles.filtroBtnActive : ''}`}
          aria-pressed={categoriaFiltro === ''}
          onClick={() => setCategoriaFiltro('')}
        >
          Todas
        </button>
        {categorias.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`${styles.filtroBtn} ${categoriaFiltro === c.id ? styles.filtroBtnActive : ''}`}
            aria-pressed={categoriaFiltro === c.id}
            onClick={() => setCategoriaFiltro(categoriaFiltro === c.id ? '' : c.id)}
          >
            <span className={styles.puntoFiltro} style={{ background: c.color }} aria-hidden="true" />
            {c.nombre}
          </button>
        ))}
        <DashButton variant="outline" onClick={() => setCategoriasModalOpen(true)}>
          Administrar categorías
        </DashButton>
      </div>

      {/* La tabla se renderiza SIEMPRE, con su prop `loading`: sustituirla por
          un "Cargando..." la desmonta en cada cambio de filtro y su estado
          interno (búsqueda, orden, página) vuelve a cero. */}
      <AdminTable
        title="Grupos registrados"
        columns={columns}
        data={gruposVisibles}
        loading={loading}
        actions={getActions}
        onAdd={openCreate}
        addLabel="Nuevo Grupo"
        emptyMessage={vacio}
        searchPlaceholder="Buscar grupo..."
        // Habilita el menú "Columnas" y recuerda lo que se apague.
        tableId="grupos"
        etiquetaDeFila={(g) => g.name}
        // El nombre desempata: los grupos de un mismo semestre comparten fecha
        // de inicio, y sin segundo criterio salían en un orden arbitrario que
        // ponía el 101 debajo del 102. Ahora quedan en orden numérico.
        initialSorting={[
          // 'periodo' es el id de la columna de fechas: ordena por la de inicio.
          { id: 'periodo', desc: false },
          { id: 'name', desc: false },
        ]}
      />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editGrupo ? 'Editar Grupo' : 'Nuevo Grupo'}>
        <GrupoForm
          grupo={editGrupo}
          admins={admins}
          categorias={categorias}
          onSave={handleSave}
          onCancel={closeModal}
          loading={saving}
        />
      </Modal>

      <CategoriasGrupoModal
        isOpen={categoriasModalOpen}
        onClose={() => setCategoriasModalOpen(false)}
        sessionToken={sessionToken ?? ''}
        categorias={categorias}
        onCambio={async () => {
          // Renombrar o recolorear una categoría cambia cómo se pinta la tabla,
          // así que hay que recargar las dos cosas, no solo el catálogo.
          await fetchCategorias();
          await fetchGrupos();
        }}
      />

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
