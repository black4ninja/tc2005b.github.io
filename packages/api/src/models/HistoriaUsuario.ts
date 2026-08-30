import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { AppUser } from './AppUser.js';
import type { EquipoScrum } from './EquipoScrum.js';
import {
  PRIORIDAD_POR_DEFECTO, type Columna, type Prioridad,
} from '../constants/scrum.js';

/**
 * Una historia de usuario: el post-it del tablero.
 *
 * Se guarda en tres campos —por qué, qué y cómo— en vez de en una frase con la
 * plantilla "Como… quiero… para…". Es una decisión pedagógica: separados, el
 * alumno no puede saltarse el "por qué", que es justo la parte que se omite
 * cuando el formato es texto libre.
 *
 * `responsable` es UNO o NINGUNO, nunca una lista. En Scrum una historia la
 * lleva una persona; permitir varias es la manera silenciosa de que al final no
 * la lleve nadie. Vacío es un estado legítimo y frecuente: en el product backlog
 * las historias todavía no tienen dueño.
 */
export class HistoriaUsuario extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('HistoriaUsuario', attributes);
  }

  getEquipo(): EquipoScrum | undefined {
    return this.get('equipo');
  }
  setEquipo(equipo: EquipoScrum): void {
    this.set('equipo', equipo);
  }

  getEquipoId(): string {
    return this.get('equipo')?.id ?? '';
  }

  getPorQue(): string {
    return this.get('porQue') ?? '';
  }
  setPorQue(texto: string): void {
    this.set('porQue', texto);
  }

  getQue(): string {
    return this.get('que') ?? '';
  }
  setQue(texto: string): void {
    this.set('que', texto);
  }

  getComo(): string {
    return this.get('como') ?? '';
  }
  setComo(texto: string): void {
    this.set('como', texto);
  }

  /** Puntos de historia. 0 = sin estimar todavía. */
  getPuntos(): number {
    return this.get('puntos') ?? 0;
  }
  setPuntos(puntos: number): void {
    this.set('puntos', puntos);
  }

  getPrioridad(): Prioridad {
    return this.get('prioridad') ?? PRIORIDAD_POR_DEFECTO;
  }
  setPrioridad(prioridad: Prioridad): void {
    this.set('prioridad', prioridad);
  }

  /** El único responsable, o nada. Ver la nota de la clase. */
  getResponsable(): AppUser | undefined {
    return this.get('responsable');
  }
  setResponsable(alumno: AppUser | null): void {
    if (alumno) this.set('responsable', alumno);
    else this.unset('responsable');
  }

  getColumna(): Columna {
    return this.get('columna') ?? 'backlog';
  }
  setColumna(columna: Columna): void {
    this.set('columna', columna);
  }

  /** Posición dentro de su columna, tal como la deja quien arrastra. */
  getOrden(): number {
    return this.get('orden') ?? 0;
  }
  setOrden(orden: number): void {
    this.set('orden', orden);
  }

  toSafeJSON(): Record<string, unknown> {
    const responsable = this.getResponsable();
    return {
      id: this.id,
      porQue: this.getPorQue(),
      que: this.getQue(),
      como: this.getComo(),
      puntos: this.getPuntos(),
      prioridad: this.getPrioridad(),
      columna: this.getColumna(),
      orden: this.getOrden(),
      equipo: this.getEquipoId(),
      responsable: responsable
        ? { id: responsable.id, name: responsable.get('name') ?? '' }
        : null,
    };
  }
}

Parse.Object.registerSubclass('HistoriaUsuario', HistoriaUsuario);
