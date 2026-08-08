import type { EjercicioDiagramaDef } from './tipos.js';

/**
 * Categoría "Objetos": el diagrama de clases, congelado en un instante.
 *
 * Su valor docente está en la relación con el diagrama de clases, y por eso los
 * tres niveles se apoyan en un diagrama de contexto: lo que se comprueba no es
 * solo que el diagrama sea coherente consigo mismo, sino que cada objeto sea
 * instancia de una clase que exista y sus ranuras correspondan a atributos
 * declarados. Ese cruce es el error dominante y lo que un diagrama aislado no
 * puede delatar.
 */

const CLASES_RESERVA = `@startuml
class Sala {
  +codigo : String
  +capacidad : Int
}
class Reserva {
  +folio : String
  +fecha : Date
}
class Usuario {
  +nombre : String
  +correo : String
}
Usuario "1" --> "*" Reserva : realiza
Reserva "*" --> "1" Sala : ocupa
@enduml`;

const ANATOMIA = [
  { elemento: 'Caja con el nombre subrayado', significado: 'Un objeto: UN ejemplar concreto, no el tipo. Se escribe `nombre : Clase`.' },
  { elemento: 'Nombre antes de los dos puntos', significado: 'Cómo se llama ese ejemplar en este instante. Puede omitirse: `: Sala` es un objeto anónimo.' },
  { elemento: 'Nombre después de los dos puntos', significado: 'La clase de la que es instancia. Tiene que existir en el diagrama de clases.' },
  { elemento: 'Ranura `atributo = valor`', significado: 'El valor CONCRETO que ese atributo tiene ahora. Es lo único que distingue un objeto de su clase.' },
  { elemento: 'Línea entre objetos', significado: 'Enlace: la instancia de una asociación. No lleva dirección semántica ni cardinalidad.' },
];

const SINTAXIS = [
  { para: 'Declarar un objeto con su clase', escribes: 'object "sala101 : Sala" as sala101' },
  { para: 'Darle valor a una ranura', escribes: 'object "sala101 : Sala" as sala101 {\\n  codigo = "A-101"\\n}' },
  { para: 'Un objeto anónimo', escribes: 'object ": Reserva" as r1' },
  { para: 'Enlazar dos objetos', escribes: 'ana --> r1' },
  { para: 'Enlazar con etiqueta', escribes: 'ana --> r1 : realiza' },
];

const PROCEDENCIA =
  'El diagrama de objetos es tan antiguo como el de clases: aparece ya en el método OMT de Rumbaugh (1991) ' +
  'como la forma de ilustrar un modelo con un caso concreto, y la OMG lo mantuvo en UML como una vista ' +
  'derivada de la estructural.';

const OTROS_USOS =
  'La misma idea —el tipo frente al ejemplar— está en cualquier lenguaje orientado a objetos, en la relación ' +
  'entre el esquema de una base de datos y una fila concreta, y entre un tipo de JSON Schema y un documento ' +
  'que lo cumple.';

const ejercicios: EjercicioDiagramaDef[] = [
  // -------------------------------------------------------------------------
  {
    slug: 'ejemplo-resuelto-objeto-reserva',
    titulo: 'Ejemplo resuelto: una reserva concreta',
    categoria: 'Objetos',
    bloque: 'Estructura',
    nivel: 'guiado',
    orden: 1,
    esEjemplo: true,
    motor: 'plantuml',
    tipoDiagrama: 'objeto',

    problema:
      'Un diagrama de clases dice que un usuario puede tener varias reservas y que cada reserva ocupa una ' +
      'sala. No dice si eso funciona en un caso real. El diagrama de objetos toma una foto: Ana, su reserva ' +
      'del martes y la sala A-101, con sus valores. Este ejemplo lo muestra ya resuelto.',
    procedencia: PROCEDENCIA,
    encaje:
      'Se dibuja DESPUÉS del diagrama de clases y siempre contra él: sirve para comprobar que el modelo ' +
      'admite un caso concreto, y para discutir un ejemplo sin hablar en abstracto.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Escribir el nombre de la clase donde va el del objeto. `Sala` es el tipo; `sala101 : Sala` es el ejemplar.',
      'Dejar las ranuras sin valor. Un objeto sin valores no modela un caso concreto: es un diagrama de clases peor dibujado.',
      'Inventar una clase que no está en el diagrama de clases. El objeto tiene que ser instancia de algo que exista.',
      'Poner cardinalidades en los enlaces. Un enlace une DOS ejemplares concretos; las cardinalidades son de la asociación, no de su instancia.',
    ],
    queDibujas:
      'Nada: este ejercicio ya viene resuelto. Léelo, envíalo para ver cómo se comprueba y úsalo como ' +
      'referencia en los tres siguientes.',
    pasoAPaso: [
      'Fíjate en que cada objeto se escribe `nombre : Clase`, y que las tres clases están en el diagrama de arriba.',
      'Observa que cada ranura lleva un valor concreto, no un tipo.',
      'Los enlaces no llevan cardinalidad: eso es del diagrama de clases.',
      'Comprueba que `ana` está enlazada con `r1`, y `r1` con `sala101`, igual que las asociaciones del modelo.',
    ],
    sintaxis: SINTAXIS,

    diagramasContexto: [
      { nombre: 'clases', titulo: 'Diagrama de clases del sistema de reservas', tipo: 'clases', motor: 'plantuml', codigo: CLASES_RESERVA },
    ],

    codigoInicial: `@startuml
object "ana : Usuario" as ana {
  nombre = "Ana Ruiz"
  correo = "ana@ejemplo.mx"
}
object "r1 : Reserva" as r1 {
  folio = "R-2026-014"
  fecha = "2026-03-17"
}
object "sala101 : Sala" as sala101 {
  codigo = "A-101"
  capacidad = "24"
}
ana --> r1 : realiza
r1 --> sala101 : ocupa
@enduml`,

    aserciones: [
      { tipo: 'objeto-es-instancia-de', parametros: { contexto: 'clases' } },
      { tipo: 'objeto-tiene-valor', parametros: { objeto: 'sala101 : Sala', ranura: 'codigo', valor: 'A-101' } },
      { tipo: 'enlace-entre-objetos', parametros: { origen: 'ana : Usuario', destino: 'r1 : Reserva' } },
      { tipo: 'enlace-entre-objetos', parametros: { origen: 'r1 : Reserva', destino: 'sala101 : Sala' } },
      { tipo: 'conteo-nodos', parametros: { min: 3 } },
    ],

    diagramasReferencia: [
      `@startuml
object "ana : Usuario" as ana {
  nombre = "Ana Ruiz"
  correo = "ana@ejemplo.mx"
}
object "r1 : Reserva" as r1 {
  folio = "R-2026-014"
  fecha = "2026-03-17"
}
object "sala101 : Sala" as sala101 {
  codigo = "A-101"
  capacidad = "24"
}
ana --> r1 : realiza
r1 --> sala101 : ocupa
@enduml`,
      `@startuml
object "sala101 : Sala" as sala101 {
  codigo = "A-101"
  capacidad = "24"
}
object "r1 : Reserva" as r1 {
  folio = "R-2026-014"
  fecha = "2026-03-17"
}
object "ana : Usuario" as ana {
  nombre = "Ana Ruiz"
  correo = "ana@ejemplo.mx"
}
r1 --> sala101
ana --> r1
@enduml`,
    ],

    diagramaTrampa: `@startuml
object "ana : Usuario" as ana {
  nombre = "Ana Ruiz"
}
object "r1 : Reservacion" as r1 {
  folio = "R-2026-014"
}
object "sala101 : Sala" as sala101 {
  codigo = "A-101"
}
ana --> r1
r1 --> sala101
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'objeto-valores-concretos-inscripcion',
    titulo: 'Dar valores: una inscripción concreta',
    categoria: 'Objetos',
    bloque: 'Estructura',
    nivel: 'guiado',
    orden: 10,
    motor: 'plantuml',
    tipoDiagrama: 'objeto',

    problema:
      'Un diagrama de objetos sin valores en las ranuras no dice nada que el de clases no dijera ya. Lo que ' +
      'lo convierte en una foto de un instante es precisamente el valor: no «un usuario con un nombre», sino ' +
      '«Ana Ruiz». Este ejercicio parte de un diagrama con los objetos correctos y las ranuras vacías.',
    procedencia: PROCEDENCIA,
    encaje:
      'Es el primer uso de la vista: ilustrar el modelo con un caso. Se hace en cuanto el diagrama de clases ' +
      'está lo bastante estable como para probarlo contra un ejemplo.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Dejar las ranuras sin valor, o poner el TIPO donde va el valor (`nombre = String`). El tipo ya está en el diagrama de clases.',
      'Poner un valor que el tipo no admite, como una capacidad con letras.',
      'Escribir el objeto sin su clase (`object ana`): así no se puede comprobar de qué es instancia.',
      'Olvidar el enlace entre los dos objetos: sin él son dos fotos sueltas, no un caso.',
    ],
    queDibujas:
      'Un diagrama de objetos con `ana : Usuario` —con `nombre` valiendo `Ana Ruiz`— y `r1 : Reserva` —con ' +
      '`folio` valiendo `R-2026-014`—, enlazados entre sí.',
    pasoAPaso: [
      'Abre el bloque de `ana` con llaves y escribe dentro `nombre = "Ana Ruiz"`.',
      'Haz lo mismo con `r1`: `folio = "R-2026-014"`.',
      'Comprueba que ambos objetos declaran su clase tras los dos puntos, y que esas clases están en el diagrama de contexto.',
      'Une los dos objetos con `ana --> r1`.',
    ],
    sintaxis: SINTAXIS,

    diagramasContexto: [
      { nombre: 'clases', titulo: 'Diagrama de clases del sistema de reservas', tipo: 'clases', motor: 'plantuml', codigo: CLASES_RESERVA },
    ],

    codigoInicial: `@startuml
object "ana : Usuario" as ana
object "r1 : Reserva" as r1
@enduml
' Los objetos están, pero sin valores y sin enlace: todavía no es una foto
' de un caso concreto. Dale valor a "nombre" y a "folio", y enlázalos.`,

    aserciones: [
      { tipo: 'objeto-tiene-valor', parametros: { objeto: 'ana : Usuario', ranura: 'nombre', valor: 'Ana Ruiz' } },
      { tipo: 'objeto-tiene-valor', parametros: { objeto: 'r1 : Reserva', ranura: 'folio', valor: 'R-2026-014' } },
      { tipo: 'enlace-entre-objetos', parametros: { origen: 'ana : Usuario', destino: 'r1 : Reserva' } },
      { tipo: 'objeto-es-instancia-de', parametros: { contexto: 'clases' } },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `@startuml
object "ana : Usuario" as ana {
  nombre = "Ana Ruiz"
}
object "r1 : Reserva" as r1 {
  folio = "R-2026-014"
}
ana --> r1
@enduml`,
      `@startuml
object "ana : Usuario" as ana {
  nombre = "Ana Ruiz"
  correo = "ana@ejemplo.mx"
}
object "r1 : Reserva" as r1 {
  folio = "R-2026-014"
  fecha = "2026-03-17"
}
ana --> r1 : realiza
@enduml`,
    ],

    // Ranuras rellenas con el TIPO en vez del valor.
    diagramaTrampa: `@startuml
object "ana : Usuario" as ana {
  nombre = "String"
}
object "r1 : Reserva" as r1 {
  folio = "String"
}
ana --> r1
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'objeto-varias-instancias-misma-clase',
    titulo: 'Dos ejemplares de la misma clase',
    categoria: 'Objetos',
    bloque: 'Estructura',
    nivel: 'base',
    orden: 20,
    motor: 'plantuml',
    tipoDiagrama: 'objeto',

    problema:
      'El diagrama de clases dice que un usuario puede tener VARIAS reservas, pero esa cardinalidad es una ' +
      'promesa abstracta. La forma de comprobarla es dibujar dos reservas del mismo usuario y ver que el ' +
      'modelo las admite. Es también donde se ve por qué cada objeto necesita nombre propio: dos cajas ' +
      'llamadas igual no son dos ejemplares.',
    procedencia: PROCEDENCIA,
    encaje:
      'Se usa para validar una cardinalidad concreta del modelo o para discutir un caso límite. Es la razón ' +
      'principal por la que un diagrama de objetos se dibuja en una revisión de diseño.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Dibujar una sola caja «Reserva» y creer que representa a varias. Una caja es UN ejemplar; para dos, dos cajas.',
      'Dar el mismo nombre a los dos objetos. Si se llaman igual, no hay forma de distinguirlos ni de saber a cuál apunta cada enlace.',
      'Poner `1..*` en un enlace. La cardinalidad es de la asociación en el diagrama de clases; aquí ya se ve cuántos hay: se cuentan.',
      'Enlazar solo una de las dos reservas al usuario y dar por hecho que la otra también.',
    ],
    queDibujas:
      'Un diagrama de objetos con `ana : Usuario` enlazada a **dos** reservas distintas, `r1 : Reserva` y ' +
      '`r2 : Reserva`, cada una con su propio folio.',
    sintaxis: SINTAXIS,

    diagramasContexto: [
      { nombre: 'clases', titulo: 'Diagrama de clases del sistema de reservas', tipo: 'clases', motor: 'plantuml', codigo: CLASES_RESERVA },
    ],

    codigoInicial: `@startuml
object "ana : Usuario" as ana {
  nombre = "Ana Ruiz"
}
object "r1 : Reserva" as r1 {
  folio = "R-2026-014"
}
ana --> r1
@enduml
' Con una sola reserva no se comprueba que un usuario pueda tener varias.
' Añade una segunda reserva, con su propio folio, enlazada al mismo usuario.`,

    aserciones: [
      { tipo: 'objeto-tiene-valor', parametros: { objeto: 'r1 : Reserva', ranura: 'folio', valor: 'R-2026-014' } },
      { tipo: 'objeto-tiene-valor', parametros: { objeto: 'r2 : Reserva', ranura: 'folio' } },
      { tipo: 'enlace-entre-objetos', parametros: { origen: 'ana : Usuario', destino: 'r1 : Reserva' } },
      { tipo: 'enlace-entre-objetos', parametros: { origen: 'ana : Usuario', destino: 'r2 : Reserva' } },
      { tipo: 'objeto-es-instancia-de', parametros: { contexto: 'clases' } },
      { tipo: 'conteo-nodos', parametros: { min: 3 }, oculta: true },
    ],

    diagramasReferencia: [
      `@startuml
object "ana : Usuario" as ana {
  nombre = "Ana Ruiz"
}
object "r1 : Reserva" as r1 {
  folio = "R-2026-014"
}
object "r2 : Reserva" as r2 {
  folio = "R-2026-021"
}
ana --> r1
ana --> r2
@enduml`,
      `@startuml
object "ana : Usuario" as ana {
  nombre = "Ana Ruiz"
  correo = "ana@ejemplo.mx"
}
object "r1 : Reserva" as r1 {
  folio = "R-2026-014"
  fecha = "2026-03-17"
}
object "r2 : Reserva" as r2 {
  folio = "R-2026-021"
  fecha = "2026-03-24"
}
ana --> r1 : realiza
ana --> r2 : realiza
@enduml`,
    ],

    // Segunda reserva declarada pero sin enlazar al usuario.
    diagramaTrampa: `@startuml
object "ana : Usuario" as ana {
  nombre = "Ana Ruiz"
}
object "r1 : Reserva" as r1 {
  folio = "R-2026-014"
}
object "r2 : Reserva" as r2 {
  folio = "R-2026-021"
}
ana --> r1
@enduml`,
  },

  // -------------------------------------------------------------------------
  {
    slug: 'objeto-corregir-foto-incoherente',
    titulo: 'Corregir una foto que el modelo no admite',
    categoria: 'Objetos',
    bloque: 'Estructura',
    nivel: 'reto',
    orden: 30,
    motor: 'plantuml',
    tipoDiagrama: 'objeto',

    problema:
      'El diagrama de abajo se dibuja sin problemas y sin embargo el modelo de clases no lo admite: hay un ' +
      'objeto de una clase que no existe y otro cuya ranura no corresponde a ningún atributo declarado. Son ' +
      'incoherencias que solo se ven cruzando las dos vistas, que es exactamente para lo que sirve esta.',
    procedencia: PROCEDENCIA,
    encaje:
      'Es el uso más valioso de la vista en una revisión: contrastar un caso concreto contra el modelo para ' +
      'descubrir que uno de los dos está mal. El diagrama de objetos suele delatar al de clases.',
    anatomia: ANATOMIA,
    otrosUsos: OTROS_USOS,
    erroresTipicos: [
      'Inventar una clase al escribir el objeto: `Reservacion` en vez de `Reserva`. El motor lo dibuja igual y nadie lo nota hasta que se cruzan las dos vistas.',
      'Dar valor a una ranura que la clase no declara. Si el atributo hace falta, el que está mal es el diagrama de clases, y hay que decirlo.',
      'Corregir el objeto cambiándole el nombre del ejemplar en vez de la clase.',
      'Dar por buena la coherencia porque el diagrama «se ve bien»: ninguno de estos defectos es de sintaxis.',
    ],
    queDibujas:
      'El mismo caso, corregido: los tres objetos como instancias de clases que **sí** existen en el diagrama ' +
      'de contexto, y con ranuras que correspondan a atributos declarados. Conserva los enlaces.',
    sintaxis: SINTAXIS,

    diagramasContexto: [
      { nombre: 'clases', titulo: 'Diagrama de clases del sistema de reservas', tipo: 'clases', motor: 'plantuml', codigo: CLASES_RESERVA },
    ],

    codigoInicial: `@startuml
object "ana : Usuario" as ana {
  nombre = "Ana Ruiz"
}
object "r1 : Reservacion" as r1 {
  folio = "R-2026-014"
}
object "sala101 : Sala" as sala101 {
  codigo = "A-101"
  metros = "40"
}
ana --> r1
r1 --> sala101
@enduml
' Dos defectos que el motor no señala: una clase que no existe y una ranura
' que la clase no declara. Compáralo con el diagrama de clases de arriba.`,

    aserciones: [
      { tipo: 'objeto-es-instancia-de', parametros: { contexto: 'clases' } },
      { tipo: 'objeto-tiene-valor', parametros: { objeto: 'sala101 : Sala', ranura: 'capacidad' } },
      { tipo: 'objeto-tiene-valor', parametros: { objeto: 'r1 : Reserva', ranura: 'folio', valor: 'R-2026-014' } },
      { tipo: 'enlace-entre-objetos', parametros: { origen: 'ana : Usuario', destino: 'r1 : Reserva' } },
      { tipo: 'enlace-entre-objetos', parametros: { origen: 'r1 : Reserva', destino: 'sala101 : Sala' } },
      { tipo: 'sin-nombres-vagos', oculta: true },
    ],

    diagramasReferencia: [
      `@startuml
object "ana : Usuario" as ana {
  nombre = "Ana Ruiz"
}
object "r1 : Reserva" as r1 {
  folio = "R-2026-014"
}
object "sala101 : Sala" as sala101 {
  codigo = "A-101"
  capacidad = "40"
}
ana --> r1
r1 --> sala101
@enduml`,
      `@startuml
object "ana : Usuario" as ana {
  nombre = "Ana Ruiz"
  correo = "ana@ejemplo.mx"
}
object "r1 : Reserva" as r1 {
  folio = "R-2026-014"
  fecha = "2026-03-17"
}
object "sala101 : Sala" as sala101 {
  codigo = "A-101"
  capacidad = "24"
}
ana --> r1 : realiza
r1 --> sala101 : ocupa
@enduml`,
    ],

    // Corrige la clase inventada pero deja la ranura que no existe.
    diagramaTrampa: `@startuml
object "ana : Usuario" as ana {
  nombre = "Ana Ruiz"
}
object "r1 : Reserva" as r1 {
  folio = "R-2026-014"
}
object "sala101 : Sala" as sala101 {
  codigo = "A-101"
  metros = "40"
}
ana --> r1
r1 --> sala101
@enduml`,
  },
];

export default ejercicios;
