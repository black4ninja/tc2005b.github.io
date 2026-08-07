import type { EjercicioDiagramaDef } from './tipos.js';

/**
 * Categoría "Clases": la vista estática del diseño.
 *
 * Los tres niveles atacan errores documentados en trabajos de alumnos, en orden
 * de dificultad creciente: confundir agregación con composición, confundir
 * herencia con implementación, y no resolver una relación de muchos a muchos.
 */

const ANATOMIA = [
  { elemento: 'Caja de clase', significado: 'Un tipo del dominio. Su nombre va en singular, porque describe UN ejemplar, no la colección.' },
  { elemento: 'Compartimento de atributos', significado: 'Qué datos guarda cada ejemplar, con su tipo.' },
  { elemento: 'Compartimento de operaciones', significado: 'Qué sabe hacer, con sus parámetros y su tipo de retorno.' },
  { elemento: 'Visibilidad `+ - #`', significado: 'Público, privado y protegido: quién puede usar ese miembro desde fuera.' },
  { elemento: 'Línea simple', significado: 'Asociación: dos clases se conocen, sin que ninguna sea dueña de la otra.' },
  { elemento: 'Rombo hueco', significado: 'Agregación: una agrupa a la otra, pero **la parte sobrevive al todo**.' },
  { elemento: 'Rombo relleno', significado: 'Composición: la parte no existe sin el todo, y desaparece con él.' },
  { elemento: 'Triángulo hueco y línea continua', significado: 'Herencia: la clase hija es un caso particular de la madre.' },
  { elemento: 'Triángulo hueco y línea discontinua', significado: 'Implementación: la clase cumple un contrato declarado en una interfaz.' },
  { elemento: 'Cardinalidad en cada extremo', significado: 'Cuántos ejemplares participan: `1`, `0..1`, `0..*`, `1..*`.' },
];

const SINTAXIS = [
  { para: 'Declarar una clase con miembros', escribes: 'class Pedido {\\n  +String folio\\n  +total() Double\\n}' },
  { para: 'Asociación', escribes: 'Pedido -- Cliente' },
  { para: 'Composición (rombo relleno del lado del todo)', escribes: 'Pedido *-- Linea' },
  { para: 'Agregación (rombo hueco)', escribes: 'Equipo o-- Persona' },
  { para: 'Herencia (la punta señala a la madre)', escribes: 'Pedido <|-- PedidoExpress' },
  { para: 'Implementación de una interfaz', escribes: 'PedidoHttp ..|> Repositorio' },
  { para: 'Cardinalidades y etiqueta', escribes: 'Pedido "1" *-- "0..*" Linea : contiene' },
  { para: 'Marcar una clase como interfaz', escribes: 'class Repositorio {\\n  <<interface>>\\n}' },
];

const PROCEDENCIA =
  'El diagrama de clases procede de los métodos orientados a objetos de finales de los años ochenta ' +
  '—Booch, OMT de Rumbaugh y OOSE de Jacobson— que la OMG unificó en UML a partir de 1997. Es la vista ' +
  'estructural central del lenguaje y la que más se sigue usando fuera del ámbito académico.';

const OTROS_USOS =
  'La misma idea aparece siempre que hay que describir tipos y sus relaciones: en los esquemas de una base ' +
  'de datos, en los modelos de dominio de un ORM, en la definición de tipos de una API con OpenAPI o GraphQL, ' +
  'y en los diagramas de arquitectura de cualquier documentación técnica.';

const ejercicios: EjercicioDiagramaDef[] = [
  // -------------------------------------------------------------------------
  {
    slug: 'clases-composicion-carrito',
    titulo: 'Composición: un carrito y sus líneas',
    categoria: 'Clases',
    bloque: 'Estructura',
    nivel: 'guiado',
    orden: 10,
    motor: 'mermaid',
    tipoDiagrama: 'clases',

    problema:
      'Un carrito de compra contiene líneas, y cada línea registra un producto y una cantidad. La pregunta ' +
      'de diseño no es si el carrito "tiene" líneas, sino qué ocurre con ellas cuando el carrito deja de ' +
      'existir. De esa respuesta depende qué relación corresponde dibujar.',
    procedencia: PROCEDENCIA,
    encaje:
      'Es el primer diagrama que se dibuja al modelar un dominio, antes de decidir cómo se comunican los ' +
      'objetos. Responde a la pregunta "qué existe y cómo se relaciona"; el orden en que ocurren las cosas ' +
      'corresponde al diagrama de secuencia.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Usar agregación cuando la parte no puede existir sin el todo. El criterio operativo es: si la parte sobrevive al todo, es agregación; si desaparece con él, es composición.',
      'Dibujar el rombo en el extremo equivocado. El rombo va siempre del lado del TODO, nunca de la parte.',
      'Omitir las cardinalidades. Sin ellas, el diagrama no dice si un carrito tiene una línea o muchas.',
      'Dejar clases sin atributos ni operaciones: una caja con solo el nombre no modela nada.',
    ],
    queDibujas:
      'Un diagrama de clases con `Carrito` y `Linea`, unidas por la relación que corresponda, con sus ' +
      'cardinalidades y con al menos un atributo en cada clase.',
    pasoAPaso: [
      'Declara la clase `Carrito` con un atributo que la identifique, por ejemplo `+String folio`.',
      'Declara la clase `Linea` con `+Int cantidad`.',
      'Decide la relación: si el carrito se elimina, sus líneas no tienen sentido por separado, así que la parte NO sobrevive al todo.',
      'Une las dos clases con el rombo del lado del carrito y las cardinalidades `"1"` y `"0..*"`.',
    ],
    sintaxis: SINTAXIS,

    codigoInicial: `classDiagram
  class Carrito {
    +String folio
  }
  class Linea {
    +Int cantidad
  }
  %% Falta la relación entre Carrito y Linea, con sus cardinalidades.`,

    aserciones: [
      { tipo: 'existe-nodo', parametros: { nombre: 'Carrito' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'Linea' } },
      {
        tipo: 'relacion-entre',
        parametros: {
          origen: 'Carrito', destino: 'Linea', tipo: 'composicion',
          cardinalidadOrigen: '1', cardinalidadDestino: '0..*',
        },
      },
      { tipo: 'relacion-es-composicion-no-agregacion', parametros: { todo: 'Carrito', parte: 'Linea' } },
      { tipo: 'clases-con-contenido' },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `classDiagram
  class Carrito {
    +String folio
  }
  class Linea {
    +Int cantidad
  }
  Carrito "1" *-- "0..*" Linea : contiene`,
      // Otra solución válida: distinto orden, más miembros y sin etiqueta.
      `classDiagram
  class Linea {
    +Int cantidad
    +Double importe()
  }
  class Carrito {
    +String folio
    +Double total()
  }
  Carrito "1" *-- "0..*" Linea`,
    ],

    diagramaTrampa: `classDiagram
  class Carrito {
    +String folio
  }
  class Linea {
    +Int cantidad
  }
  Carrito "1" o-- "0..*" Linea : contiene`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'clases-contrato-catalogo',
    titulo: 'Contrato e implementación en un catálogo',
    categoria: 'Clases',
    bloque: 'Estructura',
    nivel: 'base',
    orden: 20,
    motor: 'mermaid',
    tipoDiagrama: 'clases',

    problema:
      'Un catálogo necesita obtener productos, y esos productos pueden venir de un servicio remoto hoy y de ' +
      'una copia local mañana. Para que el catálogo no dependa de cuál de las dos se use, la obtención se ' +
      'declara como un contrato y cada origen lo cumple a su manera.',
    procedencia: PROCEDENCIA,
    encaje:
      'Esta separación es la que sostiene la arquitectura por capas: el contrato pertenece a quien lo usa y ' +
      'la implementación a quien conoce el detalle técnico. En el proyecto de la materia es exactamente la ' +
      'relación entre un repositorio y su fuente de datos.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Confundir herencia con implementación. La herencia es línea continua y significa "es un caso particular de"; la implementación es discontinua y significa "cumple este contrato".',
      'Dibujar la punta del triángulo en el extremo equivocado: siempre señala al contrato o a la clase madre.',
      'Declarar la interfaz sin ninguna operación, con lo que no declara ningún contrato.',
      'Nombrar las clases con palabras que no dicen qué modelan, como "Manager" o "Datos".',
    ],
    queDibujas:
      'Un diagrama con la interfaz `Repositorio`, que declara la operación `obtener`; la clase ' +
      '`RepositorioHttp`, que la implementa; la clase `Producto`; y la clase `Catalogo`, que se compone de ' +
      'productos. Cada clase debe declarar al menos un miembro.',
    sintaxis: SINTAXIS,

    codigoInicial: `classDiagram
  class Producto {
    +String nombre
  }
  %% Declara la interfaz Repositorio y la clase RepositorioHttp que la cumple,
  %% y la clase Catalogo compuesta de productos.`,

    aserciones: [
      { tipo: 'existe-nodo', parametros: { nombre: 'Repositorio', clase: 'interfaz' } },
      { tipo: 'clase-tiene-operacion', parametros: { clase: 'Repositorio', operacion: 'obtener' } },
      {
        tipo: 'relacion-entre',
        parametros: { origen: 'RepositorioHttp', destino: 'Repositorio', tipo: 'implementacion' },
      },
      {
        tipo: 'relacion-entre',
        parametros: { origen: 'Catalogo', destino: 'Producto', tipo: 'composicion', cardinalidadDestino: '0..*' },
      },
      { tipo: 'clases-con-contenido' },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `classDiagram
  class Repositorio {
    <<interface>>
    +obtener() List~Producto~
  }
  class RepositorioHttp {
    +String url
    +obtener() List~Producto~
  }
  class Producto {
    +String nombre
    +Double precio
  }
  class Catalogo {
    +Int total
  }
  RepositorioHttp ..|> Repositorio
  Catalogo "1" *-- "0..*" Producto`,
      // Variante válida: otro orden, otros miembros y con etiqueta en la composición.
      `classDiagram
  class Catalogo {
    +String titulo
    +buscar(texto String) List~Producto~
  }
  class Producto {
    +String nombre
  }
  class Repositorio {
    <<interface>>
    +obtener() List~Producto~
    +buscar(texto String) List~Producto~
  }
  class RepositorioHttp {
    +obtener() List~Producto~
    +buscar(texto String) List~Producto~
  }
  Catalogo "1" *-- "0..*" Producto : agrupa
  RepositorioHttp ..|> Repositorio`,
    ],

    // La trampa usa herencia continua donde corresponde implementación.
    diagramaTrampa: `classDiagram
  class Repositorio {
    <<interface>>
    +obtener() List~Producto~
  }
  class RepositorioHttp {
    +obtener() List~Producto~
  }
  class Producto {
    +String nombre
  }
  class Catalogo {
    +Int total
  }
  Repositorio <|-- RepositorioHttp
  Catalogo "1" *-- "0..*" Producto`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'clases-corregir-inscripciones',
    titulo: 'Corregir un modelo de inscripciones',
    categoria: 'Clases',
    bloque: 'Estructura',
    nivel: 'reto',
    orden: 30,
    motor: 'mermaid',
    tipoDiagrama: 'clases',

    problema:
      'El modelo de partida dice que un alumno cursa muchos cursos y que un curso tiene muchos alumnos. Eso ' +
      'es cierto y aun así es inservible: no hay dónde anotar la fecha en que un alumno concreto se inscribió ' +
      'a un curso concreto, ni su calificación. Una relación de muchos a muchos siempre esconde un concepto ' +
      'del dominio que todavía no se ha nombrado.',
    procedencia: PROCEDENCIA,
    encaje:
      'Resolver las relaciones de muchos a muchos es el paso previo a llevar el modelo a una base de datos, ' +
      'donde esa relación no se puede representar sin una tabla intermedia. El diagrama de clases se anticipa ' +
      'a ese problema en la fase de diseño.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Dejar una relación de muchos a muchos sin resolver, con lo que no hay lugar para los datos propios de la relación.',
      'Nombrar la clase intermedia con una palabra vacía como "Datos" o "Relacion" en lugar del concepto que representa.',
      'Dibujar dos veces la misma relación entre las mismas clases.',
      'Sustituir la relación de muchos a muchos por dos asociaciones sueltas, sin la clase que las une.',
    ],
    queDibujas:
      'El modelo corregido. Nombra el concepto que falta —la inscripción de un alumno a un curso—, dale al ' +
      'menos un atributo propio, y conéctalo con `Alumno` y con `Curso` de forma que ninguna relación quede ' +
      'de muchos a muchos. Elimina lo que sobre del modelo de partida.',
    sintaxis: SINTAXIS,

    // El punto de partida ES el modelo defectuoso: el alumno lo corrige.
    codigoInicial: `classDiagram
  class Alumno {
    +String matricula
  }
  class Curso {
    +String clave
  }
  class Datos {
    +String valor
  }
  Alumno "0..*" -- "0..*" Curso : cursa`,

    aserciones: [
      { tipo: 'sin-muchos-a-muchos' },
      { tipo: 'existe-nodo', parametros: { nombre: 'Inscripcion' } },
      {
        tipo: 'relacion-entre',
        parametros: { origen: 'Alumno', destino: 'Inscripcion', tipo: 'asociacion', cardinalidadDestino: '0..*' },
      },
      {
        tipo: 'relacion-entre',
        parametros: { origen: 'Curso', destino: 'Inscripcion', tipo: 'asociacion', cardinalidadDestino: '0..*' },
      },
      { tipo: 'clases-con-contenido' },
      { tipo: 'sin-nombres-vagos' },
      { tipo: 'sin-relaciones-duplicadas', oculta: true },
    ],

    diagramasReferencia: [
      `classDiagram
  class Alumno {
    +String matricula
  }
  class Curso {
    +String clave
  }
  class Inscripcion {
    +Date fecha
  }
  Alumno "1" -- "0..*" Inscripcion
  Curso "1" -- "0..*" Inscripcion`,
      // Variante válida: más atributos, una operación y etiquetas en las relaciones.
      `classDiagram
  class Inscripcion {
    +Date fecha
    +Double calificacion
    +aprobada() Boolean
  }
  class Alumno {
    +String matricula
    +String nombre
  }
  class Curso {
    +String clave
    +String titulo
  }
  Alumno "1" -- "0..*" Inscripcion : realiza
  Curso "1" -- "0..*" Inscripcion : recibe`,
    ],

    // La trampa es el propio modelo de partida, sin corregir.
    diagramaTrampa: `classDiagram
  class Alumno {
    +String matricula
  }
  class Curso {
    +String clave
  }
  class Datos {
    +String valor
  }
  Alumno "0..*" -- "0..*" Curso : cursa`,
  },
];

export default ejercicios;
