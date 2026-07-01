import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import {
  initEvaluaciones,
  listEvaluaciones,
  updateEvaluacion,
} from '../controllers/evaluaciones-entrevista.controller.js';

const router = Router();

router.use('/admin/grupos/:grupoId/entrevistas/:entrevistaId/evaluaciones', identifyUser, requireAdmin);

router.post('/admin/grupos/:grupoId/entrevistas/:entrevistaId/evaluaciones/init', initEvaluaciones);
router.get('/admin/grupos/:grupoId/entrevistas/:entrevistaId/evaluaciones', listEvaluaciones);
router.put('/admin/grupos/:grupoId/entrevistas/:entrevistaId/evaluaciones/:evaluacionId', updateEvaluacion);

export default router;
