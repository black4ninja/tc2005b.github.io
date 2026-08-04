import type { EjercicioDiagramaDef } from './tipos.js';

/**
 * Categoría "Flujo": el orden en que se ejecutan los pasos de un procedimiento.
 *
 * Los tres niveles atacan errores documentados en trabajos de alumnos, en orden
 * de dificultad creciente: dibujar una bifurcación como rectángulo, dejar una
 * decisión sin ramas rotuladas, y entregar un flujo con nodos inalcanzables o
 * con caminos que no pueden terminar.
 *
 * Aviso de precisión que este material sostiene en todos sus textos: Mermaid
 * dibuja diagramas de FLUJO, no diagramas de actividad de UML. Son notaciones
 * emparentadas pero distintas, y atribuir a UML lo que pertenece al diagrama de
 * flujo es uno de los errores de vocabulario más extendidos en la bibliografía
 * de aula.
 */

const ANATOMIA = [
  { elemento: 'Óvalo (o rectángulo redondeado)', significado: 'Terminal: dónde empieza y dónde termina el procedimiento.' },
  { elemento: 'Rectángulo', significado: 'Un paso: una acción que se ejecuta sin bifurcarse.' },
  { elemento: 'Rombo', significado: 'Una decisión: el punto donde el flujo se bifurca según una condición.' },
  { elemento: 'Rótulo de la rama', significado: 'La condición bajo la que se toma esa salida. Sin rótulo, el diagrama no dice cuándo se toma cada camino.' },
  { elemento: 'Flecha', significado: 'El orden: qué se ejecuta después de qué.' },
  { elemento: 'Rectángulo con bandas laterales', significado: 'Subproceso: un paso que está detallado en otro diagrama.' },
  { elemento: 'Cilindro', significado: 'Almacén de datos: dónde se lee o se escribe información persistente.' },
  { elemento: 'La forma del nodo', significado: 'La forma **indica el papel** del nodo, no es decoración. Un rectángulo con una pregunta dentro sigue siendo un paso, no una decisión.' },
];

const SINTAXIS = [
  { para: 'Abrir el diagrama y fijar su dirección', escribes: 'flowchart TD' },
  { para: 'Terminal de inicio o de fin (óvalo)', escribes: 'A([Inicio])' },
  { para: 'Paso (rectángulo)', escribes: 'B[Validar credenciales]' },
  { para: 'Decisión (rombo)', escribes: 'C{Credenciales validas?}' },
  { para: 'Paso de un nodo al siguiente', escribes: 'A --> B' },
  { para: 'Rama rotulada de una decisión', escribes: 'C -- si --> D' },
  { para: 'Subproceso', escribes: 'E[[Cobrar el pedido]]' },
  { para: 'Almacén de datos', escribes: 'F[(Bitacora de accesos)]' },
];

const PROCEDENCIA =
  'El diagrama de flujo es muy anterior a UML. Se atribuye a Frank y Lillian Gilbreth, que en 1921 lo ' +
  'presentaron ante la ASME como *gráfico de proceso* para estudiar procedimientos industriales, y a ' +
  'finales de los años cuarenta John von Neumann y Herman Goldstine lo adaptaron para describir programas, ' +
  'que es el uso por el que se difundió. El diagrama de ACTIVIDAD de UML es su descendiente formalizado: ' +
  'añade semántica de concurrencia, particiones y objetos que fluyen. Mermaid dibuja diagramas de flujo, no ' +
  'diagramas de actividad, y la notación de esta ficha es la del diagrama de flujo.';

const OTROS_USOS =
  'La misma notación describe procedimientos fuera del software: protocolos clínicos, flujos de aprobación ' +
  'administrativa, árboles de decisión de atención a clientes. Dentro del software aparece en la ' +
  'documentación de procesos de negocio, en los diagramas de un pipeline de integración continua y en las ' +
  'guías de resolución de incidencias.';

const ejercicios: EjercicioDiagramaDef[] = [
  // -------------------------------------------------------------------------
  {
    slug: 'flujo-acceso-panel',
    titulo: 'La forma indica el papel: acceso a un panel',
    categoria: 'Flujo',
    bloque: 'Comportamiento',
    nivel: 'guiado',
    orden: 410,
    motor: 'mermaid',
    tipoDiagrama: 'flujo',

    problema:
      'Un usuario introduce sus credenciales y el sistema lo lleva al panel o le muestra un error. El ' +
      'procedimiento tiene un punto en el que el camino se bifurca, y ese punto se dibuja con una forma ' +
      'distinta de la de un paso corriente. Un rectángulo que contiene una pregunta sigue leyéndose como una ' +
      'acción que se ejecuta y de la que se sale por un único camino.',
    procedencia: PROCEDENCIA,
    encaje:
      'El diagrama de flujo se usa para describir un procedimiento antes de programarlo, o para explicar uno ' +
      'ya existente a quien no va a leer el código. Responde a la pregunta "en qué orden se hacen las cosas ' +
      'y de qué depende"; qué objetos existen corresponde al diagrama de clases.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Dibujar una bifurcación como rectángulo. La forma indica el papel del nodo: el rombo anuncia que de ahí salen varios caminos, y el rectángulo anuncia lo contrario.',
      'Usar el óvalo para pasos intermedios. El terminal marca únicamente el principio y el final.',
      'Dejar una rama sin rótulo, con lo que el diagrama no dice bajo qué condición se toma.',
      'Terminar el diagrama en el último paso, sin terminal de fin.',
    ],
    queDibujas:
      'El procedimiento completo de acceso. Parte del diagrama dado, añade la bifurcación `Credenciales ' +
      'validas?` dibujada como decisión, sus dos ramas rotuladas `si` y `no` —que llevan a `Mostrar panel` y ' +
      'a `Mostrar error`— y el terminal de fin al que ambas desembocan.',
    pasoAPaso: [
      'Añade la bifurcación con llaves para que se dibuje como rombo: `C{Credenciales validas?}`.',
      'Conecta el paso de captura con la bifurcación: `B --> C`.',
      'Saca la rama afirmativa hacia el panel y rotúlala: `C -- si --> D[Mostrar panel]`.',
      'Saca la rama negativa hacia el error, también rotulada: `C -- no --> E[Mostrar error]`.',
      'Declara el terminal de fin con paréntesis y corchete, `F([Fin])`, y haz que los dos caminos lleguen a él.',
    ],
    sintaxis: SINTAXIS,

    codigoInicial: `flowchart TD
  A([Inicio]) --> B[Capturar credenciales]
  %% Falta la bifurcación que decide si las credenciales son válidas, con sus
  %% dos ramas rotuladas, y el terminal de fin.`,

    aserciones: [
      { tipo: 'nodo-con-forma', parametros: { nombre: 'Credenciales validas?', forma: 'decision' } },
      { tipo: 'nodo-con-forma', parametros: { nombre: 'Inicio', forma: 'inicio-fin' } },
      { tipo: 'nodo-con-forma', parametros: { nombre: 'Fin', forma: 'inicio-fin' } },
      {
        tipo: 'paso-de-flujo',
        parametros: { desde: 'Credenciales validas?', hasta: 'Mostrar panel', etiqueta: 'si' },
      },
      {
        tipo: 'paso-de-flujo',
        parametros: { desde: 'Credenciales validas?', hasta: 'Mostrar error', etiqueta: 'no' },
      },
      { tipo: 'decisiones-con-salidas' },
      { tipo: 'flujo-termina' },
      { tipo: 'nodos-alcanzables', oculta: true },
    ],

    diagramasReferencia: [
      `flowchart TD
  A([Inicio]) --> B[Capturar credenciales]
  B --> C{Credenciales validas?}
  C -- si --> D[Mostrar panel]
  C -- no --> E[Mostrar error]
  D --> F([Fin])
  E --> F`,
      // Otra solución válida: un paso más antes de decidir, el error devuelve al
      // usuario a la captura, y se registra el acceso después de abrir el panel.
      `flowchart TD
  I([Inicio]) --> L[Leer usuario y contrasena]
  L --> V[Consultar el directorio de usuarios]
  V --> D{Credenciales validas?}
  D -- no --> M[Mostrar error]
  M --> L
  D -- si --> P[Mostrar panel]
  P --> R[Registrar el acceso en la bitacora]
  R --> Z([Fin])`,
    ],

    // La trampa dibuja la bifurcación como un paso: se lee como una acción de la
    // que solo se puede salir por un camino.
    diagramaTrampa: `flowchart TD
  A([Inicio]) --> B[Capturar credenciales]
  B --> C[Credenciales validas?]
  C -- si --> D[Mostrar panel]
  C -- no --> E[Mostrar error]
  D --> F([Fin])
  E --> F`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'flujo-alta-pedido',
    titulo: 'Decisiones que deciden algo: alta de un pedido',
    categoria: 'Flujo',
    bloque: 'Comportamiento',
    nivel: 'base',
    orden: 420,
    motor: 'mermaid',
    tipoDiagrama: 'flujo',

    problema:
      'Al dar de alta un pedido, el sistema comprueba las existencias antes de confirmarlo. Un rombo del que ' +
      'sale una sola flecha no decide nada, y un rombo con dos salidas sin rotular deja al lector sin saber ' +
      'cuál se toma en cada caso. En ambos supuestos el diagrama tiene el aspecto de describir una decisión ' +
      'sin describirla.',
    procedencia: PROCEDENCIA,
    encaje:
      'Este diagrama se usa para acordar el procedimiento con quien conoce el negocio antes de implementarlo. ' +
      'Una rama sin rotular impide precisamente esa conversación: el interlocutor no puede confirmar ni ' +
      'corregir una condición que no está escrita.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Dibujar una decisión con una sola salida. O sobra el rombo, porque no hay bifurcación, o falta la rama que no se dibujó.',
      'Dejar las salidas de un rombo sin rótulo. El diagrama muestra que hay dos caminos y calla cuándo se toma cada uno.',
      'Rotular una sola de las dos ramas y dar la otra por supuesta.',
      'Formular la condición como una acción («Comprobar existencias») en vez de como una pregunta cuya respuesta distingue las ramas.',
    ],
    queDibujas:
      'El procedimiento de alta de un pedido. Incluye la decisión `Hay existencias?` dibujada como rombo, ' +
      'con dos ramas rotuladas: `si` lleva a `Reservar existencias` y `no` a `Informar falta de ' +
      'existencias`. El camino afirmativo debe llegar a `Confirmar el pedido`, y todos los caminos deben ' +
      'terminar en un terminal de fin.',
    sintaxis: SINTAXIS,

    codigoInicial: `flowchart TD
  A([Inicio]) --> B[Recibir el pedido]
  B --> C{Hay existencias?}
  %% Faltan las salidas de la decisión, con su rótulo, y el resto del
  %% procedimiento hasta el terminal de fin.`,

    aserciones: [
      { tipo: 'nodo-con-forma', parametros: { nombre: 'Hay existencias?', forma: 'decision' } },
      {
        tipo: 'paso-de-flujo',
        parametros: { desde: 'Hay existencias?', hasta: 'Reservar existencias', etiqueta: 'si' },
      },
      {
        tipo: 'paso-de-flujo',
        parametros: { desde: 'Hay existencias?', hasta: 'Informar falta de existencias', etiqueta: 'no' },
      },
      { tipo: 'existe-nodo', parametros: { nombre: 'Confirmar el pedido' } },
      { tipo: 'decisiones-con-salidas' },
      { tipo: 'flujo-termina' },
      { tipo: 'nodos-alcanzables', oculta: true },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `flowchart TD
  A([Inicio]) --> B[Recibir el pedido]
  B --> C{Hay existencias?}
  C -- si --> D[Reservar existencias]
  C -- no --> E[Informar falta de existencias]
  D --> F[Confirmar el pedido]
  F --> G([Fin])
  E --> G`,
      // Variante válida: se validan los datos de envío, aparece una segunda
      // decisión por el cobro y el rechazo del pago libera lo reservado.
      `flowchart TD
  N([Inicio]) --> R[Recibir el pedido]
  R --> V[Validar los datos de envio]
  V --> S{Hay existencias?}
  S -- no --> A[Informar falta de existencias]
  S -- si --> P[Reservar existencias]
  P --> C{Se autorizo el pago?}
  C -- si --> K[Confirmar el pedido]
  C -- no --> L[Liberar las existencias reservadas]
  L --> A
  A --> Z([Fin])
  K --> Z`,
    ],

    // La trampa dibuja el rombo con sus dos salidas, pero sin rotularlas: el
    // diagrama no dice cuál se toma en cada caso.
    diagramaTrampa: `flowchart TD
  A([Inicio]) --> B[Recibir el pedido]
  B --> C{Hay existencias?}
  C --> D[Reservar existencias]
  C --> E[Informar falta de existencias]
  D --> F[Confirmar el pedido]
  F --> G([Fin])
  E --> G`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'flujo-corregir-devolucion',
    titulo: 'Corregir un flujo de devolución de pedidos',
    categoria: 'Flujo',
    bloque: 'Comportamiento',
    nivel: 'reto',
    orden: 430,
    motor: 'mermaid',
    tipoDiagrama: 'flujo',

    problema:
      'El diagrama de partida describe la devolución de un pedido y tiene dos defectos que no se ven al ' +
      'mirarlo. El primero: dos pasos se apuntan entre sí y no hay salida de ese ciclo, de modo que quien ' +
      'entra en él nunca llega al final. El segundo: un paso queda suelto, sin ninguna flecha que llegue a ' +
      'él, y por tanto no se ejecuta nunca. Ambos defectos son de estructura del grafo y se detectan ' +
      'recorriéndolo, no leyéndolo.',
    procedencia: PROCEDENCIA,
    encaje:
      'Un flujo con un ciclo sin salida o con pasos inalcanzables describe un procedimiento que no se puede ' +
      'ejecutar. Revisarlo antes de implementarlo es más barato que descubrirlo cuando el proceso ya está en ' +
      'marcha y hay solicitudes de clientes atrapadas en él.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Dejar un ciclo del que no sale ninguna rama. Un bucle es legítimo, pero necesita una decisión que permita salir de él.',
      'Dejar un paso sin ninguna flecha de entrada. Nunca se ejecuta, y su presencia sugiere que el procedimiento hace algo que en realidad no hace.',
      'Añadir un paso al diagrama y olvidar conectarlo con el que lo precede.',
      'Suponer que un paso «se entiende» aunque el camino que lleva a él no esté dibujado.',
    ],
    queDibujas:
      'El diagrama corregido. Conserva el sentido del procedimiento —registrar la solicitud, decidir si ' +
      'procede, recoger el paquete y emitir la nota de crédito o notificar el rechazo— pero arregla los dos ' +
      'defectos: da salida al ciclo mediante una decisión con sus ramas rotuladas, y conecta el paso suelto ' +
      'al camino que le corresponde. Todos los caminos deben terminar en un terminal de fin.',
    sintaxis: SINTAXIS,

    // El punto de partida ES el diagrama defectuoso: el alumno lo corrige.
    codigoInicial: `flowchart TD
  A([Inicio]) --> B[Registrar solicitud de devolucion]
  B --> C{Procede la devolucion?}
  C -- si --> D[Programar recoleccion]
  C -- no --> E[Notificar rechazo]
  D --> F[Esperar al transportista]
  F --> D
  G[Emitir nota de credito] --> H([Fin])
  E --> H`,

    aserciones: [
      { tipo: 'nodos-alcanzables' },
      { tipo: 'flujo-termina' },
      { tipo: 'decisiones-con-salidas' },
      { tipo: 'nodo-con-forma', parametros: { nombre: 'Procede la devolucion?', forma: 'decision' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'Emitir nota de credito' } },
      { tipo: 'sin-nombres-vagos' },
      { tipo: 'sin-relaciones-duplicadas', oculta: true },
    ],

    diagramasReferencia: [
      `flowchart TD
  A([Inicio]) --> B[Registrar solicitud de devolucion]
  B --> C{Procede la devolucion?}
  C -- si --> D[Programar recoleccion]
  C -- no --> E[Notificar rechazo]
  D --> F{Llego el paquete?}
  F -- si --> G[Emitir nota de credito]
  F -- no --> D
  G --> H([Fin])
  E --> H`,
      // Variante válida: se revisa la política antes de decidir, el paquete se
      // recibe en almacén y una segunda decisión comprueba el estado del
      // artículo antes de emitir la nota de crédito.
      `flowchart TD
  I([Inicio]) --> R[Registrar solicitud de devolucion]
  R --> V[Revisar la politica de devoluciones]
  V --> P{Procede la devolucion?}
  P -- no --> N[Notificar rechazo]
  P -- si --> E[Programar recoleccion]
  E --> W[Recibir el paquete en almacen]
  W --> Q{El articulo esta completo?}
  Q -- si --> C[Emitir nota de credito]
  Q -- no --> N
  C --> Z([Fin])
  N --> Z`,
    ],

    // La trampa es el propio diagrama de partida, sin corregir.
    diagramaTrampa: `flowchart TD
  A([Inicio]) --> B[Registrar solicitud de devolucion]
  B --> C{Procede la devolucion?}
  C -- si --> D[Programar recoleccion]
  C -- no --> E[Notificar rechazo]
  D --> F[Esperar al transportista]
  F --> D
  G[Emitir nota de credito] --> H([Fin])
  E --> H`,
  },
];

export default ejercicios;
