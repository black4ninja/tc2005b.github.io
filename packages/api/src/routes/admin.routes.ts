import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import { requireStaff } from '../middlewares/grupo-scope.middleware.js';
import { reorderActividades } from '../controllers/calendario-reorder.controller.js';
import { createActividad } from '../controllers/calendario-create.controller.js';
import { updateActividad, deleteActividad } from '../controllers/calendario-update.controller.js';
import { createSemana, reorderSemanas, deleteSemana } from '../controllers/semana.controller.js';
import { changeAdminPassword, listAdmins, createAdmin, updateAdmin, setGruposDeAdmin } from '../controllers/admin.controller.js';
import { copyCalendario } from '../controllers/calendario-copy.controller.js';

const router = Router();

// IMPORTANTE: este router se monta en '/api' ANTES que los demás. Un
// `router.use('/admin', requireAdmin)` aquí interceptaría TODO '/api/admin/*'
// —incluidas las rutas de otros routers (grupos, competencias…)— y rechazaría
// al profesor antes de llegar a sus guards. Por eso los guards van POR RUTA:
// este router solo protege SUS rutas y deja pasar el resto.
const soloAdmin = [identifyUser, requireAdmin];

// Cambiar la PROPIA contraseña es self-service: cualquier staff (admin o profesor).
router.put('/admin/cambiar-password', identifyUser, requireStaff, changeAdminPassword);

router.get('/admin/dashboard', ...soloAdmin, (_req, res) => {
  res.json({ status: 'ok', message: 'Admin dashboard' });
});

router.put('/admin/calendario/reorder', ...soloAdmin, reorderActividades);
router.post('/admin/calendario/actividad', ...soloAdmin, createActividad);
router.put('/admin/calendario/actividad/:actividadId', ...soloAdmin, updateActividad);
router.delete('/admin/calendario/actividad/:actividadId', ...soloAdmin, deleteActividad);
router.post('/admin/calendario/semana', ...soloAdmin, createSemana);
router.put('/admin/calendario/semana/reorder', ...soloAdmin, reorderSemanas);
router.delete('/admin/calendario/semana/:semanaId', ...soloAdmin, deleteSemana);
router.post('/admin/calendario/copy', ...soloAdmin, copyCalendario);
router.get('/admin/administradores', ...soloAdmin, listAdmins);
router.post('/admin/administradores', ...soloAdmin, createAdmin);
router.put('/admin/administradores/:id', ...soloAdmin, updateAdmin);
router.put('/admin/administradores/:id/grupos', ...soloAdmin, setGruposDeAdmin);

export default router;
