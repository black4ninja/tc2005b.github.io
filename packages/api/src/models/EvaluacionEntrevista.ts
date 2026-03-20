import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import { Entrevista } from './Entrevista.js';
import { AppUser } from './AppUser.js';
import { Competencia } from './Competencia.js';

export class EvaluacionEntrevista extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('EvaluacionEntrevista', attributes);
  }

  getEntrevista(): Entrevista | undefined {
    return this.get('entrevista');
  }
  setEntrevista(entrevista: Entrevista): void {
    this.set('entrevista', entrevista);
  }

  getAlumno(): AppUser | undefined {
    return this.get('alumno');
  }
  setAlumno(alumno: AppUser): void {
    this.set('alumno', alumno);
  }

  getCompetencia(): Competencia | undefined {
    return this.get('competencia');
  }
  setCompetencia(competencia: Competencia): void {
    this.set('competencia', competencia);
  }

  getProfesor(): AppUser | undefined {
    return this.get('profesor');
  }
  setProfesor(profesor: AppUser | null): void {
    if (profesor) {
      this.set('profesor', profesor);
    } else {
      this.unset('profesor');
    }
  }

  getComentario(): string {
    return this.get('comentario') ?? '';
  }
  setComentario(comentario: string): void {
    this.set('comentario', comentario);
  }

  getValorAsignado(): string {
    return this.get('valorAsignado') ?? '';
  }
  setValorAsignado(val: string): void {
    this.set('valorAsignado', val);
  }

  getPeriodo(): string {
    return this.get('periodo') ?? '';
  }
  setPeriodo(val: string): void {
    this.set('periodo', val);
  }

  toSafeJSON(): Record<string, unknown> {
    const alumno = this.getAlumno();
    const competencia = this.getCompetencia();
    const profesor = this.getProfesor();

    return {
      id: this.id,
      alumno: alumno ? {
        id: alumno.id,
        name: alumno.get('name') ?? '',
        email: alumno.get('email') ?? '',
      } : null,
      competencia: competencia ? {
        id: competencia.id,
        competencia: competencia.get('competencia') ?? '',
        nivel: competencia.get('nivel') ?? '',
        descripcionNivel: competencia.get('descripcionNivel') ?? '',
        incipienteB: competencia.get('incipienteB') ?? '',
        incipienteA: competencia.get('incipienteA') ?? '',
        basico: competencia.get('basico') ?? '',
        solido: competencia.get('solido') ?? '',
        destacado: competencia.get('destacado') ?? '',
        orden: competencia.get('orden') ?? 0,
        fechaIdealEvaluacion: competencia.get('fechaIdealEvaluacion') ?? '',
      } : null,
      profesor: profesor ? {
        id: profesor.id,
        name: profesor.get('name') ?? '',
        email: profesor.get('email') ?? '',
      } : null,
      comentario: this.getComentario(),
      valorAsignado: this.getValorAsignado(),
      periodo: this.getPeriodo(),
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('EvaluacionEntrevista', EvaluacionEntrevista);
