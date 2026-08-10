import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Actividad } from '@/types/calendario';

const API_BASE = '/api';

interface UseArchivoActividadResult {
  isSubiendoArchivo: boolean;
  archivoError: string | null;
  /** Sube (o reemplaza) el adjunto de una actividad ya creada. */
  subirArchivo: (actividadId: string, archivo: File) => Promise<Actividad | null>;
  quitarArchivo: (actividadId: string) => Promise<Actividad | null>;
}

export function useArchivoActividad(): UseArchivoActividadResult {
  const { sessionToken } = useAuth();
  const [isSubiendoArchivo, setSubiendo] = useState(false);
  const [archivoError, setError] = useState<string | null>(null);

  const pedir = useCallback(
    async (url: string, init: RequestInit): Promise<Actividad | null> => {
      setError(null);
      setSubiendo(true);
      try {
        const res = await fetch(url, {
          ...init,
          headers: {
            ...(init.headers ?? {}),
            ...(sessionToken ? { 'x-session-token': sessionToken } : {}),
          },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
        return data.actividad as Actividad;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error con el archivo';
        setError(message);
        setTimeout(() => setError(null), 4000);
        return null;
      } finally {
        setSubiendo(false);
      }
    },
    [sessionToken],
  );

  const subirArchivo = useCallback(
    (actividadId: string, archivo: File) => {
      const body = new FormData();
      body.append('archivo', archivo);
      // Sin Content-Type a mano: fetch pone el boundary del multipart.
      return pedir(`${API_BASE}/admin/calendario/actividad/${actividadId}/archivo`, {
        method: 'POST',
        body,
      });
    },
    [pedir],
  );

  const quitarArchivo = useCallback(
    (actividadId: string) =>
      pedir(`${API_BASE}/admin/calendario/actividad/${actividadId}/archivo`, {
        method: 'DELETE',
      }),
    [pedir],
  );

  return { isSubiendoArchivo, archivoError, subirArchivo, quitarArchivo };
}
