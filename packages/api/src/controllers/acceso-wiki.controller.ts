import type { Request, Response } from 'express';
import Parse from 'parse/node';
import { AppUser } from '../models/AppUser.js';
import { AccesoWikiAlumno } from '../models/AccesoWikiAlumno.js';
import { BaseModel } from '../models/BaseModel.js';
import { invalidateColeccionesPermitidas } from '../services/contenidos.service.js';
import { escaparRegex } from '../utils/regex.js';

/**
 * Padrón global de alumnos y sus permisos individuales sobre el wiki.
 *
 * El acceso normal al wiki cuelga del grupo. Esto es la excepción, para el
 * alumno que necesita un contenido que su grupo no le da (una repetidora, una
 * asesoría, alguien que se cambió de sección a medio semestre).
 */

/** Caracteres mínimos de búsqueda, igual que el buscador de alumnos del grupo. */
const BUSCAR_MIN = 2;
/** Tope por página. El padrón crece cada semestre; nunca se devuelve entero. */
const PAGINA_MAX = 50;

/**
 * Qué permisos hay que crear, reactivar y revocar para dejar al alumno con
 * EXACTAMENTE las colecciones pedidas.
 *
 * Pura y aparte para poder probarla: es donde se decide si una llamada quita
 * accesos que nadie pidió quitar. `vigentes` son los permisos vivos ahora;
 * `revocados`, los que existen pero están dados de baja —se reactivan en vez de
 * crear uno nuevo, para no perder quién y cuándo lo otorgó la primera vez—.
 */
export function planificarPermisos(
  deseados: string[],
  vigentes: string[],
  revocados: string[],
): { crear: string[]; reactivar: string[]; revocar: string[] } {
  const queridos = new Set(deseados);
  const vivos = new Set(vigentes);
  const dormidos = new Set(revocados);

  return {
    crear: [...queridos].filter((id) => !vivos.has(id) && !dormidos.has(id)),
    reactivar: [...queridos].filter((id) => !vivos.has(id) && dormidos.has(id)),
    revocar: vigentes.filter((id) => !queridos.has(id)),
  };
}

/**
 * `GET /admin/alumnos` — padrón completo, con búsqueda y paginación.
 *
 * Es el único listado de alumnos que NO cuelga de un grupo: los demás muestran
 * los de una clase. Aquí hace falta ver a cualquiera, incluido el que se quedó
 * sin grupo activo.
 */
export async function listTodosLosAlumnos(req: Request, res: Response): Promise<void> {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const pagina = Math.max(0, Number.parseInt(String(req.query.pagina ?? '0'), 10) || 0);

  if (q !== '' && q.length < BUSCAR_MIN) {
    res.status(400).json({ status: 'error', message: `La búsqueda necesita al menos ${BUSCAR_MIN} caracteres` });
    return;
  }

  try {
    const construir = (): Parse.Query<AppUser> => {
      if (q === '') {
        const base = BaseModel.queryActive<AppUser>('AppUser');
        base.equalTo('userType' as any, 'alumno' as any);
        return base;
      }
      // Escapado: sin esto un `(((` del usuario es una regex inválida (500) y un
      // `(a+)+$` cuelga el servidor.
      const patron = new RegExp(escaparRegex(q), 'i');
      const porCampo = (campo: string) => {
        const query = BaseModel.queryActive<AppUser>('AppUser');
        query.equalTo('userType' as any, 'alumno' as any);
        query.matches(campo as any, patron as any);
        return query;
      };
      return Parse.Query.or(porCampo('matricula'), porCampo('name'), porCampo('email'));
    };

    const query = construir();
    query.ascending('name');
    query.limit(PAGINA_MAX);
    query.skip(pagina * PAGINA_MAX);
    const alumnos = await query.find({ useMasterKey: true });

    // El total va aparte para poder pintar «página 2 de 7». `count` necesita su
    // propia consulta: `find` con `limit` no lo trae.
    const total = await construir().count({ useMasterKey: true });

    // Cuántos permisos individuales tiene cada uno, para poder verlo de un
    // vistazo en la tabla sin abrir a cada alumno.
    const permisosQuery = new Parse.Query<AccesoWikiAlumno>('AccesoWikiAlumno');
    permisosQuery.equalTo('exists' as any, true as any);
    permisosQuery.equalTo('active' as any, true as any);
    permisosQuery.containedIn(
      'alumno' as any,
      alumnos.map((a) => Parse.Object.extend('AppUser').createWithoutData(a.id)) as any,
    );
    permisosQuery.limit(1000);
    const permisos = await permisosQuery.find({ useMasterKey: true });

    const conteo = new Map<string, number>();
    for (const p of permisos) {
      const alumnoId = (p.get('alumno') as Parse.Object | undefined)?.id;
      if (alumnoId) conteo.set(alumnoId, (conteo.get(alumnoId) ?? 0) + 1);
    }

    res.json({
      status: 'ok',
      alumnos: alumnos.map((a) => ({
        id: a.id,
        name: a.getName(),
        email: a.getEmail(),
        matricula: a.get('matricula') ?? '',
        accesosWiki: conteo.get(a.id) ?? 0,
      })),
      total,
      pagina,
      porPagina: PAGINA_MAX,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener los alumnos' });
  }
}

/** `GET /admin/alumnos/:alumnoId/acceso-wiki` — sus permisos y de dónde le viene cada wiki. */
export async function getAccesoWikiAlumno(req: Request, res: Response): Promise<void> {
  const { alumnoId } = req.params;

  try {
    const alumnoQuery = BaseModel.queryActive<AppUser>('AppUser');
    const alumno = await alumnoQuery.get(alumnoId, { useMasterKey: true });
    if (!alumno.isAlumno()) {
      res.status(400).json({ status: 'error', message: 'El usuario no es un alumno' });
      return;
    }

    const permisos = await permisosDelAlumno(alumnoId, { incluirRevocados: false });

    // Las colecciones que ya le dan sus grupos: en la pantalla se marcan como
    // «ya la tiene por su grupo» para no otorgar un permiso que no hace falta.
    const porGrupo = await coleccionIdsDeSusGrupos(alumnoId);

    res.json({
      status: 'ok',
      alumno: { id: alumno.id, name: alumno.getName(), email: alumno.getEmail(), matricula: alumno.get('matricula') ?? '' },
      permisos: permisos.map((p) => p.toSafeJSON()),
      coleccionIdsPorGrupo: [...porGrupo],
    });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Alumno no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al obtener los accesos' });
  }
}

/**
 * `PUT /admin/alumnos/:alumnoId/acceso-wiki` — deja al alumno con EXACTAMENTE
 * las colecciones indicadas.
 *
 * Recibe el conjunto entero, no un «añade esta»: así la llamada es idempotente
 * y dos pestañas abiertas a la vez no se pisan a medias. Lo que desaparece de la
 * lista se revoca.
 */
export async function setAccesoWikiAlumno(req: Request, res: Response): Promise<void> {
  const { alumnoId } = req.params;
  const { coleccionIds } = req.body;

  if (!Array.isArray(coleccionIds) || coleccionIds.some((id) => typeof id !== 'string')) {
    res.status(400).json({ status: 'error', message: 'Se requiere la lista de colecciones' });
    return;
  }

  try {
    const alumnoQuery = BaseModel.queryActive<AppUser>('AppUser');
    const alumno = await alumnoQuery.get(alumnoId, { useMasterKey: true });
    if (!alumno.isAlumno()) {
      res.status(400).json({ status: 'error', message: 'El usuario no es un alumno' });
      return;
    }

    const deseados = [...new Set(coleccionIds as string[])];

    // Las colecciones tienen que existir. Un id inventado es error del cliente,
    // no un permiso que se crea apuntando a la nada.
    if (deseados.length > 0) {
      const q = new Parse.Query('Coleccion');
      q.equalTo('exists' as any, true as any);
      q.containedIn('objectId' as any, deseados as any);
      q.limit(1000);
      const encontradas = await q.find({ useMasterKey: true });
      if (encontradas.length !== deseados.length) {
        res.status(400).json({ status: 'error', message: 'Alguna de las colecciones indicadas no existe' });
        return;
      }
    }

    const todos = await permisosDelAlumno(alumnoId, { incluirRevocados: true });
    const vigentes = todos.filter((p) => p.get('active') === true && p.get('exists') === true);
    const revocados = todos.filter((p) => !(p.get('active') === true && p.get('exists') === true));

    const idColeccion = (p: AccesoWikiAlumno) => (p.get('coleccion') as Parse.Object | undefined)?.id ?? '';
    const plan = planificarPermisos(
      deseados,
      vigentes.map(idColeccion),
      revocados.map(idColeccion),
    );

    const porGuardar: Parse.Object[] = [];

    for (const coleccionId of plan.crear) {
      const permiso = new AccesoWikiAlumno().initDefaults();
      permiso.setAlumno(Parse.Object.extend('AppUser').createWithoutData(alumnoId));
      permiso.setColeccion(Parse.Object.extend('Coleccion').createWithoutData(coleccionId));
      const quien = (req as any).appUser as AppUser | undefined;
      if (quien) permiso.setOtorgadoPor(Parse.Object.extend('AppUser').createWithoutData(quien.id));
      porGuardar.push(permiso);
    }

    for (const coleccionId of plan.reactivar) {
      // Se revive el permiso viejo en vez de crear otro: conserva quién lo
      // otorgó y cuándo, que es justo el rastro que interesa.
      const permiso = revocados.find((p) => idColeccion(p) === coleccionId);
      if (!permiso) continue;
      permiso.set('active', true);
      permiso.set('exists', true);
      porGuardar.push(permiso);
    }

    for (const coleccionId of plan.revocar) {
      const permiso = vigentes.find((p) => idColeccion(p) === coleccionId);
      if (!permiso) continue;
      permiso.softDelete();
      porGuardar.push(permiso);
    }

    if (porGuardar.length > 0) {
      await Parse.Object.saveAll(porGuardar, { useMasterKey: true });
      // El visor cachea 60 s los slugs permitidos por usuario. Sin esto, la
      // alumna se queda hasta un minuto sin ver lo que se le acaba de abrir —o
      // viendo lo que se le acaba de quitar—.
      invalidateColeccionesPermitidas(alumnoId);
    }

    const actualizados = await permisosDelAlumno(alumnoId, { incluirRevocados: false });
    res.json({
      status: 'ok',
      permisos: actualizados.map((p) => p.toSafeJSON()),
      otorgados: plan.crear.length + plan.reactivar.length,
      revocados: plan.revocar.length,
    });
  } catch (error: any) {
    if (error?.code === Parse.Error.OBJECT_NOT_FOUND) {
      res.status(404).json({ status: 'error', message: 'Alumno no encontrado' });
      return;
    }
    res.status(500).json({ status: 'error', message: 'Error al guardar los accesos' });
  }
}

/** Permisos del alumno, con la colección y el otorgante desplegados. */
async function permisosDelAlumno(
  alumnoId: string,
  { incluirRevocados }: { incluirRevocados: boolean },
): Promise<AccesoWikiAlumno[]> {
  const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(alumnoId);
  const q = new Parse.Query<AccesoWikiAlumno>('AccesoWikiAlumno');
  q.equalTo('alumno' as any, alumnoPointer as any);
  if (!incluirRevocados) {
    q.equalTo('exists' as any, true as any);
    q.equalTo('active' as any, true as any);
  }
  q.include('coleccion' as any);
  q.include('otorgadoPor' as any);
  q.limit(1000);
  return q.find({ useMasterKey: true });
}

/** ids de colecciones que el alumno ya tiene por sus grupos activos. */
async function coleccionIdsDeSusGrupos(alumnoId: string): Promise<Set<string>> {
  const alumnoPointer = Parse.Object.extend('AppUser').createWithoutData(alumnoId);
  const q = new Parse.Query('GrupoAlumno');
  q.equalTo('exists' as any, true as any);
  q.equalTo('active' as any, true as any);
  q.equalTo('alumno' as any, alumnoPointer as any);
  q.include('grupo.colecciones' as any);
  q.limit(1000);
  const links = await q.find({ useMasterKey: true });

  const ids = new Set<string>();
  for (const link of links) {
    const grupo = link.get('grupo') as Parse.Object | undefined;
    if (!grupo || grupo.get('exists') === false || grupo.get('active') === false) continue;
    for (const c of (grupo.get('colecciones') ?? []) as Parse.Object[]) {
      if (c && c.get('exists') !== false) ids.add(c.id!);
    }
  }
  return ids;
}
