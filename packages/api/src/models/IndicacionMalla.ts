import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { Coleccion } from './Coleccion.js';

/**
 * Una línea de las «Indicaciones — leer antes de evaluar» de la malla.
 *
 * Cuelga de una COLECCIÓN, es decir de una materia. Las reglas de evaluación no
 * son del sistema sino del curso: cuántas veces se puede evaluar cada
 * competencia, cuánto dura una entrevista, qué pasa si no llevas evidencia. Sin
 * la materia, todos los alumnos veían las trece de TC2005B, incluidos los que no
 * llevan esa materia.
 */
export class IndicacionMalla extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('IndicacionMalla', attributes);
  }

  getDescripcion(): string {
    return this.get('descripcion') ?? '';
  }
  setDescripcion(descripcion: string): void {
    this.set('descripcion', descripcion);
  }

  /** La materia a la que pertenece. Requiere `include('coleccion')` para leerla. */
  getColeccion(): Coleccion | undefined {
    return this.get('coleccion');
  }
  setColeccion(coleccion: Coleccion | null): void {
    if (coleccion) this.set('coleccion', coleccion);
    else this.unset('coleccion');
  }

  toSafeJSON(): Record<string, unknown> {
    const coleccion = this.getColeccion();
    const viva = coleccion && coleccion.get('exists') !== false ? coleccion : null;
    return {
      id: this.id,
      descripcion: this.getDescripcion(),
      coleccionId: viva?.id ?? null,
      // Requiere query.include('coleccion') para traer nombre y clave.
      coleccion: viva
        ? {
            id: viva.id,
            nombre: viva.get('nombre') ?? null,
            clave: viva.get('clave') ?? null,
            slug: viva.get('slug') ?? null,
          }
        : null,
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('IndicacionMalla', IndicacionMalla);
