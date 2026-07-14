import type { Request, Response } from 'express';
import Parse from 'parse/node';
import bcrypt from 'bcryptjs';
import { BaseModel } from '../models/BaseModel.js';
import { AppUser } from '../models/AppUser.js';

/**
 * GET /admin/administradores — lista los usuarios administradores dados de alta.
 *
 * Solo `userType: 'admin'` y solo activos (`queryActive`): la vista es el censo
 * de administradores, no incluye alumnos. Sin matrícula ni grupos, que son del
 * alumno; sí el último acceso, útil para saber quién sigue entrando.
 */
export async function listAdmins(_req: Request, res: Response): Promise<void> {
  try {
    const query = BaseModel.queryActive<AppUser>('AppUser');
    query.equalTo('userType', 'admin');
    query.ascending('name');
    query.limit(1000);
    const admins = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      administradores: admins.map((a) => ({
        id: a.id,
        name: a.getName(),
        email: a.getEmail(),
        lastLogin: a.getLastLogin() ?? null,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener administradores' });
  }
}

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
