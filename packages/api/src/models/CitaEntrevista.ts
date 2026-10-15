import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { AppUser } from './AppUser.js';
import type { Grupo } from './Grupo.js';
import type { DiaEntrevistas } from './DiaEntrevistas.js';

/** Un cambio de hora de la cita: de qué hueco a cuál, cuándo y quién (id de AppUser). */
export interface MovimientoCita {
  de: string;
  a: string;
  en: string;
  porId: string | null;
}

/**
 * La reserva de un alumno en un hueco: una entrevista de UNA competencia.
 *
 * Un alumno que quiere evaluar dos competencias ocupa dos huecos, como en la
 * hoja. El hueco es exclusivo: una cita por hora.
 *
 * NO guarda en qué intento va. Ese número se calcula al leer, ordenando sus
 * citas vivas de esa competencia por hora (`numerarIntentos`): si cancela la
 * primera, la que le queda pasa a ser la primera y le toca la primera pregunta,
 * que es lo que espera cualquiera. Guardado se quedaría en un segundo intento
 * que nunca tuvo.
 *
 * Cancelar es el soft-delete de siempre; `canceladaEn` deja el rastro de cuándo
 * y `canceladaPor`, de quién. Con `creadaPor` y `movimientos` forman la bitácora
 * del día que ve el profesor.
 */
export class CitaEntrevista extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('CitaEntrevista', attributes);
  }

  getGrupo(): Grupo | undefined {
    return this.get('grupo');
  }
  setGrupo(grupo: Grupo): void {
    this.set('grupo', grupo);
  }

  getDia(): DiaEntrevistas | undefined {
    return this.get('dia');
  }
  setDia(dia: DiaEntrevistas): void {
    this.set('dia', dia);
  }

  getAlumno(): AppUser | undefined {
    return this.get('alumno');
  }
  setAlumno(alumno: AppUser): void {
    this.set('alumno', alumno);
  }

  /** Qué competencia viene a evaluar. Es lo que decide qué pregunta le toca. */
  getCompetencia(): Parse.Object | undefined {
    return this.get('competencia');
  }
  setCompetencia(competencia: Parse.Object): void {
    this.set('competencia', competencia);
  }

  getInicio(): Date {
    return this.get('inicio');
  }
  setInicio(fecha: Date): void {
    this.set('inicio', fecha);
  }

  /** Quién la apuntó: el propio alumno o el profesor por él. */
  getCreadaPor(): AppUser | undefined {
    return this.get('creadaPor');
  }
  setCreadaPor(user: AppUser): void {
    this.set('creadaPor', user);
  }

  getCanceladaEn(): Date | null {
    return this.get('canceladaEn') ?? null;
  }

  /** Quién la canceló. Solo desde que existe la bitácora: las anteriores no lo guardaban. */
  getCanceladaPor(): AppUser | undefined {
    return this.get('canceladaPor');
  }

  cancelar(por?: AppUser): void {
    this.set('canceladaEn', new Date());
    if (por) this.set('canceladaPor', por);
    this.softDelete();
  }

  /**
   * Cambios de hora hechos por el profesor (arrastrar en la agenda). Mover
   * reescribe `inicio`, así que sin esto la bitácora no sabría de qué hueco
   * salió la cita.
   */
  getMovimientos(): MovimientoCita[] {
    return (this.get('movimientos') as MovimientoCita[] | undefined) ?? [];
  }

  registrarMovimiento(de: Date, a: Date, por?: AppUser): void {
    this.add('movimientos', { de: de.toISOString(), a: a.toISOString(), en: new Date().toISOString(), porId: por?.id ?? null });
  }

  toSafeJSON(): Record<string, unknown> {
    const alumno = this.getAlumno();
    const competencia = this.getCompetencia();
    return {
      id: this.id,
      diaId: this.getDia()?.id ?? null,
      inicio: this.getInicio()?.toISOString() ?? null,
      alumno: alumno
        ? { id: alumno.id, name: alumno.get('name') ?? '', matricula: alumno.get('matricula') ?? '' }
        : null,
      competencia: competencia
        ? { id: competencia.id, nombre: competencia.get('competencia') ?? '' }
        : null,
      createdAt: this.createdAt,
    };
  }
}

Parse.Object.registerSubclass('CitaEntrevista', CitaEntrevista);
