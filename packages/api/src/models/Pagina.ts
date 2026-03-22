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

  getGrupo(): Parse.Object | undefined {
    return this.get('grupo');
  }
  setGrupo(grupo: Parse.Object): void {
    this.set('grupo', grupo);
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

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      titulo: this.getTitulo(),
      slug: this.getSlug(),
      descripcion: this.getDescripcion(),
      icono: this.getIcono(),
      grupoId: this.getGrupo()?.id ?? null,
      bloques: this.getBloques(),
      publicado: this.getPublicado(),
      orden: this.getOrden(),
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('Pagina', Pagina);
