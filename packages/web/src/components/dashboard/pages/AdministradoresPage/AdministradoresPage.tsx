import { useState, useEffect, useCallback } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import Modal from '../../atoms/Modal/Modal';
import DashButton from '../../atoms/DashButton/DashButton';
import type { ActionItem } from '../../organisms/AdminTable/AdminTable';
import styles from './AdministradoresPage.module.css';

interface AdminData {
  id: string;
  name: string;
  email: string;
  lastLogin: string | null;
  createdAt: string;
}

interface GrupoConAdmins {
  id: string;
  name: string;
  admins?: { id: string }[];
}

const API_BASE = '/api';

/**
 * Censo de administradores dados de alta. No incluye alumnos: el API filtra por
 * `userType: 'admin'`. Desde cada fila se asignan sus grupos (asociación
 * organizativa bidireccional; no cambia accesos).
 */
export default function AdministradoresPage() {
  const { sessionToken } = useAuth();
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [grupos, setGrupos] = useState<GrupoConAdmins[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal "Grupos del administrador".
  const [modalAdmin, setModalAdmin] = useState<AdminData | null>(null);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const headers = { 'x-session-token': sessionToken ?? '' };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [resAdmins, resGrupos] = await Promise.all([
        fetch(`${API_BASE}/admin/administradores`, { headers }),
        fetch(`${API_BASE}/admin/grupos`, { headers }),
      ]);
      if (!resAdmins.ok) throw new Error('Error al cargar administradores');
      if (!resGrupos.ok) throw new Error('Error al cargar grupos');
      const dataAdmins = await resAdmins.json();
      const dataGrupos = await resGrupos.json();
      setAdmins(dataAdmins.administradores ?? []);
      setGrupos(dataGrupos.grupos ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // headers depende solo de sessionToken; se recrea en cada render pero no importa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /** Grupos donde figura este admin (derivado de la lista de grupos). */
  const gruposDe = useCallback(
    (adminId: string) => grupos.filter((g) => (g.admins ?? []).some((a) => a.id === adminId)),
    [grupos],
  );

  function openGruposModal(admin: AdminData) {
    setModalAdmin(admin);
    setSeleccion(gruposDe(admin.id).map((g) => g.id));
    setError('');
  }

  function toggleGrupo(id: string) {
    setSeleccion((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }

  async function guardarGrupos() {
    if (!modalAdmin) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/administradores/${modalAdmin.id}/grupos`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ grupoIds: seleccion }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al asignar grupos');
      }
      setModalAdmin(null);
      await fetchAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function formatDateTime(value: string | null): string {
    if (!value) return 'Nunca';
    return new Date(value).toLocaleString('es-MX', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function formatDate(value: string): string {
    return new Date(value).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  const columnHelper = createColumnHelper<AdminData>();

  const columns = [
    columnHelper.accessor('name', { header: 'Nombre', cell: (info) => info.getValue() || '—' }),
    columnHelper.accessor('email', { header: 'Correo' }),
    columnHelper.accessor((row) => gruposDe(row.id).map((g) => g.name).join(', '), {
      id: 'grupos',
      header: 'Grupos',
      cell: (info) => info.getValue() || '—',
    }),
    columnHelper.accessor('lastLogin', {
      header: 'Último acceso',
      cell: (info) => formatDateTime(info.getValue()),
    }),
    columnHelper.accessor('createdAt', {
      header: 'Alta',
      cell: (info) => formatDate(info.getValue()),
    }),
  ];

  const getActions = (admin: AdminData): ActionItem[] => [
    { label: 'Grupos', onClick: () => openGruposModal(admin) },
  ];

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Administradores</h1>

      {error && !modalAdmin && <div className={styles.error}>{error}</div>}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <AdminTable
          title="Administradores dados de alta"
          columns={columns}
          data={admins}
          actions={getActions}
          emptyMessage="No hay administradores registrados"
          searchPlaceholder="Buscar administrador..."
        />
      )}

      <Modal
        isOpen={modalAdmin !== null}
        onClose={() => setModalAdmin(null)}
        title={modalAdmin ? `Grupos de ${modalAdmin.name || modalAdmin.email}` : 'Grupos'}
      >
        {error && modalAdmin && <div className={styles.error}>{error}</div>}
        <div className={styles.checkboxList}>
          {grupos.length === 0 && <span className={styles.hint}>No hay grupos disponibles.</span>}
          {grupos.map((g) => (
            <label key={g.id} className={styles.checkboxItem}>
              <input
                type="checkbox"
                checked={seleccion.includes(g.id)}
                onChange={() => toggleGrupo(g.id)}
                disabled={saving}
              />
              <span className={styles.checkboxLabel} title={g.name}>{g.name}</span>
            </label>
          ))}
        </div>
        <div className={styles.actions}>
          <DashButton variant="outline" onClick={() => setModalAdmin(null)} disabled={saving}>
            Cancelar
          </DashButton>
          <DashButton onClick={guardarGrupos} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </DashButton>
        </div>
      </Modal>
    </div>
  );
}
