import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { Coleccion } from './Coleccion.js';

/**
 * Bloque de ejercicios: el nivel de agrupación POR ENCIMA de la categoría
 * (p. ej. "Introducción al lenguaje" contra "Arquitectura MVVM"). Un bloque
 * agrupa categorías; las categorías siguen agrupando ejercicios.
 *
 * Es una entidad y no un campo `bloque` en `CategoriaEjercicio` porque el
 * NOMBRE y el ORDEN del bloque necesitan un dueño único: repetidos en cada
 * categoría, y con un modal que guarda fila a fila, la incoherencia sería el
 * caso normal, y su síntoma —categorías de un bloque intercaladas entre las de
 * otro— es justo lo que este nivel viene a evitar.
 *
 * El vínculo es OPCIONAL en ambos sentidos: una categoría sin bloque sigue
 * siendo válida y cae en un grupo residual. Por eso esto no exige migrar nada:
 * mientras no exista ningún bloque, el listado del alumno se ve igual que antes.
 */
export class BloqueEjercicios extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('BloqueEjercicios', attributes);
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

  /** Texto de entrada del bloque; el listado lo muestra bajo el título. */
  getDescripcion(): string {
    return this.get('descripcion') ?? '';
  }
  setDescripcion(descripcion: string): void {
    this.set('descripcion', descripcion);
  }

  /** Posición entre los bloques de la colección. */
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

Parse.Object.registerSubclass('BloqueEjercicios', BloqueEjercicios);
