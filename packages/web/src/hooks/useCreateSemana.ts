import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

const API_BASE = '/api';

export interface CreateSemanaPayload {
  grupoId: string;
  tipo: 'normal' | 'especial';
  fechaInicio: string;
  fechaFin: string;
  titulo?: string;
  mensaje?: string;
  mensajeImportante?: string;
}

interface CreateSemanaResult {
  id: string;
  numero: string;
  fechaInicio: string;
  fechaFin: string;
  tipo: string;
  titulo?: string;
  mensaje?: string;
  mensajeImportante?: string;
  orden: number;
}

interface UseCreateSemanaResult {
  isCreating: boolean;
  createError: string | null;
  createSemana: (payload: CreateSemanaPayload) => Promise<CreateSemanaResult | null>;
}

export function useCreateSemana(): UseCreateSemanaResult {
  const { sessionToken } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const createSemana = useCallback(
    async (payload: CreateSemanaPayload): Promise<CreateSemanaResult | null> => {
      setCreateError(null);
      setIsCreating(true);

      try {
        const res = await fetch(`${API_BASE}/admin/calendario/semana`, {
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

        return data.semana as CreateSemanaResult;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al crear semana';
        setCreateError(message);
        setTimeout(() => setCreateError(null), 3000);
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [sessionToken],
  );

  return { isCreating, createError, createSemana };
}
