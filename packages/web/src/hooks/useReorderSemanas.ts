import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Calendario } from '@/types/calendario';

const API_BASE = '/api';

type SetCalendario = React.Dispatch<React.SetStateAction<Calendario | null>>;

interface UseReorderSemanasResult {
  isSaving: boolean;
  saveError: string | null;
  reorderSemanas: (grupoId: string, orderedIds: string[], optimisticCalendario: Calendario) => void;
}

export function useReorderSemanas(
  setCalendario: SetCalendario,
): UseReorderSemanasResult {
  const { sessionToken } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const previousRef = useRef<Calendario | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const reorderSemanas = useCallback(
    (grupoId: string, orderedIds: string[], optimisticCalendario: Calendario) => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      setSaveError(null);

      setCalendario((prev) => {
        previousRef.current = prev;
        return optimisticCalendario;
      });

      setIsSaving(true);

      fetch(`${API_BASE}/admin/calendario/semana/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-session-token': sessionToken } : {}),
        },
        body: JSON.stringify({ grupoId, orderedIds }),
      })
        .then((res) => {
          if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.message ?? `HTTP ${res.status}`)));
        })
        .catch((err) => {
          if (previousRef.current) {
            setCalendario(previousRef.current);
          }
          setSaveError(err.message || 'Error al reordenar semanas');
          errorTimerRef.current = setTimeout(() => setSaveError(null), 3000);
        })
        .finally(() => {
          setIsSaving(false);
        });
    },
    [sessionToken, setCalendario],
  );

  return { isSaving, saveError, reorderSemanas };
}
