import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import { getAuditLogs } from '../controllers/audit-log.controller.js';

const router = Router();

router.use('/admin/grupos/:grupoId/alumnos/:alumnoId/audit-log', identifyUser, requireAdmin);
router.get('/admin/grupos/:grupoId/alumnos/:alumnoId/audit-log', getAuditLogs);

export default router;
