import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { AppUser } from './AppUser.js';
import type { Grupo } from './Grupo.js';
import type { Pregunta } from './Pregunta.js';

/**
 * Un visor de asesoría encendido: una pregunta del banco que el profesor pone
 * en pantalla para que un alumno practique.
 *
 * A diferencia de la proyección oficial no hay reloj ni alumno, y se abre SIN
 * SESIÓN por un enlace con `token`: el alumno lo escanea en su teléfono. Como
 * cada pregunta tiene el suyo, con varios alumnos a la vez cada uno abre el de
 * la suya. Apagarlo es el soft-delete: el enlace deja de responder al momento.
 */
export class VisorAsesoria extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('VisorAsesoria', attributes);
  }

  getGrupo(): Grupo | undefined {
    return this.get('grupo');
  }
  setGrupo(grupo: Grupo): void {
    this.set('grupo', grupo);
  }

  getPregunta(): Pregunta | undefined {
    return this.get('pregunta');
  }
  setPregunta(pregunta: Pregunta): void {
    this.set('pregunta', pregunta);
  }

  /** Lo que va en el enlace público. Largo y aleatorio: es la única llave. */
  getToken(): string {
    return this.get('token') ?? '';
  }
  setToken(token: string): void {
    this.set('token', token);
  }

  getCreadoPor(): AppUser | undefined {
    return this.get('creadoPor');
  }
  setCreadoPor(user: AppUser): void {
    this.set('creadoPor', user);
  }
}

Parse.Object.registerSubclass('VisorAsesoria', VisorAsesoria);
