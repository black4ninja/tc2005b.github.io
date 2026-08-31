import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { AppUser } from '../models/AppUser.js';
import { Grupo } from '../models/Grupo.js';
import { EtapaScrum } from '../models/EtapaScrum.js';
import { DinamicaScrum } from '../models/DinamicaScrum.js';
import { EquipoScrum } from '../models/EquipoScrum.js';
import { HistoriaUsuario } from '../models/HistoriaUsuario.js';
import { normalizarColor, PALETA_CATEGORIAS } from '../models/CategoriaGrupo.js';
import { getAlumnosDeGrupo, type AlumnoConPerfil } from '../services/grupo-alumno.service.js';
import {
  construirEstadoDinamica,
  cargarDinamica,
  cargarEquipo,
  colorParaEquipo,
  asegurarSprint,
  crearSprint,
  dinamicasDeGrupo,
  equiposDeDinamica,
  etapasDeGrupo,
  historiasDeEquipos,
  difundirEtapa,
  historicoDeEquipo,
  marcadoresDeSprint,
  sprintsDeDinamica,
  difundirTablero,
} from '../services/scrum.service.js';
import {
  cerrarSprint, cobrarDeuda, fijarPlaneados, tomarCorte,
} from '../services/scrum-cierre.service.js';
import { SprintScrum } from '../models/SprintScrum.js';

import {
  LARGO_DESCRIPCION_ETAPA, LARGO_NOMBRE, LARGO_OBJETIVO, MAX_EQUIPOS, PALETA_ETAPAS,
  MOVIMIENTOS, VISIBILIDADES, type PoliticaEtapa,
} from '../constants/scrum.js';

/**
 * Configuración del módulo "Actividad de Scrum": dinámicas, equipos y etapas.
 *
 * Todo lo de aquí lo toca el PROFESOR. El alumno solo escribe en su tablero, que
 * vive en `scrum-tablero.controller`.
 *
 * La regla que más veces aparece es la misma: un alumno pertenece a UN equipo
 * dentro de una dinámica. No es un detalle de implementación —es lo que hace que
 * el tablero de un equipo sea de ese equipo— y por eso asignar a alguien lo
 * saca de donde estuviera antes en vez de rechazar la operación.
 */

/* ------------------------------------------------------------------ */
/*  Validación                                                         */
/* ------------------------------------------------------------------ */

function limpiarNombre(valor: unknown, largo = LARGO_NOMBRE): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim().replace(/\s+/g, ' ');
  if (limpio === '' || limpio.length > largo) return null;
  return limpio;
}

/** Fecha ISO opcional. Devuelve `undefined` si no vino y `null` si vino vacía. */
function leerFecha(valor: unknown): Date | null | undefined {
  if (valor === undefined) return undefined;
  if (valor === null || valor === '') return null;
  const fecha = new Date(String(valor));
  return Number.isNaN(fecha.getTime()) ? undefined : fecha;
}

function error(res: Response, codigo: number, mensaje: string): void {
  res.status(codigo).json({ status: 'error', message: mensaje });
}

/* ------------------------------------------------------------------ */
/*  Dinámicas                                                          */
/* ------------------------------------------------------------------ */

/**
 * GET /admin/grupos/:grupoId/scrum — la pantalla de entrada del módulo.
 *
 * Devuelve las dinámicas y el catálogo de etapas de una vez: la barra de etapa
 * se pinta a la vez que el listado y pedirlas por separado hacía que la barra
 * apareciera medio segundo después, ya con la página compuesta.
 */
export async function getScrumGrupo(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  try {
    const [dinamicas, etapas] = await Promise.all([
      dinamicasDeGrupo(grupoId),
      etapasDeGrupo(grupoId),
    ]);

    // Cuántos equipos y cuánta gente tiene cada dinámica, para el listado. Es
    // una consulta por todas ellas, no una por fila.
    const equipos = dinamicas.length === 0
      ? []
      : await new Parse.Query<EquipoScrum>('EquipoScrum')
        .containedIn('dinamica' as any, dinamicas.map((d) => DinamicaScrum.createWithoutData(d.id!)) as any)
        .equalTo('exists' as any, true as any)
        .limit(1000)
        .find({ useMasterKey: true });

    const conteo = new Map<string, { equipos: number; alumnos: number }>();
    for (const e of equipos) {
      const id = e.getDinamicaId();
      const acum = conteo.get(id) ?? { equipos: 0, alumnos: 0 };
      acum.equipos += 1;
      acum.alumnos += (e.get('miembros') as unknown[] | undefined)?.length ?? 0;
      conteo.set(id, acum);
    }

    res.json({
      status: 'ok',
      dinamicas: dinamicas.map((d) => ({
        ...d.toSafeJSON(),
        ...(conteo.get(d.id!) ?? { equipos: 0, alumnos: 0 }),
      })),
      etapas: etapas.map((e) => e.toSafeJSON()),
      paleta: PALETA_ETAPAS,
    });
  } catch {
    error(res, 500, 'Error al leer las dinámicas de Scrum');
  }
}

/** POST /admin/grupos/:grupoId/scrum/dinamicas — `{ nombre, inicio?, fin? }`. */
export async function crearDinamica(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const nombre = limpiarNombre(req.body?.nombre);
  if (!nombre) {
    error(res, 400, `El nombre es requerido y no puede pasar de ${LARGO_NOMBRE} caracteres`);
    return;
  }
  const inicio = leerFecha(req.body?.inicio);
  const fin = leerFecha(req.body?.fin);

  try {
    const dinamica = new DinamicaScrum().initDefaults();
    dinamica.setGrupo(Grupo.createWithoutData(grupoId) as Grupo);
    dinamica.setNombre(nombre);
    dinamica.setCerrada(false);
    if (inicio !== undefined) dinamica.setInicio(inicio);
    if (fin !== undefined) dinamica.setFin(fin);
    await dinamica.save(null, { useMasterKey: true });
    res.status(201).json({ status: 'ok', dinamica: { ...dinamica.toSafeJSON(), equipos: 0, alumnos: 0 } });
    // Su primer sprint se abre DETRÁS de la respuesta: una dinámica sin sprint
    // no tiene dónde guardar el burndown, pero eso no lo necesita nadie en el
    // segundo siguiente a crearla, y son tres escrituras más contra una base
    // remota. Si no llegara, la primera lectura del detalle lo abre igual.
    void asegurarSprint(dinamica).catch(() => {});
  } catch {
    error(res, 500, 'Error al crear la dinámica');
  }
}

/** PUT …/dinamicas/:dinamicaId — `{ nombre?, inicio?, fin?, cerrada? }`. */
export async function actualizarDinamica(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId } = req.params;
  try {
    const dinamica = await cargarDinamica(dinamicaId, grupoId);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }

    if (req.body?.nombre !== undefined) {
      const nombre = limpiarNombre(req.body.nombre);
      if (!nombre) {
        error(res, 400, `El nombre no puede estar vacío ni pasar de ${LARGO_NOMBRE} caracteres`);
        return;
      }
      dinamica.setNombre(nombre);
    }
    const inicio = leerFecha(req.body?.inicio);
    if (inicio !== undefined) dinamica.setInicio(inicio);
    const fin = leerFecha(req.body?.fin);
    if (fin !== undefined) dinamica.setFin(fin);
    if (typeof req.body?.cerrada === 'boolean') dinamica.setCerrada(req.body.cerrada);

    await dinamica.save(null, { useMasterKey: true });
    // Cerrar una dinámica congela los tableros abiertos: quien la tenga en
    // pantalla debe enterarse sin recargar.
    void difundirTablero(dinamicaId);
    res.json({ status: 'ok', dinamica: dinamica.toSafeJSON() });
  } catch {
    error(res, 500, 'Error al actualizar la dinámica');
  }
}

/**
 * DELETE …/dinamicas/:dinamicaId
 *
 * Baja en cascada de sus equipos y sus historias. Podrían quedarse colgando
 * —nadie los consulta sin pasar por la dinámica—, pero entonces el día que se
 * repita el nombre de un sprint aparecerían tableros fantasma.
 */
export async function borrarDinamica(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId } = req.params;
  try {
    const dinamica = await cargarDinamica(dinamicaId, grupoId);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    const equipos = await equiposDeDinamica(dinamicaId);
    const historias = await historiasDeEquipos(equipos.map((e) => e.id!));
    for (const h of historias) h.softDelete();
    for (const e of equipos) e.softDelete();
    dinamica.softDelete();
    await Parse.Object.saveAll([...historias, ...equipos, dinamica], { useMasterKey: true });
    res.json({ status: 'ok' });
  } catch {
    error(res, 500, 'Error al borrar la dinámica');
  }
}

/**
 * PUT …/dinamicas/:dinamicaId/etapa — `{ etapaId: string | null }`.
 *
 * Cambiar de etapa no es solo repintar una banda: es el único momento en el que
 * ocurre el ritual del ciclo. Al SALIR de una etapa que cobra deuda —el
 * planning— se fija cuánto se comprometió cada equipo y se le devuelven al
 * backlog las historias que no le caben por el bloqueo que arrastra. Y al
 * ENTRAR en cualquiera se toma el corte del burndown, que es el ritmo al que la
 * actividad pide «actualicen su burndown chart».
 */
export async function setEtapaActual(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId } = req.params;
  const { etapaId } = req.body as { etapaId?: string | null };

  try {
    // Las dos lecturas en paralelo: en fila india eran dos viajes a una base
    // remota antes de siquiera empezar.
    const [dinamica, etapas] = await Promise.all([
      cargarDinamica(dinamicaId, grupoId),
      etapasDeGrupo(grupoId),
    ]);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    const anterior = dinamica.getEtapaActual();
    const nueva = etapaId ? etapas.find((e) => e.id === etapaId) : null;
    if (etapaId && !nueva) {
      error(res, 404, 'Esa etapa no es de este grupo');
      return;
    }

    const sprint = dinamica.getSprintActual();
    const anteriorViva = anterior ? etapas.find((e) => e.id === anterior.id) : null;

    dinamica.setEtapaActual(nueva ?? null);
    dinamica.setEtapaIniciadaEn(nueva ? new Date() : null);

    /*
     * Aquí se avisa y se contesta ANTES de guardar, y es deliberado.
     *
     * Cambiar de etapa es el gesto que más corre en clase: el profesor lo pulsa
     * con treinta personas mirando y lo que cambia es la INSTRUCCIÓN que todos
     * tienen en pantalla. Esperar a la escritura contra una base remota es medio
     * segundo largo en el que ni él sabe si su clic llegó ni a nadie le ha
     * cambiado nada, y lo que hace entonces es volver a pulsar.
     *
     * El aviso no cuesta ninguna consulta —todo lo que lleva ya está en
     * memoria—, así que sale primero. La escritura y el resto del ritual van
     * detrás; si la escritura fallara, la difusión completa que viene después
     * devuelve a todas las pantallas el estado de verdad.
     */
    difundirEtapa(dinamica, nueva ?? null);
    res.json({ status: 'ok', dinamica: dinamica.toSafeJSON() });

    void (async () => {
      try {
        await dinamica.save(null, { useMasterKey: true });
        await ritualDeEtapa(
          dinamicaId, sprint?.id ?? null, anteriorViva, nueva?.getNombre() ?? null,
        );
      } catch {
        await difundirTablero(dinamicaId);
      }
    })();
  } catch {
    error(res, 500, 'Error al cambiar la etapa');
  }
}

/**
 * Lo que ocurre al cambiar de etapa y no hace falta que el profesor espere.
 *
 * Al SALIR de la etapa que cobra deuda —el planning— se le devuelven al backlog
 * a cada equipo las historias que no le caben por su bloqueo, y se fija cuánto
 * se comprometió de verdad. Al ENTRAR en cualquiera se toma el corte del
 * burndown. Todo con UNA lectura de historias para todos los equipos y en
 * paralelo: antes era una consulta por equipo y por paso, en fila india.
 */
async function ritualDeEtapa(
  dinamicaId: string,
  sprintId: string | null,
  anterior: EtapaScrum | null | undefined,
  etiqueta: string | null,
): Promise<void> {
  if (!sprintId) return;
  try {
    const equipos = await equiposDeDinamica(dinamicaId);
    if (equipos.length === 0) return;

    const cobra = anterior?.getPolitica().cobraDeuda === true;
    if (cobra) {
      const historias = await historiasDeEquipos(equipos.map((e) => e.id!));
      const porEquipo = new Map<string, typeof historias>();
      for (const h of historias) {
        const suyas = porEquipo.get(h.getEquipoId()) ?? [];
        suyas.push(h);
        porEquipo.set(h.getEquipoId(), suyas);
      }
      await Promise.all(equipos.map(async (equipo) => {
        const suyas = porEquipo.get(equipo.id!) ?? [];
        const cobro = await cobrarDeuda(equipo, suyas);
        await fijarPlaneados(sprintId, equipo.id!, cobro?.puntos ?? 0, suyas);
      }));
    }

    if (etiqueta) {
      // Después del cobro: el corte tiene que reflejar lo que al equipo le
      // queda de verdad, no lo que llegó a escribir antes de que se lo quitaran.
      const historias = await historiasDeEquipos(equipos.map((e) => e.id!));
      const porEquipo = new Map<string, typeof historias>();
      for (const h of historias) {
        const suyas = porEquipo.get(h.getEquipoId()) ?? [];
        suyas.push(h);
        porEquipo.set(h.getEquipoId(), suyas);
      }
      await Promise.all(equipos.map((equipo) =>
        tomarCorte(sprintId, equipo.id!, etiqueta, porEquipo.get(equipo.id!) ?? [])));
    }

    // Segunda difusión: la primera llevó la etapa, esta lleva las consecuencias.
    await difundirTablero(dinamicaId);
  } catch { /* el tablero se pone al día en el siguiente refresco */ }
}

/* ------------------------------------------------------------------ */
/*  Equipos                                                            */
/* ------------------------------------------------------------------ */

/**
 * La foto de los equipos y de quién sigue sin equipo, construida con lo que ya
 * está en memoria.
 *
 * Se devuelve en la respuesta de cada cambio para que el panel no tenga que
 * volver a pedir el detalle entero. Armar equipos es el momento de la sesión con
 * la clase esperando y son treinta gestos seguidos: pagar una recarga completa
 * por cada uno era lo que lo hacía lento.
 *
 * NO trae historias: el reparto no las toca y el cliente conserva las que ya
 * tenía.
 *
 * Los nombres de los miembros salen de la lista del grupo, no del equipo: a
 * quien se acaba de mover se le puso como puntero sin datos y su `name` vendría
 * vacío, borrando el nombre de la ficha en el panel.
 */
function fotoDeEquipos(equipos: EquipoScrum[], alumnos: AlumnoConPerfil[]) {
  const asignados = new Set(equipos.flatMap((e) => e.getMiembroIds()));
  const porId = new Map(alumnos.map((a) => [a.alumno.id!, a.alumno]));
  return {
    equipos: equipos.map((e) => ({
      ...(e.toSafeJSON() as Record<string, unknown>),
      id: e.id!,
      miembros: e.getMiembroIds().map((id) => ({
        id,
        name: porId.get(id)?.get('name') ?? '',
        matricula: porId.get(id)?.get('matricula') ?? '',
      })),
    })),
    sinEquipo: alumnos
      .filter((a) => !asignados.has(a.alumno.id!))
      .map((a) => ({
        id: a.alumno.id,
        name: a.alumno.get('name') ?? '',
        matricula: a.alumno.get('matricula') ?? '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
  };
}

/**
 * GET …/dinamicas/:dinamicaId — el detalle: equipos con su tablero y quién se
 * ha quedado sin equipo.
 */
export async function getDinamica(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId } = req.params;
  try {
    // Tres rondas en vez de cinco: todo lo que solo necesita los ids va junto,
    // y lo que depende de los equipos o del sprint va después.
    const [dinamica, equipos, alumnos, sprints, etapas] = await Promise.all([
      cargarDinamica(dinamicaId, grupoId),
      equiposDeDinamica(dinamicaId),
      getAlumnosDeGrupo(grupoId),
      sprintsDeDinamica(dinamicaId),
      // El catálogo de etapas viaja con el detalle porque la barra para
      // cambiarlas vive también aquí dentro, junto a los demás mandos.
      etapasDeGrupo(grupoId),
    ]);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    // Si la dinámica venía sin sprint, el que se acaba de abrir no está en la
    // lista que se leyó arriba: se añade a mano en vez de volver a preguntar.
    const actual = await asegurarSprint(dinamica);
    if (actual && !sprints.some((sp) => sp.id === actual.id)) sprints.push(actual);

    // Los tableros se arman con el MISMO constructor que ve el alumno y la
    // proyección. Antes aquí se pegaban solo las historias, así que a los
    // equipos les faltaban las épicas y la pestaña «Tableros» reventaba entera
    // al intentar recorrerlas.
    const [estado, marcadores] = await Promise.all([
      construirEstadoDinamica(dinamicaId, { dinamica, equipos }),
      actual ? marcadoresDeSprint(actual.id!) : Promise.resolve([]),
    ]);

    res.json({
      status: 'ok',
      dinamica: dinamica.toSafeJSON(),
      etapas: etapas.map((e) => e.toSafeJSON()),
      equipos: estado?.equipos ?? [],
      sinEquipo: fotoDeEquipos(equipos, alumnos).sinEquipo,
      maxEquipos: MAX_EQUIPOS,
      sprints: sprints.map((sp) => sp.toSafeJSON()),
      sprintActual: actual?.id ?? null,
      marcadores: marcadores.map((m) => m.toSafeJSON()),
    });
  } catch {
    error(res, 500, 'Error al leer la dinámica');
  }
}

/** POST …/dinamicas/:dinamicaId/equipos — `{ nombre? }`. */
export async function crearEquipo(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId } = req.params;
  try {
    const [dinamica, equipos, alumnos] = await Promise.all([
      cargarDinamica(dinamicaId, grupoId),
      equiposDeDinamica(dinamicaId),
      getAlumnosDeGrupo(grupoId),
    ]);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    if (equipos.length >= MAX_EQUIPOS) {
      // El tope no es técnico: es lo que cabe legible en la proyección.
      error(res, 409, `Una dinámica no puede tener más de ${MAX_EQUIPOS} equipos`);
      return;
    }

    const nombre = limpiarNombre(req.body?.nombre) ?? `Equipo ${equipos.length + 1}`;
    const equipo = new EquipoScrum().initDefaults();
    equipo.setDinamica(DinamicaScrum.createWithoutData(dinamicaId) as DinamicaScrum);
    equipo.setNombre(nombre);
    equipo.setColor(normalizarColor(req.body?.color) ?? colorParaEquipo(equipos.length));
    equipo.setMiembros([]);
    equipo.setOrden(equipos.length);
    await equipo.save(null, { useMasterKey: true });

    res.status(201).json({
      status: 'ok',
      equipo: { ...equipo.toSafeJSON(), historias: [], epicas: [], retro: [], compromisos: [], marcador: null, archivadas: 0 },
      ...fotoDeEquipos([...equipos, equipo], alumnos),
    });
    void difundirTablero(dinamicaId);
  } catch {
    error(res, 500, 'Error al crear el equipo');
  }
}

/** PUT …/equipos/:equipoId — `{ nombre?, color? }`. */
export async function actualizarEquipo(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId, equipoId } = req.params;
  try {
    const [dinamica, equipo] = await Promise.all([
      cargarDinamica(dinamicaId, grupoId),
      cargarEquipo(equipoId, dinamicaId),
    ]);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    if (!equipo) {
      error(res, 404, 'El equipo no existe en esta dinámica');
      return;
    }

    if (req.body?.nombre !== undefined) {
      const nombre = limpiarNombre(req.body.nombre);
      if (!nombre) {
        error(res, 400, `El nombre no puede estar vacío ni pasar de ${LARGO_NOMBRE} caracteres`);
        return;
      }
      equipo.setNombre(nombre);
    }
    if (req.body?.color !== undefined) {
      const color = normalizarColor(req.body.color);
      if (!color) {
        error(res, 400, 'El color no es un hexadecimal válido');
        return;
      }
      equipo.setColor(color);
    }
    await equipo.save(null, { useMasterKey: true });
    const [equipos, alumnos] = await Promise.all([
      equiposDeDinamica(dinamicaId),
      getAlumnosDeGrupo(grupoId),
    ]);
    res.json({
      status: 'ok',
      equipo: equipo.toSafeJSON(),
      ...fotoDeEquipos(equipos.map((e) => (e.id === equipoId ? equipo : e)), alumnos),
    });
    void difundirTablero(dinamicaId);
  } catch {
    error(res, 500, 'Error al actualizar el equipo');
  }
}

/** DELETE …/equipos/:equipoId — se lleva por delante su tablero. */
export async function borrarEquipo(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId, equipoId } = req.params;
  try {
    // Todo lo que hay que mirar, de una: el equipo, sus historias, los demás
    // equipos y la lista del grupo. En fila india eran cinco viajes a Atlas
    // para borrar una tarjeta.
    const [dinamica, equipo, historias, equipos, alumnos] = await Promise.all([
      cargarDinamica(dinamicaId, grupoId),
      cargarEquipo(equipoId, dinamicaId),
      historiasDeEquipos([equipoId]),
      equiposDeDinamica(dinamicaId),
      getAlumnosDeGrupo(grupoId),
    ]);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    if (!equipo) {
      error(res, 404, 'El equipo no existe en esta dinámica');
      return;
    }
    for (const h of historias) h.softDelete();
    equipo.softDelete();
    await Parse.Object.saveAll([...historias, equipo], { useMasterKey: true });

    res.json({
      status: 'ok',
      ...fotoDeEquipos(equipos.filter((e) => e.id !== equipoId), alumnos),
    });
    void difundirTablero(dinamicaId);
  } catch {
    error(res, 500, 'Error al borrar el equipo');
  }
}

/**
 * POST …/equipos/:equipoId/miembros — `{ alumnoIds: string[] }`.
 *
 * Mover a alguien a un equipo lo SACA del que tuviera en esta dinámica, en vez
 * de fallar. Es el gesto que se repite treinta veces seguidas mientras se arma
 * el reparto, y obligar a quitar antes de poner lo convertía en sesenta.
 */
export async function asignarMiembros(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId, equipoId } = req.params;
  const { alumnoIds } = req.body as { alumnoIds?: unknown };

  if (!Array.isArray(alumnoIds) || alumnoIds.some((id) => typeof id !== 'string')) {
    error(res, 400, 'Se espera una lista de alumnos');
    return;
  }

  try {
    // Las tres lecturas van juntas: en fila india eran tres viajes a una base
    // remota por cada alumno que se arrastra a un equipo.
    const [dinamica, equipos, alumnos] = await Promise.all([
      cargarDinamica(dinamicaId, grupoId),
      equiposDeDinamica(dinamicaId),
      getAlumnosDeGrupo(grupoId),
    ]);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    const destino = equipos.find((e) => e.id === equipoId);
    if (!destino) {
      error(res, 404, 'El equipo no existe en esta dinámica');
      return;
    }

    // Que sean alumnos DE ESTE GRUPO: el id viene del cliente y sin esto se
    // podría meter en el equipo a cualquiera con una petición a mano.
    const delGrupo = new Set(alumnos.map((a) => a.alumno.id!));
    const nuevos = (alumnoIds as string[]).filter((id) => delGrupo.has(id));
    if (nuevos.length === 0) {
      error(res, 400, 'Ninguno de esos alumnos pertenece al grupo');
      return;
    }

    const aGuardar: Parse.Object[] = [];
    const mudados = new Set(nuevos);
    let veniaDeOtroEquipo = false;

    for (const equipo of equipos) {
      const antes = equipo.getMiembroIds();
      if (equipo.id === equipoId) continue;
      const quedan = antes.filter((id) => !mudados.has(id));
      if (quedan.length !== antes.length) {
        veniaDeOtroEquipo = true;
        equipo.setMiembros(quedan.map((id) => AppUser.createWithoutData(id) as AppUser));
        aGuardar.push(equipo);
      }
    }

    const finales = [...new Set([...destino.getMiembroIds(), ...nuevos])];
    destino.setMiembros(finales.map((id) => AppUser.createWithoutData(id) as AppUser));
    aGuardar.push(destino);
    await Parse.Object.saveAll(aGuardar, { useMasterKey: true });

    // La foto sale de lo que ya está en memoria: el panel no tiene que volver a
    // pedir el detalle entero por cada alumno que se mueve.
    res.json({ status: 'ok', ...fotoDeEquipos(equipos, alumnos) });

    // Al salir de un equipo se deja de ser responsable de sus historias: una
    // historia con dueño de otro equipo es exactamente lo que no puede pasar.
    // Solo hace falta mirarlo si alguien venía de otro equipo, y va detrás de la
    // respuesta porque el reparto no espera a eso.
    void (async () => {
      if (veniaDeOtroEquipo) {
        await liberarHistoriasDeExmiembros(dinamicaId, equipos, equipoId, nuevos)
          .catch(() => {});
      }
      await difundirTablero(dinamicaId);
    })();
  } catch {
    error(res, 500, 'Error al asignar los alumnos');
  }
}

/**
 * Quita como responsable a quien acaba de cambiarse de equipo.
 *
 * Sin esto, mover a alguien de equipo dejaba su cara en las historias del
 * anterior, y el tablero pasaba a decir que una historia la lleva alguien que ya
 * no está ahí — que es la única manera de romper la regla de un responsable por
 * historia sin darse cuenta.
 */
async function liberarHistoriasDeExmiembros(
  dinamicaId: string,
  equipos: EquipoScrum[],
  equipoDestinoId: string,
  alumnoIds: string[],
): Promise<void> {
  const otros = equipos.filter((e) => e.id !== equipoDestinoId).map((e) => e.id!);
  if (otros.length === 0 || alumnoIds.length === 0) return;

  const q = new Parse.Query<HistoriaUsuario>('HistoriaUsuario');
  q.containedIn('equipo' as any, otros.map((id) => EquipoScrum.createWithoutData(id)) as any);
  q.containedIn('responsable' as any, alumnoIds.map((id) => AppUser.createWithoutData(id)) as any);
  q.equalTo('exists' as any, true as any);
  q.limit(1000);
  const huerfanas = await q.find({ useMasterKey: true });
  if (huerfanas.length === 0) return;
  for (const h of huerfanas) h.setResponsable(null);
  await Parse.Object.saveAll(huerfanas, { useMasterKey: true });
  void difundirTablero(dinamicaId);
}

/** DELETE …/equipos/:equipoId/miembros/:alumnoId */
export async function quitarMiembro(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId, equipoId, alumnoId } = req.params;
  try {
    const [dinamica, equipos, alumnos] = await Promise.all([
      cargarDinamica(dinamicaId, grupoId),
      equiposDeDinamica(dinamicaId),
      getAlumnosDeGrupo(grupoId),
    ]);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    const equipo = equipos.find((e) => e.id === equipoId);
    if (!equipo) {
      error(res, 404, 'El equipo no existe en esta dinámica');
      return;
    }
    equipo.setMiembros(
      equipo.getMiembroIds()
        .filter((id) => id !== alumnoId)
        .map((id) => AppUser.createWithoutData(id) as AppUser),
    );
    await equipo.save(null, { useMasterKey: true });
    res.json({ status: 'ok', ...fotoDeEquipos(equipos, alumnos) });

    // Deja de ser responsable de lo que llevara en ESE equipo. Detrás de la
    // respuesta: quitar a alguien de un equipo no espera a eso.
    void (async () => {
      try {
        const suyas = (await historiasDeEquipos([equipoId]))
          .filter((h) => h.getResponsable()?.id === alumnoId);
        for (const h of suyas) h.setResponsable(null);
        if (suyas.length > 0) await Parse.Object.saveAll(suyas, { useMasterKey: true });
      } catch { /* el tablero se pone al día en el siguiente refresco */ }
      await difundirTablero(dinamicaId);
    })();
  } catch {
    error(res, 500, 'Error al quitar al alumno del equipo');
  }
}

/**
 * Reparto en equipos de `tamano`. Función PURA para poder probarla: es donde se
 * decide cuánta gente cae en cada equipo y el resto se reparte de uno en uno en
 * vez de dejar un último equipo de una sola persona.
 */
export function repartirEnEquipos<T>(alumnos: T[], tamano: number): T[][] {
  if (alumnos.length === 0 || tamano < 1) return [];
  const cuantos = Math.max(1, Math.round(alumnos.length / tamano));
  const equipos: T[][] = Array.from({ length: cuantos }, () => []);
  // En rueda y no en bloques: con 13 personas en equipos de 5 sale 5-4-4 en vez
  // de 5-5-3, que es lo que nadie quiere ser.
  alumnos.forEach((a, i) => equipos[i % cuantos].push(a));
  return equipos;
}

/** POST …/dinamicas/:dinamicaId/repartir — `{ tamano }`. Solo a los sin equipo. */
export async function repartirAlumnos(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId } = req.params;
  const tamano = Number(req.body?.tamano ?? 5);
  if (!Number.isInteger(tamano) || tamano < 2 || tamano > 10) {
    error(res, 400, 'El tamaño del equipo debe ser un número entre 2 y 10');
    return;
  }

  try {
    const [dinamica, equipos, alumnos] = await Promise.all([
      cargarDinamica(dinamicaId, grupoId),
      equiposDeDinamica(dinamicaId),
      getAlumnosDeGrupo(grupoId),
    ]);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    const asignados = new Set(equipos.flatMap((e) => e.getMiembroIds()));
    const sueltos = alumnos.filter((a) => !asignados.has(a.alumno.id!));
    if (sueltos.length === 0) {
      error(res, 409, 'No queda nadie sin equipo');
      return;
    }

    const lotes = repartirEnEquipos(sueltos, tamano);
    if (equipos.length + lotes.length > MAX_EQUIPOS) {
      error(res, 409, `No caben: saldrían más de ${MAX_EQUIPOS} equipos`);
      return;
    }

    const nuevos = lotes.map((lote, i) => {
      const equipo = new EquipoScrum().initDefaults();
      equipo.setDinamica(DinamicaScrum.createWithoutData(dinamicaId) as DinamicaScrum);
      equipo.setNombre(`Equipo ${equipos.length + i + 1}`);
      equipo.setColor(colorParaEquipo(equipos.length + i));
        equipo.setOrden(equipos.length + i);
      equipo.setMiembros(lote.map((a) => a.alumno));
      return equipo;
    });
    await Parse.Object.saveAll(nuevos, { useMasterKey: true });

    res.status(201).json({
      status: 'ok',
      creados: nuevos.length,
      ...fotoDeEquipos([...equipos, ...nuevos], alumnos),
    });
    void difundirTablero(dinamicaId);
  } catch {
    error(res, 500, 'Error al repartir los alumnos');
  }
}

/* ------------------------------------------------------------------ */
/*  Catálogo de etapas                                                 */
/* ------------------------------------------------------------------ */

/** POST …/scrum/etapas — `{ nombre, color?, pista? }`. */
export async function crearEtapa(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const nombre = limpiarNombre(req.body?.nombre, 40);
  if (!nombre) {
    error(res, 400, 'El nombre de la etapa es requerido y no puede pasar de 40 caracteres');
    return;
  }
  try {
    const etapas = await etapasDeGrupo(grupoId);
    if (etapas.some((e) => e.getNombre().toLowerCase() === nombre.toLowerCase())) {
      error(res, 409, 'Ya hay una etapa con ese nombre');
      return;
    }
    const etapa = new EtapaScrum().initDefaults();
    etapa.setGrupo(Grupo.createWithoutData(grupoId) as Grupo);
    etapa.setNombre(nombre);
    etapa.setColor(normalizarColor(req.body?.color) ?? PALETA_ETAPAS[etapas.length % PALETA_ETAPAS.length]);
    etapa.setPista(String(req.body?.pista ?? '').trim().slice(0, LARGO_DESCRIPCION_ETAPA));
    const politicaNueva = leerPolitica(req.body?.politica);
    if (typeof politicaNueva === 'string') {
      error(res, 400, politicaNueva);
      return;
    }
    etapa.setPolitica(politicaNueva);
    etapa.setOrden(etapas.length);
    await etapa.save(null, { useMasterKey: true });
    res.status(201).json({ status: 'ok', etapa: etapa.toSafeJSON() });
  } catch {
    error(res, 500, 'Error al crear la etapa');
  }
}

/** PUT …/scrum/etapas/:etapaId — `{ nombre?, color?, pista? }`. */
export async function actualizarEtapa(req: Request, res: Response): Promise<void> {
  const { grupoId, etapaId } = req.params;
  try {
    const etapas = await etapasDeGrupo(grupoId);
    const etapa = etapas.find((e) => e.id === etapaId);
    if (!etapa) {
      error(res, 404, 'Esa etapa no es de este grupo');
      return;
    }
    if (req.body?.nombre !== undefined) {
      const nombre = limpiarNombre(req.body.nombre, 40);
      if (!nombre) {
        error(res, 400, 'El nombre no puede estar vacío ni pasar de 40 caracteres');
        return;
      }
      etapa.setNombre(nombre);
    }
    if (req.body?.color !== undefined) {
      const color = normalizarColor(req.body.color);
      if (!color) {
        error(res, 400, 'El color no es un hexadecimal válido');
        return;
      }
      etapa.setColor(color);
    }
    if (req.body?.pista !== undefined) {
      etapa.setPista(String(req.body.pista ?? '').trim().slice(0, LARGO_DESCRIPCION_ETAPA));
    }
    if (req.body?.politica !== undefined) {
      const politica = leerPolitica(req.body.politica);
      if (typeof politica === 'string') {
        error(res, 400, politica);
        return;
      }
      etapa.setPolitica(politica);
    }
    await etapa.save(null, { useMasterKey: true });
    // Cambiar lo que deja tocar la etapa EN CURSO cambia el tablero de todos.
    const dinamicas = await dinamicasDeGrupo(grupoId);
    for (const d of dinamicas) {
      if (d.getEtapaActual()?.id === etapaId) void difundirTablero(d.id!);
    }
    res.json({ status: 'ok', etapa: etapa.toSafeJSON() });
  } catch {
    error(res, 500, 'Error al actualizar la etapa');
  }
}

/**
 * DELETE …/scrum/etapas/:etapaId
 *
 * Si alguna dinámica la tenía señalada se queda sin etapa en vez de apuntar a
 * algo borrado: la banda del alumno desaparece, que es honesto.
 */
export async function borrarEtapa(req: Request, res: Response): Promise<void> {
  const { grupoId, etapaId } = req.params;
  try {
    const etapas = await etapasDeGrupo(grupoId);
    const etapa = etapas.find((e) => e.id === etapaId);
    if (!etapa) {
      error(res, 404, 'Esa etapa no es de este grupo');
      return;
    }
    const usandola = (await dinamicasDeGrupo(grupoId))
      .filter((d) => d.getEtapaActual()?.id === etapaId);
    for (const d of usandola) d.setEtapaActual(null);
    etapa.softDelete();
    await Parse.Object.saveAll([...usandola, etapa], { useMasterKey: true });
    for (const d of usandola) void difundirTablero(d.id!);
    res.json({ status: 'ok' });
  } catch {
    error(res, 500, 'Error al borrar la etapa');
  }
}

/* ------------------------------------------------------------------ */
/*  Sprints                                                            */
/* ------------------------------------------------------------------ */

/**
 * POST …/dinamicas/:dinamicaId/sprints — abre la siguiente iteración.
 *
 * El profesor abre los que quiera: la actividad trae cuatro, pero el objetivo
 * de los primeros sale de la presentación y a partir de ahí queda vacío para
 * que lo escriba. No se abre uno nuevo con el anterior sin cerrar: el bloqueo
 * de un sprint se calcula al cerrarlo, y sin ese número el siguiente no puede
 * cobrar nada.
 */
export async function crearSprintCtrl(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId } = req.params;
  try {
    const dinamica = await cargarDinamica(dinamicaId, grupoId);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    const actual = dinamica.getSprintActual();
    if (actual) {
      const vivo = await new Parse.Query<SprintScrum>('SprintScrum')
        .get(actual.id!, { useMasterKey: true }).catch(() => null);
      if (vivo && !vivo.getCerrado()) {
        error(res, 409, 'Cierra el sprint en curso antes de abrir el siguiente');
        return;
      }
    }

    const objetivo = typeof req.body?.objetivo === 'string' ? req.body.objetivo.trim() : undefined;
    const sprint = await crearSprint(dinamicaId, objetivo || undefined);
    dinamica.setSprintActual(sprint);
    await dinamica.save(null, { useMasterKey: true });

    void difundirTablero(dinamicaId);
    res.status(201).json({ status: 'ok', sprint: sprint.toSafeJSON() });
  } catch {
    error(res, 500, 'Error al abrir el sprint');
  }
}

/** PUT …/sprints/:sprintId — `{ objetivo }`. El objetivo es de todo el grupo. */
export async function actualizarSprint(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId, sprintId } = req.params;
  try {
    const dinamica = await cargarDinamica(dinamicaId, grupoId);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    const sprint = await new Parse.Query<SprintScrum>('SprintScrum')
      .get(sprintId, { useMasterKey: true }).catch(() => null);
    if (!sprint || sprint.getDinamicaId() !== dinamicaId) {
      error(res, 404, 'Ese sprint no es de esta dinámica');
      return;
    }
    if (req.body?.objetivo !== undefined) {
      const objetivo = String(req.body.objetivo ?? '').trim();
      if (objetivo.length > LARGO_OBJETIVO) {
        error(res, 400, `El objetivo no puede pasar de ${LARGO_OBJETIVO} caracteres`);
        return;
      }
      sprint.setObjetivo(objetivo);
    }
    await sprint.save(null, { useMasterKey: true });
    void difundirTablero(dinamicaId);
    res.json({ status: 'ok', sprint: sprint.toSafeJSON() });
  } catch {
    error(res, 500, 'Error al actualizar el sprint');
  }
}

/**
 * POST …/sprints/:sprintId/cerrar — `{ penalizaciones: { equipoId: n } }`.
 *
 * Las penalizaciones las trae el profesor del review, donde el PO de cada
 * equipo cuenta cuántas restricciones no se cumplieron. No se deducen solas:
 * comprobar si un modelo mide más de diez centímetros es justo lo que un
 * sistema no puede hacer.
 */
export async function cerrarSprintCtrl(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId, sprintId } = req.params;
  const { penalizaciones } = req.body as { penalizaciones?: Record<string, unknown> };

  const limpias: Record<string, number> = {};
  for (const [id, valor] of Object.entries(penalizaciones ?? {})) {
    const n = Number(valor);
    if (!Number.isFinite(n) || n < 0 || n > 99) {
      error(res, 400, 'Las penalizaciones deben ser números entre 0 y 99');
      return;
    }
    limpias[id] = Math.trunc(n);
  }

  try {
    const dinamica = await cargarDinamica(dinamicaId, grupoId);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    const sprint = await new Parse.Query<SprintScrum>('SprintScrum')
      .get(sprintId, { useMasterKey: true }).catch(() => null);
    if (!sprint || sprint.getDinamicaId() !== dinamicaId) {
      error(res, 404, 'Ese sprint no es de esta dinámica');
      return;
    }
    if (sprint.getCerrado()) {
      error(res, 409, 'Ese sprint ya está cerrado');
      return;
    }

    const cierre = await cerrarSprint(dinamicaId, sprintId, limpias);
    void difundirTablero(dinamicaId);
    res.json({ status: 'ok', cierre });
  } catch {
    error(res, 500, 'Error al cerrar el sprint');
  }
}

/** POST …/dinamicas/:dinamicaId/finalizar — cada equipo pasa a ver su resumen. */
export async function finalizarDinamica(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId } = req.params;
  try {
    const dinamica = await cargarDinamica(dinamicaId, grupoId);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    dinamica.setFinalizada(true);
    dinamica.setCerrada(true);
    dinamica.setEtapaActual(null);
    dinamica.setEtapaIniciadaEn(null);
    await dinamica.save(null, { useMasterKey: true });
    void difundirTablero(dinamicaId);
    res.json({ status: 'ok', dinamica: dinamica.toSafeJSON() });
  } catch {
    error(res, 500, 'Error al finalizar la dinámica');
  }
}

/* ------------------------------------------------------------------ */
/*  Definición de terminado y restricciones                            */
/* ------------------------------------------------------------------ */

function limpiarLista(valor: unknown, largo = 160): string[] | null {
  if (!Array.isArray(valor)) return null;
  const items = valor
    .map((v) => String(v ?? '').trim().replace(/\s+/g, ' '))
    .filter((v) => v !== '')
    .map((v) => v.slice(0, largo));
  return items.slice(0, 30);
}

/** PUT …/dinamicas/:dinamicaId/reglas — `{ definicionDone?, restricciones? }`. */
export async function setReglas(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId } = req.params;
  try {
    const dinamica = await cargarDinamica(dinamicaId, grupoId);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    if (req.body?.definicionDone !== undefined) {
      const lista = limpiarLista(req.body.definicionDone);
      if (!lista) {
        error(res, 400, 'La definición de terminado debe ser una lista de textos');
        return;
      }
      dinamica.setDefinicionDone(lista);
    }
    if (req.body?.restricciones !== undefined) {
      const lista = limpiarLista(req.body.restricciones);
      if (!lista) {
        error(res, 400, 'Las restricciones deben ser una lista de textos');
        return;
      }
      dinamica.setRestricciones(lista);
    }
    await dinamica.save(null, { useMasterKey: true });
    void difundirTablero(dinamicaId);
    res.json({ status: 'ok', dinamica: dinamica.toSafeJSON() });
  } catch {
    error(res, 500, 'Error al guardar las reglas');
  }
}

/* ------------------------------------------------------------------ */
/*  Resumen final                                                      */
/* ------------------------------------------------------------------ */

/** GET …/dinamicas/:dinamicaId/resumen — el histórico de todos los equipos. */
export async function getResumen(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId } = req.params;
  try {
    const dinamica = await cargarDinamica(dinamicaId, grupoId);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    const equipos = await equiposDeDinamica(dinamicaId);
    const resumenes = await Promise.all(
      equipos.map(async (e) => ({
        equipo: e.toSafeJSON(),
        historico: (await historicoDeEquipo(e.id!)).map((m) => m.toSafeJSON()),
      })),
    );
    res.json({ status: 'ok', dinamica: dinamica.toSafeJSON(), resumenes });
  } catch {
    error(res, 500, 'Error al leer el resumen');
  }
}

/* ------------------------------------------------------------------ */
/*  Política de la etapa                                               */
/* ------------------------------------------------------------------ */

/** Valida el trozo de política que venga en el cuerpo. */
export function leerPolitica(valor: unknown): Partial<PoliticaEtapa> | string {
  if (valor === undefined) return {};
  if (typeof valor !== 'object' || valor === null) return 'La política no es válida';
  const p = valor as Record<string, unknown>;
  const salida: Partial<PoliticaEtapa> = {};

  for (const campo of ['backlog', 'sprint'] as const) {
    if (p[campo] === undefined) continue;
    if (!(VISIBILIDADES as readonly string[]).includes(String(p[campo]))) {
      return `«${campo}» debe ser: ${VISIBILIDADES.join(', ')}`;
    }
    salida[campo] = p[campo] as PoliticaEtapa['backlog'];
  }
  if (p.movimientos !== undefined) {
    if (!(MOVIMIENTOS as readonly string[]).includes(String(p.movimientos))) {
      return `«movimientos» debe ser: ${MOVIMIENTOS.join(', ')}`;
    }
    salida.movimientos = p.movimientos as PoliticaEtapa['movimientos'];
  }
  for (const campo of ['burndown', 'retro', 'cobraDeuda'] as const) {
    if (typeof p[campo] === 'boolean') salida[campo] = p[campo] as boolean;
  }
  if (p.duracionSegundos !== undefined) {
    if (p.duracionSegundos === null) {
      salida.duracionSegundos = null;
    } else {
      const n = Number(p.duracionSegundos);
      if (!Number.isFinite(n) || n < 5 || n > 3600) {
        return 'La duración debe ir entre 5 segundos y una hora';
      }
      salida.duracionSegundos = Math.trunc(n);
    }
  }
  return salida;
}
