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

  /**
   * Los huecos SUELTOS que no admiten reservas, por su instante de inicio en ISO.
   *
   * Cerrar el día entero es todo o nada, y lo que el profesor hace de verdad es
   * tapar ratos: la hora de la comida, el trozo en que tiene clase, el hueco que
   * se guarda para respirar. Se guardan los cerrados y no los abiertos porque lo
   * normal es que casi todos estén abiertos, y porque así un día ya existente no
   * necesita migración: sin el campo, ninguno está cerrado.
   */
  getHuecosCerrados(): string[] {
    const guardado = this.get('huecosCerrados');
    return Array.isArray(guardado) ? guardado : [];
  }

  /**
   * Se cierran y se abren con las operaciones de array de Parse, que la base
   * aplica de forma atómica, y NO leyendo la lista entera para volver a
   * escribirla.
   *
   * Los huecos de un día son un solo objeto: cerrar tres seguidos son tres
   * peticiones sobre él. Leer-modificar-escribir las pierde —las tres parten de
   * la misma lista vacía y la última en guardar deja dentro solo su hueco—, y es
   * justo lo que pasa al ir picando candados uno detrás de otro.
   */
  cerrarHueco(inicioISO: string): void {
    this.addUnique('huecosCerrados', inicioISO);
  }
  abrirHueco(inicioISO: string): void {
    this.remove('huecosCerrados', inicioISO);
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
      huecosCerrados: this.getHuecosCerrados(),
    };
  }
}

Parse.Object.registerSubclass('DiaEntrevistas', DiaEntrevistas);
