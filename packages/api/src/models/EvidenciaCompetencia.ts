import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { AppUser } from './AppUser.js';
import type { Grupo } from './Grupo.js';
import type { CitaEntrevista } from './CitaEntrevista.js';

/** De dónde salió la evidencia. Ver la nota de la clase. */
export type OrigenEvidencia = 'entrevista' | 'malla';

/**
 * Un enlace que el alumno deja como evidencia de UNA COMPETENCIA.
 *
 * Es lo mismo que las evidencias de la malla —una URL a lo que ya tiene hecho:
 * su repositorio, su documento, su vídeo—, no un archivo subido.
 *
 * **Por qué «de competencia» y no «de entrevista».** Hoy solo las escribe el
 * módulo de entrevistas, pero la malla ya tiene las suyas, guardadas como un
 * array de URLs en `CompetenciaAlumno.evidencias`, y la idea es que acaben
 * siendo lo mismo: la evidencia es del alumno y de la competencia, y la
 * entrevista es solo la ocasión en la que la entregó. Por eso la clase se llama
 * así, la llave es `(grupo, alumno, competencia)` y lo de la entrevista —la
 * cita— es un campo opcional más. Cuando la malla se conecte no hace falta otra
 * tabla ni otro endpoint: le basta con leer estas filas con `origen: 'malla'`
 * o sin filtrar, y migrar el array que ya tiene.
 *
 * **De qué cuelga dentro de la entrevista, y por qué importa.** De la CITA, no
 * de `(competencia, intento)`. El número de intento no se guarda en ningún
 * sitio: se deduce del orden en que el alumno reservó, así que cancelar la
 * primera cita convierte a la segunda en primera. Si las evidencias fueran por
 * número, ese renumerado se las cambiaría de sitio —lo que el alumno preparó
 * para una entrevista aparecería en la otra—. Colgando de la cita no puede
 * pasar: mover una cita es el mismo objeto, y renumerarla se lleva sus
 * evidencias con ella.
 *
 * **Y cancelar no las borra.** Al cancelar, la cita se va pero la evidencia se
 * queda suelta —`cita` sin poner— dentro de su competencia. El alumno la sigue
 * viendo y, cuando vuelve a reservar esa competencia, se engancha sola a la
 * cita nueva. Perder lo que ya había entregado por mover una hora sería el peor
 * de los resultados posibles.
 */
export class EvidenciaCompetencia extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('EvidenciaCompetencia', attributes);
  }

  getGrupo(): Grupo | undefined {
    return this.get('grupo');
  }
  setGrupo(grupo: Grupo): void {
    this.set('grupo', grupo);
  }

  getAlumno(): AppUser | undefined {
    return this.get('alumno');
  }
  setAlumno(alumno: AppUser): void {
    this.set('alumno', alumno);
  }

  getCompetencia(): Parse.Object | undefined {
    return this.get('competencia');
  }
  setCompetencia(competencia: Parse.Object): void {
    this.set('competencia', competencia);
  }

  /**
   * Quién la pidió. Sin él, el día que la malla escriba aquí no habría forma de
   * saber qué hay que enseñar en cada sitio.
   */
  getOrigen(): OrigenEvidencia {
    return this.get('origen') === 'malla' ? 'malla' : 'entrevista';
  }
  setOrigen(origen: OrigenEvidencia): void {
    this.set('origen', origen);
  }

  /** La cita a la que está enganchada, o nada si la cancelaron. */
  getCita(): CitaEntrevista | undefined {
    return this.get('cita');
  }
  setCita(cita: CitaEntrevista | null): void {
    if (cita) this.set('cita', cita);
    else this.unset('cita');
  }

  getUrl(): string {
    return this.get('url') ?? '';
  }
  setUrl(url: string): void {
    this.set('url', url);
  }

  /** Cómo la llamó el alumno. Vacío = se enseña la URL. */
  getTitulo(): string {
    return this.get('titulo') ?? '';
  }
  setTitulo(titulo: string): void {
    this.set('titulo', titulo);
  }

  toSafeJSON(): Record<string, unknown> {
    const competencia = this.getCompetencia();
    return {
      id: this.id,
      alumnoId: this.getAlumno()?.id ?? null,
      citaId: this.getCita()?.id ?? null,
      competencia: competencia
        ? { id: competencia.id, nombre: competencia.get('competencia') ?? '' }
        : null,
      origen: this.getOrigen(),
      url: this.getUrl(),
      titulo: this.getTitulo(),
      createdAt: this.createdAt,
    };
  }
}

Parse.Object.registerSubclass('EvidenciaCompetencia', EvidenciaCompetencia);
