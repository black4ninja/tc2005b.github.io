import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';

export class IndicacionMalla extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('IndicacionMalla', attributes);
  }

  getDescripcion(): string {
    return this.get('descripcion') ?? '';
  }
  setDescripcion(descripcion: string): void {
    this.set('descripcion', descripcion);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      descripcion: this.getDescripcion(),
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('IndicacionMalla', IndicacionMalla);
