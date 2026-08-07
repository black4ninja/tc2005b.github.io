import type { EjercicioDiagramaDef } from './tipos.js';

/**
 * Categoría "Interacción": la vista dinámica del diseño.
 *
 * Los tres niveles atacan errores documentados en trabajos de alumnos, en orden
 * de dificultad creciente: la línea de vida que nombra un tipo en lugar de una
 * instancia y el mensaje síncrono que se queda sin retorno; el mensaje dirigido
 * a una operación que el diagrama de clases no declara; y, por último, la
 * corrección de una interacción que acumula activaciones sin cerrar y nombres
 * que no existen en la estructura.
 *
 * Dos de los tres ejercicios se comprueban CONTRA UN DIAGRAMA DE CLASES DADO.
 * Esa es la comprobación que importa: el error dominante medido en alumnos no es
 * de notación local —una flecha mal dibujada— sino de trazabilidad, y solo se ve
 * cuando el diagrama de secuencia se lee junto a la estructura que dice realizar.
 */

const ANATOMIA = [
  { elemento: 'Cabecera de participante', significado: 'La caja superior de una columna. Declara quién interviene en la interacción.' },
  { elemento: 'Línea de vida', significado: 'La línea vertical que baja desde la cabecera. Representa a **una instancia concreta** mientras dura la interacción, no a su clase. El tiempo avanza hacia abajo.' },
  { elemento: 'Actor', significado: 'Un participante externo al sistema, normalmente la persona que inicia la interacción.' },
  { elemento: 'Barra de activación', significado: 'El rectángulo estrecho sobre la línea de vida. Marca el intervalo en que esa instancia tiene el control y está ejecutando algo. Se abre cuando lo recibe y se cierra cuando lo devuelve.' },
  { elemento: 'Mensaje síncrono `->>`', significado: 'Línea continua con punta rellena. El emisor **queda esperando** la respuesta, así que su ejecución se detiene ahí. Por eso todo síncrono exige un retorno.' },
  { elemento: 'Mensaje de retorno `-->>`', significado: 'Línea **discontinua**. Devuelve el control al emisor del síncrono y, si lo hay, el resultado. No es un mensaje nuevo: es la respuesta de uno anterior.' },
  { elemento: 'Mensaje asíncrono `-)`', significado: 'Línea continua con punta abierta. El emisor **sigue ejecutando** sin esperar respuesta, de modo que no lleva retorno. Es la forma de una notificación o de un evento.' },
  { elemento: 'Elección de la flecha', significado: 'En Mermaid no existe un mensaje por omisión: cada flecha se escribe de forma explícita, de modo que síncrono, retorno o asíncrono es siempre una decisión declarada y nunca un valor que ponga la herramienta.' },
  { elemento: 'Texto del mensaje', significado: 'El nombre de la operación que se invoca en el receptor, con sus argumentos. No es una frase libre: debe existir como operación de la clase que recibe el mensaje.' },
  { elemento: 'Orden vertical', significado: 'La única fuente de secuencia. Un mensaje dibujado más abajo ocurre después; no hay números que lo indiquen.' },
];

const SINTAXIS = [
  { para: 'Abrir el diagrama', escribes: 'sequenceDiagram' },
  { para: 'Declarar una línea de vida', escribes: 'participant perfilViewModel' },
  { para: 'Declarar un actor', escribes: 'actor usuario' },
  { para: 'Mensaje síncrono', escribes: 'vistaPerfil->>perfilViewModel: cargarPerfil(idUsuario)' },
  { para: 'Mensaje de retorno', escribes: 'perfilViewModel-->>vistaPerfil: perfil' },
  { para: 'Mensaje asíncrono', escribes: 'perfilViewModel-)vistaPerfil: mostrarPerfil(perfil)' },
  { para: 'Abrir y cerrar una activación', escribes: 'activate perfilViewModel … deactivate perfilViewModel' },
  { para: 'Abrir la activación con el propio mensaje', escribes: 'perfilViewModel->>+perfilRepositorio: obtenerPerfil(idUsuario)' },
  { para: 'Cerrarla con el retorno', escribes: 'perfilRepositorio-->>-perfilViewModel: perfil' },
  { para: 'Comentario que no se dibuja', escribes: '%% texto de la nota' },
];

/**
 * La filiación con los MSC está acotada a lo que se puede sostener con las
 * fuentes: UML 1.5 sí reconoce ese origen por escrito; UML 2.0 no lo cita.
 */
const PROCEDENCIA =
  'La notación procede de los *Message Sequence Charts*, normalizados por la ITU-T en la recomendación ' +
  'Z.120, aprobada en marzo de 1993 para especificar el intercambio de mensajes en sistemas de ' +
  'telecomunicaciones. La revisión de 1996 de esa recomendación introdujo las expresiones en línea, que ' +
  'permiten componer alternativas y repeticiones dentro del propio diagrama, y que son el antecedente de ' +
  'los fragmentos combinados de UML 2.0. Conviene acotar esa filiación a lo que puede documentarse: la ' +
  'especificación de UML 2.0 no cita los Message Sequence Charts entre sus fuentes, y quien sí reconoce ' +
  'ese origen por escrito es la especificación de UML 1.5.';

const OTROS_USOS =
  'La misma idea —quién habla con quién, en qué orden y quién espera respuesta— se usa fuera de UML ' +
  'siempre que hay que documentar un protocolo: el establecimiento de una conexión TCP, el flujo de ' +
  'autorización de OAuth y los intercambios de una pasarela de pago se publican con diagramas de esta ' +
  'forma. Las herramientas de trazado distribuido muestran una petición atravesando varios servicios con ' +
  'la misma lectura vertical, y los Message Sequence Charts siguen vigentes en telecomunicaciones.';

const ejercicios: EjercicioDiagramaDef[] = [
  // -------------------------------------------------------------------------
  {
    slug: 'secuencia-carga-perfil',
    titulo: 'Llamada y respuesta al cargar un perfil',
    categoria: 'Secuencia',
    bloque: 'Interacción',
    nivel: 'guiado',
    orden: 110,
    motor: 'mermaid',
    tipoDiagrama: 'secuencia',

    problema:
      'Una pantalla de perfil muestra los datos de una persona que están guardados en otro sitio. El ' +
      'diagrama de clases dice qué piezas existen —vista, modelo de vista, repositorio— pero no dice quién ' +
      'llama a quién ni en qué orden. El diagrama de secuencia responde a eso, y al hacerlo obliga a ' +
      'decidir algo que el diagrama de clases deja abierto: qué llamadas devuelven un resultado.',
    procedencia: PROCEDENCIA,
    encaje:
      'Se dibuja después del diagrama de clases y antes de escribir el código de un caso concreto. ' +
      'Responde a la pregunta "cómo colaboran estos objetos para conseguir esto"; qué existe y cómo se ' +
      'relaciona corresponde al diagrama de clases. Un diagrama de secuencia siempre documenta UN ' +
      'escenario, no todos los posibles.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Nombrar la línea de vida con el tipo en lugar de con la instancia. Es el error más frecuente medido en diagramas de secuencia de alumnos, y la especificación de UML lo prohíbe: una línea de vida representa un objeto concreto, no una clase. Abreviaturas como «V», «VM» o «R» tampoco identifican a nadie.',
      'Dibujar la llamada y olvidar la respuesta. Un mensaje síncrono deja al emisor esperando; sin el retorno, el diagrama no dice cuándo recupera el control.',
      'Usar la flecha del mensaje síncrono también para las respuestas. En Mermaid cada flecha se elige de forma explícita —no hay tipo por omisión— así que `->>` en una respuesta es una decisión, no un descuido de la herramienta.',
      'Colocar los mensajes en un orden que no es el de la ejecución. La posición vertical es la única fuente de secuencia.',
    ],
    queDibujas:
      'La interacción completa de la carga de un perfil, con tres líneas de vida: `vistaPerfil`, ' +
      '`perfilViewModel` y `perfilRepositorio`. La vista pide al modelo de vista que cargue el perfil, el ' +
      'modelo de vista se lo pide al repositorio, y cada llamada recibe su respuesta. Todos los mensajes ' +
      'de este ejercicio son síncronos y llevan retorno.',
    pasoAPaso: [
      'Declara las tres líneas de vida con `participant`. Los nombres son los de las instancias que participan, en minúscula inicial: `vistaPerfil`, `perfilViewModel`, `perfilRepositorio`.',
      'Dibuja el primer mensaje síncrono, de `vistaPerfil` a `perfilViewModel`, con el texto `cargarPerfil(idUsuario)`.',
      'Dibuja el segundo mensaje síncrono, de `perfilViewModel` a `perfilRepositorio`, con el texto `obtenerPerfil(idUsuario)`.',
      'Añade el retorno del repositorio al modelo de vista con la flecha discontinua `-->>`, y ponle como texto el resultado que devuelve, no el nombre de la operación.',
      'Añade el retorno del modelo de vista a la vista, también con `-->>`. Comprueba que cada flecha continua tenga por debajo su flecha discontinua.',
    ],
    sintaxis: SINTAXIS,

    codigoInicial: `sequenceDiagram
  participant vistaPerfil
  participant perfilViewModel
  participant perfilRepositorio
  vistaPerfil->>perfilViewModel: cargarPerfil(idUsuario)
  %% Falta la llamada de perfilViewModel a perfilRepositorio y los dos retornos.`,

    aserciones: [
      { tipo: 'existe-participante', parametros: { nombre: 'vistaPerfil' } },
      { tipo: 'existe-participante', parametros: { nombre: 'perfilViewModel' } },
      { tipo: 'existe-participante', parametros: { nombre: 'perfilRepositorio' } },
      {
        tipo: 'mensaje-entre',
        parametros: { de: 'vistaPerfil', a: 'perfilViewModel', texto: 'cargarPerfil', tipo: 'sincrono' },
      },
      {
        tipo: 'mensaje-entre',
        parametros: { de: 'perfilViewModel', a: 'perfilRepositorio', texto: 'obtenerPerfil', tipo: 'sincrono' },
      },
      { tipo: 'orden-de-mensajes', parametros: { mensajes: ['cargarPerfil', 'obtenerPerfil'] } },
      { tipo: 'mensajes-sincronos-con-retorno' },
      { tipo: 'lineas-vida-nombradas' },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `sequenceDiagram
  participant vistaPerfil
  participant perfilViewModel
  participant perfilRepositorio
  vistaPerfil->>perfilViewModel: cargarPerfil(idUsuario)
  perfilViewModel->>perfilRepositorio: obtenerPerfil(idUsuario)
  perfilRepositorio-->>perfilViewModel: perfil
  perfilViewModel-->>vistaPerfil: perfil`,
      // Otra solución válida: un actor que abre la pantalla, las líneas de vida
      // declaradas en orden inverso, activaciones con la forma abreviada y otros
      // textos de retorno.
      `sequenceDiagram
  actor usuario
  participant perfilRepositorio
  participant perfilViewModel
  participant vistaPerfil
  usuario->>vistaPerfil: abrirPantalla()
  vistaPerfil->>+perfilViewModel: cargarPerfil(id)
  perfilViewModel->>+perfilRepositorio: obtenerPerfil(id)
  perfilRepositorio-->>-perfilViewModel: datosDelPerfil
  perfilViewModel-->>-vistaPerfil: perfilListo
  vistaPerfil-->>usuario: pantallaActualizada`,
    ],

    // La trampa reúne los dos errores del nivel: una línea de vida abreviada a
    // una letra, que no identifica a ninguna instancia, y dos llamadas síncronas
    // que se quedan sin respuesta.
    diagramaTrampa: `sequenceDiagram
  participant vistaPerfil
  participant perfilViewModel
  participant R
  vistaPerfil->>perfilViewModel: cargarPerfil(idUsuario)
  perfilViewModel->>R: obtenerPerfil(idUsuario)`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'secuencia-perfil-remoto',
    titulo: 'Mensajes que existen en el diagrama de clases',
    categoria: 'Secuencia',
    bloque: 'Interacción',
    nivel: 'base',
    orden: 120,
    motor: 'mermaid',
    tipoDiagrama: 'secuencia',

    problema:
      'El diagrama de clases de la pantalla de perfil ya está decidido: cada clase declara las operaciones ' +
      'que sabe ejecutar. Un diagrama de secuencia que invoque `getPerfil` donde la clase declara ' +
      '`obtenerPerfil` describe un sistema que no existe. La coherencia entre las dos vistas no es una ' +
      'formalidad de notación: es lo que hace que el diseño pueda implementarse tal como está dibujado.',
    procedencia: PROCEDENCIA,
    encaje:
      'Este ejercicio se sitúa en el punto donde el diseño estructural y el de comportamiento tienen que ' +
      'coincidir. En UML el nombre de un mensaje es el de la operación que invoca en el receptor, de modo ' +
      'que el diagrama de secuencia solo puede usar el vocabulario que el diagrama de clases declara. La ' +
      'segunda decisión del ejercicio es dónde poner la frontera asíncrona: la interfaz de usuario no ' +
      'espera bloqueada al servicio remoto, mientras que el repositorio sí espera el resultado de la red.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Enviar un mensaje a una operación que la clase receptora no declara. Es el error dominante medido en trabajos de alumnos y solo se ve al leer las dos vistas juntas.',
      'Poner como línea de vida algo que no corresponde a ninguna clase del diseño, normalmente una abreviatura o un nombre inventado sobre la marcha.',
      'Dibujar como síncrona una notificación que el emisor no espera. Un mensaje síncrono detiene al emisor hasta la respuesta; usarlo para avisar a la vista describe una interfaz bloqueada.',
      'Dejar sin retorno las llamadas que sí esperan resultado, con lo que el diagrama no dice cuándo el repositorio recupera el control.',
    ],
    queDibujas:
      'La interacción de la carga del perfil sobre las cuatro instancias del diseño dado: `vistaPerfil`, ' +
      '`perfilViewModel`, el repositorio y `apiPerfil`. La vista avisa al modelo de vista de forma ' +
      'asíncrona; el modelo de vista pide el perfil al repositorio y el repositorio lo pide al servicio ' +
      'remoto, ambas veces con mensajes síncronos y su retorno; por último el modelo de vista notifica el ' +
      'resultado a la vista, otra vez de forma asíncrona. Cada mensaje debe llevar el nombre de una ' +
      'operación declarada en el diagrama de clases, y cada línea de vida el de una de sus clases, con ' +
      'minúscula inicial por tratarse de instancias.',
    sintaxis: SINTAXIS,

    diagramasContexto: [
      {
        nombre: 'clases',
        titulo: 'Diagrama de clases de la pantalla de perfil',
        tipo: 'clases',
        motor: 'mermaid',
        codigo: `classDiagram
  class VistaPerfil {
    +abrir() void
    +mostrarPerfil(perfil Perfil) void
    +mostrarError(mensaje String) void
  }
  class PerfilViewModel {
    +Perfil perfil
    +cargarPerfil(id String) void
  }
  class PerfilRepositorio {
    <<interface>>
    +obtenerPerfil(id String) Perfil
  }
  class PerfilRepositorioHttp {
    +String url
    +obtenerPerfil(id String) Perfil
  }
  class ApiPerfil {
    +consultarPerfil(id String) Respuesta
  }
  VistaPerfil --> PerfilViewModel
  PerfilViewModel --> PerfilRepositorio
  PerfilRepositorioHttp ..|> PerfilRepositorio
  PerfilRepositorioHttp --> ApiPerfil`,
      },
    ],

    codigoInicial: `sequenceDiagram
  participant vistaPerfil
  participant perfilViewModel
  participant perfilRepositorio
  participant apiPerfil
  %% Dibuja la interacción completa. Cada mensaje debe llamarse como la operación
  %% que declara la clase que lo recibe, y cada retorno usa la flecha -->>.`,

    aserciones: [
      { tipo: 'participante-existe-como-clase', parametros: { contexto: 'clases' } },
      { tipo: 'mensaje-existe-como-operacion', parametros: { contexto: 'clases' } },
      {
        tipo: 'mensaje-entre',
        parametros: { de: 'vistaPerfil', a: 'perfilViewModel', texto: 'cargarPerfil', tipo: 'asincrono' },
      },
      {
        tipo: 'mensaje-entre',
        parametros: { de: 'perfilViewModel', a: 'vistaPerfil', texto: 'mostrarPerfil', tipo: 'asincrono' },
      },
      {
        tipo: 'orden-de-mensajes',
        parametros: { mensajes: ['cargarPerfil', 'obtenerPerfil', 'consultarPerfil', 'mostrarPerfil'] },
      },
      { tipo: 'mensajes-sincronos-con-retorno' },
      { tipo: 'conteo-nodos', parametros: { clase: 'participante', min: 4 } },
      { tipo: 'lineas-vida-nombradas' },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `sequenceDiagram
  participant vistaPerfil
  participant perfilViewModel
  participant perfilRepositorio
  participant apiPerfil
  vistaPerfil-)perfilViewModel: cargarPerfil(idUsuario)
  perfilViewModel->>perfilRepositorio: obtenerPerfil(idUsuario)
  perfilRepositorio->>apiPerfil: consultarPerfil(idUsuario)
  apiPerfil-->>perfilRepositorio: respuesta
  perfilRepositorio-->>perfilViewModel: perfil
  perfilViewModel-)vistaPerfil: mostrarPerfil(perfil)`,
      // Otra solución válida: la instancia del repositorio es la implementación
      // concreta, aparece un actor que abre la pantalla, las líneas de vida se
      // declaran de dentro hacia fuera y las activaciones usan la forma abreviada.
      `sequenceDiagram
  actor usuario
  participant apiPerfil
  participant perfilRepositorioHttp
  participant perfilViewModel
  participant vistaPerfil
  usuario-)vistaPerfil: abrir()
  vistaPerfil-)perfilViewModel: cargarPerfil(id)
  perfilViewModel->>+perfilRepositorioHttp: obtenerPerfil(id)
  perfilRepositorioHttp->>+apiPerfil: consultarPerfil(id)
  apiPerfil-->>-perfilRepositorioHttp: perfilRemoto
  perfilRepositorioHttp-->>-perfilViewModel: perfilDelDominio
  perfilViewModel-)vistaPerfil: mostrarPerfil(perfilDelDominio)`,
    ],

    // La trampa cambia una sola cosa: el modelo de vista invoca «getPerfil», que
    // ninguna clase del diseño declara.
    diagramaTrampa: `sequenceDiagram
  participant vistaPerfil
  participant perfilViewModel
  participant perfilRepositorio
  participant apiPerfil
  vistaPerfil-)perfilViewModel: cargarPerfil(idUsuario)
  perfilViewModel->>perfilRepositorio: getPerfil(idUsuario)
  perfilRepositorio->>apiPerfil: consultarPerfil(idUsuario)
  apiPerfil-->>perfilRepositorio: respuesta
  perfilRepositorio-->>perfilViewModel: perfil
  perfilViewModel-)vistaPerfil: mostrarPerfil(perfil)`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'secuencia-corregir-guardado-perfil',
    titulo: 'Corregir el guardado de un perfil',
    categoria: 'Secuencia',
    bloque: 'Interacción',
    nivel: 'reto',
    orden: 130,
    motor: 'mermaid',
    tipoDiagrama: 'secuencia',

    problema:
      'El diagrama de partida describe cómo se guardan los cambios de un perfil y parece razonable a ' +
      'primera vista. Al leerlo junto al diagrama de clases y al seguir el control de arriba abajo ' +
      'aparecen cuatro defectos: una línea de vida abreviada que no corresponde a ninguna clase, un ' +
      'mensaje que invoca una operación inexistente, una llamada síncrona que nunca recibe respuesta y dos ' +
      'activaciones que se abren y no se cierran. Cada uno describe un sistema distinto del que el diseño ' +
      'dice tener.',
    procedencia: PROCEDENCIA,
    encaje:
      'Corregir un diagrama ajeno es la operación que más se repite en una revisión de diseño. Las ' +
      'activaciones son aquí lo que aporta el nivel: mientras los mensajes dicen quién llama a quién, la ' +
      'barra de activación dice durante cuánto tiempo cada instancia retiene el control, y una activación ' +
      'sin cerrar describe un objeto que nunca termina lo que empezó. Es también el diagrama que anticipa ' +
      'qué llamadas bloquean el hilo de la interfaz y cuáles no.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Abrir una activación con `activate` y no cerrarla. La barra queda abierta hasta el final del diagrama y describe una instancia que retiene el control para siempre.',
      'Cerrar una activación que no se había abierto, o cerrarlas en un orden que no respeta cómo se anidan las llamadas.',
      'Invocar una operación que la clase receptora no declara. El nombre del mensaje no es texto libre: identifica la operación del receptor.',
      'Poner como línea de vida una abreviatura que no corresponde a ninguna clase del diseño.',
      'Dejar sin retorno una llamada síncrona, con lo que el emisor queda esperando indefinidamente.',
    ],
    queDibujas:
      'El diagrama corregido. Sustituye la línea de vida abreviada por la instancia de la clase que ' +
      'corresponde, usa en cada mensaje el nombre de una operación declarada en el diagrama de clases, ' +
      'da su retorno a cada mensaje síncrono y cierra todas las activaciones que abras. Conserva el ' +
      'sentido del escenario: la vista avisa de forma asíncrona, las capas que esperan un resultado se ' +
      'llaman de forma síncrona y la confirmación vuelve a la vista de forma asíncrona.',
    sintaxis: SINTAXIS,

    diagramasContexto: [
      {
        nombre: 'clases',
        titulo: 'Diagrama de clases de la edición de perfil',
        tipo: 'clases',
        motor: 'mermaid',
        codigo: `classDiagram
  class VistaEdicionPerfil {
    +String textoNombre
    +mostrarConfirmacion() void
    +mostrarError(mensaje String) void
  }
  class EdicionPerfilViewModel {
    +Boolean guardando
    +guardarCambios(nombre String) void
  }
  class PerfilRepositorio {
    <<interface>>
    +actualizarPerfil(perfil Perfil) Perfil
  }
  class PerfilRepositorioHttp {
    +String url
    +actualizarPerfil(perfil Perfil) Perfil
  }
  class ApiPerfil {
    +enviarPerfil(perfil Perfil) Respuesta
  }
  class RegistroEventos {
    +registrar(evento String) void
  }
  VistaEdicionPerfil --> EdicionPerfilViewModel
  EdicionPerfilViewModel --> PerfilRepositorio
  EdicionPerfilViewModel --> RegistroEventos
  PerfilRepositorioHttp ..|> PerfilRepositorio
  PerfilRepositorioHttp --> ApiPerfil`,
      },
    ],

    // El punto de partida ES el diagrama defectuoso: el alumno lo corrige.
    codigoInicial: `sequenceDiagram
  participant vistaEdicionPerfil
  participant VM
  participant perfilRepositorioHttp
  participant apiPerfil
  vistaEdicionPerfil->>VM: guardarCambios(nombre)
  activate VM
  VM->>perfilRepositorioHttp: salvarPerfil(perfil)
  activate perfilRepositorioHttp
  perfilRepositorioHttp->>apiPerfil: enviarPerfil(perfil)
  perfilRepositorioHttp-->>VM: perfilActualizado
  VM->>vistaEdicionPerfil: mostrarConfirmacion()`,

    aserciones: [
      { tipo: 'activaciones-balanceadas' },
      { tipo: 'participante-existe-como-clase', parametros: { contexto: 'clases' } },
      { tipo: 'mensaje-existe-como-operacion', parametros: { contexto: 'clases' } },
      { tipo: 'mensajes-sincronos-con-retorno' },
      {
        tipo: 'mensaje-entre',
        parametros: {
          de: 'edicionPerfilViewModel', a: 'vistaEdicionPerfil',
          texto: 'mostrarConfirmacion', tipo: 'asincrono',
        },
      },
      {
        tipo: 'orden-de-mensajes',
        parametros: { mensajes: ['guardarCambios', 'actualizarPerfil', 'enviarPerfil', 'mostrarConfirmacion'] },
      },
      { tipo: 'conteo-nodos', parametros: { clase: 'participante', min: 4 } },
      { tipo: 'lineas-vida-nombradas' },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `sequenceDiagram
  participant vistaEdicionPerfil
  participant edicionPerfilViewModel
  participant perfilRepositorioHttp
  participant apiPerfil
  vistaEdicionPerfil-)edicionPerfilViewModel: guardarCambios(nombre)
  activate edicionPerfilViewModel
  edicionPerfilViewModel->>perfilRepositorioHttp: actualizarPerfil(perfil)
  activate perfilRepositorioHttp
  perfilRepositorioHttp->>apiPerfil: enviarPerfil(perfil)
  activate apiPerfil
  apiPerfil-->>perfilRepositorioHttp: respuesta
  deactivate apiPerfil
  perfilRepositorioHttp-->>edicionPerfilViewModel: perfilActualizado
  deactivate perfilRepositorioHttp
  edicionPerfilViewModel-)vistaEdicionPerfil: mostrarConfirmacion()
  deactivate edicionPerfilViewModel`,
      // Otra solución válida: el repositorio aparece por su interfaz, se registra
      // el evento en una quinta instancia, las líneas de vida se declaran de
      // dentro hacia fuera y las activaciones usan la forma abreviada.
      `sequenceDiagram
  participant apiPerfil
  participant registroEventos
  participant perfilRepositorio
  participant edicionPerfilViewModel
  participant vistaEdicionPerfil
  vistaEdicionPerfil-)edicionPerfilViewModel: guardarCambios(nombreNuevo)
  activate edicionPerfilViewModel
  edicionPerfilViewModel->>+perfilRepositorio: actualizarPerfil(perfil)
  perfilRepositorio->>+apiPerfil: enviarPerfil(perfil)
  apiPerfil-->>-perfilRepositorio: respuestaHttp
  perfilRepositorio-->>-edicionPerfilViewModel: perfilConfirmado
  edicionPerfilViewModel-)registroEventos: registrar(perfilGuardado)
  edicionPerfilViewModel-)vistaEdicionPerfil: mostrarConfirmacion()
  deactivate edicionPerfilViewModel`,
    ],

    // La trampa es el propio diagrama de partida, sin corregir.
    diagramaTrampa: `sequenceDiagram
  participant vistaEdicionPerfil
  participant VM
  participant perfilRepositorioHttp
  participant apiPerfil
  vistaEdicionPerfil->>VM: guardarCambios(nombre)
  activate VM
  VM->>perfilRepositorioHttp: salvarPerfil(perfil)
  activate perfilRepositorioHttp
  perfilRepositorioHttp->>apiPerfil: enviarPerfil(perfil)
  perfilRepositorioHttp-->>VM: perfilActualizado
  VM->>vistaEdicionPerfil: mostrarConfirmacion()`,
  },
];

export default ejercicios;
