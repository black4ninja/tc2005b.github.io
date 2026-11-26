import Parse from 'parse/node';
import { alumnoTieneAccesoAGrupo } from './grupo-alumno.service.js';
import { moduloActivoEnGrupo } from './grupo-colecciones.service.js';
import { esScrumPersonal } from '../constants/scrum.js';

/**
 * ¿Puede el alumno usar Scrum en este ámbito? Lo comparten el tablero, las
 * partidas y su candado, para que la regla esté en un solo sitio.
 *
 * - En un grupo: que sea suyo y que el grupo tenga el módulo encendido.
 * - En el ámbito personal (`GRUPO_PERSONAL`): que se le haya abierto Scrum por
 *   permiso individual en alguna colección.
 *
 * Devuelve null si puede, o el error con el que hay que responder.
 */
export async function denegacionScrumAlumno(
  alumnoId: string,
  grupoId: string,
): Promise<{ codigo: number; mensaje: string } | null> {
  if (esScrumPersonal(grupoId)) {
    return (await tieneScrumPersonal(alumnoId))
      ? null
      : { codigo: 404, mensaje: 'No tienes abierta la práctica de Scrum' };
  }
  const [enElGrupo, moduloActivo] = await Promise.all([
    alumnoTieneAccesoAGrupo(alumnoId, grupoId),
    moduloActivoEnGrupo(grupoId, 'scrum'),
  ]);
  if (!enElGrupo) return { codigo: 403, mensaje: 'No perteneces a este grupo' };
  if (!moduloActivo) return { codigo: 404, mensaje: 'Esta sección no está disponible en tu grupo' };
  return null;
}

/** ¿Tiene algún permiso individual vivo que abra Scrum? */
export async function tieneScrumPersonal(alumnoId: string): Promise<boolean> {
  const q = new Parse.Query('AccesoWikiAlumno');
  q.equalTo('exists' as any, true as any);
  q.equalTo('active' as any, true as any);
  q.equalTo('alumno' as any, Parse.Object.extend('AppUser').createWithoutData(alumnoId) as any);
  // En un campo de lista, `equalTo` es «la contiene».
  q.equalTo('modulos' as any, 'scrum' as any);
  return (await q.count({ useMasterKey: true })) > 0;
}
