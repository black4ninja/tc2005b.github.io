import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { Grupo } from './Grupo.js';

export interface PeriodoConfig {
  nombre: string;
  pesoFinal: number;
  pesoCompetencias: number;
  pesoActividades: number;
  competencias: string[];
  actividades: string[];
  acumulativo: boolean;
}

export class PlanEvaluacion extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('PlanEvaluacion', attributes);
  }

  getGrupo(): Grupo | undefined {
    return this.get('grupo');
  }
  setGrupo(grupo: Grupo): void {
    this.set('grupo', grupo);
  }

  getPeriodos(): PeriodoConfig[] {
    return this.get('periodos') ?? [];
  }
  setPeriodos(periodos: PeriodoConfig[]): void {
    this.set('periodos', periodos);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      grupoId: this.getGrupo()?.id,
      periodos: this.getPeriodos(),
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('PlanEvaluacion', PlanEvaluacion);
