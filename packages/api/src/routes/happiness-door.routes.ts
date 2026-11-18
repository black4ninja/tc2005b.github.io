import { Router } from 'express';
import { identifyUser } from '../middlewares/auth.middleware.js';
import { requireAlumno } from '../middlewares/abac.middleware.js';
import { requireGrupoAccess } from '../middlewares/grupo-scope.middleware.js';
import {
  contextoAlumno,
  contextoStaff,
  misEntradas,
  crearEntrada,
  editarEntrada,
  borrarEntrada,
  tableroDelDia,
  historicoGrupo,
} from '../controllers/happiness-door.controller.js';

const router = Router();

// Alumno: sus propias entradas. El controlador comprueba la inscripción.
const ALUMNO = '/alumno/grupos/:grupoId/happiness';
router.use(ALUMNO, identifyUser, requireAlumno);
router.get(`${ALUMNO}/entradas`, misEntradas(contextoAlumno));
router.post(`${ALUMNO}/entradas`, crearEntrada(contextoAlumno));
router.put(`${ALUMNO}/entradas/:entradaId`, editarEntrada(contextoAlumno));
router.delete(`${ALUMNO}/entradas/:entradaId`, borrarEntrada(contextoAlumno));

// Staff (admin o profesor del grupo): sus propias entradas y el tablero de todos.
const STAFF = '/admin/grupos/:grupoId/happiness';
router.use(STAFF, identifyUser, requireGrupoAccess);
router.get(`${STAFF}/tablero`, tableroDelDia);
router.get(`${STAFF}/historico`, historicoGrupo);
router.get(`${STAFF}/entradas`, misEntradas(contextoStaff));
router.post(`${STAFF}/entradas`, crearEntrada(contextoStaff));
router.put(`${STAFF}/entradas/:entradaId`, editarEntrada(contextoStaff));
router.delete(`${STAFF}/entradas/:entradaId`, borrarEntrada(contextoStaff));

export default router;
