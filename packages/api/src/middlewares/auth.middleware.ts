import type { Request, Response, NextFunction } from 'express';
import { AppUser } from '../models/index.js';
import { BaseModel } from '../models/BaseModel.js';
import { authService } from '../services/auth.service.js';
import { config } from '../config/index.js';

// Type augmentation
declare global {
  namespace Express {
    interface Request {
      appUser?: AppUser;
    }
  }
}

export async function identifyUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sessionToken = req.headers['x-session-token'] as string | undefined;
  const appUserId = req.headers['x-app-user-id'] as string | undefined;

  try {
    // Method 1: Session token (production)
    if (sessionToken) {
      const result = await authService.validateSession(sessionToken);

      if (!result) {
        res.status(401).json({ status: 'error', message: 'Sesión inválida o expirada' });
        return;
      }

      req.appUser = result.user;
      next();
      return;
    }

    // Method 2: App user ID (development only)
    if (appUserId && config.environment === 'development') {
      const query = BaseModel.queryActive<AppUser>('AppUser');
      query.equalTo('objectId', appUserId);
      const user = await query.first({ useMasterKey: true });

      if (!user) {
        res.status(401).json({ status: 'error', message: 'User not found or inactive' });
        return;
      }

      req.appUser = user;
      next();
      return;
    }

    // No auth header provided
    res.status(401).json({ status: 'error', message: 'Autenticación requerida' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to identify user' });
  }
}
