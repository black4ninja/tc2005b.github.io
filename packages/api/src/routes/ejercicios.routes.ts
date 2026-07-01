import { Router } from 'express';
import { listEjercicios } from '../controllers/ejercicios.controller.js';

const router = Router();

router.get('/ejercicios', listEjercicios);

export default router;
