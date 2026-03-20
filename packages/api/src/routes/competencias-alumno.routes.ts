import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import {
  crearCompetenciasAlumno,
  getCompetenciasStatus,
  getCompetenciasAlumno,
  updateCompetenciaAlumno,
} from '../controllers/competencias-alumno.controller.js';

const router = Router();

router.use('/admin/grupos/:grupoId/competencias-alumno', identifyUser, requireAdmin);

// Fixed paths BEFORE parameterized paths
router.get('/admin/grupos/:grupoId/competencias-alumno/status', getCompetenciasStatus);
router.post('/admin/grupos/:grupoId/competencias-alumno', crearCompetenciasAlumno);

// Competencias del alumno
router.use('/admin/grupos/:grupoId/alumnos/:alumnoId/competencias', identifyUser, requireAdmin);
router.get('/admin/grupos/:grupoId/alumnos/:alumnoId/competencias', getCompetenciasAlumno);
router.put('/admin/grupos/:grupoId/alumnos/:alumnoId/competencias/:compAlumnoId', updateCompetenciaAlumno);

export default router;
