import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { AppUser } from '../models/AppUser.js';
import { EquipoScrum } from '../models/EquipoScrum.js';
import { HistoriaUsuario } from '../models/HistoriaUsuario.js';
import { getVinculoConGrupoActivo } from '../services/grupo-alumno.service.js';
import { moduloActivoEnGrupo } from '../services/grupo-colecciones.service.js';
import {
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
import {
  esColumna, esPrioridad, esPuntos, LARGO_CAMPO, LARGO_OBJETIVO,
  PRIORIDAD_POR_DEFECTO, PUNTOS_VALIDOS, type Columna,
} from '../constants/scrum.js';

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
  equipo: EquipoScrum | null;
  cerrada: boolean;
  estado: EstadoDinamica | null;
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
    return { grupoId, alumno, dinamicaId: null, equipo: null, cerrada: false, estado: null };
  }
  const equipo = await equipoDelAlumno(dinamica.id!, alumno.id);
  const estado = conEstado ? await construirEstadoDinamica(dinamica.id!) : null;
  return {
    grupoId,
    alumno,
    dinamicaId: dinamica.id!,
    equipo,
    cerrada: dinamica.getCerrada(),
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

/** El equipo del alumno, listo para escribir, o null (ya contestado). */
async function equipoEditable(req: Request, res: Response): Promise<ContextoAlumno | null> {
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
    const ctx = await equipoEditable(req, res);
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
      historia.setColumna(req.body.columna as Columna);
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
