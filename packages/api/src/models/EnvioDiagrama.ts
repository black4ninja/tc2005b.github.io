import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { AppUser } from './AppUser.js';
import type { Grupo } from './Grupo.js';
import type { EjercicioDiagrama } from './EjercicioDiagrama.js';
import type { ResultadoAsercion, Veredicto } from '../services/juez-diagramas/index.js';

/**
 * Un envío a un ejercicio de diseño: el diagrama entregado y el resultado de
 * juzgarlo. Es el historial y la fuente de la completitud (¿hay algún envío
 * aceptado?).
 *
 * A diferencia de `EnvioEjercicio` NO tiene estado de cola. El juez de código
 * necesitaba `pendiente → ejecutando → listo` porque compilar Kotlin o Swift
 * tarda segundos y hay que hacerlo de uno en uno; juzgar un diagrama es parsear
 * y recorrer un grafo, así que se responde en la misma petición y no hay estado
 * intermedio que representar.
 */
export class EnvioDiagrama extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('EnvioDiagrama', attributes);
  }

  getEjercicio(): EjercicioDiagrama | undefined {
    return this.get('ejercicio');
  }
  setEjercicio(ejercicio: EjercicioDiagrama): void {
    this.set('ejercicio', ejercicio);
  }

  getAlumno(): AppUser | undefined {
    return this.get('alumno');
  }
  setAlumno(alumno: AppUser): void {
    this.set('alumno', alumno);
  }

  getGrupo(): Grupo | undefined {
    return this.get('grupo');
  }
  setGrupo(grupo: Grupo): void {
    this.set('grupo', grupo);
  }

  /** El diagrama tal como lo entregó el alumno. */
  getCodigo(): string {
    return this.get('codigo') ?? '';
  }
  setCodigo(codigo: string): void {
    this.set('codigo', codigo);
  }

  getVeredicto(): Veredicto {
    return (this.get('veredicto') as Veredicto) ?? 'aserciones_fallidas';
  }
  setVeredicto(veredicto: Veredicto): void {
    this.set('veredicto', veredicto);
  }

  /** Mensaje del parser cuando el veredicto es `error_sintaxis`. */
  getErrorSintaxis(): string {
    return this.get('errorSintaxis') ?? '';
  }
  setErrorSintaxis(error: string): void {
    this.set('errorSintaxis', error);
  }

  getAserionesPasadas(): number {
    return this.get('aserionesPasadas') ?? 0;
  }
  setAserionesPasadas(n: number): void {
    this.set('aserionesPasadas', n);
  }

  getAserionesTotales(): number {
    return this.get('aserionesTotales') ?? 0;
  }
  setAserionesTotales(n: number): void {
    this.set('aserionesTotales', n);
  }

  /**
   * Detalle por aserción. Las ocultas se guardan ya sin su `detalle`: el juez lo
   * omite antes de llegar aquí, así que ni siquiera queda escrito en la BD algo
   * que el alumno no debe ver.
   */
  getDetalle(): ResultadoAsercion[] {
    return this.get('detalle') ?? [];
  }
  setDetalle(detalle: ResultadoAsercion[]): void {
    this.set('detalle', detalle);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      ejercicioId: this.getEjercicio()?.id ?? null,
      alumnoId: this.getAlumno()?.id ?? null,
      grupoId: this.getGrupo()?.id ?? null,
      codigo: this.getCodigo(),
      veredicto: this.getVeredicto(),
      errorSintaxis: this.getErrorSintaxis(),
      aserionesPasadas: this.getAserionesPasadas(),
      aserionesTotales: this.getAserionesTotales(),
      detalle: this.getDetalle(),
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('EnvioDiagrama', EnvioDiagrama);
