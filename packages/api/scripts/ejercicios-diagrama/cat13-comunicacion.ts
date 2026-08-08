import type { EjercicioDiagramaDef } from './tipos.js';

/**
 * Categoría "Comunicación": la misma interacción que la secuencia, con el
 * énfasis puesto en la ESTRUCTURA.
 *
 * Los tres niveles se apoyan en el mismo escenario que ya tiene diagrama de
 * secuencia, porque el aprendizaje está en la comparación: quién habla con quién
 * se ve mejor aquí; cuándo ocurre cada cosa se ve mejor allí. Y la numeración es
 * lo único que sostiene el orden, así que perderla es perder media vista.
 */

const CLASES_RESERVA = `@startuml
class PantallaReserva {
  +confirmar() : void
}
class ServicioReservas {
  +crearReserva() : Reserva
  +comprobarDisponibilidad() : boolean
}
class RepositorioSalas {
  +buscarLibre() : Sala
}
class Notificador {
  +enviarConfirmacion() : void
}
PantallaReserva --> ServicioReservas
ServicioReservas --> RepositorioSalas
ServicioReservas --> Notificador
@enduml`;

const ANATOMIA = [
  { elemento: 'Caja con nombre subrayado', significado: 'Un objeto que participa en la interacción. Es un ejemplar, no una clase.' },
  { elemento: 'Línea entre dos objetos', significado: 'Enlace: existe una vía por la que pueden hablarse. Sin enlace no puede haber mensaje.' },
  { elemento: 'Flecha sobre el enlace', significado: 'Un mensaje concreto, con la dirección en que viaja.' },
  { elemento: 'Número `1`, `1.1`, `1.2`', significado: 'El orden. Aquí NO hay eje temporal: la secuencia la fija exclusivamente la numeración.' },
  { elemento: 'Numeración jerárquica', significado: '`1.1` ocurre dentro de `1`: es una llamada anidada, no la siguiente en la lista.' },
  { elemento: 'Nombre del mensaje', significado: 'La operación que se invoca. Tiene que existir en la clase del objeto que la recibe.' },
];

const SINTAXIS = [
  { para: 'Declarar un participante', escribes: 'object ServicioReservas' },
  { para: 'Un mensaje numerado', escribes: 'PantallaReserva -> ServicioReservas : 1: crearReserva()' },
  { para: 'Una llamada anidada', escribes: 'ServicioReservas -> RepositorioSalas : 1.1: buscarLibre()' },
  { para: 'La respuesta, como mensaje propio', escribes: 'RepositorioSalas -> ServicioReservas : 1.2: salaLibre' },
];

const PROCEDENCIA =
  'Se llamaba diagrama de COLABORACIÓN en UML 1.x y pasó a llamarse de comunicación en UML 2.0. Procede de ' +
  'los diagramas de objetos de Booch, y la OMG lo mantiene como la otra forma de ver una interacción: la ' +
  'misma información que la secuencia, organizada por estructura en vez de por tiempo.';

const OTROS_USOS =
  'La misma idea —quién habla con quién, y en qué orden— está detrás de un diagrama de llamadas entre ' +
  'servicios, de una traza distribuida y del grafo de dependencias que dibuja un depurador al seguir una ' +
  'petición.';

const ejercicios: EjercicioDiagramaDef[] = [
  // -------------------------------------------------------------------------
  {
    slug: 'ejemplo-resuelto-comunicacion-reserva',
    titulo: 'Ejemplo resuelto: reservar una sala, visto por estructura',
    categoria: 'Comunicación',
    bloque: 'Interacción',
    nivel: 'guiado',
    orden: 1,
    esEjemplo: true,
    motor: 'plantuml',
    tipoDiagrama: 'comunicacion',

    problema:
      'El mismo escenario que ya se modeló con un diagrama de secuencia —reservar una sala— dibujado con el ' +
      'énfasis en quién está conectado con quién. Lo que en la secuencia era el eje vertical del tiempo, aquí ' +
      'es la numeración. Este ejemplo lo muestra resuelto para poder compararlos.',
    procedencia: PROCEDENCIA,
    encaje:
      'Se dibuja cuando lo que interesa no es el instante sino la topología: cuántos objetos se hablan entre ' +
      'sí y cuáles quedan aislados. Es la vista que delata un objeto que habla con todos.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Omitir la numeración. Sin ella el diagrama no dice en qué orden pasan las cosas, y deja de ser una interacción para ser un grafo de enlaces.',
      'Numerar todo en plano (1, 2, 3) cuando hay llamadas anidadas. `1.1` dice que ocurre DENTRO de `1`; escribir `2` afirma que ocurre después y por separado.',
      'Invocar una operación que la clase del receptor no declara. Es el error dominante, y solo se ve cruzando con el diagrama de clases.',
      'Dibujar un participante que no interviene en ningún mensaje.',
    ],
    queDibujas:
      'Nada: este ejercicio ya viene resuelto. Léelo, envíalo para ver cómo se comprueba y úsalo como ' +
      'referencia en los tres siguientes.',
    pasoAPaso: [
      'Fíjate en que los cuatro participantes están declarados con `object`.',
      'Sigue la numeración: `1` es la llamada de la pantalla, y `1.1` y `1.2` ocurren dentro de ella.',
      'Comprueba que cada nombre de mensaje es una operación declarada en la clase del receptor.',
      'Compara con el diagrama de secuencia del mismo escenario: la información es la misma, la organización no.',
    ],
    sintaxis: SINTAXIS,

    diagramasContexto: [
      { nombre: 'clases', titulo: 'Diagrama de clases del sistema de reservas', tipo: 'clases', motor: 'plantuml', codigo: CLASES_RESERVA },
    ],

    codigoInicial: `@startuml
object PantallaReserva
object ServicioReservas
object RepositorioSalas
object Notificador
PantallaReserva -> ServicioReservas : 1: crearReserva()
ServicioReservas -> RepositorioSalas : 1.1: buscarLibre()
ServicioReservas -> Notificador : 1.2: enviarConfirmacion()
@enduml`,

    aserciones: [
      { tipo: 'mensaje-entre', parametros: { de: 'PantallaReserva', a: 'ServicioReservas', texto: 'crearReserva' } },
      { tipo: 'mensaje-entre', parametros: { de: 'ServicioReservas', a: 'RepositorioSalas', texto: 'buscarLibre' } },
      { tipo: 'orden-de-mensajes', parametros: { mensajes: ['crearReserva', 'buscarLibre', 'enviarConfirmacion'] } },
      { tipo: 'mensaje-existe-como-operacion', parametros: { contexto: 'clases' } },
      { tipo: 'conteo-nodos', parametros: { min: 4 } },
    ],

    diagramasReferencia: [
      `@startuml
object PantallaReserva
object ServicioReservas
object RepositorioSalas
object Notificador
PantallaReserva -> ServicioReservas : 1: crearReserva()
ServicioReservas -> RepositorioSalas : 1.1: buscarLibre()
ServicioReservas -> Notificador : 1.2: enviarConfirmacion()
@enduml`,
      `@startuml
object Notificador
object RepositorioSalas
object ServicioReservas
object PantallaReserva
ServicioReservas -> Notificador : 1.2: enviarConfirmacion()
ServicioReservas -> RepositorioSalas : 1.1: buscarLibre()
PantallaReserva -> ServicioReservas : 1: crearReserva()
@enduml`,
    ],

    // Sin numeración: el orden se pierde por completo.
    diagramaTrampa: `@startuml
object PantallaReserva
object ServicioReservas
object RepositorioSalas
object Notificador
PantallaReserva -> ServicioReservas : crearReserva()
ServicioReservas -> RepositorioSalas : buscarLibre()
ServicioReservas -> Notificador : enviarConfirmacion()
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'comunicacion-numerar-la-interaccion',
    titulo: 'Sin número no hay orden: numerar una consulta',
    categoria: 'Comunicación',
    bloque: 'Interacción',
    nivel: 'guiado',
    orden: 10,
    motor: 'plantuml',
    tipoDiagrama: 'comunicacion',

    problema:
      'En un diagrama de secuencia el orden se lee de arriba abajo. Aquí no hay arriba ni abajo: los objetos ' +
      'están donde caben. Lo único que dice qué ocurre antes es el número del mensaje, y un diagrama de ' +
      'comunicación sin numerar no es una interacción, es un mapa de enlaces.',
    procedencia: PROCEDENCIA,
    encaje:
      'Es lo primero que hay que interiorizar de esta vista. Sin ello, el diagrama parece correcto y no ' +
      'transmite la mitad de lo que debería.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Dejar los mensajes sin numerar y confiar en el orden de las líneas. El orden de las líneas es del texto, no del diagrama: mover una línea no cambia la interacción.',
      'Numerar dos mensajes con el mismo número: entonces no se sabe cuál va antes.',
      'Empezar en 0 o saltarse números sin motivo. La numeración es una secuencia, no un identificador.',
      'Poner el número dentro del nombre del mensaje (`crearReserva1`) en vez de como prefijo.',
    ],
    queDibujas:
      'El mismo diagrama, con los tres mensajes numerados `1`, `2` y `3` en el orden en que ocurren: primero ' +
      'la pantalla llama al servicio, luego el servicio consulta el repositorio, y por último el servicio ' +
      'avisa al notificador.',
    pasoAPaso: [
      'Añade `1: ` delante de `comprobarDisponibilidad()`, que es el mensaje que arranca la interacción.',
      'Numera con `2: ` la llamada del servicio al repositorio.',
      'Numera con `3: ` la llamada al notificador.',
      'Comprueba que cada nombre de mensaje existe como operación en la clase del receptor.',
    ],
    sintaxis: SINTAXIS,

    diagramasContexto: [
      { nombre: 'clases', titulo: 'Diagrama de clases del sistema de reservas', tipo: 'clases', motor: 'plantuml', codigo: CLASES_RESERVA },
    ],

    codigoInicial: `@startuml
object PantallaReserva
object ServicioReservas
object RepositorioSalas
object Notificador
PantallaReserva -> ServicioReservas : comprobarDisponibilidad()
ServicioReservas -> RepositorioSalas : buscarLibre()
ServicioReservas -> Notificador : enviarConfirmacion()
@enduml
' Los enlaces están, pero sin números el diagrama no dice qué pasa antes.
' Numera los tres mensajes en el orden en que ocurren.`,

    aserciones: [
      { tipo: 'orden-de-mensajes', parametros: { mensajes: ['comprobarDisponibilidad', 'buscarLibre', 'enviarConfirmacion'] } },
      { tipo: 'mensaje-entre', parametros: { de: 'PantallaReserva', a: 'ServicioReservas', texto: 'comprobarDisponibilidad' } },
      { tipo: 'mensaje-entre', parametros: { de: 'ServicioReservas', a: 'Notificador', texto: 'enviarConfirmacion' } },
      { tipo: 'mensaje-existe-como-operacion', parametros: { contexto: 'clases' } },
    ],

    diagramasReferencia: [
      `@startuml
object PantallaReserva
object ServicioReservas
object RepositorioSalas
object Notificador
PantallaReserva -> ServicioReservas : 1: comprobarDisponibilidad()
ServicioReservas -> RepositorioSalas : 2: buscarLibre()
ServicioReservas -> Notificador : 3: enviarConfirmacion()
@enduml`,
      `@startuml
object PantallaReserva
object ServicioReservas
object RepositorioSalas
object Notificador
PantallaReserva -> ServicioReservas : 1: comprobarDisponibilidad()
ServicioReservas -> RepositorioSalas : 1.1: buscarLibre()
ServicioReservas -> Notificador : 1.2: enviarConfirmacion()
@enduml`,
    ],

    // Numerado, pero en el orden equivocado: el notificador antes de consultar.
    diagramaTrampa: `@startuml
object PantallaReserva
object ServicioReservas
object RepositorioSalas
object Notificador
PantallaReserva -> ServicioReservas : 1: comprobarDisponibilidad()
ServicioReservas -> Notificador : 2: enviarConfirmacion()
ServicioReservas -> RepositorioSalas : 3: buscarLibre()
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'comunicacion-numeracion-anidada',
    titulo: 'Dentro, no después: la numeración jerárquica',
    categoria: 'Comunicación',
    bloque: 'Interacción',
    nivel: 'base',
    orden: 20,
    motor: 'plantuml',
    tipoDiagrama: 'comunicacion',

    problema:
      'Cuando la pantalla llama al servicio y el servicio llama a otros dos, esas dos llamadas no son «lo ' +
      'siguiente que pasa»: pasan DENTRO de la primera, mientras la pantalla sigue esperando. La numeración ' +
      'plana (1, 2, 3) afirma que son tres pasos consecutivos e independientes; la jerárquica (1, 1.1, 1.2) ' +
      'dice lo que de verdad ocurre.',
    procedencia: PROCEDENCIA,
    encaje:
      'Es lo que distingue esta vista de una lista de llamadas. En la secuencia el anidamiento se ve por las ' +
      'barras de activación; aquí solo se ve por el número.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Numerar en plano una interacción anidada. Es correcto de leer y falso de significado: dice que la pantalla hace tres llamadas, cuando hace una.',
      'Anidar de más: poner `1.1.1` a algo que el servicio llama directamente, no a través del repositorio.',
      'Cambiar el orden al anidar. `1.1` va antes que `1.2`, y `1.10` va después de `1.9`: la comparación es numérica, no alfabética.',
      'Numerar el retorno como si fuera una llamada nueva del receptor.',
    ],
    queDibujas:
      'El mismo escenario con numeración jerárquica: `1` para la llamada de la pantalla al servicio, y `1.1` ' +
      'y `1.2` para las dos llamadas que el servicio hace dentro de ella.',
    sintaxis: SINTAXIS,

    diagramasContexto: [
      { nombre: 'clases', titulo: 'Diagrama de clases del sistema de reservas', tipo: 'clases', motor: 'plantuml', codigo: CLASES_RESERVA },
    ],

    codigoInicial: `@startuml
object PantallaReserva
object ServicioReservas
object RepositorioSalas
object Notificador
PantallaReserva -> ServicioReservas : 1: crearReserva()
ServicioReservas -> RepositorioSalas : 2: buscarLibre()
ServicioReservas -> Notificador : 3: enviarConfirmacion()
@enduml
' Los números 2 y 3 dicen que son pasos independientes, y ocurren DENTRO
' de la llamada 1. Cámbialos por numeración jerárquica.`,

    aserciones: [
      { tipo: 'orden-de-mensajes', parametros: { mensajes: ['crearReserva', 'buscarLibre', 'enviarConfirmacion'] } },
      { tipo: 'mensaje-entre', parametros: { de: 'ServicioReservas', a: 'RepositorioSalas', texto: 'buscarLibre' } },
      { tipo: 'mensaje-entre', parametros: { de: 'ServicioReservas', a: 'Notificador', texto: 'enviarConfirmacion' } },
      { tipo: 'mensaje-existe-como-operacion', parametros: { contexto: 'clases' } },
      { tipo: 'conteo-nodos', parametros: { min: 4 }, oculta: true },
    ],

    diagramasReferencia: [
      `@startuml
object PantallaReserva
object ServicioReservas
object RepositorioSalas
object Notificador
PantallaReserva -> ServicioReservas : 1: crearReserva()
ServicioReservas -> RepositorioSalas : 1.1: buscarLibre()
ServicioReservas -> Notificador : 1.2: enviarConfirmacion()
@enduml`,
      `@startuml
object PantallaReserva
object ServicioReservas
object RepositorioSalas
object Notificador
PantallaReserva -> ServicioReservas : 1: crearReserva()
ServicioReservas -> RepositorioSalas : 1.1: buscarLibre()
ServicioReservas -> Notificador : 1.9: enviarConfirmacion()
@enduml`,
    ],

    // Anidado pero con el orden invertido dentro de la llamada.
    diagramaTrampa: `@startuml
object PantallaReserva
object ServicioReservas
object RepositorioSalas
object Notificador
PantallaReserva -> ServicioReservas : 1: crearReserva()
ServicioReservas -> Notificador : 1.1: enviarConfirmacion()
ServicioReservas -> RepositorioSalas : 1.2: buscarLibre()
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'comunicacion-mensaje-que-nadie-implementa',
    titulo: 'Un mensaje que nadie implementa',
    categoria: 'Comunicación',
    bloque: 'Interacción',
    nivel: 'reto',
    orden: 30,
    motor: 'plantuml',
    tipoDiagrama: 'comunicacion',

    problema:
      'El diagrama de abajo se dibuja sin problemas y describe una interacción imposible: uno de los mensajes ' +
      'invoca una operación que la clase del receptor no declara. Es el error más frecuente en las vistas de ' +
      'interacción, y no se ve mirando el diagrama solo: hay que cruzarlo con el de clases.',
    procedencia: PROCEDENCIA,
    encaje:
      'Es la comprobación que da valor a modelar la interacción: si un mensaje no corresponde a ninguna ' +
      'operación, o falta la operación en el diseño o el mensaje va al objeto equivocado. Las dos cosas hay ' +
      'que decidirlas, no dejarlas pasar.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Inventar el nombre de una operación al escribir el mensaje: `guardarReserva()` en vez de `crearReserva()`.',
      'Mandar el mensaje al objeto equivocado: la operación existe, pero en otra clase.',
      'Resolverlo cambiando el receptor a un objeto cualquiera que sí tenga una operación con ese nombre, sin comprobar si tiene sentido que la haga.',
      'Romper la numeración al reordenar los mensajes para corregir el defecto.',
    ],
    queDibujas:
      'La misma interacción corregida: los tres mensajes con numeración jerárquica y **todos** invocando ' +
      'operaciones que existan en la clase del receptor, según el diagrama de contexto.',
    sintaxis: SINTAXIS,

    diagramasContexto: [
      { nombre: 'clases', titulo: 'Diagrama de clases del sistema de reservas', tipo: 'clases', motor: 'plantuml', codigo: CLASES_RESERVA },
    ],

    codigoInicial: `@startuml
object PantallaReserva
object ServicioReservas
object RepositorioSalas
object Notificador
PantallaReserva -> ServicioReservas : 1: crearReserva()
ServicioReservas -> RepositorioSalas : 1.1: guardarReserva()
ServicioReservas -> Notificador : 1.2: enviarConfirmacion()
@enduml
' Uno de los mensajes invoca algo que la clase del receptor no declara.
' Compáralo con el diagrama de clases de arriba.`,

    aserciones: [
      { tipo: 'mensaje-existe-como-operacion', parametros: { contexto: 'clases' } },
      { tipo: 'mensaje-entre', parametros: { de: 'PantallaReserva', a: 'ServicioReservas', texto: 'crearReserva' } },
      { tipo: 'mensaje-entre', parametros: { de: 'ServicioReservas', a: 'Notificador', texto: 'enviarConfirmacion' } },
      { tipo: 'orden-de-mensajes', parametros: { mensajes: ['crearReserva', 'buscarLibre', 'enviarConfirmacion'] } },
      { tipo: 'participante-existe-como-clase', parametros: { contexto: 'clases' }, oculta: true },
    ],

    diagramasReferencia: [
      `@startuml
object PantallaReserva
object ServicioReservas
object RepositorioSalas
object Notificador
PantallaReserva -> ServicioReservas : 1: crearReserva()
ServicioReservas -> RepositorioSalas : 1.1: buscarLibre()
ServicioReservas -> Notificador : 1.2: enviarConfirmacion()
@enduml`,
      `@startuml
object PantallaReserva
object ServicioReservas
object RepositorioSalas
object Notificador
PantallaReserva -> ServicioReservas : 1: crearReserva()
ServicioReservas -> RepositorioSalas : 1.1: buscarLibre()
ServicioReservas -> Notificador : 1.2: enviarConfirmacion()
PantallaReserva -> ServicioReservas : 2: comprobarDisponibilidad()
@enduml`,
    ],

    // Corrige el nombre pero se lo manda al objeto equivocado: la operación
    // existe, y no en esa clase.
    diagramaTrampa: `@startuml
object PantallaReserva
object ServicioReservas
object RepositorioSalas
object Notificador
PantallaReserva -> ServicioReservas : 1: crearReserva()
ServicioReservas -> Notificador : 1.1: buscarLibre()
ServicioReservas -> RepositorioSalas : 1.2: enviarConfirmacion()
@enduml`,
  },
];

export default ejercicios;
