import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { AppUser } from '../models/AppUser.js';
import { Coleccion } from '../models/Coleccion.js';
import { Grupo } from '../models/Grupo.js';
import { EjercicioProgramacion } from '../models/EjercicioProgramacion.js';
import { EnvioEjercicio, type DetalleCasoEnvio } from '../models/EnvioEjercicio.js';
import { CategoriaEjercicio } from '../models/CategoriaEjercicio.js';
import {
  resolverAccesoEjercicios,
  coleccionesConEjerciciosPublicados,
  ejerciciosResueltos,
  type AccesoEjercicios,
} from '../services/ejercicios-alumno.service.js';
import {
  encolar,
  encolarEnvio,
  estadoTrabajo,
  estadoEnvio,
  construirCodigo,
  enmascararErrorPlantilla,
} from '../services/ejercicios-cola.service.js';
import {
  evaluar,
  esLenguaje,
  lenguajeConfigurado,
  type Lenguaje,
} from '../services/judge/index.js';

/** DTO seguro de un ejercicio para el alumno: NUNCA expone los casos ocultos. */
function dtoEjercicio(ej: EjercicioProgramacion) {
  const casos = ej.getCasos();
  // El `indice` es la posición en la lista COMPLETA (no la del subconjunto
  // visible), para que "Caso N" sea el mismo número aquí, al Probar y al Enviar.
  const muestra = casos
    .map((c, i) => ({ c, i }))
    .filter((x) => !x.c.oculto)
    .map((x) => ({ indice: x.i, entrada: x.c.entrada, salidaEsperada: x.c.salidaEsperada }));
  return {
    id: ej.id,
    titulo: ej.getTitulo(),
    slug: ej.getSlug(),
    enunciadoHtml: ej.getEnunciadoHtml(),
    lenguajes: ej.getLenguajes(),
    codigoInicial: ej.getCodigoInicial(),
    limiteTiempoMs: ej.getLimiteTiempoMs(),
    limiteMemoriaMb: ej.getLimiteMemoriaMb(),
    casosMuestra: muestra,
    casosOcultos: casos.length - muestra.length,
  };
}

/** Carga un ejercicio publicado si el alumno tiene acceso; si no, null (→404). */
async function cargarEjercicio(
  user: AppUser,
  slug: string,
  ejSlug: string,
): Promise<{ ejercicio: EjercicioProgramacion; acceso: AccesoEjercicios } | null> {
  const accesos = await resolverAccesoEjercicios(user);
  const acceso = accesos.get(slug);
  if (!acceso) return null;
  const q = new Parse.Query<EjercicioProgramacion>('EjercicioProgramacion');
  q.equalTo('coleccion' as any, Coleccion.createWithoutData(acceso.coleccion.id) as any);
  q.equalTo('slug' as any, ejSlug as any);
  q.equalTo('publicado' as any, true as any);
  q.notEqualTo('oculto' as any, true as any);
  q.equalTo('exists' as any, true as any);
  const ejercicio = await q.first({ useMasterKey: true });
  if (!ejercicio) return null;
  return { ejercicio, acceso };
}

/**
 * Carga el ejercicio y, si algo falla, responde por su cuenta y devuelve null:
 * error transitorio de BD → 500 (no dejar colgado el request, que Express 4 no
 * atrapa en handlers async), no encontrado / sin acceso → 404. El llamador solo
 * hace `if (!cargado) return;`.
 */
async function cargarOResponder(
  user: AppUser,
  slug: string,
  ejSlug: string,
  res: Response,
): Promise<{ ejercicio: EjercicioProgramacion; acceso: AccesoEjercicios } | null> {
  let cargado: { ejercicio: EjercicioProgramacion; acceso: AccesoEjercicios } | null;
  try {
    cargado = await cargarEjercicio(user, slug, ejSlug);
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al cargar el ejercicio' });
    return null;
  }
  if (!cargado) {
    res.status(404).json({ status: 'error', message: 'Ejercicio no encontrado' });
    return null;
  }
  return cargado;
}

/** GET /me/ejercicios/colecciones — colecciones del alumno con ejercicios. */
export async function getMisColeccionesEjercicios(req: Request, res: Response): Promise<void> {
  const user = req.appUser as AppUser;
  try {
    const colecciones = await coleccionesConEjerciciosPublicados(user);
    res.json({ status: 'ok', colecciones });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener colecciones' });
  }
}

/** GET /contenidos/:slug/ejercicios — lista de ejercicios publicados. */
export async function listEjerciciosAlumno(req: Request, res: Response): Promise<void> {
  const user = req.appUser as AppUser;
  const { slug } = req.params;
  try {
    const accesos = await resolverAccesoEjercicios(user);
    const acceso = accesos.get(slug);
    if (!acceso) {
      res.status(404).json({ status: 'error', message: 'No encontrado' });
      return;
    }
    const q = new Parse.Query<EjercicioProgramacion>('EjercicioProgramacion');
    q.equalTo('coleccion' as any, Coleccion.createWithoutData(acceso.coleccion.id) as any);
    q.equalTo('publicado' as any, true as any);
    q.notEqualTo('oculto' as any, true as any);
    q.equalTo('exists' as any, true as any);
    q.ascending('orden');
    q.limit(1000);
    const ejercicios = await q.find({ useMasterKey: true });

    // Completitud + categorías (en paralelo). La completitud NO se degrada: si su
    // query falla, se propaga al catch → 500 (la vista reintenta), porque mostrar
    // "0 resueltos" y sin palomitas haría creer al alumno que perdió su progreso.
    // Las categorías sí se degradan (solo afectan el agrupado, no el dato).
    const qc = new Parse.Query<CategoriaEjercicio>('CategoriaEjercicio');
    qc.equalTo('coleccion' as any, Coleccion.createWithoutData(acceso.coleccion.id) as any);
    qc.equalTo('exists' as any, true as any);
    qc.ascending('orden');
    qc.limit(1000);
    const [resueltos, categorias] = await Promise.all([
      ejerciciosResueltos(user.id, ejercicios.map((e) => e.id!)),
      qc.find({ useMasterKey: true }).catch(() => [] as CategoriaEjercicio[]),
    ]);

    res.json({
      status: 'ok',
      coleccion: acceso.coleccion,
      categorias: categorias.map((c) => ({ id: c.id, nombre: c.getNombre(), orden: c.getOrden() })),
      progreso: { resueltos: resueltos.size, total: ejercicios.length },
      ejercicios: ejercicios.map((e) => ({
        id: e.id,
        titulo: e.getTitulo(),
        slug: e.getSlug(),
        lenguajes: e.getLenguajes(),
        orden: e.getOrden(),
        categoriaId: e.getCategoria()?.id ?? null,
        resuelto: resueltos.has(e.id!),
      })),
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener ejercicios' });
  }
}

/** GET /contenidos/:slug/ejercicios/:ejSlug — enunciado + casos de muestra. */
export async function getEjercicioAlumno(req: Request, res: Response): Promise<void> {
  const user = req.appUser as AppUser;
  const { slug, ejSlug } = req.params;
  const cargado = await cargarOResponder(user, slug, ejSlug, res);
  if (!cargado) return;
  res.json({ status: 'ok', ejercicio: dtoEjercicio(cargado.ejercicio) });
}

/** Valida lenguaje+código del body contra el ejercicio; devuelve error o null. */
function validarEnvio(ej: EjercicioProgramacion, body: any): { error: string; status: number } | { lenguaje: Lenguaje; codigo: string } {
  const lenguaje = body?.lenguaje;
  const codigo = body?.codigo;
  if (!esLenguaje(lenguaje) || !ej.getLenguajes().includes(lenguaje)) {
    return { error: 'Lenguaje no permitido para este ejercicio', status: 400 };
  }
  if (typeof codigo !== 'string' || !codigo.trim()) {
    return { error: 'El código no puede estar vacío', status: 400 };
  }
  if (!lenguajeConfigurado(lenguaje)) {
    return { error: `El servidor no tiene configurado el compilador de ${lenguaje}`, status: 503 };
  }
  return { lenguaje, codigo };
}

/**
 * POST /contenidos/:slug/ejercicios/:ejSlug/ejecutar
 * ENCOLA una corrida efímera (no guarda envío) contra los casos DE MUESTRA y
 * devuelve un `jobId` para consultar el resultado por polling.
 */
export async function ejecutarEjercicio(req: Request, res: Response): Promise<void> {
  const user = req.appUser as AppUser;
  const { slug, ejSlug } = req.params;
  const cargado = await cargarOResponder(user, slug, ejSlug, res);
  if (!cargado) return;
  const v = validarEnvio(cargado.ejercicio, req.body);
  if ('error' in v) {
    res.status(v.status).json({ status: 'error', message: v.error });
    return;
  }
  const ej = cargado.ejercicio;
  const limites = { tiempoMs: ej.getLimiteTiempoMs(), memoriaMb: ej.getLimiteMemoriaMb() };
  const codigo = construirCodigo(ej, v.lenguaje, v.codigo); // harness si aplica

  const visibles = ej.getCasos().map((c, i) => ({ c, i })).filter((x) => !x.c.oculto);
  if (visibles.length === 0) {
    res.status(400).json({ status: 'error', message: 'Este ejercicio no tiene casos de muestra para probar; usa Enviar.' });
    return;
  }

  const esPlantilla = ej.getModoEvaluacion() === 'plantilla';
  const jobId = encolar(user.id!, async () => {
    const resultado = await evaluar({ lenguaje: v.lenguaje, codigo, casos: visibles.map((x) => x.c), limites });
    // Índices ORIGINALES, para que "Caso N" coincida con ejemplos y con el envío.
    resultado.casos = resultado.casos.map((rc, k) => ({ ...rc, indice: visibles[k].i }));
    return { modo: 'casos', resultado: enmascararErrorPlantilla(esPlantilla, resultado) };
  });
  res.json({ status: 'ok', jobId });
}

/**
 * POST /contenidos/:slug/ejercicios/:ejSlug/enviar
 * Crea el envío en estado 'pendiente' (historial de CUALQUIER usuario) y lo
 * ENCOLA. Responde al instante con `jobId`/`envioId`; el resultado se consulta
 * por polling. El worker evalúa contra TODOS los casos (aplicando el harness).
 */
export async function enviarEjercicio(req: Request, res: Response): Promise<void> {
  const user = req.appUser as AppUser;
  const { slug, ejSlug } = req.params;
  const cargado = await cargarOResponder(user, slug, ejSlug, res);
  if (!cargado) return;
  const v = validarEnvio(cargado.ejercicio, req.body);
  if ('error' in v) {
    res.status(v.status).json({ status: 'error', message: v.error });
    return;
  }
  const { ejercicio, acceso } = cargado;
  try {
    const envio = new EnvioEjercicio().initDefaults();
    envio.setEstado('pendiente');
    envio.setEjercicio(ejercicio);
    envio.setAlumno(user);
    // Se guarda el envío de CUALQUIER usuario (historial universal), pero solo se
    // vincula al grupo si es alumno: así el preview de un profesor/admin no ensucia
    // las analíticas por grupo.
    if (acceso.grupoId && user.isAlumno()) {
      envio.setGrupo(Grupo.createWithoutData(acceso.grupoId) as Grupo);
    }
    envio.setLenguaje(v.lenguaje);
    envio.setCodigo(v.codigo); // se guarda el código DEL ALUMNO; el worker aplica el harness
    envio.setCasosTotales(ejercicio.getCasos().length);
    await envio.save(null, { useMasterKey: true });
    const jobId = encolarEnvio(user.id!, envio.id!);
    res.json({ status: 'ok', jobId, envioId: envio.id });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al encolar el envío' });
  }
}

/** GET /contenidos/:slug/ejercicios/:ejSlug/estado/:jobId — estado de una corrida efímera. */
export function getEstadoJob(req: Request, res: Response): void {
  const user = req.appUser as AppUser;
  const est = estadoTrabajo(req.params.jobId, user.id!);
  if (!est) {
    res.status(404).json({ status: 'error', message: 'Trabajo no encontrado o expirado' });
    return;
  }
  res.json({ status: 'ok', ...est });
}

/** GET /contenidos/:slug/ejercicios/:ejSlug/envios/:envioId/estado — estado de un envío (persistido). */
export async function getEstadoEnvio(req: Request, res: Response): Promise<void> {
  const user = req.appUser as AppUser;
  try {
    const est = await estadoEnvio(req.params.envioId, user.id!);
    if (!est) {
      res.status(404).json({ status: 'error', message: 'Envío no encontrado' });
      return;
    }
    res.json({ status: 'ok', ...est });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al consultar el envío' });
  }
}

/** GET /contenidos/:slug/ejercicios/:ejSlug/envios — historial propio. */
export async function listEnviosAlumno(req: Request, res: Response): Promise<void> {
  const user = req.appUser as AppUser;
  const { slug, ejSlug } = req.params;
  const cargado = await cargarOResponder(user, slug, ejSlug, res);
  if (!cargado) return;
  try {
    const q = new Parse.Query<EnvioEjercicio>('EnvioEjercicio');
    q.equalTo('ejercicio' as any, cargado.ejercicio as any);
    q.equalTo('alumno' as any, AppUser.createWithoutData(user.id) as any);
    q.equalTo('exists' as any, true as any);
    q.descending('createdAt');
    q.limit(50);
    const envios = await q.find({ useMasterKey: true });
    res.json({ status: 'ok', envios: envios.map((e) => e.toSafeJSON()) });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener envíos' });
  }
}
