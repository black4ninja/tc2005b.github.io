import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { Documento } from './Documento.js';
import type { AppUser } from './AppUser.js';

/**
 * Versión inmutable de un Documento (historial del CMS "Contenidos").
 * Publicar crea una versión nueva; restaurar crea una versión nueva con el
 * cuerpo de la vieja — el pasado nunca se muta. El borrador en curso también
 * es una DocumentoVersion (apuntada por Documento.borrador) que se
 * sobreescribe con cada autosave hasta publicarse.
 * Diseño: design/cms-contenidos.html §1.
 */
export class DocumentoVersion extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('DocumentoVersion', attributes);
  }

  getDocumento(): Documento | undefined {
    return this.get('documento');
  }
  setDocumento(documento: Documento): void {
    this.set('documento', documento);
  }

  /** Número incremental por documento; 0 mientras es borrador sin publicar. */
  getNumero(): number {
    return this.get('numero') ?? 0;
  }
  setNumero(numero: number): void {
    this.set('numero', numero);
  }

  /** Fuente: Markdown o HTML crudo según Documento.tipo. */
  getCuerpo(): string {
    return this.get('cuerpo') ?? '';
  }
  setCuerpo(cuerpo: string): void {
    this.set('cuerpo', cuerpo);
  }

  /** Render cacheado (pipeline unified) — se llena al publicar (US-2). */
  getCuerpoHtml(): string | undefined {
    return this.get('cuerpoHtml');
  }
  setCuerpoHtml(cuerpoHtml: string): void {
    this.set('cuerpoHtml', cuerpoHtml);
  }

  getAutor(): AppUser | undefined {
    return this.get('autor');
  }
  setAutor(autor: AppUser): void {
    this.set('autor', autor);
  }

  /** Nota opcional de "qué cambió" al publicar. */
  getMensaje(): string | undefined {
    return this.get('mensaje');
  }
  setMensaje(mensaje: string): void {
    this.set('mensaje', mensaje);
  }

  toSafeJSON(): Record<string, unknown> {
    const autor = this.getAutor();
    return {
      id: this.id,
      documentoId: this.getDocumento()?.id ?? null,
      numero: this.getNumero(),
      cuerpo: this.getCuerpo(),
      mensaje: this.getMensaje() ?? null,
      // Requiere include('autor') para traer el nombre; si no, solo id.
      autor: autor ? { id: autor.id, name: autor.get('name') ?? null } : null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('DocumentoVersion', DocumentoVersion);
