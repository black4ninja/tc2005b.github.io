import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { ActividadTipo, Actividad } from '@/types/calendario';
import { actividadDesdeApi } from '@/utils/actividadDesdeApi';

const API_BASE = '/api';

export interface CreateActividadPayload {
  semanaId: string;
  dia: string;
  isPrevio: boolean;
  tipo: ActividadTipo;
  titulo?: string;
  descripcion?: string;
  enlace?: string;
  externo?: boolean;
  duracion?: string;
  fechaEntrega?: string;
  /** Las dos o ninguna; vacías borran la hora propia. */
  horaInicio?: string;
  horaFin?: string;
  /** Ids del staff; vacío = todos. */
  responsables?: string[];
}

interface UseCreateActividadResult {
  isCreating: boolean;
  createError: string | null;
  createActividad: (payload: CreateActividadPayload) => Promise<Actividad | null>;
}

export function useCreateActividad(): UseCreateActividadResult {
  const { sessionToken } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const createActividad = useCallback(
    async (payload: CreateActividadPayload): Promise<Actividad | null> => {
      setCreateError(null);
      setIsCreating(true);

      try {
        const res = await fetch(`${API_BASE}/admin/calendario/actividad`, {
          method: 'POST',
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

        return actividadDesdeApi(data.actividad);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al crear actividad';
        setCreateError(message);
        setTimeout(() => setCreateError(null), 3000);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [sessionToken],
  );

  return { isCreating, createError, createActividad };
}
