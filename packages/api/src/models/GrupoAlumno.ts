import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';

export class GrupoAlumno extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('GrupoAlumno', attributes);
  }

  // Pointers
  getAlumno(): Parse.Object | undefined {
    return this.get('alumno');
  }
  setAlumno(alumno: Parse.Object): void {
    this.set('alumno', alumno);
  }

  getGrupo(): Parse.Object | undefined {
    return this.get('grupo');
  }
  setGrupo(grupo: Parse.Object): void {
    this.set('grupo', grupo);
  }

  // Profile fields
  getExperiencia(): string {
    return this.get('experiencia') ?? '';
  }
  setExperiencia(v: string): void {
    this.set('experiencia', v);
  }

  getExpectativas(): string {
    return this.get('expectativas') ?? '';
  }
  setExpectativas(v: string): void {
    this.set('expectativas', v);
  }

  getCompromiso(): string {
    return this.get('compromiso') ?? '';
  }
  setCompromiso(v: string): void {
    this.set('compromiso', v);
  }

  getRepositorioIndividual(): string {
    return this.get('repositorioIndividual') ?? '';
  }
  setRepositorioIndividual(v: string): void {
    this.set('repositorioIndividual', v);
  }

  getSituacionesEspeciales(): string {
    return this.get('situacionesEspeciales') ?? '';
  }
  setSituacionesEspeciales(v: string): void {
    this.set('situacionesEspeciales', v);
  }

  getPerfilCompleto(): boolean {
    return this.get('perfilCompleto') ?? false;
  }
  setPerfilCompleto(v: boolean): void {
    this.set('perfilCompleto', v);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      alumnoId: this.getAlumno()?.id,
      grupoId: this.getGrupo()?.id,
      active: this.get('active'),
      experiencia: this.getExperiencia(),
      expectativas: this.getExpectativas(),
      compromiso: this.getCompromiso(),
      repositorioIndividual: this.getRepositorioIndividual(),
      situacionesEspeciales: this.getSituacionesEspeciales(),
      perfilCompleto: this.getPerfilCompleto(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('GrupoAlumno', GrupoAlumno);
