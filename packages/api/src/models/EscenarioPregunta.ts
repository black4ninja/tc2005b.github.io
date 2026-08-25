import Parse from 'parse/node';
import { BaseModel } from './BaseModel.js';
import type { AppUser } from './AppUser.js';
import { DURACION_POR_DEFECTO } from '../constants/escenarios.js';


/**
 * Una pregunta del banco de ESCENARIOS: lo que el profesor le plantea al alumno
 * en una entrevista personal y le proyecta con un temporizador.
 *
 * A diferencia de los ejercicios y los diagramas, NO cuelga de una `Coleccion`.
 * El banco es global y se organiza por `etiquetas` porque estas preguntas se
 * reciclan entre asignaturas —"cuéntame de un conflicto en tu equipo" sirve
 * igual en cuarto que en séptimo— y colgarlas de la materia obligaría a
 * duplicarlas. Lo que se enciende por grupo es el módulo entero
 * (`Grupo.modulosGrupo`), no un subconjunto del banco.
 *
 * El alumno NUNCA lee esta clase: no hay read-path de alumno para el módulo. Por
 * eso `notas` —lo que el profesor busca en la respuesta— puede vivir aquí sin
 * whitelist aparte, al contrario que los diagramas de referencia del juez.
 */
export class EscenarioPregunta extends BaseModel {
  constructor(attributes?: Parse.Attributes) {
    super('EscenarioPregunta', attributes);
  }

  /** Rótulo corto: es lo que el profesor lee para elegir rápido en el roster. */
  getTitulo(): string {
    return this.get('titulo') ?? '';
  }
  setTitulo(titulo: string): void {
    this.set('titulo', titulo);
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
   * Etiquetas libres. Son el único eje de organización del banco: sustituyen a
   * la colección y a la categoría de los otros módulos, y son con lo que el
   * profesor filtra cuando busca algo para el perfil de un alumno concreto.
   * Se guardan normalizadas (minúsculas, sin espacios en los bordes).
   */
  getEtiquetas(): string[] {
    return this.get('etiquetas') ?? [];
  }
  setEtiquetas(etiquetas: string[]): void {
    this.set('etiquetas', etiquetas);
  }

  /** Segundos que se le dan al alumno. La asignación puede sobrescribirlo. */
  getDuracionSegundos(): number {
    return this.get('duracionSegundos') ?? DURACION_POR_DEFECTO;
  }
  setDuracionSegundos(segundos: number): void {
    this.set('duracionSegundos', segundos);
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

  toSafeJSON(): Record<string, unknown> {
    return {
      id: this.id,
      titulo: this.getTitulo(),
      texto: this.getTexto(),
      textoHtml: this.getTextoHtml(),
      etiquetas: this.getEtiquetas(),
      duracionSegundos: this.getDuracionSegundos(),
      notas: this.getNotas(),
      archivada: this.getArchivada(),
      autorId: this.getAutor()?.id ?? null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Parse.Object.registerSubclass('EscenarioPregunta', EscenarioPregunta);
