import type { Request, Response, NextFunction } from 'express';
import { abacService } from '../services/abac.service.js';

export function requireAccess(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.appUser) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    try {
      const result = await abacService.evaluateAccess(req.appUser, resource, action);

      if (!result.allowed) {
        res.status(403).json({
          status: 'error',
          message: 'Access denied',
          reason: result.reason,
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Failed to evaluate access' });
    }
  };
}

export const requireAdmin = requireAccess('admin_panel', 'access');
export const requireAlumno = requireAccess('alumnos_panel', 'access');
