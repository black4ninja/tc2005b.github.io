import { Router } from 'express';
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

// Subida en memoria: el binario va directo a Parse.File (sin disco temporal).
const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: RECURSO_MAX_BYTES } });

// Rutas admin del CMS "Contenidos" (design/cms-contenidos.html §7).
// Los endpoints de lectura del visor (US-3) irán en un router aparte.
const router = Router();

router.use('/admin/colecciones', identifyUser, requireAdmin);
router.use('/admin/documentos', identifyUser, requireAdmin);
router.use('/admin/recursos', identifyUser, requireAdmin);

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
router.get('/admin/documentos/:docId/versiones', listVersiones);
router.get('/admin/documentos/:docId/versiones/:versionId', getVersion);
router.post('/admin/documentos/:docId/versiones/:versionId/restaurar', restaurarVersion);

// Recursos (US-4): subida multipart (límite 50 MB), listado y borrado
router.post('/admin/recursos', subida.single('archivo'), uploadRecurso);
router.get('/admin/colecciones/:id/recursos', listRecursos);
router.delete('/admin/recursos/:id', deleteRecurso);

export default router;
