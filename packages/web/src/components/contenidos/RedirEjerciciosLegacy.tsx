import { useState, useEffect } from 'react';
import { useParams, useLocation, Navigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rutaEjerciciosAdmin, rutaEjerciciosAlumno } from '../../config/rutasEjercicios';

/** Colección del grupo, tal como la devuelve /api/admin/grupos. */
interface GrupoConColecciones {
  id: string;
  colecciones?: { slug: string }[];
}

/**
 * Compatibilidad para las URLs previas del módulo, `/contenidos/:slug/ejercicios`
 * (y su solver), que apuntaban a la pantalla suelta. Ahora Ejercicios vive dentro
 * del shell, una vez por rol, así que hay que traducir la URL al árbol que toca.
 *
 * Del alumno se deduce sola. La de admin/profesor necesita además el GRUPO —el
 * `:id` del que cuelga la sección— que la URL vieja no llevaba: se resuelve
 * buscando el primer grupo con esa colección asignada. Sin coincidencia, cae a
 * Contenidos en vez de dejar la pantalla colgada.
 */
export default function RedirEjerciciosLegacy() {
  const { slug, ejSlug } = useParams<{ slug: string; ejSlug?: string }>();
  const { search, hash } = useLocation();
  const { user, sessionToken, isLoading } = useAuth();
  const [grupoId, setGrupoId] = useState<string | null | undefined>(undefined);

  const esAlumno = user?.userType === 'alumno';

  useEffect(() => {
    if (isLoading || !sessionToken || !slug || esAlumno) return;
    let vigente = true;
    fetch('/api/admin/grupos', { headers: { 'x-session-token': sessionToken } })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!vigente) return;
        const grupos: GrupoConColecciones[] = json?.grupos ?? [];
        const g = grupos.find((x) => x.colecciones?.some((c) => c.slug === slug));
        setGrupoId(g?.id ?? null);
      })
      .catch(() => { if (vigente) setGrupoId(null); });
    return () => { vigente = false; };
  }, [isLoading, sessionToken, slug, esAlumno]);

  if (isLoading) return <p style={{ padding: 24 }}>Cargando…</p>;
  if (!sessionToken) return <Navigate to="/login" replace />;
  if (!slug) return <Navigate to="/login" replace />;

  const sufijo = `${ejSlug ? `/${ejSlug}` : ''}${search}${hash}`;

  if (esAlumno) return <Navigate to={`${rutaEjerciciosAlumno(slug)}${sufijo}`} replace />;

  // admin/profesor: hay que esperar a saber el grupo.
  if (grupoId === undefined) return <p style={{ padding: 24 }}>Cargando…</p>;
  if (grupoId === null) return <Navigate to="/admin/contenidos" replace />;
  return <Navigate to={`${rutaEjerciciosAdmin(grupoId, slug)}${sufijo}`} replace />;
}
