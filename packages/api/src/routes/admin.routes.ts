import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import { reorderActividades } from '../controllers/calendario-reorder.controller.js';
import { createActividad } from '../controllers/calendario-create.controller.js';
import { updateActividad, deleteActividad } from '../controllers/calendario-update.controller.js';
import { createSemana, reorderSemanas, deleteSemana } from '../controllers/semana.controller.js';
import { changeAdminPassword, listAdmins } from '../controllers/admin.controller.js';
import { copyCalendario } from '../controllers/calendario-copy.controller.js';

const router = Router();

router.use('/admin', identifyUser, requireAdmin);

router.get('/admin/dashboard', (_req, res) => {
  res.json({ status: 'ok', message: 'Admin dashboard' });
});

router.put('/admin/calendario/reorder', reorderActividades);
router.post('/admin/calendario/actividad', createActividad);
router.put('/admin/calendario/actividad/:actividadId', updateActividad);
router.delete('/admin/calendario/actividad/:actividadId', deleteActividad);
router.post('/admin/calendario/semana', createSemana);
router.put('/admin/calendario/semana/reorder', reorderSemanas);
router.delete('/admin/calendario/semana/:semanaId', deleteSemana);
router.post('/admin/calendario/copy', copyCalendario);
router.put('/admin/cambiar-password', changeAdminPassword);
router.get('/admin/administradores', listAdmins);

export default router;
