import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { AppUser } from '../models/AppUser.js';
import { Coleccion } from '../models/Coleccion.js';
import { Grupo } from '../models/Grupo.js';
import { EjercicioDiagrama } from '../models/EjercicioDiagrama.js';
import { EnvioDiagrama } from '../models/EnvioDiagrama.js';
import { CategoriaEjercicio } from '../models/CategoriaEjercicio.js';
import { BloqueEjercicios } from '../models/BloqueEjercicios.js';
import {
  resolverAccesoDiagramas,
  coleccionesConDiagramasPublicados,
  diagramasResueltos,
  type AccesoDiagramas,
} from '../services/diagramas-alumno.service.js';
import { describir, evaluarDiagrama } from '../services/juez-diagramas/index.js';

/**
 * Lado del alumno del módulo "Diagramas".
 *
 * Espeja a `ejercicios-alumno.controller.ts`, con una diferencia de fondo: no hay
 * cola ni estados de trabajo. Evaluar un diagrama es parsear y recorrer un grafo,
 * así que el veredicto viaja en la respuesta de la propia petición y el front no
 * tiene que sondear nada.
 */

/**
 * DTO seguro para el alumno.
 *
 * Nunca salen de aquí `diagramasReferencia` ni `diagramaTrampa` —son la solución
 * y su contraejemplo—, ni los parámetros de las comprobaciones. De las
 * comprobaciones OCULTAS solo se dice cuántas hay: la literatura es explícita en
 * que dar demasiada retroalimentación equivale a entregar la solución.
 */
function dtoEjercicio(ej: EjercicioDiagrama) {
  const aserciones = ej.getAserciones();
  const visibles = aserciones
    .map((a, i) => ({ a, i }))
    .filter((x) => x.a.oculta !== true)
    .map((x) => ({ indice: x.i, comprobacion: describir(x.a) }));

  return {
    id: ej.id,
    titulo: ej.getTitulo(),
    slug: ej.getSlug(),
    enunciadoHtml: ej.getEnunciadoHtml(),
    motor: ej.getMotor(),
    tipoDiagrama: ej.getTipoDiagrama(),
    codigoInicial: ej.getCodigoInicial(),
    // El contexto SÍ se entrega: es material del enunciado, no solución. Sin él
    // el alumno no puede resolver un ejercicio de trazabilidad entre vistas.
    diagramasContexto: ej.getDiagramasContexto().map((c) => ({
      nombre: c.nombre,
      titulo: c.titulo ?? c.nombre,
      tipo: c.tipo,
      motor: c.motor,
      codigo: c.codigo,
    })),
    comprobacionesVisibles: visibles,
    comprobacionesOcultas: aserciones.length - visibles.length,
  };
}

async function cargarEjercicio(
  user: AppUser,
  slug: string,
  ejSlug: string,
): Promise<{ ejercicio: EjercicioDiagrama; acceso: AccesoDiagramas } | null> {
  const accesos = await resolverAccesoDiagramas(user);
  const acceso = accesos.get(slug);
  if (!acceso) return null;
  const q = new Parse.Query<EjercicioDiagrama>('EjercicioDiagrama');
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
 * Carga y, si algo falla, responde por su cuenta: error de BD → 500 (no dejar
 * colgado el request, que Express 4 no atrapa en handlers async), sin acceso o
 * inexistente → 404. El llamador solo hace `if (!cargado) return;`.
 */
async function cargarOResponder(
  user: AppUser,
  slug: string,
  ejSlug: string,
  res: Response,
): Promise<{ ejercicio: EjercicioDiagrama; acceso: AccesoDiagramas } | null> {
  let cargado: { ejercicio: EjercicioDiagrama; acceso: AccesoDiagramas } | null;
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

/** GET /me/diagramas/colecciones */
export async function getMisColeccionesDiagramas(req: Request, res: Response): Promise<void> {
  const user = req.appUser as AppUser;
  try {
    const colecciones = await coleccionesConDiagramasPublicados(user);
    res.json({ status: 'ok', colecciones });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener colecciones' });
  }
}

/** GET /contenidos/:slug/diagramas */
export async function listDiagramasAlumno(req: Request, res: Response): Promise<void> {
  const user = req.appUser as AppUser;
  const { slug } = req.params;
  try {
    const accesos = await resolverAccesoDiagramas(user);
    const acceso = accesos.get(slug);
    if (!acceso) {
      res.status(404).json({ status: 'error', message: 'No encontrado' });
      return;
    }
    const coleccionPtr = Coleccion.createWithoutData(acceso.coleccion.id);

    const q = new Parse.Query<EjercicioDiagrama>('EjercicioDiagrama');
    q.equalTo('coleccion' as any, coleccionPtr as any);
    q.equalTo('publicado' as any, true as any);
    q.notEqualTo('oculto' as any, true as any);
    q.equalTo('exists' as any, true as any);
    // SOLO los campos que se devuelven. Traer el documento entero —enunciado,
    // código, contexto, referencias— para pintar una tabla es lo que volvió
    // lentísimo el listado de ejercicios en su día.
    q.select('titulo' as any, 'slug' as any, 'orden' as any, 'categoria' as any, 'tipoDiagrama' as any);
    q.ascending('orden');
    q.limit(1000);
    const ejercicios = await q.find({ useMasterKey: true });

    const qc = new Parse.Query<CategoriaEjercicio>('CategoriaEjercicio');
    qc.equalTo('coleccion' as any, coleccionPtr as any);
    qc.equalTo('exists' as any, true as any);
    qc.ascending('orden');
    qc.limit(200);

    const qb = new Parse.Query<BloqueEjercicios>('BloqueEjercicios');
    qb.equalTo('coleccion' as any, coleccionPtr as any);
    qb.equalTo('exists' as any, true as any);
    qb.ascending('orden');
    qb.limit(200);

    // La completitud NO se degrada: si su query falla se propaga al catch → 500,
    // porque mostrar "0 resueltos" haría creer al alumno que perdió su progreso.
    // Las categorías y bloques sí se degradan: solo afectan al agrupado.
    const resueltos = await diagramasResueltos(user.id, ejercicios.map((e) => e.id!));
    const [categorias, bloques] = await Promise.all([
      qc.find({ useMasterKey: true }).catch(() => []),
      qb.find({ useMasterKey: true }).catch(() => []),
    ]);

    res.json({
      status: 'ok',
      coleccion: acceso.coleccion,
      ejercicios: ejercicios.map((e) => ({
        id: e.id,
        titulo: e.getTitulo(),
        slug: e.getSlug(),
        orden: e.getOrden(),
        tipoDiagrama: e.getTipoDiagrama(),
        categoriaId: e.get('categoria')?.id ?? null,
        resuelto: resueltos.has(e.id!),
      })),
      categorias: categorias.map((c) => ({
        id: c.id,
        nombre: c.get('nombre'),
        orden: c.get('orden') ?? 0,
        bloqueId: c.get('bloque')?.id ?? null,
      })),
      bloques: bloques.map((b) => ({
        id: b.id,
        nombre: b.get('nombre'),
        descripcion: b.get('descripcion') ?? undefined,
        orden: b.get('orden') ?? 0,
      })),
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener los ejercicios' });
  }
}

/** GET /contenidos/:slug/diagramas/:ejSlug */
export async function getDiagramaAlumno(req: Request, res: Response): Promise<void> {
  const user = req.appUser as AppUser;
  const cargado = await cargarOResponder(user, req.params.slug, req.params.ejSlug, res);
  if (!cargado) return;
  res.json({ status: 'ok', ejercicio: dtoEjercicio(cargado.ejercicio) });
}

/** Evalúa el diagrama recibido contra las aserciones del ejercicio. */
async function juzgar(ejercicio: EjercicioDiagrama, codigo: string) {
  return evaluarDiagrama({
    motor: ejercicio.getMotor(),
    tipoDiagrama: ejercicio.getTipoDiagrama(),
    codigo,
    aserciones: ejercicio.getAserciones(),
    contexto: ejercicio.getDiagramasContexto(),
  });
}

function leerCodigo(req: Request): string | null {
  const codigo = req.body?.codigo;
  if (typeof codigo !== 'string' || !codigo.trim()) return null;
  return codigo;
}

/**
 * POST /contenidos/:slug/diagramas/:ejSlug/evaluar
 *
 * Prueba sin registrar nada, como el "Probar" del solver de código. Existe para
 * que el alumno pueda iterar sin ensuciar su historial, no porque evaluar sea
 * caro: cuesta lo mismo que enviar.
 */
export async function evaluarDiagramaAlumno(req: Request, res: Response): Promise<void> {
  const user = req.appUser as AppUser;
  const cargado = await cargarOResponder(user, req.params.slug, req.params.ejSlug, res);
  if (!cargado) return;

  const codigo = leerCodigo(req);
  if (codigo === null) {
    res.status(400).json({ status: 'error', message: 'Falta el diagrama' });
    return;
  }
  try {
    const resultado = await juzgar(cargado.ejercicio, codigo);
    res.json({ status: 'ok', resultado });
  } catch (error) {
    // Un fallo aquí es del ejercicio (p. ej. un contexto inválido), no del
    // alumno: se dice, en vez de disfrazarlo de diagrama incorrecto.
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Error al evaluar el diagrama',
    });
  }
}

/** POST /contenidos/:slug/diagramas/:ejSlug/enviar — evalúa y registra. */
export async function enviarDiagramaAlumno(req: Request, res: Response): Promise<void> {
  const user = req.appUser as AppUser;
  const cargado = await cargarOResponder(user, req.params.slug, req.params.ejSlug, res);
  if (!cargado) return;

  const codigo = leerCodigo(req);
  if (codigo === null) {
    res.status(400).json({ status: 'error', message: 'Falta el diagrama' });
    return;
  }

  try {
    const resultado = await juzgar(cargado.ejercicio, codigo);

    const envio = new EnvioDiagrama().initDefaults();
    envio.setEjercicio(cargado.ejercicio);
    envio.setAlumno(user);
    if (cargado.acceso.grupoId) envio.setGrupo(Grupo.createWithoutData(cargado.acceso.grupoId) as Grupo);
    envio.setCodigo(codigo);
    envio.setVeredicto(resultado.veredicto);
    if (resultado.errorSintaxis) envio.setErrorSintaxis(resultado.errorSintaxis);
    envio.setAsercionesPasadas(resultado.asercionesPasadas);
    envio.setAsercionesTotales(resultado.asercionesTotales);
    // El detalle ya viene sin el porqué de las ocultas: el juez lo omite antes,
    // así que ni siquiera queda escrito en la BD algo que el alumno no debe ver.
    envio.setDetalle(resultado.aserciones);
    await envio.save(null, { useMasterKey: true });

    res.json({ status: 'ok', envioId: envio.id, resultado });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Error al enviar el diagrama',
    });
  }
}

/** GET /contenidos/:slug/diagramas/:ejSlug/envios — historial propio. */
export async function listEnviosDiagramaAlumno(req: Request, res: Response): Promise<void> {
  const user = req.appUser as AppUser;
  const cargado = await cargarOResponder(user, req.params.slug, req.params.ejSlug, res);
  if (!cargado) return;

  try {
    const q = new Parse.Query<EnvioDiagrama>('EnvioDiagrama');
    q.equalTo('ejercicio' as any, cargado.ejercicio as any);
    q.equalTo('alumno' as any, user as any);
    q.equalTo('exists' as any, true as any);
    q.descending('createdAt');
    q.limit(50);
    const envios = await q.find({ useMasterKey: true });
    res.json({
      status: 'ok',
      envios: envios.map((e) => ({
        id: e.id,
        veredicto: e.getVeredicto(),
        asercionesPasadas: e.getAsercionesPasadas(),
        asercionesTotales: e.getAsercionesTotales(),
        createdAt: e.createdAt,
      })),
    });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener el historial' });
  }
}
