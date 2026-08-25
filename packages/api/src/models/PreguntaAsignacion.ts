import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { AppUser } from './AppUser.js';
import type { Grupo } from './Grupo.js';
import { Pregunta } from './Pregunta.js';

/**
 * La pregunta que un profesor le asignó a UN alumno de UN grupo.
 *
 * Es un HISTORIAL: hay N por (grupo, alumno), una por cada vez que se le asigna
 * algo, y la vigente es la más reciente. No se sobrescribe a propósito —a lo
 * largo del semestre hay varias entrevistas y lo que se le preguntó en la
 * primera es justo lo que hay que consultar para no repetírselo en la segunda—.
 * "Quitar" la asignación es un soft-delete de la fila, no un borrado del pasado.
 */
export class PreguntaAsignacion extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('PreguntaAsignacion', attributes);
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

  getPregunta(): Pregunta | undefined {
    return this.get('pregunta');
  }
  setPregunta(pregunta: Pregunta): void {
    this.set('pregunta', pregunta);
  }

  /**
   * Qué entrevista de esa competencia es: 1 o 2. Ausente = la primera, que es lo
   * que había antes de que existiera el segundo intento (cero migración).
   *
   * Junto con la competencia de la pregunta forma el HUECO que ocupa: cada
   * (alumno, competencia, intento) admite una pregunta, y asignar otra al mismo
   * hueco sustituye a la que estaba.
   */
  getIntento(): number {
    return this.get('intento') ?? 1;
  }
  setIntento(intento: number): void {
    this.set('intento', intento);
  }

  /**
   * Ajuste de la pregunta para ESTE alumno: el «solo el profesor lo sabe» del
   * encargo. No se proyecta; se lee en el roster y en la vista de proyección
   * como apunte lateral del profesor.
   */
  getNota(): string {
    return this.get('nota') ?? '';
  }
  setNota(nota: string): void {
    this.set('nota', nota);
  }

  getAsignadaPor(): AppUser | undefined {
    return this.get('asignadaPor');
  }
  setAsignadaPor(user: AppUser): void {
    this.set('asignadaPor', user);
  }

  /**
   * Marcada como ya planteada en la entrevista. Con varias sesiones y muchos
   * alumnos, distinguir «se la asigné» de «ya se la hice» es lo que evita
   * repetirle la pregunta a alguien o saltárselo.
   */
  getUsada(): boolean {
    return this.get('usada') === true;
  }
  setUsada(usada: boolean): void {
    this.set('usada', usada);
  }

  toSafeJSON(): Record<string, unknown> {
    const pregunta = this.getPregunta();
    return {
      id: this.id,
      alumnoId: this.getAlumno()?.id ?? null,
      // La pregunta viaja desplegada (requiere include): el roster pinta su
      // título en cada fila y sin esto serían N peticiones más.
      pregunta: pregunta
        ? {
            id: pregunta.id,
            texto: pregunta.get('texto') ?? '',
            etiquetas: pregunta.get('etiquetas') ?? [],
            // Requiere include('pregunta.competencia'): el roster la pinta en
            // cada fila para ver de un vistazo qué competencia se está
            // explorando en cada alumno.
            competencia: pregunta.get('competencia')?.get('competencia') ?? null,
            competenciaId: pregunta.get('competencia')?.id ?? null,
            archivada: pregunta.get('archivada') === true,
          }
        : null,
      intento: this.getIntento(),
      nota: this.getNota(),
      usada: this.getUsada(),
      asignadaPorId: this.getAsignadaPor()?.id ?? null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('PreguntaAsignacion', PreguntaAsignacion);
