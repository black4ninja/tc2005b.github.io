import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';

export class Etiqueta extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('Etiqueta', attributes);
  }

  getNombre(): string {
    return this.get('nombre') ?? '';
  }
  setNombre(nombre: string): void {
    this.set('nombre', nombre);
  }

  getColor(): string {
    return this.get('color') ?? '#dbeafe';
  }
  setColor(color: string): void {
    this.set('color', color);
  }

  getTextColor(): string {
    return this.get('textColor') ?? '#1e40af';
  }
  setTextColor(textColor: string): void {
    this.set('textColor', textColor);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      nombre: this.getNombre(),
      color: this.getColor(),
      textColor: this.getTextColor(),
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('Etiqueta', Etiqueta);
