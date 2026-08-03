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
import {
  getMisColeccionesEjercicios,
  listEjerciciosAlumno,
  getEjercicioAlumno,
  ejecutarEjercicio,
  enviarEjercicio,
  getEstadoJob,
  getEstadoEnvio,
  listEnviosAlumno,
} from '../controllers/ejercicios-alumno.controller.js';
import {
  getMisColeccionesDiagramas,
  listDiagramasAlumno,
  getDiagramaAlumno,
  evaluarDiagramaAlumno,
  enviarDiagramaAlumno,
  listEnviosDiagramaAlumno,
} from '../controllers/diagramas-alumno.controller.js';

// Lectura del CMS "Contenidos" (design §2/§4). Solo requiere usuario
// autenticado: la autorización POR COLECCIÓN vive en cada handler
// (slug no permitido o inexistente ⇒ 404 idéntico, sin filtrar existencia).
const router = Router();

router.get('/me/colecciones', identifyUser, getMisColecciones);
router.get('/me/ejercicios/colecciones', identifyUser, getMisColeccionesEjercicios);
router.get('/me/diagramas/colecciones', identifyUser, getMisColeccionesDiagramas);
// Literales antes de :slug/... ("recursos"/"busqueda" son slugs reservados).
router.get('/contenidos/recursos/:id/:nombre', identifyUser, streamRecurso);
router.get('/contenidos/busqueda', identifyUser, buscarContenidos);
// Ejercicios del alumno (mini-juez). "ejercicios" antes de :slug/pagina/* etc.
router.get('/contenidos/:slug/ejercicios', identifyUser, listEjerciciosAlumno);
router.get('/contenidos/:slug/ejercicios/:ejSlug', identifyUser, getEjercicioAlumno);
router.post('/contenidos/:slug/ejercicios/:ejSlug/ejecutar', identifyUser, ejecutarEjercicio);
router.post('/contenidos/:slug/ejercicios/:ejSlug/enviar', identifyUser, enviarEjercicio);
router.get('/contenidos/:slug/ejercicios/:ejSlug/estado/:jobId', identifyUser, getEstadoJob);
router.get('/contenidos/:slug/ejercicios/:ejSlug/envios/:envioId/estado', identifyUser, getEstadoEnvio);
router.get('/contenidos/:slug/ejercicios/:ejSlug/envios', identifyUser, listEnviosAlumno);
// Diagramas del alumno (juez de diseño). Mismo cuidado con el orden: "diagramas"
// tiene que ir antes de :slug/pagina/* o lo capturaría el catch-all del visor.
// Sin cola: el veredicto viaja en la respuesta y no hay estado que sondear.
router.get('/contenidos/:slug/diagramas', identifyUser, listDiagramasAlumno);
router.get('/contenidos/:slug/diagramas/:ejSlug', identifyUser, getDiagramaAlumno);
router.post('/contenidos/:slug/diagramas/:ejSlug/evaluar', identifyUser, evaluarDiagramaAlumno);
router.post('/contenidos/:slug/diagramas/:ejSlug/enviar', identifyUser, enviarDiagramaAlumno);
router.get('/contenidos/:slug/diagramas/:ejSlug/envios', identifyUser, listEnviosDiagramaAlumno);
router.get('/contenidos/:slug/arbol', identifyUser, getArbolColeccion);
router.get('/contenidos/:slug/pagina/*', identifyUser, getPagina);
router.get('/contenidos/:slug/html/*', identifyUser, getHtmlCrudo);

export default router;
