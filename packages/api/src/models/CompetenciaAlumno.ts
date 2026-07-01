import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';

export class CompetenciaAlumno extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('CompetenciaAlumno', attributes);
  }

  // Pointers
  getCompetencia(): Parse.Object | undefined {
    return this.get('competencia');
  }
  setCompetencia(competencia: Parse.Object): void {
    this.set('competencia', competencia);
  }

  getGrupo(): Parse.Object | undefined {
    return this.get('grupo');
  }
  setGrupo(grupo: Parse.Object): void {
    this.set('grupo', grupo);
  }

  getAlumno(): Parse.Object | undefined {
    return this.get('alumno');
  }
  setAlumno(alumno: Parse.Object): void {
    this.set('alumno', alumno);
  }

  // Campos propios
  getValorPeriodo1(): string {
    return this.get('valorPeriodo1') ?? '';
  }
  setValorPeriodo1(val: string): void {
    this.set('valorPeriodo1', val);
  }

  getValorPeriodo2(): string {
    return this.get('valorPeriodo2') ?? '';
  }
  setValorPeriodo2(val: string): void {
    this.set('valorPeriodo2', val);
  }

  getRetroPeriodo1(): string {
    return this.get('retroPeriodo1') ?? '';
  }
  setRetroPeriodo1(val: string): void {
    this.set('retroPeriodo1', val);
  }

  getRetroPeriodo2(): string {
    return this.get('retroPeriodo2') ?? '';
  }
  setRetroPeriodo2(val: string): void {
    this.set('retroPeriodo2', val);
  }

  getEvidencias(): string[] {
    return this.get('evidencias') ?? [];
  }
  setEvidencias(evidencias: string[]): void {
    this.set('evidencias', evidencias);
  }

  toSafeJSON(): Record<string, unknown> {
    const comp = this.getCompetencia();
    return {
      id: this.id,
      competencia: comp?.get('competencia') ?? '',
      nivel: comp?.get('nivel') ?? '',
      descripcionNivel: comp?.get('descripcionNivel') ?? '',
      orden: comp?.get('orden') ?? 0,
      // Campos descriptivos de niveles desde el pointer
      guiaEvidencias: comp?.get('guiaEvidencias') ?? '',
      incipienteB: comp?.get('incipienteB') ?? '',
      incipienteA: comp?.get('incipienteA') ?? '',
      basico: comp?.get('basico') ?? '',
      solido: comp?.get('solido') ?? '',
      destacado: comp?.get('destacado') ?? '',
      fechaIdealEvaluacion: comp?.get('fechaIdealEvaluacion') ?? '',
      esCalculada: comp?.get('esCalculada') ?? false,
      dependencias: (comp?.get('dependencias') ?? []).map((d: Parse.Object) => ({
        id: d.id,
        competencia: d.get('competencia') ?? '',
      })),
      // Campos del alumno
      valorPeriodo1: this.getValorPeriodo1(),
      valorPeriodo2: this.getValorPeriodo2(),
      retroPeriodo1: this.getRetroPeriodo1(),
      retroPeriodo2: this.getRetroPeriodo2(),
      evidencias: this.getEvidencias(),
      grupoId: this.getGrupo()?.id,
      alumnoId: this.getAlumno()?.id,
      competenciaId: comp?.id,
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('CompetenciaAlumno', CompetenciaAlumno);
