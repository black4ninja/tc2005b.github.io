import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { renderMarkdown } from '@tc2005b/contenido-pipeline';
import { esJuzgable, etiquetaMotor, etiquetaTipo, tipoDiagrama } from '@tc2005b/diagramas-catalogo';
import { Coleccion } from '../models/Coleccion.js';
import { EjercicioDiagrama, type DiagramaContextoEjercicio } from '../models/EjercicioDiagrama.js';
import { CategoriaEjercicio } from '../models/CategoriaEjercicio.js';
import type { AppUser } from '../models/AppUser.js';
import { getColeccionActiva } from './cms-documentos.controller.js';
import {
  TIPOS_DIAGRAMA, esTipoDeAsercionValido, type Asercion, type Motor, type TipoDiagrama,
} from '../services/juez-diagramas/index.js';
import { METADATOS } from '../services/juez-diagramas/metadatos.js';
import { verificarEjercicioDiagrama } from '../services/diagramas-verificacion.service.js';

/**
 * CRUD de admin del módulo "Diagramas" (ejercicios de diseño UML).
 *
 * Sigue el mismo contrato que `ejercicios-programacion.controller.ts` —mismos
 * códigos de estado, mismo `slug` único por colección, mismo soft-delete— porque
 * la pantalla de autoría es hermana de aquella y desviarse solo obligaría a
 * recordar dos convenciones.
 */

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MOTORES: Motor[] = ['mermaid', 'plantuml'];

function parseSlug(valor: unknown): string | null {
  return typeof valor === 'string' && SLUG_REGEX.test(valor) ? valor : null;
}

function normalizarMotor(valor: unknown): Motor {
  return MOTORES.includes(valor as Motor) ? (valor as Motor) : 'mermaid';
}

function normalizarTipoDiagrama(valor: unknown): TipoDiagrama | null {
  return TIPOS_DIAGRAMA.includes(valor as TipoDiagrama) ? (valor as TipoDiagrama) : null;
}

/**
 * El par (tipo, motor) tiene que tener normalizador. Validarlos por separado no
 * basta: cada uno es válido y la combinación no, y el fallo no aparece al
 * guardar sino en el primer envío de un alumno, donde `parsear` lanza un `Error`
 * plano —no `ErrorSintaxisDiagrama`— que sube hasta el endpoint como HTTP 500.
 * El ejercicio queda irresoluble para el grupo entero.
 *
 * Se comprueba aquí, y no solo en el editor, porque un cliente antiguo o una
 * llamada directa al API llegarían igual.
 */
function paseElJuez(tipo: TipoDiagrama, motor: Motor): string | null {
  if (esJuzgable(tipo, motor)) return null;
  const admitidos = tipoDiagrama(tipo)?.motoresJuez ?? [];
  return admitidos.length
    ? `El juez no evalúa «${etiquetaTipo(tipo)}» en ${etiquetaMotor(motor)}; usa ${admitidos.map(etiquetaMotor).join(' o ')}.`
    : `El juez todavía no evalúa «${etiquetaTipo(tipo)}» en ningún motor.`;
}

/**
 * Normaliza las aserciones. Rechaza las de tipo desconocido en vez de
 * guardarlas: una aserción que el juez no entiende falla en TODOS los envíos, y
 * es mucho mejor que el autor se entere al guardar que el alumno al entregar.
 */
function normalizarAserciones(valor: unknown): Asercion[] | { error: string } {
  if (!Array.isArray(valor)) return { error: 'Las comprobaciones tienen un formato inválido' };
  const salida: Asercion[] = [];
  for (const a of valor) {
    if (a === null || typeof a !== 'object') return { error: 'Las comprobaciones tienen un formato inválido' };
    const tipo = (a as Asercion).tipo;
    if (!esTipoDeAsercionValido(tipo)) {
      return { error: `La comprobación «${String(tipo)}» no existe en el catálogo del juez` };
    }
    const parametros = (a as Asercion).parametros;
    const rotulo = (a as Asercion).rotulo;
    salida.push({
      tipo,
      oculta: (a as Asercion).oculta === true,
      ...(typeof rotulo === 'string' && rotulo.trim() ? { rotulo: rotulo.trim() } : {}),
      ...(parametros && typeof parametros === 'object' ? { parametros: parametros as Record<string, unknown> } : {}),
    });
  }
  return salida;
}

function normalizarContexto(valor: unknown): DiagramaContextoEjercicio[] | { error: string } {
  if (!Array.isArray(valor)) return { error: 'Los diagramas de contexto tienen un formato inválido' };
  const salida: DiagramaContextoEjercicio[] = [];
  const nombres = new Set<string>();
  for (const c of valor) {
    if (c === null || typeof c !== 'object') return { error: 'Los diagramas de contexto tienen un formato inválido' };
    const nombre = typeof (c as any).nombre === 'string' ? (c as any).nombre.trim() : '';
    if (!nombre) return { error: 'Cada diagrama de contexto necesita un nombre con el que referenciarlo' };
    // El nombre es la clave con la que las aserciones cruzadas lo buscan: si se
    // repite, una de las dos definiciones queda inalcanzable en silencio.
    if (nombres.has(nombre)) return { error: `Hay dos diagramas de contexto llamados «${nombre}»` };
    nombres.add(nombre);
    const tipo = normalizarTipoDiagrama((c as any).tipo);
    if (!tipo) return { error: `El diagrama de contexto «${nombre}» tiene un tipo de diagrama inválido` };
    const motorCtx = normalizarMotor((c as any).motor);
    // Un par sin normalizador aquí es peor que en el diagrama del alumno:
    // `evaluarDiagrama` parsea los contextos ANTES y lanza sin llegar a mirarlo.
    const problema = paseElJuez(tipo, motorCtx);
    if (problema) return { error: `El diagrama de contexto «${nombre}»: ${problema}` };
    salida.push({
      nombre,
      tipo,
      motor: motorCtx,
      codigo: typeof (c as any).codigo === 'string' ? (c as any).codigo : '',
      ...(typeof (c as any).titulo === 'string' && (c as any).titulo.trim()
        ? { titulo: (c as any).titulo.trim() } : {}),
    });
  }
  return salida;
}

/** Lista de diagramas, descartando los vacíos (no verifican nada). */
function normalizarDiagramas(valor: unknown): string[] {
  if (typeof valor === 'string') return valor.trim() ? [valor] : [];
  if (!Array.isArray(valor)) return [];
  return valor.filter((d): d is string => typeof d === 'string' && d.trim() !== '');
}

async function buscarEjercicio(
  id: string,
): Promise<{ ejercicio: EjercicioDiagrama; coleccion: Coleccion } | null> {
  try {
    const q = new Parse.Query<EjercicioDiagrama>('EjercicioDiagrama');
    q.equalTo('exists' as any, true as any);
    q.include('coleccion' as any);
    const ejercicio = await q.get(id, { useMasterKey: true });
    const coleccion = ejercicio.getColeccion();
    if (!coleccion || coleccion.get('exists') === false) return null;
    return { ejercicio, coleccion };
  } catch {
    return null;
  }
}

async function slugDuplicado(coleccionId: string, slug: string, excludeId?: string): Promise<boolean> {
  const q = new Parse.Query<EjercicioDiagrama>('EjercicioDiagrama');
  q.equalTo('coleccion' as any, Coleccion.createWithoutData(coleccionId) as any);
  q.equalTo('slug' as any, slug as any);
  q.equalTo('exists' as any, true as any);
  if (excludeId) q.notEqualTo('objectId' as any, excludeId as any);
  return !!(await q.first({ useMasterKey: true }));
}

async function resolverCategoria(
  categoriaId: unknown,
  coleccionId: string,
): Promise<CategoriaEjercicio | null | 'invalido'> {
  if (categoriaId === null || categoriaId === undefined || categoriaId === '') return null;
  if (typeof categoriaId !== 'string') return 'invalido';
  const q = new Parse.Query<CategoriaEjercicio>('CategoriaEjercicio');
  q.equalTo('coleccion' as any, Coleccion.createWithoutData(coleccionId) as any);
  q.equalTo('exists' as any, true as any);
  const cat = await q.get(categoriaId, { useMasterKey: true }).catch(() => null);
  return cat ?? 'invalido';
}

/** GET /admin/catalogo-aserciones */
export function getCatalogoAserciones(_req: Request, res: Response): void {
  res.json({ status: 'ok', metadatos: METADATOS });
}

/** GET /admin/colecciones/:id/ejercicios-diagrama */
export async function listEjerciciosDiagrama(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const coleccion = await getColeccionActiva(id);
    if (!coleccion) {
      res.status(404).json({ status: 'error', message: 'Colección no encontrada' });
      return;
    }
    const q = new Parse.Query<EjercicioDiagrama>('EjercicioDiagrama');
    q.equalTo('coleccion' as any, Coleccion.createWithoutData(id) as any);
    q.equalTo('exists' as any, true as any);
    // Solo lo que pinta la tabla. Enunciado, código y diagramas de referencia son
    // los campos pesados y el editor los pide aparte; traerlos aquí es lo que
    // volvió lentísimo el listado de ejercicios de programación en su día.
    // `aserciones` se conserva porque la tabla muestra cuántas hay.
    q.select(
      'titulo' as any, 'slug' as any, 'orden' as any, 'categoria' as any,
      'publicado' as any, 'motor' as any, 'tipoDiagrama' as any, 'aserciones' as any,
      'esEjemplo' as any,
    );
    q.ascending('orden');
    q.limit(1000);
    const ejercicios = await q.find({ useMasterKey: true });
    // `toResumenJSON` y NO `toSafeJSON`: sobre un objeto traído con `select()`,
    // el segundo sirve los campos ausentes con su valor por defecto y el cliente
    // no puede distinguirlos de un campo vacío de verdad.
    res.json({ status: 'ok', ejercicios: ejercicios.map((e) => e.toResumenJSON()) });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al obtener ejercicios de diagrama' });
  }
}

/** POST /admin/colecciones/:id/ejercicios-diagrama */
export async function createEjercicioDiagrama(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const {
    titulo, slug, orden, enunciado, motor, tipoDiagrama, codigoInicial, aserciones,
    diagramasContexto, diagramasReferencia, diagramaTrampa, categoriaId, esEjemplo,
  } = req.body ?? {};

  if (!titulo || typeof titulo !== 'string' || !titulo.trim()) {
    res.status(400).json({ status: 'error', message: 'El título es requerido' });
    return;
  }
  const slugValido = parseSlug(slug);
  if (!slugValido) {
    res.status(400).json({ status: 'error', message: 'El slug debe contener solo letras minúsculas, números y guiones' });
    return;
  }
  const tipo = normalizarTipoDiagrama(tipoDiagrama);
  if (!tipo) {
    res.status(400).json({ status: 'error', message: 'El tipo de diagrama no es válido' });
    return;
  }
  const motorEj = normalizarMotor(motor);
  const parInvalido = paseElJuez(tipo, motorEj);
  if (parInvalido) {
    res.status(400).json({ status: 'error', message: parInvalido });
    return;
  }
  const aserVal = normalizarAserciones(aserciones ?? []);
  if ('error' in aserVal) {
    res.status(400).json({ status: 'error', message: aserVal.error });
    return;
  }
  const ctxVal = normalizarContexto(diagramasContexto ?? []);
  if ('error' in ctxVal) {
    res.status(400).json({ status: 'error', message: ctxVal.error });
    return;
  }

  try {
    const coleccion = await getColeccionActiva(id);
    if (!coleccion) {
      res.status(404).json({ status: 'error', message: 'Colección no encontrada' });
      return;
    }
    if (await slugDuplicado(id, slugValido)) {
      res.status(409).json({ status: 'error', message: 'Ya existe un ejercicio de diagrama con ese slug en la colección' });
      return;
    }
    const categoria = await resolverCategoria(categoriaId, id);
    if (categoria === 'invalido') {
      res.status(400).json({ status: 'error', message: 'La categoría indicada no existe en la colección' });
      return;
    }

    const ejercicio = new EjercicioDiagrama().initDefaults();
    ejercicio.setColeccion(coleccion);
    ejercicio.setCategoria(categoria);
    ejercicio.setTitulo(titulo.trim());
    ejercicio.setSlug(slugValido);
    ejercicio.setOrden(typeof orden === 'number' ? orden : 0);
    const md = typeof enunciado === 'string' ? enunciado : '';
    ejercicio.setEnunciado(md);
    ejercicio.setEnunciadoHtml(await renderMarkdown(md));
    ejercicio.setMotor(motorEj);
    ejercicio.setTipoDiagrama(tipo);
    ejercicio.setCodigoInicial(typeof codigoInicial === 'string' ? codigoInicial : '');
    ejercicio.setAserciones(aserVal);
    ejercicio.setDiagramasContexto(ctxVal);
    ejercicio.setDiagramasReferencia(normalizarDiagramas(diagramasReferencia));
    ejercicio.setDiagramaTrampa(typeof diagramaTrampa === 'string' ? diagramaTrampa : '');
    ejercicio.setEsEjemplo(esEjemplo === true);
    ejercicio.setPublicado(false); // nace como borrador
    const autor = req.appUser as AppUser | undefined;
    if (autor) ejercicio.setAutor(autor);

    await ejercicio.save(null, { useMasterKey: true });
    res.status(201).json({ status: 'ok', ejercicio: ejercicio.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al crear el ejercicio de diagrama' });
  }
}

/** GET /admin/ejercicios-diagrama/:id */
export async function getEjercicioDiagrama(req: Request, res: Response): Promise<void> {
  const encontrado = await buscarEjercicio(req.params.id);
  if (!encontrado) {
    res.status(404).json({ status: 'error', message: 'Ejercicio de diagrama no encontrado' });
    return;
  }
  res.json({ status: 'ok', ejercicio: encontrado.ejercicio.toSafeJSON() });
}

/** PUT /admin/ejercicios-diagrama/:id */
export async function updateEjercicioDiagrama(req: Request, res: Response): Promise<void> {
  const encontrado = await buscarEjercicio(req.params.id);
  if (!encontrado) {
    res.status(404).json({ status: 'error', message: 'Ejercicio de diagrama no encontrado' });
    return;
  }
  const { ejercicio, coleccion } = encontrado;
  const {
    titulo, slug, orden, enunciado, motor, tipoDiagrama, codigoInicial, aserciones,
    diagramasContexto, diagramasReferencia, diagramaTrampa, categoriaId, esEjemplo,
  } = req.body ?? {};

  try {
    if (titulo !== undefined) {
      if (typeof titulo !== 'string' || !titulo.trim()) {
        res.status(400).json({ status: 'error', message: 'El título no puede estar vacío' });
        return;
      }
      ejercicio.setTitulo(titulo.trim());
    }
    if (slug !== undefined) {
      const slugValido = parseSlug(slug);
      if (!slugValido) {
        res.status(400).json({ status: 'error', message: 'El slug debe contener solo letras minúsculas, números y guiones' });
        return;
      }
      if (slugValido !== ejercicio.getSlug() && (await slugDuplicado(coleccion.id!, slugValido, ejercicio.id))) {
        res.status(409).json({ status: 'error', message: 'Ya existe un ejercicio de diagrama con ese slug en la colección' });
        return;
      }
      ejercicio.setSlug(slugValido);
    }
    if (orden !== undefined && typeof orden === 'number') ejercicio.setOrden(orden);
    if (enunciado !== undefined) {
      const md = typeof enunciado === 'string' ? enunciado : '';
      ejercicio.setEnunciado(md);
      ejercicio.setEnunciadoHtml(await renderMarkdown(md));
    }
    // El par se valida sobre el resultado, no sobre lo que venga en el cuerpo:
    // una petición que cambia solo el tipo puede dejar inválido el motor que ya
    // estaba guardado, y al revés.
    if (tipoDiagrama !== undefined) {
      const tipo = normalizarTipoDiagrama(tipoDiagrama);
      if (!tipo) {
        res.status(400).json({ status: 'error', message: 'El tipo de diagrama no es válido' });
        return;
      }
      ejercicio.setTipoDiagrama(tipo);
    }
    if (motor !== undefined) ejercicio.setMotor(normalizarMotor(motor));
    const parInvalido = paseElJuez(ejercicio.getTipoDiagrama(), ejercicio.getMotor());
    if (parInvalido) {
      res.status(400).json({ status: 'error', message: parInvalido });
      return;
    }
    if (codigoInicial !== undefined) {
      ejercicio.setCodigoInicial(typeof codigoInicial === 'string' ? codigoInicial : '');
    }
    if (aserciones !== undefined) {
      const aserVal = normalizarAserciones(aserciones);
      if ('error' in aserVal) {
        res.status(400).json({ status: 'error', message: aserVal.error });
        return;
      }
      ejercicio.setAserciones(aserVal);
    }
    if (diagramasContexto !== undefined) {
      const ctxVal = normalizarContexto(diagramasContexto);
      if ('error' in ctxVal) {
        res.status(400).json({ status: 'error', message: ctxVal.error });
        return;
      }
      ejercicio.setDiagramasContexto(ctxVal);
    }
    if (diagramasReferencia !== undefined) {
      ejercicio.setDiagramasReferencia(normalizarDiagramas(diagramasReferencia));
    }
    if (diagramaTrampa !== undefined) {
      ejercicio.setDiagramaTrampa(typeof diagramaTrampa === 'string' ? diagramaTrampa : '');
    }
    if (esEjemplo !== undefined) ejercicio.setEsEjemplo(esEjemplo === true);
    if (categoriaId !== undefined) {
      const categoria = await resolverCategoria(categoriaId, coleccion.id!);
      if (categoria === 'invalido') {
        res.status(400).json({ status: 'error', message: 'La categoría indicada no existe en la colección' });
        return;
      }
      ejercicio.setCategoria(categoria);
    }

    await ejercicio.save(null, { useMasterKey: true });
    res.json({ status: 'ok', ejercicio: ejercicio.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al actualizar el ejercicio de diagrama' });
  }
}

function aVerificable(ejercicio: EjercicioDiagrama) {
  return {
    motor: ejercicio.getMotor(),
    tipoDiagrama: ejercicio.getTipoDiagrama(),
    aserciones: ejercicio.getAserciones(),
    diagramasContexto: ejercicio.getDiagramasContexto(),
    diagramasReferencia: ejercicio.getDiagramasReferencia(),
    diagramaTrampa: ejercicio.getDiagramaTrampa(),
  };
}

/** POST /admin/ejercicios-diagrama/:id/verificar */
export async function verificarEjercicio(req: Request, res: Response): Promise<void> {
  const encontrado = await buscarEjercicio(req.params.id);
  if (!encontrado) {
    res.status(404).json({ status: 'error', message: 'Ejercicio de diagrama no encontrado' });
    return;
  }
  try {
    const informe = await verificarEjercicioDiagrama(aVerificable(encontrado.ejercicio));
    res.json({ status: 'ok', informe });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Error al verificar el ejercicio',
    });
  }
}

/**
 * PUT /admin/ejercicios-diagrama/:id/publicacion — { publicado: boolean }
 *
 * Publicar exige pasar la verificación de autoría, no solo tener aserciones.
 * En el juez de programación bastaba con tener algún caso porque el veredicto
 * dependía de ejecutar código; aquí una aserción sobreajustada o demasiado laxa
 * no se nota al leerla, solo al contrastarla con las referencias y la trampa.
 */
export async function setPublicacionEjercicioDiagrama(req: Request, res: Response): Promise<void> {
  const encontrado = await buscarEjercicio(req.params.id);
  if (!encontrado) {
    res.status(404).json({ status: 'error', message: 'Ejercicio de diagrama no encontrado' });
    return;
  }
  const { ejercicio } = encontrado;
  const publicado = req.body?.publicado === true;

  try {
    if (publicado) {
      const informe = await verificarEjercicioDiagrama(aVerificable(ejercicio));
      if (!informe.ok) {
        res.status(400).json({
          status: 'error',
          message: 'El ejercicio no pasa su verificación y no se puede publicar',
          informe,
        });
        return;
      }
    }
    ejercicio.setPublicado(publicado);
    await ejercicio.save(null, { useMasterKey: true });
    res.json({ status: 'ok', ejercicio: ejercicio.toSafeJSON() });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al cambiar la publicación' });
  }
}

/** DELETE /admin/ejercicios-diagrama/:id (soft-delete) */
export async function deleteEjercicioDiagrama(req: Request, res: Response): Promise<void> {
  const encontrado = await buscarEjercicio(req.params.id);
  if (!encontrado) {
    res.status(404).json({ status: 'error', message: 'Ejercicio de diagrama no encontrado' });
    return;
  }
  try {
    encontrado.ejercicio.softDelete();
    await encontrado.ejercicio.save(null, { useMasterKey: true });
    res.json({ status: 'ok', message: 'Ejercicio de diagrama eliminado' });
  } catch {
    res.status(500).json({ status: 'error', message: 'Error al eliminar el ejercicio de diagrama' });
  }
}
