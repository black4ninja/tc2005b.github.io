import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import {
  crearMallasEvaluacion,
  getMallasStatus,
  getMallaAlumno,
  updateActividadAlumno,
  syncMallasEvaluacion,
} from '../controllers/mallas-evaluacion.controller.js';

const router = Router();

router.use('/admin/grupos/:grupoId/mallas-evaluacion', identifyUser, requireAdmin);

// Fixed paths BEFORE parameterized paths
router.get('/admin/grupos/:grupoId/mallas-evaluacion/status', getMallasStatus);
router.post('/admin/grupos/:grupoId/mallas-evaluacion/sync', syncMallasEvaluacion);

router.post('/admin/grupos/:grupoId/mallas-evaluacion', crearMallasEvaluacion);

// Malla del alumno
router.use('/admin/grupos/:grupoId/alumnos/:alumnoId/malla', identifyUser, requireAdmin);
router.get('/admin/grupos/:grupoId/alumnos/:alumnoId/malla', getMallaAlumno);
router.put('/admin/grupos/:grupoId/alumnos/:alumnoId/malla/:actividadId', updateActividadAlumno);

export default router;
