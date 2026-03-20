import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import {
  listCompetencias,
  createCompetencia,
  updateCompetencia,
  deleteCompetencia,
} from '../controllers/competencias.controller.js';

const router = Router();

router.use('/admin/competencias', identifyUser, requireAdmin);

router.get('/admin/competencias', listCompetencias);
router.post('/admin/competencias', createCompetencia);
router.put('/admin/competencias/:id', updateCompetencia);
router.delete('/admin/competencias/:id', deleteCompetencia);

export default router;
