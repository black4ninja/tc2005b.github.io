import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { AppUser } from '../models/index.js';
import { BaseModel } from '../models/BaseModel.js';
import {
  construirGruposDeSesion,
  type GrupoDeSesion,
} from '../services/sesion-payload.service.js';
import { setSessionCookie } from '../utils/session-cookie.js';
import { config } from '../config/index.js';

async function buildGruposExtras(user: AppUser): Promise<{ grupos: GrupoDeSesion[] }> {
  return { grupos: await construirGruposDeSesion(user) };
}

export async function identifyUserEndpoint(req: Request, res: Response): Promise<void> {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ status: 'error', message: 'Email is required' });
    return;
  }

  try {
    const query = BaseModel.queryActive<AppUser>('AppUser');
    query.equalTo('email', email);
    const user = await query.first({ useMasterKey: true });

    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    const extras = await buildGruposExtras(user);
    res.json({ status: 'ok', user: user.toSafeJSON(extras) });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to identify user' });
  }
}

export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  if (!req.appUser) {
    res.status(401).json({ status: 'error', message: 'Not authenticated' });
    return;
  }

  // Repone la cookie de sesión si falta.
  //
  // El SPA guarda su token en localStorage y lo manda en `x-session-token`, pero
  // un `<img>` NO puede mandar cabeceras: las imágenes del CMS
  // (`/api/contenidos/recursos/…`) dependen exclusivamente de la cookie. Si el
  // token sobrevive y la cookie no —se limpiaron cookies, se caducó antes, o la
  // sesión se abrió antes de que la cookie existiera— la app parece funcionar
  // (el texto carga por cabecera) y solo se rompen las imágenes, en silencio y
  // sin ningún mensaje que explique por qué.
  //
  // `/auth/me` corre en cada arranque de la app con el token en la cabecera y ya
  // validado por `identifyUser`, así que es el punto natural para volver a
  // sembrarla: con una recarga, el usuario se recupera solo.
  const enCabecera = req.headers['x-session-token'];
  if (typeof enCabecera === 'string' && enCabecera && !req.cookies?.[config.cookies.name]) {
    setSessionCookie(res, enCabecera);
  }

  const extras = await buildGruposExtras(req.appUser);
  res.json({ status: 'ok', user: req.appUser.toSafeJSON(extras) });
}

/** Preferencias de tema admitidas. Espeja `PreferenciaTema` del cliente. */
const TEMAS = ['claro', 'oscuro', 'auto'] as const;

/**
 * `PUT /me/preferencias/tema` — guarda el tema elegido en la ficha del usuario.
 *
 * Es de CUALQUIER usuario con sesión, no solo del staff: es una preferencia
 * suya, no una configuración del sistema. Solo puede tocar la propia — el id
 * sale de la sesión, nunca del cuerpo.
 */
export async function setPreferenciaTema(req: Request, res: Response): Promise<void> {
  const { tema } = req.body;

  if (!TEMAS.includes(tema)) {
    res.status(400).json({ status: 'error', message: `tema debe ser uno de: ${TEMAS.join(', ')}` });
    return;
  }

  try {
    const actual = req.appUser as AppUser | undefined;
    if (!actual) {
      res.status(401).json({ status: 'error', message: 'Not authenticated' });
      return;
    }

    // Nada que escribir: ahorra un viaje a la BD en cada carga que reafirma lo
    // que ya estaba guardado.
    if (actual.getPreferenciaTema() === tema) {
      res.json({ status: 'ok', tema });
      return;
    }

    const query = new Parse.Query<AppUser>('AppUser');
    const usuario = await query.get(actual.id, { useMasterKey: true });
    usuario.setPreferenciaTema(tema);
    await usuario.save(null, { useMasterKey: true });

    res.json({ status: 'ok', tema });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al guardar la preferencia' });
  }
}
