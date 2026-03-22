import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import { Grupo } from './Grupo.js';
import { Equipo } from './Equipo.js';
import { AppUser } from './AppUser.js';
import { Competencia } from './Competencia.js';

export class Entrevista extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('Entrevista', attributes);
  }

  getGrupo(): Grupo | undefined {
    return this.get('grupo');
  }
  setGrupo(grupo: Grupo): void {
    this.set('grupo', grupo);
  }

  getGrupoId(): string {
    const g = this.get('grupo');
    return g?.id ?? '';
  }

  getEquipo(): Equipo | undefined {
    return this.get('equipo');
  }
  setEquipo(equipo: Equipo): void {
    this.set('equipo', equipo);
  }

  getProfesores(): AppUser[] {
    return this.get('profesores') ?? [];
  }
  setProfesores(profesores: AppUser[]): void {
    this.set('profesores', profesores);
  }

  getCompetencias(): Competencia[] {
    return this.get('competencias') ?? [];
  }
  setCompetencias(competencias: Competencia[]): void {
    this.set('competencias', competencias);
  }

  getFecha(): string {
    return this.get('fecha') ?? '';
  }
  setFecha(fecha: string): void {
    this.set('fecha', fecha);
  }

  getAsignacionProfesores(): Record<string, string> {
    return this.get('asignacionProfesores') ?? {};
  }
  setAsignacionProfesores(val: Record<string, string>): void {
    this.set('asignacionProfesores', val);
  }

  isLiberada(): boolean {
    return this.get('liberada') === true;
  }
  setLiberada(val: boolean): void {
    this.set('liberada', val);
  }

  toSafeJSON(): Record<string, unknown> {
    const equipo = this.getEquipo();
    const miembros = equipo ? (equipo.get('miembros') ?? []).map((m: AppUser) => ({
      id: m.id,
      name: m.get('name') ?? '',
      email: m.get('email') ?? '',
    })) : [];

    const profesores = this.getProfesores().map((p) => ({
      id: p.id,
      name: p.get('name') ?? '',
      email: p.get('email') ?? '',
    }));

    const competencias = this.getCompetencias().map((c) => ({
      id: c.id,
      competencia: c.get('competencia') ?? '',
      nivel: c.get('nivel') ?? '',
      descripcionNivel: c.get('descripcionNivel') ?? '',
      incipienteB: c.get('incipienteB') ?? '',
      incipienteA: c.get('incipienteA') ?? '',
      basico: c.get('basico') ?? '',
      solido: c.get('solido') ?? '',
      destacado: c.get('destacado') ?? '',
      orden: c.get('orden') ?? 0,
      fechaIdealEvaluacion: c.get('fechaIdealEvaluacion') ?? '',
    }));

    return {
      id: this.id,
      fecha: this.getFecha(),
      equipo: equipo ? {
        id: equipo.id,
        nombre: equipo.get('nombre') ?? '',
        miembros,
      } : null,
      profesores,
      competencias,
      asignacionProfesores: this.getAsignacionProfesores(),
      liberada: this.isLiberada(),
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('Entrevista', Entrevista);
