/**
 * Mermaid → `ModeloDiagrama`.
 *
 * Mermaid parsea en Node sin navegador (ver `entorno-dom.ts`) y expone el modelo
 * ya construido por `mermaidAPI.getDiagramFromText`. Aquí se traduce a nuestro
 * modelo normalizado y se le quitan todos los detalles del motor: códigos
 * numéricos, ids inventados para `[*]`, Maps en vez de arrays.
 *
 * Las llamadas se SERIALIZAN con un semáforo de cupo 1. `mermaid.initialize` es
 * global y el registro de diagramas es perezoso: dos evaluaciones simultáneas de
 * tipos distintos podrían pisarse durante el registro. Serializar cuesta
 * milisegundos —no hay compilación de por medio— y elimina la clase entera de
 * fallos intermitentes.
 */
import { Semaforo } from '../judge/cola.js';
import { instalarDom } from './entorno-dom.js';
import {
  aristaDesdeRelacion, esMarcaEstructural, mensajeDesdeCodigo,
  ESTADO_FINAL_MERMAID, ESTADO_INICIAL_MERMAID, type RelacionCruda,
} from './codigos-mermaid.js';
import {
  ErrorSintaxisDiagrama, modeloVacio,
  type Miembro, type ModeloDiagrama, type Nodo, type TipoDiagrama,
} from './tipos.js';

const cola = new Semaforo(1);

/** Tipos que este normalizador sabe traducir hoy. */
const SOPORTADOS: TipoDiagrama[] = ['clases', 'secuencia', 'estados'];

type MermaidModulo = {
  initialize: (config: Record<string, unknown>) => void;
  parse: (texto: string) => Promise<unknown>;
  mermaidAPI: { getDiagramFromText: (texto: string) => Promise<{ type: string; db: any }> };
};

let mermaid: MermaidModulo | null = null;

async function cargarMermaid(): Promise<MermaidModulo> {
  if (mermaid) return mermaid;
  instalarDom();
  const modulo = (await import('mermaid')).default as unknown as MermaidModulo;
  // `securityLevel: 'strict'` escapa el HTML de las etiquetas: estos diagramas
  // los escriben alumnos y su texto acaba en el modelo.
  modulo.initialize({ startOnLoad: false, securityLevel: 'strict' });
  mermaid = modulo;
  return modulo;
}

/** Un Map o un objeto plano, según el tipo de diagrama; devuelve sus valores. */
function valores<T>(x: Map<string, T> | Record<string, T> | undefined): T[] {
  if (!x) return [];
  return x instanceof Map ? [...x.values()] : Object.values(x);
}

export async function normalizarMermaid(
  tipo: TipoDiagrama,
  codigo: string,
): Promise<ModeloDiagrama> {
  if (!SOPORTADOS.includes(tipo)) {
    throw new Error(`El juez todavía no sabe leer diagramas de tipo "${tipo}" en Mermaid.`);
  }

  return cola.ejecutar(async () => {
    const m = await cargarMermaid();

    let diagrama: { type: string; db: any };
    try {
      // `parse` valida Y registra el diagrama perezoso; sin él,
      // `getDiagramFromText` falla con "No diagram type detected".
      await m.parse(codigo);
      diagrama = await m.mermaidAPI.getDiagramFromText(codigo);
    } catch (e) {
      throw new ErrorSintaxisDiagrama(limpiarError(e));
    }

    switch (tipo) {
      case 'clases': return deClases(diagrama.db);
      case 'secuencia': return deSecuencia(diagrama.db);
      case 'estados': return deEstados(diagrama.db);
      default: throw new Error(`Tipo no soportado: ${tipo}`);
    }
  });
}

/**
 * El error de Mermaid trae la traza del parser generado, que a un alumno no le
 * dice nada. Se conserva la primera línea —que sí lleva "Parse error on line N"—
 * y la línea del cursor, que señala la columna.
 */
function limpiarError(e: unknown): string {
  const texto = e instanceof Error ? e.message : String(e);
  const lineas = texto.split('\n').map((l) => l.trimEnd()).filter(Boolean);
  return lineas.slice(0, 3).join('\n') || 'El diagrama no se pudo interpretar.';
}

// --- Clases ----------------------------------------------------------------

/**
 * Mermaid entrega los miembros con el tipo PEGADO al nombre en `id`
 * (`"String nombre"`), porque así se escriben en su sintaxis. El catálogo
 * pregunta por el nombre a secas, así que aquí se separan.
 */
function miembroDeAtributo(m: any): Miembro {
  const crudo = String(m.id ?? '').trim();
  const partes = crudo.split(/\s+/);
  // Con dos o más piezas, la ÚLTIMA es el nombre y lo anterior el tipo:
  // `String nombre` → tipo String, nombre nombre.
  const nombre = partes.length > 1 ? partes[partes.length - 1] : crudo;
  const tipo = partes.length > 1 ? partes.slice(0, -1).join(' ') : undefined;
  return { nombre, tipo, visibilidad: normalizarVisibilidad(m.visibility) };
}

function miembroDeOperacion(m: any): Miembro {
  return {
    nombre: String(m.id ?? '').trim(),
    tipo: limpiarGenericos(m.returnType),
    parametros: typeof m.parameters === 'string' ? m.parameters.trim() : undefined,
    visibilidad: normalizarVisibilidad(m.visibility),
  };
}

/**
 * Mermaid escribe los genéricos como `List~Item~` porque `<` rompería su
 * sintaxis; en UML se escriben `List<Item>`. Se traducen por pares: la tilde
 * impar abre y la par cierra.
 */
function limpiarGenericos(v: unknown): string | undefined {
  if (typeof v !== 'string' || !v.trim()) return undefined;
  let abierto = false;
  let salida = '';
  for (const caracter of v.trim()) {
    if (caracter !== '~') { salida += caracter; continue; }
    salida += abierto ? '>' : '<';
    abierto = !abierto;
  }
  return salida;
}

function normalizarVisibilidad(v: unknown): Miembro['visibilidad'] {
  return v === '+' || v === '-' || v === '#' || v === '~' ? v : undefined;
}

function deClases(db: any): ModeloDiagrama {
  const modelo = modeloVacio('clases', 'mermaid');

  for (const c of valores<any>(db.getClasses?.())) {
    const anotaciones = (c.annotations ?? []).map((a: unknown) => String(a));
    modelo.nodos.push({
      id: String(c.id),
      nombre: String(c.label ?? c.id),
      // Una clase anotada como interfaz ES una interfaz: el catálogo pregunta
      // por la clase de nodo, no por el estereotipo crudo.
      clase: anotaciones.includes('interface') ? 'interfaz' : 'clase',
      atributos: (c.members ?? []).map(miembroDeAtributo),
      operaciones: (c.methods ?? []).map(miembroDeOperacion),
      anotaciones,
    });
  }

  for (const r of (db.getRelations?.() ?? []) as RelacionCruda[]) {
    modelo.aristas.push(aristaDesdeRelacion(r));
  }

  return modelo;
}

// --- Secuencia -------------------------------------------------------------

function deSecuencia(db: any): ModeloDiagrama {
  const modelo = modeloVacio('secuencia', 'mermaid');

  const actores = db.getActors?.();
  const entradas: Array<[string, any]> = actores instanceof Map
    ? [...actores.entries()]
    : Object.entries(actores ?? {});

  for (const [id, a] of entradas) {
    // `description` es el alias visible (`participant VM as ViewModel`); cuando
    // no hay alias, Mermaid lo rellena con el propio id. Es justo el dato que
    // necesita la aserción de líneas de vida bien nombradas.
    modelo.nodos.push({
      id: String(id),
      nombre: String(a?.description ?? a?.name ?? id),
      clase: a?.type === 'actor' ? 'actor' : 'participante',
      atributos: [], operaciones: [], anotaciones: [],
    });
  }

  let orden = 0;
  for (const m of (db.getMessages?.() ?? []) as any[]) {
    const codigo = Number(m.type);
    if (esMarcaEstructural(codigo)) continue;
    modelo.mensajes.push({
      orden: ++orden,
      de: String(m.from ?? ''),
      a: m.to === undefined || m.to === null ? undefined : String(m.to),
      texto: String(m.message ?? '').trim(),
      tipo: mensajeDesdeCodigo(codigo),
    });
  }

  return modelo;
}

// --- Estados ---------------------------------------------------------------

function deEstados(db: any): ModeloDiagrama {
  const modelo = modeloVacio('estados', 'mermaid');

  for (const s of valores<any>(db.getStates?.())) {
    const id = String(s.id);
    const esInicial = id === ESTADO_INICIAL_MERMAID;
    const esFinal = id === ESTADO_FINAL_MERMAID;
    const pseudo = esInicial || esFinal || (s.type && s.type !== 'default');
    modelo.nodos.push({
      id,
      nombre: esInicial ? 'inicio' : esFinal ? 'fin' : String(s.description ?? s.id),
      clase: pseudo ? 'pseudoestado' : 'estado',
      papel: esInicial ? 'inicial' : esFinal ? 'final' : (s.type && s.type !== 'default' ? String(s.type) : undefined),
      atributos: [], operaciones: [], anotaciones: [],
    });
  }

  for (const r of (db.getRelations?.() ?? []) as any[]) {
    modelo.aristas.push({
      origen: String(r.id1),
      destino: String(r.id2),
      tipo: 'transicion',
      etiqueta: String(r.relationTitle ?? '').trim() || undefined,
    });
  }

  return modelo;
}
