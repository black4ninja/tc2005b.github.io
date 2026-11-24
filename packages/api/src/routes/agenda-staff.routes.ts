import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireStaff } from '../middlewares/grupo-scope.middleware.js';
import { getAgenda, setPreferenciasAgenda } from '../controllers/agenda-staff.controller.js';

/**
 * «Mi agenda» del staff: todos sus grupos a la vez, por eso NO cuelga de
 * `/admin/grupos/:id`. Basta con ser admin o profesor; qué grupos entran lo
 * decide el controlador según el rol.
 */
const router = Router();

router.get('/admin/agenda', identifyUser, requireStaff, getAgenda);
router.put('/me/preferencias/agenda', identifyUser, requireStaff, setPreferenciasAgenda);

export default router;
