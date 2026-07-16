import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireGrupoAccess } from '../middlewares/grupo-scope.middleware.js';
import {
  listActividadesEvaluacionGrupo,
  createActividadEvaluacionGrupo,
  updateActividadEvaluacionGrupo,
  deleteActividadEvaluacionGrupo,
  copiarPlantilla,
  bulkCongelarActividades,
  getCompletionStats,
  getActividadAlumnosProgreso,
} from '../controllers/actividades-evaluacion-grupo.controller.js';

const router = Router();

router.use('/admin/grupos/:grupoId/actividades-evaluacion', identifyUser, requireGrupoAccess);

// Fixed paths BEFORE parameterized paths
router.post('/admin/grupos/:grupoId/actividades-evaluacion/copiar-plantilla', copiarPlantilla);
router.post('/admin/grupos/:grupoId/actividades-evaluacion/bulk-congelar', bulkCongelarActividades);
router.get('/admin/grupos/:grupoId/actividades-evaluacion/completion-stats', getCompletionStats);

router.get('/admin/grupos/:grupoId/actividades-evaluacion', listActividadesEvaluacionGrupo);
router.post('/admin/grupos/:grupoId/actividades-evaluacion', createActividadEvaluacionGrupo);
router.get('/admin/grupos/:grupoId/actividades-evaluacion/:id/alumnos-progreso', getActividadAlumnosProgreso);
router.put('/admin/grupos/:grupoId/actividades-evaluacion/:id', updateActividadEvaluacionGrupo);
router.delete('/admin/grupos/:grupoId/actividades-evaluacion/:id', deleteActividadEvaluacionGrupo);

export default router;
