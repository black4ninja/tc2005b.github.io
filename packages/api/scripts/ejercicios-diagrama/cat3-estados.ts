import type { EjercicioDiagramaDef } from './tipos.js';

/**
 * Categoría "Comportamiento": la máquina de estados.
 *
 * Los tres niveles atacan errores documentados en trabajos de alumnos, en orden
 * de dificultad creciente: dibujar un estado al que no se puede llegar; dejar un
 * callejón sin salida y resolver mal una bifurcación, que deja la máquina no
 * determinista; y, en el reto, la trazabilidad con el diagrama de clases —los
 * disparadores inventados, que es el defecto medido con más frecuencia— junto
 * con el nodo que en realidad es una actividad disfrazada de estado.
 */

const ANATOMIA = [
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
      'Situación estable en la que el objeto permanece **mientras espera un evento**. Se nombra con un adjetivo o un participio —`Cargando`, `Activa`, `Pausada`—, no con un verbo en infinitivo, que describiría una acción y no una situación.',
  },
  {
    elemento: 'Flecha de transición',
    significado:
      'Paso de un estado a otro. Es instantánea: el tiempo transcurre dentro de los estados, nunca sobre las flechas.',
  },
  {
    elemento: 'Disparador',
    significado:
      'El evento que provoca la transición. Va al principio de la etiqueta y es lo único que se compara: `pulsar` en `pulsar [hayRed] / cargar()`.',
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
      'No lleva disparador, y es correcto que no lo lleve: es una **transición de terminación**, que se toma cuando el estado de origen ha completado su actividad, sin que nadie tenga que provocarla desde fuera. Por eso las comprobaciones no le exigen evento.',
  },
  {
    elemento: 'Autotransición',
    significado:
      'Transición de un estado a sí mismo: el evento se atiende y el objeto vuelve a quedar en la misma situación, por ejemplo al recibir un bloque más de datos.',
  },
];

const SINTAXIS = [
  { para: 'Abrir el diagrama', escribes: 'stateDiagram-v2' },
  { para: 'Pseudoestado inicial', escribes: '[*] --> Inactiva' },
  { para: 'Pseudoestado final', escribes: 'Contenido --> [*]' },
  { para: 'Transición con disparador', escribes: 'Inactiva --> Cargando : abrir' },
  { para: 'Disparador con guarda', escribes: 'Cargando --> Contenido : datosRecibidos [hayDatos]' },
  { para: 'Disparador con guarda y acción', escribes: 'Cargando --> Error : fallo [sinRed] / registrar()' },
  { para: 'Autotransición', escribes: 'EnCurso --> EnCurso : recibirBloque' },
  { para: 'Estado con etiqueta visible distinta del identificador', escribes: 'state "En curso" as EnCurso' },
  { para: 'Comentario', escribes: '%% esto no se dibuja' },
];

const PROCEDENCIA =
  'El formalismo procede de los *statecharts* que David Harel publicó en 1987 en *Science of Computer ' +
  'Programming*, como extensión de las máquinas de estados finitos con jerarquía, concurrencia y difusión ' +
  'de eventos. La propia especificación de UML reconoce que sus máquinas de estados son una variante ' +
  'orientada a objetos de ese formalismo, con diferencias semánticas respecto del original. Harel narró el ' +
  'origen industrial del trabajo —surgió del desarrollo de la aviónica de un avión de combate— en un ' +
  'artículo presentado en la tercera conferencia History of Programming Languages (HOPL III, 2007). La ' +
  'misma idea se formalizó después fuera de UML en SCXML, recomendación del W3C.';

const OTROS_USOS =
  'La misma idea aparece siempre que un objeto tiene un ciclo de vida discreto. En desarrollo móvil, en el ' +
  'tipo sellado que representa el estado de una pantalla y que la vista consume; en las bibliotecas de ' +
  'máquinas de estados de la interfaz, como XState; en los protocolos de red descritos por estados, como ' +
  'la conexión TCP; en los flujos de pedido de cualquier sistema de comercio; y en los motores de diálogo ' +
  'escritos en SCXML.';

const ejercicios: EjercicioDiagramaDef[] = [
  // -------------------------------------------------------------------------
  {
    slug: 'estados-carga-pantalla',
    titulo: 'Ciclo de una pantalla que carga datos',
    categoria: 'Estados',
    bloque: 'Comportamiento',
    nivel: 'guiado',
    orden: 210,
    motor: 'mermaid',
    tipoDiagrama: 'estados',

    problema:
      'Una pantalla de una aplicación móvil que pide datos a un servicio no tiene dos situaciones posibles, ' +
      'sino cuatro: todavía no ha pedido nada, está esperando la respuesta, ha recibido contenido o ha ' +
      'fallado. El defecto habitual no es olvidar una de ellas, sino dibujarla sin ninguna flecha que llegue ' +
      'a ella: el estado aparece en el diagrama y la ejecución nunca puede entrar en él.',
    procedencia: PROCEDENCIA,
    encaje:
      'La máquina de estados se dibuja cuando ya se sabe qué clases existen y hace falta describir cómo se ' +
      'comporta una de ellas a lo largo del tiempo. Responde a la pregunta "en qué situaciones puede estar ' +
      'este objeto y qué lo hace pasar de una a otra"; el reparto de responsabilidades entre objetos ' +
      'corresponde al diagrama de secuencia y la estructura al de clases.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Dibujar un estado al que no llega ninguna transición. Si no hay camino desde el pseudoestado inicial hasta él, ese estado no existe en la ejecución y sobra en el diagrama.',
      'Olvidar el pseudoestado inicial. Sin él no se sabe en qué situación arranca el objeto, y tampoco se puede decidir qué es alcanzable.',
      'Modelar el error como una salida definitiva. Un fallo de red es una situación de la que se vuelve; sin transición de retorno, la pantalla queda inservible.',
      'Nombrar los estados con verbos en infinitivo, como `Cargar`. Un estado describe una situación, no una acción.',
    ],
    queDibujas:
      'La máquina de estados de la pantalla. Debe arrancar en un estado previo a la petición, pasar a un ' +
      'estado de espera, y desde ahí llegar tanto al contenido como al error. Desde el error se tiene que ' +
      'poder volver a intentar la carga, y desde el contenido se tiene que poder terminar. Ningún estado ' +
      'puede quedar sin forma de llegar a él.',
    pasoAPaso: [
      'Declara el arranque con `[*] --> Inactiva`: la pantalla existe pero todavía no ha pedido nada.',
      'Añade la transición `Inactiva --> Cargando : abrir`, que es la que provoca la petición.',
      'Desde `Cargando` salen dos caminos, uno por cada desenlace de la petición: `datosRecibidos` lleva a `Contenido` y `fallo` lleva a `Error`. Los dos disparadores tienen que ser distintos.',
      'Añade la vuelta desde el fallo con `Error --> Cargando : reintentar`. Sin ella, `Error` sería una salida definitiva.',
      'Cierra la máquina con `Contenido --> [*]`. Esta flecha no lleva disparador porque es una transición de terminación.',
      'Repasa el diagrama estado por estado y comprueba que a cada uno llega al menos una flecha desde algún estado alcanzable.',
    ],
    sintaxis: SINTAXIS,

    codigoInicial: `stateDiagram-v2
  [*] --> Inactiva
  Inactiva --> Cargando : abrir
  %% Faltan los dos desenlaces de la carga, la vuelta desde el error y el
  %% cierre de la máquina. Ningún estado debe quedar sin forma de llegar a él.`,

    aserciones: [
      { tipo: 'tiene-estado-inicial' },
      { tipo: 'existe-estado', parametros: { nombre: 'Cargando' } },
      { tipo: 'existe-estado', parametros: { nombre: 'Error' } },
      { tipo: 'transicion', parametros: { desde: 'Cargando', hasta: 'Error', etiqueta: 'fallo' } },
      { tipo: 'transicion', parametros: { desde: 'Error', hasta: 'Cargando', etiqueta: 'reintentar' } },
      { tipo: 'estados-alcanzables' },
      { tipo: 'sin-callejones' },
      { tipo: 'transiciones-con-evento' },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `stateDiagram-v2
  [*] --> Inactiva
  Inactiva --> Cargando : abrir
  Cargando --> Contenido : datosRecibidos
  Cargando --> Error : fallo
  Error --> Cargando : reintentar
  Contenido --> [*]`,
      // Otra solución válida: distingue la respuesta vacía de la respuesta con
      // contenido y permite refrescar sin salir de la pantalla.
      `stateDiagram-v2
  [*] --> Inactiva
  Inactiva --> Cargando : abrir
  Cargando --> Error : fallo
  Cargando --> Contenido : datosRecibidos
  Cargando --> Vacio : sinResultados
  Error --> Cargando : reintentar
  Vacio --> Cargando : refrescar
  Contenido --> Cargando : refrescar
  Contenido --> [*]`,
    ],

    // La trampa dibuja un estado de reintento al que no llega ninguna flecha:
    // el resto del modelo es correcto y aun así ese estado es inalcanzable.
    diagramaTrampa: `stateDiagram-v2
  [*] --> Inactiva
  Inactiva --> Cargando : abrir
  Cargando --> Contenido : datosRecibidos
  Cargando --> Error : fallo
  Error --> Cargando : reintentar
  Reintentando --> Cargando : reintentar
  Contenido --> [*]`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'estados-sesion-usuario',
    titulo: 'Sesión de usuario: caducidad y salida',
    categoria: 'Estados',
    bloque: 'Comportamiento',
    nivel: 'base',
    orden: 220,
    motor: 'mermaid',
    tipoDiagrama: 'estados',

    problema:
      'La sesión de una aplicación móvil no se limita a estar abierta o cerrada: hay un intervalo en el que ' +
      'la autenticación está en curso y otro en el que el testigo de acceso ya caducó pero el usuario sigue ' +
      'dentro de la aplicación. Los dos defectos que aparecen al modelarla son opuestos entre sí: dejar la ' +
      'sesión caducada sin ninguna salida, de modo que la ejecución queda atrapada, y resolver la ' +
      'autenticación con dos flechas rotuladas con el mismo evento, de modo que la máquina no decide.',
    procedencia: PROCEDENCIA,
    encaje:
      'Este diagrama se dibuja antes de programar la capa de autenticación y se convierte casi directamente ' +
      'en código: cada estado es un caso del tipo que la vista observa y cada transición, un método del ' +
      'gestor de sesión. Un estado sin salida o una bifurcación ambigua en el diagrama se traducen en un ' +
      'defecto real en la aplicación.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Dejar un callejón sin salida: se entra en un estado y desde él ya no hay ningún camino hasta el final. La ejecución queda atrapada y la aplicación deja de responder a lo que el usuario haga.',
      'Rotular dos transiciones que salen del mismo estado con el mismo disparador y sin guardas. La máquina no puede decidir cuál tomar, y la especificación de UML considera mal formado ese modelo.',
      'Confundir "sin sesión" con "sesión caducada". Son situaciones distintas: de la segunda se puede volver renovando el testigo, de la primera hay que autenticarse de nuevo.',
      'Rotular con el resultado en vez de con el evento. `respuesta` no distingue el éxito del fracaso; `credencialesValidas` y `credencialesInvalidas` sí.',
      'Omitir el pseudoestado final. Sin él no hay forma de comprobar si algún estado quedó atrapado.',
    ],
    queDibujas:
      'La máquina de estados de la sesión. Debe cubrir el arranque sin sesión, la autenticación en curso con ' +
      'sus dos desenlaces, la sesión activa, la caducidad del testigo y el cierre de la máquina. Desde la ' +
      'sesión caducada tiene que existir algún camino hasta el final, y ningún estado puede tener dos ' +
      'salidas con el mismo disparador.',
    sintaxis: SINTAXIS,

    codigoInicial: `stateDiagram-v2
  [*] --> Anonima
  Anonima --> Autenticando : iniciarSesion
  Autenticando --> Activa : credencialesValidas
  %% Falta el desenlace negativo de la autenticación, la caducidad del testigo,
  %% la recuperación desde la caducidad y el cierre de la máquina.`,

    aserciones: [
      { tipo: 'tiene-estado-inicial' },
      { tipo: 'existe-estado', parametros: { nombre: 'Autenticando' } },
      { tipo: 'existe-estado', parametros: { nombre: 'Activa' } },
      { tipo: 'existe-estado', parametros: { nombre: 'Caducada' } },
      { tipo: 'transicion', parametros: { desde: 'Anonima', hasta: 'Autenticando', etiqueta: 'iniciarSesion' } },
      { tipo: 'transicion', parametros: { desde: 'Activa', hasta: 'Caducada', etiqueta: 'expiraToken' } },
      { tipo: 'estados-alcanzables' },
      { tipo: 'sin-callejones' },
      { tipo: 'transiciones-deterministas' },
      { tipo: 'transiciones-con-evento' },
      { tipo: 'sin-nombres-vagos', oculta: true },
      { tipo: 'sin-relaciones-duplicadas', oculta: true },
    ],

    diagramasReferencia: [
      `stateDiagram-v2
  [*] --> Anonima
  Anonima --> Autenticando : iniciarSesion
  Autenticando --> Activa : credencialesValidas
  Autenticando --> Anonima : credencialesInvalidas
  Activa --> Caducada : expiraToken
  Caducada --> Autenticando : renovar
  Activa --> [*] : cerrarSesion
  Caducada --> [*] : cerrarSesion`,
      // Otra solución válida: añade el bloqueo por intentos fallidos y renueva
      // el testigo sin pasar de nuevo por la autenticación.
      `stateDiagram-v2
  [*] --> Anonima
  Anonima --> Autenticando : iniciarSesion
  Autenticando --> Activa : credencialesValidas
  Autenticando --> Anonima : credencialesInvalidas
  Autenticando --> Bloqueada : demasiadosIntentos
  Bloqueada --> Anonima : desbloquear
  Activa --> Caducada : expiraToken
  Caducada --> Activa : renovarToken
  Activa --> [*] : cerrarSesion
  Caducada --> [*] : cerrarSesion`,
    ],

    // La trampa comete los dos defectos del nivel: «Caducada» no tiene ninguna
    // salida, y «Autenticando» resuelve sus dos desenlaces con el mismo
    // disparador «responde».
    diagramaTrampa: `stateDiagram-v2
  [*] --> Anonima
  Anonima --> Autenticando : iniciarSesion
  Autenticando --> Activa : responde
  Autenticando --> Anonima : responde
  Activa --> Caducada : expiraToken
  Activa --> [*] : cerrarSesion`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'estados-descarga-adjunto',
    titulo: 'Descarga de un adjunto, coherente con sus clases',
    categoria: 'Estados',
    bloque: 'Comportamiento',
    nivel: 'reto',
    orden: 230,
    motor: 'mermaid',
    tipoDiagrama: 'estados',

    problema:
      'La clase `Descarga` ya está definida y declara las operaciones con las que se la puede manejar. La ' +
      'máquina de estados que describe su ciclo de vida no puede inventar eventos: un disparador que no ' +
      'corresponde a ninguna operación del clasificador describe un comportamiento que nadie puede provocar, ' +
      'y rompe la trazabilidad entre el comportamiento y la estructura. El modelo de partida contiene además ' +
      'un nodo que parece un estado y no lo es.',
    procedencia: PROCEDENCIA,
    encaje:
      'Es la comprobación que cierra el ciclo entre las dos vistas: la estructura declara qué se le puede ' +
      'pedir al objeto y el comportamiento declara cuándo tiene sentido pedírselo. Cuando ambas vistas se ' +
      'escriben por separado y nadie las confronta, la documentación describe un sistema que no existe.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Inventar disparadores. Un disparador nombra un evento que la clase asociada sabe recibir, así que tiene que corresponder a una de sus operaciones. `usuarioTocaBoton` describe un gesto de la interfaz, no una operación del modelo.',
      'Dibujar una actividad como si fuera un estado. El criterio operativo es directo: **si el nodo no espera un evento, no es un estado**. Los pseudoestados son de paso y los estados son vértices estables; un nodo del que se sale sin que ocurra nada es un paso de flujo, y ese paso pertenece a la acción de una transición o a un diagrama de actividad, no aquí.',
      'Duplicar un estado con dos nombres distintos para la misma situación, por ejemplo `Fallida` y `ConError`.',
      'Olvidar que la cancelación es posible desde varias situaciones, y dejarla como salida de un solo estado.',
    ],
    queDibujas:
      'La máquina de estados de `Descarga`, corrigiendo el modelo de partida. Cada disparador debe ser una ' +
      'operación declarada por la clase `Descarga` en el diagrama que se proporciona. Todo nodo que dibujes ' +
      'como estado tiene que esperar un evento: si sales de él sin que ocurra nada, no es un estado y ' +
      'corresponde eliminarlo. Deben poder alcanzarse la terminación correcta, el fallo con posibilidad de ' +
      'reintento y la cancelación, y ninguna situación puede quedar atrapada.',
    sintaxis: SINTAXIS,

    diagramasContexto: [
      {
        nombre: 'descarga-clases',
        titulo: 'Diagrama de clases del módulo de descargas',
        tipo: 'clases',
        motor: 'mermaid',
        codigo: `classDiagram
  class Descarga {
    +String idAdjunto
    +Int porcentaje
    +iniciar()
    +pausar()
    +reanudar()
    +cancelar()
    +reintentar()
    +recibirBloque(bytes Int)
    +completar()
    +fallar()
  }
  class Adjunto {
    +String nombre
    +Int tamanioBytes
  }
  Descarga "0..*" --> "1" Adjunto : descarga`,
      },
    ],

    // El punto de partida ES el modelo defectuoso: el alumno lo corrige.
    codigoInicial: `stateDiagram-v2
  [*] --> Pendiente
  Pendiente --> EnCurso : iniciar
  EnCurso --> Completada : completar
  EnCurso --> Fallida : fallar
  EnCurso --> Cancelada : cancelar
  Fallida --> Reintentando : usuarioTocaBoton
  Reintentando --> EnCurso
  Completada --> [*]
  Cancelada --> [*]`,

    aserciones: [
      { tipo: 'tiene-estado-inicial' },
      { tipo: 'existe-estado', parametros: { nombre: 'Pendiente' } },
      { tipo: 'existe-estado', parametros: { nombre: 'EnCurso' } },
      { tipo: 'existe-estado', parametros: { nombre: 'Completada' } },
      { tipo: 'existe-estado', parametros: { nombre: 'Fallida' } },
      { tipo: 'existe-estado', parametros: { nombre: 'Cancelada' } },
      { tipo: 'transicion', parametros: { desde: 'Pendiente', hasta: 'EnCurso', etiqueta: 'iniciar' } },
      { tipo: 'transicion', parametros: { desde: 'EnCurso', hasta: 'Completada', etiqueta: 'completar' } },
      { tipo: 'transicion', parametros: { desde: 'EnCurso', hasta: 'Fallida', etiqueta: 'fallar' } },
      {
        tipo: 'disparador-existe-como-operacion',
        parametros: { contexto: 'descarga-clases', clasificador: 'Descarga' },
      },
      { tipo: 'transiciones-con-evento' },
      { tipo: 'estados-alcanzables' },
      { tipo: 'sin-callejones' },
      { tipo: 'transiciones-deterministas' },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `stateDiagram-v2
  [*] --> Pendiente
  Pendiente --> EnCurso : iniciar
  EnCurso --> EnCurso : recibirBloque
  EnCurso --> Pausada : pausar
  Pausada --> EnCurso : reanudar
  EnCurso --> Fallida : fallar
  Fallida --> EnCurso : reintentar
  EnCurso --> Completada : completar
  EnCurso --> Cancelada : cancelar
  Pausada --> Cancelada : cancelar
  Completada --> [*]
  Cancelada --> [*]`,
      // Otra solución válida: sin pausa, el reintento vuelve a dejar la descarga
      // pendiente y desde el fallo también se puede abandonar.
      `stateDiagram-v2
  [*] --> Pendiente
  Pendiente --> EnCurso : iniciar
  Pendiente --> Cancelada : cancelar
  EnCurso --> Completada : completar
  EnCurso --> Fallida : fallar
  EnCurso --> Cancelada : cancelar
  Fallida --> Pendiente : reintentar
  Fallida --> Cancelada : cancelar
  Completada --> [*]
  Cancelada --> [*]`,
    ],

    // La trampa es el propio modelo de partida: «Reintentando» no espera ningún
    // evento —es una actividad disfrazada de estado— y «usuarioTocaBoton» no es
    // una operación de «Descarga».
    diagramaTrampa: `stateDiagram-v2
  [*] --> Pendiente
  Pendiente --> EnCurso : iniciar
  EnCurso --> Completada : completar
  EnCurso --> Fallida : fallar
  EnCurso --> Cancelada : cancelar
  Fallida --> Reintentando : usuarioTocaBoton
  Reintentando --> EnCurso
  Completada --> [*]
  Cancelada --> [*]`,
  },
];

export default ejercicios;
