import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import { getCalificacionesGrupo } from '../controllers/calificaciones.controller.js';

const router = Router();

router.use('/admin/grupos/:grupoId/calificaciones', identifyUser, requireAdmin);

router.get('/admin/grupos/:grupoId/calificaciones', getCalificacionesGrupo);

export default router;
