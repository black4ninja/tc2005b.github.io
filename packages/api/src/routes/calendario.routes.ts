import { Router } from 'express';
import { getCalendarioByGrupo } from '../controllers/calendario.controller.js';

const router = Router();

router.get('/calendario/:grupoName', getCalendarioByGrupo);

export default router;
