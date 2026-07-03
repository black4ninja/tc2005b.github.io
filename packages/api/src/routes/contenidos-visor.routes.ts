import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import {
  getMisColecciones,
  getArbolColeccion,
  getPagina,
  getHtmlCrudo,
  buscarContenidos,
} from '../controllers/contenidos-lectura.controller.js';
import { streamRecurso } from '../controllers/recursos.controller.js';

// Lectura del CMS "Contenidos" (design §2/§4). Solo requiere usuario
// autenticado: la autorización POR COLECCIÓN vive en cada handler
// (slug no permitido o inexistente ⇒ 404 idéntico, sin filtrar existencia).
const router = Router();

router.get('/me/colecciones', identifyUser, getMisColecciones);
// Literales antes de :slug/... ("recursos"/"busqueda" son slugs reservados).
router.get('/contenidos/recursos/:id/:nombre', identifyUser, streamRecurso);
router.get('/contenidos/busqueda', identifyUser, buscarContenidos);
router.get('/contenidos/:slug/arbol', identifyUser, getArbolColeccion);
router.get('/contenidos/:slug/pagina/*', identifyUser, getPagina);
router.get('/contenidos/:slug/html/*', identifyUser, getHtmlCrudo);

export default router;
