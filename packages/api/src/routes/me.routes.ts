import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { getMyMaterias } from '../controllers/me.controller.js';

const router = Router();

router.get('/me/materias', identifyUser, getMyMaterias);

export default router;
