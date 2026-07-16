import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import { requireStaff } from '../middlewares/grupo-scope.middleware.js';
import {
  listCompetencias,
  createCompetencia,
  updateCompetencia,
  deleteCompetencia,
} from '../controllers/competencias.controller.js';

const router = Router();

router.use('/admin/competencias', identifyUser);

// Catálogo de competencias por materia. La LECTURA la consumen las páginas de
// grupo (Plan de Evaluación, Entrevistas), así que el profesor la necesita; la
// ESCRITURA es gestión global, solo admin.
router.get('/admin/competencias', requireStaff, listCompetencias);
router.post('/admin/competencias', requireAdmin, createCompetencia);
router.put('/admin/competencias/:id', requireAdmin, updateCompetencia);
router.delete('/admin/competencias/:id', requireAdmin, deleteCompetencia);

export default router;
