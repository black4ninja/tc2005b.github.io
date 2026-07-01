import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import {
  listActividadesEvaluacion,
  createActividadEvaluacion,
  updateActividadEvaluacion,
  deleteActividadEvaluacion,
} from '../controllers/actividades-evaluacion.controller.js';

const router = Router();

router.use('/admin/actividades-evaluacion', identifyUser, requireAdmin);

router.get('/admin/actividades-evaluacion', listActividadesEvaluacion);
router.post('/admin/actividades-evaluacion', createActividadEvaluacion);
router.put('/admin/actividades-evaluacion/:id', updateActividadEvaluacion);
router.delete('/admin/actividades-evaluacion/:id', deleteActividadEvaluacion);

export default router;
