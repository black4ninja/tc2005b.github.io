import Parse from 'parse/node';

/**
 * Resuelve el id de una categoría del catálogo `CategoriaGrupo`.
 *
 * Lo comparten los grupos y las COLECCIONES: son las mismas categorías
 * —«Móviles», «Gráficas», «IA»— y el mismo color, que es justo lo que hace que
 * una materia y sus grupos se reconozcan como lo mismo de un vistazo. La clase
 * conserva el nombre `CategoriaGrupo` porque tiene datos y renombrarla costaría
 * una migración sin ganar nada.
 *
 * Tres respuestas distintas y todas significan algo:
 *  - `undefined`: el cliente no mandó el campo → no se toca lo que hubiera.
 *  - `null`: lo mandó vacío → se quita la categoría.
 *  - `'invalido'`: mandó un id que no existe → 400, en vez de guardar un
 *    puntero roto que luego se serializa como `null` sin que nadie se entere.
 */
export async function resolverCategoriaGrupo(
  valor: unknown,
): Promise<Parse.Object | null | 'invalido' | undefined> {
  if (valor === undefined) return undefined;
  if (valor === null || valor === '') return null;
  if (typeof valor !== 'string') return 'invalido';

  const q = new Parse.Query('CategoriaGrupo');
  q.equalTo('exists' as any, true as any);
  const categoria = await q.get(valor, { useMasterKey: true }).catch(() => null);
  return categoria ?? 'invalido';
}

/**
 * Representación de la categoría dentro de otro objeto. Sin `include` llega el
 * pointer sin datos, y entonces es mejor `null` que una fila en blanco.
 */
export function categoriaSafeJSON(
  categoria: Parse.Object | undefined,
): { id: string; nombre: string; color: string } | null {
  if (!categoria || categoria.get('exists') === false) return null;
  const nombre = categoria.get('nombre');
  if (nombre === undefined) return null;
  return { id: categoria.id!, nombre, color: categoria.get('color') ?? '#64748b' };
}
