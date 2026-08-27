import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAlumno } from '../middlewares/abac.middleware.js';
import { requireGrupoAccess } from '../middlewares/grupo-scope.middleware.js';
import {
  getAgenda,
  crearDia,
  actualizarDia,
  borrarDia,
  crearCitaProfesor,
  borrarCitaProfesor,
  getAgendaAlumno,
  crearCitaAlumno,
  borrarCitaAlumno,
} from '../controllers/agenda-entrevistas.controller.js';

/**
 * Agenda de entrevistas. Es el único trozo del módulo "Preguntas" que el ALUMNO
 * toca: elige su hora y su competencia. Lo demás —el banco, las asignaciones, la
 * proyección— sigue sin tener camino de lectura para él.
 *
 * `agenda-entrevistas` y no `entrevistas` a secas porque ese prefijo ya es del
 * módulo de entrevistas con entrevistador asignado, que es otra cosa.
 */
const router = Router();

router.use('/admin/grupos/:grupoId/agenda-entrevistas', identifyUser, requireGrupoAccess);
router.get('/admin/grupos/:grupoId/agenda-entrevistas', getAgenda);
router.post('/admin/grupos/:grupoId/agenda-entrevistas/dias', crearDia);
router.put('/admin/grupos/:grupoId/agenda-entrevistas/dias/:diaId', actualizarDia);
router.delete('/admin/grupos/:grupoId/agenda-entrevistas/dias/:diaId', borrarDia);
router.post('/admin/grupos/:grupoId/agenda-entrevistas/citas', crearCitaProfesor);
router.delete('/admin/grupos/:grupoId/agenda-entrevistas/citas/:citaId', borrarCitaProfesor);

router.use('/alumno/grupos/:grupoId/agenda-entrevistas', identifyUser, requireAlumno);
router.get('/alumno/grupos/:grupoId/agenda-entrevistas', getAgendaAlumno);
router.post('/alumno/grupos/:grupoId/agenda-entrevistas/citas', crearCitaAlumno);
router.delete('/alumno/grupos/:grupoId/agenda-entrevistas/citas/:citaId', borrarCitaAlumno);

export default router;
