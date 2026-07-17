import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export interface EstadoCarga<T> {
  data: T | null;
  cargando: boolean;
  /** Fallo de red / 5xx / timeout: la UI ofrece reintentar. */
  error: boolean;
  /** 404: recurso no encontrado o sin acceso. */
  noEncontrado: boolean;
  reintentar: () => void;
}

/**
 * Carga gated de la API (header `x-session-token`) para pantallas standalone del
 * alumno: timeout de 15 s con AbortController (no "Cargando…" eterno si el API no
 * responde), distingue 404 de error, y permite reintentar. `url = null` no carga.
 * Reinicia SIEMPRE los tres flags al cargar, así un 404 previo no contamina una
 * carga posterior exitosa.
 */
export function useCargaGated<T>(url: string | null): EstadoCarga<T> {
  const { sessionToken } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    if (!url || !sessionToken) return;
    setCargando(true);
    setError(false);
    setNoEncontrado(false);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    fetch(url, { headers: { 'x-session-token': sessionToken }, signal: ctrl.signal })
      .then((r) => {
        if (r.status === 404) { setNoEncontrado(true); return null; }
        if (!r.ok) { setError(true); return null; }
        return r.json();
      })
      .then((json) => { if (json) setData(json as T); })
      .catch(() => setError(true))
      .finally(() => { clearTimeout(t); setCargando(false); });
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [url, sessionToken, reintento]);

  const reintentar = useCallback(() => setReintento((n) => n + 1), []);
  return { data, cargando, error, noEncontrado, reintentar };
}
