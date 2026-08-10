import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

const API_BASE = '/api';

export interface UpdateSemanaPayload {
  fechaInicio?: string;
  fechaFin?: string;
  diasActivos?: string[];
  titulo?: string;
  mensaje?: string;
  mensajeImportante?: string;
}

export interface UpdateSemanaResult {
  id: string;
  numero: string;
  fechaInicio: string;
  fechaFin: string;
  tipo: string;
  diasActivos?: string[];
  titulo?: string;
  mensaje?: string;
  mensajeImportante?: string;
  orden: number;
}

interface UseUpdateSemanaResult {
  isUpdatingSemana: boolean;
  updateSemanaError: string | null;
  updateSemana: (semanaId: string, payload: UpdateSemanaPayload) => Promise<UpdateSemanaResult | null>;
}

export function useUpdateSemana(): UseUpdateSemanaResult {
  const { sessionToken } = useAuth();
  const [isUpdatingSemana, setIsUpdating] = useState(false);
  const [updateSemanaError, setUpdateError] = useState<string | null>(null);

  const updateSemana = useCallback(
    async (semanaId: string, payload: UpdateSemanaPayload): Promise<UpdateSemanaResult | null> => {
      setUpdateError(null);
      setIsUpdating(true);

      try {
        const res = await fetch(`${API_BASE}/admin/calendario/semana/${semanaId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(sessionToken ? { 'x-session-token': sessionToken } : {}),
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message ?? `HTTP ${res.status}`);
        }

        return data.semana as UpdateSemanaResult;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al actualizar semana';
        setUpdateError(message);
        setTimeout(() => setUpdateError(null), 3000);
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [sessionToken],
  );

  return { isUpdatingSemana, updateSemanaError, updateSemana };
}
