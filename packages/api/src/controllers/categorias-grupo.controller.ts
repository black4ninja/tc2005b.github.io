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

export async function listCategoriasGrupo(_req: Request, res: Response): Promise<void> {
  try {
    const q = new Parse.Query<CategoriaGrupo>('CategoriaGrupo');
    q.equalTo('exists' as any, true as any);
    q.ascending('nombre');
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
