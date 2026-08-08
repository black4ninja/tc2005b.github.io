import type { EjercicioDiagramaDef } from './tipos.js';

/**
 * Categoría "Actividad": el proceso, con quién lo hace y qué ocurre a la vez.
 *
 * Los tres niveles atacan lo que un diagrama de flujo NO puede expresar, que es
 * justo lo que justifica que este sea un tipo aparte: las calles de
 * responsabilidad, el paralelismo real y la diferencia entre bifurcar por
 * decisión y bifurcar por concurrencia.
 */

const ANATOMIA = [
  { elemento: 'Círculo relleno', significado: 'Nodo inicial: dónde empieza la actividad. Hay exactamente uno.' },
  { elemento: 'Rectángulo redondeado', significado: 'Acción: un paso del proceso. Se nombra con un verbo en infinitivo.' },
  { elemento: 'Rombo', significado: 'Decisión: el flujo toma UNA de las salidas, según la guarda que se cumpla.' },
  { elemento: 'Guarda `[condición]`', significado: 'Rótulo de una salida de la decisión. Sin ella, el diagrama no dice cuándo se toma cada camino.' },
  { elemento: 'Barra gruesa que abre', significado: 'Bifurcación (fork): a partir de ahí los caminos ocurren **a la vez**, no en alternativa.' },
  { elemento: 'Barra gruesa que cierra', significado: 'Unión (join): espera a que TODOS los caminos paralelos terminen antes de seguir.' },
  { elemento: 'Calle (swimlane)', significado: 'Quién es responsable de las acciones que contiene. Es la mitad del valor de esta vista.' },
  { elemento: 'Círculo con anillo', significado: 'Nodo final: dónde termina la actividad.' },
];

const SINTAXIS = [
  { para: 'Empezar y terminar', escribes: 'start\\n…\\nstop' },
  { para: 'Una acción', escribes: ':Registrar la solicitud;' },
  { para: 'Cambiar de calle', escribes: '|Almacen|' },
  { para: 'Decisión con sus dos guardas', escribes: 'if (Hay stock?) then (si)\\n  :Reservar;\\nelse (no)\\n  :Avisar;\\nendif' },
  { para: 'Dos acciones a la vez', escribes: 'fork\\n  :Cobrar;\\nfork again\\n  :Notificar;\\nend fork' },
  { para: 'Repetir mientras se cumpla algo', escribes: 'while (Quedan lineas?) is (si)\\n  :Procesar linea;\\nendwhile (no)' },
];

const PROCEDENCIA =
  'El diagrama de actividad procede de los diagramas de flujo y de las redes de Petri, y la OMG lo incorporó ' +
  'a UML en 1997. En UML 2.0 se rehízo sobre semántica de flujo de tokens, que es de donde salen el fork y el ' +
  'join tal como se usan hoy.';

const OTROS_USOS =
  'La misma idea aparece en la notación BPMN de procesos de negocio —que usa calles con el mismo significado—, ' +
  'en los diagramas de una cadena de montaje y en la representación de una tubería de integración continua, ' +
  'donde varias etapas corren en paralelo y una posterior espera a todas.';

const ejercicios: EjercicioDiagramaDef[] = [
  // -------------------------------------------------------------------------
  {
    slug: 'ejemplo-resuelto-actividad-devolucion',
    titulo: 'Ejemplo resuelto: la devolución de un artículo',
    categoria: 'Actividad',
    bloque: 'Comportamiento',
    nivel: 'guiado',
    orden: 1,
    esEjemplo: true,
    motor: 'plantuml',
    tipoDiagrama: 'actividad',

    problema:
      'Una devolución involucra a tres áreas: quien la pide, quien decide si procede y quien recibe el ' +
      'artículo. Un diagrama de flujo puede mostrar los pasos, pero no quién hace cada uno ni qué ocurre ' +
      'simultáneamente. Este ejemplo muestra el diagrama terminado para que sirva de referencia.',
    procedencia: PROCEDENCIA,
    encaje:
      'Se dibuja al describir un proceso que atraviesa varias áreas o sistemas, después de saber qué casos de ' +
      'uso existen y antes de repartir responsabilidades entre clases. Responde a "quién hace qué, en qué ' +
      'orden y qué puede ir a la vez".',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Usar una decisión donde hay concurrencia. Un rombo elige UN camino; un fork ejecuta TODOS. Reponer el inventario y emitir el reembolso ocurren a la vez, no en alternativa.',
      'Abrir un fork y no cerrarlo. Sin el join, las ramas paralelas nunca se juntan y el diagrama no dice cuándo termina la actividad.',
      'Dejar acciones fuera de toda calle: el diagrama pierde la única información que un diagrama de flujo no puede dar.',
      'Dejar sin rótulo las salidas de una decisión. Sin guardas, el lector no sabe cuál se toma en cada caso.',
    ],
    queDibujas:
      'Nada: este ejercicio ya viene resuelto. Léelo, envíalo para ver cómo se comprueba y úsalo como ' +
      'referencia en los tres siguientes.',
    pasoAPaso: [
      'Observa que cada acción está dentro de una calle: la calle vigente es la última que se abrió con `|Nombre|`.',
      'Fíjate en que la decisión `Procede?` tiene sus dos salidas rotuladas, `si` y `no`.',
      'Compara el `if` con el `fork`: el primero elige un camino, el segundo ejecuta los dos.',
      'Comprueba que el `fork` tiene su `end fork`: sin él, las dos ramas quedarían sueltas.',
    ],
    sintaxis: SINTAXIS,

    codigoInicial: `@startuml
|Cliente|
start
:Solicitar devolucion;
|Atencion|
if (Procede?) then (si)
  |Almacen|
  :Recibir articulo;
  fork
    :Reponer inventario;
  fork again
    :Emitir reembolso;
  end fork
else (no)
  |Atencion|
  :Rechazar solicitud;
endif
stop
@enduml`,

    aserciones: [
      { tipo: 'accion-en-calle', parametros: { accion: 'Solicitar devolucion', calle: 'Cliente' } },
      { tipo: 'accion-en-calle', parametros: { accion: 'Recibir articulo', calle: 'Almacen' } },
      { tipo: 'fork-tiene-join' },
      { tipo: 'decisiones-con-salidas' },
      { tipo: 'nodos-alcanzables' },
    ],

    diagramasReferencia: [
      `@startuml
|Cliente|
start
:Solicitar devolucion;
|Atencion|
if (Procede?) then (si)
  |Almacen|
  :Recibir articulo;
  fork
    :Reponer inventario;
  fork again
    :Emitir reembolso;
  end fork
else (no)
  |Atencion|
  :Rechazar solicitud;
endif
stop
@enduml`,
      `@startuml
|Cliente|
start
:Solicitar devolucion;
|Atencion|
if (Procede?) then (procede)
  |Almacen|
  :Recibir articulo;
  fork
    :Emitir reembolso;
  fork again
    :Reponer inventario;
  end fork
else (no procede)
  |Atencion|
  :Rechazar solicitud;
endif
stop
@enduml`,
    ],

    diagramaTrampa: `@startuml
|Cliente|
start
:Solicitar devolucion;
|Atencion|
if (Procede?) then (si)
  :Recibir articulo;
  fork
    :Reponer inventario;
  fork again
    :Emitir reembolso;
  end fork
else (no)
  :Rechazar solicitud;
endif
stop
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'actividad-calles-alta-de-pedido',
    titulo: 'Repartir responsabilidades: el alta de un pedido',
    categoria: 'Actividad',
    bloque: 'Comportamiento',
    nivel: 'guiado',
    orden: 10,
    motor: 'plantuml',
    tipoDiagrama: 'actividad',

    problema:
      'Dar de alta un pedido no lo hace nadie en concreto: el cliente lo envía, el sistema lo valida y el ' +
      'almacén lo prepara. Escrito como una lista de pasos, el proceso parece de una sola persona. La ' +
      'pregunta que este diagrama responde y un diagrama de flujo no es quién es responsable de cada paso.',
    procedencia: PROCEDENCIA,
    encaje:
      'Es el primer uso de esta vista: describir un proceso que atraviesa varias áreas. Se dibuja cuando ya ' +
      'se sabe QUÉ pasos hay y falta decidir quién los ejecuta.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Dejar acciones fuera de toda calle. Una acción sin calle no dice quién la hace, que es la única información que esta vista añade sobre un diagrama de flujo.',
      'Abrir una calle por cada acción, aunque el responsable no cambie. Las calles son áreas o sistemas, no pasos.',
      'Nombrar las calles con el nombre del paso («Validación») en vez del responsable («Sistema»).',
      'Olvidar el `stop`: sin nodo final, el diagrama no dice cuándo termina el proceso.',
    ],
    queDibujas:
      'Un diagrama de actividad del alta de un pedido con tres calles —`Cliente`, `Sistema` y `Almacen`— ' +
      'donde `Enviar pedido` la hace el cliente, `Validar datos` el sistema y `Preparar envio` el almacén.',
    pasoAPaso: [
      'Escribe `|Cliente|` y, debajo, `start` y la acción `:Enviar pedido;`.',
      'Cambia de calle con `|Sistema|` y añade `:Validar datos;`.',
      'Cambia a `|Almacen|` y añade `:Preparar envio;`.',
      'Cierra con `stop`. Comprueba que cada acción quedó bajo la calle que le corresponde.',
    ],
    sintaxis: SINTAXIS,

    codigoInicial: `@startuml
start
:Enviar pedido;
:Validar datos;
:Preparar envio;
stop
@enduml
' Los tres pasos están, pero ninguno dice quién lo hace.
' Reparte las acciones en las calles Cliente, Sistema y Almacen.`,

    aserciones: [
      { tipo: 'accion-en-calle', parametros: { accion: 'Enviar pedido', calle: 'Cliente' } },
      { tipo: 'accion-en-calle', parametros: { accion: 'Validar datos', calle: 'Sistema' } },
      { tipo: 'accion-en-calle', parametros: { accion: 'Preparar envio', calle: 'Almacen' } },
      { tipo: 'paso-de-flujo', parametros: { desde: 'Enviar pedido', hasta: 'Validar datos' } },
      { tipo: 'flujo-termina', parametros: { min: 1 } },
      { tipo: 'nodos-alcanzables', oculta: true },
    ],

    diagramasReferencia: [
      `@startuml
|Cliente|
start
:Enviar pedido;
|Sistema|
:Validar datos;
|Almacen|
:Preparar envio;
stop
@enduml`,
      `@startuml
|Cliente|
start
:Enviar pedido;
|Sistema|
:Validar datos;
:Registrar en el historial;
|Almacen|
:Preparar envio;
stop
@enduml`,
    ],

    // Las calles existen pero las acciones están mal repartidas: el sistema
    // aparece preparando el envío.
    diagramaTrampa: `@startuml
|Cliente|
start
:Enviar pedido;
|Sistema|
:Validar datos;
:Preparar envio;
stop
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'actividad-paralelismo-confirmacion-pago',
    titulo: 'A la vez, no en alternativa: confirmar un pago',
    categoria: 'Actividad',
    bloque: 'Comportamiento',
    nivel: 'base',
    orden: 20,
    motor: 'plantuml',
    tipoDiagrama: 'actividad',

    problema:
      'Cuando un pago se confirma hay que hacer dos cosas: enviar el comprobante al cliente y actualizar la ' +
      'contabilidad. Ninguna depende de la otra y ambas tienen que estar hechas antes de dar el pago por ' +
      'cerrado. Un rombo NO sirve para esto: un rombo elige un camino. Lo que hace falta es una bifurcación ' +
      'paralela.',
    procedencia: PROCEDENCIA,
    encaje:
      'Aparece en cuanto un proceso deja de ser una secuencia. Distinguir la decisión de la concurrencia es la ' +
      'aportación semántica de esta vista sobre el diagrama de flujo.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Modelar con una decisión lo que ocurre a la vez. El rombo significa "una de estas", no "todas estas": con él, el diagrama afirma que solo se hace una de las dos cosas.',
      'Abrir el fork y no cerrarlo con `end fork`. Sin la unión, nada espera a que las dos ramas terminen y el proceso podría cerrarse con el comprobante sin enviar.',
      'Poner las dos acciones en secuencia. No es incorrecto de ejecutar, pero afirma una dependencia que no existe y obliga a esperar sin motivo.',
      'Meter en una rama paralela algo que sí depende de la otra rama.',
    ],
    queDibujas:
      'Un diagrama de actividad donde, tras `Confirmar pago`, se ejecutan **en paralelo** `Enviar comprobante` ' +
      'y `Actualizar contabilidad`, y solo cuando las dos han terminado se llega a `Cerrar operacion`.',
    sintaxis: SINTAXIS,

    codigoInicial: `@startuml
start
:Confirmar pago;
if (Que hacemos?) then (comprobante)
  :Enviar comprobante;
else (contabilidad)
  :Actualizar contabilidad;
endif
:Cerrar operacion;
stop
@enduml
' Esto dice que se hace UNA de las dos cosas, y hay que hacer LAS DOS.
' Sustituye la decisión por una bifurcación paralela.`,

    aserciones: [
      { tipo: 'fork-tiene-join' },
      { tipo: 'existe-nodo', parametros: { nombre: 'Enviar comprobante' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'Actualizar contabilidad' } },
      { tipo: 'paso-de-flujo', parametros: { desde: 'Confirmar pago', hasta: 'bifurcación' } },
      { tipo: 'nodos-alcanzables' },
      { tipo: 'flujo-termina', parametros: { min: 1 }, oculta: true },
    ],

    diagramasReferencia: [
      `@startuml
start
:Confirmar pago;
fork
  :Enviar comprobante;
fork again
  :Actualizar contabilidad;
end fork
:Cerrar operacion;
stop
@enduml`,
      `@startuml
|Finanzas|
start
:Confirmar pago;
fork
  :Actualizar contabilidad;
fork again
  |Atencion|
  :Enviar comprobante;
end fork
|Finanzas|
:Cerrar operacion;
stop
@enduml`,
    ],

    // El error que el ejercicio persigue: bifurcar con una decisión.
    diagramaTrampa: `@startuml
start
:Confirmar pago;
if (Que hacemos?) then (comprobante)
  :Enviar comprobante;
else (contabilidad)
  :Actualizar contabilidad;
endif
:Cerrar operacion;
stop
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'actividad-corregir-preparacion-envio',
    titulo: 'Corregir un proceso de preparación de envío',
    categoria: 'Actividad',
    bloque: 'Comportamiento',
    nivel: 'reto',
    orden: 30,
    motor: 'plantuml',
    tipoDiagrama: 'actividad',

    problema:
      'El diagrama de abajo describe la preparación de un envío y tiene tres defectos a la vez: una decisión ' +
      'sin rotular, una bifurcación paralela sin cerrar y una acción en la calle equivocada. Los tres son ' +
      'errores documentados en trabajos de alumnos, y ninguno impide que el diagrama se dibuje.',
    procedencia: PROCEDENCIA,
    encaje:
      'Revisar un diagrama ajeno es lo que se hace en una revisión de diseño. Los defectos que se buscan aquí ' +
      'son los que un motor de dibujo no señala, porque son de significado y no de sintaxis.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Dejar sin rótulo las salidas de una decisión: el diagrama no dice cuál se toma en cada caso, y el rombo deja de aportar información.',
      'Abrir un `fork` sin su `end fork`: las ramas paralelas no se juntan y nada espera a que ambas terminen.',
      'Poner una acción en la calle de otro responsable. Es el error más difícil de ver, porque el diagrama sigue leyéndose bien.',
      'Corregir un defecto rompiendo otro: al cerrar el fork es fácil dejar fuera una de las ramas.',
    ],
    queDibujas:
      'El mismo proceso, corregido: la decisión `Hay stock?` con sus dos salidas rotuladas, la bifurcación ' +
      'paralela cerrada con su unión, y `Empaquetar` en la calle `Almacen`, que es quien empaqueta.',
    sintaxis: SINTAXIS,

    codigoInicial: `@startuml
|Ventas|
start
:Recibir pedido;
|Almacen|
if (Hay stock?) then ()
  fork
    :Reservar articulos;
  fork again
    :Avisar al transportista;
  |Ventas|
  :Empaquetar;
else ()
  |Ventas|
  :Avisar sin stock;
endif
stop
@enduml
' Tres defectos: guardas vacías, fork sin cerrar y Empaquetar en la calle
' equivocada. Corrígelos sin cambiar el proceso.`,

    aserciones: [
      { tipo: 'decisiones-con-salidas' },
      { tipo: 'fork-tiene-join' },
      { tipo: 'accion-en-calle', parametros: { accion: 'Empaquetar', calle: 'Almacen' } },
      { tipo: 'accion-en-calle', parametros: { accion: 'Recibir pedido', calle: 'Ventas' } },
      { tipo: 'nodos-alcanzables' },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `@startuml
|Ventas|
start
:Recibir pedido;
|Almacen|
if (Hay stock?) then (si)
  fork
    :Reservar articulos;
  fork again
    :Avisar al transportista;
  end fork
  :Empaquetar;
else (no)
  |Ventas|
  :Avisar sin stock;
endif
stop
@enduml`,
      `@startuml
|Ventas|
start
:Recibir pedido;
|Almacen|
if (Hay stock?) then (hay)
  fork
    :Avisar al transportista;
  fork again
    :Reservar articulos;
  end fork
  :Empaquetar;
else (no hay)
  |Ventas|
  :Avisar sin stock;
  |Ventas|
endif
stop
@enduml`,
    ],

    // Corrige las guardas y el fork, pero deja `Empaquetar` en Ventas: el
    // defecto más fácil de pasar por alto.
    diagramaTrampa: `@startuml
|Ventas|
start
:Recibir pedido;
|Almacen|
if (Hay stock?) then (si)
  fork
    :Reservar articulos;
  fork again
    :Avisar al transportista;
  end fork
  |Ventas|
  :Empaquetar;
else (no)
  |Ventas|
  :Avisar sin stock;
endif
stop
@enduml`,
  },
];

export default ejercicios;
