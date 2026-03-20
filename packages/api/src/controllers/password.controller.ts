import type { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';

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

    res.json({
      status: 'ok',
      sessionToken: session.getToken(),
      user: user.toSafeJSON(),
    });
  } catch {
    res.status(401).json({ status: 'error', message: 'Credenciales inválidas' });
  }
}
