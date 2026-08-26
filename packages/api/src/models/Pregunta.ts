import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { AppUser } from './AppUser.js';
import type { Coleccion } from './Coleccion.js';
import type { Competencia } from './Competencia.js';

/**
 * Una pregunta del banco del módulo "Preguntas": lo que el profesor le plantea
 * al alumno en una entrevista personal y le proyecta con un temporizador.
 *
 * Pertenece a una `Coleccion`, como los ejercicios y los diagramas, y por la
 * misma razón que ellos: el módulo se enciende por materia desde las
 * Asignaciones del grupo. Lo que la ata a la materia no es solo la costumbre —es
 * que su categoría es una `Competencia`, y las competencias son de una
 * colección.
 *
 * No tiene título. Se probó con uno y sobraba: el rótulo corto que el profesor
 * lee para elegir sale del propio enunciado recortado, y mantener las dos cosas
 * a la vez solo abría la puerta a que dijeran cosas distintas. El tiempo tampoco
 * es suyo: vive en la materia y lo puede anular el grupo (ver `Coleccion`).
 *
 * El alumno NUNCA lee esta clase: no hay read-path de alumno para el módulo. Por
 * eso `notas` —lo que el profesor busca en la respuesta— puede vivir aquí sin
 * whitelist aparte, al contrario que los diagramas de referencia del juez.
 */
export class Pregunta extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('Pregunta', attributes);
  }

  getColeccion(): Coleccion | undefined {
    return this.get('coleccion');
  }
  setColeccion(coleccion: Coleccion): void {
    this.set('coleccion', coleccion);
  }

  /**
   * La competencia que esta pregunta explora. Es la "categoría" del banco: el
   * eje por el que se agrupa y se filtra al asignar.
   *
   * Opcional a propósito. Hay preguntas que no exploran ninguna competencia
   * concreta —abrir la entrevista, comprobar que el alumno sabe qué construyó su
   * equipo— y obligarlas a elegir una las falsearía.
   *
   * ⚠️ Y NO se exige que sea del catálogo de su propia colección. Hoy solo la
   * usa una materia, pero una competencia transversal puede vivir en otra y
   * querer preguntarse desde aquí; atarla a la colección cerraría esa puerta sin
   * ganar nada, porque el módulo ya está acotado por dónde se enciende.
   */
  getCompetencia(): Competencia | undefined {
    return this.get('competencia');
  }
  setCompetencia(competencia: Competencia | null): void {
    if (competencia) this.set('competencia', competencia);
    else this.unset('competencia');
  }

  /** El enunciado que se proyecta, en Markdown (fuente). */
  getTexto(): string {
    return this.get('texto') ?? '';
  }
  setTexto(texto: string): void {
    this.set('texto', texto);
  }

  /** Enunciado renderizado por el pipeline (cacheado al guardar). */
  getTextoHtml(): string {
    return this.get('textoHtml') ?? '';
  }
  setTextoHtml(html: string): void {
    this.set('textoHtml', html);
  }

  /**
   * Etiquetas libres. Son el segundo eje, por debajo de la competencia: matizan
   * lo que la competencia no distingue —a qué perfil de alumno le va bien, de
   * qué parcial es, si es dura o de calentamiento—. Se guardan normalizadas
   * (minúsculas, sin espacios en los bordes) para que el filtro no se parta en
   * variantes de lo mismo.
   */
  getEtiquetas(): string[] {
    return this.get('etiquetas') ?? [];
  }
  setEtiquetas(etiquetas: string[]): void {
    this.set('etiquetas', etiquetas);
  }

  /**
   * Qué buscar en la respuesta. Es para el profesor durante la entrevista y NO
   * viaja a la vista de proyección: ahí solo va el enunciado.
   */
  getNotas(): string {
    return this.get('notas') ?? '';
  }
  setNotas(notas: string): void {
    this.set('notas', notas);
  }

  /**
   * Retirada del banco sin borrarla. Una pregunta ya asignada no se puede
   * eliminar sin dejar huérfano el historial, y a mitad de semestre siempre hay
   * alguna que deja de servir: archivar la saca del selector y la conserva.
   */
  getArchivada(): boolean {
    return this.get('archivada') === true;
  }
  setArchivada(archivada: boolean): void {
    this.set('archivada', archivada);
  }

  getAutor(): AppUser | undefined {
    return this.get('autor');
  }
  setAutor(autor: AppUser): void {
    this.set('autor', autor);
  }

  /** Resumen de la competencia enlazada. Requiere include('competencia'). */
  private competenciaJSON(): Record<string, unknown> | null {
    const c = this.getCompetencia();
    if (!c || c.get('exists') === false) return null;
    return {
      id: c.id,
      competencia: c.get('competencia') ?? '',
      nivel: c.get('nivel') ?? '',
      // La colección de la competencia va aparte de la de la pregunta porque
      // pueden no ser la misma: la interfaz lo señala cuando difieren.
      coleccionId: c.get('coleccion')?.id ?? null,
    };
  }

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      coleccionId: this.getColeccion()?.id ?? null,
      competenciaId: this.getCompetencia()?.id ?? null,
      competencia: this.competenciaJSON(),
      texto: this.getTexto(),
      textoHtml: this.getTextoHtml(),
      etiquetas: this.getEtiquetas(),
      notas: this.getNotas(),
      archivada: this.getArchivada(),
      autorId: this.getAutor()?.id ?? null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('Pregunta', Pregunta);
