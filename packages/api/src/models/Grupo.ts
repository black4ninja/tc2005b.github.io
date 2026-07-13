import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';

export class Grupo extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('Grupo', attributes);
  }

  getName(): string {
    return this.get('name') ?? '';
  }
  setName(name: string): void {
    this.set('name', name);
  }

  getFechaInicio(): Date | undefined {
    return this.get('fechaInicio');
  }
  setFechaInicio(date: Date): void {
    this.set('fechaInicio', date);
  }

  getFechaFin(): Date | undefined {
    return this.get('fechaFin');
  }
  setFechaFin(date: Date): void {
    this.set('fechaFin', date);
  }

  getSalon(): string {
    return this.get('salon') ?? '';
  }
  setSalon(salon: string): void {
    this.set('salon', salon);
  }

  getEnlaces(): Record<string, string> | undefined {
    return this.get('enlaces');
  }
  setEnlaces(enlaces: Record<string, string>): void {
    this.set('enlaces', enlaces);
  }

  /** Materia (asignatura) a la que pertenece el grupo. */
  getMateria(): Parse.Object | undefined {
    return this.get('materia');
  }
  setMateria(materia: Parse.Object): void {
    this.set('materia', materia);
  }


  /**
   * Colecciones del CMS "Contenidos" asignadas al grupo (array de pointers —
   * pointers, nunca strings). El acceso del alumno =
   * unión de las colecciones de sus grupos activos. La UI de asignación y la
   * migración llegan en la US-6; el visor (US-3) ya lee este campo.
   */
  getColecciones(): Parse.Object[] {
    return this.get('colecciones') ?? [];
  }
  setColecciones(colecciones: Parse.Object[]): void {
    this.set('colecciones', colecciones);
  }

  toSafeJSON(): Record<string, unknown> {
    const materia = this.getMateria();
    // Si la materia (incluida) fue soft-deleted, no la exponemos.
    const materiaActiva = materia && materia.get('exists') !== false ? materia : null;
    return {
      id: this.id,
      name: this.getName(),
      fechaInicio: this.getFechaInicio(),
      fechaFin: this.getFechaFin(),
      salon: this.getSalon(),
      enlaces: this.getEnlaces(),
      // Requiere query.include('materia') para traer nombre/slug; si no,
      // solo el id queda disponible.
      materia: materiaActiva
        ? { id: materiaActiva.id, nombre: materiaActiva.get('nombre') ?? null, slug: materiaActiva.get('slug') ?? null }
        : null,
      // Requiere query.include('colecciones'); las soft-deleted no se exponen.
      colecciones: this.getColecciones()
        .filter((c) => c && c.get('exists') !== false)
        .map((c) => ({
          id: c.id,
          nombre: c.get('nombre') ?? null,
          slug: c.get('slug') ?? null,
          clave: c.get('clave') ?? null,
        })),
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('Grupo', Grupo);
