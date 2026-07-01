import type { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { getGruposDeAlumno } from '../services/grupo-alumno.service.js';

export async function requestMagicLink(req: Request, res: Response): Promise<void> {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ status: 'error', message: 'Email es requerido' });
    return;
  }

  try {
    const result = await authService.requestMagicLink(email);
    res.json({ status: 'ok', message: result.message });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al procesar la solicitud' });
  }
}

export async function verifyMagicLink(req: Request, res: Response): Promise<void> {
  const { token } = req.body;

  if (!token || typeof token !== 'string') {
    res.status(400).json({ status: 'error', message: 'Token es requerido' });
    return;
  }

  try {
    const { session, user } = await authService.verifyMagicLink(token, {
      userAgent: req.headers['user-agent'] || 'unknown',
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
    });

    let extras: { grupos: { id: string; name: string }[] } = { grupos: [] };
    if (user.isAlumno()) {
      const grupos = await getGruposDeAlumno(user.id);
      extras = { grupos: grupos.map((g) => ({ id: g.id, name: g.get('name') ?? '' })) };
    }

    res.json({
      status: 'ok',
      sessionToken: session.getToken(),
      user: user.toSafeJSON(extras),
    });
  } catch (error: any) {
    res.status(401).json({ status: 'error', message: error.message || 'Token inválido' });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const sessionToken = req.headers['x-session-token'] as string;

  if (!sessionToken) {
    res.status(400).json({ status: 'error', message: 'Session token requerido' });
    return;
  }

  try {
    await authService.logout(sessionToken);
    res.json({ status: 'ok', message: 'Sesión cerrada' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al cerrar sesión' });
  }
}
