import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import { requireStaff } from '../middlewares/grupo-scope.middleware.js';
import {
  listCategoriasGrupo,
  createCategoriaGrupo,
  updateCategoriaGrupo,
  deleteCategoriaGrupo,
} from '../controllers/categorias-grupo.controller.js';

const router = Router();

router.use('/admin/categorias-grupo', identifyUser);

// Leer el catálogo lo necesita cualquier staff: el profesor lo usa para pintar
// sus grupos y filtrarlos, aunque no pueda tocarlo.
router.get('/admin/categorias-grupo', requireStaff, listCategoriasGrupo);
// Mantener el catálogo es configuración global, no de un grupo: solo admin.
router.post('/admin/categorias-grupo', requireAdmin, createCategoriaGrupo);
router.put('/admin/categorias-grupo/:id', requireAdmin, updateCategoriaGrupo);
router.delete('/admin/categorias-grupo/:id', requireAdmin, deleteCategoriaGrupo);

export default router;
