import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { AppUser } from './AppUser.js';
import type { DinamicaScrum } from './DinamicaScrum.js';
import type { EpicaScrum } from './EpicaScrum.js';

/**
 * Un equipo dentro de una dinámica, con su gente y su objetivo de sprint.
 *
 * No reutiliza `Equipo` a propósito: aquel es del GRUPO y lleva el repositorio
 * del proyecto semestral, que dura todo el curso. Este se rehace en cada
 * dinámica, que es parte del ejercicio —trabajar con gente distinta cada sprint—
 * y mezclarlos habría hecho que cambiar el reparto de un taller reescribiera los
 * equipos del proyecto.
 *
 * El objetivo del sprint vive aquí y no en la dinámica porque cada equipo se
 * compromete al suyo: es lo que va dentro del recuadro del sprint backlog.
 */
export class EquipoScrum extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('EquipoScrum', attributes);
  }

  getDinamica(): DinamicaScrum | undefined {
    return this.get('dinamica');
  }
  setDinamica(dinamica: DinamicaScrum): void {
    this.set('dinamica', dinamica);
  }

  getDinamicaId(): string {
    return this.get('dinamica')?.id ?? '';
  }

  getNombre(): string {
    return this.get('nombre') ?? '';
  }
  setNombre(nombre: string): void {
    this.set('nombre', nombre);
  }

  getColor(): string {
    return this.get('color') ?? '#64748b';
  }
  setColor(color: string): void {
    this.set('color', color);
  }

  /**
   * El Product Owner del equipo. Lo elige el propio equipo y es UNO: escribe y
   * prioriza las historias, y reporta en el review las restricciones que no se
   * cumplieron. No es un candado —el visto bueno lo marca cualquiera— porque en
   * un sprint de 90 segundos un cuello de botella de una persona cuesta más de
   * lo que enseña.
   */
  getPo(): AppUser | undefined {
    return this.get('po');
  }
  setPo(alumno: AppUser | null): void {
    if (alumno) this.set('po', alumno);
    else this.unset('po');
  }

  getPoId(): string | null {
    return this.get('po')?.id ?? null;
  }

  /** La épica que este equipo está trabajando: un modelo a la vez. */
  getEpicaActual(): EpicaScrum | undefined {
    return this.get('epicaActual');
  }
  setEpicaActual(epica: EpicaScrum | null): void {
    if (epica) this.set('epicaActual', epica);
    else this.unset('epicaActual');
  }

  /**
   * Puntos de deuda que el equipo arrastra al siguiente sprint. Se calcula al
   * cerrar un sprint y se consume al salir del planning del siguiente, cuando
   * el sistema devuelve historias al backlog hasta cubrirlo.
   */
  getBloqueoPendiente(): number {
    return this.get('bloqueoPendiente') ?? 0;
  }
  setBloqueoPendiente(puntos: number): void {
    this.set('bloqueoPendiente', Math.max(0, puntos));
  }

  getMiembros(): AppUser[] {
    return this.get('miembros') ?? [];
  }
  setMiembros(miembros: AppUser[]): void {
    this.set('miembros', miembros);
  }

  /** Ids de los miembros sin resolver los punteros: basta para comprobar. */
  getMiembroIds(): string[] {
    return this.getMiembros().map((m) => m.id).filter((id): id is string => !!id);
  }

  getOrden(): number {
    return this.get('orden') ?? 0;
  }
  setOrden(orden: number): void {
    this.set('orden', orden);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      nombre: this.getNombre(),
      color: this.getColor(),
      orden: this.getOrden(),
      po: this.getPoId(),
      epicaActual: this.getEpicaActual()?.id ?? null,
      bloqueoPendiente: this.getBloqueoPendiente(),
      miembros: this.getMiembros().map((m) => ({
        id: m.id,
        name: m.get('name') ?? '',
        matricula: m.get('matricula') ?? '',
      })),
    };
  }
}

Parse.Object.registerSubclass('EquipoScrum', EquipoScrum);
