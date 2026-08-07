import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { AppUser } from './AppUser.js';
import type { Motor, TipoDiagrama } from '../services/juez-diagramas/index.js';

/**
 * Un diagrama libre guardado por un alumno en el taller.
 *
 * No pertenece a ninguna colección ni a ningún ejercicio: es material propio,
 * como un archivo suyo. Por eso el dueño es un `AppUser` y no un grupo — un
 * alumno que cambia de grupo, o que termina el curso, no pierde lo que dibujó.
 *
 * Tampoco se juzga: aquí no hay aserciones ni veredicto. El taller existe para
 * practicar la notación sin que nadie califique el resultado, que es justo lo
 * que un ejercicio no permite.
 */
export class DiagramaTaller extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('DiagramaTaller', attributes);
  }

  getAutor(): AppUser | undefined {
    return this.get('autor');
  }
  setAutor(autor: AppUser): void {
    this.set('autor', autor);
  }

  /** Nombre con el que el alumno lo reconoce en su lista. */
  getNombre(): string {
    return this.get('nombre') ?? '';
  }
  setNombre(nombre: string): void {
    this.set('nombre', nombre);
  }

  getMotor(): Motor {
    return this.get('motor') === 'plantuml' ? 'plantuml' : 'mermaid';
  }
  setMotor(motor: Motor): void {
    this.set('motor', motor);
  }

  /**
   * Tipo de diagrama. Es informativo —el taller no comprueba nada—, pero sirve
   * para agrupar la lista y para elegir la plantilla inicial.
   */
  getTipoDiagrama(): TipoDiagrama {
    return (this.get('tipoDiagrama') as TipoDiagrama) ?? 'clases';
  }
  setTipoDiagrama(tipo: TipoDiagrama): void {
    this.set('tipoDiagrama', tipo);
  }

  getCodigo(): string {
    return this.get('codigo') ?? '';
  }
  setCodigo(codigo: string): void {
    this.set('codigo', codigo);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      autorId: this.getAutor()?.id ?? null,
      nombre: this.getNombre(),
      motor: this.getMotor(),
      tipoDiagrama: this.getTipoDiagrama(),
      codigo: this.getCodigo(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('DiagramaTaller', DiagramaTaller);
