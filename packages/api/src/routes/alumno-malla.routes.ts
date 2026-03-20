import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAlumno } from '../middlewares/abac.middleware.js';
import {
  getMyMalla,
  getMyPlanEvaluacion,
  updateMyActividad,
  getMyCompetencias,
  updateMyCompetenciaEvidencias,
  getIndicacionesMalla,
  getMyPerfil,
  updateMyPerfil,
  changeMyPassword,
} from '../controllers/alumno-malla.controller.js';

const router = Router();

router.use('/alumno/grupos/:grupoId', identifyUser, requireAlumno);

// Malla
router.get('/alumno/grupos/:grupoId/malla', getMyMalla);
router.put('/alumno/grupos/:grupoId/malla/:actividadId', updateMyActividad);

// Plan de evaluación (read-only)
router.get('/alumno/grupos/:grupoId/plan-evaluacion', getMyPlanEvaluacion);

// Competencias
router.get('/alumno/grupos/:grupoId/competencias', getMyCompetencias);
router.put('/alumno/grupos/:grupoId/competencias/:compAlumnoId', updateMyCompetenciaEvidencias);

// Perfil del alumno
router.get('/alumno/grupos/:grupoId/perfil', getMyPerfil);
router.put('/alumno/grupos/:grupoId/perfil', updateMyPerfil);
router.put('/alumno/grupos/:grupoId/cambiar-password', changeMyPassword);

// Indicaciones de malla (read-only)
router.get('/alumno/grupos/:grupoId/indicaciones-malla', getIndicacionesMalla);

export default router;
