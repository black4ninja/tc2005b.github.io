import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import { getAvancesEquipo, calificarAvance } from '../controllers/avances-equipo.controller.js';

const router = Router();

router.use('/admin/grupos/:grupoId/equipos/:equipoId/avances', identifyUser, requireAdmin);

router.get('/admin/grupos/:grupoId/equipos/:equipoId/avances', getAvancesEquipo);
router.put('/admin/grupos/:grupoId/equipos/:equipoId/avances/:actividadAlumnoId', calificarAvance);

export default router;
