import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { Grupo } from '../models/Grupo.js';
import { AppUser } from '../models/AppUser.js';
import { Coleccion } from '../models/Coleccion.js';
import { Pregunta } from '../models/Pregunta.js';
import { PreguntaAsignacion } from '../models/PreguntaAsignacion.js';
import { getAlumnosDeGrupo } from '../services/grupo-alumno.service.js';
import { coleccionesDeGrupo } from '../services/grupo-colecciones.service.js';
import { normalizarDuracion } from '../services/preguntas.service.js';
import { usoDePreguntas } from '../services/preguntas-uso.service.js';
import { DURACION_POR_DEFECTO, MAX_INTENTOS } from '../constants/preguntas.js';

/**
 * Asignación de preguntas a los alumnos de UN grupo.
 *
 * Va aparte del CRUD del banco porque cambia el actor: el banco lo mantiene el
 * admin dentro de la colección, y esto lo usa el PROFESOR en su grupo
 * (`requireGrupoAccess`). Por eso el listado sirve también el banco: el profesor
 * lo necesita para asignar y no tiene permiso sobre `/admin/colecciones/...`.
 *
 * La regla que gobierna el módulo vive aquí: **una pregunta por competencia,
 * alumno e INTENTO**. Cada competencia admite hasta `MAX_INTENTOS` entrevistas
 * —la segunda es la oportunidad de quien no salió bien en la primera—, y asignar
 * otra pregunta al mismo hueco sustituye a la que estaba.
 *
 * Lo que NO hay es unicidad: la misma pregunta puede tocarle a varios alumnos,
 * del mismo grupo o de otros. Se probó a impedirlo y sobraba —obligaba a tener
 * tantas preguntas como alumnos por competencia—; el sistema se limita a decir
 * a cuántos se la has puesto ya y la decisión de variar es del profesor.
 *
 * Nada de esto tiene read-path de alumno. No es que esté oculto por permisos:
 * es que no existe el endpoint.
 */

/** Tope de una asignación en bloque. Un grupo grande ronda los 40 alumnos. */
const MAX_BULK = 500;

/**
 * Las preguntas sin competencia comparten un hueco propio: también van por
 * intento, porque si no «una por competencia» dejaría una puerta abierta sin
 * regla.
 */
const SIN_COMPETENCIA = 'sin-competencia';

/** Competencia de una pregunta, o el cajón de las que no tienen. */
function competenciaDe(pregunta: Parse.Object | undefined): string {
  return pregunta?.get('competencia')?.id ?? SIN_COMPETENCIA;
}

/** Hueco que ocupa una asignación: competencia + intento. */
function huecoDe(asignacion: PreguntaAsignacion): string {
  return `${competenciaDe(asignacion.getPregunta())}::${asignacion.getIntento()}`;
}

/** Igual, para una pregunta que todavía no se ha asignado. */
function huecoPara(pregunta: Parse.Object | undefined, intento: number): string {
  return `${competenciaDe(pregunta)}::${intento}`;
}

/**
 * Segundos que dura una pregunta: manda el grupo, si no la materia de la
 * pregunta y, si ninguna lo dice, el valor del módulo.
 *
 * Se resuelve por la colección de CADA pregunta y no una vez por grupo porque un
 * grupo puede tener el módulo encendido en dos materias con tiempos distintos;
 * la anulación del grupo, cuando existe, se las lleva todas por delante.
 */
export function duracionEfectiva(
  duracionGrupo: number | undefined,
  duracionColeccion: number | undefined,
): number {
  return duracionGrupo ?? duracionColeccion ?? DURACION_POR_DEFECTO;
}

/**
 * Colecciones del grupo con el módulo "Preguntas" encendido. Lista vacía = para
 * este grupo la sección no existe.
 */
async function coleccionesConPreguntas(grupoId: string): Promise<Parse.Object[]> {
  return coleccionesDeGrupo(grupoId, 'preguntas');
}

async function cargarGrupo(grupoId: string): Promise<Grupo | null> {
  try {
    const q = new Parse.Query<Grupo>('Grupo');
    q.equalTo('exists' as any, true as any);
    return await q.get(grupoId, { useMasterKey: true });
  } catch {
    return null;
  }
}

/**
 * Guard de escritura: el grupo tiene que tener el módulo encendido en alguna
 * colección. Responde 404 y no 403 —para ese grupo la sección no existe—, igual
 * que hacen los otros módulos opt-in.
 */
async function exigirModulo(grupoId: string, res: Response): Promise<Parse.Object[] | null> {
  const colecciones = await coleccionesConPreguntas(grupoId);
  if (colecciones.length === 0) {
    res.status(404).json({
      status: 'error',
      message: 'El módulo Preguntas no está habilitado en ninguna materia de este grupo',
    });
    return null;
  }
  return colecciones;
}

/** Todas las asignaciones vivas del grupo, de la más reciente a la más antigua. */
async function asignacionesDelGrupo(grupoId: string): Promise<PreguntaAsignacion[]> {
  const q = new Parse.Query<PreguntaAsignacion>('PreguntaAsignacion');
  q.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
  q.equalTo('exists' as any, true as any);
  q.include('pregunta' as any);
  // La competencia de la pregunta se pinta en cada fila del roster y decide en
  // qué hueco cae; sin este segundo nivel de include llegaría como un puntero.
  q.include('pregunta.competencia' as any);
  q.descending('createdAt');
  q.limit(10000);
  return q.find({ useMasterKey: true });
}

/**
 * GET /admin/grupos/:grupoId/preguntas
 *
 * TODA la pantalla en una petición: el roster con lo que lleva cada alumno por
 * competencia, el banco de las materias del grupo con su estado de uso, y la
 * configuración de tiempo. Se pintan juntas o no se pinta ninguna, y el selector
 * filtra en cliente mientras el profesor teclea.
 */
export async function getPreguntasGrupo(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  try {
    const colecciones = await coleccionesConPreguntas(grupoId);
    // Aquí SÍ se responde 200 con `habilitado: false`: esta es la pantalla que
    // tiene que explicar por qué está vacía y dónde se enciende el módulo.
    if (colecciones.length === 0) {
      res.json({
        status: 'ok', habilitado: false, alumnos: [], preguntas: [], competencias: [],
      });
      return;
    }

    const [grupo, alumnos, asignaciones, preguntas] = await Promise.all([
      cargarGrupo(grupoId),
      getAlumnosDeGrupo(grupoId),
      asignacionesDelGrupo(grupoId),
      (() => {
        const q = new Parse.Query<Pregunta>('Pregunta');
        q.containedIn(
          'coleccion' as any,
          colecciones.map((c) => Coleccion.createWithoutData(c.id!)) as any,
        );
        q.equalTo('exists' as any, true as any);
        q.notEqualTo('archivada' as any, true as any);
        q.include('competencia' as any);
        q.ascending('createdAt');
        q.limit(1000);
        return q.find({ useMasterKey: true });
      })(),
    ]);

    // Vienen de más reciente a más antigua: la primera de cada (alumno, hueco)
    // es la vigente y el resto es su historial.
    const vigentes = new Map<string, PreguntaAsignacion>();
    const totalPorAlumno = new Map<string, number>();
    for (const a of asignaciones) {
      const alumnoId = a.getAlumno()?.id;
      if (!alumnoId) continue;
      const clave = `${alumnoId}::${huecoDe(a)}`;
      if (!vigentes.has(clave)) vigentes.set(clave, a);
      totalPorAlumno.set(alumnoId, (totalPorAlumno.get(alumnoId) ?? 0) + 1);
    }

    // El banco que se sirve es el vivo MÁS las archivadas que alguien tenga
    // todavía asignadas: si no, proyectar a ese alumno se quedaría sin texto que
    // pintar. Archivar saca una pregunta del selector, no de la entrevista que
    // ya estaba puesta.
    const porIdPregunta = new Map(preguntas.map((p) => [p.id!, p]));
    for (const a of asignaciones) {
      const pregunta = a.getPregunta() as Pregunta | undefined;
      if (pregunta?.id && !porIdPregunta.has(pregunta.id)) porIdPregunta.set(pregunta.id, pregunta);
    }

    const uso = await usoDePreguntas([...porIdPregunta.keys()]);

    // Tiempo: el del grupo si lo tiene, y si no el de cada materia. Viaja ya
    // resuelto por pregunta para que el proyector no tenga que recomponerlo.
    const duracionGrupo = grupo?.getPreguntasDuracionSegundos();
    const duracionPorColeccion = new Map(
      colecciones.map((c) => [c.id!, c.get('preguntasDuracionSegundos') as number | undefined]),
    );

    // Las competencias que aparecen en el banco, para las píldoras de filtro y
    // para saber cuántos huecos tiene cada alumno. Se derivan de las preguntas y
    // no del catálogo de la materia a propósito: una competencia sin preguntas
    // no es un hueco que se pueda llenar, solo una columna vacía.
    const competencias = new Map<string, { id: string; nombre: string; total: number }>();
    for (const p of porIdPregunta.values()) {
      if (p.getArchivada()) continue;
      const c = p.getCompetencia();
      const id = c?.id ?? SIN_COMPETENCIA;
      const entrada = competencias.get(id) ?? {
        id,
        nombre: c ? (c.get('competencia') ?? '') : 'Sin competencia',
        total: 0,
      };
      entrada.total += 1;
      competencias.set(id, entrada);
    }

    res.json({
      status: 'ok',
      habilitado: true,
      duracion: {
        grupo: duracionGrupo ?? null,
        porDefecto: DURACION_POR_DEFECTO,
        materias: colecciones.map((c) => ({
          id: c.id,
          clave: c.get('clave') ?? null,
          nombre: c.get('nombre') ?? null,
          duracionSegundos: (c.get('preguntasDuracionSegundos') as number | undefined) ?? null,
        })),
      },
      alumnos: alumnos.map(({ alumno }) => ({
        id: alumno.id,
        name: alumno.get('name') ?? '',
        matricula: alumno.get('matricula') ?? '',
        email: alumno.get('email') ?? '',
        // Una por hueco: competencia × intento. El cliente las indexa por `hueco`.
        asignaciones: [...competencias.keys()]
          .flatMap((competencia) => Array.from(
            { length: MAX_INTENTOS },
            (_, i) => vigentes.get(`${alumno.id}::${competencia}::${i + 1}`),
          ))
          .filter((a): a is PreguntaAsignacion => !!a)
          .map((a) => ({ ...a.toSafeJSON(), hueco: huecoDe(a) })),
        totalAsignaciones: totalPorAlumno.get(alumno.id!) ?? 0,
      })),
      preguntas: [...porIdPregunta.values()].map((p) => ({
        ...p.toSafeJSON(),
        duracionSegundos: duracionEfectiva(duracionGrupo, duracionPorColeccion.get(p.getColeccion()?.id ?? '')),
        // A cuántos se la has puesto ya. Es una pista para variar, no un
        // candado: repetir está permitido.
        uso: uso.get(p.id!) ?? null,
      })),
      competencias: [...competencias.values()].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      maxIntentos: MAX_INTENTOS,
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener las preguntas del grupo' });
  }
}

/** GET /admin/grupos/:grupoId/preguntas/alumnos/:alumnoId — historial completo. */
export async function getHistorialAlumno(req: Request, res: Response): Promise<void> {
  const { grupoId, alumnoId } = req.params;
  if (!(await exigirModulo(grupoId, res))) return;
  try {
    const q = new Parse.Query<PreguntaAsignacion>('PreguntaAsignacion');
    q.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
    q.equalTo('alumno' as any, AppUser.createWithoutData(alumnoId) as any);
    q.equalTo('exists' as any, true as any);
    q.include('pregunta' as any);
    q.include('pregunta.competencia' as any);
    q.descending('createdAt');
    q.limit(1000);
    const historial = await q.find({ useMasterKey: true });
    res.json({ status: 'ok', historial: historial.map((a) => a.toSafeJSON()) });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener el historial' });
  }
}

/**
 * POST /admin/grupos/:grupoId/preguntas/asignaciones
 * Body: `{ asignaciones: [{ alumnoId, preguntaId, intento?, nota? }] }`
 *
 * SIEMPRE en bloque, aunque sea de uno. Los gestos de la pantalla —asignarle una
 * a alguien, repartir una competencia entre el grupo entero, elegir alumno desde
 * la propia pregunta— son la misma operación con una lista de distinta longitud,
 * y con un endpoint por gesto habría tres sitios donde arreglar la misma regla.
 */
export async function crearAsignaciones(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  const colecciones = await exigirModulo(grupoId, res);
  if (!colecciones) return;

  const entradas = req.body?.asignaciones;
  if (!Array.isArray(entradas) || entradas.length === 0) {
    res.status(400).json({ status: 'error', message: 'No hay asignaciones que guardar' });
    return;
  }
  if (entradas.length > MAX_BULK) {
    res.status(400).json({ status: 'error', message: `Como mucho ${MAX_BULK} asignaciones por llamada` });
    return;
  }

  // Normalizar TODO antes de tocar la BD: una entrada mala a mitad de la lista
  // dejaría media asignación hecha y el profesor no sabría por dónde iba.
  const normalizadas: { alumnoId: string; preguntaId: string; intento: number; nota: string }[] = [];
  const vistas = new Set<string>();
  for (const e of entradas) {
    const alumnoId = typeof e?.alumnoId === 'string' ? e.alumnoId : '';
    const preguntaId = typeof e?.preguntaId === 'string' ? e.preguntaId : '';
    if (!alumnoId || !preguntaId) {
      res.status(400).json({ status: 'error', message: 'Cada asignación necesita alumno y pregunta' });
      return;
    }
    // Ausente = primer intento, que es el caso normal.
    const intento = e?.intento === undefined || e?.intento === null ? 1 : Number(e.intento);
    if (!Number.isInteger(intento) || intento < 1 || intento > MAX_INTENTOS) {
      res.status(400).json({
        status: 'error',
        message: `El intento debe estar entre 1 y ${MAX_INTENTOS}`,
      });
      return;
    }
    vistas.add(preguntaId);
    normalizadas.push({
      alumnoId,
      preguntaId,
      intento,
      nota: typeof e?.nota === 'string' ? e.nota : '',
    });
  }

  try {
    // Los ids se comprueban contra el grupo y contra el banco de SUS materias:
    // sin esto, un cliente podría asignarle a un alumno una pregunta de una
    // colección que su grupo no tiene.
    const alumnosDelGrupo = new Set((await getAlumnosDeGrupo(grupoId)).map((a) => a.alumno.id));
    if (normalizadas.some((n) => !alumnosDelGrupo.has(n.alumnoId))) {
      res.status(400).json({ status: 'error', message: 'Hay alumnos que no pertenecen a este grupo' });
      return;
    }

    const preguntaIds = [...vistas];
    const qp = new Parse.Query<Pregunta>('Pregunta');
    qp.containedIn('objectId' as any, preguntaIds as any);
    qp.containedIn(
      'coleccion' as any,
      colecciones.map((c) => Coleccion.createWithoutData(c.id!)) as any,
    );
    qp.equalTo('exists' as any, true as any);
    qp.include('competencia' as any);
    qp.limit(1000);
    const preguntas = await qp.find({ useMasterKey: true });
    const porId = new Map(preguntas.map((p) => [p.id!, p]));
    if (porId.size !== preguntaIds.length) {
      res.status(400).json({
        status: 'error',
        message: 'Alguna pregunta indicada ya no existe o no es de una materia de este grupo',
      });
      return;
    }

    // Sustitución: una pregunta nueva ocupa el hueco de su competencia. La que
    // estaba se retira si NO se había planteado: fue una corrección, no historia,
    // y el historial es para saber qué se le preguntó de verdad al alumno.
    const previas = await asignacionesDelGrupo(grupoId);
    const vigentePorHueco = new Map<string, PreguntaAsignacion>();
    for (const a of previas) {
      const alumnoId = a.getAlumno()?.id;
      if (!alumnoId) continue;
      const clave = `${alumnoId}::${huecoDe(a)}`;
      if (!vigentePorHueco.has(clave)) vigentePorHueco.set(clave, a);
    }

    const aRetirar: PreguntaAsignacion[] = [];
    const autor = req.appUser as AppUser | undefined;
    const nuevas = normalizadas.map((n) => {
      const pregunta = porId.get(n.preguntaId)!;
      const anterior = vigentePorHueco.get(`${n.alumnoId}::${huecoPara(pregunta, n.intento)}`);
      if (anterior && !anterior.getUsada()) {
        anterior.softDelete();
        aRetirar.push(anterior);
      }
      const asignacion = new PreguntaAsignacion().initDefaults();
      asignacion.setGrupo(Grupo.createWithoutData(grupoId) as Grupo);
      asignacion.setAlumno(AppUser.createWithoutData(n.alumnoId) as AppUser);
      asignacion.setPregunta(pregunta);
      asignacion.setIntento(n.intento);
      asignacion.setNota(n.nota);
      asignacion.setUsada(false);
      if (autor) asignacion.setAsignadaPor(autor);
      return asignacion;
    });

    await Parse.Object.saveAll([...aRetirar, ...nuevas], { useMasterKey: true });
    // Se devuelve lo creado Y lo retirado: con las dos listas el cliente puede
    // dejar su tabla exacta sin volver a pedirla entera, que es lo que hacía
    // parpadear la pantalla en cada asignación.
    res.status(201).json({
      status: 'ok',
      asignaciones: nuevas.map((a) => a.toSafeJSON()),
      retiradas: aRetirar.map((a) => a.id),
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al asignar las preguntas' });
  }
}

/** PUT /admin/grupos/:grupoId/preguntas/asignaciones/:id — la nota o «ya la hice». */
export async function actualizarAsignacion(req: Request, res: Response): Promise<void> {
  const { grupoId, id } = req.params;
  if (!(await exigirModulo(grupoId, res))) return;

  try {
    const q = new Parse.Query<PreguntaAsignacion>('PreguntaAsignacion');
    q.equalTo('exists' as any, true as any);
    q.include('pregunta' as any);
    q.include('pregunta.competencia' as any);
    const asignacion = await q.get(id, { useMasterKey: true }).catch(() => null);
    // El grupo de la ruta tiene que ser el de la asignación: si no, el guard de
    // acceso al grupo no protegería nada (bastaría pasar un grupo propio).
    if (!asignacion || asignacion.getGrupo()?.id !== grupoId) {
      res.status(404).json({ status: 'error', message: 'Asignación no encontrada' });
      return;
    }

    const { nota, usada } = req.body ?? {};
    if (nota !== undefined) asignacion.setNota(typeof nota === 'string' ? nota : '');
    if (usada !== undefined) asignacion.setUsada(usada === true);

    await asignacion.save(null, { useMasterKey: true });
    res.json({ status: 'ok', asignacion: asignacion.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al actualizar la asignación' });
  }
}

/**
 * DELETE /admin/grupos/:grupoId/preguntas/asignaciones/:id
 *
 * Es la vía para devolver una pregunta al fondo común sin esperar a que se
 * cierre el semestre.
 */
export async function borrarAsignacion(req: Request, res: Response): Promise<void> {
  const { grupoId, id } = req.params;
  if (!(await exigirModulo(grupoId, res))) return;

  try {
    const q = new Parse.Query<PreguntaAsignacion>('PreguntaAsignacion');
    q.equalTo('exists' as any, true as any);
    q.include('pregunta' as any);
    const asignacion = await q.get(id, { useMasterKey: true }).catch(() => null);
    if (!asignacion || asignacion.getGrupo()?.id !== grupoId) {
      res.status(404).json({ status: 'error', message: 'Asignación no encontrada' });
      return;
    }
    asignacion.softDelete();
    await asignacion.save(null, { useMasterKey: true });

    // Quitar la vigente puede DESTAPAR la anterior del mismo hueco, que sigue
    // viva en el historial. El cliente no puede saberlo solo, así que se le dice
    // qué queda: es lo que le evita recargar la tabla entera para averiguarlo.
    const qv = new Parse.Query<PreguntaAsignacion>('PreguntaAsignacion');
    qv.equalTo('grupo' as any, Grupo.createWithoutData(grupoId) as any);
    qv.equalTo('alumno' as any, asignacion.getAlumno() as any);
    qv.equalTo('intento' as any, asignacion.getIntento() as any);
    qv.equalTo('exists' as any, true as any);
    qv.include('pregunta' as any);
    qv.include('pregunta.competencia' as any);
    qv.descending('createdAt');
    qv.limit(20);
    const restantes = await qv.find({ useMasterKey: true });
    const competencia = competenciaDe(asignacion.getPregunta());
    const vigente = restantes.find((a) => competenciaDe(a.getPregunta()) === competencia) ?? null;

    res.json({ status: 'ok', vigente: vigente ? vigente.toSafeJSON() : null });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al quitar la asignación' });
  }
}

/**
 * PUT /admin/grupos/:grupoId/preguntas/configuracion
 * Body: `{ duracionSegundos: number | null }` — null vuelve al tiempo de la materia.
 *
 * Va aquí y no en `updateGrupo` porque aquel es solo de admin: el tiempo de las
 * entrevistas lo ajusta quien las hace, que es el profesor del grupo.
 */
export async function setConfiguracionGrupo(req: Request, res: Response): Promise<void> {
  const { grupoId } = req.params;
  if (!(await exigirModulo(grupoId, res))) return;

  const { duracionSegundos } = req.body ?? {};
  let duracion: number | undefined;
  if (duracionSegundos !== null && duracionSegundos !== undefined && duracionSegundos !== '') {
    const dur = normalizarDuracion(duracionSegundos, undefined);
    if (typeof dur === 'object') {
      res.status(400).json({ status: 'error', message: dur.error });
      return;
    }
    duracion = dur;
  }

  try {
    const grupo = await cargarGrupo(grupoId);
    if (!grupo) {
      res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
      return;
    }
    grupo.setPreguntasDuracionSegundos(duracion);
    await grupo.save(null, { useMasterKey: true });
    res.json({ status: 'ok', duracionSegundos: duracion ?? null });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al guardar el tiempo del grupo' });
  }
}
