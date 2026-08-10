import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import { requireStaff } from '../middlewares/grupo-scope.middleware.js';
import { reorderActividades } from '../controllers/calendario-reorder.controller.js';
import { createActividad } from '../controllers/calendario-create.controller.js';
import { updateActividad, deleteActividad } from '../controllers/calendario-update.controller.js';
import { createSemana, updateSemana, reorderSemanas, deleteSemana } from '../controllers/semana.controller.js';
import { changeAdminPassword, listAdmins, createAdmin, updateAdmin, setGruposDeAdmin } from '../controllers/admin.controller.js';
import { copyCalendario } from '../controllers/calendario-copy.controller.js';
import {
  uploadArchivoActividad,
  deleteArchivoActividad,
} from '../controllers/actividad-archivo.controller.js';
import { PRESENTACION_MAX_BYTES } from '../constants/presentaciones.js';

const router = Router();

// Subida en memoria: el binario va directo a Parse.File (sin disco temporal).
const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PRESENTACION_MAX_BYTES },
});

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

// IMPORTANTE: este router se monta en '/api' ANTES que los demás. Un
// `router.use('/admin', requireAdmin)` aquí interceptaría TODO '/api/admin/*'
// —incluidas las rutas de otros routers (grupos, competencias…)— y rechazaría
// al profesor antes de llegar a sus guards. Por eso los guards van POR RUTA:
// este router solo protege SUS rutas y deja pasar el resto.
const soloAdmin = [identifyUser, requireAdmin];

// Cambiar la PROPIA contraseña es self-service: cualquier staff (admin o profesor).
router.put('/admin/cambiar-password', identifyUser, requireStaff, changeAdminPassword);

router.get('/admin/dashboard', ...soloAdmin, (_req, res) => {
  res.json({ status: 'ok', message: 'Admin dashboard' });
});

router.put('/admin/calendario/reorder', ...soloAdmin, reorderActividades);
router.post('/admin/calendario/actividad', ...soloAdmin, createActividad);
router.put('/admin/calendario/actividad/:actividadId', ...soloAdmin, updateActividad);
router.delete('/admin/calendario/actividad/:actividadId', ...soloAdmin, deleteActividad);
router.post('/admin/calendario/actividad/:actividadId/archivo', ...soloAdmin, subidaArchivo, uploadArchivoActividad);
router.delete('/admin/calendario/actividad/:actividadId/archivo', ...soloAdmin, deleteArchivoActividad);
router.post('/admin/calendario/semana', ...soloAdmin, createSemana);
router.put('/admin/calendario/semana/reorder', ...soloAdmin, reorderSemanas);
// Debe ir DESPUÉS de /semana/reorder: si no, 'reorder' entraría como :semanaId.
router.put('/admin/calendario/semana/:semanaId', ...soloAdmin, updateSemana);
router.delete('/admin/calendario/semana/:semanaId', ...soloAdmin, deleteSemana);
router.post('/admin/calendario/copy', ...soloAdmin, copyCalendario);
router.get('/admin/administradores', ...soloAdmin, listAdmins);
router.post('/admin/administradores', ...soloAdmin, createAdmin);
router.put('/admin/administradores/:id', ...soloAdmin, updateAdmin);
router.put('/admin/administradores/:id/grupos', ...soloAdmin, setGruposDeAdmin);

export default router;
