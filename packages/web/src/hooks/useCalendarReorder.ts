import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Calendario } from '@/types/calendario';

const API_BASE = '/api';

export interface ReorderUpdate {
  actividadId: string;
  dia: string;
  isPrevio: boolean;
  orden: number;
}

type SetCalendario = React.Dispatch<React.SetStateAction<Calendario | null>>;

interface UseCalendarReorderResult {
  isSaving: boolean;
  saveError: string | null;
  reorder: (updates: ReorderUpdate[], optimisticCalendario: Calendario) => void;
}

export function useCalendarReorder(
  setCalendario: SetCalendario,
): UseCalendarReorderResult {
  const { sessionToken } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const previousRef = useRef<Calendario | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const reorder = useCallback(
    (updates: ReorderUpdate[], optimisticCalendario: Calendario) => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      setSaveError(null);

      // Snapshot current state for rollback, then apply optimistic update
      setCalendario((prev) => {
        previousRef.current = prev;
        return optimisticCalendario;
      });

      setIsSaving(true);

      fetch(`${API_BASE}/admin/calendario/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { 'x-session-token': sessionToken } : {}),
        },
        body: JSON.stringify({ updates }),
      })
        .then((res) => {
          if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.message ?? `HTTP ${res.status}`)));
        })
        .catch((err) => {
          // Rollback
          if (previousRef.current) {
            setCalendario(previousRef.current);
          }
          setSaveError(err.message || 'Error al guardar');
          errorTimerRef.current = setTimeout(() => setSaveError(null), 3000);
        })
        .finally(() => {
          setIsSaving(false);
        });
    },
    [sessionToken, setCalendario],
  );

  return { isSaving, saveError, reorder };
}
