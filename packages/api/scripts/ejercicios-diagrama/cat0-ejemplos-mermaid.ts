import type { EjercicioDiagramaDef } from './tipos.js';

/**
 * Categoría "Ejemplo resuelto", continuación: un ejemplar por tipo de diagrama.
 *
 * `cat0-ejemplo.ts` abre el módulo con el diagrama de CLASES del caso de reserva
 * de salas ya terminado. Este fichero completa ese punto de partida con los otros
 * cuatro tipos que el juez sabe leer en Mermaid —secuencia, estados,
 * entidad-relación y flujo— sobre EL MISMO caso y con los mismos nombres de
 * clases y de operaciones.
 *
 * Que el dominio se repita es la decisión de diseño de todo el bloque. El
 * problema documentado de los alumnos no es la notación sino no saber qué
 * modelar, y cambiar de dominio en cada ejemplo obliga a reaprender el sistema
 * antes de poder mirar el diagrama. Con un solo caso, la diferencia entre los
 * cinco ejemplos es exactamente la pregunta que responde cada notación: qué
 * existe, quién llama a quién, por qué situaciones pasa una reserva, qué se
 * guarda de ella y en qué orden se ejecutan los pasos del procedimiento.
 *
 * Los cinco son «ejercicios completos»: el `codigoInicial` ES el diagrama
 * terminado, se aprueba enviándolo sin tocar nada, y su función es que el alumno
 * vea el informe en verde antes de tener que construir el primer diagrama propio.
 *
 * El diagrama de clases se entrega como contexto en los cuatro, y en secuencia y
 * en estados eso permite además usar las comprobaciones CRUZADAS —mensajes que
 * son operaciones declaradas, líneas de vida que son clases, disparadores que son
 * operaciones del clasificador—, que son el eje del módulo.
 */

// ---------------------------------------------------------------------------
// El caso, en su vista estructural. Copiado de `cat0-ejemplo.ts`, donde es a la
// vez la solución y el código inicial; aquí es el contexto contra el que se
// comprueba la coherencia de las otras cuatro vistas.
// ---------------------------------------------------------------------------

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

/** El mismo contexto en los cuatro ejercicios, y con el mismo nombre. */
const CONTEXTO_CLASES = {
  nombre: 'clases',
  titulo: 'Diagrama de clases del caso: reserva de salas',
  tipo: 'clases' as const,
  motor: 'mermaid' as const,
  codigo: CLASES,
};

/**
 * Párrafo común a los cuatro: explica qué significa que el ejercicio venga
 * resuelto y qué se gana rompiéndolo a propósito. Va al final de `queDibujas`,
 * que es la única sección donde el imperativo está permitido.
 */
const CIERRE_QUE_DIBUJAS =
  'No hace falta modificar nada: el diagrama del editor está completo y correcto, y el ejercicio se ' +
  'aprueba enviándolo tal como está. Su función es servir de contraste con los diagramas que habrá que ' +
  'construir en las categorías siguientes, donde el editor arranca vacío o con un modelo defectuoso. Una ' +
  'vez visto el informe en verde, conviene modificar el diagrama y volver a enviarlo para observar qué ' +
  'comprobación deja de cumplirse con cada cambio: el informe nombra la decisión de modelado que se ha ' +
  'roto, no el carácter que se ha escrito mal. El editor no guarda nada que no se envíe, así que el ' +
  'diagrama original se recupera recargando la página.';

// ---------------------------------------------------------------------------
// Secuencia
// ---------------------------------------------------------------------------

const ANATOMIA_SECUENCIA = [
  {
    elemento: 'Cabecera de participante',
    significado: 'La caja superior de una columna. Declara quién interviene en la interacción.',
  },
  {
    elemento: 'Línea de vida',
    significado:
      'La línea vertical que baja desde la cabecera. Representa a **una instancia concreta** mientras dura la interacción, no a su clase. El tiempo avanza hacia abajo.',
  },
  {
    elemento: 'Actor',
    significado: 'Un participante externo al sistema, normalmente la persona que inicia la interacción.',
  },
  {
    elemento: 'Barra de activación',
    significado:
      'El rectángulo estrecho sobre la línea de vida. Marca el intervalo en que esa instancia tiene el control y está ejecutando algo. Se abre cuando lo recibe y se cierra cuando lo devuelve.',
  },
  {
    elemento: 'Mensaje síncrono `->>`',
    significado:
      'Línea continua con punta rellena. El emisor **queda esperando** la respuesta, así que su ejecución se detiene ahí. Por eso todo síncrono exige un retorno.',
  },
  {
    elemento: 'Mensaje de retorno `-->>`',
    significado:
      'Línea **discontinua**. Devuelve el control al emisor del síncrono y, si lo hay, el resultado. No es un mensaje nuevo: es la respuesta de uno anterior.',
  },
  {
    elemento: 'Mensaje asíncrono `-)`',
    significado:
      'Línea continua con punta abierta. El emisor **sigue ejecutando** sin esperar respuesta, de modo que no lleva retorno. Es la forma de una notificación o de un evento.',
  },
  {
    elemento: 'Texto del mensaje',
    significado:
      'El nombre de la operación que se invoca en el receptor, con sus argumentos. No es una frase libre: debe existir como operación de la clase que recibe el mensaje.',
  },
  {
    elemento: 'Orden vertical',
    significado:
      'La única fuente de secuencia. Un mensaje dibujado más abajo ocurre después; no hay números que lo indiquen.',
  },
  {
    elemento: 'Frontera asíncrona',
    significado:
      'El punto del diagrama donde se deja de esperar. Aquí la interfaz avisa al modelo de vista sin bloquearse, mientras que las capas que necesitan el resultado de la red sí esperan.',
  },
];

const SINTAXIS_SECUENCIA = [
  { para: 'Abrir el diagrama', escribes: 'sequenceDiagram' },
  { para: 'Declarar una línea de vida', escribes: 'participant reservaSalaViewModel' },
  { para: 'Declarar un actor', escribes: 'actor usuario' },
  { para: 'Mensaje síncrono', escribes: 'reservaSalaViewModel->>repositorioReservasHttp: crearReserva(reserva)' },
  { para: 'Mensaje de retorno', escribes: 'repositorioReservasHttp-->>reservaSalaViewModel: reservaPendiente' },
  { para: 'Mensaje asíncrono', escribes: 'reservaSalaViewModel-)vistaReservaSala: mostrarConfirmacion(reserva)' },
  { para: 'Abrir y cerrar una activación', escribes: 'activate reservaSalaViewModel … deactivate reservaSalaViewModel' },
  { para: 'Abrir la activación con el propio mensaje', escribes: 'reservaSalaViewModel->>+repositorioReservasHttp: crearReserva(reserva)' },
  { para: 'Cerrarla con el retorno', escribes: 'repositorioReservasHttp-->>-reservaSalaViewModel: reservaPendiente' },
  { para: 'Comentario que no se dibuja', escribes: '%% texto de la nota' },
];

const PROCEDENCIA_SECUENCIA =
  'La notación procede de los *Message Sequence Charts*, normalizados por la ITU-T en la recomendación ' +
  'Z.120, aprobada en marzo de 1993 para especificar el intercambio de mensajes en sistemas de ' +
  'telecomunicaciones. La revisión de 1996 de esa recomendación introdujo las expresiones en línea, que ' +
  'permiten componer alternativas y repeticiones dentro del propio diagrama, y que son el antecedente de ' +
  'los fragmentos combinados de UML 2.0. Conviene acotar esa filiación a lo que puede documentarse: la ' +
  'especificación de UML 2.0 no cita los Message Sequence Charts entre sus fuentes, y quien sí reconoce ' +
  'ese origen por escrito es la especificación de UML 1.5.';

const OTROS_USOS_SECUENCIA =
  'La misma idea —quién habla con quién, en qué orden y quién espera respuesta— se usa fuera de UML ' +
  'siempre que hay que documentar un protocolo: el establecimiento de una conexión TCP, el flujo de ' +
  'autorización de OAuth y los intercambios de una pasarela de pago se publican con diagramas de esta ' +
  'forma. Las herramientas de trazado distribuido muestran una petición atravesando varios servicios con ' +
  'la misma lectura vertical, y los Message Sequence Charts siguen vigentes en telecomunicaciones.';

const SECUENCIA = `sequenceDiagram
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
  deactivate reservaSalaViewModel`;

// ---------------------------------------------------------------------------
// Estados
// ---------------------------------------------------------------------------

const ANATOMIA_ESTADOS = [
  {
    elemento: '`[*]` en el origen de una flecha',
    significado:
      'Pseudoestado inicial: marca por dónde arranca la máquina. No es un estado, porque no se permanece en él; solo indica dónde empieza la ejecución.',
  },
  {
    elemento: '`[*]` en el destino de una flecha',
    significado:
      'Pseudoestado final: la máquina termina y deja de responder a eventos. Tampoco es un estado, por el mismo motivo.',
  },
  {
    elemento: 'Caja de estado',
    significado:
      'Situación estable en la que el objeto permanece **mientras espera un evento**. Se nombra con un adjetivo o un participio —`Pendiente`, `Confirmada`, `Caducada`—, no con un verbo en infinitivo, que describiría una acción y no una situación.',
  },
  {
    elemento: 'Flecha de transición',
    significado:
      'Paso de un estado a otro. Es instantánea: el tiempo transcurre dentro de los estados, nunca sobre las flechas.',
  },
  {
    elemento: 'Disparador',
    significado:
      'El evento que provoca la transición. Va al principio de la etiqueta y es lo único que se compara: `confirmar` en `confirmar [haySalaLibre]`. Corresponde a una operación del clasificador cuyo ciclo de vida se describe.',
  },
  {
    elemento: 'Guarda `[ ]`',
    significado:
      'Condición booleana que debe cumplirse para que la transición se tome. Dos salidas con el mismo disparador y guardas excluyentes siguen siendo deterministas; con el mismo disparador y sin guardas, no.',
  },
  {
    elemento: 'Acción `/`',
    significado:
      'Lo que se ejecuta al tomar la transición. Ocurre durante el paso, no dentro de ninguno de los dos estados.',
  },
  {
    elemento: 'Transición hacia el pseudoestado final',
    significado:
      'No lleva disparador, y es correcto que no lo lleve: es una **transición de terminación**, que se toma cuando el estado de origen ha completado su actividad. Por eso las comprobaciones no le exigen evento.',
  },
  {
    elemento: 'Clasificador de la máquina',
    significado:
      'La clase cuyo ciclo de vida se describe. Aquí es `Reserva`, y por eso los cuatro disparadores del diagrama son sus cuatro operaciones.',
  },
];

const SINTAXIS_ESTADOS = [
  { para: 'Abrir el diagrama', escribes: 'stateDiagram-v2' },
  { para: 'Pseudoestado inicial', escribes: '[*] --> Pendiente' },
  { para: 'Pseudoestado final', escribes: 'Concluida --> [*]' },
  { para: 'Transición con disparador', escribes: 'Pendiente --> Confirmada : confirmar' },
  { para: 'Disparador con guarda', escribes: 'Pendiente --> Confirmada : confirmar [haySalaLibre]' },
  { para: 'Disparador con guarda y acción', escribes: 'Confirmada --> Cancelada : cancelar [antesDeEmpezar] / liberarSala' },
  { para: 'Autotransición', escribes: 'Confirmada --> Confirmada : confirmar' },
  { para: 'Estado con etiqueta visible distinta del identificador', escribes: 'state "Reserva confirmada" as Confirmada' },
  { para: 'Comentario', escribes: '%% esto no se dibuja' },
];

const PROCEDENCIA_ESTADOS =
  'El formalismo procede de los *statecharts* que David Harel publicó en 1987 en *Science of Computer ' +
  'Programming*, como extensión de las máquinas de estados finitos con jerarquía, concurrencia y difusión ' +
  'de eventos. La propia especificación de UML reconoce que sus máquinas de estados son una variante ' +
  'orientada a objetos de ese formalismo, con diferencias semánticas respecto del original. Harel narró el ' +
  'origen industrial del trabajo —surgió del desarrollo de la aviónica de un avión de combate— en un ' +
  'artículo presentado en la tercera conferencia History of Programming Languages (HOPL III, 2007). La ' +
  'misma idea se formalizó después fuera de UML en SCXML, recomendación del W3C.';

const OTROS_USOS_ESTADOS =
  'La misma idea aparece siempre que un objeto tiene un ciclo de vida discreto. En desarrollo móvil, en el ' +
  'tipo sellado que representa el estado de una pantalla y que la vista consume; en las bibliotecas de ' +
  'máquinas de estados de la interfaz, como XState; en los protocolos de red descritos por estados, como ' +
  'la conexión TCP; en los flujos de pedido de cualquier sistema de comercio; y en los motores de diálogo ' +
  'escritos en SCXML.';

const ESTADOS = `stateDiagram-v2
  [*] --> Pendiente
  Pendiente --> Confirmada : confirmar
  Pendiente --> Cancelada : cancelar
  Pendiente --> Caducada : caducar
  Confirmada --> Cancelada : cancelar
  Confirmada --> Concluida : concluir
  Caducada --> [*]
  Cancelada --> [*]
  Concluida --> [*]`;

// ---------------------------------------------------------------------------
// Entidad-relación
// ---------------------------------------------------------------------------

const ANATOMIA_ER = [
  {
    elemento: 'Caja de entidad',
    significado:
      'Un tipo de objeto del que el sistema guarda ejemplares. Su nombre va en singular, porque describe UN ejemplar, no la tabla entera.',
  },
  {
    elemento: 'Lista de atributos',
    significado: 'Los datos que se guardan de cada ejemplar, cada uno con su tipo. Una entidad sin atributos no guarda nada.',
  },
  { elemento: 'Marca `PK`', significado: 'Clave primaria: el atributo que identifica a cada ejemplar sin ambigüedad.' },
  { elemento: 'Marca `FK`', significado: 'Clave foránea: el atributo que referencia a un ejemplar de otra entidad.' },
  {
    elemento: 'Línea entre dos entidades',
    significado: 'Una relación. El verbo que la rotula dice qué significa: `solicita`, `aloja`, `incluye`.',
  },
  { elemento: '`||` en un extremo', significado: 'Exactamente uno: participa un único ejemplar de esa entidad.' },
  { elemento: '`|o` en un extremo', significado: 'Cero o uno: la participación es opcional.' },
  { elemento: '`}o` en un extremo', significado: 'Cero o muchos: la pata de gallo indica multiplicidad.' },
  { elemento: '`}|` en un extremo', significado: 'Uno o muchos: hay multiplicidad y además la participación es obligatoria.' },
  {
    elemento: 'Posición de la cardinalidad',
    significado:
      'Cada símbolo describe el extremo donde está dibujado, es decir, cuántos ejemplares de ESA entidad participan en la relación.',
  },
  {
    elemento: 'Entidad intermedia',
    significado:
      'La que resuelve una relación de muchos a muchos y aloja los datos propios de esa relación. Aquí es `INVITACION`, que además guarda si el invitado aceptó.',
  },
];

const SINTAXIS_ER = [
  { para: 'Abrir el diagrama', escribes: 'erDiagram' },
  { para: 'Declarar una entidad con atributos', escribes: 'SALA {\\n  string clave\\n  int capacidad\\n}' },
  { para: 'Marcar la clave primaria', escribes: 'string clave PK' },
  { para: 'Marcar una clave foránea', escribes: 'string matricula FK' },
  { para: 'Uno a muchos', escribes: 'USUARIO ||--o{ RESERVA : solicita' },
  { para: 'Uno a exactamente uno', escribes: 'RESERVA ||--|| ACTA : genera' },
  { para: 'Participación opcional (cero o uno)', escribes: 'SALA |o--o{ RESERVA : aloja' },
  { para: 'Uno a uno o muchos', escribes: 'SEDE ||--|{ SALA : agrupa' },
  { para: 'Muchos a muchos (sin resolver)', escribes: 'USUARIO }o--o{ RESERVA : asiste' },
];

const PROCEDENCIA_ER =
  'El modelo entidad-relación lo propuso Peter Chen en 1976, más de veinte años antes de UML y de forma ' +
  'independiente de él: no es una vista de UML ni deriva de los métodos que lo originaron. La notación de ' +
  'pata de gallo (*crow’s foot*) que emplea Mermaid pertenece a otra tradición todavía, la de los ' +
  'diagramas de datos de Bachman y del método de Barker, y tampoco forma parte del estándar de la OMG. ' +
  'De ahí que los símbolos de cardinalidad no se parezcan a los `0..*` del diagrama de clases.';

const OTROS_USOS_ER =
  'El mismo modelo sostiene el diseño de cualquier base de datos relacional: los gestores lo generan a ' +
  'partir de un esquema existente para documentarlo, las migraciones de un ORM lo reproducen en código, y ' +
  'los almacenes de datos lo usan para describir sus tablas de hechos y dimensiones. Fuera del ámbito ' +
  'relacional, la misma pregunta —qué se guarda y cómo se referencia— aparece al diseñar colecciones en ' +
  'una base de datos documental.';

const ER = `erDiagram
  USUARIO {
    string matricula PK
    string nombre
  }
  SALA {
    string clave PK
    int capacidad
  }
  RESERVA {
    int folio PK
    string matricula FK
    string clave FK
    date inicio
    date fin
  }
  INVITACION {
    int folio FK
    string matricula FK
    boolean aceptada
  }
  USUARIO ||--o{ RESERVA : solicita
  SALA ||--o{ RESERVA : aloja
  RESERVA ||--o{ INVITACION : incluye
  USUARIO ||--o{ INVITACION : recibe`;

// ---------------------------------------------------------------------------
// Flujo
// ---------------------------------------------------------------------------

const ANATOMIA_FLUJO = [
  { elemento: 'Óvalo (o rectángulo redondeado)', significado: 'Terminal: dónde empieza y dónde termina el procedimiento.' },
  { elemento: 'Rectángulo', significado: 'Un paso: una acción que se ejecuta sin bifurcarse.' },
  { elemento: 'Rombo', significado: 'Una decisión: el punto donde el flujo se bifurca según una condición.' },
  {
    elemento: 'Rótulo de la rama',
    significado: 'La condición bajo la que se toma esa salida. Sin rótulo, el diagrama no dice cuándo se toma cada camino.',
  },
  { elemento: 'Flecha', significado: 'El orden: qué se ejecuta después de qué.' },
  { elemento: 'Rectángulo con bandas laterales', significado: 'Subproceso: un paso que está detallado en otro diagrama.' },
  { elemento: 'Cilindro', significado: 'Almacén de datos: dónde se lee o se escribe información persistente.' },
  {
    elemento: 'La forma del nodo',
    significado:
      'La forma **indica el papel** del nodo, no es decoración. Un rectángulo con una pregunta dentro sigue siendo un paso, no una decisión.',
  },
  {
    elemento: 'Ciclo con salida',
    significado:
      'Un bucle es legítimo mientras exista una decisión que permita abandonarlo. Aquí el rechazo de la franja horaria devuelve al paso de captura, y la decisión que lo precede es la que da salida.',
  },
];

const SINTAXIS_FLUJO = [
  { para: 'Abrir el diagrama y fijar su dirección', escribes: 'flowchart TD' },
  { para: 'Terminal de inicio o de fin (óvalo)', escribes: 'A([Inicio])' },
  { para: 'Paso (rectángulo)', escribes: 'B[Capturar sala y franja horaria]' },
  { para: 'Decisión (rombo)', escribes: 'C{La sala esta libre?}' },
  { para: 'Paso de un nodo al siguiente', escribes: 'A --> B' },
  { para: 'Rama rotulada de una decisión', escribes: 'C -- si --> D' },
  { para: 'Subproceso', escribes: 'E[[Notificar a los invitados]]' },
  { para: 'Almacén de datos', escribes: 'F[(Agenda de la sala)]' },
];

const PROCEDENCIA_FLUJO =
  'El diagrama de flujo es muy anterior a UML. Se atribuye a Frank y Lillian Gilbreth, que en 1921 lo ' +
  'presentaron ante la ASME como *gráfico de proceso* para estudiar procedimientos industriales, y a ' +
  'finales de los años cuarenta John von Neumann y Herman Goldstine lo adaptaron para describir programas, ' +
  'que es el uso por el que se difundió. El diagrama de ACTIVIDAD de UML es su descendiente formalizado: ' +
  'añade semántica de concurrencia, particiones y objetos que fluyen. Mermaid dibuja diagramas de flujo, no ' +
  'diagramas de actividad, y la notación de esta ficha es la del diagrama de flujo.';

const OTROS_USOS_FLUJO =
  'La misma notación describe procedimientos fuera del software: protocolos clínicos, flujos de aprobación ' +
  'administrativa, árboles de decisión de atención a clientes. Dentro del software aparece en la ' +
  'documentación de procesos de negocio, en los diagramas de un pipeline de integración continua y en las ' +
  'guías de resolución de incidencias.';

const FLUJO = `flowchart TD
  A([Inicio]) --> B[Capturar sala y franja horaria]
  B --> C{La sala esta libre?}
  C -- no --> D[Mostrar franjas alternativas]
  D --> B
  C -- si --> E[Registrar la reserva como pendiente]
  E --> F[Enviar invitaciones]
  F --> G{Se confirmo la reserva?}
  G -- si --> H[Mostrar la confirmacion]
  G -- no --> I[Caducar la reserva]
  H --> Z([Fin])
  I --> Z`;

// ---------------------------------------------------------------------------

const ejercicios: EjercicioDiagramaDef[] = [
  // =========================================================================
  // Secuencia
  // =========================================================================
  {
    slug: 'ejemplo-resuelto-secuencia-reserva',
    titulo: 'Ejemplo resuelto: la interacción que crea una reserva',
    categoria: 'Ejemplo resuelto',
    bloque: 'Punto de partida',
    nivel: 'guiado',
    esEjemplo: true,
    orden: 2,
    motor: 'mermaid',
    tipoDiagrama: 'secuencia',

    problema:
      'El diagrama de clases del caso dice qué piezas existen para reservar una sala —la pantalla, su modelo ' +
      'de vista, el repositorio y el servicio remoto— y qué sabe hacer cada una, pero no dice quién llama a ' +
      'quién ni en qué orden, ni cuáles de esas llamadas dejan al emisor esperando. El diagrama de secuencia ' +
      'responde a eso para UN escenario concreto: el que va desde que el usuario abre la pantalla hasta que ' +
      've la confirmación de su reserva.',
    procedencia: PROCEDENCIA_SECUENCIA,
    encaje:
      'Este ejemplo es la segunda pieza del punto de partida del módulo, después del diagrama de clases del ' +
      'mismo caso. Se lee cuando ya se conoce la estructura y antes de construir el primer diagrama de ' +
      'secuencia propio, en la categoría de Interacción. La pregunta que responde es "cómo colaboran estos ' +
      'objetos para conseguir esto"; qué existe y cómo se relaciona corresponde al diagrama de clases, y por ' +
      'qué situaciones pasa la reserva, a la máquina de estados.',
    anatomia: ANATOMIA_SECUENCIA,
    otrosUsos: OTROS_USOS_SECUENCIA,
    erroresTipicos: [
      'Enviar un mensaje a una operación que la clase receptora no declara. Es el error dominante medido en trabajos de alumnos y solo se ve al leer la secuencia junto al diagrama de clases; aquí lo comprueba una de las dos comprobaciones cruzadas.',
      'Nombrar la línea de vida con el tipo en lugar de con la instancia. La columna representa un objeto concreto, no una clase, y por eso los cinco nombres de este diagrama van en minúscula inicial.',
      'Dibujar la llamada y olvidar la respuesta. Un mensaje síncrono deja al emisor esperando; sin el retorno, el diagrama no dice cuándo recupera el control.',
      'Dibujar como síncrona una notificación que el emisor no espera. Usar `->>` para avisar a la vista describe una interfaz bloqueada mientras dura la petición de red.',
      'Abrir una activación con `activate` y no cerrarla. La barra queda abierta hasta el final del diagrama y describe una instancia que nunca termina lo que empezó.',
      'Colocar los mensajes en un orden que no es el de la ejecución. La posición vertical es la única fuente de secuencia.',
    ],
    queDibujas:
      'Nada: el diagrama de secuencia del caso viene ya completo y correcto en el editor. Describe el ' +
      'escenario de reserva sobre las cinco instancias del diseño: el usuario abre la pantalla, la pantalla ' +
      'avisa al modelo de vista sin bloquearse, el modelo de vista pide la reserva al repositorio y el ' +
      'repositorio la registra en el servicio remoto —ambas llamadas síncronas y con su retorno— y por ' +
      'último la confirmación vuelve a la pantalla de forma asíncrona. ' + CIERRE_QUE_DIBUJAS,
    pasoAPaso: [
      'Lee el diagrama de clases de la sección anterior y localiza las cinco clases que intervienen aquí: `VistaReservaSala`, `ReservaSalaViewModel`, `RepositorioReservasHttp` y `ServicioReservas`, más el usuario, que es externo al sistema.',
      'Recorre el diagrama de secuencia de arriba abajo y busca, para cada mensaje, la operación que lo declara en el diagrama de clases. Los cinco mensajes están declarados; ninguno es texto libre.',
      'Observa la forma de cada flecha: `-)` en los dos avisos que cruzan hacia la interfaz, `->>` en las dos llamadas que esperan resultado y `-->>` en sus dos retornos.',
      'Sigue las barras de activación: `reservaSalaViewModel` retiene el control durante toda la operación, y `repositorioReservasHttp` y `servicioReservas` solo mientras dura su parte.',
      'Envía el diagrama tal como está y lee el informe: dos de las comprobaciones no miran este diagrama en solitario, sino su coherencia con el de clases.',
      'Cambia `crearReserva` por `guardarReserva` y vuelve a enviar. Falla la comprobación cruzada de mensajes, porque ninguna clase del diseño declara esa operación.',
      'Recarga la página para recuperar el diagrama original.',
    ],
    sintaxis: SINTAXIS_SECUENCIA,

    codigoInicial: SECUENCIA,
    diagramasContexto: [CONTEXTO_CLASES],

    aserciones: [
      { tipo: 'existe-participante', parametros: { nombre: 'usuario', clase: 'actor' } },
      { tipo: 'existe-participante', parametros: { nombre: 'vistaReservaSala', clase: 'participante' } },
      { tipo: 'existe-participante', parametros: { nombre: 'reservaSalaViewModel', clase: 'participante' } },
      // Las dos cruzadas: el eje del módulo. Evalúan este diagrama CONTRA el de
      // clases dado, que es donde aparecen los defectos que importan.
      { tipo: 'participante-existe-como-clase', parametros: { contexto: 'clases' } },
      { tipo: 'mensaje-existe-como-operacion', parametros: { contexto: 'clases' } },
      {
        tipo: 'mensaje-entre',
        parametros: {
          de: 'vistaReservaSala', a: 'reservaSalaViewModel',
          texto: 'reservarSala', tipo: 'asincrono',
        },
      },
      {
        tipo: 'mensaje-entre',
        parametros: {
          de: 'reservaSalaViewModel', a: 'repositorioReservasHttp',
          texto: 'crearReserva', tipo: 'sincrono',
        },
      },
      {
        tipo: 'mensaje-entre',
        parametros: {
          de: 'repositorioReservasHttp', a: 'servicioReservas',
          texto: 'registrarReserva', tipo: 'sincrono',
        },
      },
      {
        tipo: 'mensaje-entre',
        parametros: {
          de: 'reservaSalaViewModel', a: 'vistaReservaSala',
          texto: 'mostrarConfirmacion', tipo: 'asincrono',
        },
      },
      {
        tipo: 'orden-de-mensajes',
        parametros: { mensajes: ['abrir', 'reservarSala', 'crearReserva', 'registrarReserva', 'mostrarConfirmacion'] },
      },
      { tipo: 'mensajes-sincronos-con-retorno' },
      { tipo: 'activaciones-balanceadas' },
      { tipo: 'conteo-nodos', parametros: { clase: 'participante', min: 4 } },
      { tipo: 'lineas-vida-nombradas' },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      // La primera referencia es el propio código inicial: el ejercicio se
      // aprueba enviándolo sin tocar nada, y así queda comprobado.
      SECUENCIA,
      // Otra interacción válida del mismo escenario: consulta antes la
      // disponibilidad de la sala, declara las líneas de vida de dentro hacia
      // fuera y abre dos de las activaciones con la forma abreviada del mensaje.
      `sequenceDiagram
  actor usuario
  participant servicioReservas
  participant repositorioReservasHttp
  participant sala
  participant reservaSalaViewModel
  participant vistaReservaSala
  usuario-)vistaReservaSala: abrir()
  vistaReservaSala-)reservaSalaViewModel: reservarSala(clave, inicio, fin)
  activate reservaSalaViewModel
  reservaSalaViewModel->>sala: estaLibre(inicio, fin)
  activate sala
  sala-->>reservaSalaViewModel: disponible
  deactivate sala
  reservaSalaViewModel->>+repositorioReservasHttp: crearReserva(reserva)
  repositorioReservasHttp->>+servicioReservas: registrarReserva(reserva)
  servicioReservas-->>-repositorioReservasHttp: respuestaHttp
  repositorioReservasHttp-->>-reservaSalaViewModel: reservaCreada
  reservaSalaViewModel-)vistaReservaSala: mostrarConfirmacion(reserva)
  deactivate reservaSalaViewModel`,
    ],

    // La trampa cambia una sola cosa respecto del código inicial: el modelo de
    // vista invoca «guardarReserva», que ninguna clase del diseño declara. El
    // diagrama sigue siendo válido como dibujo y describe un sistema que no
    // existe.
    diagramaTrampa: `sequenceDiagram
  actor usuario
  participant vistaReservaSala
  participant reservaSalaViewModel
  participant repositorioReservasHttp
  participant servicioReservas
  usuario-)vistaReservaSala: abrir()
  vistaReservaSala-)reservaSalaViewModel: reservarSala(clave, inicio, fin)
  activate reservaSalaViewModel
  reservaSalaViewModel->>repositorioReservasHttp: guardarReserva(reserva)
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

  // =========================================================================
  // Estados
  // =========================================================================
  {
    slug: 'ejemplo-resuelto-estados-reserva',
    titulo: 'Ejemplo resuelto: ciclo de vida de una reserva',
    categoria: 'Ejemplo resuelto',
    bloque: 'Punto de partida',
    nivel: 'guiado',
    esEjemplo: true,
    orden: 3,
    motor: 'mermaid',
    tipoDiagrama: 'estados',

    problema:
      'Una reserva de sala no está simplemente hecha o no hecha. Entre que se solicita y que deja de existir ' +
      'pasa por situaciones distintas: espera la confirmación, queda confirmada, puede cancelarse en ' +
      'cualquiera de esos dos momentos, puede caducar si nadie la confirma a tiempo y termina cuando la ' +
      'franja horaria concluye. El diagrama de clases declara las cuatro operaciones con las que se maneja ' +
      'una reserva, pero no dice desde qué situación tiene sentido invocar cada una; eso lo dice la máquina ' +
      'de estados.',
    procedencia: PROCEDENCIA_ESTADOS,
    encaje:
      'Es la tercera pieza del punto de partida del módulo, y la que cierra el ciclo entre las dos vistas ya ' +
      'leídas: la estructura declara qué se le puede pedir a una reserva y el comportamiento declara cuándo ' +
      'tiene sentido pedírselo. Se lee antes de construir la primera máquina de estados propia, en la ' +
      'categoría de Comportamiento. La pregunta que responde es "en qué situaciones puede estar este objeto ' +
      'y qué lo hace pasar de una a otra".',
    anatomia: ANATOMIA_ESTADOS,
    otrosUsos: OTROS_USOS_ESTADOS,
    erroresTipicos: [
      'Inventar disparadores. Un disparador nombra un evento que la clase asociada sabe recibir, así que tiene que corresponder a una de sus operaciones. Aquí los cuatro —`confirmar`, `cancelar`, `caducar` y `concluir`— son las cuatro operaciones que declara `Reserva`, y una comprobación cruzada lo verifica.',
      'Dibujar como estado un nodo del que se sale sin que ocurra nada. El criterio operativo es directo: **si el nodo no espera un evento, no es un estado**, sino un paso de flujo que pertenece a la acción de una transición.',
      'Nombrar los estados con verbos en infinitivo, como `Confirmar`. Un estado describe una situación, no una acción; por eso los cinco de este diagrama son participios.',
      'Dejar un callejón sin salida: se entra en una situación y desde ella ya no hay camino hasta el final. Aquí los tres desenlaces terminan la máquina de forma explícita.',
      'Rotular dos salidas del mismo estado con el mismo disparador y sin guardas. La máquina no puede decidir cuál tomar, y la especificación de UML considera mal formado ese modelo.',
      'Confundir la cancelación con la caducidad. Son eventos distintos: una la provoca alguien y la otra la provoca el paso del tiempo, y por eso son dos operaciones distintas de `Reserva`.',
    ],
    queDibujas:
      'Nada: la máquina de estados del caso viene ya completa y correcta en el editor. Arranca en la reserva ' +
      'pendiente de confirmación, admite la confirmación, la cancelación y la caducidad desde esa situación ' +
      'inicial, permite cancelar también una reserva ya confirmada, y termina por tres desenlaces: caducada, ' +
      'cancelada o concluida. ' + CIERRE_QUE_DIBUJAS,
    pasoAPaso: [
      'Localiza en el diagrama de clases de la sección anterior las cuatro operaciones de `Reserva`: `confirmar`, `cancelar`, `caducar` y `concluir`.',
      'Recorre la máquina y comprueba que cada etiqueta de transición es una de esas cuatro operaciones. Ninguna describe un gesto de la interfaz ni un resultado.',
      'Comprueba que a cada uno de los cinco estados llega al menos una flecha desde algún estado alcanzable desde `[*]`.',
      'Comprueba que desde cada estado existe algún camino hasta `[*]`: ninguna reserva queda atrapada.',
      'Observa que las tres flechas que llegan al pseudoestado final no llevan disparador. Son transiciones de terminación, y es correcto que no lo lleven.',
      'Envía el diagrama tal como está y lee el informe: una de las comprobaciones no mira esta máquina en solitario, sino sus disparadores contra las operaciones de `Reserva`.',
      'Cambia el disparador `confirmar` por `usuarioPulsaConfirmar` y vuelve a enviar. Falla la comprobación cruzada, porque ese evento no es una operación del clasificador.',
      'Recarga la página para recuperar el diagrama original.',
    ],
    sintaxis: SINTAXIS_ESTADOS,

    codigoInicial: ESTADOS,
    diagramasContexto: [CONTEXTO_CLASES],

    aserciones: [
      { tipo: 'tiene-estado-inicial' },
      { tipo: 'existe-estado', parametros: { nombre: 'Pendiente' } },
      { tipo: 'existe-estado', parametros: { nombre: 'Confirmada' } },
      { tipo: 'existe-estado', parametros: { nombre: 'Concluida' } },
      { tipo: 'transicion', parametros: { desde: 'Pendiente', hasta: 'Confirmada', etiqueta: 'confirmar' } },
      { tipo: 'transicion', parametros: { desde: 'Pendiente', hasta: 'Cancelada', etiqueta: 'cancelar' } },
      { tipo: 'transicion', parametros: { desde: 'Pendiente', hasta: 'Caducada', etiqueta: 'caducar' } },
      { tipo: 'transicion', parametros: { desde: 'Confirmada', hasta: 'Concluida', etiqueta: 'concluir' } },
      // La cruzada: cada disparador tiene que ser una operación de «Reserva» en
      // el diagrama de clases dado. Es la comprobación que ata el comportamiento
      // a la estructura.
      {
        tipo: 'disparador-existe-como-operacion',
        parametros: { contexto: 'clases', clasificador: 'Reserva' },
      },
      { tipo: 'transiciones-con-evento' },
      { tipo: 'estados-alcanzables' },
      { tipo: 'sin-callejones' },
      { tipo: 'transiciones-deterministas' },
      { tipo: 'sin-nombres-vagos', oculta: true },
      { tipo: 'sin-relaciones-duplicadas', oculta: true },
    ],

    diagramasReferencia: [
      ESTADOS,
      // Otra máquina válida para la misma clase: una reserva ya confirmada
      // también puede caducar si la franja pasa sin usarse, la confirmación va
      // condicionada por una guarda y el estado confirmado se declara con una
      // etiqueta visible distinta de su identificador.
      `stateDiagram-v2
  state "Reserva confirmada" as Confirmada
  [*] --> Pendiente
  Pendiente --> Cancelada : cancelar
  Pendiente --> Caducada : caducar
  Pendiente --> Confirmada : confirmar [haySalaLibre]
  Confirmada --> Caducada : caducar
  Confirmada --> Cancelada : cancelar
  Confirmada --> Concluida : concluir
  Concluida --> [*]
  Cancelada --> [*]
  Caducada --> [*]`,
    ],

    // La trampa cambia una sola cosa respecto del código inicial: el disparador
    // de la confirmación pasa a describir un gesto de la interfaz. La máquina
    // sigue siendo correcta por dentro y deja de ser trazable con la estructura.
    diagramaTrampa: `stateDiagram-v2
  [*] --> Pendiente
  Pendiente --> Confirmada : usuarioPulsaConfirmar
  Pendiente --> Cancelada : cancelar
  Pendiente --> Caducada : caducar
  Confirmada --> Cancelada : cancelar
  Confirmada --> Concluida : concluir
  Caducada --> [*]
  Cancelada --> [*]
  Concluida --> [*]`,
  },

  // =========================================================================
  // Entidad-relación
  // =========================================================================
  {
    slug: 'ejemplo-resuelto-er-reserva',
    titulo: 'Ejemplo resuelto: los datos que se guardan de una reserva',
    categoria: 'Ejemplo resuelto',
    bloque: 'Punto de partida',
    nivel: 'guiado',
    esEjemplo: true,
    orden: 4,
    motor: 'mermaid',
    tipoDiagrama: 'er',

    problema:
      'El diagrama de clases del caso describe objetos en memoria, con sus operaciones y sus dependencias ' +
      'entre capas. El modelo entidad-relación describe otra cosa: qué queda guardado cuando la aplicación ' +
      'se cierra y cómo se referencian entre sí esos datos. Las dos vistas hablan del mismo sistema y no son ' +
      'la misma: el repositorio, el servicio y la pantalla no aparecen aquí, porque no se persisten, y en ' +
      'cambio aparecen las claves con las que una reserva localiza a su sala y a su solicitante.',
    procedencia: PROCEDENCIA_ER,
    encaje:
      'Es la cuarta pieza del punto de partida y la primera que sale de UML. Se lee antes de construir el ' +
      'primer modelo entidad-relación propio, en la categoría de Estructura. La pregunta que responde es ' +
      '"qué se guarda y cómo se referencia"; el orden en que ocurren las operaciones y el reparto de ' +
      'responsabilidades entre objetos corresponden a las otras notaciones del bloque.',
    anatomia: ANATOMIA_ER,
    otrosUsos: OTROS_USOS_ER,
    erroresTipicos: [
      'Dejar una entidad sin atributos. Una entidad es el conjunto de datos que se guardan de algo; sin atributos no declara ninguna columna y no se puede llevar a una tabla.',
      'Dejar sin resolver la relación de muchos a muchos entre usuarios y reservas. Un usuario puede ser invitado a muchas reservas y una reserva invita a muchos usuarios: esa relación esconde el concepto de invitación, que es donde se anota si el invitado aceptó.',
      'Colocar la cardinalidad en el extremo equivocado. Cada símbolo describe la entidad que tiene al lado: en `SALA ||--o{ RESERVA`, el `||` habla de la sala y la pata de gallo, de las reservas.',
      'Trasladar al modelo de datos las clases que solo existen en memoria. El repositorio y el servicio remoto no se persisten, y su presencia aquí sugeriría tablas que nadie va a crear.',
      'Nombrar las entidades en plural. El nombre describe un ejemplar, no la colección.',
      'Omitir las claves foráneas. Sin ellas el modelo dibuja la relación pero no dice con qué atributo se resuelve al pasar a tablas.',
    ],
    queDibujas:
      'Nada: el modelo entidad-relación del caso viene ya completo y correcto en el editor. Declara las ' +
      'cuatro entidades que se persisten —`USUARIO`, `SALA`, `RESERVA` e `INVITACION`—, con sus atributos, ' +
      'su clave primaria y las claves foráneas de cada referencia; y declara las cuatro relaciones, con la ' +
      'invitación resolviendo el muchos a muchos entre usuarios y reservas. ' + CIERRE_QUE_DIBUJAS,
    pasoAPaso: [
      'Compara las cuatro entidades con las clases del diagrama de la sección anterior: `USUARIO`, `SALA`, `RESERVA` e `INVITACION` corresponden a las cuatro clases del dominio, y las cinco restantes no aparecen porque no se guardan.',
      'Lee los atributos de `RESERVA` y localiza las dos claves foráneas: `matricula` referencia al usuario que la solicita y `clave` a la sala que ocupa.',
      'Lee los símbolos de cada relación por su extremo: `||` junto a `USUARIO` significa que cada reserva pertenece exactamente a un usuario, y `o{` junto a `RESERVA` significa que un usuario puede tener de cero a muchas.',
      'Comprueba que ninguna relación tiene pata de gallo en los dos extremos: `INVITACION` es la entidad que resuelve el muchos a muchos, y por eso guarda el atributo `aceptada`, que no cabría en ninguna de las otras dos.',
      'Envía el modelo tal como está y lee el informe.',
      'Sustituye `RESERVA ||--o{ INVITACION` por `RESERVA }o--o{ INVITACION` y vuelve a enviar. Fallan la comprobación de cardinalidades de esa relación y la de muchos a muchos sin resolver.',
      'Recarga la página para recuperar el modelo original.',
    ],
    sintaxis: SINTAXIS_ER,

    codigoInicial: ER,
    diagramasContexto: [CONTEXTO_CLASES],

    aserciones: [
      { tipo: 'existe-nodo', parametros: { nombre: 'USUARIO', clase: 'entidad' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'SALA', clase: 'entidad' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'RESERVA', clase: 'entidad' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'INVITACION', clase: 'entidad' } },
      { tipo: 'clase-tiene-atributo', parametros: { clase: 'RESERVA', atributo: 'inicio' } },
      { tipo: 'clase-tiene-atributo', parametros: { clase: 'RESERVA', atributo: 'fin' } },
      // El atributo que justifica la entidad intermedia: no cabe ni en USUARIO ni
      // en RESERVA.
      { tipo: 'clase-tiene-atributo', parametros: { clase: 'INVITACION', atributo: 'aceptada' } },
      {
        tipo: 'relacion-entre',
        parametros: {
          origen: 'USUARIO', destino: 'RESERVA', tipo: 'relacion-er',
          cardinalidadOrigen: '1', cardinalidadDestino: '0..*',
        },
      },
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
          origen: 'RESERVA', destino: 'INVITACION', tipo: 'relacion-er',
          cardinalidadOrigen: '1', cardinalidadDestino: '0..*',
        },
      },
      {
        tipo: 'relacion-entre',
        parametros: {
          origen: 'USUARIO', destino: 'INVITACION', tipo: 'relacion-er',
          cardinalidadOrigen: '1', cardinalidadDestino: '0..*',
        },
      },
      { tipo: 'sin-muchos-a-muchos' },
      { tipo: 'clases-con-contenido' },
      { tipo: 'sin-relaciones-duplicadas', oculta: true },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      ER,
      // Otro modelo válido del mismo caso: añade la sede que agrupa las salas,
      // amplía los atributos de cada entidad y declara todas las relaciones antes
      // que los bloques de atributos.
      `erDiagram
  SEDE ||--|{ SALA : agrupa
  USUARIO ||--o{ RESERVA : solicita
  SALA ||--o{ RESERVA : aloja
  RESERVA ||--o{ INVITACION : incluye
  USUARIO ||--o{ INVITACION : recibe
  SEDE {
    string nombre PK
    string direccion
  }
  USUARIO {
    string matricula PK
    string nombre
    string correo
  }
  SALA {
    string clave PK
    int capacidad
    boolean tieneProyector
  }
  RESERVA {
    int folio PK
    string matricula FK
    string clave FK
    date inicio
    date fin
    string motivo
  }
  INVITACION {
    int folio FK
    string matricula FK
    boolean aceptada
    date respondidaEn
  }`,
    ],

    // La trampa cambia una sola cosa respecto del código inicial: la relación
    // entre la reserva y sus invitaciones pasa a tener pata de gallo en los dos
    // extremos. El modelo deja de poder llevarse a tablas y, además, afirma que
    // una misma invitación pertenece a varias reservas.
    diagramaTrampa: `erDiagram
  USUARIO {
    string matricula PK
    string nombre
  }
  SALA {
    string clave PK
    int capacidad
  }
  RESERVA {
    int folio PK
    string matricula FK
    string clave FK
    date inicio
    date fin
  }
  INVITACION {
    int folio FK
    string matricula FK
    boolean aceptada
  }
  USUARIO ||--o{ RESERVA : solicita
  SALA ||--o{ RESERVA : aloja
  RESERVA }o--o{ INVITACION : incluye
  USUARIO ||--o{ INVITACION : recibe`,
  },

  // =========================================================================
  // Flujo
  // =========================================================================
  {
    slug: 'ejemplo-resuelto-flujo-reserva',
    titulo: 'Ejemplo resuelto: el procedimiento de reservar una sala',
    categoria: 'Ejemplo resuelto',
    bloque: 'Punto de partida',
    nivel: 'guiado',
    esEjemplo: true,
    orden: 5,
    motor: 'mermaid',
    tipoDiagrama: 'flujo',

    problema:
      'El diagrama de secuencia del caso describe una ejecución concreta que sale bien: el usuario elige una ' +
      'sala libre y recibe su confirmación. El procedimiento real tiene además los desenlaces que esa ' +
      'ejecución no muestra, porque la sala puede estar ocupada y la reserva puede quedarse sin confirmar. ' +
      'El diagrama de flujo describe el procedimiento completo, con sus bifurcaciones, y lo hace sin ' +
      'mencionar qué objeto ejecuta cada paso.',
    procedencia: PROCEDENCIA_FLUJO,
    encaje:
      'Es la quinta y última pieza del punto de partida. Se lee antes de construir el primer diagrama de ' +
      'flujo propio, en la categoría de Comportamiento. La pregunta que responde es "en qué orden se hacen ' +
      'las cosas y de qué depende"; quién hace cada paso corresponde al diagrama de secuencia, y en qué ' +
      'situación queda la reserva después, a la máquina de estados. Los dos desenlaces del segundo rombo ' +
      'son, precisamente, dos de los estados de esa máquina.',
    anatomia: ANATOMIA_FLUJO,
    otrosUsos: OTROS_USOS_FLUJO,
    erroresTipicos: [
      'Dibujar una bifurcación como rectángulo. La forma indica el papel del nodo: el rombo anuncia que de ahí salen varios caminos, y el rectángulo anuncia lo contrario.',
      'Dejar una rama sin rótulo. El diagrama muestra que hay dos caminos y calla cuándo se toma cada uno.',
      'Dibujar una decisión con una sola salida. O sobra el rombo, porque no hay bifurcación, o falta la rama que no se dibujó.',
      'Dejar un ciclo del que no sale ninguna rama. El bucle que devuelve a la captura de la franja horaria es legítimo porque la decisión que lo precede permite abandonarlo.',
      'Dejar un paso sin ninguna flecha de entrada. Nunca se ejecuta, y su presencia sugiere que el procedimiento hace algo que en realidad no hace.',
      'Formular la condición como una acción («Comprobar disponibilidad») en vez de como una pregunta cuya respuesta distingue las ramas.',
    ],
    queDibujas:
      'Nada: el diagrama de flujo del caso viene ya completo y correcto en el editor. Describe el ' +
      'procedimiento de reservar una sala de principio a fin: captura de la sala y la franja horaria, ' +
      'decisión sobre la disponibilidad —con vuelta a la captura cuando la sala está ocupada—, registro de ' +
      'la reserva, envío de invitaciones y decisión sobre la confirmación, con sus dos desenlaces. ' +
      CIERRE_QUE_DIBUJAS,
    pasoAPaso: [
      'Localiza los dos rombos del diagrama y comprueba que cada uno tiene dos salidas y que las cuatro están rotuladas.',
      'Sigue la rama negativa del primer rombo: lleva a mostrar franjas alternativas y de ahí vuelve al paso de captura. Es un bucle, y tiene salida porque la decisión que lo cierra puede tomar la otra rama.',
      'Sigue los dos desenlaces del segundo rombo y compáralos con la máquina de estados de la sección anterior: uno corresponde a la reserva confirmada y el otro, a la caducada.',
      'Comprueba que a todos los nodos llega alguna flecha desde el terminal de inicio, y que desde todos se puede llegar al terminal de fin.',
      'Observa que el diagrama no nombra ninguna clase ni ningún objeto. Un diagrama de flujo describe el procedimiento, no el reparto de responsabilidades.',
      'Envía el diagrama tal como está y lee el informe.',
      'Cambia `C{La sala esta libre?}` por `C[La sala esta libre?]` y vuelve a enviar. Falla la comprobación de forma: el mismo texto dentro de un rectángulo describe un paso del que se sale por un único camino.',
      'Recarga la página para recuperar el diagrama original.',
    ],
    sintaxis: SINTAXIS_FLUJO,

    codigoInicial: FLUJO,
    diagramasContexto: [CONTEXTO_CLASES],

    aserciones: [
      { tipo: 'nodo-con-forma', parametros: { nombre: 'Inicio', forma: 'inicio-fin' } },
      { tipo: 'nodo-con-forma', parametros: { nombre: 'Fin', forma: 'inicio-fin' } },
      { tipo: 'nodo-con-forma', parametros: { nombre: 'La sala esta libre?', forma: 'decision' } },
      { tipo: 'nodo-con-forma', parametros: { nombre: 'Se confirmo la reserva?', forma: 'decision' } },
      {
        tipo: 'paso-de-flujo',
        parametros: {
          desde: 'La sala esta libre?', hasta: 'Registrar la reserva como pendiente', etiqueta: 'si',
        },
      },
      {
        tipo: 'paso-de-flujo',
        parametros: { desde: 'La sala esta libre?', hasta: 'Mostrar franjas alternativas', etiqueta: 'no' },
      },
      {
        tipo: 'paso-de-flujo',
        parametros: { desde: 'Se confirmo la reserva?', hasta: 'Mostrar la confirmacion', etiqueta: 'si' },
      },
      {
        tipo: 'paso-de-flujo',
        parametros: { desde: 'Se confirmo la reserva?', hasta: 'Caducar la reserva', etiqueta: 'no' },
      },
      { tipo: 'existe-nodo', parametros: { nombre: 'Enviar invitaciones' } },
      { tipo: 'decisiones-con-salidas' },
      { tipo: 'flujo-termina' },
      { tipo: 'nodos-alcanzables' },
      { tipo: 'conteo-nodos', parametros: { min: 8 } },
      { tipo: 'sin-nombres-vagos', oculta: true },
      { tipo: 'sin-relaciones-duplicadas', oculta: true },
    ],

    diagramasReferencia: [
      FLUJO,
      // Otro procedimiento válido para el mismo caso: autentica al usuario antes
      // de empezar, anota la reserva confirmada en la agenda de la sala, libera
      // la franja cuando la reserva caduca y se dibuja de izquierda a derecha.
      `flowchart LR
  N([Inicio]) --> S[Autenticar al usuario]
  S --> P[Capturar sala y franja horaria]
  P --> L{La sala esta libre?}
  L -- no --> V[Mostrar franjas alternativas]
  V --> P
  L -- si --> R[Registrar la reserva como pendiente]
  R --> E[Enviar invitaciones]
  E --> Q{Se confirmo la reserva?}
  Q -- si --> M[Mostrar la confirmacion]
  M --> W[Anotar la reserva en la agenda de la sala]
  W --> F([Fin])
  Q -- no --> K[Caducar la reserva]
  K --> T[Liberar la franja horaria]
  T --> F`,
    ],

    // La trampa cambia una sola cosa respecto del código inicial: el primer
    // rombo pasa a ser un rectángulo. El texto es el mismo y el dibujo sigue
    // teniendo dos salidas, pero la forma declara un paso, no una bifurcación.
    diagramaTrampa: `flowchart TD
  A([Inicio]) --> B[Capturar sala y franja horaria]
  B --> C[La sala esta libre?]
  C -- no --> D[Mostrar franjas alternativas]
  D --> B
  C -- si --> E[Registrar la reserva como pendiente]
  E --> F[Enviar invitaciones]
  F --> G{Se confirmo la reserva?}
  G -- si --> H[Mostrar la confirmacion]
  G -- no --> I[Caducar la reserva]
  H --> Z([Fin])
  I --> Z`,
  },
];

export default ejercicios;
