import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { Coleccion } from './Coleccion.js';

/**
 * Categoría de ejercicios dentro de una colección: agrupa los ejercicios por
 * tema (p. ej. "Sintaxis básica", "POO", "Principios SOLID") para ordenarlos y
 * presentarlos por secciones. Administrable desde Contenidos.
 */
export class CategoriaEjercicio extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('CategoriaEjercicio', attributes);
  }

  getColeccion(): Coleccion | undefined {
    return this.get('coleccion');
  }
  setColeccion(coleccion: Coleccion): void {
    this.set('coleccion', coleccion);
  }

  getNombre(): string {
    return this.get('nombre') ?? '';
  }
  setNombre(nombre: string): void {
    this.set('nombre', nombre);
  }

  getDescripcion(): string {
    return this.get('descripcion') ?? '';
  }
  setDescripcion(descripcion: string): void {
    this.set('descripcion', descripcion);
  }

  /** Posición entre las categorías de la colección. */
  getOrden(): number {
    return this.get('orden') ?? 0;
  }
  setOrden(orden: number): void {
    this.set('orden', orden);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      coleccionId: this.getColeccion()?.id ?? null,
      nombre: this.getNombre(),
      descripcion: this.getDescripcion(),
      orden: this.getOrden(),
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('CategoriaEjercicio', CategoriaEjercicio);
