import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { BaseModel } from '../models/BaseModel.js';
import { Grupo } from '../models/Grupo.js';
import { esModuloValido } from '../models/modulos-contenido.js';
import { invalidateColeccionesPermitidas } from '../services/contenidos.service.js';
import { invalidateAccesoModulos } from '../services/acceso-modulos.service.js';
import { getGruposDeStaff } from '../services/grupo-admin.service.js';
import { sanitizarUrlHref } from '../utils/url.js';

/** Valores admitidos por `GET /admin/grupos?estado=`. */
export const ESTADOS_LISTADO = ['activos', 'inactivos', 'eliminados', 'todos'] as const;
export type EstadoListado = (typeof ESTADOS_LISTADO)[number];

/**
 * Traduce `?estado=` a constraints sobre `active`/`exists`. Recordatorio: el
 * borrado es LÓGICO (`softDelete()` pone ambos a false), así que un eliminado
 * también tiene `active: false`; el discriminante real es `exists`.
 *
 * `undefined` (sin parámetro) NO es "activos": mantiene el comportamiento
 * histórico —los no eliminados— porque el sidebar y la página de detalle
 * resuelven el grupo actual desde este mismo listado y se quedarían sin nombre
 * al abrir un grupo inactivo.
 *
 * `inactivos` usa `notEqualTo(active, true)` (no `equalTo(false)`) para que
 * caigan también los registros antiguos sin el campo. `eliminados`, en cambio,
 * exige `exists === false`: un registro sin el campo no es un borrado.
 */
export function aplicarFiltroEstado(query: Parse.Query<Grupo>, estado: EstadoListado | undefined): void {
  switch (estado) {
    case 'activos':
      query.equalTo('exists' as any, true as any);
      query.equalTo('active' as any, true as any);
      break;
    case 'inactivos':
      query.equalTo('exists' as any, true as any);
      query.notEqualTo('active' as any, true as any);
      break;
    case 'eliminados':
      query.equalTo('exists' as any, false as any);
      break;
    case 'todos':
      break;
    default:
      query.equalTo('exists' as any, true as any);
  }
}

export async function listGrupos(req: Request, res: Response): Promise<void> {
  const estadoParam = req.query.estado;
  if (estadoParam !== undefined && !ESTADOS_LISTADO.includes(estadoParam as EstadoListado)) {
    res.status(400).json({
      status: 'error',
      message: `estado debe ser uno de: ${ESTADOS_LISTADO.join(', ')}`,
    });
    return;
  }
  const estado = estadoParam as EstadoListado | undefined;

  try {
    // El profesor solo ve SUS grupos (donde figura en Grupo.admins); el admin,
    // todos. Es lo que hace que su vista de grupo funcione sin exponerle el resto.
    if (req.appUser?.isProfesor()) {
      // `getGruposDeStaff` devuelve SIEMPRE los activos, así que aquí el filtro
      // no se puede atender. Se rechaza en vez de ignorarlo: la ruta es de staff
      // (`requireStaff`, no `requireAdmin`), y respondiendo los grupos vigentes
      // a un `?estado=eliminados` la pantalla le diría al profesor que sus
      // grupos están borrados.
      if (estado !== undefined && estado !== 'activos') {
        res.status(403).json({
          status: 'error',
          message: 'Un profesor solo puede consultar sus grupos activos',
        });
        return;
      }
      const grupos = await getGruposDeStaff(req.appUser.id);
      res.json({ status: 'ok', grupos: grupos.map((g) => g.toSafeJSON()) });
      return;
    }

    const query = new Parse.Query<Grupo>('Grupo');
    aplicarFiltroEstado(query, estado);
    query.include('colecciones' as any);
    query.include('admins' as any);
    query.descending('createdAt');
    const grupos = await query.find({ useMasterKey: true });

    res.json({
      status: 'ok',
      grupos: grupos.map((g) => g.toSafeJSON()),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener grupos' });
  }
}

/**
 * ids de colecciones → pointers VALIDADOS (existentes). null = payload no-array
 * (se ignora); un id inexistente es error del cliente (400).
 */
async function resolverColecciones(value: unknown): Promise<Parse.Object[] | 'invalido' | null> {
  if (!Array.isArray(value)) return null;
  const ids = [...new Set(value.filter((s): s is string => typeof s === 'string' && s.trim() !== ''))];
  if (ids.length === 0) return [];
  const q = new Parse.Query('Coleccion');
  q.equalTo('exists' as any, true as any);
  q.containedIn('objectId' as any, ids as any);
  const encontradas = await q.find({ useMasterKey: true });
  if (encontradas.length !== ids.length) return 'invalido';
  return encontradas;
}

/**
 * ids de personal → pointers VALIDADOS. Igual que resolverColecciones, pero
 * además exige que cada id sea un AppUser activo de tipo STAFF (admin o
 * profesor): así un alumno no puede colarse como admin de un grupo por
 * manipular el payload. null = no-array (se ignora); 'invalido' = algún id no
 * es staff (400).
 */
async function resolverAdmins(value: unknown): Promise<Parse.Object[] | 'invalido' | null> {
  if (!Array.isArray(value)) return null;
  const ids = [...new Set(value.filter((s): s is string => typeof s === 'string' && s.trim() !== ''))];
  if (ids.length === 0) return [];
  const q = BaseModel.queryActive('AppUser');
  q.containedIn('userType' as any, ['admin', 'profesor'] as any);
  q.containedIn('objectId' as any, ids as any);
  const encontrados = await q.find({ useMasterKey: true });
  if (encontrados.length !== ids.length) return 'invalido';
  return encontrados;
}

/** Días del mes por mes (índice 1-12); febrero se ajusta aparte. */
const DIAS_POR_MES = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

/**
 * `YYYY-MM-DD` (lo que manda un `<input type="date">`) → medianoche UTC.
 * `null`/`''` = quitar la fecha; `'invalida'` = error del cliente (400).
 *
 * Se fija la hora en UTC A PROPÓSITO. Estas fechas son días de calendario, y
 * una fecha sin zona se acaba interpretando en la del navegador: guardada la
 * medianoche UTC del 10-ago, cualquier lectura en horario de México (UTC-6)
 * cae en el 9-ago a las 18:00 y la interfaz enseña el día anterior. Con el día
 * anclado en UTC de punta a punta, lo que se escribe es lo que se lee, esté
 * donde esté el servidor o quien mire.
 *
 * La validación es por componentes y no con `new Date`: un `2026-02-31` no da
 * `Invalid Date`, se DESBORDA al 3 de marzo y se guardaría un día que nadie
 * escribió.
 */
export function parseFechaDia(valor: unknown): Date | null | 'invalida' {
  if (valor === null || valor === '') return null;
  if (typeof valor !== 'string') return 'invalida';

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());
  if (!m) return 'invalida';
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12) return 'invalida';
  const tope = mes === 2 && esBisiesto(anio) ? 29 : DIAS_POR_MES[mes];
  if (dia < 1 || dia > tope) return 'invalida';

  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  // `Date.UTC` arrastra el mapeo heredado de años de dos cifras: un año 0-99 se
  // convierte en 1900+año, así que el `0026-08-10` que produce Chrome cuando se
  // teclea solo "26" en el campo del año se guardaría como 1926 sin quejarse.
  // Se comprueba que el año sobrevive al viaje en vez de recortar el rango a
  // mano: cubre ese mapeo y cualquier otro ajuste silencioso.
  if (fecha.getUTCFullYear() !== anio) return 'invalida';
  return fecha;
}

export async function createGrupo(req: Request, res: Response): Promise<void> {
  const { name, fechaInicio, fechaFin, urlAgendaEntrevistas } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ status: 'error', message: 'El nombre es requerido' });
    return;
  }

  const url = sanitizarUrlHref(urlAgendaEntrevistas);
  if (url === null) {
    res.status(400).json({ status: 'error', message: 'La URL de la agenda debe empezar por http:// o https://' });
    return;
  }

  const inicio = fechaInicio === undefined ? null : parseFechaDia(fechaInicio);
  const fin = fechaFin === undefined ? null : parseFechaDia(fechaFin);
  if (inicio === 'invalida' || fin === 'invalida') {
    res.status(400).json({ status: 'error', message: 'Las fechas deben tener el formato AAAA-MM-DD' });
    return;
  }

  try {
    const grupo = new Grupo().initDefaults();
    grupo.setName(name.trim());
    if (inicio) grupo.setFechaInicio(inicio);
    if (fin) grupo.setFechaFin(fin);
    if (url) grupo.setUrlAgendaEntrevistas(url);

    // Las colecciones (y sus módulos) NO se asignan aquí: van por la acción
    // "Asignaciones" (PUT /admin/grupos/:id/asignaciones). Un grupo nace vacío.
    const adminsPtrs = await resolverAdmins(req.body.admins);
    if (adminsPtrs === 'invalido') {
      res.status(400).json({ status: 'error', message: 'Alguno de los administradores indicados no existe o no es admin' });
      return;
    }
    if (adminsPtrs) grupo.setAdmins(adminsPtrs);

    await grupo.save(null, { useMasterKey: true });

    res.status(201).json({ status: 'ok', grupo: grupo.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al crear grupo' });
  }
}

export async function updateGrupo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, fechaInicio, fechaFin, urlAgendaEntrevistas } = req.body;

  try {
    // Por `exists`, NO por `queryActive`: un grupo desactivado sigue siendo un
    // grupo y se tiene que poder editar. `queryActive` exige además
    // `active: true`, así que archivar un grupo lo dejaba inmodificable — el
    // 404 saltaba al guardar, con la edición ya escrita y perdida.
    const query = new Parse.Query<Grupo>('Grupo');
    query.equalTo('exists' as any, true as any);
    // colecciones/admins incluidos: toSafeJSON serializa pointers y sin fetch
    // respondería nulls (y no podría filtrar soft-deleted).
    query.include('colecciones' as any);
    query.include('admins' as any);
    const grupo = await query.get(id, { useMasterKey: true });

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({ status: 'error', message: 'El nombre no puede estar vacío' });
        return;
      }
      grupo.setName(name.trim());
    }
    // `null` (o '') limpia la fecha; ausente = no se toca. Un `undefined` no
    // sirve para borrar: JSON.stringify lo quita del cuerpo y aquí no llegaría
    // nada que distinguir de "no la mandes".
    if (fechaInicio !== undefined) {
      const inicio = parseFechaDia(fechaInicio);
      if (inicio === 'invalida') {
        res.status(400).json({ status: 'error', message: 'La fecha de inicio debe tener el formato AAAA-MM-DD' });
        return;
      }
      grupo.setFechaInicio(inicio ?? undefined);
    }
    if (fechaFin !== undefined) {
      const fin = parseFechaDia(fechaFin);
      if (fin === 'invalida') {
        res.status(400).json({ status: 'error', message: 'La fecha de fin debe tener el formato AAAA-MM-DD' });
        return;
      }
      grupo.setFechaFin(fin ?? undefined);
    }
    if (urlAgendaEntrevistas !== undefined) {
      const url = sanitizarUrlHref(urlAgendaEntrevistas);
      if (url === null) {
        res.status(400).json({ status: 'error', message: 'La URL de la agenda debe empezar por http:// o https://' });
        return;
      }
      // '' limpia el campo: así se puede quitar el enlace de un grupo.
      if (url) grupo.setUrlAgendaEntrevistas(url);
      else grupo.unset('urlAgendaEntrevistas');
    }
    // Los administradores del grupo son CONFIGURACIÓN: solo el admin los reasigna
    // (un profesor edita nombre/fechas/agenda, no esto — se ignora si lo manda).
    // Las COLECCIONES y sus módulos ya no van por aquí: viven en la acción
    // "Asignaciones" (PUT /admin/grupos/:id/asignaciones).
    if (req.appUser?.isAdmin() === true) {
      const adminsPtrs = await resolverAdmins(req.body.admins);
      if (adminsPtrs === 'invalido') {
        res.status(400).json({ status: 'error', message: 'Alguno de los administradores indicados no existe o no es staff' });
        return;
      }
      if (adminsPtrs) grupo.setAdmins(adminsPtrs);
    }

    await grupo.save(null, { useMasterKey: true });

    res.json({ status: 'ok', grupo: grupo.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al actualizar grupo' });
  }
}

/**
 * PUT /admin/grupos/:id/asignaciones — { asignaciones: [{ coleccionId, deshabilitados: string[] }] }
 *
 * Fija QUÉ colecciones tiene el grupo y, por colección, qué MÓDULOS quedan
 * apagados (Documentación/Páginas/Competencias/Actividades). Reemplaza al viejo
 * campo `colecciones` del form de editar. Guarda `colecciones` (las asignadas) y
 * `modulosDeshabilitados` (solo entradas con algo apagado — vacío = todo on).
 */
export async function setAsignacionesGrupo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { asignaciones } = req.body ?? {};

  if (!Array.isArray(asignaciones)) {
    res.status(400).json({ status: 'error', message: 'asignaciones debe ser un arreglo' });
    return;
  }

  // Normalizar: id de colección + keys apagadas válidas (dedup, sin basura).
  const coleccionIds: string[] = [];
  const deshabilitadosPorColeccion: Record<string, string[]> = {};
  for (const a of asignaciones) {
    const coleccionId = a?.coleccionId;
    if (typeof coleccionId !== 'string' || !coleccionId.trim()) {
      res.status(400).json({ status: 'error', message: 'Cada asignación necesita un coleccionId' });
      return;
    }
    const off = Array.isArray(a?.deshabilitados) ? a.deshabilitados : [];
    if (off.some((k: unknown) => !esModuloValido(k))) {
      res.status(400).json({ status: 'error', message: 'Módulo inválido en deshabilitados' });
      return;
    }
    coleccionIds.push(coleccionId);
    const unicos = [...new Set(off as string[])];
    if (unicos.length > 0) deshabilitadosPorColeccion[coleccionId] = unicos;
  }

  try {
    // Por `exists`, como en updateGrupo: un grupo desactivado se sigue
    // configurando (ver el comentario de allí).
    const query = new Parse.Query<Grupo>('Grupo');
    query.equalTo('exists' as any, true as any);
    query.include('colecciones' as any);
    query.include('admins' as any);
    const grupo = await query.get(id, { useMasterKey: true });

    const coleccionesPtrs = await resolverColecciones(coleccionIds);
    if (coleccionesPtrs === 'invalido') {
      res.status(400).json({ status: 'error', message: 'Alguna colección indicada no existe' });
      return;
    }
    grupo.setColecciones(coleccionesPtrs ?? []);
    // Solo se guardan las entradas de colecciones REALMENTE asignadas (ignora
    // deshabilitados de colecciones que se quitaron).
    const asignadas = new Set((coleccionesPtrs ?? []).map((c) => c.id));
    const limpio: Record<string, string[]> = {};
    for (const [cid, off] of Object.entries(deshabilitadosPorColeccion)) {
      if (asignadas.has(cid)) limpio[cid] = off;
    }
    grupo.setModulosDeshabilitados(limpio);

    await grupo.save(null, { useMasterKey: true });
    invalidateColeccionesPermitidas();
    invalidateAccesoModulos(); // el mismo cambio afecta a TODOS los módulos opt-in

    res.json({ status: 'ok', grupo: grupo.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al guardar las asignaciones' });
  }
}

export async function archiveGrupo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const query = new Parse.Query<Grupo>('Grupo');
    query.equalTo('exists' as any, true as any);
    query.include('colecciones' as any);
    const grupo = await query.get(id, { useMasterKey: true });

    if (grupo.get('active')) {
      grupo.deactivate();
    } else {
      grupo.activate();
    }
    await grupo.save(null, { useMasterKey: true });
    // Archivar/reactivar cambia el acceso de todos sus alumnos al CMS.
    invalidateColeccionesPermitidas();
    invalidateAccesoModulos(); // el mismo cambio afecta a TODOS los módulos opt-in

    res.json({ status: 'ok', grupo: grupo.toSafeJSON() });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al cambiar estado del grupo' });
  }
}

export async function deleteGrupo(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const query = new Parse.Query<Grupo>('Grupo');
    query.equalTo('exists' as any, true as any);
    const grupo = await query.get(id, { useMasterKey: true });

    grupo.softDelete();
    await grupo.save(null, { useMasterKey: true });

    res.json({ status: 'ok', message: 'Grupo eliminado' });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Grupo no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al eliminar grupo' });
  }
}
