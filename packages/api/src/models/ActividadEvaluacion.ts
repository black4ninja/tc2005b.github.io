import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';

export class ActividadEvaluacion extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('ActividadEvaluacion', attributes);
  }

  getNombre(): string {
    return this.get('nombre') ?? '';
  }
  setNombre(nombre: string): void {
    this.set('nombre', nombre);
  }

  getTipo(): string {
    return this.get('tipo') ?? 'actividad';
  }
  setTipo(tipo: string): void {
    this.set('tipo', tipo);
  }

  getAprendizajePlaneado(): number {
    return this.get('aprendizajePlaneado') ?? 0;
  }
  setAprendizajePlaneado(aprendizajePlaneado: number): void {
    this.set('aprendizajePlaneado', aprendizajePlaneado);
  }

  getSemanaPlaneada(): number {
    return this.get('semanaPlaneada') ?? 0;
  }
  setSemanaPlaneada(semanaPlaneada: number): void {
    this.set('semanaPlaneada', semanaPlaneada);
  }

  getOrden(): number {
    return this.get('orden') ?? 0;
  }
  setOrden(orden: number): void {
    this.set('orden', orden);
  }

  /**
   * Colección (materia) a la que pertenece la plantilla — pointer, nunca string.
   *
   * Esta clase es un TROQUEL: `copiarPlantilla` la copia POR VALOR a
   * `ActividadEvaluacionGrupo` y no guarda referencia de vuelta. El plan de
   * evaluación, la malla del alumno y el cálculo de la nota trabajan sobre esas
   * copias y **nunca miran la plantilla**. Por eso atarla a una colección no
   * puede mover ninguna nota ya existente: solo decide qué se estampa a partir
   * de ahora, y para qué grupos.
   *
   * Sin colección, la plantilla no se copia a ningún grupo.
   */
  getColeccion(): Parse.Object | undefined {
    return this.get('coleccion');
  }
  setColeccion(coleccion: Parse.Object): void {
    this.set('coleccion', coleccion);
  }

  toSafeJSON(): Record<string, unknown> {
    const coleccion = this.getColeccion();
    const coleccionActiva = coleccion && coleccion.get('exists') !== false ? coleccion : null;
    return {
      id: this.id,
      nombre: this.getNombre(),
      tipo: this.getTipo(),
      aprendizajePlaneado: this.getAprendizajePlaneado(),
      semanaPlaneada: this.getSemanaPlaneada(),
      orden: this.getOrden(),
      coleccionId: coleccionActiva?.id ?? null,
      // Requiere query.include('coleccion') para traer nombre/clave.
      coleccion: coleccionActiva
        ? {
            id: coleccionActiva.id,
            nombre: coleccionActiva.get('nombre') ?? null,
            slug: coleccionActiva.get('slug') ?? null,
            clave: coleccionActiva.get('clave') ?? null,
          }
        : null,
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('ActividadEvaluacion', ActividadEvaluacion);
