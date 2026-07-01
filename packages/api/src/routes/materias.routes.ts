import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import {
  listMaterias,
  createMateria,
  updateMateria,
  deleteMateria,
} from '../controllers/materias.controller.js';

const router = Router();

router.use('/admin/materias', identifyUser, requireAdmin);

router.get('/admin/materias', listMaterias);
router.post('/admin/materias', createMateria);
router.put('/admin/materias/:id', updateMateria);
router.delete('/admin/materias/:id', deleteMateria);

export default router;
