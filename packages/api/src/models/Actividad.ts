import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';

export class Actividad extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('Actividad', attributes);
  }

  getSemana(): Parse.Object | undefined {
    return this.get('semana');
  }
  setSemana(semana: Parse.Object): void {
    this.set('semana', semana);
  }

  getDia(): string {
    return this.get('dia') ?? '';
  }
  setDia(dia: string): void {
    this.set('dia', dia);
  }

  getIsPrevio(): boolean {
    return this.get('isPrevio') === true;
  }
  setIsPrevio(isPrevio: boolean): void {
    this.set('isPrevio', isPrevio);
  }

  getOrden(): number {
    return this.get('orden') ?? 0;
  }
  setOrden(orden: number): void {
    this.set('orden', orden);
  }

  getTipo(): string {
    return this.get('tipo') ?? '';
  }
  setTipo(tipo: string): void {
    this.set('tipo', tipo);
  }

  getTitulo(): string | undefined {
    return this.get('titulo');
  }
  setTitulo(titulo: string): void {
    this.set('titulo', titulo);
  }

  getDescripcion(): string | undefined {
    return this.get('descripcion');
  }
  setDescripcion(descripcion: string): void {
    this.set('descripcion', descripcion);
  }

  getEnlace(): string | undefined {
    return this.get('enlace');
  }
  setEnlace(enlace: string): void {
    this.set('enlace', enlace);
  }

  getExterno(): boolean {
    return this.get('externo') === true;
  }
  setExterno(externo: boolean): void {
    this.set('externo', externo);
  }

  getDuracion(): string | undefined {
    return this.get('duracion');
  }
  setDuracion(duracion: string): void {
    this.set('duracion', duracion);
  }

  getFechaEntrega(): string | undefined {
    return this.get('fechaEntrega');
  }
  setFechaEntrega(fechaEntrega: string): void {
    this.set('fechaEntrega', fechaEntrega);
  }

  /**
   * Archivo de una actividad «presentación». El binario vive en el adapter de
   * Parse; nunca se expone su URL directa (files-gate la bloquea): se sirve por
   * el endpoint propio, que comprueba pertenencia al grupo.
   */
  getArchivo(): Parse.File | undefined {
    return this.get('archivo');
  }
  setArchivo(archivo: Parse.File): void {
    this.set('archivo', archivo);
  }

  getArchivoNombre(): string | undefined {
    return this.get('archivoNombre');
  }
  setArchivoNombre(nombre: string): void {
    this.set('archivoNombre', nombre);
  }

  getArchivoMime(): string | undefined {
    return this.get('archivoMime');
  }
  setArchivoMime(mime: string): void {
    this.set('archivoMime', mime);
  }

  getArchivoBytes(): number {
    return this.get('archivoBytes') ?? 0;
  }
  setArchivoBytes(bytes: number): void {
    this.set('archivoBytes', bytes);
  }

  /** Borra el adjunto y sus metadatos (el binario queda en el adapter). */
  quitarArchivo(): void {
    this.unset('archivo');
    this.unset('archivoNombre');
    this.unset('archivoMime');
    this.unset('archivoBytes');
  }

  getEnlacesExtra(): Array<{ texto: string; url: string }> | undefined {
    return this.get('enlacesExtra');
  }
  setEnlacesExtra(enlacesExtra: Array<{ texto: string; url: string }>): void {
    this.set('enlacesExtra', enlacesExtra);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      semana: this.getSemana()?.id,
      dia: this.getDia(),
      isPrevio: this.getIsPrevio(),
      orden: this.getOrden(),
      tipo: this.getTipo(),
      titulo: this.getTitulo(),
      descripcion: this.getDescripcion(),
      enlace: this.getEnlace(),
      externo: this.getExterno(),
      duracion: this.getDuracion(),
      fechaEntrega: this.getFechaEntrega(),
      enlacesExtra: this.getEnlacesExtra(),
      // Metadatos del adjunto, nunca la URL del binario.
      archivoNombre: this.getArchivoNombre(),
      archivoMime: this.getArchivoMime(),
      archivoBytes: this.getArchivoBytes() || undefined,
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('Actividad', Actividad);
