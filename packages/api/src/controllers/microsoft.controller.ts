import type { Request, Response } from 'express';
import { microsoftService } from '../services/microsoft.service.js';
import { authService } from '../services/auth.service.js';
import { getGruposDeAlumno } from '../services/grupo-alumno.service.js';
import { setSessionCookie } from '../utils/session-cookie.js';

export async function loginWithMicrosoft(req: Request, res: Response) {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      res.status(400).json({ status: 'error', message: 'idToken es requerido' });
      return;
    }

    const { email } = await microsoftService.validateIdToken(idToken);

    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.socket.remoteAddress || '';

    const { session, user } = await authService.loginWithMicrosoft(email, {
      userAgent,
      ipAddress,
    });

    let extras: { grupos: { id: string; name: string }[] } = { grupos: [] };
    if (user.isAlumno()) {
      const grupos = await getGruposDeAlumno(user.id);
      extras = { grupos: grupos.map((g) => ({ id: g.id, name: g.get('name') ?? '' })) };
    }

    setSessionCookie(res, session.getToken());
    res.json({
      status: 'success',
      sessionToken: session.getToken(),
      user: user.toSafeJSON(extras),
    });
  } catch (error) {
    console.error('[MicrosoftController] loginWithMicrosoft error:', error);

    const message = error instanceof Error ? error.message : 'Error al iniciar sesión con Microsoft';

    const status = message.includes('No existe una cuenta') ? 404 : 401;
    res.status(status).json({ status: 'error', message });
  }
}
