import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { EquipoScrum } from './EquipoScrum.js';

/**
 * Una épica: el entregable completo del que cuelgan las historias.
 *
 * Existe por una regla de la dinámica —«solo se puede trabajar en 1 modelo a la
 * vez»— que en el vocabulario del tablero se dice así: un sprint toca UNA épica.
 * Sirve para enseñar que la historia de usuario no es la unidad más grande, y
 * que primero se define el entregable y después se parte.
 *
 * La épica NO es una historia y por eso no vive en ninguna columna: no se
 * arrastra, no se estima y no cuenta puntos. Solo agrupa.
 */
export class EpicaScrum extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('EpicaScrum', attributes);
  }

  getEquipo(): EquipoScrum | undefined {
    return this.get('equipo');
  }
  setEquipo(equipo: EquipoScrum): void {
    this.set('equipo', equipo);
  }

  getEquipoId(): string {
    return this.get('equipo')?.id ?? '';
  }

  getNombre(): string {
    return this.get('nombre') ?? '';
  }
  setNombre(nombre: string): void {
    this.set('nombre', nombre);
  }

  getColor(): string {
    return this.get('color') ?? '#7c3aed';
  }
  setColor(color: string): void {
    this.set('color', color);
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
      equipo: this.getEquipoId(),
    };
  }
}

Parse.Object.registerSubclass('EpicaScrum', EpicaScrum);
