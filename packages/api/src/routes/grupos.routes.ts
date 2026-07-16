import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import { requireStaff, requireGrupoAccess } from '../middlewares/grupo-scope.middleware.js';
import {
  listGrupos,
  createGrupo,
  updateGrupo,
  archiveGrupo,
  deleteGrupo,
} from '../controllers/grupos.controller.js';

const router = Router();

router.use('/admin/grupos', identifyUser);

// Listar: staff (el controlador filtra a SUS grupos si es profesor).
router.get('/admin/grupos', requireStaff, listGrupos);
// Crear un grupo es global: solo admin.
router.post('/admin/grupos', requireAdmin, createGrupo);
// Mutar un grupo concreto: admin, o profesor asignado a ese grupo.
router.put('/admin/grupos/:id', requireGrupoAccess, updateGrupo);
router.patch('/admin/grupos/:id/archive', requireGrupoAccess, archiveGrupo);
router.delete('/admin/grupos/:id', requireGrupoAccess, deleteGrupo);

export default router;
