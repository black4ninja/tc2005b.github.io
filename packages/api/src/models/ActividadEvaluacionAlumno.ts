import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { Grupo } from './Grupo.js';
import type { AppUser } from './AppUser.js';
import type { ActividadEvaluacionGrupo } from './ActividadEvaluacionGrupo.js';

export class ActividadEvaluacionAlumno extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('ActividadEvaluacionAlumno', attributes);
  }

  getGrupo(): Grupo | undefined {
    return this.get('grupo');
  }
  setGrupo(grupo: Grupo): void {
    this.set('grupo', grupo);
  }

  getAlumno(): AppUser | undefined {
    return this.get('alumno');
  }
  setAlumno(alumno: AppUser): void {
    this.set('alumno', alumno);
  }

  getActividadGrupo(): ActividadEvaluacionGrupo | undefined {
    return this.get('actividadGrupo');
  }
  setActividadGrupo(actividadGrupo: ActividadEvaluacionGrupo): void {
    this.set('actividadGrupo', actividadGrupo);
  }

  getAprendizajePlaneado(): number {
    return this.get('aprendizajePlaneado') ?? 0;
  }
  setAprendizajePlaneado(aprendizajePlaneado: number): void {
    this.set('aprendizajePlaneado', aprendizajePlaneado);
  }

  getAprendizajeGanado(): number {
    return this.get('aprendizajeGanado') ?? 0;
  }
  setAprendizajeGanado(aprendizajeGanado: number): void {
    this.set('aprendizajeGanado', aprendizajeGanado);
  }

  getSemanaCompletada(): number {
    return this.get('semanaCompletada') ?? 0;
  }
  setSemanaCompletada(semanaCompletada: number): void {
    this.set('semanaCompletada', semanaCompletada);
  }

  getObservaciones(): string {
    return this.get('observaciones') ?? '';
  }
  setObservaciones(observaciones: string): void {
    this.set('observaciones', observaciones);
  }

  toSafeJSON(): Record<string, unknown> {
    const actGrupo = this.getActividadGrupo();
    return {
      id: this.id,
      nombre: actGrupo?.get('nombre') ?? '',
      tipo: actGrupo?.get('tipo') ?? 'actividad',
      aprendizajePlaneado: this.getAprendizajePlaneado(),
      semanaPlaneada: actGrupo?.get('semanaPlaneada') ?? 0,
      orden: actGrupo?.get('orden') ?? 0,
      aprendizajeGanado: this.getAprendizajeGanado(),
      semanaCompletada: this.getSemanaCompletada(),
      observaciones: this.getObservaciones(),
      grupoId: this.getGrupo()?.id,
      alumnoId: this.getAlumno()?.id,
      actividadGrupoId: actGrupo?.id,
      congelada: actGrupo?.get('congelada') ?? false,
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('ActividadEvaluacionAlumno', ActividadEvaluacionAlumno);
