import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { Coleccion } from './Coleccion.js';
import type { BloqueEjercicios } from './BloqueEjercicios.js';

/**
 * Categoría de ejercicios dentro de una colección: agrupa los ejercicios por
 * tema (p. ej. "Sintaxis básica", "POO", "Principios SOLID") para ordenarlos y
 * presentarlos por secciones. Administrable desde Contenidos.
 *
 * Puede colgar de un `BloqueEjercicios` (nivel superior). El vínculo es
 * OPCIONAL: sin bloque la categoría sigue siendo válida y cae en el grupo
 * residual, que es lo que permite introducir bloques sin migrar nada.
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

  /**
   * Bloque al que pertenece, o undefined. `setBloque(null)` hace `unset`, igual
   * que `EjercicioProgramacion.setCategoria`: la ausencia es el estado por
   * defecto y no se guarda un null explícito.
   */
  getBloque(): BloqueEjercicios | undefined {
    return this.get('bloque');
  }
  setBloque(bloque: BloqueEjercicios | null): void {
    if (bloque) this.set('bloque', bloque);
    else this.unset('bloque');
  }

  /**
   * Posición entre las categorías. Ojo: el orden es global a la COLECCIÓN, no
   * relativo al bloque, así que dos categorías de bloques distintos pueden
   * compartir número. Quien ordene para mostrar debe hacerlo por
   * (orden del bloque, orden de la categoría) — si no, las categorías de un
   * bloque salen intercaladas entre las de otro.
   */
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
      bloqueId: this.getBloque()?.id ?? null,
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
