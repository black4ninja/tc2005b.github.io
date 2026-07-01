import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import {
  listProfesores,
  listEntrevistas,
  createEntrevista,
  updateEntrevista,
  deleteEntrevista,
  liberarEntrevista,
  getEntrevistaProgress,
} from '../controllers/entrevistas.controller.js';

const router = Router();

router.get('/admin/profesores', identifyUser, requireAdmin, listProfesores);

router.use('/admin/grupos/:grupoId/entrevistas', identifyUser, requireAdmin);

router.get('/admin/grupos/:grupoId/entrevistas', listEntrevistas);
router.get('/admin/grupos/:grupoId/entrevistas/progress', getEntrevistaProgress);
router.post('/admin/grupos/:grupoId/entrevistas', createEntrevista);
router.put('/admin/grupos/:grupoId/entrevistas/:entrevistaId', updateEntrevista);
router.delete('/admin/grupos/:grupoId/entrevistas/:entrevistaId', deleteEntrevista);
router.post('/admin/grupos/:grupoId/entrevistas/:entrevistaId/liberar', liberarEntrevista);

export default router;
