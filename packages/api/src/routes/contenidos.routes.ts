import { Router } from 'express';
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

// Rutas admin del CMS "Contenidos" (design/cms-contenidos.html §7).
// Los endpoints de lectura del visor (US-3) irán en un router aparte.
const router = Router();

router.use('/admin/colecciones', identifyUser, requireAdmin);
router.use('/admin/documentos', identifyUser, requireAdmin);

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

// Borrador provisional (editor rico en US-2)
router.get('/admin/documentos/:docId/borrador', getBorrador);
router.put('/admin/documentos/:docId/borrador', saveBorrador);

export default router;
