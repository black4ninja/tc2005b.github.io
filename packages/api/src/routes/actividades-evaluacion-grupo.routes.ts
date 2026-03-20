import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import {
  listActividadesEvaluacionGrupo,
  createActividadEvaluacionGrupo,
  updateActividadEvaluacionGrupo,
  deleteActividadEvaluacionGrupo,
  copiarPlantilla,
} from '../controllers/actividades-evaluacion-grupo.controller.js';

const router = Router();

router.use('/admin/grupos/:grupoId/actividades-evaluacion', identifyUser, requireAdmin);

// Fixed paths BEFORE parameterized paths
router.post('/admin/grupos/:grupoId/actividades-evaluacion/copiar-plantilla', copiarPlantilla);

router.get('/admin/grupos/:grupoId/actividades-evaluacion', listActividadesEvaluacionGrupo);
router.post('/admin/grupos/:grupoId/actividades-evaluacion', createActividadEvaluacionGrupo);
router.put('/admin/grupos/:grupoId/actividades-evaluacion/:id', updateActividadEvaluacionGrupo);
router.delete('/admin/grupos/:grupoId/actividades-evaluacion/:id', deleteActividadEvaluacionGrupo);

export default router;
