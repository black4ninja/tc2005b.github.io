import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { CategoriaGrupo, normalizarColor, PALETA_CATEGORIAS } from '../models/CategoriaGrupo.js';
import { Grupo } from '../models/Grupo.js';

/**
 * CRUD del catálogo de categorías de grupo (la materia o el nivel: "Móviles",
 * "Gráficas", "IA", "6to"). Es dinámico porque cambia cada semestre con lo que
 * se le asigne al profesor.
 */

/** Tope de nombre, para que quepa en la insignia sin romper la maquetación. */
const NOMBRE_MAX = 40;

/**
 * Valida y normaliza el nombre. Devuelve el texto limpio o un mensaje de error.
 * El nombre se compara SIN distinguir mayúsculas ni espacios de sobra para
 * detectar duplicados: "IA " y "ia" son la misma categoría para un humano, y
 * dos entradas casi idénticas en el desplegable son justo lo que este cambio
 * intenta evitar.
 */
function validarNombre(valor: unknown): { nombre: string } | { error: string } {
  if (typeof valor !== 'string' || valor.trim() === '') {
    return { error: 'El nombre es requerido' };
  }
  const nombre = valor.trim().replace(/\s+/g, ' ');
  if (nombre.length > NOMBRE_MAX) {
    return { error: `El nombre no puede pasar de ${NOMBRE_MAX} caracteres` };
  }
  return { nombre };
}

/** ¿Ya hay otra categoría viva con ese nombre? `exceptoId` salta la propia al editar. */
async function nombreRepetido(nombre: string, exceptoId?: string): Promise<boolean> {
  const q = new Parse.Query<CategoriaGrupo>('CategoriaGrupo');
  q.equalTo('exists' as any, true as any);
  q.limit(1000);
  const todas = await q.find({ useMasterKey: true });
  const buscado = nombre.toLowerCase();
  return todas.some((c) => c.id !== exceptoId && c.getNombre().trim().toLowerCase() === buscado);
}

/**
 * ¿La lista recibida es una permutación EXACTA de las categorías que existen?
 *
 * Aparte como función pura para poder probarla: es donde se decide si un
 * payload raro reordena medio catálogo o se rechaza entero. Falla si sobra algo,
 * si falta algo o si un id viene repetido.
 */
export function esOrdenCompleto(ids: string[], existentes: string[]): boolean {
  const unicos = new Set(ids);
  if (unicos.size !== ids.length) return false;
  if (unicos.size !== existentes.length) return false;
  const vivos = new Set(existentes);
  return [...unicos].every((id) => vivos.has(id));
}

/** Posición para una categoría nueva: detrás de la última que haya. */
async function siguienteOrden(): Promise<number> {
  const q = new Parse.Query<CategoriaGrupo>('CategoriaGrupo');
  q.equalTo('exists' as any, true as any);
  q.descending('orden');
  q.limit(1);
  const ultima = await q.first({ useMasterKey: true });
  return ultima ? ultima.getOrden() + 1 : 0;
}

export async function listCategoriasGrupo(_req: Request, res: Response): Promise<void> {
  try {
    const q = new Parse.Query<CategoriaGrupo>('CategoriaGrupo');
    q.equalTo('exists' as any, true as any);
    // Por `orden` y, a igualdad, por nombre: las categorías anteriores al campo
    // valen todas 0, y sin el desempate su orden entre sí quedaría al capricho
    // de la consulta y bailaría entre recargas.
    q.ascending('orden');
    q.addAscending('nombre' as any);
    q.limit(1000);
    const categorias = await q.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      categorias: categorias.map((c) => c.toSafeJSON()),
      // La paleta viaja con el listado para que el selector de color del cliente
      // no tenga que repetir los mismos ocho hex y se desincronicen.
      paleta: PALETA_CATEGORIAS,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener las categorías' });
  }
}

export async function createCategoriaGrupo(req: Request, res: Response): Promise<void> {
  const validado = validarNombre(req.body.nombre);
  if ('error' in validado) {
    res.status(400).json({ status: 'error', message: validado.error });
    return;
  }

  const color = normalizarColor(req.body.color);
  if (color === null) {
    res.status(400).json({ status: 'error', message: 'El color debe ser hexadecimal (#rrggbb)' });
    return;
  }

  try {
    if (await nombreRepetido(validado.nombre)) {
      res.status(409).json({ status: 'error', message: `Ya existe la categoría "${validado.nombre}"` });
      return;
    }

    const categoria = new CategoriaGrupo().initDefaults();
    categoria.setNombre(validado.nombre);
    categoria.setColor(color);
    // Al final de la lista: aparecer en medio de un orden que el usuario ya
    // colocó a mano sería desconcertante.
    categoria.setOrden(await siguienteOrden());
    await categoria.save(null, { useMasterKey: true });

    res.status(201).json({ status: 'ok', categoria: categoria.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear la categoría' });
  }
}

export async function updateCategoriaGrupo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const q = new Parse.Query<CategoriaGrupo>('CategoriaGrupo');
    q.equalTo('exists' as any, true as any);
    const categoria = await q.get(id, { useMasterKey: true });

    if (req.body.nombre !== undefined) {
      const validado = validarNombre(req.body.nombre);
      if ('error' in validado) {
        res.status(400).json({ status: 'error', message: validado.error });
        return;
      }
      if (await nombreRepetido(validado.nombre, id)) {
        res.status(409).json({ status: 'error', message: `Ya existe la categoría "${validado.nombre}"` });
        return;
      }
      categoria.setNombre(validado.nombre);
    }

    if (req.body.color !== undefined) {
      const color = normalizarColor(req.body.color);
      if (color === null) {
        res.status(400).json({ status: 'error', message: 'El color debe ser hexadecimal (#rrggbb)' });
        return;
      }
      categoria.setColor(color);
    }

    await categoria.save(null, { useMasterKey: true });
    res.json({ status: 'ok', categoria: categoria.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Categoría no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al actualizar la categoría' });
  }
}

/**
 * `PUT /admin/categorias-grupo/orden` — reordena el catálogo entero.
 *
 * Recibe TODOS los ids en el orden nuevo, no un «mueve este de la 3 a la 1».
 * Mandar la lista completa hace la operación idempotente y deja el resultado a
 * salvo de que dos pestañas arrastren a la vez: la última en llegar gana con un
 * orden coherente, en vez de aplicarse sobre posiciones que ya cambiaron.
 *
 * Se exige que la lista coincida EXACTAMENTE con las categorías vivas. Aceptar
 * una parcial dejaría a las que faltan con su orden viejo, intercaladas donde
 * nadie las puso.
 */
export async function reordenarCategoriasGrupo(req: Request, res: Response): Promise<void> {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
    res.status(400).json({ status: 'error', message: 'Se requiere la lista de ids en el orden nuevo' });
    return;
  }

  try {
    const q = new Parse.Query<CategoriaGrupo>('CategoriaGrupo');
    q.equalTo('exists' as any, true as any);
    q.limit(1000);
    const categorias = await q.find({ useMasterKey: true });

    const porId = new Map(categorias.map((c) => [c.id, c]));

    if (!esOrdenCompleto(ids as string[], [...porId.keys()])) {
      res.status(400).json({
        status: 'error',
        message: 'La lista debe traer exactamente una vez cada categoría existente',
      });
      return;
    }

    const cambiadas: CategoriaGrupo[] = [];
    (ids as string[]).forEach((id, indice) => {
      const categoria = porId.get(id)!;
      // Solo las que se mueven: guardar las 30 en cada arrastre son 30
      // escrituras para cambiar dos.
      if (categoria.getOrden() === indice) return;
      categoria.setOrden(indice);
      cambiadas.push(categoria);
    });

    if (cambiadas.length > 0) {
      await Parse.Object.saveAll(cambiadas, { useMasterKey: true });
    }

    res.json({ status: 'ok', actualizadas: cambiadas.length });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al reordenar las categorías' });
  }
}

/**
 * Borrado lógico. Se NIEGA si algún grupo la sigue usando: borrarla dejaría a
 * esos grupos apuntando a un pointer muerto y, sobre todo, el profesor perdería
 * la agrupación sin enterarse. Se le dice cuántos y cuáles para que decida.
 */
export async function deleteCategoriaGrupo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const q = new Parse.Query<CategoriaGrupo>('CategoriaGrupo');
    q.equalTo('exists' as any, true as any);
    const categoria = await q.get(id, { useMasterKey: true });

    const enUso = new Parse.Query<Grupo>('Grupo');
    enUso.equalTo('exists' as any, true as any);
    enUso.equalTo('categoria' as any, categoria as any);
    enUso.limit(1000);
    const grupos = await enUso.find({ useMasterKey: true });

    if (grupos.length > 0) {
      const nombres = grupos.slice(0, 5).map((g) => g.getName());
      const resto = grupos.length - nombres.length;
      res.status(409).json({
        status: 'error',
        message:
          `La categoría la usan ${grupos.length} grupo(s): ${nombres.join(', ')}` +
          `${resto > 0 ? ` y ${resto} más` : ''}. Cámbiales la categoría antes de borrarla.`,
        grupos: grupos.map((g) => ({ id: g.id, name: g.getName() })),
      });
      return;
    }

    categoria.softDelete();
    await categoria.save(null, { useMasterKey: true });

    res.json({ status: 'ok', message: 'Categoría eliminada' });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Categoría no encontrada' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al eliminar la categoría' });
  }
}
