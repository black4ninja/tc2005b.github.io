import type { Actividad } from '@/types/calendario';

/**
 * JSON de una actividad del API (`Actividad.toSafeJSON`) → `Actividad` del
 * calendario. Lo comparten crear y editar.
 *
 * Antes cada hook copiaba a mano unos cuantos campos y se quedaban fuera la
 * hora, los responsables y el adjunto: al guardar, la pantalla los perdía
 * aunque la base sí los tuviera (una actividad con «Alejandro» se veía como
 * «Todos» hasta recargar). Aquí van todos.
 *
 * Los responsables llegan como ids; `CalendarContent` les pone el nombre con
 * el staff del grupo (`conResponsables`).
 */
export function actividadDesdeApi(act: Record<string, unknown>): Actividad {
  return {
    id: act.id,
    tipo: act.tipo,
    titulo: act.titulo,
    descripcion: act.descripcion,
    enlace: act.enlace,
    externo: act.externo,
    duracion: act.duracion,
    fechaEntrega: act.fechaEntrega,
    enlacesExtra: act.enlacesExtra,
    archivoNombre: act.archivoNombre,
    archivoMime: act.archivoMime,
    archivoBytes: act.archivoBytes,
    horaInicio: act.horaInicio,
    horaFin: act.horaFin,
    responsables: act.responsables,
  } as Actividad;
}
