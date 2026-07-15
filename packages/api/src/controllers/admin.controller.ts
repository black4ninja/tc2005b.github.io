import type { Request, Response } from 'express';
import Parse from 'parse/node';
import bcrypt from 'bcryptjs';
import { BaseModel } from '../models/BaseModel.js';
import { AppUser } from '../models/AppUser.js';

/** Roles de personal gestionables desde esta vista (no incluye alumnos). */
const ROLES_STAFF = ['admin', 'profesor'] as const;
type RolStaff = (typeof ROLES_STAFF)[number];
const esRolStaff = (v: unknown): v is RolStaff => ROLES_STAFF.includes(v as RolStaff);

/**
 * GET /admin/administradores — lista el personal (admins y profesores) dado de
 * alta, con su rol. Solo activos (`queryActive`); no incluye alumnos, que tienen
 * su propio flujo. `userType` va por fila para poder mostrar y editar el rol.
 */
export async function listAdmins(_req: Request, res: Response): Promise<void> {
  try {
    const query = BaseModel.queryActive<AppUser>('AppUser');
    query.containedIn('userType', [...ROLES_STAFF]);
    query.ascending('name');
    query.limit(1000);
    const admins = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      administradores: admins.map((a) => ({
        id: a.id,
        name: a.getName(),
        email: a.getEmail(),
        userType: a.getUserType(),
        lastLogin: a.getLastLogin() ?? null,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener administradores' });
  }
}

/** Cuenta admins activos; sirve al guardrail de "no dejar cero admins". */
async function contarAdmins(excluirId?: string): Promise<number> {
  const q = BaseModel.queryActive<AppUser>('AppUser');
  q.equalTo('userType', 'admin');
  if (excluirId) q.notEqualTo('objectId', excluirId);
  return q.count({ useMasterKey: true });
}

/**
 * POST /admin/administradores — crea un usuario de personal.
 * Body: { name, email, userType: 'admin'|'profesor', password }.
 * Login por contraseña (hash bcrypt), igual que los admins sembrados. Los
 * alumnos NO se crean aquí (tienen su alta por grupo).
 */
export async function createAdmin(req: Request, res: Response): Promise<void> {
  const { name, email, userType, password } = req.body ?? {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ status: 'error', message: 'El nombre es requerido' });
    return;
  }
  if (!email || typeof email !== 'string' || !email.trim()) {
    res.status(400).json({ status: 'error', message: 'El correo es requerido' });
    return;
  }
  if (!esRolStaff(userType)) {
    res.status(400).json({ status: 'error', message: 'El rol debe ser admin o profesor' });
    return;
  }
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ status: 'error', message: 'La contraseña debe tener al menos 8 caracteres' });
    return;
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    // Un email ya existente (de cualquier tipo, incluido alumno) no se duplica.
    const existe = await BaseModel.queryActive<AppUser>('AppUser')
      .equalTo('email', normalizedEmail)
      .first({ useMasterKey: true });
    if (existe) {
      res.status(409).json({ status: 'error', message: 'Ya existe un usuario con ese correo' });
      return;
    }

    const user = new AppUser().initDefaults();
    user.setName(name.trim());
    user.setEmail(normalizedEmail);
    user.setUserType(userType);
    user.setAttributes({});
    user.setPasswordHash(await bcrypt.hash(password, 10));
    await user.save(null, { useMasterKey: true });

    res.status(201).json({
      status: 'ok',
      administrador: {
        id: user.id,
        name: user.getName(),
        email: user.getEmail(),
        userType: user.getUserType(),
        lastLogin: null,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear el usuario' });
  }
}

/**
 * PUT /admin/administradores/:id — edita nombre y/o rol de un usuario de personal.
 * Guardrail: no se permite dejar el sistema con CERO admins (degradar al último).
 */
export async function updateAdmin(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, userType } = req.body ?? {};

  if (userType !== undefined && !esRolStaff(userType)) {
    res.status(400).json({ status: 'error', message: 'El rol debe ser admin o profesor' });
    return;
  }

  try {
    const user = await BaseModel.queryActive<AppUser>('AppUser')
      .containedIn('userType', [...ROLES_STAFF])
      .get(id, { useMasterKey: true })
      .catch(() => null);
    if (!user) {
      res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
      return;
    }

    // Degradar de admin a profesor: exigir que quede al menos otro admin.
    if (userType === 'profesor' && user.isAdmin()) {
      const otrosAdmins = await contarAdmins(user.id);
      if (otrosAdmins === 0) {
        res.status(400).json({
          status: 'error',
          message: 'No puedes dejar el sistema sin administradores. Asigna otro admin primero.',
        });
        return;
      }
    }

    if (typeof name === 'string' && name.trim()) user.setName(name.trim());
    if (userType !== undefined) user.setUserType(userType);
    await user.save(null, { useMasterKey: true });

    res.json({
      status: 'ok',
      administrador: {
        id: user.id,
        name: user.getName(),
        email: user.getEmail(),
        userType: user.getUserType(),
        lastLogin: user.getLastLogin() ?? null,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al actualizar el usuario' });
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
    // Se asignan grupos tanto a admins como a profesores (ambos son staff que
    // figura en Grupo.admins); nunca a un alumno.
    const admin = await new Parse.Query<AppUser>('AppUser')
      .equalTo('exists', true)
      .containedIn('userType', [...ROLES_STAFF])
      .get(id, { useMasterKey: true })
      .catch(() => null);
    if (!admin) {
      res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
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
