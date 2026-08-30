import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAlumno } from '../middlewares/abac.middleware.js';
import { requireGrupoAccess } from '../middlewares/grupo-scope.middleware.js';
import {
  getScrumGrupo,
  crearDinamica,
  actualizarDinamica,
  borrarDinamica,
  getDinamica,
  setEtapaActual,
  crearEquipo,
  actualizarEquipo,
  borrarEquipo,
  asignarMiembros,
  quitarMiembro,
  repartirAlumnos,
  crearEtapa,
  actualizarEtapa,
  borrarEtapa,
} from '../controllers/scrum.controller.js';
import {
  getMiTablero,
  streamMiTablero,
  crearHistoria,
  actualizarHistoria,
  borrarHistoria,
  setObjetivoEquipo,
  getProyeccionScrum,
  streamProyeccionScrum,
} from '../controllers/scrum-tablero.controller.js';

/**
 * Módulo "Actividad de Scrum". Dos caminos con dos guards:
 *  - el del PROFESOR cuelga del grupo (dinámicas, equipos, reparto, etapa) y lo
 *    protege `requireGrupoAccess`, como el resto de lo que hace en su grupo;
 *  - el del ALUMNO cuelga también del grupo pero lo protege `requireAlumno`, y
 *    dentro cada endpoint comprueba además que el recurso sea de SU equipo.
 *
 * El catálogo de etapas va por grupo y no global: cada materia corre su versión
 * del ciclo, y así el profesor lo mantiene sin permisos de administrador.
 */
const router = Router();

router.use('/admin/grupos/:grupoId/scrum', identifyUser, requireGrupoAccess);

router.get('/admin/grupos/:grupoId/scrum', getScrumGrupo);

// Dinámicas
router.post('/admin/grupos/:grupoId/scrum/dinamicas', crearDinamica);
router.get('/admin/grupos/:grupoId/scrum/dinamicas/:dinamicaId', getDinamica);
router.put('/admin/grupos/:grupoId/scrum/dinamicas/:dinamicaId', actualizarDinamica);
router.delete('/admin/grupos/:grupoId/scrum/dinamicas/:dinamicaId', borrarDinamica);
router.put('/admin/grupos/:grupoId/scrum/dinamicas/:dinamicaId/etapa', setEtapaActual);
router.post('/admin/grupos/:grupoId/scrum/dinamicas/:dinamicaId/repartir', repartirAlumnos);

// Equipos y su gente
router.post('/admin/grupos/:grupoId/scrum/dinamicas/:dinamicaId/equipos', crearEquipo);
router.put('/admin/grupos/:grupoId/scrum/dinamicas/:dinamicaId/equipos/:equipoId', actualizarEquipo);
router.delete('/admin/grupos/:grupoId/scrum/dinamicas/:dinamicaId/equipos/:equipoId', borrarEquipo);
router.post(
  '/admin/grupos/:grupoId/scrum/dinamicas/:dinamicaId/equipos/:equipoId/miembros',
  asignarMiembros,
);
router.delete(
  '/admin/grupos/:grupoId/scrum/dinamicas/:dinamicaId/equipos/:equipoId/miembros/:alumnoId',
  quitarMiembro,
);

// Proyección: la pantalla del cañón. Qué equipos se ven va en SU url, no aquí.
router.get('/admin/grupos/:grupoId/scrum/dinamicas/:dinamicaId/proyeccion', getProyeccionScrum);
router.get(
  '/admin/grupos/:grupoId/scrum/dinamicas/:dinamicaId/proyeccion/stream',
  streamProyeccionScrum,
);

// Catálogo de etapas del grupo
router.post('/admin/grupos/:grupoId/scrum/etapas', crearEtapa);
router.put('/admin/grupos/:grupoId/scrum/etapas/:etapaId', actualizarEtapa);
router.delete('/admin/grupos/:grupoId/scrum/etapas/:etapaId', borrarEtapa);

// ── Alumno ────────────────────────────────────────────────────────────────
router.use('/alumno/grupos/:grupoId/scrum', identifyUser, requireAlumno);
router.get('/alumno/grupos/:grupoId/scrum', getMiTablero);
router.get('/alumno/grupos/:grupoId/scrum/stream', streamMiTablero);
router.post('/alumno/grupos/:grupoId/scrum/historias', crearHistoria);
router.put('/alumno/grupos/:grupoId/scrum/historias/:historiaId', actualizarHistoria);
router.delete('/alumno/grupos/:grupoId/scrum/historias/:historiaId', borrarHistoria);
router.put('/alumno/grupos/:grupoId/scrum/objetivo', setObjetivoEquipo);

export default router;
