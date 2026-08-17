/** Tipos del CMS "Contenidos" (design/cms-contenidos.html §1). */

export type DocumentoTipo = 'md' | 'html' | 'categoria';
export type DocumentoPlantilla = 'laboratorio' | 'lectura' | 'temario';

/** Referencia mínima de colección (asignación a grupos, submenús). */
export interface ColeccionRef {
  id: string;
  nombre: string;
  slug: string;
  clave: string | null;
  permitePenalizacion?: boolean;
}

export interface ColeccionData {
  id: string;
  nombre: string;
  slug: string;
  clave: string | null;
  descripcion: string | null;
  icono: string;
  publicada: boolean;
  /** ¿La materia usa el nivel «Incipiente B −30 pts»? */
  permitePenalizacion?: boolean;
  active: boolean;
}

export interface DocumentoData {
  id: string;
  coleccionId: string | null;
  padreId: string | null;
  titulo: string;
  slug: string;
  tipo: DocumentoTipo;
  orden: number;
  plantilla: DocumentoPlantilla | null;
  publicado: boolean;
  /** Candado explícito: esconde el nodo y TODO lo que cuelga de él. */
  oculto: boolean;
  versionId: string | null;
  borradorId: string | null;
  active: boolean;
}

/** Nodo del árbol que arma el cliente a partir de la lista plana. */
export interface DocumentoNodo extends DocumentoData {
  hijos: DocumentoNodo[];
}

// --- Módulo "Ejercicios" (mini-juez Kotlin/Swift) ---

export type LenguajeJuez = 'kotlin' | 'swift';

export interface CasoPruebaData {
  entrada: string;
  salidaEsperada: string;
  oculto: boolean;
}

export type ModoEvaluacion = 'programa' | 'plantilla';

export interface EjercicioData {
  id: string;
  coleccionId: string | null;
  categoriaId: string | null;
  titulo: string;
  slug: string;
  orden: number;
  enunciado: string;
  enunciadoHtml: string;
  lenguajes: LenguajeJuez[];
  codigoInicial: { kotlin?: string; swift?: string };
  modoEvaluacion: ModoEvaluacion;
  plantillaCodigo: { kotlin?: string; swift?: string };
  limiteTiempoMs: number;
  limiteMemoriaMb: number;
  casos: CasoPruebaData[];
  publicado: boolean;
  oculto: boolean;
  autorId: string | null;
  active: boolean;
}

// --- Módulo "Diagramas" (juez de diseño UML) ---

export type MotorDiagrama = 'mermaid' | 'plantuml';

/**
 * Tipos que el JUEZ sabe evaluar, y por tanto los únicos que puede tener un
 * EJERCICIO. No es el catálogo entero: el modo libre admite cualquier tipo que
 * algún motor sepa dibujar, y ahí el tipo viaja como `string`.
 *
 * Se REEXPORTA del catálogo en vez de repetirse. Escrita a mano aquí quedaba sin
 * ninguna atadura: al añadir un tipo evaluable, el catálogo y el juez seguían
 * sincronizados —lo comprueba `sincronia-juez.test.ts`—, la suite seguía verde y
 * esta unión se quedaba atrás en silencio, con el `as TipoDiagrama` del editor
 * colándolo sin que el compilador pudiera decir nada.
 */
import type { TipoJuzgable } from '@tc2005b/diagramas-catalogo/catalogo';

export type TipoDiagrama = TipoJuzgable;

/**
 * Una comprobación del catálogo, ya parametrizada por el autor.
 *
 * Los parámetros van anidados en `parametros` y no sueltos junto a `tipo`
 * porque varias comprobaciones necesitan un parámetro llamado «tipo» (el del
 * atributo, el del mensaje) que pisaría la clave que discrimina qué aserción es.
 */
export interface AsercionDiagrama {
  tipo: string;
  /** El alumno ve que falló, no por qué. Misma semántica que un caso oculto. */
  oculta?: boolean;
  /** Sustituye a la descripción automática cuando el autor prefiere otro texto. */
  rotulo?: string;
  parametros?: Record<string, unknown>;
}

/** Diagrama que el ejercicio da por hecho y contra el que se cruzan aserciones. */
export interface DiagramaContextoData {
  /** Identificador con el que las aserciones cruzadas lo referencian. */
  nombre: string;
  tipo: string;
  motor: string;
  codigo: string;
  titulo?: string;
}

export interface EjercicioDiagramaData {
  id: string;
  coleccionId: string | null;
  categoriaId: string | null;
  titulo: string;
  slug: string;
  orden: number;
  enunciado: string;
  enunciadoHtml: string;
  motor: MotorDiagrama;
  tipoDiagrama: TipoDiagrama;
  codigoInicial: string;
  aserciones: AsercionDiagrama[];
  diagramasContexto: DiagramaContextoData[];
  /** Soluciones válidas: todas deben pasar todas las aserciones. */
  diagramasReferencia: string[];
  /** Solución plausible pero incorrecta: debe FALLAR alguna aserción. */
  diagramaTrampa: string;
  /** Ejemplo resuelto: abre con el diagrama ya completo y no cuenta para el progreso. */
  esEjemplo?: boolean;
  publicado: boolean;
  oculto: boolean;
  autorId: string | null;
}

/**
 * Lo que devuelve el LISTADO de admin, que no trae los campos pesados.
 *
 * Es un tipo propio y no `Partial<EjercicioDiagramaData>` para que el compilador
 * impida reenviar un elemento del listado en un `PUT`: ahí las claves ausentes se
 * interpretarían como «déjalo vacío» y borrarían enunciado, código y soluciones.
 * Para editar hay que pedir el ejercicio completo.
 */
export type EjercicioDiagramaResumen = Pick<
  EjercicioDiagramaData,
  'id' | 'categoriaId' | 'titulo' | 'slug' | 'orden'
  | 'motor' | 'tipoDiagrama' | 'aserciones' | 'esEjemplo' | 'publicado'
>;

export type FamiliaAsercion = 'lexica' | 'semantica' | 'cruzada';

export type TipoParametroAsercion = 'texto' | 'numero' | 'lista-texto' | 'opcion';

export interface ParametroAsercion {
  nombre: string;
  etiqueta: string;
  tipo: TipoParametroAsercion;
  requerido: boolean;
  /** Solo en los de tipo `opcion`. */
  opciones?: string[];
  ayuda?: string;
}

/**
 * Descripción de una comprobación del catálogo, servida por el API.
 *
 * El formulario del editor se genera a partir de esto: el catálogo es cerrado y
 * el cliente no conoce ninguna aserción de antemano.
 */
export interface MetadatoAsercion {
  tipo: string;
  etiqueta: string;
  familia: FamiliaAsercion;
  /** Tipos de diagrama a los que aplica. Vacío significa «a todos». */
  aplicaA: string[];
  parametros: ParametroAsercion[];
  descripcion: string;
}

export type VeredictoDiagrama = 'aceptado' | 'error_sintaxis' | 'aserciones_fallidas';

export interface ReferenciaVerificada {
  indice: number;
  veredicto: string;
  asercionesPasadas: number;
  asercionesTotales: number;
  fallos: string[];
}

/** Informe de autoría: comprueba el EJERCICIO, no la respuesta de un alumno. */
export interface InformeVerificacionDiagrama {
  ok: boolean;
  referencias: ReferenciaVerificada[];
  /** Ausente cuando el ejercicio no define diagrama trampa. */
  trampa?: { detecta: boolean; veredicto: string };
  problemas: string[];
}

/** Construye el árbol (padreId + orden) desde la lista plana del API. */
export function buildArbol(documentos: DocumentoData[]): DocumentoNodo[] {
  const nodos = new Map<string, DocumentoNodo>();
  for (const d of documentos) nodos.set(d.id, { ...d, hijos: [] });

  const raices: DocumentoNodo[] = [];
  for (const nodo of nodos.values()) {
    const padre = nodo.padreId ? nodos.get(nodo.padreId) : undefined;
    if (padre) padre.hijos.push(nodo);
    else raices.push(nodo);
  }
  const porOrden = (a: DocumentoNodo, b: DocumentoNodo) => a.orden - b.orden;
  const ordenar = (lista: DocumentoNodo[]) => {
    lista.sort(porOrden);
    lista.forEach((n) => ordenar(n.hijos));
  };
  ordenar(raices);
  return raices;
}
