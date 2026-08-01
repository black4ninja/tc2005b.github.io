import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { AppUser } from './AppUser.js';
import type { Coleccion } from './Coleccion.js';
import type { CategoriaEjercicio } from './CategoriaEjercicio.js';
import type { Asercion, Motor, TipoDiagrama } from '../services/juez-diagramas/index.js';

/**
 * Un diagrama que el ejercicio DA POR ESCRITO y con el que el del alumno debe
 * ser coherente.
 *
 * Es la pieza que permite juzgar trazabilidad entre vistas, que es donde están
 * los errores dominantes medidos en alumnos: mensajes dirigidos a operaciones
 * que no existen en el diagrama de clases, disparadores que no son operaciones
 * del clasificador. Sin contexto, el juez solo puede revisar la coherencia
 * interna de un diagrama aislado —justo lo que los alumnos ya hacen bien—.
 *
 * `nombre` es la etiqueta con la que las aserciones lo referencian.
 */
export interface DiagramaContextoEjercicio {
  nombre: string;
  tipo: TipoDiagrama;
  motor: Motor;
  codigo: string;
  /** Título visible para el alumno; si falta se usa `nombre`. */
  titulo?: string;
}

/**
 * Ejercicio de diseño (módulo "Diagramas" del CMS). Pertenece a una `Coleccion`
 * y se agrupa con las MISMAS `CategoriaEjercicio` y `BloqueEjercicios` que los
 * ejercicios de programación: son agrupadores de la colección, no del juez, y
 * reutilizarlos evita duplicar su CRUD entero.
 *
 * A diferencia de `EjercicioProgramacion` no lleva límites de tiempo ni de
 * memoria: aquí no se ejecuta nada, se parsea un diagrama y se recorre un grafo.
 */
export class EjercicioDiagrama extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('EjercicioDiagrama', attributes);
  }

  getColeccion(): Coleccion | undefined {
    return this.get('coleccion');
  }
  setColeccion(coleccion: Coleccion): void {
    this.set('coleccion', coleccion);
  }

  /** Categoría opcional (agrupa por tema). null = sin categorizar. */
  getCategoria(): CategoriaEjercicio | undefined {
    return this.get('categoria');
  }
  setCategoria(categoria: CategoriaEjercicio | null): void {
    if (categoria) this.set('categoria', categoria);
    else this.unset('categoria');
  }

  getTitulo(): string {
    return this.get('titulo') ?? '';
  }
  setTitulo(titulo: string): void {
    this.set('titulo', titulo);
  }

  /** Slug del segmento de ruta; único por colección. */
  getSlug(): string {
    return this.get('slug') ?? '';
  }
  setSlug(slug: string): void {
    this.set('slug', slug);
  }

  getOrden(): number {
    return this.get('orden') ?? 0;
  }
  setOrden(orden: number): void {
    this.set('orden', orden);
  }

  /** Enunciado en Markdown (fuente). */
  getEnunciado(): string {
    return this.get('enunciado') ?? '';
  }
  setEnunciado(enunciado: string): void {
    this.set('enunciado', enunciado);
  }

  /** Enunciado renderizado por el pipeline (cacheado al guardar). */
  getEnunciadoHtml(): string {
    return this.get('enunciadoHtml') ?? '';
  }
  setEnunciadoHtml(html: string): void {
    this.set('enunciadoHtml', html);
  }

  /** Motor del diagrama; se valida en el controller. */
  getMotor(): Motor {
    return this.get('motor') === 'plantuml' ? 'plantuml' : 'mermaid';
  }
  setMotor(motor: Motor): void {
    this.set('motor', motor);
  }

  getTipoDiagrama(): TipoDiagrama {
    return (this.get('tipoDiagrama') as TipoDiagrama) ?? 'clases';
  }
  setTipoDiagrama(tipo: TipoDiagrama): void {
    this.set('tipoDiagrama', tipo);
  }

  /** Punto de partida del editor del alumno. */
  getCodigoInicial(): string {
    return this.get('codigoInicial') ?? '';
  }
  setCodigoInicial(codigo: string): void {
    this.set('codigoInicial', codigo);
  }

  getAserciones(): Asercion[] {
    return this.get('aserciones') ?? [];
  }
  setAserciones(aserciones: Asercion[]): void {
    this.set('aserciones', aserciones);
  }

  getDiagramasContexto(): DiagramaContextoEjercicio[] {
    return this.get('diagramasContexto') ?? [];
  }
  setDiagramasContexto(diagramas: DiagramaContextoEjercicio[]): void {
    this.set('diagramasContexto', diagramas);
  }

  /**
   * Diagramas de referencia, VARIOS a propósito. Un diseño correcto rara vez es
   * único, y esa pluralidad es justo lo que delata las aserciones sobreajustadas:
   * si dos soluciones legítimas discrepan en el veredicto, el problema está en
   * las aserciones, no en el diagrama.
   *
   * NUNCA se exponen al alumno: viven en `toSafeJSON`, que es la representación
   * de ADMIN.
   */
  getDiagramasReferencia(): string[] {
    return this.get('diagramasReferencia') ?? [];
  }
  setDiagramasReferencia(diagramas: string[]): void {
    this.set('diagramasReferencia', diagramas);
  }

  /**
   * Diagrama deliberadamente defectuoso que DEBE fallar al menos una aserción.
   * Sin él, un conjunto de aserciones demasiado laxo pasaría desapercibido: todas
   * las referencias lo cumplirían y nadie notaría que también lo cumple cualquier
   * cosa.
   */
  getDiagramaTrampa(): string {
    return this.get('diagramaTrampa') ?? '';
  }
  setDiagramaTrampa(diagrama: string): void {
    this.set('diagramaTrampa', diagrama);
  }

  getPublicado(): boolean {
    return this.get('publicado') === true;
  }
  setPublicado(publicado: boolean): void {
    this.set('publicado', publicado);
  }

  /** Oculto explícitamente (ausente = visible; sin migración). */
  getOculto(): boolean {
    return this.get('oculto') === true;
  }
  setOculto(oculto: boolean): void {
    this.set('oculto', oculto);
  }

  getAutor(): AppUser | undefined {
    return this.get('autor');
  }
  setAutor(autor: AppUser): void {
    this.set('autor', autor);
  }

  /**
   * Representación para ADMIN. Incluye referencias y trampa; el DTO del alumno
   * es una whitelist aparte que no las lleva.
   */
  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      coleccionId: this.getColeccion()?.id ?? null,
      categoriaId: this.getCategoria()?.id ?? null,
      titulo: this.getTitulo(),
      slug: this.getSlug(),
      orden: this.getOrden(),
      enunciado: this.getEnunciado(),
      enunciadoHtml: this.getEnunciadoHtml(),
      motor: this.getMotor(),
      tipoDiagrama: this.getTipoDiagrama(),
      codigoInicial: this.getCodigoInicial(),
      aserciones: this.getAserciones(),
      diagramasContexto: this.getDiagramasContexto(),
      diagramasReferencia: this.getDiagramasReferencia(),
      diagramaTrampa: this.getDiagramaTrampa(),
      publicado: this.getPublicado(),
      oculto: this.getOculto(),
      autorId: this.getAutor()?.id ?? null,
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('EjercicioDiagrama', EjercicioDiagrama);
