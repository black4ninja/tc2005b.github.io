import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { renderMarkdown } from '@tc2005b/contenido-pipeline';
import { Coleccion } from '../models/Coleccion.js';
import { EjercicioProgramacion, type CasoPrueba, type CodigoInicial } from '../models/EjercicioProgramacion.js';
import type { AppUser } from '../models/AppUser.js';
import { getColeccionActiva } from './cms-documentos.controller.js';
import { LENGUAJES, esLenguaje } from '../services/judge/index.js';

// Nota: este controller es del módulo "Ejercicios" (mini-juez). No confundir con
// ejercicios.controller.ts, que solo lista HTML estático de static-legacy.

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Cotas de recursos configurables por ejercicio (el default vive en el modelo).
const TIEMPO_MIN_MS = 1000;
const TIEMPO_MAX_MS = 15000;
const MEMORIA_MIN_MB = 64;
const MEMORIA_MAX_MB = 512;

function parseSlug(valor: unknown): string | null {
  return typeof valor === 'string' && SLUG_REGEX.test(valor) ? valor : null;
}

/** Busca un ejercicio existente con su colección viva (solo `exists`). */
async function buscarEjercicio(
  id: string,
): Promise<{ ejercicio: EjercicioProgramacion; coleccion: Coleccion } | null> {
  try {
    const q = new Parse.Query<EjercicioProgramacion>('EjercicioProgramacion');
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

/** ¿Ya hay otro ejercicio con ese slug en la colección? */
async function slugDuplicado(coleccionId: string, slug: string, excludeId?: string): Promise<boolean> {
  const q = new Parse.Query<EjercicioProgramacion>('EjercicioProgramacion');
  q.equalTo('coleccion' as any, Coleccion.createWithoutData(coleccionId) as any);
  q.equalTo('slug' as any, slug as any);
  q.equalTo('exists' as any, true as any);
  if (excludeId) q.notEqualTo('objectId' as any, excludeId as any);
  return !!(await q.first({ useMasterKey: true }));
}

/** Valida y normaliza la lista de lenguajes permitidos (subconjunto no vacío). */
function normalizarLenguajes(valor: unknown): string[] | null {
  if (!Array.isArray(valor) || valor.length === 0) return null;
  const unicos = [...new Set(valor)];
  if (!unicos.every((l) => esLenguaje(l))) return null;
  // Mantener el orden del catálogo para una UI estable.
  return LENGUAJES.filter((l) => unicos.includes(l));
}

/** Valida y normaliza los casos de prueba. */
function normalizarCasos(valor: unknown): CasoPrueba[] | null {
  if (!Array.isArray(valor)) return null;
  const casos: CasoPrueba[] = [];
  for (const c of valor) {
    if (c === null || typeof c !== 'object') return null;
    const entrada = (c as any).entrada;
    const salidaEsperada = (c as any).salidaEsperada;
    if (typeof entrada !== 'string' || typeof salidaEsperada !== 'string') return null;
    casos.push({ entrada, salidaEsperada, oculto: (c as any).oculto === true });
  }
  return casos;
}

function normalizarCodigoInicial(valor: unknown): CodigoInicial {
  const out: CodigoInicial = {};
  if (valor && typeof valor === 'object') {
    for (const l of LENGUAJES) {
      const v = (valor as any)[l];
      if (typeof v === 'string') out[l] = v;
    }
  }
  return out;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** GET /admin/colecciones/:id/ejercicios */
export async function listEjercicios(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const coleccion = await getColeccionActiva(id);
    if (!coleccion) {
      res.status(404).json({ status: 'error', message: 'Colección no encontrada' });
      return;
    }
    const q = new Parse.Query<EjercicioProgramacion>('EjercicioProgramacion');
    q.equalTo('coleccion' as any, Coleccion.createWithoutData(id) as any);
    q.equalTo('exists' as any, true as any);
    q.ascending('orden');
    q.limit(1000);
    const ejercicios = await q.find({ useMasterKey: true });
    res.json({ status: 'ok', ejercicios: ejercicios.map((e) => e.toSafeJSON()) });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener ejercicios' });
  }
}

/** POST /admin/colecciones/:id/ejercicios */
export async function createEjercicio(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { titulo, slug, orden, enunciado, lenguajes, codigoInicial, limiteTiempoMs, limiteMemoriaMb, casos } = req.body ?? {};

  if (!titulo || typeof titulo !== 'string' || !titulo.trim()) {
    res.status(400).json({ status: 'error', message: 'El título es requerido' });
    return;
  }
  const slugValido = parseSlug(slug);
  if (!slugValido) {
    res.status(400).json({ status: 'error', message: 'El slug debe contener solo letras minúsculas, números y guiones' });
    return;
  }
  const lenguajesValidos = normalizarLenguajes(lenguajes);
  if (!lenguajesValidos) {
    res.status(400).json({ status: 'error', message: 'Elige al menos un lenguaje válido (kotlin o swift)' });
    return;
  }
  const casosValidos = normalizarCasos(casos ?? []);
  if (!casosValidos) {
    res.status(400).json({ status: 'error', message: 'Los casos de prueba tienen un formato inválido' });
    return;
  }

  try {
    const coleccion = await getColeccionActiva(id);
    if (!coleccion) {
      res.status(404).json({ status: 'error', message: 'Colección no encontrada' });
      return;
    }
    if (await slugDuplicado(id, slugValido)) {
      res.status(409).json({ status: 'error', message: 'Ya existe un ejercicio con ese slug en la colección' });
      return;
    }

    const ejercicio = new EjercicioProgramacion().initDefaults();
    ejercicio.setColeccion(coleccion);
    ejercicio.setTitulo(titulo.trim());
    ejercicio.setSlug(slugValido);
    ejercicio.setOrden(typeof orden === 'number' ? orden : 0);
    const md = typeof enunciado === 'string' ? enunciado : '';
    ejercicio.setEnunciado(md);
    ejercicio.setEnunciadoHtml(await renderMarkdown(md));
    ejercicio.setLenguajes(lenguajesValidos);
    ejercicio.setCodigoInicial(normalizarCodigoInicial(codigoInicial));
    ejercicio.setLimiteTiempoMs(clamp(Number(limiteTiempoMs) || 5000, TIEMPO_MIN_MS, TIEMPO_MAX_MS));
    ejercicio.setLimiteMemoriaMb(clamp(Number(limiteMemoriaMb) || 256, MEMORIA_MIN_MB, MEMORIA_MAX_MB));
    ejercicio.setCasos(casosValidos);
    ejercicio.setPublicado(false); // nace como borrador
    const autor = req.appUser as AppUser | undefined;
    if (autor) ejercicio.setAutor(autor);

    await ejercicio.save(null, { useMasterKey: true });
    res.status(201).json({ status: 'ok', ejercicio: ejercicio.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear ejercicio' });
  }
}

/** GET /admin/ejercicios/:id */
export async function getEjercicio(req: Request, res: Response): Promise<void> {
  const encontrado = await buscarEjercicio(req.params.id);
  if (!encontrado) {
    res.status(404).json({ status: 'error', message: 'Ejercicio no encontrado' });
    return;
  }
  res.json({ status: 'ok', ejercicio: encontrado.ejercicio.toSafeJSON() });
}

/** PUT /admin/ejercicios/:id */
export async function updateEjercicio(req: Request, res: Response): Promise<void> {
  const encontrado = await buscarEjercicio(req.params.id);
  if (!encontrado) {
    res.status(404).json({ status: 'error', message: 'Ejercicio no encontrado' });
    return;
  }
  const { ejercicio, coleccion } = encontrado;
  const { titulo, slug, orden, enunciado, lenguajes, codigoInicial, limiteTiempoMs, limiteMemoriaMb, casos } = req.body ?? {};

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
        res.status(409).json({ status: 'error', message: 'Ya existe un ejercicio con ese slug en la colección' });
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
    if (lenguajes !== undefined) {
      const lenguajesValidos = normalizarLenguajes(lenguajes);
      if (!lenguajesValidos) {
        res.status(400).json({ status: 'error', message: 'Elige al menos un lenguaje válido (kotlin o swift)' });
        return;
      }
      ejercicio.setLenguajes(lenguajesValidos);
    }
    if (codigoInicial !== undefined) ejercicio.setCodigoInicial(normalizarCodigoInicial(codigoInicial));
    if (limiteTiempoMs !== undefined) ejercicio.setLimiteTiempoMs(clamp(Number(limiteTiempoMs) || 5000, TIEMPO_MIN_MS, TIEMPO_MAX_MS));
    if (limiteMemoriaMb !== undefined) ejercicio.setLimiteMemoriaMb(clamp(Number(limiteMemoriaMb) || 256, MEMORIA_MIN_MB, MEMORIA_MAX_MB));
    if (casos !== undefined) {
      const casosValidos = normalizarCasos(casos);
      if (!casosValidos) {
        res.status(400).json({ status: 'error', message: 'Los casos de prueba tienen un formato inválido' });
        return;
      }
      ejercicio.setCasos(casosValidos);
    }

    await ejercicio.save(null, { useMasterKey: true });
    res.json({ status: 'ok', ejercicio: ejercicio.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al actualizar ejercicio' });
  }
}

/**
 * PUT /admin/ejercicios/:id/publicacion — { publicado: boolean }
 * Publicar exige al menos un caso de prueba (si no, no hay nada que evaluar).
 */
export async function setPublicacionEjercicio(req: Request, res: Response): Promise<void> {
  const encontrado = await buscarEjercicio(req.params.id);
  if (!encontrado) {
    res.status(404).json({ status: 'error', message: 'Ejercicio no encontrado' });
    return;
  }
  const { ejercicio } = encontrado;
  const publicado = req.body?.publicado === true;
  if (publicado && ejercicio.getCasos().length === 0) {
    res.status(400).json({ status: 'error', message: 'No se puede publicar un ejercicio sin casos de prueba' });
    return;
  }
  try {
    ejercicio.setPublicado(publicado);
    await ejercicio.save(null, { useMasterKey: true });
    res.json({ status: 'ok', ejercicio: ejercicio.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al cambiar la publicación' });
  }
}

/** DELETE /admin/ejercicios/:id (soft-delete) */
export async function deleteEjercicio(req: Request, res: Response): Promise<void> {
  const encontrado = await buscarEjercicio(req.params.id);
  if (!encontrado) {
    res.status(404).json({ status: 'error', message: 'Ejercicio no encontrado' });
    return;
  }
  try {
    encontrado.ejercicio.softDelete();
    await encontrado.ejercicio.save(null, { useMasterKey: true });
    res.json({ status: 'ok', message: 'Ejercicio eliminado' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al eliminar ejercicio' });
  }
}
