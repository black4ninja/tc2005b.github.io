import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import {
  getMisColecciones,
  getArbolColeccion,
  getPagina,
} from '../controllers/contenidos-lectura.controller.js';
import { streamRecurso } from '../controllers/recursos.controller.js';

// Lectura del CMS "Contenidos" (design §2/§4). Solo requiere usuario
// autenticado: la autorización POR COLECCIÓN vive en cada handler
// (slug no permitido o inexistente ⇒ 404 idéntico, sin filtrar existencia).
const router = Router();

router.get('/me/colecciones', identifyUser, getMisColecciones);
// Antes de :slug/... para que "recursos" nunca se interprete como slug.
router.get('/contenidos/recursos/:id/:nombre', identifyUser, streamRecurso);
router.get('/contenidos/:slug/arbol', identifyUser, getArbolColeccion);
router.get('/contenidos/:slug/pagina/*', identifyUser, getPagina);

export default router;
