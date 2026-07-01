import { Router } from 'express';
import { testGameScore } from '../controllers/test.controller.js';

const router = Router();

router.get('/test/gamescore', testGameScore);

export default router;
