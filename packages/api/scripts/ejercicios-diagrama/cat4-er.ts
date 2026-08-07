import type { EjercicioDiagramaDef } from './tipos.js';

/**
 * Categoría "Entidad-relación": la estructura de los datos que se persisten.
 *
 * Los tres niveles atacan errores documentados en trabajos de alumnos, en orden
 * de dificultad creciente: dejar una entidad sin atributos, colocar la
 * cardinalidad en el extremo equivocado, y dejar sin resolver una relación de
 * muchos a muchos. El último es el más grave de los tres en esta notación:
 * a diferencia de un diagrama de clases, un modelo entidad-relación existe para
 * llevarse a tablas, y una relación N:M no tiene traducción directa a tablas.
 *
 * Nota sobre las comprobaciones disponibles: el juez ofrece en `er` un
 * subconjunto del catálogo de clases —atributos sí, operaciones no—, porque una
 * entidad guarda datos y no declara comportamiento.
 */

const ANATOMIA = [
  { elemento: 'Caja de entidad', significado: 'Un tipo de objeto del que el sistema guarda ejemplares. Su nombre va en singular, porque describe UN ejemplar, no la tabla entera.' },
  { elemento: 'Lista de atributos', significado: 'Los datos que se guardan de cada ejemplar, cada uno con su tipo. Una entidad sin atributos no guarda nada.' },
  { elemento: 'Marca `PK`', significado: 'Clave primaria: el atributo que identifica a cada ejemplar sin ambigüedad.' },
  { elemento: 'Marca `FK`', significado: 'Clave foránea: el atributo que referencia a un ejemplar de otra entidad.' },
  { elemento: 'Línea entre dos entidades', significado: 'Una relación. El verbo que la rotula dice qué significa: `realiza`, `aloja`, `agrupa`.' },
  { elemento: '`||` en un extremo', significado: 'Exactamente uno: participa un único ejemplar de esa entidad.' },
  { elemento: '`|o` en un extremo', significado: 'Cero o uno: la participación es opcional.' },
  { elemento: '`}o` en un extremo', significado: 'Cero o muchos: la pata de gallo indica multiplicidad.' },
  { elemento: '`}|` en un extremo', significado: 'Uno o muchos: hay multiplicidad y además la participación es obligatoria.' },
  { elemento: 'Posición de la cardinalidad', significado: 'Cada símbolo describe el extremo donde está dibujado, es decir, cuántos ejemplares de ESA entidad participan en la relación.' },
];

const SINTAXIS = [
  { para: 'Abrir el diagrama', escribes: 'erDiagram' },
  { para: 'Declarar una entidad con atributos', escribes: 'USUARIO {\\n  string correo\\n  int id\\n}' },
  { para: 'Marcar la clave primaria', escribes: 'string correo PK' },
  { para: 'Uno a muchos', escribes: 'USUARIO ||--o{ SESION : abre' },
  { para: 'Uno a exactamente uno', escribes: 'PEDIDO ||--|| FACTURA : genera' },
  { para: 'Participación opcional (cero o uno)', escribes: 'CLIENTE |o--o{ PEDIDO : realiza' },
  { para: 'Uno a uno o muchos', escribes: 'PEDIDO ||--|{ LINEA_PEDIDO : agrupa' },
  { para: 'Muchos a muchos (sin resolver)', escribes: 'PEDIDO }o--o{ PRODUCTO : contiene' },
];

const PROCEDENCIA =
  'El modelo entidad-relación lo propuso Peter Chen en 1976, más de veinte años antes de UML y de forma ' +
  'independiente de él: no es una vista de UML ni deriva de los métodos que lo originaron. La notación de ' +
  'pata de gallo (*crow’s foot*) que emplea Mermaid pertenece a otra tradición todavía, la de los ' +
  'diagramas de datos de Bachman y del método de Barker, y tampoco forma parte del estándar de la OMG. ' +
  'De ahí que los símbolos de cardinalidad no se parezcan a los `0..*` del diagrama de clases.';

const OTROS_USOS =
  'El mismo modelo sostiene el diseño de cualquier base de datos relacional: los gestores lo generan a partir ' +
  'de un esquema existente para documentarlo, las migraciones de un ORM lo reproducen en código, y los ' +
  'almacenes de datos lo usan para describir sus tablas de hechos y dimensiones. Fuera del ámbito relacional, ' +
  'la misma pregunta —qué se guarda y cómo se referencia— aparece al diseñar colecciones en una base de ' +
  'datos documental.';

const ejercicios: EjercicioDiagramaDef[] = [
  // -------------------------------------------------------------------------
  {
    slug: 'er-sesiones-usuario',
    titulo: 'Entidades con contenido: usuarios y sesiones',
    categoria: 'Entidad-relación',
    bloque: 'Estructura',
    nivel: 'guiado',
    orden: 310,
    motor: 'mermaid',
    tipoDiagrama: 'er',

    problema:
      'Un módulo de autenticación guarda usuarios y, por cada usuario, las sesiones que ha abierto. El modelo ' +
      'debe decir qué se guarda de cada sesión —cuál es su identificador, cuándo empezó— y cuántas sesiones ' +
      'puede tener un usuario. Una caja rotulada `SESION` y nada más no responde a ninguna de las dos ' +
      'preguntas, y de ella no sale ninguna tabla.',
    procedencia: PROCEDENCIA,
    encaje:
      'El modelo entidad-relación se dibuja antes de escribir el esquema de la base de datos y después de ' +
      'saber qué información maneja el sistema. Responde a la pregunta "qué se guarda y cómo se referencia"; ' +
      'el orden en que ocurren las operaciones corresponde a otras notaciones.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Dejar una entidad sin atributos. Una entidad es el conjunto de datos que se guardan de algo; sin atributos no declara ninguna columna y no se puede llevar a una tabla.',
      'Declarar atributos sin tipo. El tipo es lo que determina la columna que se creará después.',
      'Omitir la cardinalidad de algún extremo, con lo que el modelo no dice si un usuario tiene una sesión o muchas.',
      'Nombrar las entidades en plural. El nombre describe un ejemplar, no la colección.',
    ],
    queDibujas:
      'Un modelo entidad-relación con `USUARIO` y `SESION`. Declara al menos dos atributos con tipo en cada ' +
      'entidad —`SESION` debe incluir `token`— y une las dos entidades con la relación que corresponda, ' +
      'escrita partiendo de `USUARIO` y con la cardinalidad de cada extremo.',
    pasoAPaso: [
      'Abre el diagrama con `erDiagram`.',
      'Declara el bloque de atributos de `SESION`: `token` para identificarla y una fecha de inicio, cada uno con su tipo.',
      'Comprueba que `USUARIO` también declare sus atributos: la comprobación de cajas vacías se aplica a todas las entidades del diagrama.',
      'Decide las cardinalidades: un usuario abre muchas sesiones a lo largo del tiempo, y cada sesión pertenece exactamente a un usuario.',
      'Escribe la relación partiendo de `USUARIO`, con `||` en su extremo y la pata de gallo `o{` en el de `SESION`, y rotúlala con un verbo.',
    ],
    sintaxis: SINTAXIS,

    codigoInicial: `erDiagram
  USUARIO {
    string correo
    string nombre
  }
  %% Falta declarar la entidad SESION con sus atributos y la relación entre
  %% USUARIO y SESION, con la cardinalidad de cada extremo.`,

    aserciones: [
      { tipo: 'existe-nodo', parametros: { nombre: 'USUARIO', clase: 'entidad' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'SESION', clase: 'entidad' } },
      { tipo: 'clase-tiene-atributo', parametros: { clase: 'SESION', atributo: 'token' } },
      {
        tipo: 'relacion-entre',
        parametros: {
          origen: 'USUARIO', destino: 'SESION', tipo: 'relacion-er',
          cardinalidadOrigen: '1', cardinalidadDestino: '0..*',
        },
      },
      { tipo: 'clases-con-contenido' },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `erDiagram
  USUARIO {
    string correo
    string nombre
  }
  SESION {
    string token
    date inicio
  }
  USUARIO ||--o{ SESION : abre`,
      // Otra solución válida: claves primarias marcadas, una entidad más y las
      // relaciones declaradas antes que los bloques de atributos.
      `erDiagram
  USUARIO ||--o{ SESION : abre
  SESION }o--|| DISPOSITIVO : usa
  USUARIO {
    int id PK
    string correo
    string nombre
  }
  SESION {
    string token PK
    date inicio
    date caducidad
  }
  DISPOSITIVO {
    string identificador PK
    string sistema
  }`,
    ],

    // La trampa deja SESION como una caja sin atributos.
    diagramaTrampa: `erDiagram
  USUARIO {
    string correo
    string nombre
  }
  USUARIO ||--o{ SESION : abre`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'er-cardinalidad-reservas',
    titulo: 'Cardinalidades en su extremo: reservas de salas',
    categoria: 'Entidad-relación',
    bloque: 'Estructura',
    nivel: 'base',
    orden: 320,
    motor: 'mermaid',
    tipoDiagrama: 'er',

    problema:
      'Una sala aloja muchas reservas a lo largo del tiempo y cada reserva ocupa una sola sala. Escrito así, ' +
      'el enunciado es evidente; dibujado, se invierte con frecuencia, porque el símbolo se coloca junto al ' +
      'nombre de la entidad de la que se está hablando en vez de en el extremo que describe. El modelo ' +
      'resultante afirma lo contrario de lo que el autor quería decir, y nada en el dibujo lo delata.',
    procedencia: PROCEDENCIA,
    encaje:
      'Las cardinalidades son el dato que decide dónde queda la clave foránea al pasar el modelo a tablas. ' +
      'Un extremo invertido produce un esquema distinto del previsto, y el error se descubre cuando ya hay ' +
      'datos guardados.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Colocar la cardinalidad en el extremo equivocado. Cada símbolo describe la entidad que tiene al lado: en `SALA ||--o{ RESERVA`, el `||` habla de la sala y la pata de gallo de las reservas.',
      'Leer la relación en un solo sentido. Toda relación se lee en los dos: una sala aloja muchas reservas y una reserva ocupa una sala.',
      'Dejar un extremo sin cardinalidad, con lo que el modelo no dice cuántos ejemplares participan.',
      'Dibujar dos veces la misma relación entre el mismo par de entidades.',
    ],
    queDibujas:
      'El modelo completo de reservas. Añade dos relaciones al diagrama de partida: una de `SALA` a ' +
      '`RESERVA` y otra de `CLIENTE` a `RESERVA`, cada una escrita partiendo de la primera entidad citada. ' +
      'En ambas, una sala y un cliente participan con exactamente un ejemplar, y las reservas con cero o ' +
      'muchos. Rotula cada relación con un verbo.',
    sintaxis: SINTAXIS,

    codigoInicial: `erDiagram
  SALA {
    string clave
    int capacidad
  }
  RESERVA {
    date inicio
    int duracion
  }
  CLIENTE {
    string correo
  }
  %% Faltan las dos relaciones. Escribe cada una partiendo de la entidad que
  %% se indica y coloca cada cardinalidad en el extremo que describe.`,

    aserciones: [
      { tipo: 'existe-nodo', parametros: { nombre: 'RESERVA', clase: 'entidad' } },
      {
        tipo: 'relacion-entre',
        parametros: {
          origen: 'SALA', destino: 'RESERVA', tipo: 'relacion-er',
          cardinalidadOrigen: '1', cardinalidadDestino: '0..*',
        },
      },
      {
        tipo: 'relacion-entre',
        parametros: {
          origen: 'CLIENTE', destino: 'RESERVA', tipo: 'relacion-er',
          cardinalidadOrigen: '1', cardinalidadDestino: '0..*',
        },
      },
      { tipo: 'clases-con-contenido' },
      { tipo: 'sin-relaciones-duplicadas', oculta: true },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `erDiagram
  SALA {
    string clave
    int capacidad
  }
  RESERVA {
    date inicio
    int duracion
  }
  CLIENTE {
    string correo
  }
  SALA ||--o{ RESERVA : aloja
  CLIENTE ||--o{ RESERVA : realiza`,
      // Variante válida: otro orden, claves primarias, más atributos y una
      // entidad adicional que agrupa las salas por sede.
      `erDiagram
  CLIENTE ||--o{ RESERVA : realiza
  SALA ||--o{ RESERVA : aloja
  SEDE ||--|{ SALA : agrupa
  CLIENTE {
    int id PK
    string correo
    string telefono
  }
  RESERVA {
    int folio PK
    date inicio
    date fin
    string estado
  }
  SALA {
    string clave PK
    int capacidad
  }
  SEDE {
    string nombre PK
    string direccion
  }`,
    ],

    // La trampa invierte los símbolos de la relación con SALA: afirma que una
    // reserva ocupa muchas salas y que cada sala tiene una sola reserva.
    diagramaTrampa: `erDiagram
  SALA {
    string clave
    int capacidad
  }
  RESERVA {
    date inicio
    int duracion
  }
  CLIENTE {
    string correo
  }
  SALA }o--|| RESERVA : aloja
  CLIENTE ||--o{ RESERVA : realiza`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'er-pedidos-muchos-a-muchos',
    titulo: 'Resolver un muchos a muchos en un modelo de pedidos',
    categoria: 'Entidad-relación',
    bloque: 'Estructura',
    nivel: 'reto',
    orden: 330,
    motor: 'mermaid',
    tipoDiagrama: 'er',

    problema:
      'El modelo de partida dice que un pedido contiene muchos productos y que un producto aparece en muchos ' +
      'pedidos. Es cierto y aun así no se puede construir: en una base de datos relacional no existe forma de ' +
      'representar una relación de muchos a muchos entre dos tablas, y tampoco hay dónde anotar la cantidad ' +
      'pedida de cada producto ni el precio al que se vendió. Una relación N:M siempre esconde una entidad ' +
      'del dominio que todavía no se ha nombrado.',
    procedencia: PROCEDENCIA,
    encaje:
      'Resolver las relaciones de muchos a muchos es el último paso antes de escribir el esquema. En un ' +
      'diagrama de clases dejar una N:M produce un diseño incómodo; aquí produce un modelo irrealizable, ' +
      'porque el destino del diagrama es precisamente un conjunto de tablas.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Dejar la relación de muchos a muchos sin resolver. No se puede llevar a tablas y no deja lugar para los datos propios de la relación, como la cantidad o el precio aplicado.',
      'Nombrar la entidad intermedia con una palabra vacía como `DATOS` o `RELACION` en lugar del concepto que representa.',
      'Crear la entidad intermedia y dejarla sin atributos propios, con lo que no se gana nada respecto al modelo original.',
      'Conservar además la relación directa entre las dos entidades originales, con lo que el modelo describe dos caminos para el mismo hecho.',
    ],
    queDibujas:
      'El modelo corregido. Nombra la entidad que falta —la línea de un pedido, `LINEA_PEDIDO`—, dale al ' +
      'menos `cantidad` como atributo propio, y relaciónala con `PEDIDO` y con `PRODUCTO` de modo que ningún ' +
      'extremo quede de muchos a muchos: un pedido y un producto participan con exactamente un ejemplar en ' +
      'cada relación. Escribe cada relación partiendo de `PEDIDO` y de `PRODUCTO`, y elimina del modelo de ' +
      'partida lo que sobre.',
    sintaxis: SINTAXIS,

    // El punto de partida ES el modelo defectuoso: el alumno lo corrige.
    codigoInicial: `erDiagram
  PEDIDO {
    int folio
    date fecha
  }
  PRODUCTO {
    string clave
    string nombre
  }
  DATOS {
    string valor
  }
  PEDIDO }o--o{ PRODUCTO : contiene`,

    aserciones: [
      { tipo: 'sin-muchos-a-muchos' },
      { tipo: 'existe-nodo', parametros: { nombre: 'LINEA_PEDIDO', clase: 'entidad' } },
      { tipo: 'clase-tiene-atributo', parametros: { clase: 'LINEA_PEDIDO', atributo: 'cantidad' } },
      {
        tipo: 'relacion-entre',
        parametros: {
          origen: 'PEDIDO', destino: 'LINEA_PEDIDO', tipo: 'relacion-er', cardinalidadOrigen: '1',
        },
      },
      {
        tipo: 'relacion-entre',
        parametros: {
          origen: 'PRODUCTO', destino: 'LINEA_PEDIDO', tipo: 'relacion-er', cardinalidadOrigen: '1',
        },
      },
      { tipo: 'clases-con-contenido' },
      { tipo: 'sin-nombres-vagos' },
      { tipo: 'sin-relaciones-duplicadas', oculta: true },
    ],

    diagramasReferencia: [
      `erDiagram
  PEDIDO {
    int folio
    date fecha
  }
  PRODUCTO {
    string clave
    string nombre
  }
  LINEA_PEDIDO {
    int cantidad
    float precio
  }
  PEDIDO ||--o{ LINEA_PEDIDO : agrupa
  PRODUCTO ||--o{ LINEA_PEDIDO : aparece`,
      // Variante válida: un pedido tiene al menos una línea, se añade el cliente
      // y las relaciones se declaran antes que los bloques de atributos.
      `erDiagram
  CLIENTE ||--o{ PEDIDO : realiza
  PEDIDO ||--|{ LINEA_PEDIDO : detalla
  PRODUCTO ||--o{ LINEA_PEDIDO : figura
  CLIENTE {
    int id PK
    string correo
  }
  PEDIDO {
    int folio PK
    date fecha
    string estado
  }
  PRODUCTO {
    string clave PK
    string nombre
    float precio
  }
  LINEA_PEDIDO {
    int cantidad
    float importe
    float descuento
  }`,
    ],

    // La trampa es el propio modelo de partida, sin corregir.
    diagramaTrampa: `erDiagram
  PEDIDO {
    int folio
    date fecha
  }
  PRODUCTO {
    string clave
    string nombre
  }
  DATOS {
    string valor
  }
  PEDIDO }o--o{ PRODUCTO : contiene`,
  },
];

export default ejercicios;
