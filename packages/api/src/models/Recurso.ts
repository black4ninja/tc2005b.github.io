import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { Coleccion } from './Coleccion.js';
import type { Documento } from './Documento.js';
import type { AppUser } from './AppUser.js';

/**
 * Recurso del CMS "Contenidos" — asset adjunto (imagen/PDF/ZIP) de una
 * colección o de un documento concreto. El archivo vive en el files adapter
 * de Parse (GridFS hoy; S3 en la US-8) y SOLO se sirve vía el endpoint gated
 * del API (US-4) — nunca por URL pública. Diseño: design/cms-contenidos.html §1.
 */
export class Recurso extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('Recurso', attributes);
  }

  getColeccion(): Coleccion | undefined {
    return this.get('coleccion');
  }
  setColeccion(coleccion: Coleccion): void {
    this.set('coleccion', coleccion);
  }

  /** Documento dueño; undefined = recurso global de la colección. */
  getDocumento(): Documento | undefined {
    return this.get('documento');
  }
  setDocumento(documento: Documento | null): void {
    if (documento) this.set('documento', documento);
    else this.unset('documento');
  }

  /** Nombre de archivo visible (el de Parse.File lleva prefijo aleatorio). */
  getNombre(): string {
    return this.get('nombre') ?? '';
  }
  setNombre(nombre: string): void {
    this.set('nombre', nombre);
  }

  getArchivo(): Parse.File | undefined {
    return this.get('archivo');
  }
  setArchivo(archivo: Parse.File): void {
    this.set('archivo', archivo);
  }

  getMime(): string {
    return this.get('mime') ?? 'application/octet-stream';
  }
  setMime(mime: string): void {
    this.set('mime', mime);
  }

  getBytes(): number {
    return this.get('bytes') ?? 0;
  }
  setBytes(bytes: number): void {
    this.set('bytes', bytes);
  }

  getSubidoPor(): AppUser | undefined {
    return this.get('subidoPor');
  }
  setSubidoPor(usuario: AppUser): void {
    this.set('subidoPor', usuario);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      coleccionId: this.getColeccion()?.id ?? null,
      documentoId: this.getDocumento()?.id ?? null,
      nombre: this.getNombre(),
      mime: this.getMime(),
      bytes: this.getBytes(),
      // Sin URL del archivo: el acceso es solo vía el endpoint gated.
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('Recurso', Recurso);
