import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { Coleccion } from './Coleccion.js';
import type { DocumentoVersion } from './DocumentoVersion.js';

export type DocumentoTipo = 'md' | 'html' | 'categoria';
export type DocumentoPlantilla = 'laboratorio' | 'lectura' | 'temario';

export const DOCUMENTO_TIPOS: DocumentoTipo[] = ['md', 'html', 'categoria'];
export const DOCUMENTO_PLANTILLAS: DocumentoPlantilla[] = ['laboratorio', 'lectura', 'temario'];

/**
 * Documento del CMS "Contenidos" — un nodo del árbol de una colección.
 * `padre` + `orden` modelan la jerarquía (= sidebar autogenerado de
 * Docusaurus); una `categoria` agrupa hijos y, si tiene cuerpo, actúa como
 * su página índice. Diseño: design/cms-contenidos.html §1.
 */
export class Documento extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('Documento', attributes);
  }

  getColeccion(): Coleccion | undefined {
    return this.get('coleccion');
  }
  setColeccion(coleccion: Coleccion): void {
    this.set('coleccion', coleccion);
  }

  /** null/undefined = nodo raíz de la colección. */
  getPadre(): Documento | undefined {
    return this.get('padre');
  }
  setPadre(padre: Documento | null): void {
    if (padre) this.set('padre', padre);
    else this.unset('padre');
  }

  getTitulo(): string {
    return this.get('titulo') ?? '';
  }
  setTitulo(titulo: string): void {
    this.set('titulo', titulo);
  }

  /** Slug del segmento de ruta; único por (coleccion, padre). */
  getSlug(): string {
    return this.get('slug') ?? '';
  }
  setSlug(slug: string): void {
    this.set('slug', slug);
  }

  getTipo(): DocumentoTipo {
    return this.get('tipo') ?? 'md';
  }
  setTipo(tipo: DocumentoTipo): void {
    this.set('tipo', tipo);
  }

  /** Posición entre hermanos (= sidebar_position). */
  getOrden(): number {
    return this.get('orden') ?? 0;
  }
  setOrden(orden: number): void {
    this.set('orden', orden);
  }

  getPlantilla(): DocumentoPlantilla | undefined {
    return this.get('plantilla');
  }
  setPlantilla(plantilla: DocumentoPlantilla | null): void {
    if (plantilla) this.set('plantilla', plantilla);
    else this.unset('plantilla');
  }

  /** Versión publicada (la que ve el visor). */
  getVersion(): DocumentoVersion | undefined {
    return this.get('version');
  }
  setVersion(version: DocumentoVersion): void {
    this.set('version', version);
  }

  /** Borrador único en curso; null cuando no difiere de la publicada. */
  getBorrador(): DocumentoVersion | undefined {
    return this.get('borrador');
  }
  setBorrador(borrador: DocumentoVersion | null): void {
    if (borrador) this.set('borrador', borrador);
    else this.unset('borrador');
  }

  getPublicado(): boolean {
    return this.get('publicado') === true;
  }
  setPublicado(publicado: boolean): void {
    this.set('publicado', publicado);
  }

  /**
   * Oculto explícitamente: el nodo Y TODO lo que cuelga de él desaparecen del
   * visor, sin tocar el `publicado` de cada página (volver a mostrar la carpeta
   * devuelve a cada una a su estado anterior).
   *
   * Campo propio y no `publicado` porque una categoría NO tiene estado propio de
   * publicación: se muestra si tiene alguna página publicada debajo. De hecho las
   * 54 categorías vivas tienen `publicado: false` y se ven igual — reusar ese
   * campo como candado las habría escondido todas de golpe.
   *
   * Ausente = visible: por eso esto no necesita migración.
   */
  getOculto(): boolean {
    return this.get('oculto') === true;
  }
  setOculto(oculto: boolean): void {
    this.set('oculto', oculto);
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      coleccionId: this.getColeccion()?.id ?? null,
      padreId: this.getPadre()?.id ?? null,
      titulo: this.getTitulo(),
      slug: this.getSlug(),
      tipo: this.getTipo(),
      orden: this.getOrden(),
      plantilla: this.getPlantilla() ?? null,
      publicado: this.getPublicado(),
      oculto: this.getOculto(),
      // Solo ids de versiones: el cuerpo se pide explícitamente.
      versionId: this.getVersion()?.id ?? null,
      borradorId: this.getBorrador()?.id ?? null,
      active: this.get('active'),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('Documento', Documento);
