import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/abac.middleware.js';
import { requireGrupoAccess } from '../middlewares/grupo-scope.middleware.js';
import {
  listPreguntas,
  createPregunta,
  updatePregunta,
  deletePregunta,
} from '../controllers/preguntas.controller.js';
import {
  getPreguntasGrupo,
  getHistorialAlumno,
  crearAsignaciones,
  actualizarAsignacion,
  borrarAsignacion,
} from '../controllers/preguntas-asignacion.controller.js';

/**
 * Módulo "Preguntas". Dos bloques con dos guards distintos:
 *  - el BANCO cuelga de la colección y lo mantiene el admin, como Ejercicios y
 *    Diagramas;
 *  - la ASIGNACIÓN cuelga del grupo y la usa el profesor de ese grupo.
 * El profesor no necesita el primero: el listado del grupo le sirve el banco de
 * las materias que su grupo tiene con el módulo encendido.
 *
 * Ojo con el orden de los `use`: `/admin/preguntas` es admin, pero
 * `/admin/grupos/:grupoId/preguntas` NO cuelga de él (son prefijos distintos),
 * así que el profesor no queda bloqueado por el primero.
 */
const router = Router();

router.use('/admin/preguntas', identifyUser, requireAdmin);
router.use('/admin/colecciones/:id/preguntas', identifyUser, requireAdmin);
router.use('/admin/grupos/:grupoId/preguntas', identifyUser, requireGrupoAccess);

// Banco de una colección
router.get('/admin/colecciones/:id/preguntas', listPreguntas);
router.post('/admin/colecciones/:id/preguntas', createPregunta);
router.put('/admin/preguntas/:id', updatePregunta);
router.delete('/admin/preguntas/:id', deletePregunta);

// Asignación por grupo
router.get('/admin/grupos/:grupoId/preguntas', getPreguntasGrupo);
router.get('/admin/grupos/:grupoId/preguntas/alumnos/:alumnoId', getHistorialAlumno);
router.post('/admin/grupos/:grupoId/preguntas/asignaciones', crearAsignaciones);
router.put('/admin/grupos/:grupoId/preguntas/asignaciones/:id', actualizarAsignacion);
router.delete('/admin/grupos/:grupoId/preguntas/asignaciones/:id', borrarAsignacion);

export default router;
