/**
 * PlantUML → `ModeloDiagrama`, para casos de uso, componentes y paquetes.
 *
 * ALCANCE: esto es un parser del SUBCONJUNTO de PlantUML que se enseña en el
 * curso, no del lenguaje entero. Cubre los delimitadores, los comentarios, las
 * directivas de presentación más comunes, la declaración de actores, casos de
 * uso, componentes e interfaces, los contenedores con llaves (anidados) y las
 * relaciones con cardinalidad, etiqueta y estereotipo. Fuera de ese subconjunto
 * PUEDE DIVERGIR del PlantUML real: hay formas legítimas que aquí se ignoran y
 * otras que se rechazan como error de sintaxis. El render fiel del diagrama no
 * depende de este fichero —lo hace el navegador con el motor de verdad—, así que
 * la divergencia solo afecta a lo que el juez llega a ver.
 *
 * POR QUÉ UN PARSER PROPIO. El PlantUML oficial está compilado a JavaScript con
 * TeaVM y no se puede ejecutar en el servidor: muere en la fase de dibujo
 * pidiendo un contexto 2D de canvas y el `getBBox` de SVG, y simulando ambos
 * revienta dentro del puente de TeaVM. No expone una API de «solo parsear» que
 * se salte el dibujo, así que aquí no hay motor que consultar. Como el juez solo
 * necesita el MODELO —quién existe, de qué clase, y qué relación hay entre
 * quiénes— y no el dibujo, leer el subconjunto enseñado sale más barato y mucho
 * más predecible que pelearse con el puente.
 *
 * PRINCIPIO DE HONESTIDAD: una línea se ignora en silencio solo si es una
 * directiva conocida que no aporta modelo (color, título, tema, nota…).
 * Cualquier otra cosa que no se entienda es `ErrorSintaxisDiagrama` con el
 * número de línea. Un modelo silenciosamente incompleto es peor que un error
 * claro: haría fallar aserciones por algo que el alumno sí escribió, y el
 * mensaje culparía a su modelo cuando el culpable sería el parser.
 */
import { clave } from './nombres.js';
import {
  ErrorSintaxisDiagrama, modeloVacio,
  type ClaseNodo, type ModeloDiagrama, type Nodo, type TipoArista, type TipoDiagrama,
} from './tipos.js';

/** Tipos que este normalizador sabe traducir hoy. */
export const SOPORTADOS_PLANTUML: TipoDiagrama[] = ['casos-de-uso', 'componentes', 'paquetes'];

/**
 * Palabra clave de declaración → clase de nodo.
 *
 * Todos los contenedores (`package`, `rectangle`, `folder`, `node`, `frame`…)
 * caen en `paquete`: al juez le da igual la forma con la que PlantUML los
 * dibuja, lo que importa es que agrupan. La distinción visual es del render.
 */
const PALABRAS: Record<string, ClaseNodo> = {
  actor: 'actor',
  usecase: 'caso-de-uso',
  component: 'componente',
  interface: 'interfaz',
  package: 'paquete',
  rectangle: 'paquete',
  folder: 'paquete',
  node: 'paquete',
  frame: 'paquete',
  cloud: 'paquete',
  database: 'paquete',
  artifact: 'paquete',
  storage: 'paquete',
};

/** Clase por defecto de lo que se referencia sin haberlo declarado. */
const CLASE_IMPLICITA: Record<string, ClaseNodo> = {
  'casos-de-uso': 'caso-de-uso',
  componentes: 'componente',
  paquetes: 'paquete',
};

/**
 * Directivas de presentación: no aportan nada al modelo y se ignoran enteras.
 * La lista es explícita a propósito —y no un «si no lo entiendo, lo salto»—
 * para que una línea de modelo mal escrita no se cuele como si fuera decoración.
 */
const DIRECTIVAS_EXACTAS = new Set([
  'left to right direction',
  'top to bottom direction',
  'allow_mixing',
  'allowmixing',
  'autonumber',
]);

const DIRECTIVAS_PREFIJO = [
  'skinparam', 'title', 'caption', 'header', 'footer',
  'hide', 'show', 'scale', 'style', 'sprite', 'mainframe', 'newpage', 'page',
  'end legend', 'end title', 'end header', 'end footer', 'end note', 'end box',
];

/**
 * Bloques de texto libre que se saltan hasta su terminador. Dentro va prosa del
 * alumno, no modelo, y parsearla daría errores falsos.
 */
const BLOQUES: Array<[RegExp, string]> = [
  [/^note\b/i, 'end note'],
  [/^legend\b/i, 'end legend'],
  [/^title$/i, 'end title'],
  [/^header$/i, 'end header'],
  [/^footer$/i, 'end footer'],
];

// --- Gramática del subconjunto ---------------------------------------------

/**
 * Un extremo de relación, o el nombre de una declaración. Las cuatro formas con
 * delimitador (`"…"`, `(…)`, `[…]`, `:…:`) admiten espacios; la desnuda no,
 * igual que en PlantUML.
 */
const EXTREMO = String.raw`(?:"[^"]*"|\([^)]*\)|\[[^\]]*\]|:[^:]+:|[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*)`;

/**
 * Una flecha: cualquier número de guiones o puntos, con punta opcional en uno u
 * otro extremo y con los adornos que PlantUML admite en medio (`-[#red]->`,
 * `-down->`). El número de guiones solo controla la longitud del dibujo, así que
 * `-->` y `----->` son exactamente la misma relación.
 */
const FLECHA = String.raw`(?:<\|?|<)?[-.]+(?:\[[^\]]*\])?(?:up|down|left|right|u|d|l|r)?[-.]*(?:\|?>)?`;

/** `A "1" --> "0..*" B : etiqueta`, con cardinalidades y etiqueta opcionales. */
const RELACION = new RegExp(
  `^(${EXTREMO})\\s*(?:"([^"]*)"\\s*)?(${FLECHA})\\s*(?:"([^"]*)"\\s*)?(${EXTREMO})\\s*(?::\\s*(.*))?$`,
);

/**
 * ¿La línea PARECE una relación aunque no case con la gramática? Solo se usa en
 * la rama de error, para decirle al alumno qué se estaba intentando leer.
 */
const PARECE_RELACION = /-{2,}|\.{2,}|->|<-|\.>|<\./;

/** `<<include>>`, `<<extend>>` o `<<extends>>` dentro de la etiqueta. */
const ESTEREOTIPO_RELACION = /<<\s*(include|extends?)\s*>>/i;

/** Cualquier estereotipo de una declaración, para llevarlo a `anotaciones`. */
const ESTEREOTIPO = /<<([^>]*)>>/g;

/** Una declaración: nombre y, opcionalmente, alias tras `as`. */
const DECLARACION = new RegExp(`^(${EXTREMO})(?:\\s+as\\s+(${EXTREMO}))?$`, 'i');

// --- Utilidades ------------------------------------------------------------

function error(linea: number, mensaje: string): ErrorSintaxisDiagrama {
  return new ErrorSintaxisDiagrama(`Línea ${linea}: ${mensaje}`);
}

/** Espacios colapsados; de aquí sale el id de un nodo sin alias. */
function normalizarTexto(t: string): string {
  return t.trim().replace(/\s+/g, ' ');
}

interface Referencia {
  nombre: string;
  /** Clase impuesta por la FORMA del token: `[X]`, `(X)`, `:X:`. */
  clase?: ClaseNodo;
}

/**
 * Interpreta un token de nombre. La forma manda sobre el tipo de diagrama: en un
 * diagrama de casos de uso, `[Repositorio]` sigue siendo un componente, que es
 * justo lo que el alumno quiso dibujar.
 */
function interpretarToken(token: string): Referencia {
  const t = token.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    return { nombre: normalizarTexto(t.slice(1, -1)) };
  }
  if (t.startsWith('(') && t.endsWith(')')) {
    return { nombre: normalizarTexto(t.slice(1, -1)), clase: 'caso-de-uso' };
  }
  if (t.startsWith('[') && t.endsWith(']')) {
    return { nombre: normalizarTexto(t.slice(1, -1)), clase: 'componente' };
  }
  if (t.length > 2 && t.startsWith(':') && t.endsWith(':')) {
    return { nombre: normalizarTexto(t.slice(1, -1)), clase: 'actor' };
  }
  return { nombre: normalizarTexto(t) };
}

/** Quita las comillas de un alias (`as "RH"`). */
function desentrecomillar(t: string): string {
  const s = t.trim();
  return s.length >= 2 && s.startsWith('"') && s.endsWith('"')
    ? normalizarTexto(s.slice(1, -1))
    : normalizarTexto(s);
}

/** Separa los estereotipos del resto de la declaración. */
function extraerEstereotipos(resto: string): { limpio: string; anotaciones: string[] } {
  const anotaciones: string[] = [];
  const limpio = resto.replace(ESTEREOTIPO, (_todo: string, dentro: string) => {
    const a = dentro.trim();
    if (a) anotaciones.push(a);
    return ' ';
  });
  return { limpio, anotaciones };
}

/**
 * Quita los colores (`#LightBlue`, `#line:red;back:blue`). Van pegados a la
 * declaración y no dicen nada del modelo. Se exige espacio antes de la
 * almohadilla para no destrozar un nombre entrecomillado que la contenga.
 */
function quitarColores(resto: string): string {
  return resto.replace(/(^|\s)#\S+/g, ' ');
}

function esDirectiva(minuscula: string): boolean {
  if (DIRECTIVAS_EXACTAS.has(minuscula)) return true;
  return DIRECTIVAS_PREFIJO.some((p) => minuscula === p || minuscula.startsWith(`${p} `));
}

function saldoDeLlaves(linea: string): number {
  let n = 0;
  for (const c of linea) {
    if (c === '{') n++;
    if (c === '}') n--;
  }
  return n;
}

// --- Normalizador ----------------------------------------------------------

export function normalizarPlantuml(tipo: TipoDiagrama, codigo: string): ModeloDiagrama {
  if (!SOPORTADOS_PLANTUML.includes(tipo)) {
    throw new Error(`El juez todavía no sabe leer diagramas de tipo "${tipo}" en PlantUML.`);
  }

  const modelo = modeloVacio(tipo, 'plantuml');
  const claseImplicita = CLASE_IMPLICITA[tipo];
  // Una línea sin punta entre un actor y un caso de uso es la asociación de
  // participación de UML; en componentes o paquetes es una asociación a secas.
  const tipoSinPunta: TipoArista = tipo === 'casos-de-uso' ? 'participa' : 'asociacion';

  /**
   * Índice de nodos por `clave()` del alias Y del nombre visible. El alumno
   * declara `usecase "Reservar sala" as UC1` y luego escribe `UC1 --> …` o
   * `(Reservar sala) --> …`: las dos formas tienen que caer en el mismo nodo, o
   * el modelo acabaría con dos casos de uso donde hay uno.
   */
  const indice = new Map<string, Nodo>();
  /** Nodos nacidos de una referencia; una declaración posterior los completa. */
  const implicitos = new Set<Nodo>();

  function registrar(nodo: Nodo, ...nombres: Array<string | undefined>): void {
    for (const n of nombres) {
      const k = n === undefined ? '' : clave(n);
      if (k) indice.set(k, nodo);
    }
  }

  function buscar(...nombres: Array<string | undefined>): Nodo | undefined {
    for (const n of nombres) {
      const k = n === undefined ? '' : clave(n);
      if (k) {
        const nodo = indice.get(k);
        if (nodo) return nodo;
      }
    }
    return undefined;
  }

  function declarar(
    ref: Referencia,
    alias: string | undefined,
    clase: ClaseNodo,
    anotaciones: string[],
    contenedor: string | undefined,
  ): Nodo {
    const existente = buscar(alias, ref.nombre);
    if (existente) {
      // Ya estaba, sea por una referencia previa o por una declaración repetida.
      // Se COMPLETA en vez de duplicarse: la declaración es la fuente buena del
      // nombre visible y de la clase.
      existente.nombre = ref.nombre;
      existente.clase = clase;
      if (contenedor !== undefined) existente.contenedor = contenedor;
      for (const a of anotaciones) {
        if (!existente.anotaciones.includes(a)) existente.anotaciones.push(a);
      }
      implicitos.delete(existente);
      registrar(existente, alias, ref.nombre);
      return existente;
    }

    const nodo: Nodo = {
      id: normalizarTexto(alias ? alias : ref.nombre),
      nombre: ref.nombre,
      clase,
      atributos: [],
      operaciones: [],
      anotaciones,
      contenedor,
    };
    modelo.nodos.push(nodo);
    registrar(nodo, alias, ref.nombre);
    return nodo;
  }

  /**
   * Resuelve un extremo de relación, creándolo si hace falta. PlantUML no exige
   * declarar antes de relacionar —`Alumno --> (Reservar)` dibuja los dos— y el
   * alumno escribe justo eso, así que negarse aquí sería inventar un error que
   * el motor real no da.
   */
  function referenciar(ref: Referencia, contenedor: string | undefined): Nodo {
    const existente = buscar(ref.nombre);
    if (existente) {
      // La forma del token puede precisar la clase de algo que se creó a ciegas:
      // `A --> B` seguido de `[B] --> C` deja a B como componente.
      if (ref.clase && implicitos.has(existente)) existente.clase = ref.clase;
      return existente;
    }
    const nodo: Nodo = {
      id: normalizarTexto(ref.nombre),
      nombre: ref.nombre,
      clase: ref.clase ?? claseImplicita,
      atributos: [],
      operaciones: [],
      anotaciones: [],
      contenedor,
    };
    modelo.nodos.push(nodo);
    registrar(nodo, ref.nombre);
    implicitos.add(nodo);
    return nodo;
  }

  // --- Estado del recorrido ------------------------------------------------

  /** Ids de los contenedores abiertos; `''` es «el mismo de fuera» (`together`). */
  const pila: string[] = [];
  let abierto = false;
  let cerrado = false;
  /** Terminador del bloque de texto libre que se está saltando, si lo hay. */
  let terminador: string | null = null;
  /** Llaves pendientes de un bloque ignorado (`skinparam foo { … }`). */
  let llavesIgnoradas = 0;
  let dentroDeComentario = false;

  function contenedorActual(): string | undefined {
    for (let i = pila.length - 1; i >= 0; i--) {
      if (pila[i]) return pila[i];
    }
    return undefined;
  }

  function declararLinea(n: number, texto: string, abreBloque: boolean): Nodo {
    const { limpio, anotaciones } = extraerEstereotipos(quitarColores(texto));
    const cuerpo = normalizarTexto(limpio);
    if (!cuerpo) throw error(n, 'hay una declaración sin nombre.');

    const primera = cuerpo.split(/\s+/)[0].toLowerCase();
    const conPalabra = Object.prototype.hasOwnProperty.call(PALABRAS, primera);
    const resto = conPalabra ? cuerpo.slice(primera.length).trim() : cuerpo;

    if (conPalabra && !resto) {
      throw error(n, `«${primera}» no dice qué se está declarando: falta el nombre.`);
    }

    const partes = DECLARACION.exec(resto);
    if (!partes) {
      throw error(
        n,
        abreBloque
          ? `no entiendo qué bloque abre «${texto}».`
          : `no entiendo la declaración «${texto}».`,
      );
    }

    const [, tokenNombre, tokenAlias] = partes;
    const ref = interpretarToken(tokenNombre);
    let alias = tokenAlias === undefined ? undefined : desentrecomillar(tokenAlias);

    // `actor A as "Nombre largo"`: cuando el entrecomillado es el SEGUNDO token,
    // el visible es ese y el alias es el primero. PlantUML admite los dos
    // órdenes y en clase se ven ambos.
    if (tokenAlias !== undefined && tokenAlias.trim().startsWith('"') && !tokenNombre.startsWith('"')) {
      alias = ref.nombre;
      ref.nombre = desentrecomillar(tokenAlias);
    }

    if (!ref.nombre) throw error(n, 'hay una declaración con el nombre vacío.');

    // Sin palabra clave, la clase sale de la forma del token; si tampoco la hay,
    // solo puede ser un contenedor abriendo bloque, o algo que no entendemos.
    const clase = conPalabra
      ? PALABRAS[primera]
      : ref.clase ?? (abreBloque ? 'paquete' : undefined);
    if (!clase) {
      throw error(
        n,
        `no entiendo la declaración «${texto}»: falta la palabra clave (actor, usecase, component, package…) o los delimitadores.`,
      );
    }

    return declarar(ref, alias, clase, anotaciones, contenedorActual());
  }

  function registrarRelacion(
    izq: string,
    cardIzq: string | undefined,
    flecha: string,
    cardDer: string | undefined,
    der: string,
    etiquetaCruda: string | undefined,
  ): void {
    const contenedor = contenedorActual();
    const a = referenciar(interpretarToken(izq), contenedor);
    const b = referenciar(interpretarToken(der), contenedor);

    const etiqueta = etiquetaCruda?.trim() ?? '';
    const estereotipo = ESTEREOTIPO_RELACION.exec(etiqueta);
    // El estereotipo YA es el tipo de la arista; dejarlo además en la etiqueta
    // guardaría la misma información en dos sitios que podrían contradecirse.
    const restoEtiqueta = normalizarTexto(etiqueta.replace(ESTEREOTIPO_RELACION, ' '));

    const puntaDerecha = flecha.includes('>');
    const puntaIzquierda = flecha.startsWith('<');
    // `A <-- B` significa lo mismo que `B --> A`: la dirección se normaliza aquí
    // para que el catálogo nunca tenga que saber cómo se escribió la flecha.
    const invertida = puntaIzquierda && !puntaDerecha;

    let tipoArista: TipoArista;
    if (estereotipo) {
      tipoArista = estereotipo[1].toLowerCase() === 'include' ? 'incluye' : 'extiende';
    } else if (puntaDerecha || puntaIzquierda) {
      // La punta es lo que distingue una dependencia de una asociación; que la
      // línea sea continua o punteada solo cambia el dibujo.
      tipoArista = 'dependencia';
    } else {
      tipoArista = tipoSinPunta;
    }

    modelo.aristas.push({
      origen: invertida ? b.id : a.id,
      destino: invertida ? a.id : b.id,
      tipo: tipoArista,
      etiqueta: restoEtiqueta || undefined,
      cardinalidadOrigen: (invertida ? cardDer : cardIzq)?.trim() || undefined,
      cardinalidadDestino: (invertida ? cardIzq : cardDer)?.trim() || undefined,
    });
  }

  // --- Recorrido de líneas -------------------------------------------------

  const lineas = codigo.split(/\r?\n/);

  for (let i = 0; i < lineas.length; i++) {
    const n = i + 1;
    const linea = lineas[i].trim();
    if (!linea) continue;

    // Comentario de bloque `/' … '/`.
    if (dentroDeComentario) {
      if (linea.includes("'/")) dentroDeComentario = false;
      continue;
    }
    if (linea.startsWith("/'")) {
      if (!linea.includes("'/", 2)) dentroDeComentario = true;
      continue;
    }
    // Comentario de línea.
    if (linea.startsWith("'")) continue;

    const minuscula = linea.toLowerCase();

    // Texto libre (notas, leyendas): se salta hasta su terminador. Si aparece el
    // fin del diagrama antes que el terminador, el bloque quedó abierto y hay
    // que decirlo: si no, el error saldría luego como «falta @enduml», que
    // señalaría al sitio equivocado.
    if (terminador) {
      if (minuscula.startsWith('@enduml')) {
        throw error(n, `falta «${terminador}» para cerrar el bloque de texto anterior.`);
      }
      if (minuscula === terminador) terminador = null;
      continue;
    }

    // Bloque ignorado con llaves: solo se cuentan las llaves.
    if (llavesIgnoradas > 0) {
      llavesIgnoradas += saldoDeLlaves(linea);
      continue;
    }

    if (minuscula.startsWith('@startuml')) {
      if (abierto || cerrado) {
        throw error(n, 'hay más de un @startuml; el juez evalúa un solo diagrama.');
      }
      abierto = true;
      continue;
    }
    if (minuscula.startsWith('@enduml')) {
      if (!abierto) throw error(n, 'aparece @enduml sin un @startuml que lo abra.');
      if (pila.length) {
        throw error(n, `quedan ${pila.length} bloque(s) sin cerrar: falta alguna «}».`);
      }
      abierto = false;
      cerrado = true;
      continue;
    }
    if (!abierto) {
      throw cerrado
        ? error(n, 'hay contenido después de @enduml.')
        : error(n, 'el diagrama tiene que empezar con @startuml.');
    }

    // Cierre de contenedor.
    if (linea === '}') {
      if (!pila.length) throw error(n, 'hay una «}» que no cierra ningún bloque.');
      pila.pop();
      continue;
    }

    // Bloques de texto libre, antes que las directivas: `legend` abre bloque y
    // `title Mi diagrama` no.
    const bloque = BLOQUES.find(([re]) => re.test(linea));
    if (bloque) {
      // `note left of A : texto` y `note "texto" as N1` caben en una línea y no
      // abren nada; `note as N1` sí abre, y por eso el criterio es el texto
      // inline (tras dos puntos o entrecomillado), no la presencia del alias.
      if (!linea.includes(':') && !linea.includes('"')) terminador = bloque[1];
      continue;
    }

    // Directivas de presentación y del preprocesador (`!theme`, `!include`…).
    if (esDirectiva(minuscula)) {
      if (linea.endsWith('{')) llavesIgnoradas = 1;
      continue;
    }
    if (linea.startsWith('!')) continue;

    // Relación. Se prueba ANTES que la declaración: una declaración nunca lleva
    // flecha, pero un extremo de relación sí puede parecer una declaración.
    const rel = RELACION.exec(linea);
    if (rel) {
      registrarRelacion(rel[1], rel[2], rel[3], rel[4], rel[5], rel[6]);
      continue;
    }
    if (PARECE_RELACION.test(linea)) {
      throw error(n, `«${linea}» parece una relación, pero no entiendo sus extremos o su flecha.`);
    }

    // Apertura de contenedor: `package "Datos" {`.
    if (linea.endsWith('{')) {
      const cuerpo = linea.slice(0, -1).trim();
      if (cuerpo.toLowerCase() === 'together') {
        // `together` agrupa solo para el dibujo; no es un elemento del modelo,
        // así que lo de dentro conserva el contenedor de fuera.
        pila.push('');
        continue;
      }
      pila.push(declararLinea(n, cuerpo, true).id);
      continue;
    }

    // Declaración suelta.
    declararLinea(n, linea, false);
  }

  if (dentroDeComentario) {
    throw new ErrorSintaxisDiagrama("El comentario de bloque abierto con /' no se cierra.");
  }
  if (terminador) {
    throw new ErrorSintaxisDiagrama(`Falta «${terminador}» para cerrar el bloque de texto.`);
  }
  if (!abierto && !cerrado) {
    throw new ErrorSintaxisDiagrama('El diagrama tiene que ir entre @startuml y @enduml.');
  }
  if (abierto) {
    throw new ErrorSintaxisDiagrama('Falta @enduml al final del diagrama.');
  }

  return modelo;
}
