/**
 * Las familias del catálogo que son un GRAFO: red, versionado y estrategia.
 *
 * Ocho tipos que dibujan cosas sin relación aparente —servicios en la nube,
 * ramas de Git, requisitos, mapas de Wardley— y que, por debajo, son lo mismo:
 * elementos, agrupaciones y conexiones. Se normalizan al `Nodo`/`Arista` que el
 * juez ya tiene, igual que hizo la familia «jerarquía», y por el mismo motivo:
 * heredan sin escribir nada `existe-nodo`, `conteo-nodos`, `relacion-entre`,
 * `contenido-en-paquete`, `sin-ciclos`, `nodos-alcanzables` y
 * `sin-nombres-vagos`.
 *
 * Lo propio de cada tipo es un ADAPTADOR: dónde están los elementos dentro del
 * `db` de Mermaid y cómo se llama su etiqueta. Nada más. Si un tipo necesitara
 * algo que no cabe en `Nodo`/`Arista` —valores, fechas, series— no pertenece a
 * estas familias sino a `series`, `planificacion` o `gramatica`, que sí exigen
 * ampliar el modelo.
 */
import { instalarDom } from './entorno-dom.js';
import {
  ErrorSintaxisDiagrama, modeloVacio,
  type Arista, type ClaseNodo, type Miembro, type ModeloDiagrama, type Nodo,
  type TipoDiagrama,
} from './tipos.js';

/** Lo que un adaptador devuelve, antes de convertirse en `ModeloDiagrama`. */
interface Crudo {
  nodos: Array<{
    id: string;
    nombre: string;
    clase?: ClaseNodo;
    contenedor?: string;
    anotaciones?: string[];
    atributos?: Miembro[];
  }>;
  aristas: Array<{ origen: string; destino: string; etiqueta?: string }>;
}

type Db = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Mermaid envuelve muchos textos en `{ text }`; aquí se desenvuelven. */
function texto(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object' && 'text' in (v as Record<string, unknown>)) {
    return String((v as { text: unknown }).text ?? '').trim();
  }
  return '';
}

const ADAPTADORES: Partial<Record<TipoDiagrama, (db: Db) => Crudo>> = {
  // --- Familia «red» --------------------------------------------------------
  c4: (db) => ({
    nodos: [
      // Los límites (`System_Boundary`, `Enterprise_Boundary`) son contenedores:
      // es lo que permite preguntar qué hay dentro de cada frontera, que es la
      // pregunta central del modelo C4.
      ...(db.getBoundaries?.() ?? []).map((b: Db) => ({
        id: String(b.alias),
        nombre: texto(b.label) || String(b.alias),
        clase: 'paquete' as ClaseNodo,
        contenedor: b.parentBoundary && b.parentBoundary !== 'global' ? String(b.parentBoundary) : undefined,
      })),
      ...(db.getC4ShapeArray?.() ?? []).map((s: Db) => ({
        id: String(s.alias),
        nombre: texto(s.label) || String(s.alias),
        clase: (texto(s.typeC4Shape) === 'person' ? 'actor' : 'componente') as ClaseNodo,
        contenedor: s.parentBoundary && s.parentBoundary !== 'global' ? String(s.parentBoundary) : undefined,
        anotaciones: [texto(s.typeC4Shape)].filter(Boolean),
      })),
    ],
    aristas: (db.getRels?.() ?? []).map((r: Db) => ({
      origen: String(r.from),
      destino: String(r.to),
      etiqueta: texto(r.label) || undefined,
    })),
  }),

  bloques: (db) => ({
    nodos: (db.getBlocks?.() ?? []).map((b: Db) => ({
      id: String(b.id),
      nombre: String(b.label ?? b.id),
      clase: 'nodo' as ClaseNodo,
    })),
    aristas: (db.getEdges?.() ?? []).map((e: Db) => ({
      origen: String(e.start),
      destino: String(e.end),
      etiqueta: String(e.label ?? '').trim() || undefined,
    })),
  }),

  'arquitectura-nube': (db) => ({
    nodos: [
      ...(Object.values(db.groups ?? {}) as Db[]).map((g) => ({
        id: String(g.id),
        nombre: String(g.title ?? g.id),
        clase: 'paquete' as ClaseNodo,
        anotaciones: [String(g.icon ?? '')].filter(Boolean),
      })),
      ...(Object.values(db.nodes ?? {}) as Db[]).map((s) => ({
        id: String(s.id),
        nombre: String(s.title ?? s.id),
        clase: 'componente' as ClaseNodo,
        // `in g`: el servicio vive dentro del grupo. Es lo que permite
        // comprobar que algo esté desplegado donde toca.
        contenedor: s.in ? String(s.in) : undefined,
        anotaciones: [String(s.icon ?? '')].filter(Boolean),
      })),
    ],
    aristas: (db.edges ?? []).map((e: Db) => ({
      origen: String(e.lhsId),
      destino: String(e.rhsId),
      etiqueta: e.title ? String(e.title) : undefined,
    })),
  }),

  'paquete-red': (db) => ({
    // Un paquete de red no tiene conexiones: es una tira de campos. El rango de
    // bits va como atributo porque es lo único que distingue un campo de otro.
    nodos: (db.packet ?? []).flat().map((c: Db) => ({
      id: `${c.start}-${c.end}`,
      nombre: String(c.label ?? '').trim() || `${c.start}-${c.end}`,
      clase: 'nodo' as ClaseNodo,
      atributos: [
        { nombre: 'bits', valor: String(c.bits ?? Number(c.end) - Number(c.start) + 1) },
        { nombre: 'inicio', valor: String(c.start) },
      ],
    })),
    aristas: [],
  }),

  // --- Familia «versionado» -------------------------------------------------
  git: (db) => ({
    nodos: [
      ...(db.getBranchesAsObjArray?.() ?? []).map((b: Db) => ({
        id: `rama:${b.name}`,
        nombre: String(b.name),
        clase: 'paquete' as ClaseNodo,
      })),
      ...(db.getCommitsArray?.() ?? []).map((c: Db) => ({
        id: String(c.id),
        nombre: String(c.message || c.id),
        clase: 'nodo' as ClaseNodo,
        contenedor: c.branch ? `rama:${c.branch}` : undefined,
        // Un commit con dos padres es una fusión, y saberlo es media historia
        // de un repositorio.
        anotaciones: (c.parents ?? []).length > 1 ? ['fusion'] : [],
      })),
    ],
    // La arista va del padre al hijo: es el sentido en que avanza la historia.
    aristas: (db.getCommitsArray?.() ?? []).flatMap((c: Db) =>
      (c.parents ?? []).map((p: string) => ({ origen: String(p), destino: String(c.id) })),
    ),
  }),

  // --- Familia «estrategia» -------------------------------------------------
  requisitos: (db) => ({
    nodos: [
      ...[...(db.requirements ?? new Map()).values()].map((r: Db) => ({
        id: String(r.name),
        nombre: String(r.name),
        clase: 'nodo' as ClaseNodo,
        anotaciones: [String(r.type ?? ''), String(r.risk ?? '')].filter(Boolean),
        atributos: [
          ...(r.requirementId ? [{ nombre: 'id', valor: String(r.requirementId) }] : []),
          ...(r.text ? [{ nombre: 'texto', valor: String(r.text) }] : []),
        ],
      })),
      ...[...(db.elements ?? new Map()).values()].map((e: Db) => ({
        id: String(e.name),
        nombre: String(e.name),
        clase: 'componente' as ClaseNodo,
        anotaciones: [String(e.type ?? '')].filter(Boolean),
      })),
    ],
    // `E - satisfies -> R`: el tipo de trazabilidad ES la etiqueta, porque es lo
    // que distingue «satisface» de «verifica» o «deriva».
    aristas: (db.relations ?? []).map((r: Db) => ({
      origen: String(r.src),
      destino: String(r.dst),
      etiqueta: String(r.type ?? '').trim() || undefined,
    })),
  }),

  wardley: (db) => {
    const datos = db.getWardleyData?.() ?? {};
    return {
      nodos: (datos.nodes ?? []).map((nodo: Db) => ({
        id: String(nodo.id),
        nombre: String(nodo.label ?? nodo.id),
        clase: 'componente' as ClaseNodo,
        // La posición ES el contenido de un mapa de Wardley: la X dice cuán
        // evolucionado está el componente y la Y cuán visible es para el
        // usuario. Sin ellas el mapa no dice nada.
        atributos: [
          { nombre: 'evolucion', valor: String(nodo.x) },
          { nombre: 'visibilidad', valor: String(nodo.y) },
        ],
      })),
      aristas: (datos.links ?? []).map((l: Db) => ({
        origen: String(l.source),
        destino: String(l.target),
      })),
    };
  },

  cynefin: (db) => {
    const dominios = [...(db.getDomains?.() ?? new Map()).values()];
    return {
      nodos: [
        ...dominios.map((d: Db) => ({
          id: String(d.name),
          nombre: String(d.name),
          clase: 'paquete' as ClaseNodo,
        })),
        ...dominios.flatMap((d: Db) =>
          (d.items ?? []).map((it: Db, i: number) => ({
            // El id lleva el dominio dentro: el mismo asunto puede aparecer en
            // dos dominios —clasificarlo dos veces es un uso legítimo— y con id
            // por etiqueta los dos se fundirían.
            id: `${d.name}/${String(it.label ?? i)}`,
            nombre: String(it.label ?? ''),
            clase: 'nodo' as ClaseNodo,
            contenedor: String(d.name),
          })),
        ),
      ],
      aristas: (db.getTransitions?.() ?? []).map((t: Db) => ({
        origen: String(t.from),
        destino: String(t.to),
        etiqueta: t.label ? String(t.label) : undefined,
      })),
    };
  },
};

/** Tipos que este normalizador sabe leer. Se deriva de los adaptadores. */
export const SOPORTADOS_GRAFO: TipoDiagrama[] = Object.keys(ADAPTADORES) as TipoDiagrama[];

interface MermaidModulo {
  initialize: (c: Record<string, unknown>) => void;
  parse: (t: string) => Promise<unknown>;
  mermaidAPI: { getDiagramFromText: (t: string) => Promise<{ db: Db }> };
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

export async function normalizarGrafo(
  tipo: TipoDiagrama,
  codigo: string,
): Promise<ModeloDiagrama> {
  const adaptador = ADAPTADORES[tipo];
  if (!adaptador) {
    throw new Error(`El juez todavía no sabe leer diagramas de tipo "${tipo}" como grafo.`);
  }

  const m = await cargarMermaid();
  let db: Db;
  try {
    // `parse` valida Y registra el diagrama perezoso; sin él,
    // `getDiagramFromText` falla con "No diagram type detected".
    await m.parse(codigo);
    ({ db } = await m.mermaidAPI.getDiagramFromText(codigo));
  } catch (e) {
    throw new ErrorSintaxisDiagrama(limpiarError(e));
  }

  const crudo = adaptador(db);
  const modelo = modeloVacio(tipo, 'mermaid');

  const vistos = new Set<string>();
  for (const n of crudo.nodos) {
    // Un adaptador puede entregar el mismo elemento dos veces si el motor lo
    // lista en dos sitios; duplicarlo desviaría cualquier conteo.
    if (vistos.has(n.id)) continue;
    vistos.add(n.id);
    const nodo: Nodo = {
      id: n.id,
      nombre: n.nombre || n.id,
      clase: n.clase ?? 'nodo',
      atributos: n.atributos ?? [],
      operaciones: [],
      anotaciones: n.anotaciones ?? [],
      contenedor: n.contenedor,
    };
    modelo.nodos.push(nodo);
  }

  for (const a of crudo.aristas) {
    // Una arista hacia algo que no existe rompería los recorridos del catálogo.
    // Pasa, por ejemplo, con un `Rel(...)` de C4 que nombra un alias no
    // declarado: el motor lo dibuja igual, y el juez tiene que decidir.
    if (!vistos.has(a.origen) || !vistos.has(a.destino)) continue;
    const arista: Arista = { origen: a.origen, destino: a.destino, tipo: 'asociacion' };
    if (a.etiqueta) arista.etiqueta = a.etiqueta;
    modelo.aristas.push(arista);
  }

  if (!modelo.nodos.length) {
    throw new ErrorSintaxisDiagrama('El diagrama no tiene ningún elemento.');
  }
  return modelo;
}

/**
 * El error de Mermaid trae la traza del parser generado, que a un alumno no le
 * dice nada. Igual que en `normalizar-mermaid.ts`.
 */
function limpiarError(e: unknown): string {
  const texto = e instanceof Error ? e.message : String(e);
  const utiles = texto.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim()).slice(0, 3);
  return utiles.join(' ').slice(0, 300) || 'El diagrama no se pudo leer.';
}
