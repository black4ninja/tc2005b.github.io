import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { AppUser } from './AppUser.js';
import type { Grupo } from './Grupo.js';
import type { EjercicioProgramacion } from './EjercicioProgramacion.js';

/**
 * Detalle de un caso en el resultado de un envío. Los campos de entrada/salida
 * solo se guardan para casos NO ocultos (para poder mostrárselos al alumno).
 */
export interface DetalleCasoEnvio {
  indice: number;
  oculto: boolean;
  paso: boolean;
  veredicto: string;
  entrada?: string;
  salidaEsperada?: string;
  salidaObtenida?: string;
}

/**
 * Estado del envío en la cola del juez:
 *  - `pendiente`: en espera de compilar (se procesa 1×1).
 *  - `ejecutando`: el worker lo está compilando/corriendo.
 *  - `listo`: evaluado; `veredicto`/detalle disponibles.
 *  - `error`: falló el juez (no el código del alumno).
 * Ausente = 'listo' (retrocompat con envíos ya guardados síncronamente).
 */
export type EstadoEnvio = 'pendiente' | 'ejecutando' | 'listo' | 'error';

/**
 * Un envío a un ejercicio (de CUALQUIER usuario): código, lenguaje y resultado
 * de correrlo contra los casos. Es a la vez el registro de historial y el trabajo
 * en la cola del juez (estado). Alimenta la completitud (¿tiene algún envío
 * aceptado?).
 */
export class EnvioEjercicio extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('EnvioEjercicio', attributes);
  }

  getEstado(): EstadoEnvio {
    return (this.get('estado') as EstadoEnvio) ?? 'listo';
  }
  setEstado(estado: EstadoEnvio): void {
    this.set('estado', estado);
  }

  getEjercicio(): EjercicioProgramacion | undefined {
    return this.get('ejercicio');
  }
  setEjercicio(ejercicio: EjercicioProgramacion): void {
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

  getLenguaje(): string {
    return this.get('lenguaje') ?? '';
  }
  setLenguaje(lenguaje: string): void {
    this.set('lenguaje', lenguaje);
  }

  getCodigo(): string {
    return this.get('codigo') ?? '';
  }
  setCodigo(codigo: string): void {
    this.set('codigo', codigo);
  }

  getVeredicto(): string {
    return this.get('veredicto') ?? '';
  }
  setVeredicto(veredicto: string): void {
    this.set('veredicto', veredicto);
  }

  getCasosPasados(): number {
    return this.get('casosPasados') ?? 0;
  }
  setCasosPasados(n: number): void {
    this.set('casosPasados', n);
  }

  getCasosTotales(): number {
    return this.get('casosTotales') ?? 0;
  }
  setCasosTotales(n: number): void {
    this.set('casosTotales', n);
  }

  /** Detalle por caso (visibles con entrada/salida) + error de compilación. */
  getDetalle(): { casos: DetalleCasoEnvio[]; errorCompilacion?: string } {
    return this.get('detalle') ?? { casos: [] };
  }
  setDetalle(detalle: { casos: DetalleCasoEnvio[]; errorCompilacion?: string }): void {
    this.set('detalle', detalle);
  }

  getTiempoMaxMs(): number {
    return this.get('tiempoMaxMs') ?? 0;
  }
  setTiempoMaxMs(ms: number): void {
    this.set('tiempoMaxMs', ms);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      ejercicioId: this.getEjercicio()?.id ?? null,
      alumnoId: this.getAlumno()?.id ?? null,
      grupoId: this.getGrupo()?.id ?? null,
      estado: this.getEstado(),
      lenguaje: this.getLenguaje(),
      codigo: this.getCodigo(),
      veredicto: this.getVeredicto(),
      casosPasados: this.getCasosPasados(),
      casosTotales: this.getCasosTotales(),
      detalle: this.getDetalle(),
      tiempoMaxMs: this.getTiempoMaxMs(),
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('EnvioEjercicio', EnvioEjercicio);
