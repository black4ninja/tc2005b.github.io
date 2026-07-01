import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import {
  listEtiquetas,
  createEtiqueta,
  updateEtiqueta,
  deleteEtiqueta,
} from '../controllers/etiquetas.controller.js';

const router = Router();

// Admin endpoints
router.use('/admin/etiquetas', identifyUser, requireAdmin);

router.get('/admin/etiquetas', listEtiquetas);
router.post('/admin/etiquetas', createEtiqueta);
router.put('/admin/etiquetas/:id', updateEtiqueta);
router.delete('/admin/etiquetas/:id', deleteEtiqueta);

export default router;
