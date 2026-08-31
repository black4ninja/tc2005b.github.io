import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { DinamicaScrum } from './DinamicaScrum.js';

/**
 * Una iteración dentro de una dinámica.
 *
 * El sprint existe porque sin él no hay burndown ni deuda técnica: los dos se
 * apoyan en que haya un ANTES y un DESPUÉS. Cerrar un sprint es lo que archiva
 * lo terminado, cuenta lo que quedó abierto y convierte eso en el bloqueo con el
 * que arranca el siguiente.
 *
 * El objetivo es del sprint y no del equipo: en la dinámica todos los equipos
 * trabajan bajo el mismo («Trabajar contra tiempo»). Cada equipo puede afinar el
 * suyo durante el planning, pero el de aquí es el que lo enmarca.
 */
export class SprintScrum extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('SprintScrum', attributes);
  }

  getDinamica(): DinamicaScrum | undefined {
    return this.get('dinamica');
  }
  setDinamica(dinamica: DinamicaScrum): void {
    this.set('dinamica', dinamica);
  }

  getDinamicaId(): string {
    return this.get('dinamica')?.id ?? '';
  }

  getNumero(): number {
    return this.get('numero') ?? 1;
  }
  setNumero(numero: number): void {
    this.set('numero', numero);
  }

  getObjetivo(): string {
    return this.get('objetivo') ?? '';
  }
  setObjetivo(objetivo: string): void {
    this.set('objetivo', objetivo);
  }

  getCerrado(): boolean {
    return this.get('cerrado') === true;
  }
  setCerrado(cerrado: boolean): void {
    this.set('cerrado', cerrado);
  }

  getCerradoEn(): Date | null {
    return (this.get('cerradoEn') as Date | undefined) ?? null;
  }
  setCerradoEn(fecha: Date | null): void {
    if (fecha) this.set('cerradoEn', fecha);
    else this.unset('cerradoEn');
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      numero: this.getNumero(),
      objetivo: this.getObjetivo(),
      cerrado: this.getCerrado(),
      cerradoEn: this.getCerradoEn()?.toISOString() ?? null,
    };
  }
}

Parse.Object.registerSubclass('SprintScrum', SprintScrum);
