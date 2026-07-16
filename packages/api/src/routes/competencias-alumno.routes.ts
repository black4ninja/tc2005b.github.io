import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireGrupoAccess } from '../middlewares/grupo-scope.middleware.js';
import {
  crearCompetenciasAlumno,
  getCompetenciasStatus,
  getCompetenciasAlumno,
  updateCompetenciaAlumno,
  propagarCompetencias,
} from '../controllers/competencias-alumno.controller.js';

const router = Router();

router.use('/admin/grupos/:grupoId/competencias-alumno', identifyUser, requireGrupoAccess);

// Fixed paths BEFORE parameterized paths
router.get('/admin/grupos/:grupoId/competencias-alumno/status', getCompetenciasStatus);
router.post('/admin/grupos/:grupoId/competencias-alumno/propagar', propagarCompetencias);
router.post('/admin/grupos/:grupoId/competencias-alumno', crearCompetenciasAlumno);

// Competencias del alumno
router.use('/admin/grupos/:grupoId/alumnos/:alumnoId/competencias', identifyUser, requireGrupoAccess);
router.get('/admin/grupos/:grupoId/alumnos/:alumnoId/competencias', getCompetenciasAlumno);
router.put('/admin/grupos/:grupoId/alumnos/:alumnoId/competencias/:compAlumnoId', updateCompetenciaAlumno);

export default router;
