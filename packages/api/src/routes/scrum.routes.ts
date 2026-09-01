import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAlumno } from '../middlewares/abac.middleware.js';
import { requireGrupoAccess } from '../middlewares/grupo-scope.middleware.js';
import {
  requireDuenoDePartida, requireMiembroDeDinamica, requireMiembroDePartida,
} from '../middlewares/scrum-partida.middleware.js';
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
  crearSprintCtrl,
  actualizarSprint,
  cerrarSprintCtrl,
  finalizarDinamica,
  setReglas,
  getResumen,
} from '../controllers/scrum.controller.js';
import {
  getMiTablero,
  streamMiTablero,
  crearHistoria,
  actualizarHistoria,
  borrarHistoria,
  setObjetivoSprint,
  getProyeccionScrum,
  streamProyeccionScrum,
  setProductOwner,
  crearEpica,
  actualizarEpica,
  setEpicaActual,
  crearTarjetaRetro,
  actualizarTarjetaRetro,
  borrarTarjetaRetro,
  marcarCompromiso,
  getResumenEquipo,
  setBloqueo,
  soltarBloqueos,
} from '../controllers/scrum-tablero.controller.js';
import {
  companerosDeGrupo,
  crearPartida,
  invitar,
  listarMisPartidas,
  listarPartidasDelGrupo,
  sacarInvitado,
} from '../controllers/scrum-partidas.controller.js';

/**
 * Módulo "Actividad de Scrum". Dos caminos con dos guards:
 *  - el del PROFESOR cuelga del grupo (dinámicas, equipos, reparto, etapa) y lo
 *    protege `requireGrupoAccess`, como el resto de lo que hace en su grupo;
 *  - el del ALUMNO cuelga también del grupo pero lo protege `requireAlumno`, y
 *    dentro cada endpoint comprueba además que el recurso sea de SU equipo.
 *
 * El catálogo de etapas va por grupo y no global: cada materia corre su versión
 * del ciclo, y así el profesor lo mantiene sin permisos de administrador.
 *
 * Y hay un TERCER camino que no tiene controladores propios: las PARTIDAS DE
 * PRÁCTICA. Una partida es una dinámica con dueño, así que el tablero del
 * alumno se monta dos veces —sobre la dinámica de clase y sobre la partida— y
 * los mandos del ciclo son literalmente los del profesor detrás de otro guard.
 * Ver el final del archivo.
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

// Iteraciones. El ritual del ciclo —archivar, contar el bloqueo y cobrarlo—
// ocurre al cerrar un sprint y al salir del planning del siguiente.
router.post('/admin/grupos/:grupoId/scrum/dinamicas/:dinamicaId/sprints', crearSprintCtrl);
router.put('/admin/grupos/:grupoId/scrum/dinamicas/:dinamicaId/sprints/:sprintId', actualizarSprint);
router.post(
  '/admin/grupos/:grupoId/scrum/dinamicas/:dinamicaId/sprints/:sprintId/cerrar',
  cerrarSprintCtrl,
);
router.post('/admin/grupos/:grupoId/scrum/dinamicas/:dinamicaId/finalizar', finalizarDinamica);
router.put('/admin/grupos/:grupoId/scrum/dinamicas/:dinamicaId/reglas', setReglas);
router.get('/admin/grupos/:grupoId/scrum/dinamicas/:dinamicaId/resumen', getResumen);

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

// Las partidas de práctica de sus alumnos: solo lectura, sin tablero ni
// proyección. El profesor ve QUE se practica y quién, no lo que se escribe.
router.get('/admin/grupos/:grupoId/scrum/partidas', listarPartidasDelGrupo);

// Catálogo de etapas del grupo
router.post('/admin/grupos/:grupoId/scrum/etapas', crearEtapa);
router.put('/admin/grupos/:grupoId/scrum/etapas/:etapaId', actualizarEtapa);
router.delete('/admin/grupos/:grupoId/scrum/etapas/:etapaId', borrarEtapa);

// ── Alumno ────────────────────────────────────────────────────────────────

/**
 * El tablero del alumno, en un router aparte para poder montarlo DOS veces:
 * sobre la dinámica que conduce el profesor y sobre una partida de práctica.
 *
 * Son la misma pantalla y las mismas reglas; lo único que cambia es de qué
 * dinámica se trata, y eso lo resuelve `contextoAlumno` mirando si la ruta trae
 * `:dinamicaId`. `mergeParams` es lo que hace que lo vea.
 */
const tablero = Router({ mergeParams: true });

tablero.get('/', getMiTablero);
tablero.get('/stream', streamMiTablero);
tablero.post('/historias', crearHistoria);
tablero.put('/historias/:historiaId', actualizarHistoria);
tablero.delete('/historias/:historiaId', borrarHistoria);
tablero.put('/objetivo', setObjetivoSprint);
tablero.get('/resumen', getResumenEquipo);

// El equipo se organiza solo: su PO y su épica en curso.
tablero.put('/po', setProductOwner);
tablero.put('/epica-actual', setEpicaActual);
tablero.post('/epicas', crearEpica);
tablero.put('/epicas/:epicaId', actualizarEpica);

// Retrospectiva: tarjetas del sprint en curso y compromisos que se arrastran.
tablero.post('/retro', crearTarjetaRetro);
tablero.put('/retro/:tarjetaId', actualizarTarjetaRetro);
tablero.delete('/retro/:tarjetaId', borrarTarjetaRetro);
tablero.put('/compromisos/:tarjetaId', marcarCompromiso);

// Semáforo: quién está editando qué, para que dos no se pisen el trabajo.
tablero.put('/bloqueos', setBloqueo);
tablero.delete('/bloqueos', soltarBloqueos);

router.use('/alumno/grupos/:grupoId/scrum', identifyUser, requireAlumno);

// La pantalla de entrada: dónde ha estado y dónde puede seguir.
router.get('/alumno/grupos/:grupoId/scrum/partidas', listarMisPartidas);
router.post('/alumno/grupos/:grupoId/scrum/partidas', crearPartida);
router.get('/alumno/grupos/:grupoId/scrum/companeros', companerosDeGrupo);

// El tablero de la clase: la dinámica VIGENTE, sin tener que saber su id.
router.use('/alumno/grupos/:grupoId/scrum/tablero', tablero);

/*
 * Una dinámica de clase CONCRETA, para volver a las que ya se jugaron.
 *
 * El mismo tablero y nada más: los mandos del ciclo son del profesor y aquí no
 * se montan. Lo que se puede tocar lo sigue decidiendo la dinámica —cerrada se
 * mira, finalizada enseña el resumen del equipo—, así que no hace falta ninguna
 * regla nueva para que esto sea de consulta.
 */
router.use(
  '/alumno/grupos/:grupoId/scrum/dinamicas/:dinamicaId',
  requireMiembroDeDinamica,
  tablero,
);

/*
 * La partida de práctica: el mismo tablero, y encima los mandos del ciclo.
 *
 * Los handlers son los del PROFESOR sin tocar una línea —leen `:grupoId` y
 * `:dinamicaId` y nada más—; lo que cambia es el candado. El guard exige que la
 * dinámica sea de práctica antes que nada: sin eso, poner el id de la dinámica
 * de clase en la URL dejaría a un alumno cambiándole la etapa a todo el grupo.
 */
const PARTIDA = '/alumno/grupos/:grupoId/scrum/partidas/:dinamicaId';

// El candado, UNA vez para todo lo que cuelga. Repetirlo en cada línea costaba
// dos lecturas más contra una base remota por cada tarjeta arrastrada.
router.use(PARTIDA, requireMiembroDePartida);

router.use(PARTIDA, tablero);

router.put(`${PARTIDA}/etapa`, setEtapaActual);
router.post(`${PARTIDA}/sprints`, crearSprintCtrl);
router.put(`${PARTIDA}/sprints/:sprintId`, actualizarSprint);
router.post(`${PARTIDA}/sprints/:sprintId/cerrar`, cerrarSprintCtrl);
router.post(`${PARTIDA}/finalizar`, finalizarDinamica);
router.post(`${PARTIDA}/invitados`, invitar);
router.delete(`${PARTIDA}/invitados/:alumnoId`, sacarInvitado);

// Renombrarla y borrarla son gestos sobre la partida entera: solo su dueño. El
// guard de arriba ya dejó resuelto quién es, así que este no vuelve a leer.
router.put(PARTIDA, requireDuenoDePartida, actualizarDinamica);
router.delete(PARTIDA, requireDuenoDePartida, borrarDinamica);

export default router;
