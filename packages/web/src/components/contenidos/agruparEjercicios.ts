/**
 * Agrupado del listado de ejercicios en DOS niveles: bloque → categoría.
 *
 * Lógica pura y sin React para poder fijarla con tests: la regla que más
 * importa —que con CERO bloques la pantalla se vea exactamente como antes de
 * que existieran— no se puede comprobar a ojo cada vez que se toque esto.
 */

export interface EjercicioLista {
  id: string;
  titulo: string;
  slug: string;
  orden: number;
  categoriaId: string | null;
  resuelto: boolean;
  /**
   * Presentes solo en su módulo: `lenguajes` en los ejercicios de código y
   * `tipoDiagrama` en los de diseño.
   *
   * El agrupado no mira ninguno de los dos —solo `categoriaId`—, así que van
   * opcionales en lugar de duplicar esta lógica, que es la única con tests, por
   * cada módulo que agrupe por categoría y bloque.
   */
  lenguajes?: string[];
  tipoDiagrama?: string;
}

export interface CategoriaRef {
  id: string;
  nombre: string;
  orden: number;
  bloqueId?: string | null;
}

export interface BloqueRef {
  id: string;
  nombre: string;
  descripcion?: string;
  orden: number;
}

/** Una categoría con sus ejercicios (el nivel de siempre). */
export interface Grupo {
  clave: string;
  titulo: string | null;
  items: EjercicioLista[];
}

/** Un bloque con sus categorías. `titulo: null` = sin cabecera de bloque. */
export interface Bloque {
  clave: string;
  titulo: string | null;
  descripcion?: string;
  grupos: Grupo[];
}

/** Clave del grupo residual, en cualquiera de los dos niveles. */
const RESIDUAL = '__otros';

/**
 * Agrupa por categoría, en el orden en que llegan las categorías (el servidor
 * ya las manda ordenadas). Omite las vacías y recoge en un grupo residual tanto
 * los ejercicios sin categoría como los que apuntan a una que ya no existe —
 * así un borrado a medias nunca esconde ejercicios.
 */
export function agrupar(categorias: CategoriaRef[], ejercicios: EjercicioLista[]): Grupo[] {
  const grupos: Grupo[] = [];
  for (const c of categorias) {
    const items = ejercicios.filter((e) => e.categoriaId === c.id);
    if (items.length) grupos.push({ clave: c.id, titulo: c.nombre, items });
  }
  const sinCategoria = ejercicios.filter(
    (e) => !e.categoriaId || !categorias.some((c) => c.id === e.categoriaId),
  );
  if (sinCategoria.length) {
    grupos.push({ clave: RESIDUAL, titulo: categorias.length ? 'Otros' : null, items: sinCategoria });
  }
  return grupos;
}

/**
 * Agrupa en bloque → categoría.
 *
 * Con `bloques` vacío devuelve UN bloque sin título que envuelve el agrupado de
 * siempre: el render trata ese caso como "sin cabecera de bloque" y la pantalla
 * queda igual que antes. Es la garantía de no-regresión, y por eso es lo
 * primero que comprueban los tests.
 *
 * Las categorías sin bloque (o con uno que ya no existe) caen a un bloque
 * residual al final, con la misma regla que el grupo residual de `agrupar`:
 * lleva título solo si hay algún bloque con el que contrastar.
 */
export function agruparEnBloques(
  bloques: BloqueRef[],
  categorias: CategoriaRef[],
  ejercicios: EjercicioLista[],
): Bloque[] {
  if (!bloques.length) {
    return [{ clave: RESIDUAL, titulo: null, grupos: agrupar(categorias, ejercicios) }];
  }

  const salida: Bloque[] = [];
  for (const b of bloques) {
    // Las categorías ya vienen ordenadas entre sí; filtrarlas conserva ese orden
    // DENTRO del bloque, que es lo que evita que se intercalen con las de otro:
    // el `orden` de categoría es global a la colección, no relativo al bloque.
    const suyas = categorias.filter((c) => c.bloqueId === b.id);
    const idsSuyas = new Set(suyas.map((c) => c.id));
    // Solo los ejercicios de ESTE bloque. Pasarle `ejercicios` entero haría que
    // el grupo residual de `agrupar` absorbiera aquí los ajenos, duplicándolos
    // en cada bloque y dejando "vivo" un bloque que debería estar vacío.
    const suyosEj = ejercicios.filter((e) => e.categoriaId !== null && idsSuyas.has(e.categoriaId));
    const grupos = agrupar(suyas, suyosEj);
    // Un bloque cuyas categorías quedaron todas vacías (p. ej. al filtrar por
    // lenguaje) no se muestra: si no, saldría una cabecera sin nada debajo.
    if (grupos.length) {
      salida.push({ clave: b.id, titulo: b.nombre, descripcion: b.descripcion, grupos });
    }
  }

  const conBloque = new Set(bloques.map((b) => b.id));
  const huerfanas = categorias.filter((c) => !c.bloqueId || !conBloque.has(c.bloqueId));

  // Al residuo solo van los ejercicios que NO quedaron ya colocados: los de las
  // categorías huérfanas, más los que no tienen categoría o apuntan a una que ya
  // no existe. Pasar `ejercicios` entero aquí los DUPLICARÍA, porque el residual
  // de `agrupar` recoge todo lo que no casa con las categorías que recibe — y las
  // que sí tienen bloque no están entre ellas.
  const idsHuerfanas = new Set(huerfanas.map((c) => c.id));
  const idsConocidas = new Set(categorias.map((c) => c.id));
  const sinUbicar = ejercicios.filter(
    (e) =>
      (e.categoriaId !== null && idsHuerfanas.has(e.categoriaId)) ||
      e.categoriaId === null ||
      !idsConocidas.has(e.categoriaId),
  );
  const restos = agrupar(huerfanas, sinUbicar);
  if (restos.length) salida.push({ clave: RESIDUAL, titulo: 'Otros', grupos: restos });

  return salida;
}
