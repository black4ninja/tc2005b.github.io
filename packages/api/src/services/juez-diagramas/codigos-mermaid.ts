/**
 * ÚNICO fichero que conoce los códigos numéricos de Mermaid.
 *
 * El `db` interno de Mermaid no es API pública contractual: devuelve enteros sin
 * nombre para el tipo de mensaje y para el tipo de relación. Traducirlos aquí, y
 * solo aquí, es lo que permite que una actualización de Mermaid rompa UN fichero
 * y su test, en vez de filtrarse a todo el catálogo de aserciones.
 *
 * Las tablas NO están copiadas de la documentación: se obtuvieron parseando cada
 * forma de flecha con el Mermaid instalado y leyendo el código resultante. El
 * test `contrato-mermaid.test.ts` repite ese experimento y falla si cambian.
 */
import type { TipoArista, TipoMensaje } from './tipos.js';

// --- Secuencia -------------------------------------------------------------

/** `LINETYPE` de Mermaid → semántica UML del mensaje. */
const MENSAJE_POR_CODIGO: Record<number, TipoMensaje> = {
  0: 'sincrono',      // ->>   línea sólida con punta llena
  1: 'retorno',       // -->>  línea discontinua con punta
  3: 'destruccion',   // -x    línea sólida terminada en cruz
  4: 'destruccion',   // --x
  5: 'otro',          // ->    línea sólida SIN punta
  6: 'otro',          // -->   línea discontinua sin punta
  17: 'activacion',   // activate
  18: 'desactivacion',// deactivate
  24: 'asincrono',    // -)    punta abierta
  25: 'asincrono',    // --)
  33: 'sincrono',     // <<->>  bidireccional sólida
  34: 'retorno',      // <<-->> bidireccional discontinua
};

export function mensajeDesdeCodigo(codigo: number): TipoMensaje {
  return MENSAJE_POR_CODIGO[codigo] ?? 'otro';
}

/**
 * Sobre el error de síncrono contra asíncrono, que en un estudio afectó al 48 %
 * de los equipos: allí la causa era instrumental —la herramienta creaba los
 * mensajes como asíncronos por defecto—. **Mermaid no tiene ese defecto**: no
 * hay mensaje por omisión, cada flecha se escribe explícitamente y el alumno
 * elige su forma.
 *
 * El riesgo que sí queda es otro: `->>` es la flecha de los tutoriales y se
 * acaba usando también para las respuestas, que deberían ser `-->>`. Eso no se
 * advierte: se comprueba, y es justo lo que detecta la aserción
 * `mensajes-sincronos-con-retorno`.
 */

/**
 * Códigos que no son mensajes sino marcas de estructura (inicio de `alt`, de
 * `loop`, notas…). Se descartan al normalizar: no son interacción, y contarlos
 * como mensajes desordenaría cualquier aserción de orden.
 */
export function esMarcaEstructural(codigo: number): boolean {
  return (codigo >= 10 && codigo <= 16) || (codigo >= 19 && codigo <= 23) || codigo === 2 || codigo === 26;
}

// --- Clases ----------------------------------------------------------------

/** `relationType` de Mermaid. */
const AGREGACION = 0;
const EXTENSION = 1;
const COMPOSICION = 2;
const DEPENDENCIA = 3;

export interface RelacionCruda {
  id1: string;
  id2: string;
  relation: { type1: number | string; type2: number | string; lineType: number };
  relationTitle1?: string;
  relationTitle2?: string;
  title?: string;
}

/**
 * Traduce una relación de Mermaid a una arista con dirección NORMALIZADA POR
 * SIGNIFICADO.
 *
 * Mermaid guarda en `type1`/`type2` en qué EXTREMO va la decoración, no quién es
 * quién. `A <|-- B` deja `type1 = EXTENSION` sobre `id1 = A`, y eso significa que
 * el triángulo está en A: **A es el padre y B el hijo**. Como el catálogo
 * pregunta cosas como "¿B hereda de A?", aquí se decide de una vez la dirección
 * y las aserciones ya no tienen que razonar sobre extremos.
 *
 * Convenios de salida:
 *  - herencia / implementacion: origen = hijo, destino = padre.
 *  - composicion / agregacion:  origen = el todo, destino = la parte.
 *  - dependencia:               origen = quien depende, destino = de quién.
 * La línea discontinua (`lineType === 1`) sobre un triángulo distingue la
 * implementación de la herencia, igual que en UML.
 */
export function aristaDesdeRelacion(r: RelacionCruda): {
  origen: string;
  destino: string;
  tipo: TipoArista;
  cardinalidadOrigen?: string;
  cardinalidadDestino?: string;
  etiqueta?: string;
} {
  const punteada = r.relation.lineType === 1;
  const card1 = limpiarCardinalidad(r.relationTitle1);
  const card2 = limpiarCardinalidad(r.relationTitle2);
  const etiqueta = r.title || undefined;

  const enExtremo1 = typeof r.relation.type1 === 'number';
  const codigo = (enExtremo1 ? r.relation.type1 : r.relation.type2) as number;

  // Sin decoración en ningún extremo: asociación simple, sin dirección semántica.
  if (!enExtremo1 && typeof r.relation.type2 !== 'number') {
    return {
      origen: r.id1, destino: r.id2, tipo: 'asociacion',
      cardinalidadOrigen: card1, cardinalidadDestino: card2, etiqueta,
    };
  }

  // `decorado` es el extremo que lleva la marca; `otro` el contrario.
  const decorado = enExtremo1 ? r.id1 : r.id2;
  const otro = enExtremo1 ? r.id2 : r.id1;
  const cardDecorado = enExtremo1 ? card1 : card2;
  const cardOtro = enExtremo1 ? card2 : card1;

  switch (codigo) {
    case EXTENSION:
      // El triángulo señala al padre.
      return {
        origen: otro, destino: decorado,
        tipo: punteada ? 'implementacion' : 'herencia',
        cardinalidadOrigen: cardOtro, cardinalidadDestino: cardDecorado, etiqueta,
      };
    case COMPOSICION:
    case AGREGACION:
      // El rombo va en el TODO.
      return {
        origen: decorado, destino: otro,
        tipo: codigo === COMPOSICION ? 'composicion' : 'agregacion',
        cardinalidadOrigen: cardDecorado, cardinalidadDestino: cardOtro, etiqueta,
      };
    case DEPENDENCIA:
      // La punta señala de quién se depende.
      return {
        origen: otro, destino: decorado, tipo: 'dependencia',
        cardinalidadOrigen: cardOtro, cardinalidadDestino: cardDecorado, etiqueta,
      };
    default:
      return {
        origen: r.id1, destino: r.id2, tipo: 'asociacion',
        cardinalidadOrigen: card1, cardinalidadDestino: card2, etiqueta,
      };
  }
}

/** Mermaid usa la cadena `'none'` para "sin cardinalidad"; aquí es ausencia. */
function limpiarCardinalidad(v: string | undefined): string | undefined {
  if (!v || v === 'none') return undefined;
  return v.trim() || undefined;
}

// --- Estados ---------------------------------------------------------------

/**
 * Ids que Mermaid inventa para `[*]`. No son estados del modelo del alumno: son
 * el pseudoestado inicial y el final, y el catálogo los trata como tales.
 */
export const ESTADO_INICIAL_MERMAID = 'root_start';
export const ESTADO_FINAL_MERMAID = 'root_end';

// --- Entidad-relación ------------------------------------------------------

/** Nombres de cardinalidad de Mermaid → la notación que usa el resto del juez. */
const CARDINALIDAD_ER: Record<string, string> = {
  ONLY_ONE: '1',
  ZERO_OR_ONE: '0..1',
  ZERO_OR_MORE: '0..*',
  ONE_OR_MORE: '1..*',
};

export function cardinalidadDesdeEr(nombre: unknown): string | undefined {
  return typeof nombre === 'string' ? CARDINALIDAD_ER[nombre] : undefined;
}

/**
 * En las relaciones ER, Mermaid identifica las entidades como `entity-NOMBRE-N`,
 * no por su nombre. Aquí se devuelve el nombre, que es con lo que razona el
 * catálogo.
 *
 * El índice va al final y el prefijo delante, así que se recortan por separado
 * en lugar de partir por guiones: un nombre de entidad puede llevarlos.
 */
export function nombreEntidadEr(id: unknown): string {
  const s = String(id ?? '');
  return s.replace(/^entity-/, '').replace(/-\d+$/, '');
}

/**
 * OJO, y por eso está aislado aquí: `relSpec.cardA` es la cardinalidad del
 * extremo de **entityB**, y `cardB` la de **entityA**. Están cruzadas respecto a
 * los nombres, y leerlas de forma directa produce un modelo que dice justo lo
 * contrario del diagrama. Comprobado con `CLIENTE ||--o{ RESERVA`, que entrega
 * `cardA: ZERO_OR_MORE`.
 */
export function cardinalidadesDeRelacionEr(relSpec: unknown): {
  origen: string | undefined;
  destino: string | undefined;
} {
  const spec = (relSpec ?? {}) as { cardA?: unknown; cardB?: unknown };
  return {
    origen: cardinalidadDesdeEr(spec.cardB),
    destino: cardinalidadDesdeEr(spec.cardA),
  };
}

// --- Flujo -----------------------------------------------------------------

/**
 * Forma del nodo de un diagrama de flujo → su papel.
 *
 * Es lo que permite comprobar que una decisión esté dibujada como rombo: en un
 * diagrama de flujo la forma NO es decorativa, distingue un paso de una
 * bifurcación.
 */
const FORMA_FLUJO: Record<string, string> = {
  diamond: 'decision',
  stadium: 'inicio-fin',
  circle: 'inicio-fin',
  doublecircle: 'inicio-fin',
  square: 'proceso',
  round: 'proceso',
  rect: 'proceso',
  subroutine: 'subproceso',
  cylinder: 'almacen',
  hexagon: 'preparacion',
};

export function formaDesdeFlujo(tipo: unknown): string {
  return FORMA_FLUJO[String(tipo ?? '')] ?? 'proceso';
}
