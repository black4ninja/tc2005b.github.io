/**
 * Lógica PURA del árbol visible del visor (US-3) — sin Parse, para poder
 * probarla unitariamente: la poda de lo no publicado es código de seguridad
 * (lo que no está publicado no existe para el visor).
 */

export interface DocPlano {
  id: string;
  titulo: string;
  slug: string;
  tipo: string; // 'md' | 'html' | 'categoria'
  orden: number;
  padreId: string | null;
  publicado: boolean;
}

export interface NodoVisor {
  id: string;
  titulo: string;
  slug: string;
  tipo: string;
  hijos: NodoVisor[];
}

/**
 * Árbol visible: páginas publicadas + las categorías que conducen a alguna;
 * las ramas sin ninguna página publicada se PODAN (una categoría vacía no
 * debe revelar estructura).
 */
export function construirArbolVisible(documentos: DocPlano[]): NodoVisor[] {
  interface NodoTmp extends NodoVisor {
    esCategoria: boolean;
    publicado: boolean;
    orden: number;
    hijosTmp: NodoTmp[];
  }
  const nodos = new Map<string, NodoTmp>();
  for (const d of documentos) {
    nodos.set(d.id, {
      id: d.id,
      titulo: d.titulo,
      slug: d.slug,
      tipo: d.tipo,
      orden: d.orden,
      esCategoria: d.tipo === 'categoria',
      publicado: d.publicado,
      hijos: [],
      hijosTmp: [],
    });
  }
  const raices: NodoTmp[] = [];
  for (const d of documentos) {
    const nodo = nodos.get(d.id)!;
    const padre = d.padreId ? nodos.get(d.padreId) : undefined;
    if (padre) padre.hijosTmp.push(nodo);
    else raices.push(nodo);
  }

  const podar = (lista: NodoTmp[]): NodoVisor[] =>
    lista
      .sort((a, b) => a.orden - b.orden)
      .map((n) => ({ nodo: n, hijos: podar(n.hijosTmp) }))
      .filter(({ nodo, hijos }) => (nodo.esCategoria ? hijos.length > 0 : nodo.publicado))
      .map(({ nodo, hijos }) => ({ id: nodo.id, titulo: nodo.titulo, slug: nodo.slug, tipo: nodo.tipo, hijos }));

  return podar(raices);
}

/** Recorrido en profundidad de las PÁGINAS del árbol visible, con su path. */
export function paginasEnOrden(
  arbol: NodoVisor[],
  prefijo = '',
): { id: string; titulo: string; path: string }[] {
  const out: { id: string; titulo: string; path: string }[] = [];
  for (const n of arbol) {
    const path = prefijo ? `${prefijo}/${n.slug}` : n.slug;
    if (n.tipo === 'categoria') out.push(...paginasEnOrden(n.hijos, path));
    else out.push({ id: n.id, titulo: n.titulo, path });
  }
  return out;
}

/**
 * Resuelve un path (segmentos de slug) SOBRE el árbol visible. Devuelve null
 * si algún segmento no existe/no es visible, o si el destino es una
 * categoría (no es página navegable).
 */
export function resolverPath(
  arbol: NodoVisor[],
  path: string[],
): { nodo: NodoVisor; breadcrumb: { titulo: string; slug: string }[] } | null {
  if (path.length === 0) return null;
  let nivel = arbol;
  let nodo: NodoVisor | undefined;
  const breadcrumb: { titulo: string; slug: string }[] = [];
  for (const segmento of path) {
    nodo = nivel.find((n) => n.slug === segmento);
    if (!nodo) return null;
    breadcrumb.push({ titulo: nodo.titulo, slug: nodo.slug });
    nivel = nodo.hijos;
  }
  if (!nodo || nodo.tipo === 'categoria') return null;
  return { nodo, breadcrumb };
}
