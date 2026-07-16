import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireGrupoAccess } from '../middlewares/grupo-scope.middleware.js';
import {
  listEquipos,
  createEquipo,
  updateEquipo,
  deleteEquipo,
} from '../controllers/equipos.controller.js';

const router = Router();

router.use('/admin/grupos/:grupoId/equipos', identifyUser, requireGrupoAccess);

router.get('/admin/grupos/:grupoId/equipos', listEquipos);
router.post('/admin/grupos/:grupoId/equipos', createEquipo);
router.put('/admin/grupos/:grupoId/equipos/:equipoId', updateEquipo);
router.delete('/admin/grupos/:grupoId/equipos/:equipoId', deleteEquipo);

export default router;
