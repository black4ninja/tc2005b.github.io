import { useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { TemaProvider, esPreferenciaValida, type PreferenciaTema } from './TemaContext';

/**
 * Conecta el tema con la sesión: le pasa al proveedor la preferencia guardada
 * en la ficha del usuario y le enseña a persistir los cambios.
 *
 * Va aparte de `TemaProvider` para que este no dependa de la autenticación: el
 * tema tiene que funcionar también en la pantalla de acceso, donde todavía no
 * hay usuario y manda la copia del navegador.
 */
export default function TemaConSesion({ children }: { children: ReactNode }) {
  const { user, sessionToken, updateUser } = useAuth();

  const guardada = user?.preferenciaTema;
  const preferenciaDelUsuario = esPreferenciaValida(guardada) ? guardada : undefined;

  const guardar = useCallback(
    (preferencia: PreferenciaTema) => {
      // Sin sesión no hay dónde guardarlo: se queda en el navegador, que es lo
      // que el proveedor ya hizo antes de llamar aquí.
      if (!sessionToken) return;

      // Optimista: el tema ya cambió en pantalla, y esperar a la respuesta no
      // aportaría nada. Si el guardado falla, la copia local mantiene la
      // elección en este navegador y se reintenta al siguiente cambio.
      updateUser({ preferenciaTema: preferencia });

      fetch('/api/me/preferencias/tema', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken },
        body: JSON.stringify({ tema: preferencia }),
      }).catch(() => {
        // Silencioso a propósito: es una preferencia, no una operación del
        // usuario. Un aviso de error aquí interrumpiría por algo que no le
        // impide seguir trabajando, y el tema ya se ve como pidió.
      });
    },
    [sessionToken, updateUser],
  );

  return (
    <TemaProvider preferenciaDelUsuario={preferenciaDelUsuario} onGuardar={guardar}>
      {children}
    </TemaProvider>
  );
}
