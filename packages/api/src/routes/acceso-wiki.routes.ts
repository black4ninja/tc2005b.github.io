import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import {
  listTodosLosAlumnos,
  getAccesoWikiAlumno,
  setAccesoWikiAlumno,
} from '../controllers/acceso-wiki.controller.js';

const router = Router();

// Solo ADMIN, no staff. Un profesor administra los alumnos de SUS grupos; esto
// es el padrón entero y abre contenido de materias que no imparte.
router.use('/admin/alumnos', identifyUser, requireAdmin);

router.get('/admin/alumnos', listTodosLosAlumnos);
router.get('/admin/alumnos/:alumnoId/acceso-wiki', getAccesoWikiAlumno);
router.put('/admin/alumnos/:alumnoId/acceso-wiki', setAccesoWikiAlumno);

export default router;
