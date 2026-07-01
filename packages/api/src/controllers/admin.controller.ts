import type { Request, Response } from 'express';
import Parse from 'parse/node';
import bcrypt from 'bcryptjs';
import { AppUser } from '../models/AppUser.js';

export async function changeAdminPassword(req: Request, res: Response): Promise<void> {
  try {
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string') {
      res.status(400).json({ status: 'error', message: 'La contraseña es requerida' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ status: 'error', message: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ status: 'error', message: 'Las contraseñas no coinciden' });
      return;
    }

    const userId = (req as any).appUser.id;
    const query = new Parse.Query<AppUser>('AppUser');
    const user = await query.get(userId, { useMasterKey: true });

    const hash = await bcrypt.hash(newPassword, 10);
    user.set('passwordHash', hash);
    await user.save(null, { useMasterKey: true });

    res.json({ status: 'ok', message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al cambiar contraseña' });
  }
}
