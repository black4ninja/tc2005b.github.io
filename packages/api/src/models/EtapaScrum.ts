import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { Grupo } from './Grupo.js';

/**
 * Una etapa del ciclo de Scrum ("Planning", "Daily", "Retrospectiva") con el
 * color con el que se pinta.
 *
 * Es un catálogo POR GRUPO y no global, al revés que las categorías de grupo.
 * Dos razones: cada materia corre su propia versión del ciclo —unos hacen
 * grooming y otros no—, y así el profesor puede mantener el suyo sin permiso de
 * administrador ni riesgo de repintarle las etapas a otro curso.
 *
 * El color es el dato importante: es el fondo de la banda que el alumno ve sobre
 * su tablero, y de lejos se reconoce antes el color que el nombre.
 */
export class EtapaScrum extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('EtapaScrum', attributes);
  }

  getGrupo(): Grupo | undefined {
    return this.get('grupo');
  }
  setGrupo(grupo: Grupo): void {
    this.set('grupo', grupo);
  }

  getGrupoId(): string {
    return this.get('grupo')?.id ?? '';
  }

  getNombre(): string {
    return this.get('nombre') ?? '';
  }
  setNombre(nombre: string): void {
    this.set('nombre', nombre);
  }

  /** Hexadecimal normalizado (`#rrggbb`), como en `CategoriaGrupo`. */
  getColor(): string {
    return this.get('color') ?? '#64748b';
  }
  setColor(color: string): void {
    this.set('color', color);
  }

  /** Una línea de qué se hace en esta etapa. Se enseña bajo el nombre. */
  getPista(): string {
    return this.get('pista') ?? '';
  }
  setPista(pista: string): void {
    this.set('pista', pista);
  }

  getOrden(): number {
    return this.get('orden') ?? 0;
  }
  setOrden(orden: number): void {
    this.set('orden', orden);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      nombre: this.getNombre(),
      color: this.getColor(),
      pista: this.getPista(),
      orden: this.getOrden(),
    };
  }
}

Parse.Object.registerSubclass('EtapaScrum', EtapaScrum);
