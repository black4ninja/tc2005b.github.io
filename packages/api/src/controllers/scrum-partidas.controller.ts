import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { AppUser } from '../models/AppUser.js';
import { Grupo } from '../models/Grupo.js';
import { DinamicaScrum } from '../models/DinamicaScrum.js';
import { EquipoScrum } from '../models/EquipoScrum.js';
import { alumnoTieneAccesoAGrupo, getAlumnosDeGrupo } from '../services/grupo-alumno.service.js';
import { moduloActivoEnGrupo } from '../services/grupo-colecciones.service.js';
import {
  asegurarSprint,
  cargarDinamica,
  colorParaEquipo,
  dinamicaVigente,
  equiposDeDinamica,
  liberarHistoriasDeExmiembros,
  moverMiembros,
  partidasDeGrupo,
  partidasPropias,
  scrumDelAlumno,
  difundirTablero,
} from '../services/scrum.service.js';
import {
  LARGO_NOMBRE, MAX_INVITADOS, MAX_PARTIDAS_VIVAS,
} from '../constants/scrum.js';

/**
 * Las partidas de práctica: el mismo Scrum, jugado por el alumno a su paso.
 *
 * Una partida NO es un modelo aparte. Es una `DinamicaScrum` con dueño, y por
 * eso todo lo que ya existe —el tablero, las etapas del grupo, la deuda, el
 * burndown, la retrospectiva— le sirve tal cual. Aquí solo vive lo que la
 * dinámica de clase no necesita: abrirla, listarla y decidir quién entra.
 *
 * El ciclo —cambiar de etapa, abrir y cerrar sprints, finalizar— lo mueven los
 * MISMOS controladores del profesor, montados en `scrum.routes` detrás de otro
 * candado. Escribirlos otra vez habría sido tener dos sitios donde arreglar
 * cada regla que se ajuste en el futuro.
 */

function error(res: Response, codigo: number, mensaje: string): void {
  res.status(codigo).json({ status: 'error', message: mensaje });
}

function limpiarNombre(valor: unknown): string | null {
  const limpio = String(valor ?? '').trim().replace(/\s+/g, ' ');
  if (limpio === '' || limpio.length > LARGO_NOMBRE) return null;
  return limpio;
}

/**
 * Las dos comprobaciones de entrada del alumno, en paralelo.
 *
 * Las mismas que hace `contextoAlumno` para el tablero: que sea de este grupo y
 * que el módulo esté encendido. En fila india son dos viajes a una base remota
 * antes de empezar.
 */
async function puedeEntrar(req: Request, res: Response): Promise<AppUser | null> {
  const { grupoId } = req.params;
  const alumno = (req as any).appUser as AppUser | undefined;
  if (!alumno?.id || !grupoId) {
    error(res, 400, 'Datos incompletos');
    return null;
  }
  const [enElGrupo, moduloActivo] = await Promise.all([
    alumnoTieneAccesoAGrupo(alumno.id, grupoId),
    moduloActivoEnGrupo(grupoId, 'scrum'),
  ]);
  if (!enElGrupo) {
    error(res, 403, 'No perteneces a este grupo');
    return null;
  }
  if (!moduloActivo) {
    error(res, 404, 'Esta sección no está disponible en tu grupo');
    return null;
  }
  return alumno;
}

/* ------------------------------------------------------------------ */
/*  Listado                                                            */
/*  ------------------------------------------------------------------ */

/** Los equipos de un puñado de dinámicas, con sus miembros desplegados. */
async function equiposDeVarias(dinamicaIds: string[]): Promise<EquipoScrum[]> {
  if (dinamicaIds.length === 0) return [];
  const q = new Parse.Query<EquipoScrum>('EquipoScrum');
  q.containedIn(
    'dinamica' as any,
    dinamicaIds.map((id) => DinamicaScrum.createWithoutData(id)) as any,
  );
  q.equalTo('exists' as any, true as any);
  // Desplegados o los nombres llegan vacíos: es la trampa del puntero pelado
  // que ya ha mordido tres veces en este módulo.
  q.include('miembros' as any);
  q.limit(1000);
  return q.find({ useMasterKey: true });
}

function gente(equipos: EquipoScrum[]): { id: string; name: string }[] {
  const vistos = new Map<string, string>();
  for (const e of equipos) {
    for (const m of e.getMiembros()) {
      if (m.id) vistos.set(m.id, m.get('name') ?? '');
    }
  }
  return [...vistos].map(([id, name]) => ({ id, name }));
}

/** Lo que el listado necesita de una dinámica: su estado, no su tablero. */
function fila(dinamica: DinamicaScrum, equipos: EquipoScrum[], alumnoId?: string) {
  const suyos = equipos.filter((e) => e.getDinamicaId() === dinamica.id);
  const mio = alumnoId ? suyos.find((e) => e.getMiembroIds().includes(alumnoId)) : undefined;
  const sprint = dinamica.getSprintActual();
  return {
    ...dinamica.toSafeJSON(),
    sprint: sprint?.id
      ? { id: sprint.id, numero: sprint.get('numero') ?? 0, objetivo: sprint.get('objetivo') ?? '' }
      : null,
    integrantes: gente(suyos),
    miEquipo: mio ? { id: mio.id!, nombre: mio.getNombre(), color: mio.getColor() } : null,
  };
}

/**
 * GET /alumno/grupos/:grupoId/scrum/partidas
 *
 * La pantalla de entrada del alumno: dónde ha estado y dónde puede seguir. Va
 * antes del tablero porque ya no hay un solo tablero — está el de la clase y
 * están sus partidas.
 */
export async function listarMisPartidas(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  try {
    const alumno = await puedeEntrar(req, res);
    if (!alumno) return;

    // Cuál es «la de clase» lo decide `dinamicaVigente`, la MISMA función que
    // resuelve el tablero. Deducirlo aquí otra vez —la abierta, y si no la
    // última terminada— era tener la regla en dos sitios, que en este módulo ya
    // ha salido caro dos veces: el listado acabaría ofreciendo entrar a una
    // dinámica y el tablero abriendo otra.
    const [{ clase, practica }, vigente] = await Promise.all([
      scrumDelAlumno(grupoId, alumno.id!),
      dinamicaVigente(grupoId),
    ]);
    const equipos = await equiposDeVarias([...clase, ...practica].map((d) => d.id!));

    res.json({
      status: 'ok',
      clase: clase.map((d) => fila(d, equipos, alumno.id!)),
      practica: practica.map((d) => fila(d, equipos, alumno.id!)),
      // La que abre el tablero de clase. Null si el alumno no tuvo equipo en
      // ella: entonces no hay nada suyo que enseñar.
      vigenteId: clase.some((d) => d.id === vigente?.id) ? vigente!.id! : null,
      maxPartidas: MAX_PARTIDAS_VIVAS,
    });
  } catch {
    error(res, 500, 'Error al leer tus partidas');
  }
}

/**
 * GET /alumno/grupos/:grupoId/scrum/companeros — para el selector de invitados.
 *
 * Solo id y nombre. El reparto del profesor sirve también la matrícula, y esa
 * no puede salir por el camino del alumno: es la contraseña con la que entran
 * la primera vez.
 */
export async function companerosDeGrupo(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  try {
    const alumno = await puedeEntrar(req, res);
    if (!alumno) return;

    const alumnos = await getAlumnosDeGrupo(grupoId);
    res.json({
      status: 'ok',
      companeros: alumnos
        .filter((a) => a.alumno.id !== alumno.id)
        .map((a) => ({ id: a.alumno.id!, name: a.alumno.get('name') ?? '' }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    });
  } catch {
    error(res, 500, 'Error al leer tus compañeros');
  }
}

/* ------------------------------------------------------------------ */
/*  Abrir una partida                                                  */
/* ------------------------------------------------------------------ */

/**
 * POST /alumno/grupos/:grupoId/scrum/partidas — `{ nombre? }`.
 *
 * Nace sin etapa a propósito: sin etapa abierta el tablero se mira y no se
 * toca, así que lo primero que el alumno tiene que hacer es abrir el planning.
 * Es la misma regla que rige en clase, y practicarla es justo el ejercicio.
 *
 * El orden importa: el equipo va ANTES del sprint, porque `crearSprint` le abre
 * un marcador a cada equipo que encuentra. Al revés, la partida nacería sin
 * burndown.
 */
export async function crearPartida(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  try {
    const alumno = await puedeEntrar(req, res);
    if (!alumno) return;

    const mias = await partidasPropias(grupoId, alumno.id!);
    const vivas = mias.filter((d) => !d.getFinalizada());
    if (vivas.length >= MAX_PARTIDAS_VIVAS) {
      error(
        res,
        409,
        `Ya tienes ${MAX_PARTIDAS_VIVAS} partidas abiertas. Termina o borra alguna para abrir otra.`,
      );
      return;
    }

    const nombre = limpiarNombre(req.body?.nombre) ?? `Mi práctica ${mias.length + 1}`;

    const dinamica = new DinamicaScrum().initDefaults();
    dinamica.setGrupo(Grupo.createWithoutData(grupoId) as Grupo);
    dinamica.setPropietario(alumno);
    dinamica.setNombre(nombre);
    dinamica.setCerrada(false);
    await dinamica.save(null, { useMasterKey: true });

    const equipo = new EquipoScrum().initDefaults();
    equipo.setDinamica(dinamica);
    equipo.setNombre('Mi equipo');
    equipo.setColor(colorParaEquipo(0));
    equipo.setMiembros([alumno]);
    equipo.setOrden(0);
    await equipo.save(null, { useMasterKey: true });

    await asegurarSprint(dinamica);

    res.status(201).json({
      status: 'ok',
      partida: fila(dinamica, [equipo], alumno.id!),
    });
  } catch {
    error(res, 500, 'Error al abrir la partida');
  }
}

/* ------------------------------------------------------------------ */
/*  Quién juega                                                        */
/* ------------------------------------------------------------------ */

/**
 * POST …/partidas/:dinamicaId/invitados — `{ alumnoIds }`.
 *
 * Una partida tiene UN equipo: simula el de la clase. Invitar es meter gente en
 * él, con la misma función que usa el profesor al repartir, para que la regla
 * de «nadie en dos equipos de la misma dinámica» sea una sola.
 */
export async function invitar(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId } = req.params;
  const { alumnoIds } = req.body as { alumnoIds?: unknown };

  if (!Array.isArray(alumnoIds) || alumnoIds.some((id) => typeof id !== 'string')) {
    error(res, 400, 'Se espera una lista de compañeros');
    return;
  }

  try {
    const [equipos, alumnos] = await Promise.all([
      equiposDeDinamica(dinamicaId),
      getAlumnosDeGrupo(grupoId),
    ]);
    const equipo = equipos[0];
    if (!equipo) {
      error(res, 404, 'Esta partida no tiene equipo');
      return;
    }

    // Que sean de ESTE grupo: el id viene del cliente y sin esto se podría
    // meter a cualquiera con una petición a mano.
    const delGrupo = new Set(alumnos.map((a) => a.alumno.id!));
    const nuevos = (alumnoIds as string[]).filter((id) => delGrupo.has(id));
    if (nuevos.length === 0) {
      error(res, 400, 'Ninguno de ellos es de tu grupo');
      return;
    }

    const finales = new Set([...equipo.getMiembroIds(), ...nuevos]);
    if (finales.size > MAX_INVITADOS) {
      error(res, 409, `En una partida no caben más de ${MAX_INVITADOS} personas`);
      return;
    }

    const veniaDeOtro = await moverMiembros(equipos, equipo.id!, nuevos);
    res.json({ status: 'ok', integrantes: gente([equipo]) });

    void (async () => {
      if (veniaDeOtro) {
        await liberarHistoriasDeExmiembros(dinamicaId, equipos, equipo.id!, nuevos)
          .catch(() => {});
      }
      await difundirTablero(dinamicaId);
    })();
  } catch {
    error(res, 500, 'Error al invitar');
  }
}

/**
 * DELETE …/partidas/:dinamicaId/invitados/:alumnoId
 *
 * Quien la abrió no se puede sacar a sí mismo: sin dueño la partida se queda
 * sin nadie que responda por ella. Para eso está borrarla.
 */
export async function sacarInvitado(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId, alumnoId } = req.params;
  try {
    const [dinamica, equipos] = await Promise.all([
      cargarDinamica(dinamicaId, grupoId),
      equiposDeDinamica(dinamicaId),
    ]);
    if (!dinamica) {
      error(res, 404, 'Esa partida no existe');
      return;
    }
    if (dinamica.getPropietarioId() === alumnoId) {
      error(res, 409, 'Quien abrió la partida no se puede sacar. Bórrala si ya no la quieres.');
      return;
    }
    const equipo = equipos.find((e) => e.getMiembroIds().includes(alumnoId));
    if (!equipo) {
      res.json({ status: 'ok', integrantes: gente(equipos) });
      return;
    }

    // Los miembros vienen desplegados de `equiposDeDinamica`: se filtran los
    // objetos y no los ids, para poder devolver los nombres sin releer nada.
    const quedan = equipo.getMiembros().filter((m) => m.id !== alumnoId);
    equipo.setMiembros(quedan);
    await equipo.save(null, { useMasterKey: true });

    res.json({
      status: 'ok',
      integrantes: quedan.map((m) => ({ id: m.id!, name: m.get('name') ?? '' })),
    });

    // Deja de ser responsable de lo que llevaba: una historia con dueño que ya
    // no está en el equipo es la manera silenciosa de romper la regla de un
    // responsable por historia. Sin equipo destino: se suelta en todos.
    void liberarHistoriasDeExmiembros(dinamicaId, equipos, '', [alumnoId])
      .catch(() => {})
      .then(() => difundirTablero(dinamicaId));
  } catch {
    error(res, 500, 'Error al sacar a esa persona');
  }
}

/* ------------------------------------------------------------------ */
/*  Lo que ve el profesor                                              */
/* ------------------------------------------------------------------ */

/**
 * GET /admin/grupos/:grupoId/scrum/partidas — solo lectura.
 *
 * El profesor ve QUE se practica y quién, no lo que se escribe dentro: la
 * partida es de sus alumnos y no cuenta para la clase. Sin tablero y sin
 * proyección a propósito.
 */
export async function listarPartidasDelGrupo(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  try {
    const partidas = await partidasDeGrupo(grupoId);
    const equipos = await equiposDeVarias(partidas.map((d) => d.id!));
    res.json({ status: 'ok', partidas: partidas.map((d) => fila(d, equipos)) });
  } catch {
    error(res, 500, 'Error al leer las partidas de práctica');
  }
}
