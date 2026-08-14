import type { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { construirGruposDeSesion } from '../services/sesion-payload.service.js';
import { setSessionCookie } from '../utils/session-cookie.js';

export async function loginWithPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ status: 'error', message: 'Email y contraseña son requeridos.' });
      return;
    }

    const { session, user } = await authService.loginWithPassword(email, password, {
      userAgent: req.headers['user-agent'] ?? 'unknown',
      ipAddress: req.ip ?? 'unknown',
    });

    // La MISMA lista que el enlace mágico. Esta puerta se la construía aparte y
    // se quedaba en `{id, name}`: sin ella el alumno entraba sin saber si le
    // falta el perfil, sin el color del selector y sin la agenda de su grupo, y
    // el profesor entraba sin grupos —o sea, al panel global en vez de al suyo—.
    const extras = { grupos: await construirGruposDeSesion(user) };

    setSessionCookie(res, session.getToken());
    res.json({
      status: 'ok',
      sessionToken: session.getToken(),
      user: user.toSafeJSON(extras),
    });
  } catch {
    res.status(401).json({ status: 'error', message: 'Credenciales inválidas' });
  }
}
