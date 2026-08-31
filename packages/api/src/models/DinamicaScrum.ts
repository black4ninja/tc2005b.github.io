import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { Grupo } from './Grupo.js';
import type { EtapaScrum } from './EtapaScrum.js';
import type { SprintScrum } from './SprintScrum.js';
import { DEFINICION_DONE_SEMILLA, RESTRICCIONES_SEMILLA } from '../constants/scrum.js';

/**
 * Una dinámica de Scrum de un grupo: normalmente un sprint ("Sprint 2 —
 * Incremento jugable"), a veces un taller suelto.
 *
 * Es el contenedor de todo lo demás: los equipos cuelgan de ella, y con ellos
 * los tableros. Se hace así y no colgando los equipos del grupo porque el
 * reparto CAMBIA entre sprints —es parte del ejercicio— y el tablero de un
 * sprint tiene que seguir siendo legible cuando empieza el siguiente.
 *
 * `etapaActual` es lo único vivo de la fila: el profesor la mueve durante la
 * clase y a todos los alumnos les cambia la banda de color del tablero.
 */
export class DinamicaScrum extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('DinamicaScrum', attributes);
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

  getInicio(): Date | null {
    return (this.get('inicio') as Date | undefined) ?? null;
  }
  setInicio(fecha: Date | null): void {
    if (fecha) this.set('inicio', fecha);
    else this.unset('inicio');
  }

  getFin(): Date | null {
    return (this.get('fin') as Date | undefined) ?? null;
  }
  setFin(fecha: Date | null): void {
    if (fecha) this.set('fin', fecha);
    else this.unset('fin');
  }

  /**
   * Cerrada = el alumno la ve pero ya no la toca. No se borra: el tablero de un
   * sprint pasado es justo lo que se mira en la retrospectiva del siguiente.
   */
  getCerrada(): boolean {
    return this.get('cerrada') === true;
  }
  setCerrada(cerrada: boolean): void {
    this.set('cerrada', cerrada);
  }

  /**
   * La definición de terminado y las restricciones son de la DINÁMICA: son las
   * reglas del ejercicio, iguales para todos los equipos. Nacen con las de la
   * actividad y el profesor las edita.
   */
  getDefinicionDone(): string[] {
    const guardada = this.get('definicionDone') as string[] | undefined;
    return guardada ?? [...DEFINICION_DONE_SEMILLA];
  }
  setDefinicionDone(items: string[]): void {
    this.set('definicionDone', items);
  }

  getRestricciones(): string[] {
    const guardadas = this.get('restricciones') as string[] | undefined;
    return guardadas ?? [...RESTRICCIONES_SEMILLA];
  }
  setRestricciones(items: string[]): void {
    this.set('restricciones', items);
  }

  /** El sprint en curso. Sin él la dinámica existe pero no se puede trabajar. */
  getSprintActual(): SprintScrum | undefined {
    return this.get('sprintActual');
  }
  setSprintActual(sprint: SprintScrum | null): void {
    if (sprint) this.set('sprintActual', sprint);
    else this.unset('sprintActual');
  }

  /**
   * Cuándo se puso la etapa actual. De aquí sale el cronómetro: el servidor no
   * cuenta, sella la hora y cada pantalla calcula lo que queda. Así entrar a
   * mitad enseña el número correcto y los relojes desajustados no importan.
   */
  getEtapaIniciadaEn(): Date | null {
    return (this.get('etapaIniciadaEn') as Date | undefined) ?? null;
  }
  setEtapaIniciadaEn(fecha: Date | null): void {
    if (fecha) this.set('etapaIniciadaEn', fecha);
    else this.unset('etapaIniciadaEn');
  }

  /** Terminada del todo: cada equipo ve su resumen y ya no se toca nada. */
  getFinalizada(): boolean {
    return this.get('finalizada') === true;
  }
  setFinalizada(v: boolean): void {
    this.set('finalizada', v);
  }

  /** La etapa que se está trabajando ahora mismo. Vacío = ninguna señalada. */
  getEtapaActual(): EtapaScrum | undefined {
    return this.get('etapaActual');
  }
  setEtapaActual(etapa: EtapaScrum | null): void {
    if (etapa) this.set('etapaActual', etapa);
    else this.unset('etapaActual');
  }

  toSafeJSON(): Record<string, unknown> {
    const etapa = this.getEtapaActual();
    return {
      id: this.id,
      nombre: this.getNombre(),
      inicio: this.getInicio()?.toISOString() ?? null,
      fin: this.getFin()?.toISOString() ?? null,
      cerrada: this.getCerrada(),
      finalizada: this.getFinalizada(),
      definicionDone: this.getDefinicionDone(),
      restricciones: this.getRestricciones(),
      etapaIniciadaEn: this.getEtapaIniciadaEn()?.toISOString() ?? null,
      // Se sirve la etapa ENTERA y no su id: quien pinta la banda necesita el
      // color y el nombre, y sin esto tendría que cargar el catálogo aparte.
      etapaActual: etapa
        ? {
            id: etapa.id,
            nombre: etapa.get('nombre') ?? '',
            color: etapa.get('color') ?? '#64748b',
            pista: etapa.get('pista') ?? '',
          }
        : null,
      createdAt: this.createdAt,
    };
  }
}

Parse.Object.registerSubclass('DinamicaScrum', DinamicaScrum);
