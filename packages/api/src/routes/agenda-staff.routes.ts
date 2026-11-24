import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireStaff } from '../middlewares/grupo-scope.middleware.js';
import { getAgenda, setPreferenciasAgenda } from '../controllers/agenda-staff.controller.js';
import { borrarEnlaceIcs, crearEnlaceIcs, getEnlaceIcs, getFeedIcs, getFeedIcsGrupo } from '../controllers/agenda-ics.controller.js';

/**
 * «Mi agenda» del staff: todos sus grupos a la vez, por eso NO cuelga de
 * `/admin/grupos/:id`. Basta con ser admin o profesor; qué grupos entran lo
 * decide el controlador según el rol.
 */
const router = Router();

router.get('/admin/agenda', identifyUser, requireStaff, getAgenda);
router.put('/me/preferencias/agenda', identifyUser, requireStaff, setPreferenciasAgenda);

// Suscripción desde Google Calendar / Outlook: la persona gestiona su enlace
// con sesión; el feed en sí es público y su token es la llave.
router.get('/me/agenda/ics', identifyUser, requireStaff, getEnlaceIcs);
router.post('/me/agenda/ics', identifyUser, requireStaff, crearEnlaceIcs);
router.delete('/me/agenda/ics', identifyUser, requireStaff, borrarEnlaceIcs);
router.get('/agenda/ics/:archivo', getFeedIcs);
router.get('/agenda/ics/:token/:archivo', getFeedIcsGrupo);

export default router;
