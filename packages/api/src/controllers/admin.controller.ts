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

/**
 * PUT /admin/administradores/:id/grupos — { grupoIds: string[] }
 *
 * Lado ADMIN de la asignación bidireccional: fija en qué grupos figura este
 * admin. La relación vive en `Grupo.admins` (array de pointers), así que
 * reconciliar desde aquí significa añadir/quitar el pointer del admin en cada
 * grupo afectado — sin tocar los grupos que no cambian.
 *
 * Es una asociación organizativa: NO altera el acceso (todo admin ve todo).
 */
export async function setGruposDeAdmin(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { grupoIds } = req.body ?? {};

  if (!Array.isArray(grupoIds) || grupoIds.some((g) => typeof g !== 'string')) {
    res.status(400).json({ status: 'error', message: 'grupoIds debe ser un arreglo de ids' });
    return;
  }

  try {
    // El id debe ser un admin vivo: no se asignan grupos a un alumno.
    const admin = await new Parse.Query<AppUser>('AppUser')
      .equalTo('exists', true)
      .equalTo('userType', 'admin')
      .get(id, { useMasterKey: true })
      .catch(() => null);
    if (!admin) {
      res.status(404).json({ status: 'error', message: 'Administrador no encontrado' });
      return;
    }
    const adminPointer = Parse.Object.extend('AppUser').createWithoutData(id);

    const deseados = new Set([...new Set(grupoIds)]);

    // Grupos válidos entre los deseados (ignora ids muertos en silencio: la
    // meta es "que el admin quede en estos grupos", no auditar el payload).
    const grupoQuery = BaseModel.queryActive('Grupo');
    grupoQuery.include('admins');
    grupoQuery.limit(1000);
    const grupos = await grupoQuery.find({ useMasterKey: true });

    const porCambiar: Parse.Object[] = [];
    for (const grupo of grupos) {
      const admins = (grupo.get('admins') as Parse.Object[]) ?? [];
      const estaba = admins.some((a) => a.id === id);
      const debeEstar = deseados.has(grupo.id);
      if (estaba === debeEstar) continue;

      grupo.set(
        'admins',
        debeEstar
          ? [...admins, adminPointer]
          : admins.filter((a) => a.id !== id),
      );
      porCambiar.push(grupo);
    }

    if (porCambiar.length > 0) {
      await Parse.Object.saveAll(porCambiar, { useMasterKey: true });
    }

    res.json({ status: 'ok', gruposModificados: porCambiar.length });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al asignar grupos al administrador' });
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
