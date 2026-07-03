/** Tipos del CMS "Contenidos" (design/cms-contenidos.html §1). */

export type DocumentoTipo = 'md' | 'html' | 'categoria';
export type DocumentoPlantilla = 'laboratorio' | 'lectura' | 'temario';

/** Referencia mínima de colección (asignación a grupos, submenús). */
export interface ColeccionRef {
  id: string;
  nombre: string;
  slug: string;
  clave: string | null;
}

export interface ColeccionData {
  id: string;
  nombre: string;
  slug: string;
  clave: string | null;
  descripcion: string | null;
  icono: string;
  publicada: boolean;
  active: boolean;
}

export interface DocumentoData {
  id: string;
  coleccionId: string | null;
  padreId: string | null;
  titulo: string;
  slug: string;
  tipo: DocumentoTipo;
  orden: number;
  plantilla: DocumentoPlantilla | null;
  publicado: boolean;
  versionId: string | null;
  borradorId: string | null;
  active: boolean;
}

/** Nodo del árbol que arma el cliente a partir de la lista plana. */
export interface DocumentoNodo extends DocumentoData {
  hijos: DocumentoNodo[];
}

/** Construye el árbol (padreId + orden) desde la lista plana del API. */
export function buildArbol(documentos: DocumentoData[]): DocumentoNodo[] {
  const nodos = new Map<string, DocumentoNodo>();
  for (const d of documentos) nodos.set(d.id, { ...d, hijos: [] });

  const raices: DocumentoNodo[] = [];
  for (const nodo of nodos.values()) {
    const padre = nodo.padreId ? nodos.get(nodo.padreId) : undefined;
    if (padre) padre.hijos.push(nodo);
    else raices.push(nodo);
  }
  const porOrden = (a: DocumentoNodo, b: DocumentoNodo) => a.orden - b.orden;
  const ordenar = (lista: DocumentoNodo[]) => {
    lista.sort(porOrden);
    lista.forEach((n) => ordenar(n.hijos));
  };
  ordenar(raices);
  return raices;
}
