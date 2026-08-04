import type { EjercicioDiagramaDef } from './tipos.js';

/**
 * Categoría "Paquetes": la vista de organización.
 *
 * Los tres niveles atacan errores documentados en trabajos de alumnos, en orden
 * de dificultad creciente: dibujar la dependencia del dominio hacia la
 * infraestructura en vez de al revés, colocar un elemento en el paquete
 * equivocado, y cerrar un ciclo de dependencias entre paquetes.
 *
 * El motor es PlantUML porque Mermaid no tiene notación de paquetes; el
 * subconjunto admitido es el descrito en la tabla de sintaxis de cada ejercicio.
 */

const ANATOMIA = [
  { elemento: 'Caja de paquete', significado: 'Una agrupación de elementos que se versiona, se compila y se razona como una unidad.' },
  { elemento: 'Elemento dentro de la caja', significado: 'Pertenencia: ese elemento se declara en ese paquete y en ningún otro.' },
  { elemento: 'Paquete dentro de otro paquete', significado: 'Anidamiento: subdivide un paquete grande sin romper su límite exterior.' },
  { elemento: 'Flecha discontinua con punta', significado: 'Dependencia: el paquete de origen no compila sin el de destino. La punta señala a quien se depende.' },
  { elemento: 'Etiqueta de la dependencia', significado: 'Motivo por el que existe: qué usa el origen del destino. Sirve para decidir si se puede eliminar.' },
  { elemento: 'Capa', significado: 'Un paquete al que se le asigna un nivel de responsabilidad, con una regla explícita sobre a qué otros niveles puede depender.' },
];

const SINTAXIS = [
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

const PROCEDENCIA =
  'El diagrama de paquetes es la vista de organización de UML: agrupa los elementos del modelo en unidades ' +
  'con nombre y declara qué unidad depende de cuál. Junto con el diagrama de componentes —la vista de ' +
  'implementación— es de las notaciones que más se siguen usando en la documentación de arquitectura fuera ' +
  'del aula, porque es la que se contrasta directamente con la estructura de módulos del repositorio.';

const OTROS_USOS =
  'La misma idea aparece en los módulos de una construcción con Gradle o Maven, en las capas de una ' +
  'aplicación móvil, en los grafos de dependencias que publican los gestores de paquetes y en los registros ' +
  'de decisión de arquitectura, donde la regla "esta capa no puede depender de aquella" se escribe en prosa ' +
  'y se dibuja aquí.';

const ejercicios: EjercicioDiagramaDef[] = [
  // -------------------------------------------------------------------------
  {
    slug: 'paquetes-reservas-direccion-de-capas',
    titulo: 'Hacia dónde apuntan las dependencias entre capas',
    categoria: 'Paquetes',
    bloque: 'Arquitectura',
    nivel: 'guiado',
    orden: 710,
    motor: 'plantuml',
    tipoDiagrama: 'paquetes',

    problema:
      'La aplicación de reservas se reparte en tres paquetes: presentación, dominio e infraestructura. El ' +
      'dominio contiene las reglas del negocio y la infraestructura habla con la red y con el almacenamiento. ' +
      'Si el dominio depende de la infraestructura, las reglas dejan de poder probarse sin red y cualquier ' +
      'cambio de tecnología las arrastra: esa es la dependencia que las arquitecturas por capas quieren evitar.',
    procedencia: PROCEDENCIA,
    encaje:
      'Este diagrama fija la regla estructural del proyecto antes de escribir código, y después sirve para ' +
      'contrastarla con lo implementado. Responde a la pregunta "qué puede conocer cada capa"; qué hay dentro ' +
      'de cada una corresponde al diagrama de clases o al de componentes.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Dibujar la dependencia del dominio hacia la infraestructura. La dirección correcta es la contraria: la infraestructura implementa los contratos que el dominio declara.',
      'Dibujar las dos direcciones a la vez. La dependencia queda circular y ninguna de las dos capas se puede compilar por separado.',
      'Dejar la dependencia sin dirección, con una línea sin punta. Sin punta, el diagrama no dice quién depende de quién.',
      'Nombrar los paquetes con palabras que no dicen qué responsabilidad agrupan, como "Datos", "Sistema" o "Modulo".',
    ],
    queDibujas:
      'Un diagrama de paquetes con `Presentacion`, `Dominio` e `Infraestructura`, y las dependencias que ' +
      'correspondan a una arquitectura por capas: presentación e infraestructura dependen del dominio, y el ' +
      'dominio no depende de ninguna de las dos.',
    pasoAPaso: [
      'Abre el diagrama con `@startuml` y ciérralo con `@enduml`.',
      'Declara los tres paquetes con `package Presentacion`, `package Dominio` y `package Infraestructura`.',
      'Decide la dirección: el dominio contiene las reglas y no debe conocer ni la pantalla ni la red, así que ninguna flecha sale de él.',
      'Dibuja `Presentacion ..> Dominio`: la pantalla usa las reglas.',
      'Dibuja `Infraestructura ..> Dominio`: quien habla con la red implementa los contratos que el dominio declara.',
      'Comprueba que del paquete `Dominio` no sale ninguna flecha.',
    ],
    sintaxis: SINTAXIS,

    codigoInicial: `@startuml
package Presentacion
package Dominio
package Infraestructura
' Faltan las dependencias entre las tres capas, con su dirección.
@enduml`,

    aserciones: [
      { tipo: 'existe-nodo', parametros: { nombre: 'Presentacion', clase: 'paquete' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'Dominio', clase: 'paquete' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'Infraestructura', clase: 'paquete' } },
      { tipo: 'relacion-entre', parametros: { origen: 'Presentacion', destino: 'Dominio', tipo: 'dependencia' } },
      { tipo: 'relacion-entre', parametros: { origen: 'Infraestructura', destino: 'Dominio', tipo: 'dependencia' } },
      // Si además se dibuja la dependencia contraria, el par queda circular y
      // esta comprobación lo detecta.
      { tipo: 'sin-ciclos', oculta: true },
      { tipo: 'sin-relaciones-duplicadas', oculta: true },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `@startuml
package Presentacion
package Dominio
package Infraestructura
Presentacion ..> Dominio
Infraestructura ..> Dominio
@enduml`,
      // Otra solución válida: paquetes con contenido y con alias, dependencias
      // etiquetadas y un cuarto paquete que también respeta la dirección.
      `@startuml
package "Capa de presentacion" as Presentacion {
  [Pantalla de reservas]
}
package "Capa de dominio" as Dominio {
  [Reserva]
  [AlmacenDeReservas]
}
package "Capa de infraestructura" as Infraestructura {
  [Reservas HTTP]
}
package Notificaciones {
  [Correo saliente]
}
Presentacion ..> Dominio : usa las reglas
Infraestructura ..> Dominio : implementa los contratos
Notificaciones ..> Dominio
@enduml`,
    ],

    // La trampa invierte la dependencia: el dominio pasa a conocer la
    // infraestructura.
    diagramaTrampa: `@startuml
package Presentacion
package Dominio
package Infraestructura
Presentacion ..> Dominio
Dominio ..> Infraestructura
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'paquetes-reservas-elemento-mal-colocado',
    titulo: 'Cada elemento en el paquete que le corresponde',
    categoria: 'Paquetes',
    bloque: 'Arquitectura',
    nivel: 'base',
    orden: 720,
    motor: 'plantuml',
    tipoDiagrama: 'paquetes',

    problema:
      'Las reglas de cancelación de una reserva son una decisión del negocio: cuánta antelación exige, qué ' +
      'penalización aplica. Si esa política se declara junto al código que llama al servicio remoto, cambiar ' +
      'de proveedor obliga a tocar las reglas, y probar las reglas obliga a levantar la red. El paquete que ' +
      'envuelve a un elemento decide de qué depende.',
    procedencia: PROCEDENCIA,
    encaje:
      'Este diagrama se compara elemento a elemento con el árbol de carpetas del repositorio. Es la forma más ' +
      'barata de detectar que una clase acabó en la capa equivocada, antes de que la dependencia se propague ' +
      'al resto del proyecto.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Colocar una regla del negocio en el paquete de infraestructura, con lo que deja de poder probarse ni cambiarse sin tocar la tecnología.',
      'Dibujar los elementos fuera de los paquetes y dejar las cajas vacías. Sin contenido, el diagrama no dice a qué unidad pertenece cada cosa.',
      'Repartir un mismo concepto entre dos paquetes, con lo que ninguno de los dos lo posee y ambos dependen del otro.',
      'Anidar un paquete dentro de otro para meter en él un elemento que debería estar en el paquete exterior: la pertenencia es la del contenedor inmediato.',
    ],
    queDibujas:
      'Un diagrama con los paquetes `Presentacion`, `Dominio` e `Infraestructura`. Coloca `PantallaDeReservas` ' +
      'en presentación; `Reserva` y `PoliticaDeCancelacion` en dominio; y `ReservasHttp` en infraestructura. ' +
      'Añade las dependencias de presentación y de infraestructura hacia el dominio.',
    sintaxis: SINTAXIS,

    codigoInicial: `@startuml
package Presentacion {
  [PantallaDeReservas]
}
package Dominio {
  [Reserva]
}
package Infraestructura {
  [ReservasHttp]
  [PoliticaDeCancelacion]
}
Presentacion ..> Dominio
Infraestructura ..> Dominio
' La politica de cancelacion es una regla del negocio: revisa en que paquete esta.
@enduml`,

    aserciones: [
      { tipo: 'contenido-en-paquete', parametros: { elemento: 'PantallaDeReservas', paquete: 'Presentacion' } },
      { tipo: 'contenido-en-paquete', parametros: { elemento: 'Reserva', paquete: 'Dominio' } },
      { tipo: 'contenido-en-paquete', parametros: { elemento: 'PoliticaDeCancelacion', paquete: 'Dominio' } },
      { tipo: 'contenido-en-paquete', parametros: { elemento: 'ReservasHttp', paquete: 'Infraestructura' } },
      { tipo: 'relacion-entre', parametros: { origen: 'Presentacion', destino: 'Dominio', tipo: 'dependencia' } },
      { tipo: 'relacion-entre', parametros: { origen: 'Infraestructura', destino: 'Dominio', tipo: 'dependencia' } },
      { tipo: 'sin-ciclos', oculta: true },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `@startuml
package Presentacion {
  [PantallaDeReservas]
}
package Dominio {
  [Reserva]
  [PoliticaDeCancelacion]
}
package Infraestructura {
  [ReservasHttp]
}
Presentacion ..> Dominio
Infraestructura ..> Dominio
@enduml`,
      // Variante válida: paquetes con alias, más elementos por paquete, otro
      // orden de declaración y dependencias etiquetadas.
      `@startuml
package "Capa de dominio" as Dominio {
  [Reserva]
  [Politica de cancelacion] as PoliticaDeCancelacion
  [Calendario de ocupacion] as CalendarioDeOcupacion
}
package "Capa de presentacion" as Presentacion {
  [Pantalla de reservas] as PantallaDeReservas
  [Pantalla de historial] as PantallaDeHistorial
}
package "Capa de infraestructura" as Infraestructura {
  [Reservas HTTP] as ReservasHttp
  [Reservas en cache] as ReservasCache
}
Presentacion ..> Dominio : consulta las reglas
Infraestructura ..> Dominio : implementa los contratos
@enduml`,
    ],

    // La trampa es el diagrama de partida: la regla del negocio se queda en
    // infraestructura.
    diagramaTrampa: `@startuml
package Presentacion {
  [PantallaDeReservas]
}
package Dominio {
  [Reserva]
}
package Infraestructura {
  [ReservasHttp]
  [PoliticaDeCancelacion]
}
Presentacion ..> Dominio
Infraestructura ..> Dominio
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'paquetes-reservas-ciclo-de-dependencias',
    titulo: 'Romper un ciclo de dependencias entre paquetes',
    categoria: 'Paquetes',
    bloque: 'Arquitectura',
    nivel: 'reto',
    orden: 730,
    motor: 'plantuml',
    tipoDiagrama: 'paquetes',

    problema:
      'En el diagrama de partida, presentación depende de dominio, dominio depende de notificaciones y ' +
      'notificaciones vuelve a depender de presentación para reutilizar sus plantillas. Los tres paquetes ' +
      'forman un ciclo: no hay orden en el que compilarlos, ninguno se puede publicar por separado y un cambio ' +
      'en cualquiera obliga a reconstruir los otros dos.',
    procedencia: PROCEDENCIA,
    encaje:
      'El principio de dependencias acíclicas exige que el grafo de dependencias entre paquetes no tenga ' +
      'ciclos, y la forma habitual de cumplirlo es invertir una de las dependencias: el paquete que quedaba ' +
      'arriba declara el contrato y el que quedaba abajo lo implementa. La estructura resultante es la misma ' +
      'que aplica una arquitectura por capas.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Dejar un ciclo de dependencias entre paquetes, con lo que ninguno de ellos se puede compilar, versionar ni publicar por separado.',
      'Romper el ciclo duplicando código en los dos paquetes en vez de invertir la dependencia: el ciclo desaparece del diagrama, pero el acoplamiento sigue.',
      'Invertir una dependencia y conservar además la original, con lo que el ciclo se mantiene.',
      'Crear un paquete intermedio sin responsabilidad propia solo para romper el ciclo, y nombrarlo con una palabra vacía.',
    ],
    queDibujas:
      'El diagrama corregido, sin ciclos. Conserva los paquetes `Presentacion`, `Dominio` y `Notificaciones`, ' +
      'e invierte la dependencia que cierra el ciclo: `Notificaciones` debe depender de `Dominio`, y ' +
      '`Dominio` no debe depender de `Notificaciones`. `Presentacion` sigue dependiendo de `Dominio`. Puedes ' +
      'añadir algún paquete más si lo justifica el dominio.',
    sintaxis: SINTAXIS,

    // El punto de partida ES el diagrama defectuoso: el alumno lo corrige.
    codigoInicial: `@startuml
package Presentacion
package Dominio
package Notificaciones
Presentacion ..> Dominio
Dominio ..> Notificaciones
Notificaciones ..> Presentacion
' El ciclo: Presentacion depende de Dominio, Dominio de Notificaciones
' y Notificaciones vuelve a Presentacion.
@enduml`,

    aserciones: [
      { tipo: 'sin-ciclos' },
      { tipo: 'existe-nodo', parametros: { nombre: 'Presentacion', clase: 'paquete' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'Dominio', clase: 'paquete' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'Notificaciones', clase: 'paquete' } },
      { tipo: 'relacion-entre', parametros: { origen: 'Presentacion', destino: 'Dominio', tipo: 'dependencia' } },
      { tipo: 'relacion-entre', parametros: { origen: 'Notificaciones', destino: 'Dominio', tipo: 'dependencia' } },
      { tipo: 'conteo-nodos', parametros: { clase: 'paquete', min: 3, max: 6 }, oculta: true },
      { tipo: 'sin-relaciones-duplicadas', oculta: true },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `@startuml
package Presentacion
package Dominio
package Notificaciones
Presentacion ..> Dominio
Notificaciones ..> Dominio
@enduml`,
      // Variante válida: paquetes con contenido y alias, un cuarto paquete de
      // infraestructura y el contrato de aviso declarado en el dominio, que es
      // lo que permite invertir la dependencia.
      `@startuml
package "Capa de presentacion" as Presentacion {
  [Pantalla de reservas]
}
package "Capa de dominio" as Dominio {
  [Reserva]
  [AvisoDeReserva]
}
package "Envio de notificaciones" as Notificaciones {
  [Correo saliente]
  [Mensajeria movil]
}
package "Capa de infraestructura" as Infraestructura {
  [Reservas HTTP]
}
Presentacion ..> Dominio
Notificaciones ..> Dominio : implementa AvisoDeReserva
Infraestructura ..> Dominio
@enduml`,
    ],

    // La trampa invierte la dependencia pero conserva la original: el ciclo,
    // ahora entre dos paquetes, sigue ahí.
    diagramaTrampa: `@startuml
package Presentacion
package Dominio
package Notificaciones
Presentacion ..> Dominio
Notificaciones ..> Dominio
Dominio ..> Notificaciones
@enduml`,
  },
];

export default ejercicios;
