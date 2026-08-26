/**
 * Recorta bloques y categorías a los que son DE ESTE MÓDULO.
 *
 * `BloqueEjercicios` y `CategoriaEjercicio` son tablas ÚNICAS por colección, y
 * las comparten los dos módulos: `EjercicioProgramacion` y `EjercicioDiagrama`
 * apuntan a las mismas categorías, y esas categorías a los mismos bloques.
 * Ninguna de las dos entidades guarda a qué módulo pertenece.
 *
 * Sin este recorte cada módulo devolvía TODOS los bloques de la colección, así
 * que el árbol del juez de programación listaba «Comportamiento», «Estructura»,
 * «Arquitectura» e «Interacción» —que son de Diagramas— en «0/0», y el de
 * Diagramas listaba «Arquitectura MVVM» e «Introducción al lenguaje» —que son de
 * programación—. Dos módulos independientes que se leían como uno solo, y con
 * secciones que prometían ejercicios inexistentes.
 *
 * A falta de un campo que lo diga, la pertenencia se DEDUCE de los ejercicios:
 * una categoría es de este módulo si alguno de sus ejercicios lo es, y un bloque
 * lo es si alguna de sus categorías lo es. Se calcula sobre los ejercicios que
 * ya se van a devolver, así que respeta sus filtros (publicado, no oculto) sin
 * consultas extra.
 *
 * Consecuencia asumida: un bloque recién creado, todavía sin ejercicios
 * publicados, no sale en el árbol de ningún módulo —tampoco para el admin—.
 * Es lo correcto aquí: los bloques se administran en Contenidos
 * (`ejercicios-bloques.controller`), y el árbol del módulo es una vista de
 * consumo. Antes ese bloque salía en LOS DOS árboles, no en el suyo.
 */

/** Lo mínimo que se necesita de cada entidad; evita atar esto a los modelos. */
interface ConCategoria {
  get(campo: 'categoria'): { id?: string } | undefined;
}
interface ConBloque {
  id?: string;
  getBloque?(): { id?: string } | undefined;
  get(campo: 'bloque'): { id?: string } | undefined;
}
interface ConId {
  id?: string;
}

export function recortarAlModulo<C extends ConBloque, B extends ConId>(
  ejercicios: ConCategoria[],
  categorias: C[],
  bloques: B[],
): { categorias: C[]; bloques: B[] } {
  const categoriasUsadas = new Set(
    ejercicios.map((e) => e.get('categoria')?.id).filter((id): id is string => !!id),
  );

  // El orden de entrada se conserva: las dos listas llegan ya ordenadas por
  // `orden` y ese orden es el del árbol.
  const categoriasDelModulo = categorias.filter((c) => c.id && categoriasUsadas.has(c.id));

  const bloquesUsados = new Set(
    categoriasDelModulo
      .map((c) => (c.getBloque ? c.getBloque()?.id : c.get('bloque')?.id))
      .filter((id): id is string => !!id),
  );
  const bloquesDelModulo = bloques.filter((b) => b.id && bloquesUsados.has(b.id));

  return { categorias: categoriasDelModulo, bloques: bloquesDelModulo };
}
