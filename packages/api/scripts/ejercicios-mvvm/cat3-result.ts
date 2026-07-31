import type { Ejercicio } from './tipos.js';

/** Firmas de lo ya proporcionado. Sin cuerpos: son solución de otros ejercicios. */
const YA_DECLARADO = {
  kotlin: `data class Item(val id: String, val name: String)`,
};


/**
 * Concepto 3.1 — `Result`: los tres estados de una carga (Android).
 *
 * Solo Kotlin: la pista de iOS del wiki no usa un tipo Result, sino que propaga
 * el error con `throws`. Forzar el mismo ejercicio en Swift enseñaría un
 * vocabulario que el alumno no va a encontrar en su plataforma.
 */

const CATEGORIA = 'Estado y ViewModel';
const CAPA = 'Dominio — `domain/model/Result.kt`';

const PROBLEMA = `
Este ejercicio construye **una sola pieza**: el tipo que representa en qué
situación se encuentra una carga de datos.

Una petición de red no tiene dos desenlaces, sino tres, y los tres son estados
legítimos que la pantalla debe saber mostrar:

1. **En curso.** La petición se ha lanzado y aún no hay respuesta.
2. **Con datos.** La respuesta llegó y contiene lo que se pedía.
3. **Con error.** La respuesta no llegó, o llegó mal.

La pieza tiene dos vecinos:

- **Quien la produce**: el repositorio o el caso de uso, que envuelve en este
  tipo lo que devuelve.
- **Quien la consume**: el ViewModel, que traduce cada situación a lo que se ve
  en pantalla.

Sin este tipo, esas tres situaciones se representan con variables sueltas —una
lista, un booleano y un texto de error— y el compilador permite combinarlas de
formas que no corresponden a ninguna situación real.
`;

const DE_DONDE_VIENE = `
El tipo procede de los **tipos suma**, presentes en los lenguajes funcionales
desde ML (1973): un valor que es exactamente una de varias alternativas, cada una
con sus propios datos. Haskell lo llama \`Either\`, Rust \`Result\`, Swift también
\`Result\`, y Kotlin lo expresa con \`sealed class\`.

La palabra \`sealed\` significa que **la lista de alternativas está cerrada**: solo
pueden declararse dentro del mismo módulo. Esa restricción es la que aporta el
valor, porque permite al compilador saber que las conoce todas.

### Qué gana el compilador al saberlo

Cuando un \`when\` sobre un tipo sellado se usa como expresión, el compilador
**exige que estén cubiertas todas las alternativas**. Añadir una cuarta situación
al tipo —por ejemplo, "sin conexión"— produce entonces un error de compilación en
cada lugar que deba tratarla.

Esa es la diferencia práctica con un \`enum\` acompañado de campos sueltos: el
enum enumera los casos, pero no transporta los datos de cada uno, de modo que los
campos deben declararse fuera y quedan accesibles en situaciones donde no
significan nada.

### El estado imposible que elimina

Con tres variables sueltas —\`datos\`, \`cargando\` y \`error\`— existen ocho
combinaciones. Solo tres corresponden a situaciones reales; el resto son estados
que la pantalla no sabe representar, como estar cargando y tener error a la vez.

Un tipo sellado reduce esas ocho combinaciones a tres, y lo hace de forma que
**escribir el estado imposible deja de ser posible**, en lugar de quedar como una
convención que hay que recordar.
`;

const DIAGRAMA = `
flowchart LR
    subgraph domain["domain/"]
        UC[GetItemsUseCase]
        R["Result<br/>pieza de este ejercicio"]
    end
    subgraph presentation["presentation/"]
        VM[ItemsViewModel]
        UI[UiState]
    end
    UC --> R
    R --> VM
    VM --> UI
    style R fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px
`;

const DONDE_MAS = `
- **Rust.** \`Result<T, E>\` es el mecanismo estándar de error del lenguaje, que
  carece de excepciones. El compilador obliga a tratar el caso de fallo.
- **Swift.** La biblioteca estándar incluye \`Result\`, aunque la pista de iOS de
  este curso propaga los errores con \`throws\`.
- **Protocolos de red.** Toda respuesta HTTP se clasifica de forma equivalente:
  en curso, correcta, o con código de error.
- **Máquinas de estados.** Un pedido —recibido, enviado, entregado, cancelado—
  es el mismo patrón: alternativas cerradas, cada una con sus propios datos.
`;

const ERRORES = `
- **Declarar los tres estados como \`enum\`.** Un enum no transporta datos
  distintos por alternativa: los artículos y el mensaje de error tendrían que
  vivir fuera.
- **Incluir un campo de datos en el estado de error.** Reintroduce la
  combinación imposible que el tipo pretende eliminar.
- **Utilizar la ausencia como estado.** Representar "en curso" con \`null\`
  obliga a quien lo recibe a interpretar esa convención, y confunde el estado
  inicial con la falta de datos.
- **Cubrir el \`when\` con una rama \`else\`.** El compilador deja de avisar
  cuando se añade una alternativa nueva, que es justamente lo que aportaba el
  tipo sellado.
`;

const COMPRUEBA = `
Cuatro comprobaciones. Cada una construye un valor del tipo, lo pasa por una
función que ya está escrita y muestra el texto que produce.

Esa función traduce cada alternativa así: \`Cargando\` para el estado en curso;
el recuento seguido de los nombres separados por comas para el estado con datos;
y \`Error: \` seguido del mensaje para el estado de error.

- **\`en_curso\`** — el estado inicial, sin datos ni mensaje.
  Debe imprimir \`Cargando\`.
  *Verifica:* que el estado en curso exista como alternativa propia y no
  requiera datos para construirse.
- **\`con_datos\`** — el estado con dos artículos.
  Debe imprimir \`2:Camisa,Abrigo\`.
  *Verifica:* que la alternativa con datos transporte la lista.
- **\`con_error\`** — el estado de error con el mensaje \`sin conexion\`.
  Debe imprimir \`Error: sin conexion\`.
  *Verifica:* que la alternativa de error transporte el mensaje, y solo el
  mensaje.
- **Una comprobación oculta** — el estado con datos construido con una lista
  vacía.
  *Verifica:* que una carga correcta sin resultados sea distinguible de un
  error.

La comprobación oculta es deducible: una respuesta correcta que no devuelve nada
sigue siendo una respuesta correcta, y el enunciado indica que solo el estado de
error transporta mensaje.
`;

const DRIVER = `data class Item(val id: String, val name: String)

{{solucion}}

fun describir(r: Result): String = when (r) {
    is Result.Cargando -> "Cargando"
    is Result.Exito -> r.datos.size.toString() + ":" + r.datos.joinToString(",") { it.name }
    is Result.Error -> "Error: " + r.mensaje
}

fun main() {
    val datos = listOf(Item("1", "Camisa"), Item("2", "Abrigo"))
    when (readLine()?.trim() ?: "") {
        "en_curso" -> println(describir(Result.Cargando))
        "con_datos" -> println(describir(Result.Exito(datos)))
        "con_error" -> println(describir(Result.Error("sin conexion")))
        "exito_sin_elementos" -> println(describir(Result.Exito(emptyList())))
        else -> println("caso desconocido")
    }
}`;

const CASOS = [
  { entrada: 'en_curso\n', salidaEsperada: 'Cargando', oculto: false },
  { entrada: 'con_datos\n', salidaEsperada: '2:Camisa,Abrigo', oculto: false },
  { entrada: 'con_error\n', salidaEsperada: 'Error: sin conexion', oculto: false },
  { entrada: 'exito_sin_elementos\n', salidaEsperada: '0:', oculto: true },
];

const FIRMA = `
\`\`\`kotlin
sealed class Result {
    object Cargando : Result()
    data class Exito(val datos: List<Item>) : Result()
    data class Error(val mensaje: String) : Result()
}
\`\`\`

El tipo \`Item\` se proporciona ya declarado, con los campos \`id\` y \`name\`. La
función que traduce cada alternativa a texto también está escrita: la pieza de
este ejercicio es únicamente el tipo.
`;

const SOLUCIONES = [
  // Estrategia A: object para el estado sin datos.
  `sealed class Result {
    object Cargando : Result()
    data class Exito(val datos: List<Item>) : Result()
    data class Error(val mensaje: String) : Result()
}`,
  // Estrategia B: interfaz sellada, equivalente desde Kotlin 1.5.
  `sealed interface Result {
    object Cargando : Result
    data class Exito(val datos: List<Item>) : Result
    data class Error(val mensaje: String) : Result
}`,
];

export const resultAndroid: Ejercicio[] = [
  // --- GUIADO ---------------------------------------------------------------
  {
    slugBase: 'mvvm-result',
    tituloBase: 'Result: los tres estados de una carga',
    nivel: 'guiado',
    categoria: CATEGORIA,
    lenguajes: ['kotlin'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
El tipo sellado con sus tres alternativas, en \`domain/model/Result.kt\`:
${FIRMA}
`,
    pasoAPaso: `
1. Declara \`Result\` como \`sealed class\`. La palabra \`sealed\` cierra la lista de
   alternativas y permite al compilador comprobar que se cubren todas.
2. Declara \`Cargando\` como \`object\` y no como \`data class\`. No transporta
   datos, de modo que basta una única instancia: no hay dos estados "en curso"
   distintos entre sí.
3. Declara \`Exito\` como \`data class\` con la lista de artículos.
4. Declara \`Error\` como \`data class\` con el mensaje. No añadas datos: un error
   no tiene artículos que mostrar.
5. Comprueba que las tres alternativas heredan de \`Result\`. La declaración
   \`: Result()\` es lo que las incorpora al tipo.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    yaDeclarado: YA_DECLARADO,
    plantilla: { kotlin: DRIVER },
    inicial: {
      kotlin: `sealed class Result {
    object Cargando : Result()
    // TODO: declarar Exito con la lista de artículos
    // TODO: declarar Error con el mensaje
}
`,
    },
    casos: CASOS,
    soluciones: { kotlin: SOLUCIONES },
  },

  // --- BASE -----------------------------------------------------------------
  {
    slugBase: 'mvvm-result',
    tituloBase: 'Result: los tres estados de una carga',
    nivel: 'base',
    categoria: CATEGORIA,
    lenguajes: ['kotlin'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
El tipo sellado con sus tres alternativas, con esta firma:
${FIRMA}
`,
    pasoAPaso: `
1. Declara el tipo de forma que la lista de alternativas quede cerrada.
2. Decide cuáles necesitan transportar datos y cuál no. La respuesta determina
   qué alternativa se declara como \`object\`.
3. Comprueba que ninguna alternativa admita datos que no le correspondan.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    yaDeclarado: YA_DECLARADO,
    plantilla: { kotlin: DRIVER },
    inicial: {
      kotlin: `// Escribe aquí el tipo Result con sus tres alternativas.
// El tipo Item ya está declarado, con los campos id y name.
`,
    },
    casos: CASOS,
    soluciones: { kotlin: SOLUCIONES },
  },

  // --- RETO -----------------------------------------------------------------
  {
    slugBase: 'mvvm-result',
    tituloBase: 'Result: los tres estados de una carga',
    nivel: 'reto',
    categoria: CATEGORIA,
    lenguajes: ['kotlin'],
    capa: CAPA,
    problema: `
El tipo del nivel base sirve para una sola carga: la de artículos. En cuanto la
aplicación necesita cargar también el perfil del usuario o el historial de
pedidos, hay que declarar un tipo idéntico por cada uno.

Aparece además una necesidad nueva. La pantalla debe distinguir un error del que
tiene sentido reintentar —la red falló— de uno del que no —el servidor respondió
que el recurso no existe—. Un único mensaje de texto no permite decidirlo sin
inspeccionar su contenido.

Y una operación que se repite en todos los consumidores: aplicar una
transformación a los datos **solo si los hay**, dejando intactos los otros dos
estados.
`,
    deDondeViene: `
Este nivel introduce tres ideas que aparecen juntas en la práctica.

**Genéricos.** Declarar \`Result<T>\` en lugar de \`Result\` permite reutilizar el
mismo tipo para cualquier contenido. Es paramétrico: la estructura —tres
alternativas— es independiente del dato que transporta.

**Jerarquía de errores.** Sustituir el mensaje por un tipo sellado de errores
traslada al compilador la distinción entre lo reintentable y lo definitivo. El
mensaje sigue existiendo, pero deja de ser la única información disponible.

**Transformación sobre el contenido.** La operación que aplica una función a los
datos cuando existen, y no hace nada en los demás casos, se denomina \`map\`, y es
la misma que ofrecen las listas y los tipos opcionales. Su utilidad aquí es que
el consumidor transforma el contenido **sin desenvolver el tipo**, de modo que no
tiene que repetir el tratamiento de los otros dos estados.

Que \`map\` conserve el estado —lo que estaba en curso sigue en curso, lo que era
error sigue siendo el mismo error— no es un detalle de implementación: es la
propiedad que hace que encadenar transformaciones no pierda información.
`,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: `
- **Rust.** \`Result<T, E>\` es genérico en el dato y en el error, y ofrece \`map\`
  con exactamente esta semántica.
- **Bibliotecas de red.** Los clientes HTTP modernos devuelven un tipo genérico
  parametrizado por el cuerpo de la respuesta.
- **Reintentos.** Toda política de reintento necesita clasificar los errores;
  reintentar un 404 es tan incorrecto como no reintentar un fallo de red.
`,
    queEscribes: `
Un tipo genérico, una jerarquía de errores y una operación de transformación:

\`\`\`kotlin
sealed class Result<out T> {
    object Cargando : Result<Nothing>()
    data class Exito<T>(val datos: T) : Result<T>()
    data class Fallo(val error: ErrorCarga) : Result<Nothing>()
}

sealed class ErrorCarga {
    data class Red(val mensaje: String) : ErrorCarga()
    data class NoEncontrado(val recurso: String) : ErrorCarga()
}

fun <T, R> Result<T>.map(f: (T) -> R): Result<R>
\`\`\`

Comportamiento exigido de \`map\`:

| Estado de origen | Estado resultante |
|---|---|
| En curso | En curso |
| Con datos | Con datos, transformados por la función |
| Con error | El mismo error, sin transformar |
`,
    pasoAPaso: `
1. Declara el tipo genérico. La marca \`out\` en el parámetro permite que un
   \`Result<Item>\` se utilice donde se espera un \`Result<Any>\`, y es lo que hace
   posible que las alternativas sin datos se declaren una sola vez.
2. Declara \`Cargando\` y \`Fallo\` sobre \`Nothing\`. Ese tipo no tiene valores, de
   modo que expresa con precisión que la alternativa no transporta contenido y
   es compatible con cualquier parametrización.
3. Declara la jerarquía de errores con las dos clases de fallo. La distinción
   entre reintentable y definitivo queda en el tipo, no en el texto.
4. Escribe \`map\` como función de extensión. Cubre las tres alternativas con un
   \`when\` sin rama \`else\`.
5. Verifica que \`map\` sobre un estado en curso o de error devuelva ese mismo
   estado. La función recibida no llega a ejecutarse.
`,
    erroresTipicos: `
- **Ejecutar la transformación en todos los estados.** Un error no tiene datos
  que transformar, y hacerlo obligaría a inventar un valor.
- **Declarar \`Cargando\` como \`Result<T>\`.** Requeriría una instancia distinta
  por cada parametrización; \`Nothing\` existe precisamente para evitarlo.
- **Cerrar el \`when\` de \`map\` con \`else\`.** Al añadir una cuarta alternativa,
  el compilador dejaría de señalar este punto.
- **Conservar el mensaje de texto como única información del error.** El
  enunciado exige poder distinguir las clases de fallo sin analizar el texto.
`,
    comoSeComprueba: `
Las comprobaciones construyen valores del tipo, les aplican \`map\` con una
transformación que extrae los nombres, y muestran el resultado.

La función que traduce el resultado a texto ya está escrita: produce
\`Cargando\`, la lista transformada, \`Red: \` seguido del mensaje, o
\`NoEncontrado: \` seguido del recurso.

- **\`map_sobre_datos\`** — un estado con dos artículos, transformado a sus
  nombres.
  Debe imprimir \`Camisa,Abrigo\`.
- **\`map_sobre_cargando\`** — el estado en curso.
  Debe imprimir \`Cargando\`.
- **\`error_de_red\`** — un fallo de red con el mensaje \`sin conexion\`, al que
  también se aplica la transformación.
  Debe imprimir \`Red: sin conexion\`.
- **Una comprobación oculta** — la otra clase de fallo de la jerarquía.

La comprobación oculta es deducible: la jerarquía del enunciado declara dos
clases de error y la tabla de \`map\` indica que ambas se conservan sin
transformar.
`,
    yaDeclarado: YA_DECLARADO,
    plantilla: {
      kotlin: `data class Item(val id: String, val name: String)

{{solucion}}

fun describir(r: Result<List<String>>): String = when (r) {
    is Result.Cargando -> "Cargando"
    is Result.Exito -> r.datos.joinToString(",")
    is Result.Fallo -> when (val e = r.error) {
        is ErrorCarga.Red -> "Red: " + e.mensaje
        is ErrorCarga.NoEncontrado -> "NoEncontrado: " + e.recurso
    }
}

fun main() {
    val datos = listOf(Item("1", "Camisa"), Item("2", "Abrigo"))
    val nombres: (List<Item>) -> List<String> = { l -> l.map { it.name } }
    val entrada: Result<List<Item>> = when (readLine()?.trim() ?: "") {
        "map_sobre_datos" -> Result.Exito(datos)
        "map_sobre_cargando" -> Result.Cargando
        "error_de_red" -> Result.Fallo(ErrorCarga.Red("sin conexion"))
        "error_no_encontrado" -> Result.Fallo(ErrorCarga.NoEncontrado("items"))
        else -> {
            println("caso desconocido")
            return
        }
    }
    println(describir(entrada.map(nombres)))
}`,
    },
    inicial: {
      kotlin: `// Escribe aquí el tipo genérico Result, la jerarquía ErrorCarga y la función
// de extensión map, según el enunciado. El tipo Item ya está declarado.
`,
    },
    casos: [
      { entrada: 'map_sobre_datos\n', salidaEsperada: 'Camisa,Abrigo', oculto: false },
      { entrada: 'map_sobre_cargando\n', salidaEsperada: 'Cargando', oculto: false },
      { entrada: 'error_de_red\n', salidaEsperada: 'Red: sin conexion', oculto: false },
      {
        entrada: 'error_no_encontrado\n',
        salidaEsperada: 'NoEncontrado: items',
        oculto: true,
      },
    ],
    soluciones: {
      kotlin: [
        // Estrategia A: when como expresión, una rama por alternativa.
        `sealed class Result<out T> {
    object Cargando : Result<Nothing>()
    data class Exito<T>(val datos: T) : Result<T>()
    data class Fallo(val error: ErrorCarga) : Result<Nothing>()
}

sealed class ErrorCarga {
    data class Red(val mensaje: String) : ErrorCarga()
    data class NoEncontrado(val recurso: String) : ErrorCarga()
}

fun <T, R> Result<T>.map(f: (T) -> R): Result<R> = when (this) {
    is Result.Cargando -> Result.Cargando
    is Result.Exito -> Result.Exito(f(datos))
    is Result.Fallo -> this
}`,
        // Estrategia B: sealed interface y comprobación por tipo antes de transformar.
        `sealed interface Result<out T> {
    object Cargando : Result<Nothing>
    data class Exito<T>(val datos: T) : Result<T>
    data class Fallo(val error: ErrorCarga) : Result<Nothing>
}

sealed interface ErrorCarga {
    data class Red(val mensaje: String) : ErrorCarga
    data class NoEncontrado(val recurso: String) : ErrorCarga
}

fun <T, R> Result<T>.map(f: (T) -> R): Result<R> {
    if (this is Result.Exito) return Result.Exito(f(this.datos))
    if (this is Result.Fallo) return this
    return Result.Cargando
}`,
      ],
    },
  },
];
