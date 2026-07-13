import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';

export interface ContentBlock {
  id: string;
  tipo: 'encabezado' | 'objetivos' | 'instrucciones' | 'preguntas' | 'recursos' | 'entrega' | 'practica' | 'texto';
  datos: Record<string, unknown>;
}

export class Pagina extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('Pagina', attributes);
  }

  getTitulo(): string {
    return this.get('titulo') ?? '';
  }
  setTitulo(titulo: string): void {
    this.set('titulo', titulo);
  }

  getSlug(): string {
    return this.get('slug') ?? '';
  }
  setSlug(slug: string): void {
    this.set('slug', slug);
  }

  getDescripcion(): string | undefined {
    return this.get('descripcion');
  }
  setDescripcion(descripcion: string): void {
    this.set('descripcion', descripcion);
  }

  getIcono(): string {
    return this.get('icono') ?? 'article';
  }
  setIcono(icono: string): void {
    this.set('icono', icono);
  }

  /**
   * Colección del CMS "Contenidos" a la que pertenece la página (pointer, nunca
   * string). Determina de qué materia es la página: el picker del calendario
   * solo ofrece las páginas de las colecciones asignadas al grupo
   * (`Grupo.colecciones`). No restringe el acceso — `/paginas/:slug` sigue
   * siendo público.
   */
  getColeccion(): Parse.Object | undefined {
    return this.get('coleccion');
  }
  setColeccion(coleccion: Parse.Object): void {
    this.set('coleccion', coleccion);
  }

  getBloques(): ContentBlock[] {
    return this.get('bloques') ?? [];
  }
  setBloques(bloques: ContentBlock[]): void {
    this.set('bloques', bloques);
  }

  getPublicado(): boolean {
    return this.get('publicado') === true;
  }
  setPublicado(publicado: boolean): void {
    this.set('publicado', publicado);
  }

  getOrden(): number {
    return this.get('orden') ?? 0;
  }
  setOrden(orden: number): void {
    this.set('orden', orden);
  }

  getEtiquetas(): string[] {
    return this.get('etiquetas') ?? [];
  }
  setEtiquetas(etiquetas: string[]): void {
    this.set('etiquetas', etiquetas);
  }

  toSafeJSON(): Record<string, unknown> {
    const coleccion = this.getColeccion();
    // Si la colección (incluida) fue soft-deleted, no la exponemos.
    const coleccionActiva = coleccion && coleccion.get('exists') !== false ? coleccion : null;
    return {
      id: this.id,
      titulo: this.getTitulo(),
      slug: this.getSlug(),
      descripcion: this.getDescripcion(),
      icono: this.getIcono(),
      coleccionId: coleccionActiva?.id ?? null,
      // Requiere query.include('coleccion') para traer nombre/slug/clave.
      coleccion: coleccionActiva
        ? {
            id: coleccionActiva.id,
            nombre: coleccionActiva.get('nombre') ?? null,
            slug: coleccionActiva.get('slug') ?? null,
            clave: coleccionActiva.get('clave') ?? null,
          }
        : null,
      bloques: this.getBloques(),
      publicado: this.getPublicado(),
      orden: this.getOrden(),
      etiquetas: this.getEtiquetas(),
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('Pagina', Pagina);
