import type { EjercicioDiagramaDef } from './tipos.js';

/**
 * Categoría "Componentes": la vista de implementación.
 *
 * Los tres niveles atacan errores documentados en trabajos de alumnos, en orden
 * de dificultad creciente: declarar una interfaz que no provee nadie, colocar un
 * componente fuera del contenedor que le corresponde, y cerrar un ciclo de
 * dependencias entre componentes.
 *
 * El motor es PlantUML porque Mermaid no tiene notación de componentes; el
 * subconjunto admitido es el descrito en la tabla de sintaxis de cada ejercicio.
 */

const ANATOMIA = [
  { elemento: 'Caja de componente', significado: 'Una pieza sustituible del sistema, con un límite definido: un módulo, una librería o un servicio.' },
  { elemento: 'Interfaz', significado: 'El contrato por el que se accede a un componente. Es lo único que sus consumidores conocen de él.' },
  { elemento: 'Interfaz provista (bola)', significado: 'El componente OFRECE ese contrato. Se dibuja con una línea sin punta entre el componente y la interfaz.' },
  { elemento: 'Interfaz requerida (media luna)', significado: 'El componente NECESITA ese contrato para funcionar. Se dibuja con una flecha desde el componente hacia la interfaz.' },
  { elemento: 'Flecha discontinua con punta', significado: 'Dependencia: el origen deja de compilar o de funcionar si el destino cambia.' },
  { elemento: 'Caja que envuelve componentes', significado: 'Contenedor: agrupa las piezas que pertenecen al mismo módulo, capa o unidad de despliegue.' },
  { elemento: 'Estereotipo `<<...>>`', significado: 'Precisa la naturaleza del componente —servicio, librería, base de datos— sin cambiar su semántica.' },
];

const SINTAXIS = [
  { para: 'Declarar un componente', escribes: 'component ServicioDeReservas' },
  { para: 'Componente en forma abreviada', escribes: '[PantallaDeReservas]' },
  { para: 'Componente con nombre de varias palabras y alias', escribes: '[Pantalla de reservas] as PantallaDeReservas' },
  { para: 'Declarar una interfaz', escribes: 'interface AlmacenDeReservas' },
  { para: 'Interfaz PROVISTA: el componente la ofrece (línea sin punta)', escribes: 'ReservasHttp - AlmacenDeReservas' },
  { para: 'Interfaz REQUERIDA: el componente la usa (flecha con punta)', escribes: 'PantallaDeReservas ..> AlmacenDeReservas' },
  { para: 'Dependencia con etiqueta', escribes: 'PantallaDeReservas ..> ServicioDeReservas : consulta' },
  { para: 'Agrupar componentes en un contenedor', escribes: 'package "Infraestructura" {\\n  component ReservasHttp\\n}' },
  { para: 'Estereotipo', escribes: 'component ReservasHttp <<servicio>>' },
  { para: 'Comentario que no se dibuja', escribes: "' esta línea es una nota para quien lea el código" },
];

const PROCEDENCIA =
  'El diagrama de componentes es la vista de implementación de UML: describe el sistema como piezas ' +
  'sustituibles y los contratos por los que se comunican, en lugar de como clases sueltas. Junto con el ' +
  'diagrama de paquetes —la vista de organización— es de las notaciones que más se siguen usando en la ' +
  'documentación de arquitectura fuera del aula, porque describe el sistema al nivel en el que se decide qué ' +
  'se despliega y qué depende de qué.';

const OTROS_USOS =
  'La misma idea reaparece en los niveles de contenedor y de componente del modelo C4, en los diagramas de ' +
  'servicios de una arquitectura distribuida, en la topología de un fichero de composición de contenedores y ' +
  'en los mapas de dependencias que generan las herramientas de construcción.';

const ejercicios: EjercicioDiagramaDef[] = [
  // -------------------------------------------------------------------------
  {
    slug: 'componentes-reservas-interfaz-sin-proveedor',
    titulo: 'Una interfaz que alguien tiene que proveer',
    categoria: 'Componentes',
    bloque: 'Arquitectura',
    nivel: 'guiado',
    orden: 610,
    motor: 'plantuml',
    tipoDiagrama: 'componentes',

    problema:
      'La pantalla de reservas de una aplicación móvil necesita leer y guardar reservas, pero no debe saber si ' +
      'llegan de un servicio remoto o de una copia local. Esa separación se declara como una interfaz. Una ' +
      'interfaz declarada y no provista por ningún componente describe una dependencia que nadie satisface: el ' +
      'sistema dibujado no podría arrancar.',
    procedencia: PROCEDENCIA,
    encaje:
      'Este diagrama se dibuja cuando ya se sabe qué hace el sistema y hay que decidir en qué piezas se ' +
      'divide. Responde a la pregunta "de qué está hecho y por dónde se conecta"; el detalle interno de cada ' +
      'pieza corresponde al diagrama de clases.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Declarar una interfaz que ningún componente provee. El contrato queda sin implementación y la dependencia no se puede resolver.',
      'Conectar el consumidor directamente con el proveedor, sin pasar por la interfaz, con lo que se pierde justamente la sustituibilidad que se buscaba.',
      'Confundir el sentido de la relación: la flecha con punta indica que el componente REQUIERE la interfaz; la línea sin punta, que la PROVEE.',
      'Nombrar los componentes con palabras que no dicen qué hacen, como "Manager" o "Modulo".',
    ],
    queDibujas:
      'Un diagrama de componentes con la interfaz `AlmacenDeReservas`, el componente `ReservasHttp` que la ' +
      'provee y el componente `PantallaDeReservas` que la requiere. La pantalla no debe conectarse ' +
      'directamente con `ReservasHttp`.',
    pasoAPaso: [
      'Abre el diagrama con `@startuml` y ciérralo con `@enduml`.',
      'Declara los dos componentes con `component PantallaDeReservas` y `component ReservasHttp`.',
      'Declara el contrato con `interface AlmacenDeReservas`.',
      'Marca quién PROVEE el contrato con una línea sin punta: `ReservasHttp - AlmacenDeReservas`.',
      'Marca quién lo REQUIERE con una flecha: `PantallaDeReservas ..> AlmacenDeReservas`.',
      'Comprueba que no queda ninguna línea entre `PantallaDeReservas` y `ReservasHttp`: todo pasa por la interfaz.',
    ],
    sintaxis: SINTAXIS,

    codigoInicial: `@startuml
component PantallaDeReservas
component ReservasHttp
' Falta la interfaz AlmacenDeReservas, quién la provee y quién la requiere.
@enduml`,

    aserciones: [
      { tipo: 'existe-nodo', parametros: { nombre: 'AlmacenDeReservas', clase: 'interfaz' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'ReservasHttp', clase: 'componente' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'PantallaDeReservas', clase: 'componente' } },
      { tipo: 'relacion-entre', parametros: { origen: 'ReservasHttp', destino: 'AlmacenDeReservas', tipo: 'asociacion' } },
      { tipo: 'relacion-entre', parametros: { origen: 'PantallaDeReservas', destino: 'AlmacenDeReservas', tipo: 'dependencia' } },
      { tipo: 'sin-relaciones-duplicadas', oculta: true },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `@startuml
component PantallaDeReservas
component ReservasHttp
interface AlmacenDeReservas
ReservasHttp - AlmacenDeReservas
PantallaDeReservas ..> AlmacenDeReservas
@enduml`,
      // Otra solución válida: forma abreviada con alias, un contenedor y una
      // segunda implementación del mismo contrato, que es justo lo que la
      // interfaz hace posible.
      `@startuml
package "Infraestructura" {
  [Reservas HTTP] as ReservasHttp
  [Reservas en cache] as ReservasCache
}
[Pantalla de reservas] as PantallaDeReservas
interface AlmacenDeReservas
ReservasHttp - AlmacenDeReservas
ReservasCache - AlmacenDeReservas
PantallaDeReservas ..> AlmacenDeReservas
@enduml`,
    ],

    // La trampa declara la interfaz, la consume y la deja sin proveedor: la
    // pantalla acaba dependiendo del componente concreto.
    diagramaTrampa: `@startuml
component PantallaDeReservas
component ReservasHttp
interface AlmacenDeReservas
PantallaDeReservas ..> AlmacenDeReservas
PantallaDeReservas ..> ReservasHttp
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'componentes-reservas-capas',
    titulo: 'Cada componente en su capa',
    categoria: 'Componentes',
    bloque: 'Arquitectura',
    nivel: 'base',
    orden: 620,
    motor: 'plantuml',
    tipoDiagrama: 'componentes',

    problema:
      'La aplicación de reservas se organiza en tres capas: presentación, dominio e infraestructura. La caja ' +
      'que envuelve a un componente no es un adorno del dibujo: declara a qué capa pertenece y, con ello, qué ' +
      'le está permitido conocer. Un componente colocado en la capa equivocada documenta una arquitectura que ' +
      'no es la que se implementó.',
    procedencia: PROCEDENCIA,
    encaje:
      'Es el diagrama que acompaña a la decisión de estructura del proyecto y se contrasta con el árbol de ' +
      'carpetas o de módulos del repositorio. Cuando los dos dejan de coincidir, uno de ellos está mintiendo.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Colocar el acceso a datos dentro de la capa de dominio. El dominio define el contrato; quien habla con la red o con la base de datos vive en infraestructura.',
      'Dibujar los contenedores sin meter nada dentro y poner los componentes fuera, con lo que las cajas dejan de decir a qué capa pertenece cada pieza.',
      'Declarar la interfaz en la capa que la implementa en vez de en la que la usa, que es lo que invierte la dependencia.',
      'Nombrar las capas con palabras vacías. "Presentación", "Dominio" e "Infraestructura" nombran responsabilidades; "Datos" o "Sistema", no.',
    ],
    queDibujas:
      'Un diagrama con tres contenedores —`Presentacion`, `Dominio` e `Infraestructura`— y los componentes ' +
      '`PantallaDeReservas`, `ServicioDeReservas` y `ReservasHttp` dentro del que le corresponde a cada uno. ' +
      'La interfaz `AlmacenDeReservas` va en `Dominio`, la provee `ReservasHttp` y la requiere ' +
      '`ServicioDeReservas`. La pantalla depende del servicio.',
    sintaxis: SINTAXIS,

    codigoInicial: `@startuml
package Presentacion {
  component PantallaDeReservas
}
package Dominio {
  component ServicioDeReservas
}
package Infraestructura {
}
' Falta la interfaz AlmacenDeReservas, el componente ReservasHttp y las dependencias.
@enduml`,

    aserciones: [
      { tipo: 'contenido-en-paquete', parametros: { elemento: 'PantallaDeReservas', paquete: 'Presentacion' } },
      { tipo: 'contenido-en-paquete', parametros: { elemento: 'ServicioDeReservas', paquete: 'Dominio' } },
      { tipo: 'contenido-en-paquete', parametros: { elemento: 'AlmacenDeReservas', paquete: 'Dominio' } },
      { tipo: 'contenido-en-paquete', parametros: { elemento: 'ReservasHttp', paquete: 'Infraestructura' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'AlmacenDeReservas', clase: 'interfaz' } },
      { tipo: 'relacion-entre', parametros: { origen: 'PantallaDeReservas', destino: 'ServicioDeReservas', tipo: 'dependencia' } },
      { tipo: 'relacion-entre', parametros: { origen: 'ServicioDeReservas', destino: 'AlmacenDeReservas', tipo: 'dependencia' } },
      { tipo: 'relacion-entre', parametros: { origen: 'ReservasHttp', destino: 'AlmacenDeReservas', tipo: 'asociacion' } },
      { tipo: 'conteo-nodos', parametros: { clase: 'paquete', min: 3 }, oculta: true },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `@startuml
package Presentacion {
  component PantallaDeReservas
}
package Dominio {
  component ServicioDeReservas
  interface AlmacenDeReservas
}
package Infraestructura {
  component ReservasHttp
}
PantallaDeReservas ..> ServicioDeReservas
ServicioDeReservas ..> AlmacenDeReservas
ReservasHttp - AlmacenDeReservas
@enduml`,
      // Variante válida: contenedores con nombre largo y alias, más componentes
      // por capa y una segunda implementación del contrato.
      `@startuml
package "Capa de infraestructura" as Infraestructura {
  [Reservas HTTP] as ReservasHttp
  [Reservas en cache] as ReservasCache
}
package "Capa de dominio" as Dominio {
  [Servicio de reservas] as ServicioDeReservas
  [Politica de cancelacion] as PoliticaDeCancelacion
  interface AlmacenDeReservas
}
package "Capa de presentacion" as Presentacion {
  [Pantalla de reservas] as PantallaDeReservas
  [Pantalla de historial] as PantallaDeHistorial
}
PantallaDeReservas ..> ServicioDeReservas
PantallaDeHistorial ..> ServicioDeReservas
ServicioDeReservas ..> AlmacenDeReservas
ServicioDeReservas ..> PoliticaDeCancelacion
ReservasHttp - AlmacenDeReservas
ReservasCache - AlmacenDeReservas
@enduml`,
    ],

    // La trampa mete el acceso a la red dentro de la capa de dominio.
    diagramaTrampa: `@startuml
package Presentacion {
  component PantallaDeReservas
}
package Dominio {
  component ServicioDeReservas
  interface AlmacenDeReservas
  component ReservasHttp
}
package Infraestructura {
}
PantallaDeReservas ..> ServicioDeReservas
ServicioDeReservas ..> AlmacenDeReservas
ReservasHttp - AlmacenDeReservas
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'componentes-reservas-ciclo',
    titulo: 'Romper una dependencia circular',
    categoria: 'Componentes',
    bloque: 'Arquitectura',
    nivel: 'reto',
    orden: 630,
    motor: 'plantuml',
    tipoDiagrama: 'componentes',

    problema:
      'En el diagrama de partida la pantalla depende del servicio, el servicio depende del sincronizador y el ' +
      'sincronizador vuelve a depender de la pantalla para avisarle de que terminó. Ese ciclo impide compilar, ' +
      'desplegar o probar cualquiera de las tres piezas por separado: para entender una hay que entender las ' +
      'tres a la vez.',
    procedencia: PROCEDENCIA,
    encaje:
      'La forma estándar de romper un ciclo es invertir una de las dependencias: en lugar de que el ' +
      'sincronizador conozca a la pantalla, se declara una interfaz de aviso que la pantalla provee y que el ' +
      'sincronizador requiere. La dependencia sigue existiendo, pero ahora apunta a un contrato y no a una ' +
      'pieza concreta.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Cerrar un ciclo de dependencias entre componentes. Ninguna de las piezas del ciclo se puede sustituir, probar ni desplegar por separado.',
      'Intentar romper el ciclo borrando una flecha sin sustituirla por nada, con lo que el diagrama deja de reflejar lo que el sistema necesita.',
      'Invertir la dependencia pero dejar además la original, con lo que el ciclo sigue ahí y ahora hay una interfaz que no sirve para nada.',
      'Conectar el consumidor de la interfaz con la línea sin punta, que significa que la provee: el sentido de la relación cambia quién depende de quién.',
    ],
    queDibujas:
      'El diagrama corregido, sin dependencias circulares. Declara la interfaz `AvisoDeSincronizacion`, hazla ' +
      'proveer por `PantallaDeReservas` y requerir por `SincronizadorDeReservas`, y conserva las dependencias ' +
      'de `PantallaDeReservas` hacia `ServicioDeReservas` y de `ServicioDeReservas` hacia ' +
      '`SincronizadorDeReservas`. Elimina la dependencia directa que cerraba el ciclo.',
    sintaxis: SINTAXIS,

    // El punto de partida ES el diagrama defectuoso: el alumno lo corrige.
    codigoInicial: `@startuml
component PantallaDeReservas
component ServicioDeReservas
component SincronizadorDeReservas
PantallaDeReservas ..> ServicioDeReservas
ServicioDeReservas ..> SincronizadorDeReservas
SincronizadorDeReservas ..> PantallaDeReservas
' El sincronizador depende de la pantalla para avisarle: eso cierra el ciclo.
@enduml`,

    aserciones: [
      { tipo: 'sin-ciclos', parametros: { tipos: ['dependencia'] } },
      { tipo: 'existe-nodo', parametros: { nombre: 'AvisoDeSincronizacion', clase: 'interfaz' } },
      { tipo: 'relacion-entre', parametros: { origen: 'PantallaDeReservas', destino: 'ServicioDeReservas', tipo: 'dependencia' } },
      { tipo: 'relacion-entre', parametros: { origen: 'ServicioDeReservas', destino: 'SincronizadorDeReservas', tipo: 'dependencia' } },
      { tipo: 'relacion-entre', parametros: { origen: 'SincronizadorDeReservas', destino: 'AvisoDeSincronizacion', tipo: 'dependencia' } },
      { tipo: 'relacion-entre', parametros: { origen: 'PantallaDeReservas', destino: 'AvisoDeSincronizacion', tipo: 'asociacion' } },
      { tipo: 'sin-relaciones-duplicadas' },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `@startuml
component PantallaDeReservas
component ServicioDeReservas
component SincronizadorDeReservas
interface AvisoDeSincronizacion
PantallaDeReservas ..> ServicioDeReservas
ServicioDeReservas ..> SincronizadorDeReservas
SincronizadorDeReservas ..> AvisoDeSincronizacion
PantallaDeReservas - AvisoDeSincronizacion
@enduml`,
      // Variante válida: las mismas dependencias repartidas por capas, con
      // nombres largos y una pieza más en infraestructura.
      `@startuml
package "Presentacion" {
  [Pantalla de reservas] as PantallaDeReservas
  interface AvisoDeSincronizacion
}
package "Dominio" {
  [Servicio de reservas] as ServicioDeReservas
}
package "Infraestructura" {
  [Sincronizador de reservas] as SincronizadorDeReservas
  [Cola de envios] as ColaDeEnvios
}
PantallaDeReservas ..> ServicioDeReservas
ServicioDeReservas ..> SincronizadorDeReservas
SincronizadorDeReservas ..> ColaDeEnvios
SincronizadorDeReservas ..> AvisoDeSincronizacion
PantallaDeReservas - AvisoDeSincronizacion
@enduml`,
    ],

    // La trampa declara la interfaz y la conecta bien, pero conserva la
    // dependencia directa que cerraba el ciclo.
    diagramaTrampa: `@startuml
component PantallaDeReservas
component ServicioDeReservas
component SincronizadorDeReservas
interface AvisoDeSincronizacion
PantallaDeReservas ..> ServicioDeReservas
ServicioDeReservas ..> SincronizadorDeReservas
SincronizadorDeReservas ..> AvisoDeSincronizacion
PantallaDeReservas - AvisoDeSincronizacion
SincronizadorDeReservas ..> PantallaDeReservas
@enduml`,
  },
];

export default ejercicios;
