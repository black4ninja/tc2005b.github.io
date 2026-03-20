import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

const API_BASE = '/api';

interface UseDeleteActividadResult {
  isDeleting: boolean;
  deleteError: string | null;
  deleteActividad: (actividadId: string) => Promise<boolean>;
}

export function useDeleteActividad(): UseDeleteActividadResult {
  const { sessionToken } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteActividad = useCallback(
    async (actividadId: string): Promise<boolean> => {
      setDeleteError(null);
      setIsDeleting(true);

      try {
        const res = await fetch(`${API_BASE}/admin/calendario/actividad/${actividadId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken ? { 'x-session-token': sessionToken } : {}),
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message ?? `HTTP ${res.status}`);
        }

        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al eliminar actividad';
        setDeleteError(message);
        setTimeout(() => setDeleteError(null), 3000);
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [sessionToken],
  );

  return { isDeleting, deleteError, deleteActividad };
}
