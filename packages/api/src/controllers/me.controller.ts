import type { Request, Response } from 'express';
import { getAllowedMaterias } from '../services/materia.service.js';

/**
 * GET /api/me/materias — materias a las que el usuario autenticado tiene acceso
 * (admin ⇒ todas; alumno ⇒ las de sus grupos). Usado por el panel para armar
 * el link dinámico a su Docusaurus.
 */
export async function getMyMaterias(req: Request, res: Response): Promise<void> {
  const user = req.appUser;
  if (!user) {
    res.status(401).json({ status: 'error', message: 'Autenticación requerida' });
    return;
  }

  try {
    const materias = await getAllowedMaterias(user);
    res.json({ status: 'ok', materias });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener materias' });
  }
}
