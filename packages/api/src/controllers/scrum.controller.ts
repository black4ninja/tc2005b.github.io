import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { AppUser } from '../models/AppUser.js';
import { Grupo } from '../models/Grupo.js';
import { EtapaScrum } from '../models/EtapaScrum.js';
import { DinamicaScrum } from '../models/DinamicaScrum.js';
import { EquipoScrum } from '../models/EquipoScrum.js';
import { HistoriaUsuario } from '../models/HistoriaUsuario.js';
import { normalizarColor, PALETA_CATEGORIAS } from '../models/CategoriaGrupo.js';
import { getAlumnosDeGrupo } from '../services/grupo-alumno.service.js';
import {
  armarTableros,
  cargarDinamica,
  cargarEquipo,
  colorParaEquipo,
  dinamicasDeGrupo,
  equiposDeDinamica,
  etapasDeGrupo,
  historiasDeEquipos,
  difundirTablero,
} from '../services/scrum.service.js';

import {
  LARGO_DESCRIPCION_ETAPA, LARGO_NOMBRE, LARGO_OBJETIVO, MAX_EQUIPOS, PALETA_ETAPAS,
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

/** PUT …/dinamicas/:dinamicaId/etapa — `{ etapaId: string | null }`. */
export async function setEtapaActual(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId } = req.params;
  const { etapaId } = req.body as { etapaId?: string | null };

  try {
    const dinamica = await cargarDinamica(dinamicaId, grupoId);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }

    if (etapaId) {
      const etapas = await etapasDeGrupo(grupoId);
      const etapa = etapas.find((e) => e.id === etapaId);
      if (!etapa) {
        error(res, 404, 'Esa etapa no es de este grupo');
        return;
      }
      dinamica.setEtapaActual(etapa);
    } else {
      dinamica.setEtapaActual(null);
    }

    await dinamica.save(null, { useMasterKey: true });
    // Es el cambio que más corre: el profesor lo pulsa y a treinta tableros les
    // cambia la banda de color. Va por el bus antes de contestar.
    void difundirTablero(dinamicaId);
    res.json({ status: 'ok', dinamica: dinamica.toSafeJSON() });
  } catch {
    error(res, 500, 'Error al cambiar la etapa');
  }
}

/* ------------------------------------------------------------------ */
/*  Equipos                                                            */
/* ------------------------------------------------------------------ */

/**
 * GET …/dinamicas/:dinamicaId — el detalle: equipos con su tablero y quién se
 * ha quedado sin equipo.
 */
export async function getDinamica(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId } = req.params;
  try {
    const dinamica = await cargarDinamica(dinamicaId, grupoId);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    const [equipos, alumnos] = await Promise.all([
      equiposDeDinamica(dinamicaId),
      getAlumnosDeGrupo(grupoId),
    ]);
    const historias = await historiasDeEquipos(equipos.map((e) => e.id!));

    const asignados = new Set(equipos.flatMap((e) => e.getMiembroIds()));
    const sinEquipo = alumnos
      .filter((a) => !asignados.has(a.alumno.id!))
      .map((a) => ({
        id: a.alumno.id,
        name: a.alumno.get('name') ?? '',
        matricula: a.alumno.get('matricula') ?? '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    res.json({
      status: 'ok',
      dinamica: dinamica.toSafeJSON(),
      equipos: armarTableros(equipos, historias),
      sinEquipo,
      maxEquipos: MAX_EQUIPOS,
    });
  } catch {
    error(res, 500, 'Error al leer la dinámica');
  }
}

/** POST …/dinamicas/:dinamicaId/equipos — `{ nombre? }`. */
export async function crearEquipo(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId } = req.params;
  try {
    const dinamica = await cargarDinamica(dinamicaId, grupoId);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    const equipos = await equiposDeDinamica(dinamicaId);
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
    equipo.setObjetivo('');
    equipo.setMiembros([]);
    equipo.setOrden(equipos.length);
    await equipo.save(null, { useMasterKey: true });

    void difundirTablero(dinamicaId);
    res.status(201).json({ status: 'ok', equipo: { ...equipo.toSafeJSON(), historias: [] } });
  } catch {
    error(res, 500, 'Error al crear el equipo');
  }
}

/** PUT …/equipos/:equipoId — `{ nombre?, color?, objetivo? }`. */
export async function actualizarEquipo(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId, equipoId } = req.params;
  try {
    const dinamica = await cargarDinamica(dinamicaId, grupoId);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    const equipo = await cargarEquipo(equipoId, dinamicaId);
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
    if (req.body?.objetivo !== undefined) {
      const objetivo = String(req.body.objetivo ?? '').trim();
      if (objetivo.length > LARGO_OBJETIVO) {
        error(res, 400, `El objetivo no puede pasar de ${LARGO_OBJETIVO} caracteres`);
        return;
      }
      equipo.setObjetivo(objetivo);
    }

    await equipo.save(null, { useMasterKey: true });
    void difundirTablero(dinamicaId);
    res.json({ status: 'ok', equipo: equipo.toSafeJSON() });
  } catch {
    error(res, 500, 'Error al actualizar el equipo');
  }
}

/** DELETE …/equipos/:equipoId — se lleva por delante su tablero. */
export async function borrarEquipo(req: Request, res: Response): Promise<void> {
  const { grupoId, dinamicaId, equipoId } = req.params;
  try {
    const dinamica = await cargarDinamica(dinamicaId, grupoId);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    const equipo = await cargarEquipo(equipoId, dinamicaId);
    if (!equipo) {
      error(res, 404, 'El equipo no existe en esta dinámica');
      return;
    }
    const historias = await historiasDeEquipos([equipoId]);
    for (const h of historias) h.softDelete();
    equipo.softDelete();
    await Parse.Object.saveAll([...historias, equipo], { useMasterKey: true });

    void difundirTablero(dinamicaId);
    res.json({ status: 'ok' });
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
    const dinamica = await cargarDinamica(dinamicaId, grupoId);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    const equipos = await equiposDeDinamica(dinamicaId);
    const destino = equipos.find((e) => e.id === equipoId);
    if (!destino) {
      error(res, 404, 'El equipo no existe en esta dinámica');
      return;
    }

    // Que sean alumnos DE ESTE GRUPO: el id viene del cliente y sin esto se
    // podría meter en el equipo a cualquiera con una petición a mano.
    const delGrupo = new Set((await getAlumnosDeGrupo(grupoId)).map((a) => a.alumno.id!));
    const nuevos = (alumnoIds as string[]).filter((id) => delGrupo.has(id));
    if (nuevos.length === 0) {
      error(res, 400, 'Ninguno de esos alumnos pertenece al grupo');
      return;
    }

    const aGuardar: Parse.Object[] = [];
    const mudados = new Set(nuevos);

    for (const equipo of equipos) {
      const antes = equipo.getMiembroIds();
      if (equipo.id === equipoId) continue;
      const quedan = antes.filter((id) => !mudados.has(id));
      if (quedan.length !== antes.length) {
        equipo.setMiembros(quedan.map((id) => AppUser.createWithoutData(id) as AppUser));
        aGuardar.push(equipo);
      }
    }

    const finales = [...new Set([...destino.getMiembroIds(), ...nuevos])];
    destino.setMiembros(finales.map((id) => AppUser.createWithoutData(id) as AppUser));
    aGuardar.push(destino);
    await Parse.Object.saveAll(aGuardar, { useMasterKey: true });

    // Al salir de un equipo se dejan de ser responsable de sus historias: una
    // historia con dueño de otro equipo es exactamente lo que no puede pasar.
    await liberarHistoriasDeExmiembros(dinamicaId, equipos, equipoId, nuevos);

    void difundirTablero(dinamicaId);
    res.json({ status: 'ok' });
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
    const dinamica = await cargarDinamica(dinamicaId, grupoId);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    const equipo = await cargarEquipo(equipoId, dinamicaId);
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

    // Deja de ser responsable de lo que llevara en ESE equipo.
    const suyas = (await historiasDeEquipos([equipoId]))
      .filter((h) => h.getResponsable()?.id === alumnoId);
    for (const h of suyas) h.setResponsable(null);
    if (suyas.length > 0) await Parse.Object.saveAll(suyas, { useMasterKey: true });

    void difundirTablero(dinamicaId);
    res.json({ status: 'ok' });
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
    const dinamica = await cargarDinamica(dinamicaId, grupoId);
    if (!dinamica) {
      error(res, 404, 'La dinámica no existe en este grupo');
      return;
    }
    const [equipos, alumnos] = await Promise.all([
      equiposDeDinamica(dinamicaId),
      getAlumnosDeGrupo(grupoId),
    ]);
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
      equipo.setObjetivo('');
      equipo.setOrden(equipos.length + i);
      equipo.setMiembros(lote.map((a) => a.alumno));
      return equipo;
    });
    await Parse.Object.saveAll(nuevos, { useMasterKey: true });

    void difundirTablero(dinamicaId);
    res.status(201).json({ status: 'ok', creados: nuevos.length });
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
    await etapa.save(null, { useMasterKey: true });
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
