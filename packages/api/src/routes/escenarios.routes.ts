import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import { requireGrupoAccess } from '../middlewares/grupo-scope.middleware.js';
import {
  listEscenarios,
  createEscenario,
  updateEscenario,
  deleteEscenario,
} from '../controllers/escenarios.controller.js';
import {
  getEscenariosGrupo,
  getHistorialAlumno,
  crearAsignaciones,
  actualizarAsignacion,
  borrarAsignacion,
} from '../controllers/escenarios-asignacion.controller.js';

/**
 * Módulo "Escenarios". Dos bloques con dos guards distintos:
 *  - el BANCO (`/admin/escenarios`) es global y lo mantiene el admin;
 *  - la ASIGNACIÓN cuelga del grupo y la usa el profesor de ese grupo.
 * El profesor no necesita el primero: el listado del grupo le sirve el banco.
 */
const router = Router();

router.use('/admin/escenarios', identifyUser, requireAdmin);
router.use('/admin/grupos/:grupoId/escenarios', identifyUser, requireGrupoAccess);

// Banco global
router.get('/admin/escenarios', listEscenarios);
router.post('/admin/escenarios', createEscenario);
router.put('/admin/escenarios/:id', updateEscenario);
router.delete('/admin/escenarios/:id', deleteEscenario);

// Asignación por grupo
router.get('/admin/grupos/:grupoId/escenarios', getEscenariosGrupo);
router.get('/admin/grupos/:grupoId/escenarios/alumnos/:alumnoId', getHistorialAlumno);
router.post('/admin/grupos/:grupoId/escenarios/asignaciones', crearAsignaciones);
router.put('/admin/grupos/:grupoId/escenarios/asignaciones/:id', actualizarAsignacion);
router.delete('/admin/grupos/:grupoId/escenarios/asignaciones/:id', borrarAsignacion);

export default router;
