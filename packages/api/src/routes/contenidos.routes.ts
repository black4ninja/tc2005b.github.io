import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import {
  listColecciones,
  createColeccion,
  updateColeccion,
  deleteColeccion,
} from '../controllers/colecciones.controller.js';
import {
  listDocumentosColeccion,
  createDocumento,
  updateDocumento,
  moveDocumento,
  deleteDocumento,
  getBorrador,
  saveBorrador,
} from '../controllers/cms-documentos.controller.js';
import {
  publicarDocumento,
  setPublicacionDocumento,
  listVersiones,
  getVersion,
  restaurarVersion,
} from '../controllers/cms-versiones.controller.js';
import {
  uploadRecurso,
  listRecursos,
  deleteRecurso,
  RECURSO_MAX_BYTES,
} from '../controllers/recursos.controller.js';
import {
  listEjercicios,
  createEjercicio,
  getEjercicio,
  updateEjercicio,
  setPublicacionEjercicio,
  deleteEjercicio,
} from '../controllers/ejercicios-programacion.controller.js';
import {
  listCategoriasEjercicio,
  createCategoriaEjercicio,
  updateCategoriaEjercicio,
  deleteCategoriaEjercicio,
} from '../controllers/ejercicios-categorias.controller.js';
import {
  listBloquesEjercicio,
  createBloqueEjercicio,
  updateBloqueEjercicio,
  deleteBloqueEjercicio,
} from '../controllers/ejercicios-bloques.controller.js';
import {
  listEjerciciosDiagrama,
  createEjercicioDiagrama,
  getEjercicioDiagrama,
  updateEjercicioDiagrama,
  setPublicacionEjercicioDiagrama,
  deleteEjercicioDiagrama,
  verificarEjercicio,
  getCatalogoAserciones,
} from '../controllers/ejercicios-diagrama.controller.js';

// Subida en memoria: el binario va directo a Parse.File (sin disco temporal).
const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: RECURSO_MAX_BYTES } });

/** Envuelve a multer para responder sus errores como 4xx en español. */
function subidaArchivo(req: Request, res: Response, next: NextFunction): void {
  subida.single('archivo')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ status: 'error', message: 'El archivo excede el límite de 50 MB' });
        return;
      }
      res.status(400).json({ status: 'error', message: 'Archivo inválido en la subida' });
      return;
    }
    next(err);
  });
}

// Rutas admin del CMS "Contenidos" (design/cms-contenidos.html §7).
// Los endpoints de lectura del visor (US-3) irán en un router aparte.
const router = Router();

router.use('/admin/colecciones', identifyUser, requireAdmin);
router.use('/admin/documentos', identifyUser, requireAdmin);
router.use('/admin/recursos', identifyUser, requireAdmin);
router.use('/admin/ejercicios', identifyUser, requireAdmin);
router.use('/admin/categorias-ejercicios', identifyUser, requireAdmin);
router.use('/admin/ejercicios-diagrama', identifyUser, requireAdmin);
router.use('/admin/catalogo-aserciones', identifyUser, requireAdmin);

// Colecciones
router.get('/admin/colecciones', listColecciones);
router.post('/admin/colecciones', createColeccion);
router.put('/admin/colecciones/:id', updateColeccion);
router.delete('/admin/colecciones/:id', deleteColeccion);

// Documentos (árbol de una colección)
router.get('/admin/colecciones/:id/documentos', listDocumentosColeccion);
router.post('/admin/colecciones/:id/documentos', createDocumento);
router.put('/admin/documentos/:docId', updateDocumento);
router.put('/admin/documentos/:docId/mover', moveDocumento);
router.delete('/admin/documentos/:docId', deleteDocumento);

// Borrador (autosave del editor)
router.get('/admin/documentos/:docId/borrador', getBorrador);
router.put('/admin/documentos/:docId/borrador', saveBorrador);

// Publicar + historial de versiones (US-2)
router.post('/admin/documentos/:docId/publicar', publicarDocumento);
// Visibilidad (publicar/ocultar sin tocar versiones): liberar contenido por etapas.
router.put('/admin/documentos/:docId/publicacion', setPublicacionDocumento);
router.get('/admin/documentos/:docId/versiones', listVersiones);
router.get('/admin/documentos/:docId/versiones/:versionId', getVersion);
router.post('/admin/documentos/:docId/versiones/:versionId/restaurar', restaurarVersion);

// Recursos (US-4): subida multipart (límite 50 MB), listado y borrado
router.post('/admin/recursos', subidaArchivo, uploadRecurso);
router.get('/admin/colecciones/:id/recursos', listRecursos);
router.delete('/admin/recursos/:id', deleteRecurso);

// Ejercicios (módulo "Ejercicios" — mini-juez Kotlin/Swift)
router.get('/admin/colecciones/:id/ejercicios', listEjercicios);
router.post('/admin/colecciones/:id/ejercicios', createEjercicio);
router.get('/admin/ejercicios/:id', getEjercicio);
router.put('/admin/ejercicios/:id', updateEjercicio);
router.put('/admin/ejercicios/:id/publicacion', setPublicacionEjercicio);
router.delete('/admin/ejercicios/:id', deleteEjercicio);

// Diagramas (módulo "Diagramas" — juez de diseño UML). Comparte las categorías y
// los bloques de más abajo: agrupan la colección, no el juez.
router.get('/admin/catalogo-aserciones', getCatalogoAserciones);
router.get('/admin/colecciones/:id/ejercicios-diagrama', listEjerciciosDiagrama);
router.post('/admin/colecciones/:id/ejercicios-diagrama', createEjercicioDiagrama);
router.get('/admin/ejercicios-diagrama/:id', getEjercicioDiagrama);
router.put('/admin/ejercicios-diagrama/:id', updateEjercicioDiagrama);
router.post('/admin/ejercicios-diagrama/:id/verificar', verificarEjercicio);
router.put('/admin/ejercicios-diagrama/:id/publicacion', setPublicacionEjercicioDiagrama);
router.delete('/admin/ejercicios-diagrama/:id', deleteEjercicioDiagrama);

// Categorías de ejercicios
router.get('/admin/colecciones/:id/categorias-ejercicios', listCategoriasEjercicio);
router.post('/admin/colecciones/:id/categorias-ejercicios', createCategoriaEjercicio);
router.put('/admin/categorias-ejercicios/:id', updateCategoriaEjercicio);
router.delete('/admin/categorias-ejercicios/:id', deleteCategoriaEjercicio);

// Bloques de ejercicios (el nivel por encima de la categoría)
router.get('/admin/colecciones/:id/bloques-ejercicios', listBloquesEjercicio);
router.post('/admin/colecciones/:id/bloques-ejercicios', createBloqueEjercicio);
router.put('/admin/bloques-ejercicios/:id', updateBloqueEjercicio);
router.delete('/admin/bloques-ejercicios/:id', deleteBloqueEjercicio);

export default router;
