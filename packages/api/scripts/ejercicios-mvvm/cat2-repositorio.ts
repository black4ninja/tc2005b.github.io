import type { Ejercicio } from './tipos.js';

/** Firmas de lo ya proporcionado. Sin cuerpos: son solución de otros ejercicios. */
const YA_DECLARADO = {
  kotlin: `data class Item(val id: String, val name: String)`,
  swift: `struct Item {
    var id: String
    var name: String
}`,
};


/** El RETO sí recibe el contrato hecho: lo reutiliza sin modificarlo. */
const YA_DECLARADO_RETO = {
  kotlin: `data class Item(val id: String, val name: String)

interface ItemRepository {
    fun obtenerTodos(): List<Item>
    fun obtenerPorId(id: String): Item?
}`,
  swift: `struct Item {
    var id: String
    var name: String
}

protocol ItemRepository {
    func obtenerTodos() -> [Item]
    func obtenerPorId(_ id: String) -> Item?
}`,
};

/**
 * Concepto 2.1 — Contrato del repositorio y doble de prueba. Bilingüe.
 *
 * Casos COMPARTIDOS por Kotlin y Swift: los dos programas de comprobación
 * reconocen los mismos nombres y producen la misma salida.
 */

const CATEGORIA = 'Capa de dominio';
const CAPA = 'Dominio — `domain/repository/ItemRepository.kt` (Android) · `Protocolos/ItemRepository.swift` (iOS)';

const PROBLEMA = `
Este ejercicio construye **dos piezas**: el contrato del repositorio y una
implementación falsa de ese contrato.

El contrato declara qué operaciones existen para obtener artículos, sin decir de
dónde salen. La implementación falsa devuelve datos fijos, escritos a mano.

La pieza tiene dos vecinos, los que aparecen en el diagrama:

- **Quien la implementa**: la clase que habla con la API. Corresponde a otro
  ejercicio; aquí se sustituye por la implementación falsa.
- **Quien la consume**: el caso de uso o el ViewModel, que pide artículos sin
  saber si llegan de la red, de una caché o de una lista escrita a mano.

El problema que resuelve es de dependencia. Sin contrato, quien necesita
artículos depende directamente del código de red: no puede ejecutarse sin
servidor, ni comprobarse sin conexión, ni reutilizarse si la fuente cambia.
`;

const DE_DONDE_VIENE = `
El principio aplicable es la **inversión de dependencias**, la letra D de SOLID,
formulada por Robert C. Martin en 1996. Su enunciado es doble: los módulos de
alto nivel no deben depender de los de bajo nivel —ambos deben depender de
abstracciones— y las abstracciones no deben depender de los detalles.

En la práctica se traduce en una regla concreta: **el contrato se declara donde
se consume, no donde se implementa**. Por eso \`ItemRepository\` vive en la capa
de dominio y no en la de datos, aunque quien lo implementa esté en datos.

### Qué invierte exactamente

Sin contrato, la flecha de dependencia apunta del dominio hacia la red: el
dominio necesita conocer la clase concreta que hace las peticiones.

Con contrato, la flecha se invierte. El dominio declara lo que necesita y la
capa de datos se adapta a esa declaración. El dominio deja de conocer la
existencia de la red.

### Qué habilita la inversión

- **Comprobar sin infraestructura.** Una implementación falsa que devuelve una
  lista fija permite ejecutar el resto del sistema sin servidor.
- **Sustituir la fuente.** Cambiar de API, añadir una caché o leer de un fichero
  no altera ninguna línea del dominio.
- **Trabajar en paralelo.** Quien escribe la pantalla no espera a que la capa de
  red esté terminada: le basta el contrato.

La implementación falsa de este ejercicio se denomina **doble de prueba**. La
clasificación habitual —*dummy*, *stub*, *spy*, *mock*, *fake*— procede de
Gerard Meszaros, *xUnit Test Patterns* (2007). La de este ejercicio es un
*stub*: devuelve respuestas predefinidas y no verifica cómo se le llama.
`;

const DIAGRAMA = `
flowchart TB
    subgraph domain["domain/"]
        C["ItemRepository<br/>contrato: pieza de este ejercicio"]
        UC[GetItemsUseCase]
    end
    subgraph data["data/"]
        API[ItemRepositoryApi]
    end
    subgraph test["pruebas"]
        FAKE["ItemRepositoryFalso<br/>pieza de este ejercicio"]
    end
    UC --> C
    API -.implementa.-> C
    FAKE -.implementa.-> C
    style C fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px
    style FAKE fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px
`;

const DONDE_MAS = `
- **Backend.** Un servicio declara la interfaz de su almacén de datos y la
  implementa contra PostgreSQL en producción y contra memoria en las pruebas.
- **Sistemas de pago.** El código que cobra declara un contrato; detrás puede
  haber una pasarela real o un simulador que siempre acepta.
- **Bibliotecas.** Una biblioteca que necesita leer ficheros declara la
  operación y deja que quien la use decida si vienen del disco o de memoria.
- **Arquitectura hexagonal.** Alistair Cockburn llama *puertos* a estos
  contratos y *adaptadores* a sus implementaciones; es el mismo mecanismo con
  otro vocabulario.
`;

const ERRORES = `
- **Declarar el contrato en la capa de datos.** La dependencia deja de estar
  invertida: el dominio vuelve a apuntar hacia la infraestructura.
- **Incluir en el contrato detalles de la fuente.** Un parámetro llamado
  \`urlBase\`, o un tipo de respuesta HTTP, revela cómo se obtienen los datos y
  ata el contrato a una implementación concreta.
- **Devolver el DTO en lugar del modelo de dominio.** El contrato pertenece al
  dominio y debe expresarse en su vocabulario.
- **Escribir un doble de prueba que replique la lógica real.** Su valor está en
  ser predecible; si calcula, deja de serlo y sus fallos se confunden con los
  del sistema.
`;

const COMPRUEBA = `
Cuatro comprobaciones. Cada una utiliza el doble de prueba a través del
contrato, nunca de la clase concreta.

- **\`lista_completa\`** — pide todos los artículos e imprime sus nombres
  separados por comas.
  Debe imprimir \`Camisa,Abrigo\`.
  *Verifica:* que el contrato declare la operación de listado y que el doble
  devuelva los datos fijos en orden.
- **\`uno_por_id\`** — pide el artículo \`2\` e imprime su nombre.
  Debe imprimir \`Abrigo\`.
  *Verifica:* la operación de búsqueda por identificador.
- **\`id_inexistente\`** — pide el artículo \`99\`.
  Debe imprimir \`-\`.
  *Verifica:* que la ausencia se exprese en el tipo de retorno.
- **Una comprobación oculta** — utiliza el doble configurado con una lista
  vacía.
  *Verifica:* que las dos operaciones se comporten de forma coherente cuando no
  hay datos.

La comprobación oculta es deducible: el enunciado indica que el doble recibe su
lista al construirse, y la lista vacía es un valor admisible.
`;

const DRIVER_KOTLIN = `data class Item(val id: String, val name: String)

{{solucion}}

fun main() {
    val datos = listOf(Item("1", "Camisa"), Item("2", "Abrigo"))
    when (readLine()?.trim() ?: "") {
        "lista_completa" -> {
            val repo: ItemRepository = ItemRepositoryFalso(datos)
            println(repo.obtenerTodos().joinToString(",") { it.name })
        }
        "uno_por_id" -> {
            val repo: ItemRepository = ItemRepositoryFalso(datos)
            println(repo.obtenerPorId("2")?.name ?: "-")
        }
        "id_inexistente" -> {
            val repo: ItemRepository = ItemRepositoryFalso(datos)
            println(repo.obtenerPorId("99")?.name ?: "-")
        }
        "sin_datos" -> {
            val repo: ItemRepository = ItemRepositoryFalso(emptyList())
            println(repo.obtenerTodos().size.toString() + ":" + (repo.obtenerPorId("1")?.name ?: "-"))
        }
        else -> println("caso desconocido")
    }
}`;

const DRIVER_SWIFT = `import Foundation

struct Item {
    var id: String
    var name: String
}

{{solucion}}

let datos = [Item(id: "1", name: "Camisa"), Item(id: "2", name: "Abrigo")]
let caso = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
switch caso {
case "lista_completa":
    let repo: ItemRepository = ItemRepositoryFalso(items: datos)
    print(repo.obtenerTodos().map { $0.name }.joined(separator: ","))
case "uno_por_id":
    let repo: ItemRepository = ItemRepositoryFalso(items: datos)
    print(repo.obtenerPorId("2")?.name ?? "-")
case "id_inexistente":
    let repo: ItemRepository = ItemRepositoryFalso(items: datos)
    print(repo.obtenerPorId("99")?.name ?? "-")
case "sin_datos":
    let repo: ItemRepository = ItemRepositoryFalso(items: [])
    print("\\(repo.obtenerTodos().count):" + (repo.obtenerPorId("1")?.name ?? "-"))
default:
    print("caso desconocido")
}`;

const CASOS = [
  { entrada: 'lista_completa\n', salidaEsperada: 'Camisa,Abrigo', oculto: false },
  { entrada: 'uno_por_id\n', salidaEsperada: 'Abrigo', oculto: false },
  { entrada: 'id_inexistente\n', salidaEsperada: '-', oculto: false },
  { entrada: 'sin_datos\n', salidaEsperada: '0:-', oculto: true },
];

const FIRMAS = `
**Kotlin** — el contrato en \`domain/repository/ItemRepository.kt\` y el doble
junto a las pruebas:

\`\`\`kotlin
interface ItemRepository {
    fun obtenerTodos(): List<Item>
    fun obtenerPorId(id: String): Item?
}

class ItemRepositoryFalso(private val items: List<Item>) : ItemRepository
\`\`\`

**Swift** — el contrato en \`Protocolos/ItemRepository.swift\`:

\`\`\`swift
protocol ItemRepository {
    func obtenerTodos() -> [Item]
    func obtenerPorId(_ id: String) -> Item?
}

struct ItemRepositoryFalso: ItemRepository {
    var items: [Item]
}
\`\`\`

El tipo \`Item\` se proporciona ya declarado, con los campos \`id\` y \`name\`.
`;

const SOL_KOTLIN = [
  // Estrategia A: búsqueda con el operador de colecciones.
  `interface ItemRepository {
    fun obtenerTodos(): List<Item>
    fun obtenerPorId(id: String): Item?
}

class ItemRepositoryFalso(private val items: List<Item>) : ItemRepository {
    override fun obtenerTodos(): List<Item> = items
    override fun obtenerPorId(id: String): Item? = items.firstOrNull { it.id == id }
}`,
  // Estrategia B: índice construido al crear el doble.
  `interface ItemRepository {
    fun obtenerTodos(): List<Item>
    fun obtenerPorId(id: String): Item?
}

class ItemRepositoryFalso(private val items: List<Item>) : ItemRepository {
    private val porId: Map<String, Item> = items.associateBy { it.id }

    override fun obtenerTodos(): List<Item> = items.toList()
    override fun obtenerPorId(id: String): Item? = porId[id]
}`,
];

const SOL_SWIFT = [
  // Estrategia A: búsqueda lineal.
  `protocol ItemRepository {
    func obtenerTodos() -> [Item]
    func obtenerPorId(_ id: String) -> Item?
}

struct ItemRepositoryFalso: ItemRepository {
    var items: [Item]

    func obtenerTodos() -> [Item] { items }
    func obtenerPorId(_ id: String) -> Item? { items.first { $0.id == id } }
}`,
  // Estrategia B: diccionario calculado.
  `protocol ItemRepository {
    func obtenerTodos() -> [Item]
    func obtenerPorId(_ id: String) -> Item?
}

struct ItemRepositoryFalso: ItemRepository {
    var items: [Item]

    private var porId: [String: Item] {
        var m: [String: Item] = [:]
        for i in items { m[i.id] = i }
        return m
    }

    func obtenerTodos() -> [Item] { items }
    func obtenerPorId(_ id: String) -> Item? { porId[id] }
}`,
];

export const repositorio: Ejercicio[] = [
  // --- GUIADO ---------------------------------------------------------------
  {
    slugBase: 'mvvm-repositorio',
    tituloBase: 'Contrato del repositorio y doble de prueba',
    nivel: 'guiado',
    categoria: CATEGORIA,
    lenguajes: ['kotlin', 'swift'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
El contrato y su doble de prueba.
${FIRMAS}
`,
    pasoAPaso: `
1. Declara el contrato con las dos operaciones. En Kotlin es una \`interface\`; en
   Swift, un \`protocol\`.
2. Observa que \`obtenerPorId\` devuelve un tipo que admite la ausencia. Un
   identificador puede no corresponder a ningún artículo, y esa posibilidad
   forma parte del contrato.
3. Declara el doble recibiendo la lista al construirse. No debe crearla por su
   cuenta: quien lo usa decide con qué datos responde.
4. Implementa \`obtenerTodos\` devolviendo la lista recibida.
5. Implementa \`obtenerPorId\` buscando por identificador y devolviendo la
   ausencia cuando no haya coincidencia.
6. No añadas al contrato ninguna operación que las comprobaciones no utilicen.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    yaDeclarado: YA_DECLARADO,
    plantilla: { kotlin: DRIVER_KOTLIN, swift: DRIVER_SWIFT },
    inicial: {
      kotlin: `interface ItemRepository {
    // TODO: declarar obtenerTodos() y obtenerPorId(id)
}

class ItemRepositoryFalso(private val items: List<Item>) : ItemRepository {
    // TODO: implementar las dos operaciones
}
`,
      swift: `protocol ItemRepository {
    // TODO: declarar obtenerTodos() y obtenerPorId(_:)
}

struct ItemRepositoryFalso: ItemRepository {
    var items: [Item]
    // TODO: implementar las dos operaciones
}
`,
    },
    casos: CASOS,
    soluciones: { kotlin: SOL_KOTLIN, swift: SOL_SWIFT },
  },

  // --- BASE -----------------------------------------------------------------
  {
    slugBase: 'mvvm-repositorio',
    tituloBase: 'Contrato del repositorio y doble de prueba',
    nivel: 'base',
    categoria: CATEGORIA,
    lenguajes: ['kotlin', 'swift'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
El contrato y su doble de prueba, con estas firmas:
${FIRMAS}

Las comprobaciones declaran la variable con el tipo del contrato, no con el de la
clase concreta. Cualquier operación que solo exista en el doble resulta
inaccesible desde ellas.
`,
    pasoAPaso: `
1. Declara el contrato con las dos operaciones y sus tipos de retorno.
2. Decide cómo expresa el contrato que un identificador puede no existir.
3. Implementa el doble sobre la lista que recibe al construirse.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    yaDeclarado: YA_DECLARADO,
    plantilla: { kotlin: DRIVER_KOTLIN, swift: DRIVER_SWIFT },
    inicial: {
      kotlin: `// Escribe aquí ItemRepository y ItemRepositoryFalso.
// El tipo Item ya está declarado, con los campos id y name.
`,
      swift: `// Escribe aquí ItemRepository y ItemRepositoryFalso.
// El tipo Item ya está declarado, con los campos id y name.
`,
    },
    casos: CASOS,
    soluciones: { kotlin: SOL_KOTLIN, swift: SOL_SWIFT },
  },

  // --- RETO -----------------------------------------------------------------
  {
    slugBase: 'mvvm-repositorio',
    tituloBase: 'Contrato del repositorio y doble de prueba',
    nivel: 'reto',
    categoria: CATEGORIA,
    lenguajes: ['kotlin', 'swift'],
    capa: CAPA,
    problema: `
El doble de prueba del nivel base siempre responde correctamente. Con él no es
posible comprobar qué hace la aplicación cuando la fuente de datos falla, que es
justamente la situación que más código de interfaz determina.

Se requiere además un segundo doble que **registre cómo se le ha llamado**. Sin
ese registro no hay forma de detectar que una pantalla pide los datos dos veces,
ni de comprobar que una caché evita la segunda petición.

Ambas necesidades corresponden a categorías distintas de doble de prueba, y
conviene no confundirlas: una sustituye la respuesta, la otra observa la
llamada.
`,
    deDondeViene: `
La clasificación procede de Gerard Meszaros, *xUnit Test Patterns* (2007), y
distingue por lo que cada doble aporta:

- **Stub.** Devuelve respuestas predefinidas. Sustituye a la fuente real. Es el
  del nivel base.
- **Spy.** Además de responder, registra las llamadas recibidas para poder
  consultarlas después. Es el que añade este nivel.
- **Mock.** Declara por adelantado las llamadas que espera y falla si no se
  producen.
- **Fake.** Implementa la lógica real de forma simplificada, por ejemplo un
  almacén en memoria.

La distinción importa porque determina qué comprueba cada prueba. Un stub
verifica **el estado** resultante; un spy verifica **el comportamiento**, es
decir, la interacción. Sustituir uno por otro produce pruebas que pasan sin
comprobar lo que su nombre indica.

Respecto al fallo, la decisión de diseño es cómo lo expresa el contrato. Una
excepción obliga a quien invoca a conocerla y a capturarla; un tipo de retorno
que contemple el error hace que el compilador exija tratarlo. La segunda opción
es la que sigue esta arquitectura, y se desarrolla en el ejercicio del tipo
\`Result\`.
`,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: `
- **Pruebas de integración.** Un doble que simula una caída del proveedor es la
  única forma de ejercitar la ruta de error sin provocar una caída real.
- **Ingeniería del caos.** Netflix generalizó la idea a producción: inyectar
  fallos deliberados para comprobar que el sistema los resiste.
- **Registro de auditoría.** Contar y registrar las llamadas a un servicio
  externo es el mismo mecanismo del spy, aplicado a producción.
`,
    queEscribes: `
Sobre el mismo contrato del nivel base, dos dobles adicionales:

**Kotlin**:

\`\`\`kotlin
class ItemRepositoryQueFalla : ItemRepository
class ItemRepositoryEspia(private val items: List<Item>) : ItemRepository {
    val llamadas: Int
}
\`\`\`

**Swift**:

\`\`\`swift
struct ItemRepositoryQueFalla: ItemRepository
class ItemRepositoryEspia: ItemRepository {
    var llamadas: Int
}
\`\`\`

Comportamiento exigido:

| Doble | \`obtenerTodos()\` | \`obtenerPorId(id)\` |
|---|---|---|
| \`ItemRepositoryQueFalla\` | lista vacía | ausencia, siempre |
| \`ItemRepositoryEspia\` | los artículos recibidos | búsqueda normal |

El espía incrementa \`llamadas\` **una vez por cada invocación** de cualquiera de
las dos operaciones.

El contrato **no cambia**: los tres dobles lo implementan sin añadirle nada.
`,
    pasoAPaso: `
1. Reutiliza el contrato del nivel base sin modificarlo. Si un doble necesitara
   ampliarlo, la abstracción estaría mal planteada.
2. Escribe el doble que falla. No requiere estado: responde siempre lo mismo.
3. Escribe el espía con un contador. En Swift, un tipo que modifica su propio
   estado desde métodos no mutantes debe ser \`class\`, no \`struct\`: la semántica
   de valor impediría conservar el contador.
4. Incrementa el contador en las dos operaciones, no solo en el listado.
5. Verifica que el contador sea consultable desde fuera, ya que las
   comprobaciones lo imprimen.
`,
    erroresTipicos: `
- **Ampliar el contrato para dar cabida al contador.** El contador pertenece al
  doble, no a la abstracción; el código de producción no debe conocerlo.
- **Declarar el espía como \`struct\` en Swift.** Cada copia mantendría su propio
  contador y el recuento resultaría siempre cero o uno.
- **Contar solo una de las dos operaciones.** El enunciado exige registrar
  ambas.
- **Hacer que el doble que falla lance una excepción.** El contrato del nivel
  base no la declara, y añadirla lo modificaría.
`,
    comoSeComprueba: `
Las comprobaciones utilizan los tres dobles a través del mismo contrato.

- **\`falla_lista\`** — pide todos los artículos al doble que falla e imprime
  cuántos ha devuelto.
  Debe imprimir \`0\`.
- **\`falla_por_id\`** — pide un artículo concreto al doble que falla.
  Debe imprimir \`-\`.
- **\`espia_cuenta_dos\`** — invoca las dos operaciones del espía e imprime el
  contador.
  Debe imprimir \`Abrigo:2\`.
- **Una comprobación oculta** — consulta el contador del espía sin haberlo usado
  todavía.

La comprobación oculta es deducible: el enunciado indica que el contador registra
una unidad por invocación, de modo que su valor inicial se deriva de esa regla.
`,
    yaDeclarado: YA_DECLARADO_RETO,
    plantilla: {
      kotlin: `data class Item(val id: String, val name: String)

interface ItemRepository {
    fun obtenerTodos(): List<Item>
    fun obtenerPorId(id: String): Item?
}

{{solucion}}

fun main() {
    val datos = listOf(Item("1", "Camisa"), Item("2", "Abrigo"))
    when (readLine()?.trim() ?: "") {
        "falla_lista" -> {
            val repo: ItemRepository = ItemRepositoryQueFalla()
            println(repo.obtenerTodos().size.toString())
        }
        "falla_por_id" -> {
            val repo: ItemRepository = ItemRepositoryQueFalla()
            println(repo.obtenerPorId("1")?.name ?: "-")
        }
        "espia_cuenta_dos" -> {
            val espia = ItemRepositoryEspia(datos)
            val repo: ItemRepository = espia
            repo.obtenerTodos()
            val n = repo.obtenerPorId("2")?.name ?: "-"
            println(n + ":" + espia.llamadas.toString())
        }
        "espia_sin_usar" -> {
            val espia = ItemRepositoryEspia(datos)
            println(espia.llamadas.toString())
        }
        else -> println("caso desconocido")
    }
}`,
      swift: `import Foundation

struct Item {
    var id: String
    var name: String
}

protocol ItemRepository {
    func obtenerTodos() -> [Item]
    func obtenerPorId(_ id: String) -> Item?
}

{{solucion}}

let datos = [Item(id: "1", name: "Camisa"), Item(id: "2", name: "Abrigo")]
let caso = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
switch caso {
case "falla_lista":
    let repo: ItemRepository = ItemRepositoryQueFalla()
    print("\\(repo.obtenerTodos().count)")
case "falla_por_id":
    let repo: ItemRepository = ItemRepositoryQueFalla()
    print(repo.obtenerPorId("1")?.name ?? "-")
case "espia_cuenta_dos":
    let espia = ItemRepositoryEspia(items: datos)
    let repo: ItemRepository = espia
    _ = repo.obtenerTodos()
    let n = repo.obtenerPorId("2")?.name ?? "-"
    print(n + ":\\(espia.llamadas)")
case "espia_sin_usar":
    let espia = ItemRepositoryEspia(items: datos)
    print("\\(espia.llamadas)")
default:
    print("caso desconocido")
}`,
    },
    inicial: {
      kotlin: `// Escribe aquí los dos dobles. El contrato ItemRepository ya está declarado
// y NO debe modificarse.
//
//   class ItemRepositoryQueFalla : ItemRepository
//   class ItemRepositoryEspia(private val items: List<Item>) : ItemRepository
`,
      swift: `// Escribe aquí los dos dobles. El protocolo ItemRepository ya está declarado
// y NO debe modificarse.
//
//   struct ItemRepositoryQueFalla: ItemRepository
//   class ItemRepositoryEspia: ItemRepository   // recibe items al construirse
`,
    },
    casos: [
      { entrada: 'falla_lista\n', salidaEsperada: '0', oculto: false },
      { entrada: 'falla_por_id\n', salidaEsperada: '-', oculto: false },
      { entrada: 'espia_cuenta_dos\n', salidaEsperada: 'Abrigo:2', oculto: false },
      { entrada: 'espia_sin_usar\n', salidaEsperada: '0', oculto: true },
    ],
    soluciones: {
      kotlin: [
        // Estrategia A: contador como propiedad con setter privado.
        `class ItemRepositoryQueFalla : ItemRepository {
    override fun obtenerTodos(): List<Item> = emptyList()
    override fun obtenerPorId(id: String): Item? = null
}

class ItemRepositoryEspia(private val items: List<Item>) : ItemRepository {
    var llamadas: Int = 0
        private set

    override fun obtenerTodos(): List<Item> {
        llamadas++
        return items
    }

    override fun obtenerPorId(id: String): Item? {
        llamadas++
        return items.firstOrNull { it.id == id }
    }
}`,
        // Estrategia B: registro de nombres de operación; el contador se deriva.
        `class ItemRepositoryQueFalla : ItemRepository {
    override fun obtenerTodos(): List<Item> = listOf()
    override fun obtenerPorId(id: String): Item? = null
}

class ItemRepositoryEspia(private val items: List<Item>) : ItemRepository {
    private val registro = mutableListOf<String>()

    val llamadas: Int get() = registro.size

    override fun obtenerTodos(): List<Item> {
        registro.add("obtenerTodos")
        return items
    }

    override fun obtenerPorId(id: String): Item? {
        registro.add("obtenerPorId:" + id)
        for (i in items) if (i.id == id) return i
        return null
    }
}`,
      ],
      swift: [
        // Estrategia A: clase con contador entero.
        `struct ItemRepositoryQueFalla: ItemRepository {
    func obtenerTodos() -> [Item] { [] }
    func obtenerPorId(_ id: String) -> Item? { nil }
}

final class ItemRepositoryEspia: ItemRepository {
    private let items: [Item]
    private(set) var llamadas: Int = 0

    init(items: [Item]) {
        self.items = items
    }

    func obtenerTodos() -> [Item] {
        llamadas += 1
        return items
    }

    func obtenerPorId(_ id: String) -> Item? {
        llamadas += 1
        return items.first { $0.id == id }
    }
}`,
        // Estrategia B: registro de nombres; el contador se deriva.
        `struct ItemRepositoryQueFalla: ItemRepository {
    func obtenerTodos() -> [Item] { return [] }
    func obtenerPorId(_ id: String) -> Item? { return nil }
}

final class ItemRepositoryEspia: ItemRepository {
    private let items: [Item]
    private var registro: [String] = []

    var llamadas: Int { registro.count }

    init(items: [Item]) {
        self.items = items
    }

    func obtenerTodos() -> [Item] {
        registro.append("obtenerTodos")
        return items
    }

    func obtenerPorId(_ id: String) -> Item? {
        registro.append("obtenerPorId:" + id)
        for i in items where i.id == id { return i }
        return nil
    }
}`,
      ],
    },
  },
];
