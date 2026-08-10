import { Router } from 'express';
import { getCalendarioByGrupo } from '../controllers/calendario.controller.js';
import { streamArchivoActividad } from '../controllers/actividad-archivo.controller.js';
import { identifyUser } from '../middlewares/auth.middleware.js';

const router = Router();

// La ruta con segmento fijo va ANTES: si no, 'actividad' entraría como
// :grupoIdentifier y el calendario respondería «Grupo no encontrado».
// El adjunto sí pide sesión aunque el calendario sea público: el controlador
// comprueba además que la persona pertenezca al grupo.
router.get('/calendario/actividad/:actividadId/archivo', identifyUser, streamArchivoActividad);
router.get('/calendario/:grupoIdentifier', getCalendarioByGrupo);

export default router;
