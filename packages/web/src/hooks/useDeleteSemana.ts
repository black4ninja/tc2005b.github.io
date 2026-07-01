import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

const API_BASE = '/api';

interface UseDeleteSemanaResult {
  isDeleting: boolean;
  deleteError: string | null;
  deleteSemana: (semanaId: string) => Promise<boolean>;
}

export function useDeleteSemana(): UseDeleteSemanaResult {
  const { sessionToken } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteSemana = useCallback(
    async (semanaId: string): Promise<boolean> => {
      setDeleteError(null);
      setIsDeleting(true);

      try {
        const res = await fetch(`${API_BASE}/admin/calendario/semana/${semanaId}`, {
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
        const message = err instanceof Error ? err.message : 'Error al eliminar semana';
        setDeleteError(message);
        setTimeout(() => setDeleteError(null), 3000);
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [sessionToken],
  );

  return { isDeleting, deleteError, deleteSemana };
}
