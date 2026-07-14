import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';

export class Competencia extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('Competencia', attributes);
  }

  getCompetencia(): string {
    return this.get('competencia') ?? '';
  }
  setCompetencia(competencia: string): void {
    this.set('competencia', competencia);
  }

  getNivel(): string {
    return this.get('nivel') ?? '';
  }
  setNivel(nivel: string): void {
    this.set('nivel', nivel);
  }

  getDescripcionNivel(): string {
    return this.get('descripcionNivel') ?? '';
  }
  setDescripcionNivel(descripcionNivel: string): void {
    this.set('descripcionNivel', descripcionNivel);
  }

  getGuiaEvidencias(): string {
    return this.get('guiaEvidencias') ?? '';
  }
  setGuiaEvidencias(guiaEvidencias: string): void {
    this.set('guiaEvidencias', guiaEvidencias);
  }

  getIncipienteB(): string {
    return this.get('incipienteB') ?? '';
  }
  setIncipienteB(incipienteB: string): void {
    this.set('incipienteB', incipienteB);
  }

  getIncipienteA(): string {
    return this.get('incipienteA') ?? '';
  }
  setIncipienteA(incipienteA: string): void {
    this.set('incipienteA', incipienteA);
  }

  getBasico(): string {
    return this.get('basico') ?? '';
  }
  setBasico(basico: string): void {
    this.set('basico', basico);
  }

  getSolido(): string {
    return this.get('solido') ?? '';
  }
  setSolido(solido: string): void {
    this.set('solido', solido);
  }

  getDestacado(): string {
    return this.get('destacado') ?? '';
  }
  setDestacado(destacado: string): void {
    this.set('destacado', destacado);
  }

  getFechaIdealEvaluacion(): string {
    return this.get('fechaIdealEvaluacion') ?? '';
  }
  setFechaIdealEvaluacion(fechaIdealEvaluacion: string): void {
    this.set('fechaIdealEvaluacion', fechaIdealEvaluacion);
  }

  getOrden(): number {
    return this.get('orden') ?? 0;
  }
  setOrden(orden: number): void {
    this.set('orden', orden);
  }

  getEsCalculada(): boolean {
    return this.get('esCalculada') ?? false;
  }
  setEsCalculada(val: boolean): void {
    this.set('esCalculada', val);
  }

  getDependencias(): Parse.Object[] {
    return this.get('dependencias') ?? [];
  }
  setDependencias(deps: Parse.Object[]): void {
    this.set('dependencias', deps);
  }

  /**
   * Colección (materia) a la que pertenece la competencia — pointer, nunca string.
   *
   * NO es decorativo: la malla de un alumno se materializa solo con las
   * competencias de las colecciones de su grupo (`Grupo.colecciones`). Una
   * competencia sin colección no le llega a nadie.
   *
   * Una competencia CALCULADA solo puede depender de competencias de SU MISMA
   * colección: si dependiera de una de otra, el alumno no tendría celda para esa
   * dependencia y la calculada quedaría sin evaluar para siempre, en silencio.
   * Lo valida `competencias.controller.ts`.
   */
  getColeccion(): Parse.Object | undefined {
    return this.get('coleccion');
  }
  setColeccion(coleccion: Parse.Object): void {
    this.set('coleccion', coleccion);
  }

  toSafeJSON(): Record<string, unknown> {
    const deps = this.getDependencias();
    const coleccion = this.getColeccion();
    const coleccionActiva = coleccion && coleccion.get('exists') !== false ? coleccion : null;
    return {
      id: this.id,
      competencia: this.getCompetencia(),
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
      nivel: this.getNivel(),
      descripcionNivel: this.getDescripcionNivel(),
      guiaEvidencias: this.getGuiaEvidencias(),
      incipienteB: this.getIncipienteB(),
      incipienteA: this.getIncipienteA(),
      basico: this.getBasico(),
      solido: this.getSolido(),
      destacado: this.getDestacado(),
      fechaIdealEvaluacion: this.getFechaIdealEvaluacion(),
      orden: this.getOrden(),
      esCalculada: this.getEsCalculada(),
      dependencias: deps.map((d) => ({
        id: d.id,
        competencia: d.get('competencia') ?? '',
      })),
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('Competencia', Competencia);
