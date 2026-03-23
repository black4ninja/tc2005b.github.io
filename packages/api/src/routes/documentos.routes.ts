import { Router } from 'express';
import { listDocumentos } from '../controllers/documentos.controller.js';

const router = Router();

// Public endpoint — files are already publicly served via express.static
router.get('/documentos', listDocumentos);

export default router;
