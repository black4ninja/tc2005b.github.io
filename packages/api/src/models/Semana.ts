import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';

export class Semana extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('Semana', attributes);
  }

  getGrupo(): Parse.Object | undefined {
    return this.get('grupo');
  }
  setGrupo(grupo: Parse.Object): void {
    this.set('grupo', grupo);
  }

  getNumero(): string {
    return this.get('numero') ?? '';
  }
  setNumero(numero: number | string): void {
    this.set('numero', String(numero));
  }

  getFechaInicio(): string {
    return this.get('fechaInicio') ?? '';
  }
  setFechaInicio(fechaInicio: string): void {
    this.set('fechaInicio', fechaInicio);
  }

  getFechaFin(): string {
    return this.get('fechaFin') ?? '';
  }
  setFechaFin(fechaFin: string): void {
    this.set('fechaFin', fechaFin);
  }

  getTipo(): string {
    return this.get('tipo') ?? 'normal';
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

  getMensaje(): string | undefined {
    return this.get('mensaje');
  }
  setMensaje(mensaje: string): void {
    this.set('mensaje', mensaje);
  }

  getMensajeImportante(): string | undefined {
    return this.get('mensajeImportante');
  }
  setMensajeImportante(mensajeImportante: string): void {
    this.set('mensajeImportante', mensajeImportante);
  }

  getNotas(): Record<string, string> | undefined {
    return this.get('notas');
  }
  setNotas(notas: Record<string, string>): void {
    this.set('notas', notas);
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
      grupo: this.getGrupo()?.id,
      numero: this.getNumero(),
      fechaInicio: this.getFechaInicio(),
      fechaFin: this.getFechaFin(),
      tipo: this.getTipo(),
      titulo: this.getTitulo(),
      mensaje: this.getMensaje(),
      mensajeImportante: this.getMensajeImportante(),
      notas: this.getNotas(),
      orden: this.getOrden(),
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('Semana', Semana);
