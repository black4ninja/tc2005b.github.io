import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useMatch, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from './AuthContext';
import { rutaDiagramasAdmin, rutaDiagramasAlumno } from '../config/rutasDiagramas';
import type { BloqueRef, CategoriaRef, EjercicioLista } from '../components/contenidos/agruparEjercicios';
import {
  escribirSeccion,
  leerSeccion,
  progresoDe,
  progresoDeBloque as calcularProgresoDeBloque,
  type Seccion,
} from '../components/contenidos/navegacionDiagramas';

/**
 * Los ejercicios de diagrama de la colección abierta.
 *
 * Vive por encima del Sidebar, del DashboardHeader y del `<Outlet/>` porque los
 * tres lo necesitan: el sidebar pinta el árbol de secciones, el topbar el
 * progreso y la página el listado. Mismo patrón —y mismo motivo— que
 * `ColeccionArbolContext`: con tres consultas independientes, resolver un
 * ejercicio actualizaría el listado y dejaría el contador del topbar mintiendo.
 *
 * La sección abierta viaja en la URL (`?seccion=`) y no en un estado interno:
 * así el botón de volver del navegador funciona, y el enlace a una sección
 * concreta se puede compartir.
 */

export interface DiagramaLista extends EjercicioLista {
  tipoDiagrama: string;
}

interface ColeccionRef {
  slug: string;
  nombre: string;
  clave: string | null;
}

export type { Seccion };

interface DiagramasNavValue {
  /** Si la ruta actual pertenece al módulo. Falso en el resto del dashboard. */
  activo: boolean;
  /** Base de las rutas del módulo, para que el árbol enlace sin saber el rol. */
  base: string;
  slug: string;
  coleccion: ColeccionRef | null;
  bloques: BloqueRef[];
  categorias: CategoriaRef[];
  ejercicios: DiagramaLista[];
  cargando: boolean;
  error: boolean;
  reintentar: () => void;
  /** Avance sobre TODO lo publicado, que es lo que se pinta en el topbar. */
  progreso: { resueltos: number; total: number };
  seccion: Seccion;
  irA: (seccion: Seccion) => void;
  /** Resuelto por bloque, para los contadores del árbol. */
  progresoDeBloque: (bloqueId: string) => { resueltos: number; total: number };
}

const VACIO: DiagramasNavValue = {
  activo: false,
  base: '',
  slug: '',
  coleccion: null,
  bloques: [],
  categorias: [],
  ejercicios: [],
  cargando: false,
  error: false,
  reintentar: () => {},
  progreso: { resueltos: 0, total: 0 },
  seccion: null,
  irA: () => {},
  progresoDeBloque: () => ({ resueltos: 0, total: 0 }),
};

/**
 * Se exporta para poder montar las pantallas del módulo con datos de prueba,
 * sin sesión ni servidor: es lo que usa `herramientas/vista-diagramas.html`
 * para revisar el árbol y el listado con el catálogo real.
 */
export const DiagramasNavCtx = createContext<DiagramasNavValue | null>(null);
const Ctx = DiagramasNavCtx;

export type { DiagramasNavValue };

export function useDiagramasNav(): DiagramasNavValue {
  return useContext(Ctx) ?? VACIO;
}

export function DiagramasNavProvider({ children }: { children: React.ReactNode }) {
  // Las dos rutas del módulo, por los dos árboles. El listado y el solver
  // comparten provider a propósito: al resolver un ejercicio hay que poder
  // volver al árbol sin recargarlo, que es lo que pedía la maqueta.
  const adminListado = useMatch('/admin/grupos/:id/diagramas/:slug');
  const adminSolver = useMatch('/admin/grupos/:id/diagramas/:slug/:ejSlug');
  const alumnoListado = useMatch('/alumno/diagramas/:slug');
  const alumnoSolver = useMatch('/alumno/diagramas/:slug/:ejSlug');

  const match = adminListado ?? adminSolver ?? alumnoListado ?? alumnoSolver;
  const slug = match?.params.slug ?? '';
  const grupoId = (adminListado ?? adminSolver)?.params.id;
  const activo = !!slug;

  const { sessionToken } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [coleccion, setColeccion] = useState<ColeccionRef | null>(null);
  const [bloques, setBloques] = useState<BloqueRef[]>([]);
  const [categorias, setCategorias] = useState<CategoriaRef[]>([]);
  const [ejercicios, setEjercicios] = useState<DiagramaLista[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!activo || !sessionToken) return;
    let vivo = true;
    setCargando(true);
    setError(false);
    fetch(`/api/contenidos/${slug}/diagramas`, { headers: { 'x-session-token': sessionToken } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => {
        if (!vivo) return;
        setColeccion(json?.coleccion ?? null);
        setBloques(json?.bloques ?? []);
        setCategorias(json?.categorias ?? []);
        setEjercicios(json?.ejercicios ?? []);
      })
      .catch(() => vivo && setError(true))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [activo, slug, sessionToken, intento]);

  const base = grupoId ? rutaDiagramasAdmin(grupoId, slug) : rutaDiagramasAlumno(slug);

  const seccion = leerSeccion(params.get('seccion'));

  /**
   * Abre una sección del árbol.
   *
   * Navega SIEMPRE al listado, no solo cambia el parámetro. El árbol sigue
   * montado mientras se resuelve un ejercicio —que es el motivo de ponerlo en el
   * sidebar—, así que desde el solver un `setSearchParams` dejaba la URL del
   * ejercicio con un `?seccion=` nuevo: la sección cambiaba en un listado que no
   * estaba en pantalla y el clic parecía no hacer nada.
   *
   * Sin `replace`: cambiar de sección es navegación, y el botón de volver del
   * navegador debe devolver a la anterior.
   */
  const irA = useCallback(
    (destino: Seccion) => {
      const siguiente = new URLSearchParams(params);
      const valor = escribirSeccion(destino);
      if (valor) siguiente.set('seccion', valor);
      else siguiente.delete('seccion');
      const cola = siguiente.toString();
      navigate(cola ? `${base}?${cola}` : base);
    },
    [params, navigate, base],
  );

  const progreso = useMemo(() => progresoDe(ejercicios), [ejercicios]);

  const progresoDeBloque = useCallback(
    (bloqueId: string) => calcularProgresoDeBloque(bloques, categorias, ejercicios, bloqueId),
    [bloques, categorias, ejercicios],
  );

  const valor: DiagramasNavValue = {
    activo,
    base,
    slug,
    coleccion,
    bloques,
    categorias,
    ejercicios,
    cargando,
    error,
    reintentar: () => setIntento((n) => n + 1),
    progreso,
    seccion,
    irA,
    progresoDeBloque,
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
