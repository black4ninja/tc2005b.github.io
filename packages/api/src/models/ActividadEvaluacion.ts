import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';

export class ActividadEvaluacion extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('ActividadEvaluacion', attributes);
  }

  getNombre(): string {
    return this.get('nombre') ?? '';
  }
  setNombre(nombre: string): void {
    this.set('nombre', nombre);
  }

  getTipo(): string {
    return this.get('tipo') ?? 'actividad';
  }
  setTipo(tipo: string): void {
    this.set('tipo', tipo);
  }

  getAprendizajePlaneado(): number {
    return this.get('aprendizajePlaneado') ?? 0;
  }
  setAprendizajePlaneado(aprendizajePlaneado: number): void {
    this.set('aprendizajePlaneado', aprendizajePlaneado);
  }

  getSemanaPlaneada(): number {
    return this.get('semanaPlaneada') ?? 0;
  }
  setSemanaPlaneada(semanaPlaneada: number): void {
    this.set('semanaPlaneada', semanaPlaneada);
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
      nombre: this.getNombre(),
      tipo: this.getTipo(),
      aprendizajePlaneado: this.getAprendizajePlaneado(),
      semanaPlaneada: this.getSemanaPlaneada(),
      orden: this.getOrden(),
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('ActividadEvaluacion', ActividadEvaluacion);
