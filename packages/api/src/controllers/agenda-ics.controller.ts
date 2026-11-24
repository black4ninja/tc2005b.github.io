import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import Parse from 'parse/node';
import type { AppUser } from '../models/AppUser.js';
import { config } from '../config/index.js';
import { relojEnZona, sumarDiasFecha } from '../services/agenda-staff.js';
import { generarIcs, TOKEN_ICS, visibleEnAgenda } from '../services/agenda-ics.js';
import { construirAgenda } from './agenda-staff.controller.js';

/** Lo que cubre el feed: el mes pasado y el próximo medio año. */
const DIAS_ATRAS = 30;
const DIAS_ADELANTE = 180;

function nuevoToken(): string {
  return randomBytes(24).toString('base64url');
}

async function usuarioFresco(req: Request): Promise<AppUser> {
  const actual = req.appUser as AppUser;
  return new Parse.Query<AppUser>('AppUser').get(actual.id!, { useMasterKey: true });
}

/** GET /me/agenda/ics — el token actual de la persona, o null si no tiene. */
export async function getEnlaceIcs(req: Request, res: Response): Promise<void> {
  try {
    const u = await usuarioFresco(req);
    res.json({ status: 'ok', token: u.getAgendaIcsToken() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al leer el enlace del calendario' });
  }
}

/**
 * POST /me/agenda/ics — crea el token o lo REGENERA: el enlace anterior deja de
 * funcionar en el siguiente refresco de Google u Outlook.
 */
export async function crearEnlaceIcs(req: Request, res: Response): Promise<void> {
  try {
    const u = await usuarioFresco(req);
    const token = nuevoToken();
    u.setAgendaIcsToken(token);
    await u.save(null, { useMasterKey: true });
    res.json({ status: 'ok', token });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al crear el enlace del calendario' });
  }
}

/** DELETE /me/agenda/ics — desactiva el enlace. */
export async function borrarEnlaceIcs(req: Request, res: Response): Promise<void> {
  try {
    const u = await usuarioFresco(req);
    u.setAgendaIcsToken(null);
    await u.save(null, { useMasterKey: true });
    res.json({ status: 'ok', token: null });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al desactivar el enlace del calendario' });
  }
}

/**
 * GET /agenda/ics/:archivo (`<token>.ics`) — PÚBLICO: lo piden los servidores
 * de Google y Microsoft, que no tienen sesión. El token es la única llave; con
 * uno que no existe, o de alguien que ya no es staff o está dado de baja, 404
 * sin más pistas.
 */
export async function getFeedIcs(req: Request, res: Response): Promise<void> {
  const token = String(req.params.archivo ?? '').replace(/\.ics$/i, '');
  if (!TOKEN_ICS.test(token)) {
    res.status(404).type('text/plain').send('No encontrado');
    return;
  }
  try {
    const q = new Parse.Query<AppUser>('AppUser');
    q.equalTo('agendaIcsToken' as any, token as any);
    q.equalTo('exists' as any, true as any);
    const user = await q.first({ useMasterKey: true });
    if (!user || user.get('active') === false || !user.isStaff()) {
      res.status(404).type('text/plain').send('No encontrado');
      return;
    }

    const hoy = relojEnZona(new Date()).fecha;
    const agenda = await construirAgenda(user, sumarDiasFecha(hoy, -DIAS_ATRAS), sumarDiasFecha(hoy, DIAS_ADELANTE), true);
    // Lo mismo que la persona tiene encendido en «Mi agenda».
    const porId = new Map(agenda.grupos.map((g) => [g.id!, g]));
    const eventos = agenda.eventos.filter((ev) => {
      const g = porId.get(ev.grupoId);
      return !!g && visibleEnAgenda(g.esMio, agenda.preferencias[ev.grupoId], ev.tipo);
    });

    const ics = generarIcs({
      eventos,
      nombreGrupo: new Map(agenda.grupos.map((g) => [g.id!, String(g.name)])),
      base: config.auth.frontendUrl.replace(/\/$/, ''),
    });
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Content-Disposition', 'inline; filename="mi-agenda.ics"');
    res.set('Cache-Control', 'private, max-age=900');
    res.send(ics);
  } catch {
    res.status(500).type('text/plain').send('Error al generar el calendario');
  }
}
