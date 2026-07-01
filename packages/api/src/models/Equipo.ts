import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import { Grupo } from './Grupo.js';
import { AppUser } from './AppUser.js';

export class Equipo extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('Equipo', attributes);
  }

  getNombre(): string {
    return this.get('nombre') ?? '';
  }
  setNombre(nombre: string): void {
    this.set('nombre', nombre);
  }

  getRepositorio(): string {
    return this.get('repositorio') ?? '';
  }
  setRepositorio(repositorio: string): void {
    this.set('repositorio', repositorio);
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

  getMiembros(): AppUser[] {
    return this.get('miembros') ?? [];
  }
  setMiembros(miembros: AppUser[]): void {
    this.set('miembros', miembros);
  }

  toSafeJSON(): Record<string, unknown> {
    const miembros = this.getMiembros().map((m) => ({
      id: m.id,
      name: m.get('name') ?? '',
      email: m.get('email') ?? '',
    }));

    return {
      id: this.id,
      nombre: this.getNombre(),
      repositorio: this.getRepositorio(),
      grupo: this.getGrupoId(),
      miembros,
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('Equipo', Equipo);
