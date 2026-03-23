import { Router } from 'express';
import { listLecturas } from '../controllers/lecturas.controller.js';

const router = Router();

router.get('/lecturas', listLecturas);

export default router;
