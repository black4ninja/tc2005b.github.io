import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { AppUser } from './AppUser.js';
import type { EquipoScrum } from './EquipoScrum.js';
import type { SprintScrum } from './SprintScrum.js';
import type { ColumnaRetro, EstadoCompromiso } from '../constants/scrum.js';

/**
 * Una tarjeta de la retrospectiva: qué hicimos bien, qué hicimos mal, qué
 * podemos mejorar.
 *
 * Las de «mejorar» son distintas de las otras dos: llevan responsable y, cuando
 * la retro termina, se convierten en el COMPROMISO que el equipo arrastra al
 * siguiente sprint. Por eso no hay una clase «Compromiso» aparte —un compromiso
 * es una tarjeta de mejorar que todavía no se ha marcado—: separarlas obligaría
 * a copiar el texto de una a otra y a mantener dos verdades.
 *
 * Estar asignado a un compromiso NO significa tener que hacerlo solo: significa
 * ser responsable de su seguimiento. La interfaz lo dice con esas palabras.
 */
export class TarjetaRetro extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('TarjetaRetro', attributes);
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

  /** El sprint en cuya retrospectiva se escribió. */
  getSprint(): SprintScrum | undefined {
    return this.get('sprint');
  }
  setSprint(sprint: SprintScrum): void {
    this.set('sprint', sprint);
  }

  getSprintId(): string {
    return this.get('sprint')?.id ?? '';
  }

  getColumna(): ColumnaRetro {
    return this.get('columna') ?? 'bien';
  }
  setColumna(columna: ColumnaRetro): void {
    this.set('columna', columna);
  }

  getTexto(): string {
    return this.get('texto') ?? '';
  }
  setTexto(texto: string): void {
    this.set('texto', texto);
  }

  /** Solo en las de «mejorar»: quién sigue el compromiso. */
  getResponsable(): AppUser | undefined {
    return this.get('responsable');
  }
  setResponsable(alumno: AppUser | null): void {
    if (alumno) this.set('responsable', alumno);
    else this.unset('responsable');
  }

  /** `null` = compromiso abierto; se cierra al marcarlo en la retro siguiente. */
  getEstado(): EstadoCompromiso | null {
    return (this.get('estado') as EstadoCompromiso | undefined) ?? null;
  }
  setEstado(estado: EstadoCompromiso | null): void {
    if (estado) this.set('estado', estado);
    else this.unset('estado');
  }

  toSafeJSON(): Record<string, unknown> {
    const responsable = this.getResponsable();
    return {
      id: this.id,
      columna: this.getColumna(),
      texto: this.getTexto(),
      estado: this.getEstado(),
      sprint: this.getSprintId(),
      responsable: responsable
        ? { id: responsable.id, name: responsable.get('name') ?? '' }
        : null,
    };
  }
}

Parse.Object.registerSubclass('TarjetaRetro', TarjetaRetro);
