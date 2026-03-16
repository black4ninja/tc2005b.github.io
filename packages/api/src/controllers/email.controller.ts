import { Request, Response } from 'express';
import { emailService } from '../services/email.service.js';

export async function sendTestEmail(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ status: 'error', message: 'El campo "email" es requerido' });
      return;
    }

    if (!emailService.isAvailable()) {
      res.status(503).json({ status: 'error', message: 'El servicio de email no está configurado' });
      return;
    }

    const result = await emailService.sendTestEmail(email);

    if (result.success) {
      res.json({ status: 'ok', message: 'Correo de prueba enviado', messageId: result.messageId });
    } else {
      res.status(500).json({ status: 'error', message: 'Error al enviar correo', error: result.error });
    }
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

export async function sendTestMagicLink(req: Request, res: Response): Promise<void> {
  try {
    const { email, name } = req.body;

    if (!email) {
      res.status(400).json({ status: 'error', message: 'El campo "email" es requerido' });
      return;
    }

    if (!emailService.isAvailable()) {
      res.status(503).json({ status: 'error', message: 'El servicio de email no está configurado' });
      return;
    }

    const result = await emailService.sendMagicLinkEmail({
      email,
      name: name || 'Usuario',
      magicLinkUrl: 'https://tc2005b.github.io/auth/verify?token=test-token-12345',
      expirationTime: '15 minutos',
    });

    if (result.success) {
      res.json({ status: 'ok', message: 'Correo de magic link enviado', messageId: result.messageId });
    } else {
      res.status(500).json({ status: 'error', message: 'Error al enviar correo', error: result.error });
    }
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}
