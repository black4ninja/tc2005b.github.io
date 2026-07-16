import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireGrupoAccess } from '../middlewares/grupo-scope.middleware.js';
import { getAvancesEquipo, calificarAvance } from '../controllers/avances-equipo.controller.js';

const router = Router();

router.use('/admin/grupos/:grupoId/equipos/:equipoId/avances', identifyUser, requireGrupoAccess);

router.get('/admin/grupos/:grupoId/equipos/:equipoId/avances', getAvancesEquipo);
router.put('/admin/grupos/:grupoId/equipos/:equipoId/avances/:actividadAlumnoId', calificarAvance);

export default router;
