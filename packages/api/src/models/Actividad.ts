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
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('Actividad', Actividad);
