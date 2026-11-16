import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import { requireStaff } from '../middlewares/grupo-scope.middleware.js';
import {
  requireCalendarioDeGrupo,
  type ResolverGrupos,
  grupoDelBody,
  grupoDestinoDelBody,
  grupoDeSemanaParam,
  grupoDeSemanaBody,
  grupoDeActividadParam,
  gruposDeReorderActividades,
  gruposDeReorderSemanas,
} from '../middlewares/calendario-scope.middleware.js';
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

// El calendario lo edita también el profesor, pero solo el de SUS grupos: cada
// ruta dice cómo se llega de su petición al grupo (ver calendario-scope).
const calendario = (resolver: ResolverGrupos) => [identifyUser, requireCalendarioDeGrupo(resolver)];

router.put('/admin/calendario/reorder', ...calendario(gruposDeReorderActividades), reorderActividades);
router.post('/admin/calendario/actividad', ...calendario(grupoDeSemanaBody), createActividad);
router.put('/admin/calendario/actividad/:actividadId', ...calendario(grupoDeActividadParam), updateActividad);
router.delete('/admin/calendario/actividad/:actividadId', ...calendario(grupoDeActividadParam), deleteActividad);
router.post('/admin/calendario/actividad/:actividadId/archivo', ...calendario(grupoDeActividadParam), subidaArchivo, uploadArchivoActividad);
router.delete('/admin/calendario/actividad/:actividadId/archivo', ...calendario(grupoDeActividadParam), deleteArchivoActividad);
router.post('/admin/calendario/semana', ...calendario(grupoDelBody), createSemana);
router.put('/admin/calendario/semana/reorder', ...calendario(gruposDeReorderSemanas), reorderSemanas);
// Debe ir DESPUÉS de /semana/reorder: si no, 'reorder' entraría como :semanaId.
router.put('/admin/calendario/semana/:semanaId', ...calendario(grupoDeSemanaParam), updateSemana);
router.delete('/admin/calendario/semana/:semanaId', ...calendario(grupoDeSemanaParam), deleteSemana);
router.post('/admin/calendario/copy', ...calendario(grupoDestinoDelBody), copyCalendario);
router.get('/admin/administradores', ...soloAdmin, listAdmins);
router.post('/admin/administradores', ...soloAdmin, createAdmin);
router.put('/admin/administradores/:id', ...soloAdmin, updateAdmin);
router.put('/admin/administradores/:id/grupos', ...soloAdmin, setGruposDeAdmin);

export default router;
