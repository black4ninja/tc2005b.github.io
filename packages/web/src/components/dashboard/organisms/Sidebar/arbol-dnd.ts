import type { DocumentoData, DocumentoNodo } from '../../../../types/contenidos';

/** Nodo del árbol aplanado a lista: es lo que consume dnd-kit. */
export interface NodoPlano {
  id: string;
  titulo: string;
  slug: string;
  tipo: DocumentoData['tipo'];
  publicado: boolean;
  /** Candado explícito: esconde el nodo y todo lo que cuelga de él. */
  oculto: boolean;
  /**
   * Alguna carpeta por encima está candada. La página puede estar publicada y
   * aun así no verse: sin esto, el árbol del admin afirmaría que el alumno la ve.
   */
  ancestroOculto: boolean;
  padreId: string | null;
  profundidad: number;
  /** Solo las categorías admiten hijos (lo valida también el servidor). */
  esCategoria: boolean;
  tieneHijos: boolean;
}

/** Aplana el árbol respetando qué categorías están expandidas. */
export function aplanar(
  nodos: DocumentoNodo[],
  expandidos: Set<string>,
  profundidad = 0,
  padreId: string | null = null,
  ancestroOculto = false,
): NodoPlano[] {
  const out: NodoPlano[] = [];
  for (const n of nodos) {
    const esCategoria = n.tipo === 'categoria';
    const oculto = n.oculto === true;
    out.push({
      id: n.id,
      titulo: n.titulo,
      slug: n.slug,
      tipo: n.tipo,
      publicado: n.publicado,
      oculto,
      ancestroOculto,
      padreId,
      profundidad,
      esCategoria,
      tieneHijos: n.hijos.length > 0,
    });
    if (esCategoria && expandidos.has(n.id)) {
      out.push(...aplanar(n.hijos, expandidos, profundidad + 1, n.id, ancestroOculto || oculto));
    }
  }
  return out;
}

/** ids del nodo y de toda su descendencia (no puedes soltar algo dentro de sí mismo). */
export function idsDeSubarbol(items: NodoPlano[], id: string): Set<string> {
  const out = new Set<string>([id]);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return out;
  const base = items[idx].profundidad;
  for (let i = idx + 1; i < items.length; i++) {
    if (items[i].profundidad <= base) break;
    out.add(items[i].id);
  }
  return out;
}

export interface Proyeccion {
  profundidad: number;
  padreId: string | null;
}

/**
 * A qué padre y profundidad va a caer el nodo arrastrado.
 *
 * La profundidad sale del desplazamiento HORIZONTAL del ratón (como en un
 * explorador de archivos: arrastras a la derecha para meterlo dentro), acotada
 * por lo que el árbol permite: solo se puede colgar de una CATEGORÍA, así que si
 * el vecino de arriba es una página, no se puede anidar más.
 */
export function proyectar(
  items: NodoPlano[],
  activeId: string,
  overId: string,
  offsetX: number,
  sangria: number,
): Proyeccion {
  const idxOver = items.findIndex((i) => i.id === overId);
  const idxActive = items.findIndex((i) => i.id === activeId);
  if (idxOver === -1 || idxActive === -1) return { profundidad: 0, padreId: null };

  // Lista tal como quedaría tras el movimiento, para mirar a los vecinos reales.
  const movidos = [...items];
  const [arrastrado] = movidos.splice(idxActive, 1);
  movidos.splice(idxOver, 0, arrastrado);

  const anterior = movidos[idxOver - 1];
  const siguiente = movidos[idxOver + 1];

  const deseada = items[idxActive].profundidad + Math.round(offsetX / sangria);

  // Máximo: un nivel más que el de arriba, y solo si el de arriba es categoría.
  const maxima = anterior
    ? anterior.esCategoria
      ? anterior.profundidad + 1
      : anterior.profundidad
    : 0;
  // Mínimo: no puede quedar por encima del de abajo, o lo dejaría huérfano.
  const minima = siguiente ? siguiente.profundidad : 0;

  const profundidad = Math.max(minima, Math.min(deseada, maxima));

  // El padre es el ancestro más cercano por encima con profundidad = profundidad-1.
  let padreId: string | null = null;
  if (profundidad > 0 && anterior) {
    if (anterior.profundidad === profundidad - 1) {
      padreId = anterior.id;
    } else {
      // Subir por la lista hasta encontrar el nodo del nivel padre.
      const candidato = movidos
        .slice(0, idxOver)
        .reverse()
        .find((i) => i.profundidad === profundidad - 1);
      padreId = candidato?.id ?? null;
    }
  }

  return { profundidad, padreId };
}

/**
 * Posición (orden) que ocupará entre sus nuevos hermanos.
 *
 * El servidor compacta los órdenes de los hermanos, así que basta con el índice
 * dentro del nuevo padre.
 */
export function ordenDestino(
  items: NodoPlano[],
  activeId: string,
  overId: string,
  padreId: string | null,
): number {
  const idxOver = items.findIndex((i) => i.id === overId);
  const idxActive = items.findIndex((i) => i.id === activeId);
  const movidos = [...items];
  const [arrastrado] = movidos.splice(idxActive, 1);
  movidos.splice(idxOver, 0, arrastrado);

  const hermanos = movidos.filter((i) => i.padreId === padreId && i.id !== activeId);
  // Cuántos hermanos quedan por encima de la posición de caída.
  const posicionFinal = movidos.findIndex((i) => i.id === activeId);
  let orden = 0;
  for (const h of hermanos) {
    if (movidos.findIndex((i) => i.id === h.id) < posicionFinal) orden++;
  }
  return orden;
}
