import { useState, useEffect, useCallback } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useAuth } from '../../../../context/AuthContext';
import AdminTable from '../../organisms/AdminTable/AdminTable';
import styles from './AdministradoresPage.module.css';

interface AdminData {
  id: string;
  name: string;
  email: string;
  lastLogin: string | null;
  createdAt: string;
}

const API_BASE = '/api';

/**
 * Censo de administradores dados de alta (solo lectura). No incluye alumnos: el
 * API filtra por `userType: 'admin'`.
 */
export default function AdministradoresPage() {
  const { sessionToken } = useAuth();
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/administradores`, {
        headers: { 'x-session-token': sessionToken ?? '' },
      });
      if (!res.ok) throw new Error('Error al cargar administradores');
      const data = await res.json();
      setAdmins(data.administradores ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  function formatDateTime(value: string | null): string {
    if (!value) return 'Nunca';
    return new Date(value).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDate(value: string): string {
    return new Date(value).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  const columnHelper = createColumnHelper<AdminData>();

  const columns = [
    columnHelper.accessor('name', { header: 'Nombre', cell: (info) => info.getValue() || '—' }),
    columnHelper.accessor('email', { header: 'Correo' }),
    columnHelper.accessor('lastLogin', {
      header: 'Último acceso',
      cell: (info) => formatDateTime(info.getValue()),
    }),
    columnHelper.accessor('createdAt', {
      header: 'Alta',
      cell: (info) => formatDate(info.getValue()),
    }),
  ];

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Administradores</h1>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <AdminTable
          title="Administradores dados de alta"
          columns={columns}
          data={admins}
          emptyMessage="No hay administradores registrados"
          searchPlaceholder="Buscar administrador..."
        />
      )}
    </div>
  );
}
