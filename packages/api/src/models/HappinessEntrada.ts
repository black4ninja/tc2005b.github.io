import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { EstadoHappiness } from '../services/happiness-door.js';

/**
 * Una entrada del Happiness Door (Management 3.0): cómo le fue a alguien del
 * grupo ese día —positivo, neutral o negativo— y por qué, en texto libre.
 *
 * La escribe cualquier miembro: alumno, profesor o admin. Puede haber varias por
 * persona y día, y su autor las edita o las borra cuando quiera. El `dia` se
 * fija al crearla y no se mueve al editarla: la entrada habla de ESE día.
 */
export class HappinessEntrada extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('HappinessEntrada', attributes);
  }

  getGrupo(): Parse.Object | undefined {
    return this.get('grupo');
  }
  setGrupo(grupo: Parse.Object): void {
    this.set('grupo', grupo);
  }

  getAutor(): Parse.Object | undefined {
    return this.get('autor');
  }
  setAutor(autor: Parse.Object): void {
    this.set('autor', autor);
  }

  /**
   * Rol del autor AL ESCRIBIRLA. Se guarda en la entrada porque el tablero lo
   * enseña junto al nombre, y así no depende de que el usuario siga existiendo
   * ni de que cambie de rol después.
   */
  getRolAutor(): string {
    return this.get('rolAutor') ?? '';
  }
  setRolAutor(rol: string): void {
    this.set('rolAutor', rol);
  }

  /** `AAAA-MM-DD`, en la zona del curso. */
  getDia(): string {
    return this.get('dia') ?? '';
  }
  setDia(dia: string): void {
    this.set('dia', dia);
  }

  getEstado(): EstadoHappiness {
    return this.get('estado');
  }
  setEstado(estado: EstadoHappiness): void {
    this.set('estado', estado);
  }

  getTexto(): string {
    return this.get('texto') ?? '';
  }
  setTexto(texto: string): void {
    this.set('texto', texto);
  }

  /** Requiere `include('autor')` para traer el nombre. */
  toSafeJSON(): Record<string, unknown> {
    const autor = this.getAutor();
    return {
      id: this.id,
      dia: this.getDia(),
      estado: this.getEstado(),
      texto: this.getTexto(),
      autor: autor ? { id: autor.id, name: autor.get('name') ?? null, rol: this.getRolAutor() } : null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('HappinessEntrada', HappinessEntrada);
