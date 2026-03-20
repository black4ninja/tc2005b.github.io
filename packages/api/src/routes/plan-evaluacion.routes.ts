import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import {
  getPlanEvaluacion,
  createOrUpdatePlanEvaluacion,
} from '../controllers/plan-evaluacion.controller.js';

const router = Router();

router.use('/admin/grupos/:grupoId/plan-evaluacion', identifyUser, requireAdmin);

router.get('/admin/grupos/:grupoId/plan-evaluacion', getPlanEvaluacion);
router.put('/admin/grupos/:grupoId/plan-evaluacion', createOrUpdatePlanEvaluacion);

export default router;
