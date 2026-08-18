import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';

/**
 * Colección del CMS "Contenidos" — equivale a una instancia Docusaurus.
 * Contiene un árbol de Documento (páginas). Los grupos consumen colecciones
 * vía asignación (Grupo.colecciones, US-6). Diseño: design/cms-contenidos.html §1.
 */
export class Coleccion extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('Coleccion', attributes);
  }

  getNombre(): string {
    return this.get('nombre') ?? '';
  }
  setNombre(nombre: string): void {
    this.set('nombre', nombre);
  }

  /** Slug = segmento de ruta del visor (/contenidos/<slug>/...). */
  getSlug(): string {
    return this.get('slug') ?? '';
  }
  setSlug(slug: string): void {
    this.set('slug', slug);
  }

  /** Clave corta para la nomenclatura "CLAVE — Nombre" (p. ej. TC2005B). */
  getClave(): string | undefined {
    return this.get('clave');
  }
  setClave(clave: string): void {
    this.set('clave', clave);
  }

  getDescripcion(): string | undefined {
    return this.get('descripcion');
  }
  setDescripcion(descripcion: string): void {
    this.set('descripcion', descripcion);
  }

  getIcono(): string {
    return this.get('icono') ?? 'menu_book';
  }
  setIcono(icono: string): void {
    this.set('icono', icono);
  }

  /** Borrador (false) vs visible para alumnos con acceso (true). */
  getPublicada(): boolean {
    return this.get('publicada') === true;
  }
  setPublicada(publicada: boolean): void {
    this.set('publicada', publicada);
  }

  /**
   * ¿Esta materia usa el nivel «Incipiente B −30 pts»?
   *
   * Es una sanción por conducta que resta 30 puntos directos, y no existe en
   * todas las asignaturas: en TC2005B, TC2008B y TC3009C ni siquiera se ofrece.
   * Va en la MATERIA y no en el grupo porque las competencias ya están
   * organizadas así, y porque la misma asignatura debe calificar igual en todos
   * sus grupos.
   *
   * Nace apagado: sin el campo, nada cambia para nadie.
   */
  getPermitePenalizacion(): boolean {
    return this.get('permitePenalizacion') === true;
  }
  setPermitePenalizacion(v: boolean): void {
    this.set('permitePenalizacion', !!v);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      permitePenalizacion: this.getPermitePenalizacion(),
      nombre: this.getNombre(),
      slug: this.getSlug(),
      clave: this.getClave() ?? null,
      descripcion: this.getDescripcion() ?? null,
      icono: this.getIcono(),
      publicada: this.getPublicada(),
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('Coleccion', Coleccion);
