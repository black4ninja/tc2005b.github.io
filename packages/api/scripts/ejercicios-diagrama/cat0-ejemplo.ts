import type { EjercicioDiagramaDef } from './tipos.js';

/**
 * Categoría "Ejemplo resuelto": el punto de partida del módulo.
 *
 * Es el único ejercicio que abre con el diagrama TERMINADO. Existe porque el
 * problema documentado de los alumnos no es la notación sino no saber qué
 * modelar, y ese vacío no se llena con una lista de reglas: se llena con un caso
 * completo que se pueda leer entero antes de tener que construir el primero.
 *
 * El caso —la reserva de salas— es el mismo en las tres vistas, y esa es toda su
 * intención: el diagrama de clases se entrega como código inicial, y el de
 * secuencia y la máquina de estados se entregan como contexto, de modo que las
 * tres se leen juntas y cada mensaje y cada disparador se puede rastrear hasta
 * una operación declarada en la estructura.
 *
 * Las comprobaciones cruzadas del catálogo evalúan un diagrama de secuencia o una
 * máquina de estados CONTRA un diagrama de clases dado; aquí el diagrama del
 * alumno es el de clases, así que ninguna de las tres cruzadas tiene nada que
 * recorrer y se han omitido en vez de incluirse para pasar en vacío. La
 * correspondencia entre las tres vistas se expone en el documento guía
 * `scripts/contenido-diagramas/caso-completo.md` y se ejercita en las categorías
 * de Secuencia y Estados, donde sí se comprueba.
 */

const ANATOMIA = [
  {
    elemento: 'Caja de clase',
    significado:
      'Un tipo del dominio, con sus atributos y sus operaciones. Su nombre va en singular, porque describe UN ejemplar.',
  },
  {
    elemento: 'Rombo relleno',
    significado:
      'Composición: la parte no existe sin el todo y desaparece con él. El rombo va siempre del lado del TODO.',
  },
  {
    elemento: 'Rombo hueco',
    significado:
      'Agregación: una clase agrupa a la otra, pero **la parte sobrevive al todo**.',
  },
  {
    elemento: 'Línea simple',
    significado:
      'Asociación: dos clases se conocen y ninguna es dueña de la otra.',
  },
  {
    elemento: 'Triángulo hueco y línea discontinua',
    significado:
      'Implementación: la clase cumple el contrato que declara una interfaz.',
  },
  {
    elemento: 'Cardinalidad en cada extremo',
    significado:
      'Cuántos ejemplares participan: `1`, `0..1`, `0..*`, `1..*`. Sin ellas el diagrama no dice si hay uno o muchos.',
  },
  {
    elemento: 'Línea de vida (secuencia)',
    significado:
      'Representa **una instancia concreta** durante la interacción, no a su clase. El tiempo avanza hacia abajo.',
  },
  {
    elemento: 'Mensaje síncrono `->>` y su retorno `-->>`',
    significado:
      'El emisor queda esperando la respuesta, de modo que todo síncrono exige un retorno con la flecha discontinua.',
  },
  {
    elemento: 'Mensaje asíncrono `-)`',
    significado:
      'El emisor sigue ejecutando sin esperar respuesta, así que no lleva retorno. Es la forma de una notificación.',
  },
  {
    elemento: 'Caja de estado',
    significado:
      'Situación estable en la que un objeto permanece **mientras espera un evento**. Se nombra con un participio o un adjetivo, no con un verbo en infinitivo.',
  },
  {
    elemento: 'Disparador de una transición',
    significado:
      'El evento que provoca el paso de un estado a otro. Corresponde a una operación del clasificador cuyo ciclo de vida se describe.',
  },
];

const SINTAXIS = [
  { para: 'Declarar una clase con miembros', escribes: 'class Sala {\\n  +String clave\\n  +Int capacidad\\n}' },
  { para: 'Marcar una clase como interfaz', escribes: 'class RepositorioReservas {\\n  <<interface>>\\n}' },
  { para: 'Asociación con cardinalidades y etiqueta', escribes: 'Reserva "0..*" -- "1" Sala : ocupa' },
  { para: 'Composición (rombo relleno del lado del todo)', escribes: 'Reserva "1" *-- "0..*" Invitacion' },
  { para: 'Agregación (rombo hueco)', escribes: 'Edificio o-- Sala' },
  { para: 'Implementación de una interfaz', escribes: 'RepositorioReservasHttp ..|> RepositorioReservas' },
  { para: 'Herencia (la punta señala a la madre)', escribes: 'Reserva <|-- ReservaRecurrente' },
  { para: 'Dependencia entre capas', escribes: 'ReservaSalaViewModel --> RepositorioReservas' },
  { para: 'Tipo genérico de retorno', escribes: '+listarReservas(matricula String) List~Reserva~' },
  { para: 'Comentario que no se dibuja', escribes: '%% texto de la nota' },
];

/** El diagrama de clases del caso: es a la vez la solución y el código inicial. */
const CLASES = `classDiagram
  class Usuario {
    +String matricula
    +String nombre
  }
  class Sala {
    +String clave
    +Int capacidad
    +estaLibre(inicio Date, fin Date) Boolean
  }
  class Reserva {
    +Date inicio
    +Date fin
    +confirmar() void
    +cancelar() void
    +caducar() void
    +concluir() void
  }
  class Invitacion {
    +Boolean aceptada
    +aceptar() void
  }
  class RepositorioReservas {
    <<interface>>
    +crearReserva(reserva Reserva) Reserva
    +listarReservas(matricula String) List~Reserva~
  }
  class RepositorioReservasHttp {
    +String url
    +crearReserva(reserva Reserva) Reserva
    +listarReservas(matricula String) List~Reserva~
  }
  class ServicioReservas {
    +registrarReserva(reserva Reserva) Respuesta
  }
  class VistaReservaSala {
    +abrir() void
    +mostrarConfirmacion(reserva Reserva) void
    +mostrarError(mensaje String) void
  }
  class ReservaSalaViewModel {
    +Boolean enviando
    +reservarSala(clave String, inicio Date, fin Date) void
  }
  Usuario "1" -- "0..*" Reserva : solicita
  Reserva "0..*" -- "1" Sala : ocupa
  Reserva "1" *-- "0..*" Invitacion : incluye
  Invitacion "0..*" -- "1" Usuario : destinatario
  VistaReservaSala --> ReservaSalaViewModel
  ReservaSalaViewModel --> RepositorioReservas
  RepositorioReservasHttp ..|> RepositorioReservas
  RepositorioReservasHttp --> ServicioReservas`;

const ejercicios: EjercicioDiagramaDef[] = [
  // -------------------------------------------------------------------------
  {
    slug: 'ejemplo-resuelto-reserva-salas',
    titulo: 'Ejemplo resuelto: reserva de salas en tres vistas',
    categoria: 'Ejemplo resuelto',
    bloque: 'Punto de partida',
    nivel: 'guiado',
    esEjemplo: true,
    orden: 1,
    motor: 'mermaid',
    tipoDiagrama: 'clases',

    problema:
      'Una aplicación de reserva de salas de estudio permite que un usuario elija una sala y una franja ' +
      'horaria, invite a otros usuarios y reciba la confirmación. Un solo diagrama no describe ese sistema: ' +
      'el de clases dice qué existe y cómo se relaciona, el de secuencia dice quién llama a quién para ' +
      'conseguir una reserva, y la máquina de estados dice por qué situaciones pasa esa reserva desde que se ' +
      'solicita hasta que termina. Las tres describen el MISMO sistema, y su valor está en que se puedan ' +
      'leer juntas sin contradecirse.',
    procedencia:
      'Las tres vistas proceden de tradiciones distintas que la OMG unificó en UML a partir de 1997. La ' +
      'estructural viene de los métodos orientados a objetos de finales de los años ochenta —Booch, OMT de ' +
      'Rumbaugh y OOSE de Jacobson—; la de interacción, de los *Message Sequence Charts* normalizados por la ' +
      'ITU-T en la recomendación Z.120 de 1993; y la de comportamiento, de los *statecharts* que David Harel ' +
      'publicó en 1987. Que hoy se escriban con la misma notación no borra ese origen: cada vista responde a ' +
      'una pregunta distinta porque nació para responderla.',
    encaje:
      'Este ejercicio abre el módulo y no corresponde a ninguna fase del diseño: es material de lectura ' +
      'previo a las tres categorías siguientes. Cada una de ellas pide construir una de estas vistas por ' +
      'separado y en un dominio distinto, de modo que conviene haber visto antes cómo encajan las tres en un ' +
      'caso único.',
    anatomia: ANATOMIA,
    otrosUsos:
      'La documentación técnica de un sistema real rara vez consta de un solo diagrama. Un mismo servicio se ' +
      'describe con el esquema de sus datos, con el intercambio de mensajes de su protocolo y con el ciclo de ' +
      'vida de sus entidades, y esas tres piezas aparecen juntas en una propuesta de arquitectura, en la ' +
      'documentación de una API y en la descripción de un flujo de pago. La exigencia de coherencia entre ' +
      'ellas es la misma dentro y fuera de UML.',
    erroresTipicos: [
      'Dibujar cada vista por separado y no confrontarlas nunca. Los defectos que importan no se ven dentro de un diagrama, sino entre dos: un mensaje que invoca una operación inexistente solo aparece al leer la secuencia junto a las clases.',
      'Usar agregación donde la parte no puede existir sin el todo. Aquí una invitación pertenece a su reserva y desaparece con ella, de modo que corresponde composición.',
      'Dejar una relación de muchos a muchos sin resolver. Un usuario puede ser invitado a muchas reservas y una reserva invita a muchos usuarios: esa relación esconde el concepto de invitación, que es donde se anota si el invitado aceptó.',
      'Nombrar la línea de vida con el tipo en lugar de con la instancia. La columna del diagrama de secuencia representa un objeto concreto, no una clase.',
      'Dibujar como estado un nodo del que se sale sin que ocurra nada. Un nodo que no espera un evento no es un estado.',
      'Inventar disparadores en la máquina de estados. Cada evento tiene que corresponder a una operación que la clase declara, o describe un comportamiento que nadie puede provocar.',
    ],
    queDibujas:
      'Nada: el diagrama de clases del caso viene ya completo y correcto en el editor, y el ejercicio se ' +
      'aprueba enviándolo tal como está. El objetivo es contrastar un diagrama terminado con los que habrá ' +
      'que construir en las categorías siguientes, y comprobar en qué se traduce cada comprobación del ' +
      'informe. Una vez visto el informe en verde, resulta útil modificar el diagrama y volver a enviarlo ' +
      'para observar qué comprobación se rompe con cada cambio: sustituir el rombo relleno por uno hueco, ' +
      'retirar las cardinalidades de una relación, vaciar una clase de miembros o renombrar la interfaz. El ' +
      'editor no guarda nada que no se envíe, así que el diagrama original se recupera recargando la página.',
    pasoAPaso: [
      'Lee el diagrama de clases del editor de arriba abajo: primero las cuatro clases del dominio —`Usuario`, `Sala`, `Reserva` e `Invitacion`—, después el contrato `RepositorioReservas` con su implementación, y por último las dos clases de la pantalla.',
      'Lee el diagrama de secuencia de la sección anterior y busca, para cada mensaje, la operación que lo declara en el diagrama de clases. Los seis mensajes están declarados; ninguno es texto libre.',
      'Lee la máquina de estados y busca cada disparador entre las operaciones de `Reserva`. Los cuatro —`confirmar`, `cancelar`, `caducar` y `concluir`— están declarados por esa clase.',
      'Envía el diagrama tal como está y lee el informe: cada comprobación nombra una decisión concreta del modelo, no un detalle de escritura.',
      'Cambia `*--` por `o--` en la relación entre `Reserva` e `Invitacion` y vuelve a enviar. Fallan las dos comprobaciones que hablan de esa relación, y el detalle explica por qué la agregación no describe este caso.',
      'Recarga la página para recuperar el diagrama original.',
    ],
    sintaxis: SINTAXIS,

    codigoInicial: CLASES,

    diagramasContexto: [
      {
        nombre: 'secuencia',
        titulo: 'Diagrama de secuencia: el usuario reserva una sala',
        tipo: 'secuencia',
        motor: 'mermaid',
        codigo: `sequenceDiagram
  actor usuario
  participant vistaReservaSala
  participant reservaSalaViewModel
  participant repositorioReservasHttp
  participant servicioReservas
  usuario-)vistaReservaSala: abrir()
  vistaReservaSala-)reservaSalaViewModel: reservarSala(clave, inicio, fin)
  activate reservaSalaViewModel
  reservaSalaViewModel->>repositorioReservasHttp: crearReserva(reserva)
  activate repositorioReservasHttp
  repositorioReservasHttp->>servicioReservas: registrarReserva(reserva)
  activate servicioReservas
  servicioReservas-->>repositorioReservasHttp: respuesta
  deactivate servicioReservas
  repositorioReservasHttp-->>reservaSalaViewModel: reservaPendiente
  deactivate repositorioReservasHttp
  reservaSalaViewModel-)vistaReservaSala: mostrarConfirmacion(reserva)
  deactivate reservaSalaViewModel`,
      },
      {
        nombre: 'estados',
        titulo: 'Máquina de estados: ciclo de vida de una reserva',
        tipo: 'estados',
        motor: 'mermaid',
        codigo: `stateDiagram-v2
  [*] --> Pendiente
  Pendiente --> Confirmada : confirmar
  Pendiente --> Cancelada : cancelar
  Pendiente --> Caducada : caducar
  Confirmada --> Cancelada : cancelar
  Confirmada --> Concluida : concluir
  Caducada --> [*]
  Cancelada --> [*]
  Concluida --> [*]`,
      },
    ],

    aserciones: [
      { tipo: 'existe-nodo', parametros: { nombre: 'Usuario' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'Sala' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'Reserva' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'RepositorioReservas', clase: 'interfaz' } },
      { tipo: 'clase-tiene-operacion', parametros: { clase: 'RepositorioReservas', operacion: 'crearReserva' } },
      // Las cuatro operaciones que la máquina de estados usa como disparadores.
      { tipo: 'clase-tiene-operacion', parametros: { clase: 'Reserva', operacion: 'confirmar' } },
      { tipo: 'clase-tiene-operacion', parametros: { clase: 'Reserva', operacion: 'cancelar' } },
      { tipo: 'clase-tiene-operacion', parametros: { clase: 'Reserva', operacion: 'caducar' } },
      { tipo: 'clase-tiene-operacion', parametros: { clase: 'Reserva', operacion: 'concluir' } },
      // La operación que recibe el tercer mensaje del diagrama de secuencia.
      { tipo: 'clase-tiene-operacion', parametros: { clase: 'ReservaSalaViewModel', operacion: 'reservarSala' } },
      {
        tipo: 'relacion-entre',
        parametros: { origen: 'RepositorioReservasHttp', destino: 'RepositorioReservas', tipo: 'implementacion' },
      },
      {
        tipo: 'relacion-entre',
        parametros: {
          origen: 'Reserva', destino: 'Sala', tipo: 'asociacion',
          cardinalidadOrigen: '0..*', cardinalidadDestino: '1',
        },
      },
      {
        tipo: 'relacion-entre',
        parametros: {
          origen: 'Reserva', destino: 'Invitacion', tipo: 'composicion',
          cardinalidadOrigen: '1', cardinalidadDestino: '0..*',
        },
      },
      { tipo: 'relacion-es-composicion-no-agregacion', parametros: { todo: 'Reserva', parte: 'Invitacion' } },
      { tipo: 'sin-muchos-a-muchos' },
      { tipo: 'clases-con-contenido' },
      { tipo: 'sin-relaciones-duplicadas', oculta: true },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      // La primera referencia es el propio código inicial: el ejercicio se
      // aprueba enviándolo sin tocar nada, y así queda comprobado.
      CLASES,
      // Otra solución válida del mismo caso: declara el edificio que agrupa las
      // salas, distingue la reserva recurrente por herencia, añade miembros y
      // declara las clases en otro orden.
      `classDiagram
  class Edificio {
    +String nombre
  }
  class Sala {
    +String clave
    +Int capacidad
    +Boolean tieneProyector
    +estaLibre(inicio Date, fin Date) Boolean
  }
  class Usuario {
    +String matricula
    +String nombre
    +String correo
  }
  class Reserva {
    +Date inicio
    +Date fin
    +String motivo
    +confirmar() void
    +cancelar() void
    +caducar() void
    +concluir() void
    +duracionMinutos() Int
  }
  class ReservaRecurrente {
    +Int repeticiones
  }
  class Invitacion {
    +Boolean aceptada
    +aceptar() void
    +rechazar() void
  }
  class RepositorioReservas {
    <<interface>>
    +crearReserva(reserva Reserva) Reserva
    +listarReservas(matricula String) List~Reserva~
    +cancelarReserva(folio String) void
  }
  class RepositorioReservasHttp {
    +String url
    +crearReserva(reserva Reserva) Reserva
    +listarReservas(matricula String) List~Reserva~
    +cancelarReserva(folio String) void
  }
  class ServicioReservas {
    +registrarReserva(reserva Reserva) Respuesta
    +consultarAgenda(clave String) Respuesta
  }
  class VistaReservaSala {
    +abrir() void
    +mostrarConfirmacion(reserva Reserva) void
    +mostrarError(mensaje String) void
  }
  class ReservaSalaViewModel {
    +Boolean enviando
    +reservarSala(clave String, inicio Date, fin Date) void
  }
  Edificio "1" *-- "1..*" Sala : alberga
  Reserva "0..*" -- "1" Sala : ocupa
  Usuario "1" -- "0..*" Reserva : solicita
  Reserva "1" *-- "0..*" Invitacion : incluye
  Invitacion "0..*" -- "1" Usuario : destinatario
  Reserva <|-- ReservaRecurrente
  VistaReservaSala --> ReservaSalaViewModel
  ReservaSalaViewModel --> RepositorioReservas
  RepositorioReservasHttp ..|> RepositorioReservas
  RepositorioReservasHttp --> ServicioReservas`,
    ],

    // La trampa cambia una sola cosa respecto del código inicial: el rombo
    // relleno pasa a hueco. Una invitación no sobrevive a la reserva que la
    // originó, así que la agregación describe un sistema distinto.
    diagramaTrampa: `classDiagram
  class Usuario {
    +String matricula
    +String nombre
  }
  class Sala {
    +String clave
    +Int capacidad
    +estaLibre(inicio Date, fin Date) Boolean
  }
  class Reserva {
    +Date inicio
    +Date fin
    +confirmar() void
    +cancelar() void
    +caducar() void
    +concluir() void
  }
  class Invitacion {
    +Boolean aceptada
    +aceptar() void
  }
  class RepositorioReservas {
    <<interface>>
    +crearReserva(reserva Reserva) Reserva
    +listarReservas(matricula String) List~Reserva~
  }
  class RepositorioReservasHttp {
    +String url
    +crearReserva(reserva Reserva) Reserva
    +listarReservas(matricula String) List~Reserva~
  }
  class ServicioReservas {
    +registrarReserva(reserva Reserva) Respuesta
  }
  class VistaReservaSala {
    +abrir() void
    +mostrarConfirmacion(reserva Reserva) void
    +mostrarError(mensaje String) void
  }
  class ReservaSalaViewModel {
    +Boolean enviando
    +reservarSala(clave String, inicio Date, fin Date) void
  }
  Usuario "1" -- "0..*" Reserva : solicita
  Reserva "0..*" -- "1" Sala : ocupa
  Reserva "1" o-- "0..*" Invitacion : incluye
  Invitacion "0..*" -- "1" Usuario : destinatario
  VistaReservaSala --> ReservaSalaViewModel
  ReservaSalaViewModel --> RepositorioReservas
  RepositorioReservasHttp ..|> RepositorioReservas
  RepositorioReservasHttp --> ServicioReservas`,
  },
];

export default ejercicios;
