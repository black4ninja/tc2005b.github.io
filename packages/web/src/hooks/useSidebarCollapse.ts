import { useState, useEffect, useCallback, useRef } from 'react';

const ANCHO_COMPACTO = 1024;
const ANCHO_MOVIL = 768;

export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth <= ANCHO_COMPACTO);
  const [mobileOpen, setMobileOpen] = useState(false);
  // En el celular el sidebar es un panel que se desliza encima del contenido:
  // ahí no hay sitio que ahorrar, así que nunca va compacto. Antes heredaba el
  // `collapsed` de pantalla mediana y se abría con solo iconos, sin textos.
  const [esMovil, setEsMovil] = useState(() => window.innerWidth <= ANCHO_MOVIL);
  // Solo forzamos el colapso al CRUZAR el umbral, no en cada resize: antes,
  // cualquier evento de resize por debajo de 1024px volvía a colapsar el
  // sidebar, así que en una pantalla mediana era imposible dejarlo abierto
  // (y con el árbol de Contenidos dentro, eso deja al usuario sin navegación).
  const eraCompacto = useRef(window.innerWidth <= ANCHO_COMPACTO);

  const toggle = useCallback(() => {
    if (window.innerWidth <= ANCHO_MOVIL) {
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

      const movil = window.innerWidth <= ANCHO_MOVIL;
      setEsMovil(movil);
      if (!movil) setMobileOpen(false);

      if (compacto !== eraCompacto.current) {
        // Cruzamos el umbral: colapsar al entrar en compacto, expandir al salir.
        setCollapsed(compacto);
        eraCompacto.current = compacto;
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { collapsed: collapsed && !esMovil, mobileOpen, toggle, closeMobile };
}
