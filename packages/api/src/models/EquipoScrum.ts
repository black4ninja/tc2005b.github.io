import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { AppUser } from './AppUser.js';
import type { DinamicaScrum } from './DinamicaScrum.js';

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

  /** La frase a la que el equipo se compromete este sprint. Puede estar vacía. */
  getObjetivo(): string {
    return this.get('objetivo') ?? '';
  }
  setObjetivo(objetivo: string): void {
    this.set('objetivo', objetivo);
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
      objetivo: this.getObjetivo(),
      orden: this.getOrden(),
      miembros: this.getMiembros().map((m) => ({
        id: m.id,
        name: m.get('name') ?? '',
        matricula: m.get('matricula') ?? '',
      })),
    };
  }
}

Parse.Object.registerSubclass('EquipoScrum', EquipoScrum);
