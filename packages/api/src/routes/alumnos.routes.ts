import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireGrupoAccess } from '../middlewares/grupo-scope.middleware.js';
import {
  listAlumnos,
  createAlumno,
  importAlumnosCSV,
  downloadTemplate,
  updateAlumno,
  archiveAlumno,
  deleteAlumno,
} from '../controllers/alumnos.controller.js';

const router = Router();

router.use('/admin/grupos/:grupoId/alumnos', identifyUser, requireGrupoAccess);

// Fixed paths BEFORE parameterized paths
router.get('/admin/grupos/:grupoId/alumnos/template', downloadTemplate);
router.post('/admin/grupos/:grupoId/alumnos/import', importAlumnosCSV);

router.get('/admin/grupos/:grupoId/alumnos', listAlumnos);
router.post('/admin/grupos/:grupoId/alumnos', createAlumno);
router.put('/admin/grupos/:grupoId/alumnos/:alumnoId', updateAlumno);
router.patch('/admin/grupos/:grupoId/alumnos/:alumnoId/archive', archiveAlumno);
router.delete('/admin/grupos/:grupoId/alumnos/:alumnoId', deleteAlumno);

export default router;
