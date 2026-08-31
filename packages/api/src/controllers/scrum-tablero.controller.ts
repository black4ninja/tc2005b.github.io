import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { AppUser } from '../models/AppUser.js';
import { EquipoScrum } from '../models/EquipoScrum.js';
import { HistoriaUsuario } from '../models/HistoriaUsuario.js';
import { getVinculoConGrupoActivo } from '../services/grupo-alumno.service.js';
import { moduloActivoEnGrupo } from '../services/grupo-colecciones.service.js';
import {
  asegurarSprint,
  cargarDinamica,
  construirEstadoDinamica,
  difundirTablero,
  dinamicaVigente,
  equipoDelAlumno,
  historiasDeEquipos,
  siguienteOrdenEnColumna,
  type EstadoDinamica,
} from '../services/scrum.service.js';
import { suscribirTablero } from '../services/scrum-bus.js';
import { SprintScrum } from '../models/SprintScrum.js';
import {
  esColumna, esColumnaRetro, esPrioridad, esPuntos, estaEstimada, permiteMover,
  COLUMNAS_DEL_SPRINT, ESTADOS_COMPROMISO, LARGO_CAMPO, LARGO_OBJETIVO,
  LARGO_TARJETA_RETRO, POLITICA_POR_DEFECTO, PRIORIDAD_POR_DEFECTO, PUNTOS_VALIDOS,
  COLORES_EPICA, LARGO_NOMBRE,
  type Columna, type ColumnaRetro, type EstadoCompromiso, type PoliticaEtapa,
} from '../constants/scrum.js';
import { EpicaScrum } from '../models/EpicaScrum.js';
import { TarjetaRetro } from '../models/TarjetaRetro.js';
import { normalizarColor } from '../models/CategoriaGrupo.js';
import {
  compromisosAbiertos, epicasDeEquipos, historicoDeEquipo,
} from '../services/scrum.service.js';

/**
 * El tablero: lo que el alumno escribe y lo que se proyecta.
 *
 * Las dos pantallas leen el MISMO estado —la dinámica con su etapa y los equipos
 * con sus historias— y cada una se queda con su parte. Es a propósito: cuando el
 * profesor proyecta el tablero de un equipo, lo que se ve tiene que ser
 * exactamente lo que ese equipo tiene delante, hasta el orden de las tarjetas.
 *
 * Las historias nacen SIEMPRE en `backlog`. Es la regla de Scrum que el módulo
 * enseña de la única manera que se aprende: no dejando hacerlo de otra forma.
 * Meter trabajo directamente en `doing` es justo el hábito contra el que existe
 * el sprint backlog.
 */

/** Latido del stream. Sin él, algún proxy da la conexión por muerta. */
const LATIDO_MS = 25000;

function error(res: Response, codigo: number, mensaje: string): void {
  res.status(codigo).json({ status: 'error', message: mensaje });
}

/* ------------------------------------------------------------------ */
/*  Contexto del alumno                                                */
/* ------------------------------------------------------------------ */

interface ContextoAlumno {
  grupoId: string;
  alumno: AppUser;
  dinamicaId: string | null;
  sprintId: string | null;
  equipo: EquipoScrum | null;
  cerrada: boolean;
  politica: PoliticaEtapa;
  estado: EstadoDinamica | null;
}

/**
 * La etapa que cobra la deuda es el PLANNING: es el único momento del ciclo en
 * el que se decide qué entra al sprint, y por eso es también el único en el que
 * el equipo puede reescribir su objetivo. Se deduce de la política en vez de
 * mirar el nombre de la etapa porque el nombre lo cambia el profesor.
 */
function esPlanning(politica: PoliticaEtapa): boolean {
  return politica.cobraDeuda === true;
}

/**
 * Resuelve en qué dinámica y en qué equipo está el alumno que pregunta.
 *
 * Sin dinámica abierta o sin equipo NO es un error: es el estado normal antes de
 * que el profesor reparta. Se contesta 200 con los huecos en null y la pantalla
 * enseña el mensaje que toca, en vez de un error que parece una avería.
 */
async function contextoAlumno(
  req: Request,
  res: Response,
  /**
   * Los caminos de ESCRITURA no necesitan el tablero entero: solo comprobar en
   * qué equipo está quien escribe. Construirlo costaba dos consultas más por
   * cada tarjeta arrastrada, y arrastrar es lo que más se hace aquí.
   */
  conEstado = true,
): Promise<ContextoAlumno | null> {
  const { grupoId } = req.params;
  const alumno = (req as any).appUser as AppUser | undefined;

  if (!alumno?.id || !grupoId) {
    error(res, 400, 'Datos incompletos');
    return null;
  }
  const vinculo = await getVinculoConGrupoActivo(alumno.id, grupoId);
  if (!vinculo) {
    error(res, 403, 'No perteneces a este grupo');
    return null;
  }
  if (!(await moduloActivoEnGrupo(grupoId, 'scrum'))) {
    error(res, 404, 'Esta sección no está disponible en tu grupo');
    return null;
  }

  const dinamica = await dinamicaVigente(grupoId);
  if (!dinamica) {
    return {
      grupoId, alumno, dinamicaId: null, sprintId: null, equipo: null,
      cerrada: false, politica: POLITICA_POR_DEFECTO, estado: null,
    };
  }
  await asegurarSprint(dinamica);
  const equipo = await equipoDelAlumno(dinamica.id!, alumno.id);
  const estado = conEstado ? await construirEstadoDinamica(dinamica.id!) : null;
  const etapa = dinamica.getEtapaActual();
  const politica: PoliticaEtapa = {
    ...POLITICA_POR_DEFECTO,
    ...((etapa?.get('politica') as Partial<PoliticaEtapa> | undefined) ?? {}),
  };
  return {
    grupoId,
    alumno,
    dinamicaId: dinamica.id!,
    sprintId: dinamica.getSprintActual()?.id ?? null,
    equipo,
    cerrada: dinamica.getCerrada(),
    politica,
    estado,
  };
}

/** Del estado completo, lo que le toca a un equipo. */
function recortarAEquipo(estado: EstadoDinamica | null, equipoId: string | null) {
  if (!estado || !equipoId) return null;
  return estado.equipos.find((e) => e.id === equipoId) ?? null;
}

function sobreAlumno(ctx: ContextoAlumno) {
  return {
    status: 'ok',
    serverNow: new Date().toISOString(),
    dinamica: ctx.estado?.dinamica ?? null,
    etapa: ctx.estado?.etapa ?? null,
    sprint: ctx.estado?.sprint ?? null,
    // Solo su equipo: el alumno no tiene por qué leer el tablero de los demás,
    // y la pantalla no lo pinta.
    equipo: recortarAEquipo(ctx.estado, ctx.equipo?.id ?? null),
    // Con la dinámica cerrada el tablero se lee pero no se toca.
    editable: !!ctx.equipo && !ctx.cerrada,
    puntosValidos: PUNTOS_VALIDOS,
  };
}

/** GET /alumno/grupos/:grupoId/scrum */
export async function getMiTablero(req: Request, res: Response): Promise<void> {
  try {
    const ctx = await contextoAlumno(req, res);
    if (!ctx) return;
    res.json(sobreAlumno(ctx));
  } catch {
    error(res, 500, 'Error al leer tu tablero');
  }
}

/**
 * GET /alumno/grupos/:grupoId/scrum/stream — Server-Sent Events.
 *
 * Cinco personas mueven el mismo tablero a la vez. Sin esto, o cada una recarga
 * a mano o se sondea cada pocos segundos desde treinta pestañas; con esto, quien
 * arrastra una tarjeta la mueve en la pantalla de sus compañeros.
 *
 * `EventSource` no manda cabeceras propias, así que la sesión viaja en la cookie
 * que ya existe para las navegaciones normales y no en la URL: un token en la
 * barra de direcciones acaba en los registros del servidor.
 */
export async function streamMiTablero(req: Request, res: Response): Promise<void> {
  let ctx: ContextoAlumno | null;
  try {
    ctx = await contextoAlumno(req, res);
  } catch {
    error(res, 500, 'Error al abrir el tablero');
    return;
  }
  if (!ctx) return;

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const equipoId = ctx.equipo?.id ?? null;
  const enviar = (estado: unknown) => {
    const completo = estado as EstadoDinamica;
    res.write(`data: ${JSON.stringify({
      status: 'ok',
      serverNow: completo.serverNow,
      dinamica: completo.dinamica,
      etapa: completo.etapa,
      sprint: completo.sprint,
      equipo: recortarAEquipo(completo, equipoId),
      editable: !!equipoId && completo.dinamica?.cerrada !== true,
      puntosValidos: PUNTOS_VALIDOS,
    })}\n\n`);
  };

  const baja = ctx.dinamicaId ? suscribirTablero(ctx.dinamicaId, enviar) : () => {};
  const latido = setInterval(() => res.write(': latido\n\n'), LATIDO_MS);
  req.on('close', () => { baja(); clearInterval(latido); });

  res.write(`data: ${JSON.stringify(sobreAlumno(ctx))}\n\n`);
}

/* ------------------------------------------------------------------ */
/*  Historias                                                          */
/* ------------------------------------------------------------------ */

/** Los tres campos del post-it, ya limpios, o el error de por qué no valen. */
function leerCampos(body: any): { porQue: string; que: string; como: string } | string {
  const campo = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ');
  const porQue = campo(body?.porQue);
  const que = campo(body?.que);
  const como = campo(body?.como);
  // El «qué» es el único obligatorio: es lo que se lee en la tarjeta al
  // arrastrarla. Los otros dos pueden completarse en el grooming.
  if (que === '') return 'La historia necesita al menos el «qué»';
  for (const [nombre, valor] of [['por qué', porQue], ['qué', que], ['cómo', como]] as const) {
    if (valor.length > LARGO_CAMPO) {
      return `El «${nombre}» no puede pasar de ${LARGO_CAMPO} caracteres`;
    }
  }
  return { porQue, que, como };
}

/**
 * Comprueba que el responsable propuesto esté EN el equipo.
 *
 * Devuelve el puntero, `null` para dejarla sin dueño, o `false` si el alumno no
 * es del equipo. Es la otra mitad de la regla de un responsable por historia: de
 * nada sirve que el campo sea único si puede apuntar a cualquiera.
 */
function resolverResponsable(valor: unknown, equipo: EquipoScrum): AppUser | null | false {
  if (valor === undefined || valor === null || valor === '') return null;
  const id = String(valor);
  if (!equipo.getMiembroIds().includes(id)) return false;
  return AppUser.createWithoutData(id) as AppUser;
}

/**
 * El equipo del alumno, listo para escribir, o null (ya contestado).
 *
 * `zona` dice sobre qué mitad del tablero se va a escribir, para que la política
 * de la etapa pueda negarlo: en grooming el sprint backlog está plegado y en la
 * review no se toca nada. La comprobación va en el SERVIDOR y no solo en la
 * pantalla porque la lección es la regla, no el aviso.
 */
async function equipoEditable(
  req: Request,
  res: Response,
  zona: 'backlog' | 'sprint' | 'retro' | 'equipo' = 'equipo',
): Promise<ContextoAlumno | null> {
  const ctx = await contextoAlumno(req, res, false);
  if (!ctx) return null;
  if (!ctx.equipo) {
    error(res, 403, 'Todavía no tienes equipo en esta dinámica');
    return null;
  }
  if (ctx.cerrada) {
    error(res, 409, 'Esta dinámica está cerrada');
    return null;
  }

  if (zona === 'retro' && !ctx.politica.retro) {
    error(res, 409, 'La retrospectiva no está abierta ahora mismo');
    return null;
  }
  if (zona === 'backlog' && ctx.politica.backlog !== 'editable') {
    error(res, 409, 'En esta etapa el backlog no se toca');
    return null;
  }
  if (zona === 'sprint' && ctx.politica.sprint !== 'editable') {
    error(res, 409, 'En esta etapa el sprint backlog no se toca');
    return null;
  }
  return ctx;
}

/**
 * POST /alumno/grupos/:grupoId/scrum/historias
 *
 * Body: `{ porQue, que, como, puntos?, prioridad?, responsableId? }`.
 * Nace en `backlog` sin excepción; ver la nota de cabecera.
 */
export async function crearHistoria(req: Request, res: Response): Promise<void> {
  try {
    const ctx = await equipoEditable(req, res, 'backlog');
    if (!ctx) return;
    const equipo = ctx.equipo!;

    const campos = leerCampos(req.body);
    if (typeof campos === 'string') {
      error(res, 400, campos);
      return;
    }
    const puntos = req.body?.puntos ?? 0;
    if (!esPuntos(puntos)) {
      error(res, 400, `Los puntos deben ser uno de: ${PUNTOS_VALIDOS.join(', ')}`);
      return;
    }
    const prioridad = req.body?.prioridad ?? PRIORIDAD_POR_DEFECTO;
    if (!esPrioridad(prioridad)) {
      error(res, 400, 'La prioridad debe ser must, should, could o wont');
      return;
    }
    const responsable = resolverResponsable(req.body?.responsableId, equipo);
    if (responsable === false) {
      error(res, 400, 'El responsable tiene que ser alguien del equipo');
      return;
    }

    const existentes = await historiasDeEquipos([equipo.id!]);
    const historia = new HistoriaUsuario().initDefaults();
    historia.setEquipo(EquipoScrum.createWithoutData(equipo.id!) as EquipoScrum);
    historia.setPorQue(campos.porQue);
    historia.setQue(campos.que);
    historia.setComo(campos.como);
    historia.setPuntos(puntos);
    historia.setPrioridad(prioridad);
    historia.setResponsable(responsable);
    historia.setColumna('backlog');
    historia.setOrden(siguienteOrdenEnColumna(existentes, 'backlog'));
    await historia.save(null, { useMasterKey: true });

    void difundirTablero(ctx.dinamicaId!);
    res.status(201).json({ status: 'ok', historia: historia.toSafeJSON() });
  } catch {
    error(res, 500, 'Error al crear la historia');
  }
}

/** La historia por id, comprobando que sea del equipo del alumno. */
async function cargarHistoriaDelEquipo(
  historiaId: string,
  equipoId: string,
): Promise<HistoriaUsuario | null> {
  const q = new Parse.Query<HistoriaUsuario>('HistoriaUsuario');
  q.equalTo('exists' as any, true as any);
  q.include('responsable' as any);
  try {
    const historia = await q.get(historiaId, { useMasterKey: true });
    return historia.getEquipoId() === equipoId ? historia : null;
  } catch {
    return null;
  }
}

/**
 * PUT /alumno/grupos/:grupoId/scrum/historias/:historiaId
 *
 * Body: cualquier subconjunto de `{ porQue, que, como, puntos, prioridad,
 * responsableId, columna, orden }`. La columna se cambia por aquí también: para
 * el cliente arrastrar y editar son el mismo guardado.
 */
export async function actualizarHistoria(req: Request, res: Response): Promise<void> {
  const { historiaId } = req.params;
  try {
    const ctx = await equipoEditable(req, res);
    if (!ctx) return;
    const equipo = ctx.equipo!;

    const historia = await cargarHistoriaDelEquipo(historiaId, equipo.id!);
    if (!historia) {
      error(res, 404, 'Esa historia no es de tu equipo');
      return;
    }

    const tocaTexto = ['porQue', 'que', 'como'].some((k) => req.body?.[k] !== undefined);
    if (tocaTexto) {
      const campos = leerCampos({
        porQue: req.body?.porQue ?? historia.getPorQue(),
        que: req.body?.que ?? historia.getQue(),
        como: req.body?.como ?? historia.getComo(),
      });
      if (typeof campos === 'string') {
        error(res, 400, campos);
        return;
      }
      historia.setPorQue(campos.porQue);
      historia.setQue(campos.que);
      historia.setComo(campos.como);
    }

    if (req.body?.puntos !== undefined) {
      if (!esPuntos(req.body.puntos)) {
        error(res, 400, `Los puntos deben ser uno de: ${PUNTOS_VALIDOS.join(', ')}`);
        return;
      }
      historia.setPuntos(req.body.puntos);
    }
    if (req.body?.prioridad !== undefined) {
      if (!esPrioridad(req.body.prioridad)) {
        error(res, 400, 'La prioridad debe ser must, should, could o wont');
        return;
      }
      historia.setPrioridad(req.body.prioridad);
    }
    if (req.body?.responsableId !== undefined) {
      const responsable = resolverResponsable(req.body.responsableId, equipo);
      if (responsable === false) {
        error(res, 400, 'El responsable tiene que ser alguien del equipo');
        return;
      }
      historia.setResponsable(responsable);
    }
    if (req.body?.columna !== undefined) {
      if (!esColumna(req.body.columna)) {
        error(res, 400, 'Esa columna no existe en el tablero');
        return;
      }
      const destino = req.body.columna as Columna;
      const origen = historia.getColumna();

      if (!permiteMover(ctx.politica.movimientos, origen, destino)) {
        error(res, 409, mensajeMovimiento(ctx.politica.movimientos));
        return;
      }
      // «Solo historias de usuario estimadas podrán trabajarse durante el
      // sprint»: el `?` y el `∞` se quedan fuera. El ∞ además dice qué hacer —
      // partirla— en vez de solo negar el paso.
      const entraAlSprint = COLUMNAS_DEL_SPRINT.includes(destino)
        && !COLUMNAS_DEL_SPRINT.includes(origen);
      if (entraAlSprint && !estaEstimada(historia.getPuntos())) {
        error(res, 409, historia.getPuntos() < 0
          ? 'Esta historia está marcada como demasiado grande: pártela antes de meterla al sprint'
          : 'Solo entran al sprint las historias estimadas');
        return;
      }

      historia.setColumna(destino);
      // Sin posición explícita, al final de la columna de destino: es donde el
      // ojo la busca después de soltarla.
      if (req.body?.orden === undefined) {
        const hermanas = await historiasDeEquipos([equipo.id!]);
        historia.setOrden(siguienteOrdenEnColumna(
          hermanas.filter((h) => h.id !== historia.id),
          req.body.columna as Columna,
        ));
      }
    }
    if (typeof req.body?.orden === 'number' && Number.isFinite(req.body.orden)) {
      historia.setOrden(req.body.orden);
    }

    await historia.save(null, { useMasterKey: true });
    void difundirTablero(ctx.dinamicaId!);
    res.json({ status: 'ok', historia: historia.toSafeJSON() });
  } catch {
    error(res, 500, 'Error al actualizar la historia');
  }
}

/** Por qué la etapa no deja hacer ese movimiento, en las palabras del ciclo. */
function mensajeMovimiento(movimientos: string): string {
  switch (movimientos) {
    case 'ninguno':
      return 'En esta etapa el tablero no se mueve';
    case 'backlog-a-planned':
      return 'En el planning solo se puede pasar del backlog a Planned';
    case 'dentro-backlog':
      return 'En el grooming solo se ordena el backlog';
    case 'dentro-sprint':
      return 'Aquí solo se mueve lo que ya está en el sprint';
    default:
      return 'Ese movimiento no está permitido ahora';
  }
}

/** DELETE /alumno/grupos/:grupoId/scrum/historias/:historiaId */
export async function borrarHistoria(req: Request, res: Response): Promise<void> {
  const { historiaId } = req.params;
  try {
    const ctx = await equipoEditable(req, res);
    if (!ctx) return;
    const historia = await cargarHistoriaDelEquipo(historiaId, ctx.equipo!.id!);
    if (!historia) {
      error(res, 404, 'Esa historia no es de tu equipo');
      return;
    }
    historia.softDelete();
    await historia.save(null, { useMasterKey: true });
    void difundirTablero(ctx.dinamicaId!);
    res.json({ status: 'ok' });
  } catch {
    error(res, 500, 'Error al borrar la historia');
  }
}

/**
 * PUT /alumno/grupos/:grupoId/scrum/objetivo — `{ objetivo }`.
 *
 * El objetivo del sprint es del EQUIPO y lo escribe el equipo: es a lo que se
 * compromete, no lo que le mandan. Por eso está en el camino del alumno y no en
 * el del profesor.
 */
export async function setObjetivoEquipo(req: Request, res: Response): Promise<void> {
  try {
    const ctx = await equipoEditable(req, res);
    if (!ctx) return;
    if (!esPlanning(ctx.politica)) {
      error(res, 409, 'El objetivo del sprint se escribe en el planning');
      return;
    }
    const objetivo = String(req.body?.objetivo ?? '').trim().replace(/\s+/g, ' ');
    if (objetivo.length > LARGO_OBJETIVO) {
      error(res, 400, `El objetivo no puede pasar de ${LARGO_OBJETIVO} caracteres`);
      return;
    }
    ctx.equipo!.setObjetivo(objetivo);
    await ctx.equipo!.save(null, { useMasterKey: true });
    void difundirTablero(ctx.dinamicaId!);
    res.json({ status: 'ok', objetivo });
  } catch {
    error(res, 500, 'Error al guardar el objetivo del sprint');
  }
}

/* ------------------------------------------------------------------ */
/*  Proyección                                                         */
/* ------------------------------------------------------------------ */

/**
 * GET /admin/grupos/:grupoId/scrum/dinamicas/:dinamicaId/proyeccion
 *
 * Devuelve la dinámica ENTERA y no solo los equipos elegidos: la selección viaja
 * en la URL de la pantalla proyectada, así que quien filtra es el cliente. Así
 * el mismo objeto sirve a las pantallas que estén abiertas con selecciones
 * distintas y solo se construye una vez por cambio.
 */
export async function getProyeccionScrum(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId } = req.params;
  try {
    const dinamica = await cargarDinamica(dinamicaId, grupoId);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    const estado = await construirEstadoDinamica(dinamicaId);
    res.json({ status: 'ok', ...estado });
  } catch {
    error(res, 500, 'Error al leer la proyección');
  }
}

/** GET …/proyeccion/stream — lo mismo, pero empujado. */
export async function streamProyeccionScrum(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId } = req.params;

  const dinamica = await cargarDinamica(dinamicaId, grupoId).catch(() => null);
  if (!dinamica) {
    error(res, 404, 'La dinámica no existe en este grupo');
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const enviar = (estado: unknown) => {
    res.write(`data: ${JSON.stringify({ status: 'ok', ...(estado as EstadoDinamica) })}\n\n`);
  };
  // Suscribir ANTES de la primera lectura: si alguien mueve una tarjeta
  // justo mientras se resuelve, el aviso llega igual.
  const baja = suscribirTablero(dinamicaId, enviar);
  const latido = setInterval(() => res.write(': latido\n\n'), LATIDO_MS);
  req.on('close', () => { baja(); clearInterval(latido); });

  try {
    const estado = await construirEstadoDinamica(dinamicaId);
    if (estado) enviar(estado);
  } catch {
    res.write('event: error\ndata: {}\n\n');
  }
}

/* ------------------------------------------------------------------ */
/*  Rol del equipo                                                     */
/* ------------------------------------------------------------------ */

/**
 * PUT /alumno/grupos/:grupoId/scrum/po — `{ alumnoId: string | null }`.
 *
 * Lo elige el propio equipo, no el profesor: en la dinámica el reparto de roles
 * es parte de lo que se practica. Es UNO, y por eso el campo es un puntero y no
 * una lista.
 */
export async function setProductOwner(req: Request, res: Response): Promise<void> {
  try {
    const ctx = await equipoEditable(req, res);
    if (!ctx) return;
    const equipo = ctx.equipo!;
    const { alumnoId } = req.body as { alumnoId?: string | null };

    if (!alumnoId) {
      equipo.setPo(null);
    } else {
      if (!equipo.getMiembroIds().includes(String(alumnoId))) {
        error(res, 400, 'El Product Owner tiene que ser alguien del equipo');
        return;
      }
      equipo.setPo(AppUser.createWithoutData(String(alumnoId)) as AppUser);
    }
    await equipo.save(null, { useMasterKey: true });
    void difundirTablero(ctx.dinamicaId!);
    res.json({ status: 'ok', po: equipo.getPoId() });
  } catch {
    error(res, 500, 'Error al cambiar el Product Owner');
  }
}

/* ------------------------------------------------------------------ */
/*  Épicas                                                             */
/* ------------------------------------------------------------------ */

/**
 * POST /alumno/grupos/:grupoId/scrum/epicas — `{ nombre, color? }`.
 *
 * La épica es el entregable completo. Existe para enseñar que la historia de
 * usuario no es la unidad más grande: primero se define qué se va a construir y
 * después se parte en historias.
 */
export async function crearEpica(req: Request, res: Response): Promise<void> {
  try {
    const ctx = await equipoEditable(req, res);
    if (!ctx) return;
    const equipo = ctx.equipo!;

    const nombre = String(req.body?.nombre ?? '').trim().replace(/\s+/g, ' ');
    if (nombre === '' || nombre.length > LARGO_NOMBRE) {
      error(res, 400, `El nombre es requerido y no puede pasar de ${LARGO_NOMBRE} caracteres`);
      return;
    }

    const existentes = await epicasDeEquipos([equipo.id!]);
    const epica = new EpicaScrum().initDefaults();
    epica.setEquipo(EquipoScrum.createWithoutData(equipo.id!) as EquipoScrum);
    epica.setNombre(nombre);
    epica.setColor(
      normalizarColor(req.body?.color) ?? COLORES_EPICA[existentes.length % COLORES_EPICA.length],
    );
    epica.setOrden(existentes.length);
    await epica.save(null, { useMasterKey: true });

    // La primera épica pasa a ser la del sprint: sin ninguna elegida, la regla
    // de «un modelo a la vez» no tiene contra qué comparar.
    if (existentes.length === 0) {
      equipo.setEpicaActual(epica);
      await equipo.save(null, { useMasterKey: true });
    }

    void difundirTablero(ctx.dinamicaId!);
    res.status(201).json({ status: 'ok', epica: epica.toSafeJSON() });
  } catch {
    error(res, 500, 'Error al crear la épica');
  }
}

/** PUT …/scrum/epicas/:epicaId — `{ nombre?, color? }`. */
export async function actualizarEpica(req: Request, res: Response): Promise<void> {
  const { epicaId } = req.params;
  try {
    const ctx = await equipoEditable(req, res);
    if (!ctx) return;
    const epica = await cargarEpicaDelEquipo(epicaId, ctx.equipo!.id!);
    if (!epica) {
      error(res, 404, 'Esa épica no es de tu equipo');
      return;
    }
    if (req.body?.nombre !== undefined) {
      const nombre = String(req.body.nombre ?? '').trim().replace(/\s+/g, ' ');
      if (nombre === '' || nombre.length > LARGO_NOMBRE) {
        error(res, 400, 'El nombre no puede estar vacío');
        return;
      }
      epica.setNombre(nombre);
    }
    if (req.body?.color !== undefined) {
      const color = normalizarColor(req.body.color);
      if (!color) {
        error(res, 400, 'El color no es un hexadecimal válido');
        return;
      }
      epica.setColor(color);
    }
    await epica.save(null, { useMasterKey: true });
    void difundirTablero(ctx.dinamicaId!);
    res.json({ status: 'ok', epica: epica.toSafeJSON() });
  } catch {
    error(res, 500, 'Error al actualizar la épica');
  }
}

/** PUT …/scrum/epica-actual — `{ epicaId }`. La que el sprint está trabajando. */
export async function setEpicaActual(req: Request, res: Response): Promise<void> {
  try {
    const ctx = await equipoEditable(req, res);
    if (!ctx) return;
    const equipo = ctx.equipo!;
    const { epicaId } = req.body as { epicaId?: string | null };

    if (!epicaId) {
      equipo.setEpicaActual(null);
    } else {
      const epica = await cargarEpicaDelEquipo(String(epicaId), equipo.id!);
      if (!epica) {
        error(res, 404, 'Esa épica no es de tu equipo');
        return;
      }
      equipo.setEpicaActual(epica);
    }
    await equipo.save(null, { useMasterKey: true });
    void difundirTablero(ctx.dinamicaId!);
    res.json({ status: 'ok', epicaActual: equipo.getEpicaActual()?.id ?? null });
  } catch {
    error(res, 500, 'Error al cambiar la épica del sprint');
  }
}

async function cargarEpicaDelEquipo(epicaId: string, equipoId: string): Promise<EpicaScrum | null> {
  const q = new Parse.Query<EpicaScrum>('EpicaScrum');
  q.equalTo('exists' as any, true as any);
  try {
    const epica = await q.get(epicaId, { useMasterKey: true });
    return epica.getEquipoId() === equipoId ? epica : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Retrospectiva                                                      */
/* ------------------------------------------------------------------ */

/**
 * POST /alumno/grupos/:grupoId/scrum/retro — `{ columna, texto, responsableId? }`.
 *
 * Solo «mejorar» admite responsable: es la única columna que genera un
 * compromiso. Las otras dos son observaciones y no llevan nombre a propósito —
 * repartir culpas no es el punto de una retrospectiva—.
 *
 * Y una persona solo puede tener UN compromiso abierto a la vez. Es la regla
 * que hace que la retro tenga consecuencias: un equipo que no cierra sus
 * compromisos se queda sin gente a quien asignarle los nuevos.
 */
export async function crearTarjetaRetro(req: Request, res: Response): Promise<void> {
  try {
    const ctx = await equipoEditable(req, res, 'retro');
    if (!ctx) return;
    if (!ctx.sprintId) {
      error(res, 409, 'La dinámica no tiene ningún sprint abierto');
      return;
    }
    const equipo = ctx.equipo!;

    const columna = req.body?.columna;
    if (!esColumnaRetro(columna)) {
      error(res, 400, 'La columna debe ser bien, mal o mejorar');
      return;
    }
    const texto = String(req.body?.texto ?? '').trim().replace(/\s+/g, ' ');
    if (texto === '' || texto.length > LARGO_TARJETA_RETRO) {
      error(res, 400, `El texto es requerido y no puede pasar de ${LARGO_TARJETA_RETRO} caracteres`);
      return;
    }

    let responsable: AppUser | null = null;
    if (columna === 'mejorar' && req.body?.responsableId) {
      const fallo = await validarResponsableCompromiso(String(req.body.responsableId), equipo);
      if (fallo) {
        error(res, 409, fallo);
        return;
      }
      responsable = AppUser.createWithoutData(String(req.body.responsableId)) as AppUser;
    }

    const tarjeta = new TarjetaRetro().initDefaults();
    tarjeta.setEquipo(EquipoScrum.createWithoutData(equipo.id!) as EquipoScrum);
    tarjeta.setSprint(SprintScrum.createWithoutData(ctx.sprintId) as SprintScrum);
    tarjeta.setColumna(columna as ColumnaRetro);
    tarjeta.setTexto(texto);
    tarjeta.setResponsable(responsable);
    await tarjeta.save(null, { useMasterKey: true });

    void difundirTablero(ctx.dinamicaId!);
    res.status(201).json({ status: 'ok', tarjeta: tarjeta.toSafeJSON() });
  } catch {
    error(res, 500, 'Error al crear la tarjeta');
  }
}

/**
 * ¿Puede esta persona llevarse otro compromiso? Devuelve el motivo por el que
 * no, o `null` si sí.
 */
async function validarResponsableCompromiso(
  alumnoId: string,
  equipo: EquipoScrum,
  exceptoTarjetaId?: string,
): Promise<string | null> {
  if (!equipo.getMiembroIds().includes(alumnoId)) {
    return 'El responsable tiene que ser alguien del equipo';
  }
  // TODOS los abiertos, incluidos los de esta misma retro: si no, se podrían
  // cargar tres compromisos a la misma persona en la misma sesión, que es justo
  // lo que la regla quiere impedir.
  const abiertos = await compromisosAbiertos(equipo.id!);
  const suyo = abiertos.find(
    (t) => t.getResponsable()?.id === alumnoId && t.id !== exceptoTarjetaId,
  );
  if (suyo) {
    return `Esa persona ya tiene un compromiso abierto: «${suyo.getTexto()}». `
      + 'Ciérrenlo en esta retro o repartan el nuevo a alguien más.';
  }
  return null;
}

/** PUT …/scrum/retro/:tarjetaId — `{ texto?, responsableId? }`. */
export async function actualizarTarjetaRetro(req: Request, res: Response): Promise<void> {
  const { tarjetaId } = req.params;
  try {
    const ctx = await equipoEditable(req, res, 'retro');
    if (!ctx) return;
    const tarjeta = await cargarTarjetaRetro(tarjetaId, ctx.equipo!.id!);
    if (!tarjeta) {
      error(res, 404, 'Esa tarjeta no es de tu equipo');
      return;
    }

    if (req.body?.texto !== undefined) {
      const texto = String(req.body.texto ?? '').trim().replace(/\s+/g, ' ');
      if (texto === '' || texto.length > LARGO_TARJETA_RETRO) {
        error(res, 400, 'El texto no puede estar vacío');
        return;
      }
      tarjeta.setTexto(texto);
    }
    if (req.body?.responsableId !== undefined) {
      if (tarjeta.getColumna() !== 'mejorar') {
        error(res, 400, 'Solo los compromisos llevan responsable');
        return;
      }
      if (!req.body.responsableId) {
        tarjeta.setResponsable(null);
      } else {
        const fallo = await validarResponsableCompromiso(
          String(req.body.responsableId), ctx.equipo!, tarjeta.id,
        );
        if (fallo) {
          error(res, 409, fallo);
          return;
        }
        tarjeta.setResponsable(AppUser.createWithoutData(String(req.body.responsableId)) as AppUser);
      }
    }

    await tarjeta.save(null, { useMasterKey: true });
    void difundirTablero(ctx.dinamicaId!);
    res.json({ status: 'ok', tarjeta: tarjeta.toSafeJSON() });
  } catch {
    error(res, 500, 'Error al actualizar la tarjeta');
  }
}

/** DELETE …/scrum/retro/:tarjetaId */
export async function borrarTarjetaRetro(req: Request, res: Response): Promise<void> {
  const { tarjetaId } = req.params;
  try {
    const ctx = await equipoEditable(req, res, 'retro');
    if (!ctx) return;
    const tarjeta = await cargarTarjetaRetro(tarjetaId, ctx.equipo!.id!);
    if (!tarjeta) {
      error(res, 404, 'Esa tarjeta no es de tu equipo');
      return;
    }
    tarjeta.softDelete();
    await tarjeta.save(null, { useMasterKey: true });
    void difundirTablero(ctx.dinamicaId!);
    res.json({ status: 'ok' });
  } catch {
    error(res, 500, 'Error al borrar la tarjeta');
  }
}

/**
 * PUT …/scrum/compromisos/:tarjetaId — `{ estado: 'cumplido' | 'fallado' }`.
 *
 * Lo marca SU responsable y nadie más. Estar asignado a un compromiso no
 * significa tener que hacerlo solo: significa responder de su seguimiento, y
 * este botón es exactamente ese seguimiento.
 */
export async function marcarCompromiso(req: Request, res: Response): Promise<void> {
  const { tarjetaId } = req.params;
  try {
    const ctx = await equipoEditable(req, res, 'retro');
    if (!ctx) return;
    const tarjeta = await cargarTarjetaRetro(tarjetaId, ctx.equipo!.id!);
    if (!tarjeta || tarjeta.getColumna() !== 'mejorar') {
      error(res, 404, 'Ese compromiso no es de tu equipo');
      return;
    }
    const responsableId = tarjeta.getResponsable()?.id ?? null;
    if (responsableId && responsableId !== ctx.alumno.id) {
      error(res, 403, 'Este compromiso lo marca quien le da seguimiento');
      return;
    }

    const { estado } = req.body as { estado?: string };
    if (!(ESTADOS_COMPROMISO as readonly string[]).includes(String(estado))) {
      error(res, 400, 'El estado debe ser cumplido o fallado');
      return;
    }
    tarjeta.setEstado(estado as EstadoCompromiso);
    await tarjeta.save(null, { useMasterKey: true });
    void difundirTablero(ctx.dinamicaId!);
    res.json({ status: 'ok', tarjeta: tarjeta.toSafeJSON() });
  } catch {
    error(res, 500, 'Error al marcar el compromiso');
  }
}

async function cargarTarjetaRetro(
  tarjetaId: string,
  equipoId: string,
): Promise<TarjetaRetro | null> {
  const q = new Parse.Query<TarjetaRetro>('TarjetaRetro');
  q.equalTo('exists' as any, true as any);
  q.include('responsable' as any);
  try {
    const tarjeta = await q.get(tarjetaId, { useMasterKey: true });
    return tarjeta.getEquipoId() === equipoId ? tarjeta : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Resumen del equipo                                                 */
/* ------------------------------------------------------------------ */

/**
 * GET /alumno/grupos/:grupoId/scrum/resumen — lo que el equipo se lleva.
 *
 * No es un marcador: es la respuesta a las preguntas con las que termina la
 * sesión. Por eso viaja el histórico sprint a sprint, quién cerró qué y lo que
 * nunca salió del backlog, y no solo un total.
 */
export async function getResumenEquipo(req: Request, res: Response): Promise<void> {
  try {
    const ctx = await contextoAlumno(req, res, false);
    if (!ctx) return;
    if (!ctx.equipo) {
      res.json({ status: 'ok', equipo: null, historico: [], sinEmpezar: [], porIntegrante: [] });
      return;
    }
    const equipoId = ctx.equipo.id!;
    const [historico, todas, compromisos] = await Promise.all([
      historicoDeEquipo(equipoId),
      historiasDeEquipos([equipoId], { incluirArchivadas: true }),
      compromisosDeTodos(equipoId),
    ]);

    // Quién cerró qué: solo cuenta lo que estaba asignado al archivarse. Una
    // historia sin responsable no le suma a nadie, y eso hay que decirlo.
    const porIntegrante = new Map<string, { name: string; puntos: number }>();
    for (const m of ctx.equipo.getMiembros()) {
      porIntegrante.set(m.id!, { name: m.get('name') ?? '', puntos: 0 });
    }
    let sinResponsable = 0;
    for (const h of todas) {
      if (!h.getArchivada()) continue;
      const quien = h.getResponsable()?.id;
      if (quien && porIntegrante.has(quien)) {
        porIntegrante.get(quien)!.puntos += Math.max(0, h.getPuntos());
      } else {
        sinResponsable += 1;
      }
    }

    res.json({
      status: 'ok',
      equipo: ctx.equipo.toSafeJSON(),
      dinamica: ctx.estado?.dinamica ?? null,
      historico: historico.map((m) => ({
        ...m.toSafeJSON(),
        numero: m.getSprint()?.get('numero') ?? 0,
        objetivo: m.getSprint()?.get('objetivo') ?? '',
      })),
      sinEmpezar: todas
        .filter((h) => !h.getArchivada() && h.getColumna() === 'backlog')
        .map((h) => ({ que: h.getQue(), puntos: h.getPuntos(), prioridad: h.getPrioridad() })),
      porIntegrante: [...porIntegrante.entries()].map(([id, v]) => ({ id, ...v })),
      sinResponsable,
      compromisos: compromisos.map((t) => t.toSafeJSON()),
    });
  } catch {
    error(res, 500, 'Error al leer el resumen');
  }
}

/** Todos los compromisos del equipo, marcados o no: para el resumen final. */
async function compromisosDeTodos(equipoId: string): Promise<TarjetaRetro[]> {
  const q = new Parse.Query<TarjetaRetro>('TarjetaRetro');
  q.equalTo('equipo' as any, EquipoScrum.createWithoutData(equipoId) as any);
  q.equalTo('columna' as any, 'mejorar' as any);
  q.equalTo('exists' as any, true as any);
  q.include('responsable' as any);
  q.limit(200);
  return q.find({ useMasterKey: true });
}
