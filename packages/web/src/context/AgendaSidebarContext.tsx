import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * «Mi agenda» pinta sus calendarios (qué grupos y tipos se ven, y de qué color)
 * DENTRO del sidebar, como Google o Apple Calendar: una columna más al lado del
 * menú se comía el ancho que el calendario necesita.
 *
 * El sidebar no sabe nada de la agenda: solo ofrece un hueco (`slot`) y la
 * página pinta ahí su panel con un portal, así el estado (preferencias,
 * colores) se queda en la página que lo usa. `verMenu` es el interruptor para
 * volver al menú del rol sin salir de la agenda.
 */
interface AgendaSidebarValue {
  slot: HTMLElement | null;
  registrarSlot: (el: HTMLElement | null) => void;
  verMenu: boolean;
  setVerMenu: (v: boolean) => void;
  /** Si el panel se ve ahora mismo (sidebar desplegado y en modo calendarios). */
  panelVisible: boolean;
  /** Pone el sidebar en modo calendarios y lo abre si estaba plegado. */
  abrirCalendarios: () => void;
}

const AgendaSidebarContext = createContext<AgendaSidebarValue>({
  slot: null,
  registrarSlot: () => {},
  verMenu: false,
  setVerMenu: () => {},
  panelVisible: false,
  abrirCalendarios: () => {},
});

interface ProviderProps {
  children: ReactNode;
  collapsed: boolean;
  mobileOpen: boolean;
  toggleSidebar: () => void;
}

export function AgendaSidebarProvider({ children, collapsed, mobileOpen, toggleSidebar }: ProviderProps) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [verMenu, setVerMenu] = useState(false);

  const esMovil = () => window.innerWidth <= 768;
  const abrirCalendarios = useCallback(() => {
    setVerMenu(false);
    if (esMovil() ? !mobileOpen : collapsed) toggleSidebar();
  }, [collapsed, mobileOpen, toggleSidebar]);

  const panelVisible = !verMenu && (esMovil() ? mobileOpen : !collapsed);

  const value = useMemo(
    () => ({ slot, registrarSlot: setSlot, verMenu, setVerMenu, panelVisible, abrirCalendarios }),
    [slot, verMenu, panelVisible, abrirCalendarios],
  );
  return <AgendaSidebarContext.Provider value={value}>{children}</AgendaSidebarContext.Provider>;
}

export function useAgendaSidebar(): AgendaSidebarValue {
  return useContext(AgendaSidebarContext);
}
