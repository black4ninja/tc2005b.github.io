import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import {
  listGrupos,
  createGrupo,
  updateGrupo,
  archiveGrupo,
  deleteGrupo,
} from '../controllers/grupos.controller.js';

const router = Router();

router.use('/admin/grupos', identifyUser, requireAdmin);

router.get('/admin/grupos', listGrupos);
router.post('/admin/grupos', createGrupo);
router.put('/admin/grupos/:id', updateGrupo);
router.patch('/admin/grupos/:id/archive', archiveGrupo);
router.delete('/admin/grupos/:id', deleteGrupo);

export default router;
