import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { Grupo } from './Grupo.js';

/**
 * Un día de entrevistas: una franja que el profesor abre para que los alumnos se
 * apunten.
 *
 * Es la columna de la hoja de cálculo que esto sustituye. Guarda instantes
 * ABSOLUTOS —no «9:00» suelto—: el navegador del profesor sabe en qué zona está
 * y el servidor solo compara, así que no hay dos sitios interpretando la misma
 * hora de forma distinta.
 *
 * `duracionSegundos` se copia al crear el día y no se lee del módulo. Si mañana
 * el profesor pasa las entrevistas de cinco a tres minutos, los días ya abiertos
 * tienen que seguir partiéndose igual: mover los huecos movería las citas que
 * los alumnos ya tienen apuntadas.
 */
export class DiaEntrevistas extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('DiaEntrevistas', attributes);
  }

  getGrupo(): Grupo | undefined {
    return this.get('grupo');
  }
  setGrupo(grupo: Grupo): void {
    this.set('grupo', grupo);
  }

  getInicio(): Date {
    return this.get('inicio');
  }
  setInicio(fecha: Date): void {
    this.set('inicio', fecha);
  }

  getFin(): Date {
    return this.get('fin');
  }
  setFin(fecha: Date): void {
    this.set('fin', fecha);
  }

  getDuracionSegundos(): number {
    return this.get('duracionSegundos') ?? 300;
  }
  setDuracionSegundos(segundos: number): void {
    this.set('duracionSegundos', segundos);
  }

  /** Aviso para el alumno: sala, enlace de la videollamada, lo que haga falta. */
  getNota(): string {
    return this.get('nota') ?? '';
  }
  setNota(nota: string): void {
    this.set('nota', nota);
  }

  /**
   * Cerrado = sigue visible pero ya no admite reservas. Es lo que la hoja
   * escribía a mano como «No hay horarios disponibles».
   */
  getCerrado(): boolean {
    return this.get('cerrado') === true;
  }
  setCerrado(cerrado: boolean): void {
    this.set('cerrado', cerrado);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      grupoId: this.getGrupo()?.id ?? null,
      inicio: this.getInicio()?.toISOString() ?? null,
      fin: this.getFin()?.toISOString() ?? null,
      duracionSegundos: this.getDuracionSegundos(),
      nota: this.getNota(),
      cerrado: this.getCerrado(),
    };
  }
}

Parse.Object.registerSubclass('DiaEntrevistas', DiaEntrevistas);
