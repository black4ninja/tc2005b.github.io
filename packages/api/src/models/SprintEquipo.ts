import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { EquipoScrum } from './EquipoScrum.js';
import type { SprintScrum } from './SprintScrum.js';

/** Un corte del burndown: cuántos puntos quedaban y en qué momento. */
export interface CorteBurndown {
  en: string;
  etiqueta: string;
  restantes: number;
}

/**
 * Cómo le fue a un equipo en un sprint. Se escribe al cerrar el sprint y ya no
 * cambia: es el histórico del que salen el burndown del proyecto, la deuda
 * técnica del siguiente sprint y el resumen final.
 *
 * Se guarda CALCULADO y no se recalcula al leer a propósito. Las historias se
 * siguen moviendo después de cerrar el sprint, así que recalcular daría una foto
 * distinta cada vez y el histórico dejaría de ser histórico.
 */
export class SprintEquipo extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('SprintEquipo', attributes);
  }

  getSprint(): SprintScrum | undefined {
    return this.get('sprint');
  }
  setSprint(sprint: SprintScrum): void {
    this.set('sprint', sprint);
  }

  getSprintId(): string {
    return this.get('sprint')?.id ?? '';
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

  private num(campo: string): number {
    return this.get(campo) ?? 0;
  }

  /** Puntos que había en el sprint backlog al cerrar el planning. */
  getPlaneados(): number { return this.num('planeados'); }
  setPlaneados(v: number): void { this.set('planeados', v); }

  getCerrados(): number { return this.num('cerrados'); }
  setCerrados(v: number): void { this.set('cerrados', v); }

  getAbiertas(): number { return this.num('abiertas'); }
  setAbiertas(v: number): void { this.set('abiertas', v); }

  getAbiertosPts(): number { return this.num('abiertosPts'); }
  setAbiertosPts(v: number): void { this.set('abiertosPts', v); }

  getPenalizaciones(): number { return this.num('penalizaciones'); }
  setPenalizaciones(v: number): void { this.set('penalizaciones', v); }

  /** Puntos de historias sin cerrar + una por restricción incumplida. */
  getBloqueo(): number { return this.num('bloqueo'); }
  setBloqueo(v: number): void { this.set('bloqueo', v); }

  /** Puntos que la deuda del sprint ANTERIOR devolvió al backlog en este. */
  getDevueltos(): number { return this.num('devueltos'); }

  /**
   * Sobre cuántos hitos se traza la línea ideal: el compromiso más un paso por
   * cada etapa que queda del ciclo, más el cierre.
   *
   * Se fija AL COMPROMETERSE y ya no cambia. Antes la ideal se reajustaba a los
   * cortes que hubiera hasta ese momento, así que su pendiente dependía de
   * cuántas veces cambiara de etapa el profesor y no del trabajo del equipo:
   * a mitad de sprint exigía terminarlo todo para el siguiente cambio.
   */
  getPasos(): number { return this.num('pasos'); }
  setPasos(pasos: number): void { this.set('pasos', pasos); }
  setDevueltos(v: number): void { this.set('devueltos', v); }

  getCortes(): CorteBurndown[] {
    return this.get('cortes') ?? [];
  }
  setCortes(cortes: CorteBurndown[]): void {
    this.set('cortes', cortes);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      sprint: this.getSprintId(),
      equipo: this.getEquipoId(),
      planeados: this.getPlaneados(),
      cerrados: this.getCerrados(),
      abiertas: this.getAbiertas(),
      abiertosPts: this.getAbiertosPts(),
      penalizaciones: this.getPenalizaciones(),
      bloqueo: this.getBloqueo(),
      devueltos: this.getDevueltos(),
      pasos: this.getPasos(),
      cortes: this.getCortes(),
    };
  }
}

Parse.Object.registerSubclass('SprintEquipo', SprintEquipo);
