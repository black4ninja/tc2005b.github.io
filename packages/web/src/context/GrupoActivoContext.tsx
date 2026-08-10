import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from './AuthContext';

/**
 * Grupo con el que el alumno está trabajando ahora mismo.
 *
 * Antes vivía en el estado local del `Sidebar`, y eso provocaba tres cosas: el
 * panel no se enteraba del cambio (leía siempre `user.grupos[0]`, así que
 * enseñaba el perfil del PRIMER grupo aunque el menú dijera otro), el menú y el
 * panel podían contradecirse, y al recargar se volvía al primero de la lista.
 *
 * Aquí es uno solo para toda la aplicación, y además se recuerda en el servidor
 * (`AppUser.ultimoGrupoId`), no en `localStorage`: así el alumno retoma donde lo
 * dejó aunque entre desde otro navegador.
 */
interface GrupoActivoContextType {
  /** Id del grupo activo; '' mientras no hay usuario o no tiene grupos. */
  grupoActivoId: string;
  /** Nombre del grupo activo, para pintarlo sin volver a buscarlo. */
  grupoActivoNombre: string;
  /** Grupos del alumno, en el orden en que los manda el servidor. */
  grupos: { id: string; name: string }[];
  cambiarGrupo: (grupoId: string) => void;
}

const GrupoActivoContext = createContext<GrupoActivoContextType | null>(null);

/**
 * `/alumno/grupos/<id>/<seccion>` → la sección, o null si la ruta actual no
 * cuelga de un grupo (el panel, por ejemplo).
 */
export function seccionDeLaRuta(pathname: string): string | null {
  const m = /^\/alumno\/grupos\/[^/]+\/(.+)$/.exec(pathname);
  return m ? m[1] : null;
}

/**
 * `/alumno/grupos/<id>/...` → el id, o null si la ruta no cuelga de un grupo.
 *
 * Sirve para detectar que el alumno está mirando un grupo que ya no es suyo
 * —le dieron de baja, o el grupo quedó bloqueado— y sacarlo de ahí antes de
 * que el API le responda 403 en cada petición.
 */
export function grupoDeLaRuta(pathname: string): string | null {
  const m = /^\/alumno\/grupos\/([^/]+)(?:\/|$)/.exec(pathname);
  return m ? m[1] : null;
}

export function GrupoActivoProvider({ children }: { children: ReactNode }) {
  const { user, sessionToken } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [grupoActivoId, setGrupoActivoId] = useState('');

  const grupos = useMemo(() => user?.grupos ?? [], [user?.grupos]);

  // Elección inicial: el último grupo que el alumno tenía abierto, si sigue
  // siendo suyo; si no —le dieron de baja, o el id es viejo— el primero.
  useEffect(() => {
    if (grupos.length === 0) {
      setGrupoActivoId('');
      return;
    }
    setGrupoActivoId((actual) => {
      if (actual && grupos.some((g) => g.id === actual)) return actual;
      const recordado = user?.ultimoGrupoId;
      if (recordado && grupos.some((g) => g.id === recordado)) return recordado;
      return grupos[0].id;
    });
  }, [grupos, user?.ultimoGrupoId]);

  // La URL puede haberse quedado en un grupo que ya no está disponible: un
  // enlace guardado, o el grupo que el alumno tenía abierto cuando lo
  // bloquearon. Sin esto, el menú apuntaría al grupo nuevo mientras la página
  // insiste con el viejo y el API le contesta 403 a todo.
  useEffect(() => {
    if (!grupoActivoId || grupos.length === 0) return;
    const enLaRuta = grupoDeLaRuta(pathname);
    if (!enLaRuta || enLaRuta === grupoActivoId) return;
    if (grupos.some((g) => g.id === enLaRuta)) return;

    const seccion = seccionDeLaRuta(pathname);
    // `replace`: el grupo viejo no debe quedar en el historial, o el botón de
    // atrás devolvería al alumno justo a la ruta rota.
    navigate(seccion ? `/alumno/grupos/${grupoActivoId}/${seccion}` : '/alumno', {
      replace: true,
    });
  }, [grupoActivoId, grupos, pathname, navigate]);

  const cambiarGrupo = useCallback(
    (grupoId: string) => {
      if (!grupoId || grupoId === grupoActivoId) return;
      setGrupoActivoId(grupoId);
      if (!sessionToken) return;
      // Se recuerda en segundo plano: si falla, lo único que pasa es que la
      // próxima sesión abre con el grupo anterior. No merece bloquear la
      // navegación ni enseñar un error.
      fetch(`/api/alumno/grupos/${grupoId}/activo`, {
        method: 'PUT',
        headers: { 'x-session-token': sessionToken },
      }).catch(() => {});

      // Si estaba dentro de una sección del grupo anterior, se le lleva a la
      // misma sección del nuevo. Sin esto el menú apuntaba al grupo nuevo pero
      // la página seguía enseñando el viejo.
      const seccion = seccionDeLaRuta(pathname);
      if (seccion) navigate(`/alumno/grupos/${grupoId}/${seccion}`);
    },
    [grupoActivoId, sessionToken, pathname, navigate],
  );

  const valor = useMemo<GrupoActivoContextType>(
    () => ({
      grupoActivoId,
      grupoActivoNombre: grupos.find((g) => g.id === grupoActivoId)?.name ?? '',
      grupos,
      cambiarGrupo,
    }),
    [grupoActivoId, grupos, cambiarGrupo],
  );

  return <GrupoActivoContext.Provider value={valor}>{children}</GrupoActivoContext.Provider>;
}

export function useGrupoActivo(): GrupoActivoContextType {
  const ctx = useContext(GrupoActivoContext);
  if (!ctx) throw new Error('useGrupoActivo debe usarse dentro de GrupoActivoProvider');
  return ctx;
}
