export type Motor = 'mermaid' | 'plantuml';
export type Ambito = 'curso' | 'catalogo';

export interface TipoDiagramaDef {
  /** Identificador estable. Se guarda en la BD; no se renombra. */
  key: string;
  label: string;
  descripcion: string;
  /** Qué normalizador lo lee. Vacío de contenido hasta que exista. */
  familia: string;
  ambito: Ambito;
  /** Si la notación es UML. `er` y `flujo` no lo son. */
  uml: boolean;
  /** Bloque del curso ('Estructura'…) o grupo del catálogo ('Datos y gráficos'…). */
  agrupacion: string;
  /**
   * Motores en los que el JUEZ sabe evaluarlo. Vacío significa «se dibuja pero
   * no se corrige»; no confundir con los motores en los que se dibuja, que se
   * consultan con `motoresDe`.
   */
  motoresJuez: Motor[];
}

export interface GrupoDeTipos {
  ambito: Ambito;
  nombre: string;
  tipos: TipoDiagramaDef[];
}

export declare const TIPOS: TipoDiagramaDef[];
export declare const KEYS: string[];
export declare const KEYS_JUZGABLES: string[];
export declare const BLOQUES_CURSO: string[];
export declare const GRUPOS_CATALOGO: string[];
export declare const MOTORES: { key: Motor; label: string }[];
export declare const PLANTILLAS: Record<string, Partial<Record<Motor, string>>>;

export declare function tipoDiagrama(key: string): TipoDiagramaDef | undefined;
export declare function esTipoConocido(key: string): boolean;
export declare function etiquetaTipo(key: string): string;
export declare function etiquetaMotor(key: string): string;
export declare function motoresDe(key: string): Motor[];
export declare function esJuzgable(key: string, motor: string): boolean;
export declare function plantilla(key: string, motor: string): string;
export declare function motorPorOmision(key: string): Motor;
export declare function agrupado(): GrupoDeTipos[];
