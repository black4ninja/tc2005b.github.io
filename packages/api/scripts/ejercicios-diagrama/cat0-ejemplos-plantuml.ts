import type { EjercicioDiagramaDef } from './tipos.js';

/**
 * Categoría "Ejemplo resuelto", tres vistas de arquitectura en PlantUML.
 *
 * Hermano de `cat0-ejemplo.ts` y con la misma intención: abrir con el diagrama
 * TERMINADO. Aquel resuelve el caso en las tres notaciones que Mermaid dibuja
 * —clases, secuencia y estados—; estos tres lo resuelven en las tres que solo
 * existen en PlantUML —casos de uso, componentes y paquetes—, que son las que se
 * ejercitan en las categorías de Arquitectura.
 *
 * El caso es el MISMO de `cat0-ejemplo.ts` y el de las categorías 6, 7 y 8: la
 * reserva de salas de estudio. Los nombres se reutilizan a propósito —`Alumno`,
 * `Coordinador`, `Reservar sala`, `PantallaDeReservas`, `AlmacenDeReservas`,
 * `Presentacion`, `Dominio`, `Infraestructura`— para que las tres vistas se
 * puedan leer una detrás de otra como descripciones del mismo sistema y no como
 * tres ejemplos sin relación.
 *
 * Ninguno de los tres declara diagramas de contexto: las comprobaciones cruzadas
 * del catálogo evalúan secuencia o estados contra un diagrama de clases, y
 * ninguna de las tres notaciones de aquí participa en ese cruce. Incluirlas
 * pasaría en verde sin recorrer nada.
 */

// ---------------------------------------------------------------------------
// Casos de uso
// ---------------------------------------------------------------------------

const ANATOMIA_CASOS_DE_USO = [
  {
    elemento: 'Monigote (actor)',
    significado:
      'Un rol externo que interactúa con el sistema. Es un papel, no una persona concreta: la misma persona puede ejercer dos roles.',
  },
  {
    elemento: 'Óvalo (caso de uso)',
    significado:
      'Un objetivo completo del actor, con un resultado observable para él. Se nombra con verbo en infinitivo más complemento.',
  },
  {
    elemento: 'Línea entre actor y óvalo',
    significado:
      'Asociación de participación: ese actor es quien inicia el caso de uso o quien recibe su resultado.',
  },
  {
    elemento: 'Rectángulo que envuelve los óvalos',
    significado:
      'La frontera del sistema. Lo de dentro es responsabilidad del software; lo de fuera, del entorno.',
  },
  {
    elemento: 'Flecha discontinua con `<<include>>`',
    significado:
      'El caso base ejecuta SIEMPRE al incluido. Sirve para factorizar un comportamiento común a varios casos.',
  },
  {
    elemento: 'Flecha discontinua con `<<extend>>`',
    significado:
      'El caso extendido amplía al base solo en ciertas condiciones. La dependencia va del que amplía hacia el ampliado.',
  },
  {
    elemento: 'Caso de uso incluido y sin actor propio',
    significado:
      'Un objetivo que ningún rol solicita por sí mismo, pero que otro caso de uso ejecuta siempre. Tiene quien lo pida: el caso base.',
  },
];

const SINTAXIS_CASOS_DE_USO = [
  { para: 'Declarar un actor', escribes: 'actor Alumno' },
  { para: 'Actor con nombre de varias palabras y alias', escribes: 'actor "Coordinador de laboratorio" as Coordinador' },
  { para: 'Declarar un caso de uso con alias', escribes: 'usecase "Reservar sala" as reservar' },
  { para: 'Caso de uso en forma abreviada', escribes: '(Cancelar reserva) as cancelar' },
  { para: 'Participación de un actor en un caso de uso', escribes: 'Alumno -- reservar' },
  { para: 'Inclusión', escribes: 'reservar ..> notificar : <<include>>' },
  { para: 'Extensión', escribes: 'reservar ..> auditar : <<extend>>' },
  { para: 'Frontera del sistema', escribes: 'rectangle "Reservas de salas" {\\n  usecase "Reservar sala" as reservar\\n}' },
  { para: 'Orientar el dibujo de izquierda a derecha', escribes: 'left to right direction' },
  { para: 'Comentario que no se dibuja', escribes: "' esta línea es una nota para quien lea el código" },
];

/** El diagrama de casos de uso del caso: solución y código inicial a la vez. */
const CASOS_DE_USO = `@startuml
left to right direction
actor Alumno
actor Coordinador
rectangle "Reservas de salas" {
  usecase "Reservar sala" as reservar
  usecase "Cancelar reserva" as cancelar
  usecase "Consultar disponibilidad" as consultar
  usecase "Aprobar reserva" as aprobar
  usecase "Notificar por correo" as notificar
}
Alumno -- reservar
Alumno -- cancelar
Alumno -- consultar
Coordinador -- aprobar
Coordinador -- consultar
reservar ..> notificar : <<include>>
cancelar ..> notificar : <<include>>
aprobar ..> notificar : <<include>>
@enduml`;

// ---------------------------------------------------------------------------
// Componentes
// ---------------------------------------------------------------------------

const ANATOMIA_COMPONENTES = [
  {
    elemento: 'Caja de componente',
    significado:
      'Una pieza sustituible del sistema, con un límite definido: un módulo, una librería o un servicio.',
  },
  {
    elemento: 'Interfaz',
    significado:
      'El contrato por el que se accede a un componente. Es lo único que sus consumidores conocen de él.',
  },
  {
    elemento: 'Interfaz provista (bola)',
    significado:
      'El componente OFRECE ese contrato. Se dibuja con una línea sin punta entre el componente y la interfaz.',
  },
  {
    elemento: 'Interfaz requerida (media luna)',
    significado:
      'El componente NECESITA ese contrato para funcionar. Se dibuja con una flecha desde el componente hacia la interfaz.',
  },
  {
    elemento: 'Flecha discontinua con punta',
    significado:
      'Dependencia: el origen deja de compilar o de funcionar si el destino cambia.',
  },
  {
    elemento: 'Caja que envuelve componentes',
    significado:
      'Contenedor: agrupa las piezas que pertenecen al mismo módulo, capa o unidad de despliegue.',
  },
  {
    elemento: 'Dependencia invertida hacia un contrato',
    significado:
      'Una pieza de abajo depende de una interfaz que declara y provee la de arriba. Es la forma estándar de evitar que las dependencias se cierren en ciclo.',
  },
];

const SINTAXIS_COMPONENTES = [
  { para: 'Declarar un componente', escribes: 'component ServicioDeReservas' },
  { para: 'Componente en forma abreviada', escribes: '[PantallaDeReservas]' },
  { para: 'Componente con nombre de varias palabras y alias', escribes: '[Pantalla de reservas] as PantallaDeReservas' },
  { para: 'Declarar una interfaz', escribes: 'interface AlmacenDeReservas' },
  { para: 'Interfaz PROVISTA: el componente la ofrece (línea sin punta)', escribes: 'ReservasHttp - AlmacenDeReservas' },
  { para: 'Interfaz REQUERIDA: el componente la usa (flecha con punta)', escribes: 'ServicioDeReservas ..> AlmacenDeReservas' },
  { para: 'Dependencia con etiqueta', escribes: 'PantallaDeReservas ..> ServicioDeReservas : consulta' },
  { para: 'Agrupar componentes en un contenedor', escribes: 'package Infraestructura {\\n  component ReservasHttp\\n}' },
  { para: 'Contenedor con nombre de varias palabras y alias', escribes: 'package "Capa de dominio" as Dominio {\\n  component ServicioDeReservas\\n}' },
  { para: 'Comentario que no se dibuja', escribes: "' esta línea es una nota para quien lea el código" },
];

/** El diagrama de componentes del caso: solución y código inicial a la vez. */
const COMPONENTES = `@startuml
package Presentacion {
  component PantallaDeReservas
  interface AvisoDeSincronizacion
}
package Dominio {
  component ServicioDeReservas
  interface AlmacenDeReservas
}
package Infraestructura {
  component ReservasHttp
  component SincronizadorDeReservas
}
PantallaDeReservas ..> ServicioDeReservas
ServicioDeReservas ..> AlmacenDeReservas
ServicioDeReservas ..> SincronizadorDeReservas
ReservasHttp - AlmacenDeReservas
SincronizadorDeReservas ..> AvisoDeSincronizacion
PantallaDeReservas - AvisoDeSincronizacion
@enduml`;

// ---------------------------------------------------------------------------
// Paquetes
// ---------------------------------------------------------------------------

const ANATOMIA_PAQUETES = [
  {
    elemento: 'Caja de paquete',
    significado:
      'Una agrupación de elementos que se versiona, se compila y se razona como una unidad.',
  },
  {
    elemento: 'Elemento dentro de la caja',
    significado: 'Pertenencia: ese elemento se declara en ese paquete y en ningún otro.',
  },
  {
    elemento: 'Paquete dentro de otro paquete',
    significado: 'Anidamiento: subdivide un paquete grande sin romper su límite exterior.',
  },
  {
    elemento: 'Flecha discontinua con punta',
    significado:
      'Dependencia: el paquete de origen no compila sin el de destino. La punta señala a quien se depende.',
  },
  {
    elemento: 'Etiqueta de la dependencia',
    significado:
      'Motivo por el que existe: qué usa el origen del destino. Sirve para decidir si se puede eliminar.',
  },
  {
    elemento: 'Capa',
    significado:
      'Un paquete al que se le asigna un nivel de responsabilidad, con una regla explícita sobre a qué otros niveles puede depender.',
  },
  {
    elemento: 'Paquete del que no sale ninguna flecha',
    significado:
      'El núcleo del sistema: no conoce a nadie y todos lo conocen a él. En una arquitectura por capas ese paquete es el dominio.',
  },
];

const SINTAXIS_PAQUETES = [
  { para: 'Declarar un paquete vacío', escribes: 'package Dominio' },
  { para: 'Declarar un paquete con contenido', escribes: 'package Dominio {\\n  [Reserva]\\n}' },
  { para: 'Elemento dentro de un paquete', escribes: '[Reserva]' },
  { para: 'Elemento con nombre de varias palabras y alias', escribes: '[Politica de cancelacion] as PoliticaDeCancelacion' },
  { para: 'Paquete con nombre de varias palabras y alias', escribes: 'package "Capa de dominio" as Dominio {\\n  [Reserva]\\n}' },
  { para: 'Dependencia entre paquetes', escribes: 'Presentacion ..> Dominio' },
  { para: 'Dependencia con el motivo anotado', escribes: 'Infraestructura ..> Dominio : implementa los contratos' },
  { para: 'Anidar paquetes', escribes: 'package Dominio {\\n  package Modelo {\\n  }\\n}' },
  { para: 'Comentario que no se dibuja', escribes: "' esta línea es una nota para quien lea el código" },
];

/** El diagrama de paquetes del caso: solución y código inicial a la vez. */
const PAQUETES = `@startuml
package Presentacion {
  [PantallaDeReservas]
  [PantallaDeHistorial]
}
package Dominio {
  [Reserva]
  [PoliticaDeCancelacion]
  [AvisoDeReserva]
}
package Infraestructura {
  [ReservasHttp]
}
package Notificaciones {
  [CorreoSaliente]
}
Presentacion ..> Dominio : usa las reglas
Infraestructura ..> Dominio : implementa los contratos
Notificaciones ..> Dominio : implementa AvisoDeReserva
@enduml`;

// ---------------------------------------------------------------------------

const ejercicios: EjercicioDiagramaDef[] = [
  // -------------------------------------------------------------------------
  {
    slug: 'ejemplo-resuelto-casos-uso-reserva',
    titulo: 'Ejemplo resuelto: casos de uso de la reserva de salas',
    categoria: 'Ejemplo resuelto',
    bloque: 'Punto de partida',
    nivel: 'guiado',
    esEjemplo: true,
    orden: 6,
    motor: 'plantuml',
    tipoDiagrama: 'casos-de-uso',

    problema:
      'La aplicación de reserva de salas de estudio sirve a dos roles con intereses distintos: quien necesita ' +
      'una sala y quien autoriza que se ocupe. Antes de decidir cómo está construida por dentro hay que fijar ' +
      'qué espera cada rol de ella, porque de esa lista sale el alcance de la primera entrega. El diagrama de ' +
      'casos de uso es la vista que responde a esa pregunta y a ninguna otra: enumera objetivos y quién los ' +
      'solicita, sin decir en qué orden ocurren ni con qué pantallas se consiguen.',
    procedencia:
      'El diagrama de casos de uso procede de OOSE (Object-Oriented Software Engineering), el método que Ivar ' +
      'Jacobson publicó en 1992, donde el caso de uso aparece como la unidad con la que se captura lo que el ' +
      'sistema debe hacer para cada rol. Llegó a UML cuando la OMG unificó los métodos de Booch, Rumbaugh y el ' +
      'propio Jacobson, y desde entonces es la vista con la que se delimita el alcance funcional. La notación ' +
      'se escribe aquí en PlantUML porque Mermaid no dispone de casos de uso.',
    encaje:
      'Este ejercicio abre el bloque de Arquitectura y no corresponde a ninguna fase del diseño: es material ' +
      'de lectura previo a las tres categorías que lo siguen. El diagrama de casos de uso se sitúa al ' +
      'principio de la fase de requisitos, antes que la estructura y que el comportamiento interno; el mismo ' +
      'caso aparece resuelto después como componentes y como paquetes, de modo que las tres vistas se pueden ' +
      'contrastar entre sí.',
    anatomia: ANATOMIA_CASOS_DE_USO,
    otrosUsos:
      'La misma idea sostiene buena parte de la práctica de requisitos: las historias de usuario reproducen su ' +
      'estructura de rol, objetivo y resultado; los mapas de capacidades de negocio agrupan objetivos del mismo ' +
      'modo; y los anexos funcionales de un contrato de desarrollo suelen enumerarse como casos de uso, porque ' +
      'delimitan qué se entrega y qué queda fuera.',
    erroresTipicos: [
      'Dibujar un caso de uso sin conectarlo a ningún actor ni a ningún caso que lo incluya. Un objetivo que nadie solicita no pertenece al alcance del sistema.',
      'Dejar un actor dibujado y sin ninguna línea. Un rol que no participa en nada afirma que existe un interesado sin decir qué espera.',
      'Nombrar el caso de uso con un sustantivo suelto, como "Reservas", en lugar de con un objetivo: "Reservar sala".',
      'Descomponer una pantalla en un óvalo por cada pulsación. El caso de uso es un objetivo del actor, no un paso de la interfaz.',
      'Encadenar casos de uso con flechas para indicar el orden en que ocurren. Esta vista no representa secuencia temporal; eso corresponde al diagrama de secuencia o al de flujo.',
      'Invertir la flecha de inclusión. Va del caso base hacia el incluido, porque es el base el que depende del otro.',
      'Dibujar la frontera del sistema alrededor de los actores. Los actores son externos por definición y quedan fuera del rectángulo.',
    ],
    queDibujas:
      'Nada: el diagrama de casos de uso del caso viene ya completo y correcto en el editor, y el ejercicio se ' +
      'aprueba enviándolo tal como está. Sirve para contrastar un diagrama terminado con los que habrá que ' +
      'construir en la categoría "Casos de uso", y para ver en qué se traduce cada comprobación del informe. ' +
      'Una vez visto el informe en verde, modifica el diagrama y vuelve a enviarlo para observar qué ' +
      'comprobación deja de cumplirse con cada cambio: borra la línea entre `Coordinador` y `Aprobar reserva`, ' +
      'quita las tres inclusiones de `Notificar por correo`, añade un tercer actor sin conectarlo a nada o ' +
      'renombra un óvalo como "Sistema". El editor no guarda nada que no se envíe, así que el diagrama ' +
      'original se recupera recargando la página.',
    pasoAPaso: [
      'Lee primero los cinco óvalos: son los objetivos que el sistema ofrece. Cada uno se nombra con verbo en infinitivo más complemento, y ninguno describe una pantalla ni un paso de la interfaz.',
      'Lee después los dos actores y las líneas que salen de ellos. `Alumno` solicita reservar, cancelar y consultar; `Coordinador` aprueba y también consulta. Un mismo caso de uso puede tener más de un actor.',
      'Localiza `Notificar por correo`: es el único óvalo sin línea a un actor. No queda huérfano porque los otros tres casos lo incluyen, y la inclusión significa que se ejecuta siempre que ellos se ejecutan.',
      'Comprueba el sentido de las tres flechas de inclusión: salen del caso base y apuntan al incluido, que es quien resulta reutilizado.',
      'Observa el rectángulo `Reservas de salas`: encierra los óvalos y deja fuera a los actores. Esa es la frontera del sistema.',
      'Envía el diagrama tal como está y lee el informe: cada comprobación nombra una decisión del modelo, no un detalle de escritura.',
      'Borra la línea `Coordinador -- aprobar` y vuelve a enviar. Falla la comprobación de participación de ese actor y también la de casos de uso sin actor, porque `Aprobar reserva` deja de tener quien lo pida.',
      'Recarga la página para recuperar el diagrama original.',
    ],
    sintaxis: SINTAXIS_CASOS_DE_USO,

    codigoInicial: CASOS_DE_USO,

    aserciones: [
      { tipo: 'existe-nodo', parametros: { nombre: 'Alumno', clase: 'actor' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'Coordinador', clase: 'actor' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'Reservar sala', clase: 'caso-de-uso' } },
      { tipo: 'relacion-entre', parametros: { origen: 'Alumno', destino: 'Reservar sala', tipo: 'participa' } },
      { tipo: 'relacion-entre', parametros: { origen: 'Alumno', destino: 'Cancelar reserva', tipo: 'participa' } },
      { tipo: 'relacion-entre', parametros: { origen: 'Coordinador', destino: 'Aprobar reserva', tipo: 'participa' } },
      // La notificación no la pide ningún actor: la incluyen los casos base.
      { tipo: 'relacion-entre', parametros: { origen: 'Reservar sala', destino: 'Notificar por correo', tipo: 'incluye' } },
      { tipo: 'conteo-nodos', parametros: { clase: 'caso-de-uso', min: 4, max: 6 } },
      { tipo: 'sin-casos-uso-sin-actor' },
      { tipo: 'sin-actores-ociosos' },
      { tipo: 'sin-relaciones-duplicadas', oculta: true },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      // La primera referencia es el propio código inicial: el ejercicio se
      // aprueba enviándolo sin tocar nada, y así queda comprobado.
      CASOS_DE_USO,
      // Otra solución válida del mismo caso: sin frontera dibujada, con la forma
      // abreviada de los óvalos, un nombre largo de actor con alias y sin el
      // objetivo de consulta, que no es obligatorio.
      `@startuml
left to right direction
actor Alumno
actor "Coordinador de laboratorio" as Coordinador
(Reservar sala) as reservar
(Cancelar reserva) as cancelar
(Aprobar reserva) as aprobar
(Notificar por correo) as notificar
Alumno -- reservar
Alumno -- cancelar
Coordinador -- aprobar
reservar ..> notificar : <<include>>
cancelar ..> notificar : <<include>>
aprobar ..> notificar : <<include>>
@enduml`,
    ],

    // La trampa retira las tres inclusiones: la notificación queda dibujada
    // dentro de la frontera sin que nadie la solicite ni la ejecute.
    diagramaTrampa: `@startuml
left to right direction
actor Alumno
actor Coordinador
rectangle "Reservas de salas" {
  usecase "Reservar sala" as reservar
  usecase "Cancelar reserva" as cancelar
  usecase "Consultar disponibilidad" as consultar
  usecase "Aprobar reserva" as aprobar
  usecase "Notificar por correo" as notificar
}
Alumno -- reservar
Alumno -- cancelar
Alumno -- consultar
Coordinador -- aprobar
Coordinador -- consultar
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'ejemplo-resuelto-componentes-reserva',
    titulo: 'Ejemplo resuelto: componentes de la reserva de salas',
    categoria: 'Ejemplo resuelto',
    bloque: 'Punto de partida',
    nivel: 'guiado',
    esEjemplo: true,
    orden: 7,
    motor: 'plantuml',
    tipoDiagrama: 'componentes',

    problema:
      'Una vez fijado qué espera cada rol de la aplicación de reservas, queda decidir de qué piezas está hecha ' +
      'y por dónde se conectan entre sí. La pantalla necesita leer y guardar reservas sin saber si llegan de un ' +
      'servicio remoto o de una copia local; el sincronizador necesita avisar de que terminó sin conocer la ' +
      'pantalla a la que avisa. Las dos necesidades se resuelven igual: declarando un contrato y haciendo que ' +
      'las dependencias apunten a él en lugar de a la pieza concreta.',
    procedencia:
      'El diagrama de componentes es la vista de implementación de UML: describe el sistema como piezas ' +
      'sustituibles y los contratos por los que se comunican, en lugar de como clases sueltas. Junto con el ' +
      'diagrama de paquetes —la vista de organización— es de las notaciones que más se siguen usando en la ' +
      'documentación de arquitectura fuera del aula, porque describe el sistema al nivel en el que se decide ' +
      'qué se despliega y qué depende de qué. Se escribe aquí en PlantUML porque Mermaid no dispone de ' +
      'notación de componentes.',
    encaje:
      'Este ejercicio es material de lectura previo a la categoría "Componentes". El diagrama se dibuja cuando ' +
      'ya se sabe qué hace el sistema y hay que decidir en qué piezas se divide: responde a la pregunta "de ' +
      'qué está hecho y por dónde se conecta", mientras que el detalle interno de cada pieza corresponde al ' +
      'diagrama de clases y el reparto en unidades compilables, al de paquetes.',
    anatomia: ANATOMIA_COMPONENTES,
    otrosUsos:
      'La misma idea reaparece en los niveles de contenedor y de componente del modelo C4, en los diagramas de ' +
      'servicios de una arquitectura distribuida, en la topología de un fichero de composición de contenedores ' +
      'y en los mapas de dependencias que generan las herramientas de construcción.',
    erroresTipicos: [
      'Declarar una interfaz que ningún componente provee. El contrato queda sin implementación y la dependencia no se puede resolver.',
      'Conectar el consumidor directamente con el proveedor, sin pasar por la interfaz, con lo que se pierde justamente la sustituibilidad que se buscaba.',
      'Confundir el sentido de la relación: la flecha con punta indica que el componente REQUIERE la interfaz; la línea sin punta, que la PROVEE.',
      'Colocar el acceso a datos dentro de la capa de dominio. El dominio define el contrato; quien habla con la red o con el almacenamiento vive en infraestructura.',
      'Cerrar un ciclo de dependencias entre componentes. Ninguna de las piezas del ciclo se puede sustituir, probar ni desplegar por separado.',
      'Invertir una dependencia y conservar además la original, con lo que el ciclo sigue ahí y la interfaz nueva no sirve para nada.',
      'Nombrar los componentes o los contenedores con palabras que no dicen qué hacen, como "Manager", "Datos" o "Modulo".',
    ],
    queDibujas:
      'Nada: el diagrama de componentes del caso viene ya completo y correcto en el editor, y el ejercicio se ' +
      'aprueba enviándolo tal como está. Sirve para contrastar un diagrama terminado con los que habrá que ' +
      'construir en la categoría "Componentes", y para ver en qué se traduce cada comprobación del informe. ' +
      'Una vez visto el informe en verde, modifica el diagrama y vuelve a enviarlo para observar qué ' +
      'comprobación deja de cumplirse con cada cambio: mueve `ReservasHttp` al paquete `Dominio`, cambia la ' +
      'línea sin punta `ReservasHttp - AlmacenDeReservas` por una flecha, añade la dependencia ' +
      '`SincronizadorDeReservas ..> PantallaDeReservas` o renombra un contenedor como "Datos". El editor no ' +
      'guarda nada que no se envíe, así que el diagrama original se recupera recargando la página.',
    pasoAPaso: [
      'Lee primero los tres contenedores: `Presentacion`, `Dominio` e `Infraestructura`. Cada caja declara a qué capa pertenece lo que envuelve, y con ello qué le está permitido conocer.',
      'Localiza las dos interfaces. `AlmacenDeReservas` está en el dominio y describe cómo se guardan y se leen reservas; `AvisoDeSincronizacion` está en la presentación y describe cómo se avisa de que la sincronización terminó.',
      'Sigue la línea sin punta `ReservasHttp - AlmacenDeReservas`: significa que ese componente PROVEE el contrato. El dominio declara qué necesita y la infraestructura lo implementa.',
      'Sigue la flecha `ServicioDeReservas ..> AlmacenDeReservas`: significa que ese componente REQUIERE el contrato. El servicio no conoce `ReservasHttp` en ningún punto del diagrama.',
      'Repite la lectura con el par `AvisoDeSincronizacion`: lo provee `PantallaDeReservas` y lo requiere `SincronizadorDeReservas`. Sin esa interfaz, el sincronizador tendría que depender de la pantalla y las tres piezas quedarían en ciclo.',
      'Recorre todas las flechas seguidas y comprueba que ninguna vuelve al punto de partida: el grafo de dependencias no tiene ciclos.',
      'Envía el diagrama tal como está y lee el informe: cada comprobación nombra una decisión del modelo, no un detalle de escritura.',
      'Añade la línea `SincronizadorDeReservas ..> PantallaDeReservas` y vuelve a enviar. Falla la comprobación de dependencias circulares, y el detalle nombra las tres piezas que forman el ciclo.',
      'Recarga la página para recuperar el diagrama original.',
    ],
    sintaxis: SINTAXIS_COMPONENTES,

    codigoInicial: COMPONENTES,

    aserciones: [
      { tipo: 'existe-nodo', parametros: { nombre: 'AlmacenDeReservas', clase: 'interfaz' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'AvisoDeSincronizacion', clase: 'interfaz' } },
      { tipo: 'contenido-en-paquete', parametros: { elemento: 'PantallaDeReservas', paquete: 'Presentacion' } },
      { tipo: 'contenido-en-paquete', parametros: { elemento: 'AlmacenDeReservas', paquete: 'Dominio' } },
      { tipo: 'contenido-en-paquete', parametros: { elemento: 'ReservasHttp', paquete: 'Infraestructura' } },
      { tipo: 'relacion-entre', parametros: { origen: 'PantallaDeReservas', destino: 'ServicioDeReservas', tipo: 'dependencia' } },
      { tipo: 'relacion-entre', parametros: { origen: 'ServicioDeReservas', destino: 'AlmacenDeReservas', tipo: 'dependencia' } },
      // Línea sin punta: el componente PROVEE el contrato.
      { tipo: 'relacion-entre', parametros: { origen: 'ReservasHttp', destino: 'AlmacenDeReservas', tipo: 'asociacion' } },
      { tipo: 'relacion-entre', parametros: { origen: 'SincronizadorDeReservas', destino: 'AvisoDeSincronizacion', tipo: 'dependencia' } },
      { tipo: 'sin-ciclos', parametros: { tipos: ['dependencia'] } },
      { tipo: 'sin-relaciones-duplicadas', oculta: true },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      COMPONENTES,
      // Otra solución válida del mismo caso: contenedores con nombre largo y
      // alias, la forma abreviada de los componentes, más piezas por capa y una
      // segunda implementación del mismo contrato, que es justo lo que la
      // interfaz hace posible.
      `@startuml
package "Capa de presentacion" as Presentacion {
  [Pantalla de reservas] as PantallaDeReservas
  [Pantalla de historial] as PantallaDeHistorial
  interface AvisoDeSincronizacion
}
package "Capa de dominio" as Dominio {
  [Servicio de reservas] as ServicioDeReservas
  [Politica de cancelacion] as PoliticaDeCancelacion
  interface AlmacenDeReservas
}
package "Capa de infraestructura" as Infraestructura {
  [Reservas HTTP] as ReservasHttp
  [Reservas en cache] as ReservasCache
  [Sincronizador de reservas] as SincronizadorDeReservas
}
PantallaDeReservas ..> ServicioDeReservas : consulta
PantallaDeHistorial ..> ServicioDeReservas
ServicioDeReservas ..> AlmacenDeReservas
ServicioDeReservas ..> PoliticaDeCancelacion
ServicioDeReservas ..> SincronizadorDeReservas
ReservasHttp - AlmacenDeReservas
ReservasCache - AlmacenDeReservas
SincronizadorDeReservas ..> AvisoDeSincronizacion
PantallaDeReservas - AvisoDeSincronizacion
@enduml`,
    ],

    // La trampa conserva la interfaz de aviso y además deja la dependencia
    // directa del sincronizador hacia la pantalla: el ciclo vuelve a cerrarse.
    diagramaTrampa: `@startuml
package Presentacion {
  component PantallaDeReservas
  interface AvisoDeSincronizacion
}
package Dominio {
  component ServicioDeReservas
  interface AlmacenDeReservas
}
package Infraestructura {
  component ReservasHttp
  component SincronizadorDeReservas
}
PantallaDeReservas ..> ServicioDeReservas
ServicioDeReservas ..> AlmacenDeReservas
ServicioDeReservas ..> SincronizadorDeReservas
ReservasHttp - AlmacenDeReservas
SincronizadorDeReservas ..> AvisoDeSincronizacion
PantallaDeReservas - AvisoDeSincronizacion
SincronizadorDeReservas ..> PantallaDeReservas
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'ejemplo-resuelto-paquetes-reserva',
    titulo: 'Ejemplo resuelto: paquetes de la reserva de salas',
    categoria: 'Ejemplo resuelto',
    bloque: 'Punto de partida',
    nivel: 'guiado',
    esEjemplo: true,
    orden: 8,
    motor: 'plantuml',
    tipoDiagrama: 'paquetes',

    problema:
      'Las piezas de la aplicación de reservas hay que repartirlas en unidades que se compilen, se versionen y ' +
      'se razonen por separado. Ese reparto no es una cuestión de orden: el paquete que envuelve a un elemento ' +
      'decide de qué puede depender ese elemento. Si las reglas de cancelación acaban junto al código que ' +
      'habla con la red, probarlas exige levantar la red y cambiar de proveedor obliga a tocarlas. El diagrama ' +
      'de paquetes fija ese reparto y la dirección de las dependencias entre unidades.',
    procedencia:
      'El diagrama de paquetes es la vista de organización de UML: agrupa los elementos del modelo en unidades ' +
      'con nombre y declara qué unidad depende de cuál. Junto con el diagrama de componentes —la vista de ' +
      'implementación— es de las notaciones que más se siguen usando en la documentación de arquitectura fuera ' +
      'del aula, porque es la que se contrasta directamente con la estructura de módulos del repositorio. Se ' +
      'escribe aquí en PlantUML porque Mermaid no dispone de notación de paquetes.',
    encaje:
      'Este ejercicio es material de lectura previo a la categoría "Paquetes". El diagrama fija la regla ' +
      'estructural del proyecto antes de escribir código y después sirve para contrastarla con lo ' +
      'implementado: responde a la pregunta "qué puede conocer cada unidad", mientras que qué hay dentro de ' +
      'cada una corresponde al diagrama de clases o al de componentes. Cuando el diagrama y el árbol de ' +
      'carpetas del repositorio dejan de coincidir, uno de los dos está mintiendo.',
    anatomia: ANATOMIA_PAQUETES,
    otrosUsos:
      'La misma idea aparece en los módulos de una construcción con Gradle o Maven, en las capas de una ' +
      'aplicación móvil, en los grafos de dependencias que publican los gestores de paquetes y en los ' +
      'registros de decisión de arquitectura, donde la regla "esta capa no puede depender de aquella" se ' +
      'escribe en prosa y se dibuja aquí.',
    erroresTipicos: [
      'Dibujar la dependencia del dominio hacia la infraestructura. La dirección correcta es la contraria: la infraestructura implementa los contratos que el dominio declara.',
      'Dibujar las dos direcciones a la vez. La dependencia queda circular y ninguna de las dos unidades se puede compilar por separado.',
      'Dejar la dependencia sin dirección, con una línea sin punta. Sin punta, el diagrama no dice quién depende de quién.',
      'Colocar una regla del negocio en el paquete de infraestructura, con lo que deja de poder probarse ni cambiarse sin tocar la tecnología.',
      'Dibujar los elementos fuera de los paquetes y dejar las cajas vacías. Sin contenido, el diagrama no dice a qué unidad pertenece cada cosa.',
      'Anidar un paquete dentro de otro para meter en él un elemento que debería estar en el paquete exterior: la pertenencia es la del contenedor inmediato.',
      'Nombrar los paquetes con palabras que no dicen qué responsabilidad agrupan, como "Datos", "Sistema" o "Modulo".',
    ],
    queDibujas:
      'Nada: el diagrama de paquetes del caso viene ya completo y correcto en el editor, y el ejercicio se ' +
      'aprueba enviándolo tal como está. Sirve para contrastar un diagrama terminado con los que habrá que ' +
      'construir en la categoría "Paquetes", y para ver en qué se traduce cada comprobación del informe. Una ' +
      'vez visto el informe en verde, modifica el diagrama y vuelve a enviarlo para observar qué comprobación ' +
      'deja de cumplirse con cada cambio: mueve `PoliticaDeCancelacion` al paquete `Infraestructura`, añade la ' +
      'dependencia `Dominio ..> Infraestructura`, saca `Reserva` fuera de todas las cajas o renombra ' +
      '`Dominio` como "Datos". El editor no guarda nada que no se envíe, así que el diagrama original se ' +
      'recupera recargando la página.',
    pasoAPaso: [
      'Lee primero los cuatro paquetes y su contenido. Cada elemento aparece dentro de una sola caja, y esa caja es la que declara a qué unidad pertenece.',
      'Comprueba qué hay en `Dominio`: la entidad `Reserva`, la regla `PoliticaDeCancelacion` y el contrato `AvisoDeReserva`. Las tres cosas son decisiones del negocio y ninguna necesita red ni pantalla para funcionar.',
      'Comprueba qué hay fuera del dominio: las pantallas en `Presentacion`, el acceso remoto en `Infraestructura` y el envío de correo en `Notificaciones`. Cada una habla con una tecnología concreta.',
      'Sigue las tres flechas: todas apuntan a `Dominio`. La etiqueta de cada una dice por qué existe, que es lo que permite decidir después si se puede eliminar.',
      'Comprueba que del paquete `Dominio` no sale ninguna flecha. Ese es el núcleo: no conoce a nadie y todos lo conocen a él, de modo que sus reglas se pueden probar sin levantar nada.',
      'Observa que `Notificaciones` depende del dominio y no al revés, gracias a que el contrato `AvisoDeReserva` está declarado en el dominio. Esa inversión es lo que impide que las dependencias se cierren en ciclo.',
      'Envía el diagrama tal como está y lee el informe: cada comprobación nombra una decisión del modelo, no un detalle de escritura.',
      'Añade la línea `Dominio ..> Infraestructura` y vuelve a enviar. Falla la comprobación de dependencias circulares, porque las dos capas pasan a depender la una de la otra.',
      'Recarga la página para recuperar el diagrama original.',
    ],
    sintaxis: SINTAXIS_PAQUETES,

    codigoInicial: PAQUETES,

    aserciones: [
      { tipo: 'existe-nodo', parametros: { nombre: 'Dominio', clase: 'paquete' } },
      { tipo: 'contenido-en-paquete', parametros: { elemento: 'PantallaDeReservas', paquete: 'Presentacion' } },
      { tipo: 'contenido-en-paquete', parametros: { elemento: 'Reserva', paquete: 'Dominio' } },
      // La regla del negocio vive en el dominio, no junto al acceso a la red.
      { tipo: 'contenido-en-paquete', parametros: { elemento: 'PoliticaDeCancelacion', paquete: 'Dominio' } },
      { tipo: 'contenido-en-paquete', parametros: { elemento: 'ReservasHttp', paquete: 'Infraestructura' } },
      { tipo: 'relacion-entre', parametros: { origen: 'Presentacion', destino: 'Dominio', tipo: 'dependencia' } },
      { tipo: 'relacion-entre', parametros: { origen: 'Infraestructura', destino: 'Dominio', tipo: 'dependencia' } },
      { tipo: 'relacion-entre', parametros: { origen: 'Notificaciones', destino: 'Dominio', tipo: 'dependencia' } },
      { tipo: 'sin-ciclos' },
      { tipo: 'conteo-nodos', parametros: { clase: 'paquete', min: 3, max: 6 }, oculta: true },
      { tipo: 'sin-relaciones-duplicadas', oculta: true },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      PAQUETES,
      // Otra solución válida del mismo caso: paquetes con nombre largo y alias,
      // elementos con nombre de varias palabras, otro orden de declaración, más
      // contenido por unidad y las dependencias etiquetadas.
      `@startuml
package "Capa de dominio" as Dominio {
  [Reserva]
  [Politica de cancelacion] as PoliticaDeCancelacion
  [Calendario de ocupacion] as CalendarioDeOcupacion
  [AvisoDeReserva]
}
package "Capa de presentacion" as Presentacion {
  [Pantalla de reservas] as PantallaDeReservas
  [Pantalla de historial] as PantallaDeHistorial
}
package "Capa de infraestructura" as Infraestructura {
  [Reservas HTTP] as ReservasHttp
  [Reservas en cache] as ReservasCache
}
package "Envio de notificaciones" as Notificaciones {
  [Correo saliente] as CorreoSaliente
  [Mensajeria movil] as MensajeriaMovil
}
Presentacion ..> Dominio : consulta las reglas
Infraestructura ..> Dominio : implementa los contratos
Notificaciones ..> Dominio : implementa AvisoDeReserva
@enduml`,
    ],

    // La trampa deja la regla de cancelación junto al acceso a la red: el
    // reparto en unidades deja de proteger al dominio.
    diagramaTrampa: `@startuml
package Presentacion {
  [PantallaDeReservas]
  [PantallaDeHistorial]
}
package Dominio {
  [Reserva]
  [AvisoDeReserva]
}
package Infraestructura {
  [ReservasHttp]
  [PoliticaDeCancelacion]
}
package Notificaciones {
  [CorreoSaliente]
}
Presentacion ..> Dominio : usa las reglas
Infraestructura ..> Dominio : implementa los contratos
Notificaciones ..> Dominio : implementa AvisoDeReserva
@enduml`,
  },
];

export default ejercicios;
