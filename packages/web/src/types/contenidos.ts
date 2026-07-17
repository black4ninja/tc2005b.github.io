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
  /** Candado explícito: esconde el nodo y TODO lo que cuelga de él. */
  oculto: boolean;
  versionId: string | null;
  borradorId: string | null;
  active: boolean;
}

/** Nodo del árbol que arma el cliente a partir de la lista plana. */
export interface DocumentoNodo extends DocumentoData {
  hijos: DocumentoNodo[];
}

// --- Módulo "Ejercicios" (mini-juez Kotlin/Swift) ---

export type LenguajeJuez = 'kotlin' | 'swift';

export interface CasoPruebaData {
  entrada: string;
  salidaEsperada: string;
  oculto: boolean;
}

export type ModoEvaluacion = 'programa' | 'plantilla';

export interface EjercicioData {
  id: string;
  coleccionId: string | null;
  categoriaId: string | null;
  titulo: string;
  slug: string;
  orden: number;
  enunciado: string;
  enunciadoHtml: string;
  lenguajes: LenguajeJuez[];
  codigoInicial: { kotlin?: string; swift?: string };
  modoEvaluacion: ModoEvaluacion;
  plantillaCodigo: { kotlin?: string; swift?: string };
  limiteTiempoMs: number;
  limiteMemoriaMb: number;
  casos: CasoPruebaData[];
  publicado: boolean;
  oculto: boolean;
  autorId: string | null;
  active: boolean;
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
