import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';

/**
 * Materia (asignatura). Cada materia mapea a una instancia del Docusaurus
 * mediante `slug` (= routeBasePath de esa instancia, p. ej. 'tc2005b' →
 * /docs/tc2005b/...). Los grupos apuntan a una Materia (Grupo.materia).
 */
export class Materia extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('Materia', attributes);
  }

  getNombre(): string {
    return this.get('nombre') ?? '';
  }
  setNombre(nombre: string): void {
    this.set('nombre', nombre);
  }

  /** Slug = routeBasePath de la instancia Docusaurus de esta materia. */
  getSlug(): string {
    return this.get('slug') ?? '';
  }
  setSlug(slug: string): void {
    this.set('slug', slug);
  }

  getCodigo(): string | undefined {
    return this.get('codigo');
  }
  setCodigo(codigo: string): void {
    this.set('codigo', codigo);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      nombre: this.getNombre(),
      slug: this.getSlug(),
      codigo: this.getCodigo() ?? null,
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('Materia', Materia);
