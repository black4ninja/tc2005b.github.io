import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/** Lo que el usuario ELIGE. «auto» delega en el sistema operativo. */
export type PreferenciaTema = 'claro' | 'oscuro' | 'auto';
/** Lo que finalmente se pinta. «auto» ya está resuelto aquí. */
export type TemaEfectivo = 'claro' | 'oscuro';

export const PREFERENCIAS: PreferenciaTema[] = ['claro', 'oscuro', 'auto'];

export function esPreferenciaValida(v: unknown): v is PreferenciaTema {
  return typeof v === 'string' && (PREFERENCIAS as string[]).includes(v);
}

/**
 * Clave del navegador. Guarda una COPIA de lo que manda el servidor, y sirve
 * para dos cosas: pintar el tema correcto antes de saber quién eres —si no, la
 * página aparece en blanco y salta a oscuro al resolverse la sesión— y recordar
 * la elección de quien todavía no ha iniciado sesión.
 */
const CLAVE_LOCAL = 'tema';

/** Lo guardado en el navegador, o «auto» si no hay nada o hay basura. */
export function leerPreferenciaLocal(): PreferenciaTema {
  if (typeof localStorage === 'undefined') return 'auto';
  const guardado = localStorage.getItem(CLAVE_LOCAL);
  return esPreferenciaValida(guardado) ? guardado : 'auto';
}

/** ¿El sistema operativo pide oscuro? */
function sistemaPrefiereOscuro(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolverTema(preferencia: PreferenciaTema): TemaEfectivo {
  if (preferencia === 'auto') return sistemaPrefiereOscuro() ? 'oscuro' : 'claro';
  return preferencia;
}

/**
 * Estampa el tema en `<html>`. La hoja de estilos solo mira `data-theme`, no
 * `prefers-color-scheme`: quien resuelve «auto» es este código, y así elegir
 * «claro» a mano gana siempre sobre el ajuste del sistema.
 *
 * Se exporta porque `main.tsx` la llama ANTES de montar React, con lo que haya
 * en el navegador. Esperar al primer render deja un fogonazo blanco.
 */
export function aplicarTema(tema: TemaEfectivo): void {
  document.documentElement.setAttribute('data-theme', tema === 'oscuro' ? 'dark' : 'light');
  // Para que el navegador pinte de su color los controles nativos (barras de
  // scroll, campos de formulario) y no salgan claros sobre un fondo oscuro.
  document.documentElement.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light';
}

interface TemaContextValue {
  preferencia: PreferenciaTema;
  tema: TemaEfectivo;
  cambiarTema: (preferencia: PreferenciaTema) => void;
}

const TemaContext = createContext<TemaContextValue>({
  preferencia: 'auto',
  tema: 'claro',
  cambiarTema: () => {},
});

interface TemaProviderProps {
  children: ReactNode;
  /**
   * Preferencia guardada en la ficha del usuario, cuando ya se sabe quién es.
   * Manda sobre la copia local: es la que le sigue entre dispositivos.
   * `undefined` mientras no hay sesión resuelta.
   */
  preferenciaDelUsuario?: PreferenciaTema;
  /** Persiste el cambio en el servidor. Sin sesión, no se llama. */
  onGuardar?: (preferencia: PreferenciaTema) => void;
}

export function TemaProvider({ children, preferenciaDelUsuario, onGuardar }: TemaProviderProps) {
  const [preferencia, setPreferencia] = useState<PreferenciaTema>(() => leerPreferenciaLocal());
  const [tema, setTema] = useState<TemaEfectivo>(() => resolverTema(leerPreferenciaLocal()));

  // Cuando se resuelve la sesión, la del usuario pisa a la copia local: es la
  // que viaja con él. Si difieren, el navegador se pone al día.
  useEffect(() => {
    if (!preferenciaDelUsuario || preferenciaDelUsuario === preferencia) return;
    setPreferencia(preferenciaDelUsuario);
    localStorage.setItem(CLAVE_LOCAL, preferenciaDelUsuario);
  }, [preferenciaDelUsuario, preferencia]);

  // Aplica el tema y, en «auto», sigue al sistema mientras dure la sesión: si
  // el equipo cambia a oscuro al anochecer, el sitio cambia con él.
  useEffect(() => {
    const aplicar = () => setTema(resolverTema(preferencia));
    aplicar();

    if (preferencia !== 'auto' || typeof matchMedia !== 'function') return;
    const consulta = matchMedia('(prefers-color-scheme: dark)');
    consulta.addEventListener('change', aplicar);
    return () => consulta.removeEventListener('change', aplicar);
  }, [preferencia]);

  useEffect(() => {
    aplicarTema(tema);
  }, [tema]);

  const cambiarTema = useCallback(
    (nueva: PreferenciaTema) => {
      setPreferencia(nueva);
      // Se escribe la copia local SIEMPRE, también con sesión: es lo que evita
      // el fogonazo blanco en la siguiente carga, antes de resolver quién eres.
      localStorage.setItem(CLAVE_LOCAL, nueva);
      onGuardar?.(nueva);
    },
    [onGuardar],
  );

  const valor = useMemo(() => ({ preferencia, tema, cambiarTema }), [preferencia, tema, cambiarTema]);

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export function useTema(): TemaContextValue {
  return useContext(TemaContext);
}
