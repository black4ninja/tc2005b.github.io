import type { Request, Response } from 'express';
import Parse from 'parse/node';
import type { AppUser } from '../models/AppUser.js';
import { BaseModel } from '../models/BaseModel.js';
import { HappinessEntrada } from '../models/HappinessEntrada.js';
import { moduloActivoEnGrupo } from '../services/grupo-colecciones.service.js';
import { getVinculoConGrupoActivo } from '../services/grupo-alumno.service.js';
import { claveDia } from '../services/agenda-entrevistas.service.js';
import { esDiaValido, validarEntrada } from '../services/happiness-door.js';

/**
 * Happiness Door (Management 3.0), módulo opt-in `happiness`.
 *
 * Las mismas cuatro operaciones sobre las PROPIAS entradas sirven al alumno y al
 * staff: solo cambia cómo se comprueba que la persona es del grupo. El tablero
 * con los nombres de todos es solo del staff.
 */

interface Contexto {
  grupo: Parse.Object;
  user: AppUser;
}
type Resolver = (req: Request, res: Response) => Promise<Contexto | null>;

const MK = { useMasterKey: true };

async function moduloDisponible(grupoId: string, res: Response): Promise<boolean> {
  if (await moduloActivoEnGrupo(grupoId, 'happiness')) return true;
  res.status(404).json({ status: 'error', message: 'El Happiness Door no está disponible en este grupo' });
  return false;
}

/** Alumno: tiene que estar inscrito en el grupo, y el grupo activo. */
export const contextoAlumno: Resolver = async (req, res) => {
  const user = req.appUser as AppUser | undefined;
  const { grupoId } = req.params;
  if (!user || !grupoId) {
    res.status(400).json({ status: 'error', message: 'Datos incompletos' });
    return null;
  }
  if (!(await getVinculoConGrupoActivo(user.id!, grupoId))) {
    res.status(403).json({ status: 'error', message: 'No perteneces a este grupo' });
    return null;
  }
  if (!(await moduloDisponible(grupoId, res))) return null;
  return { grupo: Parse.Object.extend('Grupo').createWithoutData(grupoId), user };
};

/** Staff: la pertenencia ya la comprobó `requireGrupoAccess` en la ruta. */
export const contextoStaff: Resolver = async (req, res) => {
  const user = req.appUser as AppUser | undefined;
  const { grupoId } = req.params;
  if (!user || !grupoId) {
    res.status(400).json({ status: 'error', message: 'Datos incompletos' });
    return null;
  }
  if (!(await moduloDisponible(grupoId, res))) return null;
  return { grupo: Parse.Object.extend('Grupo').createWithoutData(grupoId), user };
};

/** Entrada viva del grupo cuyo autor es `user`, o null (y ya respondió 404). */
async function entradaPropia(ctx: Contexto, entradaId: string, res: Response): Promise<HappinessEntrada | null> {
  const q = BaseModel.queryActive<HappinessEntrada>('HappinessEntrada');
  q.equalTo('grupo' as any, ctx.grupo as any);
  q.equalTo('autor' as any, ctx.user as any);
  q.include('autor' as any);
  try {
    return await q.get(entradaId, MK);
  } catch {
    // Ajena y no existente responden igual: no se confirma que exista.
    res.status(404).json({ status: 'error', message: 'Entrada no encontrada' });
    return null;
  }
}

export function misEntradas(contexto: Resolver) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = await contexto(req, res);
      if (!ctx) return;
      const q = BaseModel.queryActive<HappinessEntrada>('HappinessEntrada');
      q.equalTo('grupo' as any, ctx.grupo as any);
      q.equalTo('autor' as any, ctx.user as any);
      q.include('autor' as any);
      q.descending('dia');
      q.addDescending('createdAt');
      q.limit(1000);
      const entradas = await q.find(MK);
      res.json({ status: 'ok', hoy: claveDia(new Date()), entradas: entradas.map((e) => e.toSafeJSON()) });
    } catch {
      res.status(500).json({ status: 'error', message: 'Error al cargar tus entradas' });
    }
  };
}

export function crearEntrada(contexto: Resolver) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const v = validarEntrada(req.body, true);
      if (!v.ok) {
        res.status(400).json({ status: 'error', message: v.error });
        return;
      }
      const ctx = await contexto(req, res);
      if (!ctx) return;
      const e = new HappinessEntrada().initDefaults();
      e.setGrupo(ctx.grupo);
      e.setAutor(ctx.user);
      e.setRolAutor(ctx.user.getUserType());
      // El día lo pone el servidor en la zona del curso: una entrada es de HOY.
      e.setDia(claveDia(new Date()));
      e.setEstado(v.estado!);
      e.setTexto(v.texto!);
      await e.save(null, MK);
      res.status(201).json({ status: 'ok', entrada: e.toSafeJSON() });
    } catch {
      res.status(500).json({ status: 'error', message: 'Error al guardar la entrada' });
    }
  };
}

export function editarEntrada(contexto: Resolver) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const v = validarEntrada(req.body, false);
      if (!v.ok) {
        res.status(400).json({ status: 'error', message: v.error });
        return;
      }
      const ctx = await contexto(req, res);
      if (!ctx) return;
      const e = await entradaPropia(ctx, req.params.entradaId, res);
      if (!e) return;
      if (v.estado) e.setEstado(v.estado);
      if (v.texto !== undefined) e.setTexto(v.texto);
      await e.save(null, MK);
      res.json({ status: 'ok', entrada: e.toSafeJSON() });
    } catch {
      res.status(500).json({ status: 'error', message: 'Error al editar la entrada' });
    }
  };
}

export function borrarEntrada(contexto: Resolver) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = await contexto(req, res);
      if (!ctx) return;
      const e = await entradaPropia(ctx, req.params.entradaId, res);
      if (!e) return;
      e.softDelete();
      await e.save(null, MK);
      res.json({ status: 'ok' });
    } catch {
      res.status(500).json({ status: 'error', message: 'Error al borrar la entrada' });
    }
  };
}

/**
 * Tablero del staff: todas las entradas de UN día, con su autor. Trae también
 * los días que tienen alguna, para que las flechas salten de uno con entradas
 * al siguiente en vez de recorrer días vacíos.
 */
export async function tableroDelDia(req: Request, res: Response): Promise<void> {
  try {
    const ctx = await contextoStaff(req, res);
    if (!ctx) return;
    const hoy = claveDia(new Date());
    const dia = req.query.dia === undefined ? hoy : req.query.dia;
    if (!esDiaValido(dia)) {
      res.status(400).json({ status: 'error', message: 'El día debe tener el formato AAAA-MM-DD' });
      return;
    }

    const q = BaseModel.queryActive<HappinessEntrada>('HappinessEntrada');
    q.equalTo('grupo' as any, ctx.grupo as any);
    q.equalTo('dia' as any, dia as any);
    q.include('autor' as any);
    q.ascending('createdAt');
    q.limit(1000);

    // Solo los días distintos: traer las filas para deduplicarlas aquí leía el
    // histórico entero en cada vuelta del tablero.
    const qDias = BaseModel.queryActive<HappinessEntrada>('HappinessEntrada');
    qDias.equalTo('grupo' as any, ctx.grupo as any);

    const [entradas, distintos] = await Promise.all([q.find(MK), qDias.distinct('dia' as any)]);
    const dias = (distintos as unknown[]).filter((d): d is string => typeof d === 'string' && d !== '').sort();
    res.json({ status: 'ok', hoy, dia, dias, entradas: entradas.map((e) => e.toSafeJSON()) });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al cargar el tablero' });
  }
}

/**
 * Histórico completo del grupo, para la exportación a Excel del staff. Va en
 * orden de lectura —por día y, dentro del día, por hora— y trae el correo del
 * autor, que en el archivo sirve para identificar a cada persona sin ambigüedad.
 */
export async function historicoGrupo(req: Request, res: Response): Promise<void> {
  try {
    const ctx = await contextoStaff(req, res);
    if (!ctx) return;
    const grupo = await new Parse.Query('Grupo').get(ctx.grupo.id!, MK);

    const entradas: HappinessEntrada[] = [];
    const LOTE = 1000;
    for (let skip = 0; ; skip += LOTE) {
      const q = BaseModel.queryActive<HappinessEntrada>('HappinessEntrada');
      q.equalTo('grupo' as any, ctx.grupo as any);
      q.include('autor' as any);
      q.ascending('dia');
      q.addAscending('createdAt');
      q.skip(skip);
      q.limit(LOTE);
      const lote = await q.find(MK);
      entradas.push(...lote);
      if (lote.length < LOTE) break;
    }

    res.json({
      status: 'ok',
      grupo: { id: grupo.id, name: grupo.get('name') ?? '' },
      entradas: entradas.map((e) => ({
        ...e.toSafeJSON(),
        autorEmail: e.getAutor()?.get('email') ?? null,
      })),
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al cargar el histórico' });
  }
}
