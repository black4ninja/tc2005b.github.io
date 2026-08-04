import type { EjercicioDiagramaDef } from './tipos.js';

/**
 * Categoría "Casos de uso": qué quiere cada rol del sistema.
 *
 * Los tres niveles atacan errores documentados en trabajos de alumnos, en orden
 * de dificultad creciente: dibujar un caso de uso que no solicita nadie, dejar
 * un actor sin conectar, y confundir el diagrama con la secuencia de pasos de
 * una pantalla.
 *
 * El motor es PlantUML porque Mermaid no tiene notación de casos de uso; el
 * subconjunto admitido es el descrito en la tabla de sintaxis de cada ejercicio.
 */

const ANATOMIA = [
  { elemento: 'Monigote (actor)', significado: 'Un rol externo que interactúa con el sistema. Es un papel, no una persona concreta: la misma persona puede ejercer dos roles.' },
  { elemento: 'Óvalo (caso de uso)', significado: 'Un objetivo completo del actor, con un resultado observable para él. Se nombra con verbo en infinitivo más complemento.' },
  { elemento: 'Línea entre actor y óvalo', significado: 'Asociación de participación: ese actor es quien inicia el caso de uso o quien recibe su resultado.' },
  { elemento: 'Rectángulo que envuelve los óvalos', significado: 'La frontera del sistema. Lo de dentro es responsabilidad del software; lo de fuera, del entorno.' },
  { elemento: 'Flecha discontinua con `<<include>>`', significado: 'El caso base ejecuta SIEMPRE al incluido. Sirve para factorizar un comportamiento común a varios casos.' },
  { elemento: 'Flecha discontinua con `<<extend>>`', significado: 'El caso extendido amplía al base solo en ciertas condiciones. La dependencia va del que amplía hacia el ampliado.' },
];

const SINTAXIS = [
  { para: 'Declarar un actor', escribes: 'actor Alumno' },
  { para: 'Actor con nombre de varias palabras y alias', escribes: 'actor "Alumno inscrito" as alumno' },
  { para: 'Declarar un caso de uso con alias', escribes: 'usecase "Reservar sala" as reservar' },
  { para: 'Caso de uso en forma abreviada', escribes: '(Cancelar reserva)' },
  { para: 'Participación de un actor en un caso de uso', escribes: 'alumno -- reservar' },
  { para: 'Inclusión', escribes: 'reservar .> notificar : <<include>>' },
  { para: 'Extensión', escribes: 'reservar .> auditar : <<extend>>' },
  { para: 'Frontera del sistema', escribes: 'rectangle "Reservas de salas" {\\n  usecase "Reservar sala" as reservar\\n}' },
  { para: 'Orientar el dibujo de izquierda a derecha', escribes: 'left to right direction' },
  { para: 'Comentario que no se dibuja', escribes: "' esta línea es una nota para quien lea el código" },
];

const PROCEDENCIA =
  'El diagrama de casos de uso procede de OOSE (Object-Oriented Software Engineering), el método que Ivar ' +
  'Jacobson publicó en 1992, donde el caso de uso aparece como la unidad con la que se captura lo que el ' +
  'sistema debe hacer para cada rol. Llegó a UML cuando la OMG unificó los métodos de Booch, Rumbaugh y el ' +
  'propio Jacobson, y desde entonces es la vista con la que se delimita el alcance funcional.';

const OTROS_USOS =
  'La misma idea sostiene buena parte de la práctica de requisitos: las historias de usuario reproducen su ' +
  'estructura de rol, objetivo y resultado; los mapas de capacidades de negocio agrupan objetivos del mismo ' +
  'modo; y los anexos funcionales de un contrato de desarrollo suelen enumerarse como casos de uso, porque ' +
  'delimitan qué se entrega y qué queda fuera.';

const ejercicios: EjercicioDiagramaDef[] = [
  // -------------------------------------------------------------------------
  {
    slug: 'casos-uso-reservas-quien-lo-pide',
    titulo: 'Quién pide cada caso de uso',
    categoria: 'Casos de uso',
    bloque: 'Arquitectura',
    nivel: 'guiado',
    orden: 510,
    motor: 'plantuml',
    tipoDiagrama: 'casos-de-uso',

    problema:
      'Una aplicación móvil de reserva de salas ofrece varias funciones, y el equipo necesita acordar cuáles ' +
      'entran en la primera entrega. Un caso de uso solo justifica su existencia si algún rol lo solicita; si ' +
      'nadie lo pide, o bien falta el rol en el diagrama, o bien la función sobra.',
    procedencia: PROCEDENCIA,
    encaje:
      'Es el primer diagrama de la fase de requisitos, antes de decidir estructura o comportamiento interno. ' +
      'Responde a la pregunta "quién quiere qué del sistema"; cómo se consigue corresponde a los diagramas de ' +
      'secuencia y de clases.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Dibujar un caso de uso sin conectarlo a ningún actor. Un objetivo que nadie solicita no pertenece al alcance del sistema.',
      'Nombrar el caso de uso con un sustantivo suelto, como "Reservas", en lugar de un objetivo: "Reservar sala".',
      'Confundir el actor con un cargo de la organización. El actor es el rol frente al sistema, no el puesto en el organigrama.',
      'Dibujar la frontera del sistema alrededor de los actores. Los actores son externos por definición y quedan fuera del rectángulo.',
    ],
    queDibujas:
      'Un diagrama de casos de uso con el actor `Alumno` y los casos de uso `Reservar sala` y `Cancelar ' +
      'reserva`, cada uno conectado con el actor que lo solicita. No dejes ningún caso de uso suelto.',
    pasoAPaso: [
      'Abre el diagrama con `@startuml` y ciérralo con `@enduml`.',
      'Declara el actor con `actor Alumno`.',
      'Declara los dos casos de uso con `usecase "Reservar sala" as reservar` y `usecase "Cancelar reserva" as cancelar`.',
      'Une el actor con cada caso de uso mediante una línea sin punta: `Alumno -- reservar`.',
      'Revisa que ningún óvalo quede sin línea. Si uno queda suelto, decide si le falta un actor o si sobra el caso de uso.',
    ],
    sintaxis: SINTAXIS,

    codigoInicial: `@startuml
left to right direction
actor Alumno
' Faltan los casos de uso y las líneas que los unen con el actor.
@enduml`,

    aserciones: [
      { tipo: 'existe-nodo', parametros: { nombre: 'Alumno', clase: 'actor' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'Reservar sala', clase: 'caso-de-uso' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'Cancelar reserva', clase: 'caso-de-uso' } },
      { tipo: 'relacion-entre', parametros: { origen: 'Alumno', destino: 'Reservar sala', tipo: 'participa' } },
      { tipo: 'relacion-entre', parametros: { origen: 'Alumno', destino: 'Cancelar reserva', tipo: 'participa' } },
      { tipo: 'sin-casos-uso-sin-actor' },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `@startuml
left to right direction
actor Alumno
usecase "Reservar sala" as reservar
usecase "Cancelar reserva" as cancelar
Alumno -- reservar
Alumno -- cancelar
@enduml`,
      // Otra solución válida: frontera del sistema, un segundo actor, la forma
      // abreviada con paréntesis y un caso de uso más, también solicitado.
      `@startuml
actor "Alumno inscrito" as alumno
actor Coordinador
rectangle "Reservas de salas" {
  (Reservar sala) as reservar
  (Cancelar reserva) as cancelar
  (Consultar disponibilidad) as consultar
}
alumno -- reservar
alumno -- cancelar
alumno -- consultar
Coordinador -- consultar
@enduml`,
    ],

    // La trampa dibuja un caso de uso que no solicita ningún actor.
    diagramaTrampa: `@startuml
left to right direction
actor Alumno
rectangle "Reservas de salas" {
  usecase "Reservar sala" as reservar
  usecase "Cancelar reserva" as cancelar
  usecase "Consultar disponibilidad" as consultar
}
Alumno -- reservar
Alumno -- cancelar
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'casos-uso-reservas-actor-suelto',
    titulo: 'Un actor dibujado y sin participar',
    categoria: 'Casos de uso',
    bloque: 'Arquitectura',
    nivel: 'base',
    orden: 520,
    motor: 'plantuml',
    tipoDiagrama: 'casos-de-uso',

    problema:
      'En el sistema de reservas hay dos roles: quien solicita la sala y quien aprueba la solicitud. Cuando un ' +
      'rol aparece dibujado pero no se conecta con nada, el diagrama afirma que existe un interesado sin decir ' +
      'qué espera del sistema, y esa información falta justo donde debería estar.',
    procedencia: PROCEDENCIA,
    encaje:
      'Este diagrama se revisa con el cliente para cerrar el alcance. Un actor sin conexiones bloquea esa ' +
      'revisión: obliga a preguntar por escrito lo que el diagrama debería mostrar, que es qué necesita ese ' +
      'rol del sistema.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Dejar un actor sin ninguna línea. Un rol que no participa en ningún caso de uso no aporta información al modelo.',
      'Atribuir a un solo actor todos los casos de uso, con lo que se pierde la separación de responsabilidades entre roles.',
      'Usar `<<include>>` para indicar el orden en que ocurren dos casos de uso. La inclusión expresa reutilización, no secuencia temporal.',
      'Invertir la flecha de inclusión. Va del caso base hacia el incluido, porque es el base el que depende del otro.',
    ],
    queDibujas:
      'Un diagrama con los actores `Alumno` y `Coordinador`, los casos de uso `Reservar sala`, `Aprobar ' +
      'reserva` y `Notificar por correo`, y las relaciones que correspondan. `Reservar sala` incluye siempre ' +
      'a `Notificar por correo`. Cada actor dibujado debe participar en al menos un caso de uso.',
    sintaxis: SINTAXIS,

    codigoInicial: `@startuml
left to right direction
actor Alumno
actor Coordinador
usecase "Reservar sala" as reservar
usecase "Aprobar reserva" as aprobar
usecase "Notificar por correo" as notificar
Alumno -- reservar
' Falta la participación del coordinador y la inclusión de la notificación.
@enduml`,

    aserciones: [
      { tipo: 'existe-nodo', parametros: { nombre: 'Alumno', clase: 'actor' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'Coordinador', clase: 'actor' } },
      { tipo: 'relacion-entre', parametros: { origen: 'Alumno', destino: 'Reservar sala', tipo: 'participa' } },
      { tipo: 'relacion-entre', parametros: { origen: 'Coordinador', destino: 'Aprobar reserva', tipo: 'participa' } },
      { tipo: 'relacion-entre', parametros: { origen: 'Reservar sala', destino: 'Notificar por correo', tipo: 'incluye' } },
      { tipo: 'sin-actores-ociosos' },
      { tipo: 'sin-casos-uso-sin-actor', oculta: true },
      { tipo: 'sin-relaciones-duplicadas', oculta: true },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `@startuml
left to right direction
actor Alumno
actor Coordinador
usecase "Reservar sala" as reservar
usecase "Aprobar reserva" as aprobar
usecase "Notificar por correo" as notificar
Alumno -- reservar
Coordinador -- aprobar
reservar .> notificar : <<include>>
@enduml`,
      // Variante válida: nombres largos con alias, frontera del sistema, un caso
      // de uso compartido por los dos actores y una segunda inclusión.
      `@startuml
rectangle "Reservas de salas" {
  (Reservar sala) as reservar
  (Aprobar reserva) as aprobar
  (Notificar por correo) as notificar
  (Consultar disponibilidad) as consultar
}
actor "Alumno inscrito" as alumno
actor "Coordinador de laboratorio" as coordinador
alumno -- reservar
alumno -- consultar
coordinador -- aprobar
coordinador -- consultar
reservar ..> notificar : <<include>>
aprobar ..> notificar : <<include>>
@enduml`,
    ],

    // La trampa añade un tercer rol que no participa en nada.
    diagramaTrampa: `@startuml
left to right direction
actor Alumno
actor Coordinador
actor "Personal de mantenimiento" as mantenimiento
usecase "Reservar sala" as reservar
usecase "Aprobar reserva" as aprobar
usecase "Notificar por correo" as notificar
Alumno -- reservar
Coordinador -- aprobar
reservar .> notificar : <<include>>
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'casos-uso-reservas-objetivos-no-pasos',
    titulo: 'Objetivos del actor, no pasos de la pantalla',
    categoria: 'Casos de uso',
    bloque: 'Arquitectura',
    nivel: 'reto',
    orden: 530,
    motor: 'plantuml',
    tipoDiagrama: 'casos-de-uso',

    problema:
      'El diagrama de partida enumera lo que ocurre en la pantalla de reservas: abrirla, elegir el edificio, ' +
      'elegir la fecha, confirmar y ver el aviso. Cada óvalo describe una interacción con la interfaz, no un ' +
      'objetivo del actor, y el resultado es un diagrama que envejece con cada rediseño de pantalla sin decir ' +
      'nunca qué quiere el alumno del sistema.',
    procedencia: PROCEDENCIA,
    encaje:
      'El criterio publicado para reconocer un caso de uso es que su resultado tenga valor por sí mismo para ' +
      'el actor: si al terminar el actor no ha conseguido nada que pueda nombrar, lo dibujado es un paso, no ' +
      'un caso de uso. La secuencia de pasos pertenece al diagrama de secuencia o al de flujo.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Descomponer una pantalla en un óvalo por cada pulsación. Un caso de uso es un objetivo del actor, no una pantalla ni un paso de la interfaz.',
      'Encadenar casos de uso con flechas para indicar el orden. El diagrama de casos de uso no representa secuencia temporal.',
      'Llamar "Abrir la pantalla de reservas" a un caso de uso: abrir una pantalla no es un resultado que el actor pueda apreciar.',
      'Multiplicar los casos de uso hasta que el diagrama deja de caber en una revisión. Un sistema de aula se describe con unos pocos objetivos, no con decenas.',
    ],
    queDibujas:
      'El diagrama corregido. Sustituye la cadena de pasos por los objetivos del alumno frente al sistema: ' +
      '`Reservar sala` y `Cancelar reserva` como mínimo, conectados con el actor `Alumno`. Puedes añadir algún ' +
      'objetivo más si lo justifica el dominio, hasta un total de cuatro casos de uso. Elimina de tu diagrama ' +
      'todo lo que describa la interfaz en vez del objetivo.',
    sintaxis: SINTAXIS,

    // El punto de partida ES el diagrama defectuoso: el alumno lo corrige.
    codigoInicial: `@startuml
left to right direction
actor Alumno
usecase "Abrir la pantalla de reservas" as paso1
usecase "Elegir el edificio" as paso2
usecase "Elegir la fecha" as paso3
usecase "Pulsar el boton de confirmar" as paso4
usecase "Ver el aviso de reserva creada" as paso5
Alumno -- paso1
paso1 --> paso2
paso2 --> paso3
paso3 --> paso4
paso4 --> paso5
' Cada ovalo es un paso de la interfaz, no un objetivo del alumno.
@enduml`,

    aserciones: [
      { tipo: 'existe-nodo', parametros: { nombre: 'Reservar sala', clase: 'caso-de-uso' } },
      { tipo: 'existe-nodo', parametros: { nombre: 'Cancelar reserva', clase: 'caso-de-uso' } },
      { tipo: 'relacion-entre', parametros: { origen: 'Alumno', destino: 'Reservar sala', tipo: 'participa' } },
      { tipo: 'relacion-entre', parametros: { origen: 'Alumno', destino: 'Cancelar reserva', tipo: 'participa' } },
      { tipo: 'conteo-nodos', parametros: { clase: 'caso-de-uso', min: 2, max: 4 } },
      { tipo: 'sin-casos-uso-sin-actor' },
      { tipo: 'sin-actores-ociosos', oculta: true },
      { tipo: 'sin-relaciones-duplicadas', oculta: true },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `@startuml
left to right direction
actor Alumno
usecase "Reservar sala" as reservar
usecase "Cancelar reserva" as cancelar
Alumno -- reservar
Alumno -- cancelar
@enduml`,
      // Variante válida: cuatro objetivos, frontera del sistema y una
      // notificación factorizada con <<include>> en vez de repetida.
      `@startuml
actor "Alumno inscrito" as alumno
rectangle "Reservas de salas" {
  (Reservar sala) as reservar
  (Cancelar reserva) as cancelar
  (Consultar historial de reservas) as historial
  (Notificar por correo) as notificar
}
alumno -- reservar
alumno -- cancelar
alumno -- historial
reservar ..> notificar : <<include>>
cancelar ..> notificar : <<include>>
@enduml`,
    ],

    // La trampa es el diagrama de partida, sin corregir.
    diagramaTrampa: `@startuml
left to right direction
actor Alumno
usecase "Abrir la pantalla de reservas" as paso1
usecase "Elegir el edificio" as paso2
usecase "Elegir la fecha" as paso3
usecase "Pulsar el boton de confirmar" as paso4
usecase "Ver el aviso de reserva creada" as paso5
Alumno -- paso1
paso1 --> paso2
paso2 --> paso3
paso3 --> paso4
paso4 --> paso5
@enduml`,
  },
];

export default ejercicios;
