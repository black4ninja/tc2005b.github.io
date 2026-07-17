import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useMatch } from 'react-router';
import { useAuth } from './AuthContext';
import { buildArbol, type DocumentoData, type ColeccionData, type DocumentoNodo } from '../types/contenidos';

/**
 * Árbol de páginas de la colección abierta en /admin/contenidos/:id.
 *
 * Vive por encima del Sidebar y del <Outlet/> (se monta en DashboardLayout)
 * porque ambos lo necesitan: el sidebar pinta el árbol y la página edita los
 * documentos. Sin esto, renombrar o mover una página desde la página dejaría al
 * sidebar mostrando el árbol viejo.
 */
interface ColeccionArbolValue {
  coleccionId: string | null;
  coleccion: ColeccionData | null;
  documentos: DocumentoData[];
  arbol: DocumentoNodo[];
  cargando: boolean;
  error: string;
  /** Recargar tras una mutación (crear/renombrar/mover/borrar). */
  refetch: () => Promise<void>;

  /* Mutaciones. Devuelven el mensaje de error, o null si fue bien. Viven aquí
     —y no en la página— porque ahora quien las dispara es el árbol del sidebar. */

  /**
   * Renombrar = cambiar SOLO el título. El slug (y por tanto la URL pública) se
   * queda como está: 82 de 120 documentos tienen un slug que no deriva de su
   * título (`readme`, herencia de Docusaurus), y hay ~59 enlaces internos
   * apuntando a esas rutas sin ningún redirect que los cubra. Regenerar el slug
   * al renombrar los rompería en silencio.
   */
  renombrar: (docId: string, titulo: string) => Promise<string | null>;
  /** Cambiar el slug SÍ cambia la URL pública: la UI debe advertirlo. */
  cambiarSlug: (docId: string, slug: string) => Promise<string | null>;
  mover: (docId: string, padreId: string | null, orden: number) => Promise<string | null>;
  eliminar: (docId: string) => Promise<string | null>;
  /**
   * Mostrar/ocultar la página a los alumnos. Es SOLO visibilidad: no congela el
   * borrador en una versión (eso es "Publicar", en el editor), así que ocultar y
   * volver a mostrar devuelve el mismo contenido.
   */
  cambiarPublicacion: (docId: string, publicado: boolean) => Promise<string | null>;
}

const Ctx = createContext<ColeccionArbolValue | null>(null);

const NO_OP = async () => null;

const VACIO: ColeccionArbolValue = {
  coleccionId: null,
  coleccion: null,
  documentos: [],
  arbol: [],
  cargando: false,
  error: '',
  refetch: async () => {},
  renombrar: NO_OP,
  cambiarSlug: NO_OP,
  mover: NO_OP,
  eliminar: NO_OP,
  cambiarPublicacion: NO_OP,
};

export function useColeccionArbol(): ColeccionArbolValue {
  return useContext(Ctx) ?? VACIO;
}

export function ColeccionArbolProvider({ children }: { children: React.ReactNode }) {
  // Solo el editor de DOCUMENTOS usa el árbol en el sidebar: el detalle de la
  // colección y su ruta de edición. Otras sub-rutas (p. ej. /ejercicios) son
  // pantallas separadas y NO deben abrir el árbol — si no, el sidebar mostraría
  // el árbol de documentos encima de una pantalla que no es de documentos.
  const exact = useMatch('/admin/contenidos/:id');
  const editar = useMatch('/admin/contenidos/:id/editar/:docId');
  const coleccionId = (exact || editar)?.params.id ?? null;

  const { sessionToken } = useAuth();
  const [coleccion, setColeccion] = useState<ColeccionData | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoData[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    if (!coleccionId || !sessionToken) return;
    setCargando(true);
    setError('');
    try {
      const h = { 'x-session-token': sessionToken };
      const [resCols, resDocs] = await Promise.all([
        fetch('/api/admin/colecciones', { headers: h }),
        fetch(`/api/admin/colecciones/${coleccionId}/documentos`, { headers: h }),
      ]);
      if (!resCols.ok || !resDocs.ok) throw new Error('No se pudo cargar la colección');
      const [jsonCols, jsonDocs] = await Promise.all([resCols.json(), resDocs.json()]);
      // No hay endpoint de detalle de colección: se busca en la lista.
      const encontrada = (jsonCols.colecciones ?? []).find((c: ColeccionData) => c.id === coleccionId) ?? null;
      setColeccion(encontrada);
      setDocumentos(jsonDocs.documentos ?? []);
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar la colección');
    } finally {
      setCargando(false);
    }
  }, [coleccionId, sessionToken]);

  useEffect(() => {
    if (!coleccionId) {
      setColeccion(null);
      setDocumentos([]);
      return;
    }
    refetch();
  }, [coleccionId, refetch]);

  const arbol = useMemo(() => buildArbol(documentos), [documentos]);

  /** Ejecuta la mutación y refresca. Devuelve el mensaje de error, o null. */
  const mutar = useCallback(
    async (url: string, method: string, body?: unknown): Promise<string | null> => {
      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', 'x-session-token': sessionToken ?? '' },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return err.message || 'Error en la operación';
        }
        await refetch();
        return null;
      } catch (err: any) {
        return err.message || 'Error en la operación';
      }
    },
    [sessionToken, refetch],
  );

  const renombrar = useCallback(
    (docId: string, titulo: string) =>
      // Sin `slug` en el body: el PUT solo aplica los campos presentes, así que
      // el slug —y la URL pública— quedan intactos.
      mutar(`/api/admin/documentos/${docId}`, 'PUT', { titulo }),
    [mutar],
  );

  const cambiarSlug = useCallback(
    (docId: string, slug: string) => mutar(`/api/admin/documentos/${docId}`, 'PUT', { slug }),
    [mutar],
  );

  const mover = useCallback(
    (docId: string, padreId: string | null, orden: number) =>
      mutar(`/api/admin/documentos/${docId}/mover`, 'PUT', { padreId, orden }),
    [mutar],
  );

  const eliminar = useCallback(
    (docId: string) => mutar(`/api/admin/documentos/${docId}`, 'DELETE'),
    [mutar],
  );

  const cambiarPublicacion = useCallback(
    (docId: string, publicado: boolean) =>
      mutar(`/api/admin/documentos/${docId}/publicacion`, 'PUT', { publicado }),
    [mutar],
  );

  const value = useMemo<ColeccionArbolValue>(
    () => ({
      coleccionId, coleccion, documentos, arbol, cargando, error, refetch,
      renombrar, cambiarSlug, mover, eliminar, cambiarPublicacion,
    }),
    [coleccionId, coleccion, documentos, arbol, cargando, error, refetch,
     renombrar, cambiarSlug, mover, eliminar, cambiarPublicacion],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
