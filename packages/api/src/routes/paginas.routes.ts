import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import {
  listPaginas,
  getPagina,
  createPagina,
  updatePagina,
  deletePagina,
  getPaginaPublica,
  listPaginasPublicas,
} from '../controllers/paginas.controller.js';

const router = Router();

// Public endpoints (no auth)
router.get('/paginas', listPaginasPublicas);
router.get('/paginas/:slug', getPaginaPublica);

// Admin endpoints
router.use('/admin/paginas', identifyUser, requireAdmin);

router.get('/admin/paginas', listPaginas);
router.get('/admin/paginas/:id', getPagina);
router.post('/admin/paginas', createPagina);
router.put('/admin/paginas/:id', updatePagina);
router.delete('/admin/paginas/:id', deletePagina);

export default router;
