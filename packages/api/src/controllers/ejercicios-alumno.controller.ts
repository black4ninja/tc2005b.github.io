import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { AppUser } from '../models/AppUser.js';
import { Coleccion } from '../models/Coleccion.js';
import { Grupo } from '../models/Grupo.js';
import { EjercicioProgramacion } from '../models/EjercicioProgramacion.js';
import { EnvioEjercicio, type DetalleCasoEnvio } from '../models/EnvioEjercicio.js';
import {
  resolverAccesoEjercicios,
  coleccionesConEjerciciosPublicados,
  type AccesoEjercicios,
} from '../services/ejercicios-alumno.service.js';
import {
  evaluar,
  probarPrograma,
  esLenguaje,
  lenguajeConfigurado,
  type Lenguaje,
  type ResultadoEvaluacion,
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
    res.json({
      status: 'ok',
      coleccion: acceso.coleccion,
      ejercicios: ejercicios.map((e) => ({
        id: e.id, titulo: e.getTitulo(), slug: e.getSlug(), lenguajes: e.getLenguajes(), orden: e.getOrden(),
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
 * Modo interactivo: si el body trae `entrada`, corre una vez con esa entrada y
 * devuelve la salida cruda. Si no, prueba contra los casos DE MUESTRA (visibles).
 * No guarda envío.
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
  try {
    if (typeof req.body?.entrada === 'string') {
      const r = await probarPrograma({ lenguaje: v.lenguaje, codigo: v.codigo, stdin: req.body.entrada, limites });
      res.json({ status: 'ok', modo: 'salida', resultado: r });
      return;
    }
    // Casos de muestra (visibles), conservando su índice en la lista completa.
    const visibles = ej.getCasos().map((c, i) => ({ c, i })).filter((x) => !x.c.oculto);
    if (visibles.length === 0) {
      res.status(400).json({ status: 'error', message: 'Este ejercicio no tiene casos de muestra para probar; usa Enviar.' });
      return;
    }
    const resultado = await evaluar({ lenguaje: v.lenguaje, codigo: v.codigo, casos: visibles.map((x) => x.c), limites });
    // Remapear el índice de cada resultado a su posición ORIGINAL, para que el
    // "Caso N" coincida con el de los ejemplos y con el del envío.
    resultado.casos = resultado.casos.map((rc, k) => ({ ...rc, indice: visibles[k].i }));
    res.json({ status: 'ok', modo: 'casos', resultado });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al ejecutar' });
  }
}

/**
 * POST /contenidos/:slug/ejercicios/:ejSlug/enviar
 * Evalúa contra TODOS los casos, guarda el envío y devuelve el veredicto.
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
  const limites = { tiempoMs: ejercicio.getLimiteTiempoMs(), memoriaMb: ejercicio.getLimiteMemoriaMb() };

  let resultado: ResultadoEvaluacion;
  try {
    resultado = await evaluar({ lenguaje: v.lenguaje, codigo: v.codigo, casos: ejercicio.getCasos(), limites });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al evaluar el envío' });
    return;
  }

  // Solo se registra el envío del ALUMNO. Un profesor/admin que previsualiza
  // recibe el veredicto pero NO ensucia el historial del grupo.
  if (user.get('userType') !== 'alumno') {
    res.json({ status: 'ok', envioId: null, resultado });
    return;
  }

  // Registrar el envío (historial por alumno). El detalle ya viene sin datos de
  // casos ocultos (evaluar los omite), así que es seguro guardarlo/devolverlo.
  try {
    const envio = new EnvioEjercicio().initDefaults();
    envio.setEjercicio(ejercicio);
    envio.setAlumno(user);
    if (acceso.grupoId) envio.setGrupo(Grupo.createWithoutData(acceso.grupoId) as Grupo);
    envio.setLenguaje(v.lenguaje);
    envio.setCodigo(v.codigo);
    envio.setVeredicto(resultado.veredicto);
    envio.setCasosPasados(resultado.casosPasados);
    envio.setCasosTotales(resultado.casosTotales);
    envio.setDetalle({ casos: resultado.casos as DetalleCasoEnvio[], errorCompilacion: resultado.errorCompilacion });
    envio.setTiempoMaxMs(resultado.tiempoMaxMs);
    await envio.save(null, { useMasterKey: true });
    res.json({ status: 'ok', envioId: envio.id, resultado });
  } catch {
    // El código sí se evaluó; solo falló persistir. Devolver el resultado igual.
    res.json({ status: 'ok', envioId: null, resultado });
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
