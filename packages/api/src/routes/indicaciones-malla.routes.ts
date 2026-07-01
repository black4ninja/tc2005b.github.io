import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import {
  listIndicaciones,
  createIndicacion,
  updateIndicacion,
  deleteIndicacion,
} from '../controllers/indicaciones-malla.controller.js';

const router = Router();

router.use('/admin/indicaciones-malla', identifyUser, requireAdmin);

router.get('/admin/indicaciones-malla', listIndicaciones);
router.post('/admin/indicaciones-malla', createIndicacion);
router.put('/admin/indicaciones-malla/:id', updateIndicacion);
router.delete('/admin/indicaciones-malla/:id', deleteIndicacion);

export default router;
