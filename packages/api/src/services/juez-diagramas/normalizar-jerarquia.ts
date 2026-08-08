/**
 * Familia «jerarquía»: los tipos del catálogo que son un ÁRBOL.
 *
 * Mapa mental, mapa de árbol, árbol de ficheros y diagrama de Ishikawa dibujan
 * cosas muy distintas y son, por debajo, lo mismo: un nodo raíz y descendientes.
 * Se normalizan al `Nodo`/`Arista` que el juez ya tiene, y esa decisión es la
 * que hace barata a toda la familia: heredan sin escribir nada
 * `existe-nodo`, `conteo-nodos`, `nodos-alcanzables`, `sin-ciclos` y
 * `sin-nombres-vagos`, que ya estaban resueltas para los tipos UML.
 *
 * Lo único que hay por tipo es un ADAPTADOR de tres líneas: Mermaid llama a la
 * etiqueta `descr`, `name` o `text` según el diagrama, y dos de los cuatro
 * cuelgan el árbol de una raíz sintética que no es un nodo del modelo.
 */
import { instalarDom } from './entorno-dom.js';
import {
  ErrorSintaxisDiagrama, modeloVacio,
  type ModeloDiagrama, type Nodo, type TipoDiagrama,
} from './tipos.js';

/** Un nodo del árbol, ya despegado de la forma que le da cada motor. */
interface NodoArbol {
  etiqueta: string;
  valor?: number;
  hijos: NodoArbol[];
}

interface Adaptador {
  /** De dónde sale el árbol dentro del `db` de Mermaid. */
  raiz: (db: Record<string, unknown>) => unknown;
  /** Cómo se llama la etiqueta en ESE diagrama. */
  etiqueta: (n: Record<string, unknown>) => string;
  /**
   * Si la raíz que da el motor es un envoltorio sin contenido propio. Mapa de
   * árbol y árbol de ficheros cuelgan todo de un nodo sintético (`""`, `"/"`)
   * que no está en lo que escribió el alumno; meterlo en el modelo haría fallar
   * cualquier conteo por uno.
   */
  raizSintetica?: (n: Record<string, unknown>) => boolean;
}

const ADAPTADORES: Record<string, Adaptador> = {
  'mapa-mental': {
    raiz: (db) => (db.getMindmap as (() => unknown) | undefined)?.(),
    etiqueta: (n) => String(n.descr ?? n.nodeId ?? ''),
  },
  treemap: {
    raiz: (db) => db.root,
    etiqueta: (n) => String(n.name ?? ''),
    raizSintetica: (n) => !String(n.name ?? '').trim(),
  },
  arbol: {
    raiz: (db) => (db.getRoot as (() => unknown) | undefined)?.(),
    etiqueta: (n) => String(n.name ?? ''),
    // La raíz de `treeView` es siempre `/` con nivel -1: el contenedor del
    // árbol, no una carpeta que el alumno haya escrito.
    raizSintetica: (n) => n.level === -1,
  },
  ishikawa: {
    raiz: (db) => (db.getRoot as (() => unknown) | undefined)?.(),
    etiqueta: (n) => String(n.text ?? ''),
  },
};

/** Convierte el árbol crudo del motor en el árbol neutro de arriba. */
function leerArbol(crudo: unknown, ad: Adaptador): NodoArbol | null {
  if (crudo === null || typeof crudo !== 'object') return null;
  const n = crudo as Record<string, unknown>;
  const hijosCrudos = Array.isArray(n.children) ? n.children : [];
  const hijos = hijosCrudos.map((h) => leerArbol(h, ad)).filter((x): x is NodoArbol => x !== null);
  return {
    etiqueta: ad.etiqueta(n).trim(),
    valor: typeof n.value === 'number' ? n.value : undefined,
    hijos,
  };
}

interface MermaidModulo {
  initialize: (c: Record<string, unknown>) => void;
  parse: (t: string) => Promise<unknown>;
  mermaidAPI: { getDiagramFromText: (t: string) => Promise<{ db: Record<string, unknown> }> };
}

let mermaid: MermaidModulo | null = null;

async function cargarMermaid(): Promise<MermaidModulo> {
  if (mermaid) return mermaid;
  instalarDom();
  const modulo = (await import('mermaid')).default as unknown as MermaidModulo;
  modulo.initialize({ startOnLoad: false, securityLevel: 'strict' });
  mermaid = modulo;
  return modulo;
}

/**
 * Aplana el árbol al modelo del juez.
 *
 * Los ids se derivan del CAMINO y no de la etiqueta: en un mapa mental es
 * normal repetir la misma palabra en dos ramas («Búsqueda» bajo Catálogo y bajo
 * Pedidos), y con ids por etiqueta las dos se fundirían en un nodo con dos
 * padres, que ya no es un árbol.
 */
function aplanar(raiz: NodoArbol, modelo: ModeloDiagrama, saltarRaiz: boolean): void {
  const visitar = (n: NodoArbol, camino: string, padre: string | undefined): void => {
    const id = camino;
    const nodo: Nodo = {
      id,
      nombre: n.etiqueta,
      clase: 'nodo',
      atributos: n.valor === undefined ? [] : [{ nombre: 'valor', valor: String(n.valor) }],
      operaciones: [],
      anotaciones: [],
      contenedor: padre,
    };
    modelo.nodos.push(nodo);
    if (padre !== undefined) {
      modelo.aristas.push({ origen: padre, destino: id, tipo: 'flujo' });
    }
    n.hijos.forEach((h, i) => visitar(h, `${camino}/${h.etiqueta || i}`, id));
  };

  if (saltarRaiz) {
    raiz.hijos.forEach((h, i) => visitar(h, h.etiqueta || String(i), undefined));
  } else {
    visitar(raiz, raiz.etiqueta || 'raiz', undefined);
  }
}

/** Tipos que este normalizador sabe leer. Se deriva de los adaptadores. */
export const SOPORTADOS_JERARQUIA: TipoDiagrama[] = Object.keys(ADAPTADORES) as TipoDiagrama[];

export async function normalizarJerarquia(
  tipo: TipoDiagrama,
  codigo: string,
): Promise<ModeloDiagrama> {
  const ad = ADAPTADORES[tipo];
  if (!ad) {
    throw new Error(`El juez todavía no sabe leer diagramas de tipo "${tipo}" como jerarquía.`);
  }

  const m = await cargarMermaid();
  let db: Record<string, unknown>;
  try {
    // `parse` valida Y registra el diagrama perezoso; sin él,
    // `getDiagramFromText` falla con "No diagram type detected".
    await m.parse(codigo);
    ({ db } = await m.mermaidAPI.getDiagramFromText(codigo));
  } catch (e) {
    throw new ErrorSintaxisDiagrama(limpiarError(e));
  }

  const crudo = ad.raiz(db);
  const arbol = leerArbol(crudo, ad);
  if (!arbol) {
    throw new ErrorSintaxisDiagrama('El diagrama no tiene ningún nodo.');
  }

  // La pregunta se le hace a la raíz CRUDA, no a la ya adaptada: el envoltorio
  // se reconoce por campos del motor (`name` vacío, `level: -1`) que el árbol
  // neutro ya no tiene.
  const sintetica =
    crudo !== null && typeof crudo === 'object'
      ? ad.raizSintetica?.(crudo as Record<string, unknown>) ?? false
      : false;

  const modelo = modeloVacio(tipo, 'mermaid');
  aplanar(arbol, modelo, sintetica);
  if (!modelo.nodos.length) {
    throw new ErrorSintaxisDiagrama('El diagrama no tiene ningún nodo.');
  }
  return modelo;
}

/**
 * El error de Mermaid trae la traza del parser generado, que a un alumno no le
 * dice nada. Se conserva la primera línea —que sí lleva «Parse error on line N»—
 * y la del cursor, que señala la columna. Igual que en `normalizar-mermaid.ts`.
 */
function limpiarError(e: unknown): string {
  const texto = e instanceof Error ? e.message : String(e);
  const lineas = texto.split('\n').map((l) => l.trimEnd());
  const utiles = lineas.filter((l) => l.trim()).slice(0, 3);
  return utiles.join(' ').slice(0, 300) || 'El diagrama no se pudo leer.';
}
