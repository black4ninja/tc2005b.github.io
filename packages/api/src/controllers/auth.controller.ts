import type { Request, Response } from 'express';
import { AppUser } from '../models/index.js';
import { BaseModel } from '../models/BaseModel.js';

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

    res.json({ status: 'ok', user: user.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to identify user' });
  }
}

export function getCurrentUser(req: Request, res: Response): void {
  if (!req.appUser) {
    res.status(401).json({ status: 'error', message: 'Not authenticated' });
    return;
  }

  res.json({ status: 'ok', user: req.appUser.toSafeJSON() });
}
