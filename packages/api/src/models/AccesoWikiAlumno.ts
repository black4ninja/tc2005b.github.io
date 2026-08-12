import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { AppUser } from './AppUser.js';
import type { Coleccion } from './Coleccion.js';

/**
 * Permiso INDIVIDUAL de un alumno sobre una colección del wiki.
 *
 * El acceso normal al wiki se hereda del grupo: un alumno ve las colecciones de
 * sus grupos activos. Esto es la excepción — «a esta alumna, además, ábrele
 * TC2005B» — y se suma a lo que ya tuviera, sin quitarle nada.
 *
 * Es EXCLUSIVO del wiki (`documentacion`). No abre competencias, ni actividades,
 * ni ejercicios, ni diagramas: esos módulos siguen colgando del grupo y solo del
 * grupo. Es deliberado, no un olvido — un permiso que abriera de todo sería un
 * segundo sistema de permisos en paralelo al de grupos.
 *
 * Se suma, nunca resta: si el alumno pierde el grupo que le daba la colección,
 * este permiso se la sigue dando; y si luego entra a un grupo que la tiene, la
 * ve una sola vez. Quitar el permiso solo le quita lo que el permiso daba.
 *
 * NO salta la publicación: una colección en borrador no se ve ni con permiso.
 * El permiso sustituye a «pertenece a un grupo con este contenido», no a «este
 * contenido ya está listo para leerse».
 */
export class AccesoWikiAlumno extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('AccesoWikiAlumno', attributes);
  }

  getAlumno(): AppUser | undefined {
    return this.get('alumno');
  }
  setAlumno(alumno: AppUser | Parse.Object): void {
    this.set('alumno', alumno);
  }

  getColeccion(): Coleccion | undefined {
    return this.get('coleccion');
  }
  setColeccion(coleccion: Coleccion | Parse.Object): void {
    this.set('coleccion', coleccion);
  }

  /**
   * Quién lo otorgó. Es un permiso de acceso a contenido: conviene poder
   * responder «¿y esto quién se lo abrió?» sin adivinar por fechas.
   */
  getOtorgadoPor(): AppUser | undefined {
    return this.get('otorgadoPor');
  }
  setOtorgadoPor(usuario: AppUser | Parse.Object): void {
    this.set('otorgadoPor', usuario);
  }

  toSafeJSON(): Record<string, unknown> {
    const coleccion = this.getColeccion() as Parse.Object | undefined;
    const otorgadoPor = this.getOtorgadoPor() as Parse.Object | undefined;
    return {
      id: this.id,
      coleccionId: coleccion?.id ?? null,
      // Requieren `include`; sin él llegan como pointers sin datos.
      coleccion: coleccion?.get('nombre')
        ? {
            id: coleccion.id,
            nombre: coleccion.get('nombre'),
            slug: coleccion.get('slug') ?? null,
            clave: coleccion.get('clave') ?? null,
            publicada: coleccion.get('publicada') === true,
          }
        : null,
      otorgadoPor: otorgadoPor?.get('name')
        ? { id: otorgadoPor.id, name: otorgadoPor.get('name'), email: otorgadoPor.get('email') ?? null }
        : null,
      createdAt: this.createdAt,
    };
  }
}

Parse.Object.registerSubclass('AccesoWikiAlumno', AccesoWikiAlumno);
