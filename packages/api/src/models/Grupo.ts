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

  getCurso(): string {
    return this.get('curso') ?? '';
  }
  setCurso(curso: string): void {
    this.set('curso', curso);
  }

  getNombreCurso(): string {
    return this.get('nombreCurso') ?? '';
  }
  setNombreCurso(nombreCurso: string): void {
    this.set('nombreCurso', nombreCurso);
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

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.getName(),
      fechaInicio: this.getFechaInicio(),
      fechaFin: this.getFechaFin(),
      curso: this.getCurso(),
      nombreCurso: this.getNombreCurso(),
      salon: this.getSalon(),
      enlaces: this.getEnlaces(),
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('Grupo', Grupo);
