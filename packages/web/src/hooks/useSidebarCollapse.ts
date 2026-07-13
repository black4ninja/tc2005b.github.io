import { useState, useEffect, useCallback, useRef } from 'react';

const ANCHO_COMPACTO = 1024;

export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth <= ANCHO_COMPACTO);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Solo forzamos el colapso al CRUZAR el umbral, no en cada resize: antes,
  // cualquier evento de resize por debajo de 1024px volvía a colapsar el
  // sidebar, así que en una pantalla mediana era imposible dejarlo abierto
  // (y con el árbol de Contenidos dentro, eso deja al usuario sin navegación).
  const eraCompacto = useRef(window.innerWidth <= ANCHO_COMPACTO);

  const toggle = useCallback(() => {
    if (window.innerWidth <= 768) {
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const compacto = window.innerWidth <= ANCHO_COMPACTO;

      if (window.innerWidth > 768) setMobileOpen(false);

      if (compacto !== eraCompacto.current) {
        // Cruzamos el umbral: colapsar al entrar en compacto, expandir al salir.
        setCollapsed(compacto);
        eraCompacto.current = compacto;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { collapsed, mobileOpen, toggle, closeMobile };
}
