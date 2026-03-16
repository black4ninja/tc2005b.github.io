import type { Request, Response } from 'express';
import { config } from '../config/index.js';

export function getHealth(_req: Request, res: Response): void {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.environment,
    version: config.version,
  });
}
