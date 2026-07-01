import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { AuditLog } from '../models/AuditLog.js';

export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  const { grupoId, alumnoId } = req.params;
  const { entidadId } = req.query;

  try {
    const query = new Parse.Query<AuditLog>('AuditLog');
    query.equalTo('grupoId', grupoId);
    query.equalTo('alumnoId', alumnoId);
    if (entidadId && typeof entidadId === 'string') {
      query.equalTo('entidadId', entidadId);
    }
    query.descending('createdAt');
    query.limit(100);
    const logs = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      logs: logs.map((l) => l.toSafeJSON()),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener logs' });
  }
}
