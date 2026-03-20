import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { ActividadTipo, Actividad } from '@/types/calendario';

const API_BASE = '/api';

export interface UpdateActividadPayload {
  tipo?: ActividadTipo;
  titulo?: string;
  descripcion?: string;
  enlace?: string;
  externo?: boolean;
  duracion?: string;
  fechaEntrega?: string;
}

interface UseUpdateActividadResult {
  isUpdating: boolean;
  updateError: string | null;
  updateActividad: (actividadId: string, payload: UpdateActividadPayload) => Promise<Actividad | null>;
}

export function useUpdateActividad(): UseUpdateActividadResult {
  const { sessionToken } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const updateActividad = useCallback(
    async (actividadId: string, payload: UpdateActividadPayload): Promise<Actividad | null> => {
      setUpdateError(null);
      setIsUpdating(true);

      try {
        const res = await fetch(`${API_BASE}/admin/calendario/actividad/${actividadId}`, {
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

        const act = data.actividad;
        return {
          id: act.id,
          tipo: act.tipo,
          titulo: act.titulo,
          descripcion: act.descripcion,
          enlace: act.enlace,
          externo: act.externo,
          duracion: act.duracion,
          fechaEntrega: act.fechaEntrega,
          enlacesExtra: act.enlacesExtra,
        } as Actividad;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al actualizar actividad';
        setUpdateError(message);
        setTimeout(() => setUpdateError(null), 3000);
        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [sessionToken],
  );

  return { isUpdating, updateError, updateActividad };
}
