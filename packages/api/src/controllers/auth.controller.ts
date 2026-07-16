import type { Request, Response } from 'express';
import { AppUser } from '../models/index.js';
import { BaseModel } from '../models/BaseModel.js';
import { getGruposDeAlumno } from '../services/grupo-alumno.service.js';
import { getGruposDeStaff } from '../services/grupo-admin.service.js';

async function buildGruposExtras(
  user: AppUser,
): Promise<{ grupos: { id: string; name: string; urlAgendaEntrevistas: string | null }[] }> {
  // Alumno: sus grupos vía GrupoAlumno. Profesor: los grupos donde está asignado
  // (Grupo.admins) — el front lo manda directo a su grupo al loguear, igual que
  // al alumno. Admin: sin grupos aquí (entra al panel global).
  let grupos;
  if (user.isAlumno()) grupos = await getGruposDeAlumno(user.id);
  else if (user.isProfesor()) grupos = await getGruposDeStaff(user.id);
  else return { grupos: [] };

  return {
    grupos: grupos.map((g) => ({
      id: g.id,
      name: g.get('name') ?? '',
      // El menú enlaza a la agenda de SU grupo; sin URL, el ítem no se muestra
      // (mismo criterio que "Documentación" sin colecciones).
      urlAgendaEntrevistas: g.get('urlAgendaEntrevistas') ?? null,
    })),
  };
}

export async function identifyUserEndpoint(req: Request, res: Response): Promise<void> {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ status: 'error', message: 'Email is required' });
    return;
  }

  try {
    const query = BaseModel.queryActive<AppUser>('AppUser');
    query.equalTo('email', email);
    const user = await query.first({ useMasterKey: true });

    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    const extras = await buildGruposExtras(user);
    res.json({ status: 'ok', user: user.toSafeJSON(extras) });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to identify user' });
  }
}

export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  if (!req.appUser) {
    res.status(401).json({ status: 'error', message: 'Not authenticated' });
    return;
  }

  const extras = await buildGruposExtras(req.appUser);
  res.json({ status: 'ok', user: req.appUser.toSafeJSON(extras) });
}
