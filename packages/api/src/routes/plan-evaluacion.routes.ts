import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireGrupoAccess } from '../middlewares/grupo-scope.middleware.js';
import {
  getPlanEvaluacion,
  createOrUpdatePlanEvaluacion,
  copiarPlanEvaluacion,
} from '../controllers/plan-evaluacion.controller.js';

const router = Router();

router.use('/admin/grupos/:grupoId/plan-evaluacion', identifyUser, requireGrupoAccess);

router.get('/admin/grupos/:grupoId/plan-evaluacion', getPlanEvaluacion);
router.put('/admin/grupos/:grupoId/plan-evaluacion', createOrUpdatePlanEvaluacion);
// Replicar el plan de otro grupo. El acceso al grupo ORIGEN se comprueba dentro:
// el middleware solo mira el de la ruta.
router.post('/admin/grupos/:grupoId/plan-evaluacion/copiar', copiarPlanEvaluacion);

export default router;
