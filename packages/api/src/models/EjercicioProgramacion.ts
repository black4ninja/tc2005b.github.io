import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { AppUser } from './AppUser.js';
import type { Coleccion } from './Coleccion.js';
import type { CategoriaEjercicio } from './CategoriaEjercicio.js';

/**
 * Un caso de prueba del ejercicio (juez estilo UVA): se alimenta `entrada` por
 * stdin y se compara stdout con `salidaEsperada`. `oculto` = no se revela su
 * entrada/esperado al alumno, solo si pasó o no.
 */
export interface CasoPrueba {
  entrada: string;
  salidaEsperada: string;
  oculto: boolean;
}

/** Código por lenguaje (código inicial del editor o plantilla del harness). */
export interface CodigoPorLenguaje {
  kotlin?: string;
  swift?: string;
}
export type CodigoInicial = CodigoPorLenguaje;

/**
 * Cómo se evalúa el envío:
 *  - `programa`: el alumno escribe el programa COMPLETO; se compila tal cual y se
 *    compara su stdout (modo por defecto, retrocompatible).
 *  - `plantilla`: el alumno escribe SOLO una parte (una función/clase); el código
 *    se inserta en `plantillaCodigo` (que trae un driver oculto que la ejerce e
 *    imprime resultados) y ESE programa combinado se compila. Habilita ejercicios
 *    de POO/SOLID sin pedir el `main` completo.
 */
export type ModoEvaluacion = 'programa' | 'plantilla';
export const MODOS_EVALUACION: ModoEvaluacion[] = ['programa', 'plantilla'];

/** Marcador dentro de la plantilla donde se inserta el código del alumno. */
export const MARCADOR_SOLUCION = '{{solucion}}';

/**
 * Ejercicio de programación (módulo "Ejercicios" del CMS). Pertenece a una
 * `Coleccion`, como un `Documento`. El alumno lo resuelve con un editor y su
 * envío se prueba automáticamente contra `casos`. `publicado`/`oculto` siguen la
 * misma semántica que en `Documento`: ausente = no publicado / visible.
 */
export class EjercicioProgramacion extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('EjercicioProgramacion', attributes);
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

  /** Posición entre los ejercicios de la colección. */
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

  /** Enunciado renderizado a HTML por el pipeline (cacheado al guardar). */
  getEnunciadoHtml(): string {
    return this.get('enunciadoHtml') ?? '';
  }
  setEnunciadoHtml(html: string): void {
    this.set('enunciadoHtml', html);
  }

  /** Lenguajes permitidos ('kotlin' | 'swift'); se valida en el controller. */
  getLenguajes(): string[] {
    return this.get('lenguajes') ?? [];
  }
  setLenguajes(lenguajes: string[]): void {
    this.set('lenguajes', lenguajes);
  }

  getCodigoInicial(): CodigoInicial {
    return this.get('codigoInicial') ?? {};
  }
  setCodigoInicial(codigo: CodigoInicial): void {
    this.set('codigoInicial', codigo);
  }

  /** Modo de evaluación ('programa' por defecto; 'plantilla' = harness). */
  getModoEvaluacion(): ModoEvaluacion {
    return this.get('modoEvaluacion') === 'plantilla' ? 'plantilla' : 'programa';
  }
  setModoEvaluacion(modo: ModoEvaluacion): void {
    this.set('modoEvaluacion', modo);
  }

  /** Plantilla con el driver oculto (solo en modo 'plantilla'), por lenguaje. */
  getPlantillaCodigo(): CodigoPorLenguaje {
    return this.get('plantillaCodigo') ?? {};
  }
  setPlantillaCodigo(plantilla: CodigoPorLenguaje): void {
    this.set('plantillaCodigo', plantilla);
  }

  getLimiteTiempoMs(): number {
    return this.get('limiteTiempoMs') ?? 5000;
  }
  setLimiteTiempoMs(ms: number): void {
    this.set('limiteTiempoMs', ms);
  }

  getLimiteMemoriaMb(): number {
    return this.get('limiteMemoriaMb') ?? 256;
  }
  setLimiteMemoriaMb(mb: number): void {
    this.set('limiteMemoriaMb', mb);
  }

  getCasos(): CasoPrueba[] {
    return this.get('casos') ?? [];
  }
  setCasos(casos: CasoPrueba[]): void {
    this.set('casos', casos);
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
   * Representación para ADMIN (incluye los casos completos). El visor del alumno
   * construye su propio DTO filtrando los casos ocultos — nunca uses esto para el
   * alumno.
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
      lenguajes: this.getLenguajes(),
      codigoInicial: this.getCodigoInicial(),
      modoEvaluacion: this.getModoEvaluacion(),
      plantillaCodigo: this.getPlantillaCodigo(),
      limiteTiempoMs: this.getLimiteTiempoMs(),
      limiteMemoriaMb: this.getLimiteMemoriaMb(),
      casos: this.getCasos(),
      publicado: this.getPublicado(),
      oculto: this.getOculto(),
      autorId: this.getAutor()?.id ?? null,
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('EjercicioProgramacion', EjercicioProgramacion);
