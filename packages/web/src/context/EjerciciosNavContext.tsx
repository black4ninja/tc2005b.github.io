import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useMatch, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from './AuthContext';
import { rutaEjerciciosAdmin, rutaEjerciciosAlumno } from '../config/rutasEjercicios';
import type { BloqueRef, CategoriaRef, EjercicioLista } from '../components/contenidos/agruparEjercicios';
import {
  progresoDe,
  progresoDeBloque as calcularProgresoDeBloque,
} from '../components/contenidos/navegacionDiagramas';

/**
 * Los ejercicios de programación de la colección abierta.
 *
 * Mismo patrón —y mismo motivo— que `DiagramasNavContext`: el sidebar pinta el
 * árbol de bloques, el topbar el avance y la página el listado de la sección
 * abierta. Con tres consultas independientes, resolver un ejercicio
 * actualizaría el listado y dejaría el contador del topbar mintiendo.
 *
 * A diferencia de Diagramas no hay «catálogo»: aquí una sección es siempre un
 * bloque de la colección, así que la sección es su NOMBRE y no un par
 * clase+nombre.
 */

export interface EjercicioCodigoLista extends EjercicioLista {
  /**
   * En este módulo SIEMPRE vienen: son los que el juez sabe compilar, así que
   * ningún ejercicio existe sin al menos uno. En `EjercicioLista` son
   * opcionales porque esa forma la comparte con el módulo de diagramas.
   */
  lenguajes: string[];
}

interface ColeccionRef {
  slug: string;
  nombre: string;
  clave: string | null;
}

/** Sección abierta del árbol: el nombre de un bloque, o `null` si ninguna. */
export type SeccionEjercicios = string | null;

interface EjerciciosNavValue {
  /** Si la ruta actual pertenece al módulo. Falso en el resto del dashboard. */
  activo: boolean;
  /** Base de las rutas del módulo, para que el árbol enlace sin saber el rol. */
  base: string;
  slug: string;
  coleccion: ColeccionRef | null;
  bloques: BloqueRef[];
  categorias: CategoriaRef[];
  /** Todo lo publicado, sin filtrar por lenguaje. */
  ejercicios: EjercicioCodigoLista[];
  /** Lo que se pinta: `ejercicios` pasado por el filtro de lenguaje. */
  filtrados: EjercicioCodigoLista[];
  filtroLenguaje: 'todos' | string;
  cambiarFiltroLenguaje: (valor: 'todos' | string) => void;
  cargando: boolean;
  error: boolean;
  noEncontrado: boolean;
  reintentar: () => void;
  /**
   * Avance sobre lo FILTRADO, que es lo que se pinta en el topbar.
   *
   * Sobre lo filtrado y no sobre el total del servidor a propósito: así un
   * alumno que filtra por su lenguaje llega al 100% sin que los ejercicios
   * exclusivos del otro lenguaje —que no puede resolver— lo dejen atascado.
   */
  progreso: { resueltos: number; total: number };
  seccion: SeccionEjercicios;
  irA: (seccion: SeccionEjercicios) => void;
  /** Resuelto por bloque, para los contadores del árbol. */
  progresoDeBloque: (bloqueId: string) => { resueltos: number; total: number };
}

const VACIO: EjerciciosNavValue = {
  activo: false,
  base: '',
  slug: '',
  coleccion: null,
  bloques: [],
  categorias: [],
  ejercicios: [],
  filtrados: [],
  filtroLenguaje: 'todos',
  cambiarFiltroLenguaje: () => {},
  cargando: false,
  error: false,
  noEncontrado: false,
  reintentar: () => {},
  progreso: { resueltos: 0, total: 0 },
  seccion: null,
  irA: () => {},
  progresoDeBloque: () => ({ resueltos: 0, total: 0 }),
};

/**
 * Se exporta para poder montar las pantallas del módulo con datos de prueba,
 * sin sesión ni servidor, igual que `DiagramasNavCtx`.
 */
export const EjerciciosNavCtx = createContext<EjerciciosNavValue | null>(null);
const Ctx = EjerciciosNavCtx;

export type { EjerciciosNavValue };

export function useEjerciciosNav(): EjerciciosNavValue {
  return useContext(Ctx) ?? VACIO;
}

export function EjerciciosNavProvider({ children }: { children: React.ReactNode }) {
  // Las cuatro rutas del módulo. El listado y el solver comparten provider a
  // propósito: al resolver un ejercicio hay que poder volver al árbol sin
  // recargarlo.
  const adminListado = useMatch('/admin/grupos/:id/ejercicios/:slug');
  const adminSolver = useMatch('/admin/grupos/:id/ejercicios/:slug/:ejSlug');
  const alumnoListado = useMatch('/alumno/ejercicios/:slug');
  const alumnoSolver = useMatch('/alumno/ejercicios/:slug/:ejSlug');

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
  const [ejercicios, setEjercicios] = useState<EjercicioCodigoLista[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [intento, setIntento] = useState(0);
  const [filtroLenguaje, setFiltroLenguaje] = useState<'todos' | string>('todos');

  useEffect(() => {
    if (!activo || !sessionToken) return;
    let vivo = true;
    setCargando(true);
    setError(false);
    setNoEncontrado(false);
    fetch(`/api/contenidos/${slug}/ejercicios`, { headers: { 'x-session-token': sessionToken } })
      .then((r) => {
        // El 404 se distingue del resto: «esta colección no existe o no es tuya»
        // no es un fallo de red, y la pantalla dice otra cosa.
        if (r.status === 404) return Promise.reject(new Error('404'));
        return r.ok ? r.json() : Promise.reject(new Error(String(r.status)));
      })
      .then((json) => {
        if (!vivo) return;
        setColeccion(json?.coleccion ?? null);
        setBloques(json?.bloques ?? []);
        setCategorias(json?.categorias ?? []);
        setEjercicios(json?.ejercicios ?? []);
      })
      .catch((e: unknown) => {
        if (!vivo) return;
        if (e instanceof Error && e.message === '404') setNoEncontrado(true);
        else setError(true);
      })
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [activo, slug, sessionToken, intento]);

  const base = grupoId ? rutaEjerciciosAdmin(grupoId, slug) : rutaEjerciciosAlumno(slug);

  const seccion = params.get('seccion') || null;

  /**
   * Abre una sección del árbol.
   *
   * Navega SIEMPRE al listado, no solo cambia el parámetro: el árbol sigue
   * montado mientras se resuelve un ejercicio, así que desde el solver un
   * `setSearchParams` dejaría la URL del ejercicio con un `?seccion=` nuevo y el
   * clic parecería no hacer nada.
   */
  const irA = useCallback(
    (destino: SeccionEjercicios) => {
      const siguiente = new URLSearchParams(params);
      if (destino) siguiente.set('seccion', destino);
      else siguiente.delete('seccion');
      const cola = siguiente.toString();
      navigate(cola ? `${base}?${cola}` : base);
    },
    [params, navigate, base],
  );

  const filtrados = useMemo(
    () =>
      filtroLenguaje === 'todos'
        ? ejercicios
        : ejercicios.filter((e) => e.lenguajes.includes(filtroLenguaje)),
    [ejercicios, filtroLenguaje],
  );

  const progreso = useMemo(() => progresoDe(filtrados), [filtrados]);

  const progresoDeBloque = useCallback(
    (bloqueId: string) => calcularProgresoDeBloque(bloques, categorias, filtrados, bloqueId),
    [bloques, categorias, filtrados],
  );

  const valor: EjerciciosNavValue = {
    activo,
    base,
    slug,
    coleccion,
    bloques,
    categorias,
    ejercicios,
    filtrados,
    filtroLenguaje,
    cambiarFiltroLenguaje: setFiltroLenguaje,
    cargando,
    error,
    noEncontrado,
    reintentar: () => setIntento((n) => n + 1),
    progreso,
    seccion,
    irA,
    progresoDeBloque,
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}
