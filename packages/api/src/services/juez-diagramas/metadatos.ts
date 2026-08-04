/**
 * Descripción de datos del CATALOGO, para que el editor de admin construya
 * aserciones sin que el autor escriba JSON a mano.
 *
 * Este fichero es deliberadamente el ÚNICO lugar donde el catálogo se describe
 * como formulario. `catalogo.ts` sabe evaluar y `describir.ts` sabe redactar,
 * pero ninguno de los dos sabe qué widget mostrar ni qué diagramas ofrecer una
 * comprobación dada; mezclar esa responsabilidad ahí obligaría al editor a
 * importar lógica de evaluación solo para dibujar un formulario. Aquí solo hay
 * datos: nada de este fichero decide si una aserción pasa o falla.
 *
 * Los parámetros de cada entrada se derivaron LEYENDO el evaluador correspondiente
 * en `catalogo.ts`: `texto(a, clave)` es un campo de texto requerido,
 * `textoOpcional(a, clave)` el mismo campo pero opcional, `lista(a, clave)` una
 * lista de texto (siempre opcional, porque `lista()` cae a `[]` cuando falta),
 * y `numeroOpcional(a, clave)` un número opcional. Cuando el evaluador exige la
 * lista con una comprobación manual (como `orden-de-mensajes`, que lanza si la
 * lista viene vacía), el campo se marca requerido pese a leerse con `lista()`.
 */
import type { ClaseNodo, TipoArista, TipoDiagrama, TipoMensaje } from './tipos.js';
import { TIPOS_DIAGRAMA } from './tipos.js';

export type TipoCampo = 'texto' | 'numero' | 'lista-texto' | 'opcion';

export interface CampoParametro {
  nombre: string;
  etiqueta: string;
  tipo: TipoCampo;
  requerido: boolean;
  /** Solo para tipo 'opcion': valores admitidos. */
  opciones?: string[];
  /** Ayuda breve para el autor. Opcional, solo cuando aporte algo. */
  ayuda?: string;
}

export interface MetadatoAsercion {
  tipo: string;
  etiqueta: string;
  familia: 'lexica' | 'semantica' | 'cruzada';
  /** Tipos de diagrama en los que tiene sentido ofrecerla. */
  aplicaA: TipoDiagrama[];
  parametros: CampoParametro[];
  /** Qué comprueba y por qué importa. Una o dos frases. */
  descripcion: string;
}

// ---------------------------------------------------------------------------
// Vocabularios cerrados usados por varios campos de tipo 'opcion'.
//
// `tipos.ts` no exporta estos como arreglos en tiempo de ejecución porque son
// tipos, no valores: son solo alias de unión. Se listan aquí a mano, tipados
// contra el alias correspondiente, para que un valor mal escrito no compile.
// No hay comprobación de que la lista esté COMPLETA (TypeScript no obliga
// exhaustividad de un `X[]` contra la unión `X`), así que si `tipos.ts` gana un
// miembro nuevo hay que añadirlo aquí también.
// ---------------------------------------------------------------------------

const CLASES_NODO: ClaseNodo[] = [
  'clase', 'interfaz', 'participante', 'actor', 'estado', 'pseudoestado',
  'entidad', 'caso-de-uso', 'componente', 'paquete', 'nodo',
];

const TIPOS_ARISTA: TipoArista[] = [
  'asociacion', 'agregacion', 'composicion', 'herencia', 'implementacion',
  'dependencia', 'transicion', 'flujo', 'incluye', 'extiende', 'participa',
  'relacion-er',
];

const TIPOS_MENSAJE: TipoMensaje[] = [
  'sincrono', 'asincrono', 'retorno', 'destruccion', 'activacion', 'desactivacion', 'otro',
];

/** Visibilidad UML, tal como la declara `Miembro['visibilidad']` en `tipos.ts`. */
const VISIBILIDADES: Array<'+' | '-' | '#' | '~'> = ['+', '-', '#', '~'];

// ---------------------------------------------------------------------------
// Catálogo de metadatos.
//
// El orden y el agrupamiento siguen exactamente al de `CATALOGO` en
// `catalogo.ts` (comunes, clases, secuencia, estados, cruzadas) para que
// comparar ambos ficheros lado a lado sea directo.
// ---------------------------------------------------------------------------

export const METADATOS: MetadatoAsercion[] = [
  // --- Comunes ---------------------------------------------------------------
  {
    tipo: 'existe-nodo',
    etiqueta: 'Existe un elemento',
    familia: 'semantica',
    // Genérica por diseño: cualquier tipo de diagrama tiene nodos, y el autor
    // decide con el parámetro «clase» qué clase de nodo espera.
    aplicaA: TIPOS_DIAGRAMA,
    parametros: [
      { nombre: 'nombre', etiqueta: 'Nombre del elemento', tipo: 'texto', requerido: true },
      {
        nombre: 'clase', etiqueta: 'Clase esperada', tipo: 'opcion', requerido: false,
        opciones: CLASES_NODO,
        ayuda: 'Si se omite, solo se comprueba el nombre, sin importar de qué clase de elemento se trate.',
      },
    ],
    descripcion: 'Comprueba que el diagrama declare un elemento con el nombre indicado y, opcionalmente, que sea de la clase esperada.',
  },
  {
    tipo: 'conteo-nodos',
    etiqueta: 'Cantidad de elementos',
    familia: 'semantica',
    aplicaA: TIPOS_DIAGRAMA,
    parametros: [
      {
        nombre: 'clase', etiqueta: 'Clase a contar', tipo: 'opcion', requerido: false,
        opciones: CLASES_NODO,
        ayuda: 'Si se omite, cuenta todos los elementos del diagrama sin distinguir su clase.',
      },
      { nombre: 'min', etiqueta: 'Mínimo', tipo: 'numero', requerido: false },
      { nombre: 'max', etiqueta: 'Máximo', tipo: 'numero', requerido: false },
    ],
    descripcion: 'Comprueba que el número de elementos, opcionalmente filtrados por clase, quede dentro del rango declarado.',
  },
  {
    tipo: 'sin-nombres-vagos',
    etiqueta: 'Sin nombres vagos',
    familia: 'lexica',
    // El criterio de nombre vago (nombres.ts) es transversal a las ocho notaciones.
    aplicaA: TIPOS_DIAGRAMA,
    parametros: [
      {
        nombre: 'extra', etiqueta: 'Palabras vagas adicionales', tipo: 'lista-texto', requerido: false,
        ayuda: 'Se suman a la lista interna del juez (por ejemplo «cosa», «objeto», «temp»).',
      },
    ],
    descripcion: 'Comprueba que ningún elemento del diagrama use un nombre genérico que no diga qué modela.',
  },

  // --- Clases ------------------------------------------------------------
  {
    tipo: 'clase-tiene-atributo',
    etiqueta: 'La clase declara un atributo',
    familia: 'semantica',
    // Los atributos son propios de clases; en ER equivalen a los atributos de
    // una entidad, así que la comprobación se reutiliza también ahí.
    aplicaA: ['clases', 'er'],
    parametros: [
      { nombre: 'clase', etiqueta: 'Clase', tipo: 'texto', requerido: true },
      { nombre: 'atributo', etiqueta: 'Atributo', tipo: 'texto', requerido: true },
      {
        nombre: 'tipo', etiqueta: 'Tipo esperado', tipo: 'texto', requerido: false,
        ayuda: 'Nombre del tipo tal como se escribió en el diagrama, por ejemplo «int» o «String».',
      },
      { nombre: 'visibilidad', etiqueta: 'Visibilidad', tipo: 'opcion', requerido: false, opciones: VISIBILIDADES },
    ],
    descripcion: 'Comprueba que una clase declare un atributo con el nombre indicado y, opcionalmente, su tipo y su visibilidad.',
  },
  {
    tipo: 'clase-tiene-operacion',
    etiqueta: 'La clase declara una operación',
    familia: 'semantica',
    // A diferencia del atributo, la operación es comportamiento: no se ofrece
    // en ER, donde las entidades no declaran operaciones.
    aplicaA: ['clases'],
    parametros: [
      { nombre: 'clase', etiqueta: 'Clase', tipo: 'texto', requerido: true },
      { nombre: 'operacion', etiqueta: 'Operación', tipo: 'texto', requerido: true },
      {
        nombre: 'retorno', etiqueta: 'Tipo de retorno esperado', tipo: 'texto', requerido: false,
        ayuda: 'Nombre del tipo tal como se escribió en el diagrama, por ejemplo «boolean» o «void».',
      },
      { nombre: 'visibilidad', etiqueta: 'Visibilidad', tipo: 'opcion', requerido: false, opciones: VISIBILIDADES },
    ],
    descripcion: 'Comprueba que una clase declare una operación con el nombre indicado y, opcionalmente, su tipo de retorno y su visibilidad.',
  },
  {
    tipo: 'relacion-entre',
    etiqueta: 'Relación entre dos elementos',
    familia: 'semantica',
    // El tipo de relación es un parámetro abierto (TipoArista cubre las ocho
    // notaciones), así que se ofrece en cualquier diagrama que tenga aristas
    // propias; secuencia y estados quedan fuera porque ya tienen su propia
    // comprobación dedicada (mensaje-entre, transicion).
    aplicaA: ['clases', 'er', 'flujo', 'casos-de-uso', 'componentes', 'paquetes'],
    parametros: [
      { nombre: 'origen', etiqueta: 'Origen', tipo: 'texto', requerido: true },
      { nombre: 'destino', etiqueta: 'Destino', tipo: 'texto', requerido: true },
      { nombre: 'tipo', etiqueta: 'Tipo de relación', tipo: 'opcion', requerido: true, opciones: TIPOS_ARISTA },
      {
        nombre: 'cardinalidadOrigen', etiqueta: 'Cardinalidad en el origen', tipo: 'texto', requerido: false,
        ayuda: 'Tal como se escribió en el diagrama, por ejemplo «1» o «0..*».',
      },
      {
        nombre: 'cardinalidadDestino', etiqueta: 'Cardinalidad en el destino', tipo: 'texto', requerido: false,
        ayuda: 'Tal como se escribió en el diagrama, por ejemplo «1» o «0..*».',
      },
    ],
    descripcion: 'Comprueba que exista una relación del tipo indicado entre dos elementos y, opcionalmente, las cardinalidades de sus extremos.',
  },
  {
    tipo: 'relacion-es-composicion-no-agregacion',
    etiqueta: 'Composición y no agregación',
    familia: 'semantica',
    // Distinción propia de UML de clases; no tiene equivalente normativo en
    // las demás notaciones.
    aplicaA: ['clases'],
    parametros: [
      { nombre: 'todo', etiqueta: 'El todo', tipo: 'texto', requerido: true },
      { nombre: 'parte', etiqueta: 'La parte', tipo: 'texto', requerido: true },
    ],
    descripcion: 'Comprueba que la relación de todo-parte entre dos clases esté modelada como composición y no como agregación, cuando la parte no puede sobrevivir al todo.',
  },
  {
    tipo: 'clases-con-contenido',
    etiqueta: 'Sin cajas vacías',
    familia: 'semantica',
    // El evaluador solo mira nodos de clase 'clase' o 'entidad'.
    aplicaA: ['clases', 'er'],
    parametros: [
      {
        nombre: 'excepciones', etiqueta: 'Excepciones', tipo: 'lista-texto', requerido: false,
        ayuda: 'Nombres de clases o entidades que se permite dejar vacías, por ejemplo marcadores o interfaces de marcado.',
      },
    ],
    descripcion: 'Comprueba que ninguna clase o entidad quede como una caja con solo el nombre, sin atributos ni operaciones.',
  },
  {
    tipo: 'sin-relaciones-duplicadas',
    etiqueta: 'Sin relaciones duplicadas',
    familia: 'semantica',
    // Aplica a todo diagrama con aristas propias; secuencia no tiene aristas
    // (usa mensajes) y queda fuera.
    aplicaA: ['clases', 'er', 'flujo', 'casos-de-uso', 'componentes', 'paquetes', 'estados'],
    parametros: [],
    descripcion: 'Comprueba que no existan dos relaciones repetidas entre el mismo par de elementos.',
  },
  {
    tipo: 'sin-muchos-a-muchos',
    etiqueta: 'Sin muchos a muchos sin resolver',
    familia: 'semantica',
    // La cardinalidad N:M sin resolver es un problema de modelado de datos:
    // clases (cuando modela persistencia) y ER son los casos donde aplica.
    aplicaA: ['clases', 'er'],
    parametros: [],
    descripcion: 'Comprueba que ninguna relación quede como muchos a muchos sin resolver mediante una clase o entidad intermedia.',
  },
  {
    tipo: 'sin-ciclos',
    etiqueta: 'Sin dependencias circulares',
    familia: 'semantica',
    // Ciclos de herencia o dependencia son un defecto de diseño reconocido en
    // clases, paquetes y componentes; en flujo o estados un ciclo suele ser
    // intencional (un bucle), así que no se ofrece ahí.
    aplicaA: ['clases', 'paquetes', 'componentes'],
    parametros: [
      {
        nombre: 'tipos', etiqueta: 'Tipos de relación a considerar', tipo: 'lista-texto', requerido: false,
        ayuda: 'Valores de tipo de relación (por ejemplo «herencia», «dependencia»); vacío para considerarlos todos.',
      },
    ],
    descripcion: 'Comprueba que no existan dependencias circulares entre los elementos, opcionalmente restringidas a ciertos tipos de relación.',
  },

  // --- Secuencia -----------------------------------------------------------
  {
    tipo: 'existe-participante',
    etiqueta: 'Existe un participante',
    familia: 'semantica',
    aplicaA: ['secuencia'],
    parametros: [
      { nombre: 'nombre', etiqueta: 'Nombre del participante', tipo: 'texto', requerido: true },
      {
        nombre: 'clase', etiqueta: 'Clase esperada', tipo: 'opcion', requerido: false,
        opciones: ['participante', 'actor'],
        ayuda: 'Si se omite, solo se comprueba el nombre, sin importar si es una línea de vida o un actor.',
      },
    ],
    descripcion: 'Comprueba que el diagrama de secuencia incluya un participante o actor con el nombre indicado.',
  },
  {
    tipo: 'mensaje-entre',
    etiqueta: 'Mensaje entre dos participantes',
    familia: 'semantica',
    aplicaA: ['secuencia'],
    parametros: [
      { nombre: 'de', etiqueta: 'Emisor', tipo: 'texto', requerido: true },
      { nombre: 'a', etiqueta: 'Receptor', tipo: 'texto', requerido: true },
      { nombre: 'texto', etiqueta: 'Texto del mensaje', tipo: 'texto', requerido: false },
      { nombre: 'tipo', etiqueta: 'Tipo de mensaje', tipo: 'opcion', requerido: false, opciones: TIPOS_MENSAJE },
    ],
    descripcion: 'Comprueba que exista un mensaje entre dos participantes y, opcionalmente, su texto y su tipo.',
  },
  {
    tipo: 'orden-de-mensajes',
    etiqueta: 'Orden de los mensajes',
    familia: 'semantica',
    aplicaA: ['secuencia'],
    parametros: [
      {
        // El evaluador lanza error si la lista viene vacía, así que se marca
        // requerido pese a leerse con lista().
        nombre: 'mensajes', etiqueta: 'Mensajes en orden', tipo: 'lista-texto', requerido: true,
        ayuda: 'El orden relativo importa; no hace falta listar todos los mensajes, solo los que deben respetar esa secuencia.',
      },
    ],
    descripcion: 'Comprueba que los mensajes indicados aparezcan en el diagrama en el orden dado, sin exigir que sean consecutivos.',
  },
  {
    tipo: 'lineas-vida-nombradas',
    etiqueta: 'Líneas de vida con nombre de instancia',
    familia: 'lexica',
    aplicaA: ['secuencia'],
    parametros: [
      {
        nombre: 'minLongitud', etiqueta: 'Longitud mínima del nombre', tipo: 'numero', requerido: false,
        ayuda: 'Por defecto, 2 caracteres.',
      },
    ],
    descripcion: 'Comprueba que cada línea de vida identifique a una instancia concreta y no a un tipo, tal como exige la especificación de UML.',
  },
  {
    tipo: 'mensajes-sincronos-con-retorno',
    etiqueta: 'Mensajes síncronos con retorno',
    familia: 'semantica',
    aplicaA: ['secuencia'],
    parametros: [],
    descripcion: 'Comprueba que todo mensaje síncrono tenga su correspondiente mensaje de retorno.',
  },
  {
    tipo: 'activaciones-balanceadas',
    etiqueta: 'Activaciones balanceadas',
    familia: 'semantica',
    aplicaA: ['secuencia'],
    parametros: [],
    descripcion: 'Comprueba que toda activación que se abre en el diagrama se cierre, sin quedar colgada ni desactivarse antes de tiempo.',
  },

  // --- Estados -------------------------------------------------------------
  {
    tipo: 'existe-estado',
    etiqueta: 'Existe un estado',
    familia: 'semantica',
    aplicaA: ['estados'],
    parametros: [
      { nombre: 'nombre', etiqueta: 'Nombre del estado', tipo: 'texto', requerido: true },
    ],
    descripcion: 'Comprueba que la máquina de estados declare un estado con el nombre indicado.',
  },
  {
    tipo: 'tiene-estado-inicial',
    etiqueta: 'Tiene estado inicial',
    familia: 'semantica',
    aplicaA: ['estados'],
    parametros: [],
    descripcion: 'Comprueba que la máquina declare su pseudoestado inicial y que este lleve a algún estado.',
  },
  {
    tipo: 'transicion',
    etiqueta: 'Transición entre dos estados',
    familia: 'semantica',
    aplicaA: ['estados'],
    parametros: [
      { nombre: 'desde', etiqueta: 'Estado de origen', tipo: 'texto', requerido: true },
      { nombre: 'hasta', etiqueta: 'Estado de destino', tipo: 'texto', requerido: true },
      {
        nombre: 'etiqueta', etiqueta: 'Disparador esperado', tipo: 'texto', requerido: false,
        ayuda: 'Solo el disparador, sin guarda ni acción; por ejemplo «pulsar» en «pulsar [hay red] / cargar()».',
      },
    ],
    descripcion: 'Comprueba que exista una transición entre dos estados y, opcionalmente, que su disparador sea el esperado.',
  },
  {
    tipo: 'estados-alcanzables',
    etiqueta: 'Todos los estados son alcanzables',
    familia: 'semantica',
    aplicaA: ['estados'],
    parametros: [],
    descripcion: 'Comprueba que todo estado pueda alcanzarse desde el pseudoestado inicial.',
  },
  {
    tipo: 'sin-callejones',
    etiqueta: 'Sin callejones sin salida',
    familia: 'semantica',
    aplicaA: ['estados'],
    parametros: [],
    descripcion: 'Comprueba que desde cualquier estado exista un camino hasta algún estado final, de modo que ninguna ejecución quede atrapada.',
  },
  {
    tipo: 'transiciones-con-evento',
    etiqueta: 'Transiciones con evento',
    familia: 'semantica',
    aplicaA: ['estados'],
    parametros: [
      {
        nombre: 'excepto', etiqueta: 'Estados exceptuados', tipo: 'lista-texto', requerido: false,
        ayuda: 'Estados cuyas transiciones de salida no necesitan disparador, por ejemplo transiciones de finalización automática.',
      },
    ],
    descripcion: 'Comprueba que toda transición entre estados espere un evento, para distinguir un estado real de un simple paso de flujo.',
  },
  {
    tipo: 'transiciones-deterministas',
    etiqueta: 'Transiciones deterministas',
    familia: 'semantica',
    aplicaA: ['estados'],
    parametros: [],
    descripcion: 'Comprueba que ningún estado tenga dos transiciones de salida con el mismo disparador, lo que dejaría la máquina sin decidir.',
  },

  // --- Flujo ---------------------------------------------------------------
  {
    tipo: 'nodo-con-forma',
    etiqueta: 'El nodo tiene la forma que le corresponde',
    familia: 'semantica',
    aplicaA: ['flujo'],
    parametros: [
      { nombre: 'nombre', etiqueta: 'Nodo', tipo: 'texto', requerido: true },
      {
        nombre: 'forma', etiqueta: 'Forma', tipo: 'opcion', requerido: true,
        opciones: ['decision', 'inicio-fin', 'proceso', 'subproceso', 'almacen', 'preparacion'],
        ayuda: 'En un diagrama de flujo la forma indica el papel del nodo; no es decoración.',
      },
    ],
    descripcion: 'Comprueba que una bifurcación esté dibujada como rombo y un paso como rectángulo.',
  },
  {
    tipo: 'paso-de-flujo',
    etiqueta: 'Existe el paso entre dos nodos',
    familia: 'semantica',
    aplicaA: ['flujo'],
    parametros: [
      { nombre: 'desde', etiqueta: 'Desde', tipo: 'texto', requerido: true },
      { nombre: 'hasta', etiqueta: 'Hasta', tipo: 'texto', requerido: true },
      {
        nombre: 'etiqueta', etiqueta: 'Rótulo de la rama', tipo: 'texto', requerido: false,
        ayuda: 'Para exigir por qué rama sale de una decisión, por ejemplo «sí» o «no».',
      },
    ],
    descripcion: 'Comprueba que el flujo avance de un nodo al siguiente, opcionalmente por una rama concreta.',
  },
  {
    tipo: 'flujo-termina',
    etiqueta: 'Todo camino llega al final',
    familia: 'semantica',
    aplicaA: ['flujo'],
    parametros: [],
    descripcion: 'Comprueba que no haya nodos desde los que el proceso quede atrapado sin poder terminar.',
  },
  {
    tipo: 'nodos-alcanzables',
    etiqueta: 'Todo nodo se alcanza desde el inicio',
    familia: 'semantica',
    aplicaA: ['flujo'],
    parametros: [],
    descripcion: 'Comprueba que no haya nodos sueltos a los que el flujo nunca pueda llegar.',
  },
  {
    tipo: 'decisiones-con-salidas',
    etiqueta: 'Las decisiones deciden algo',
    familia: 'semantica',
    aplicaA: ['flujo'],
    parametros: [
      {
        nombre: 'min', etiqueta: 'Salidas mínimas', tipo: 'numero', requerido: false,
        ayuda: 'Por omisión 2: una decisión con una sola salida no decide nada.',
      },
    ],
    descripcion: 'Comprueba que cada rombo tenga al menos dos salidas y que todas vayan rotuladas.',
  },

  // --- Casos de uso, componentes y paquetes --------------------------------
  {
    tipo: 'contenido-en-paquete',
    etiqueta: 'El elemento está en su paquete',
    familia: 'semantica',
    aplicaA: ['paquetes', 'componentes'],
    parametros: [
      { nombre: 'elemento', etiqueta: 'Elemento', tipo: 'texto', requerido: true },
      { nombre: 'paquete', etiqueta: 'Paquete o contenedor', tipo: 'texto', requerido: true },
    ],
    descripcion: 'Comprueba que un elemento esté dibujado dentro del contenedor que le corresponde. La caja que envuelve indica a qué módulo pertenece.',
  },
  {
    tipo: 'sin-casos-uso-sin-actor',
    etiqueta: 'Todo caso de uso lo pide alguien',
    familia: 'semantica',
    aplicaA: ['casos-de-uso'],
    parametros: [],
    descripcion: 'Comprueba que ningún caso de uso quede desconectado: vale que lo solicite un actor o que lo incluya otro caso de uso.',
  },
  {
    tipo: 'sin-actores-ociosos',
    etiqueta: 'Ningún actor queda suelto',
    familia: 'semantica',
    aplicaA: ['casos-de-uso'],
    parametros: [],
    descripcion: 'Comprueba que todo actor dibujado participe en algo. Un actor sin conexiones no aporta información.',
  },

  // --- Cruzadas: coherencia con los diagramas dados por el ejercicio --------
  {
    tipo: 'mensaje-existe-como-operacion',
    etiqueta: 'Los mensajes son operaciones declaradas',
    familia: 'cruzada',
    // Solo secuencia tiene mensajes que verificar contra un diagrama de clases.
    aplicaA: ['secuencia'],
    parametros: [
      {
        nombre: 'contexto', etiqueta: 'Diagrama de clases de referencia', tipo: 'texto', requerido: true,
        ayuda: 'Nombre del diagrama, tal como lo dio el ejercicio, contra el que se valida cada mensaje.',
      },
    ],
    descripcion: 'Comprueba que cada mensaje del diagrama de secuencia corresponda a una operación declarada en el diagrama de clases indicado. Ataca el error dominante medido en alumnos: mensajes a operaciones inexistentes.',
  },
  {
    tipo: 'disparador-existe-como-operacion',
    etiqueta: 'Los disparadores son operaciones del clasificador',
    familia: 'cruzada',
    aplicaA: ['estados'],
    parametros: [
      {
        nombre: 'contexto', etiqueta: 'Diagrama de clases de referencia', tipo: 'texto', requerido: true,
        ayuda: 'Nombre del diagrama, tal como lo dio el ejercicio, contra el que se valida cada disparador.',
      },
      { nombre: 'clasificador', etiqueta: 'Clase asociada a la máquina de estados', tipo: 'texto', requerido: true },
    ],
    descripcion: 'Comprueba que cada disparador de la máquina de estados corresponda a una operación de su clase asociada en el diagrama de clases indicado, para que el comportamiento no se desvincule de la estructura.',
  },
  {
    tipo: 'participante-existe-como-clase',
    etiqueta: 'Los participantes son clases declaradas',
    familia: 'cruzada',
    aplicaA: ['secuencia'],
    parametros: [
      {
        nombre: 'contexto', etiqueta: 'Diagrama de clases de referencia', tipo: 'texto', requerido: true,
        ayuda: 'Nombre del diagrama, tal como lo dio el ejercicio, contra el que se valida cada línea de vida.',
      },
    ],
    descripcion: 'Comprueba que toda línea de vida que no sea un actor corresponda a una clase declarada en el diagrama de clases indicado.',
  },
];

export function metadatoDe(tipo: string): MetadatoAsercion | undefined {
  return METADATOS.find((m) => m.tipo === tipo);
}

export function metadatosPara(tipoDiagrama: TipoDiagrama): MetadatoAsercion[] {
  return METADATOS.filter((m) => m.aplicaA.includes(tipoDiagrama));
}
