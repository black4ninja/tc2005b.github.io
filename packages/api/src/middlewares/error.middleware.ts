import type { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(`[Error] ${err.message}`);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
  });
}
