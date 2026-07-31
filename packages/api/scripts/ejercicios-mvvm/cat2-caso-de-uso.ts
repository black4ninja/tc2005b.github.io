import type { Ejercicio } from './tipos.js';

/**
 * Concepto 2.2 — Caso de uso (Android) · Requirement (iOS). Bilingüe.
 *
 * El vocabulario de arquitectura sigue siendo el de cada pista: `UseCase` en
 * Android, `Requirement` en iOS. No se unifica, porque es lo que el alumno va a
 * encontrar en el wiki de su plataforma.
 *
 * Casos COMPARTIDOS: los dos programas de comprobación reconocen los mismos
 * nombres y producen la misma salida.
 */

const CATEGORIA = 'Capa de dominio';
const CAPA =
  'Dominio — `domain/usecase/GetItemsUseCase.kt` (Android) · `Requerimientos/ItemsRequirement.swift` (iOS)';

const PROBLEMA = `
Este ejercicio construye **una sola pieza**: la que aplica las reglas del
negocio sobre los artículos que devuelve el repositorio.

Las reglas son dos:

1. Un artículo sin unidades disponibles no se muestra.
2. Los artículos se presentan ordenados por nombre.

Ninguna de las dos pertenece a los vecinos de esta pieza:

- **Quien la abastece**: el repositorio. Su responsabilidad es obtener los datos,
  no decidir cuáles importan. Un repositorio que filtrara impediría que otra
  pantalla mostrara el catálogo completo.
- **Quien la consume**: el ViewModel. Su responsabilidad es preparar el estado de
  la pantalla. Si además decidiera las reglas, cada pantalla que necesitara las
  mismas tendría que repetirlas.

La pieza existe para que esas dos reglas tengan **un solo lugar** donde vivir.
`;

const DE_DONDE_VIENE = `
Un caso de uso nombra una operación completa del sistema desde el punto de vista
de quien lo usa. El término procede de Ivar Jacobson, que lo introdujo en 1987 y
lo desarrolló en *Object-Oriented Software Engineering* (1992) como unidad de
análisis de requisitos.

Robert C. Martin lo convirtió en una unidad de código en *Clean Architecture*
(2017): una clase por operación, con un único método público. Esa forma —una
clase, una operación— es la que utiliza esta arquitectura.

### Por qué una clase con un solo método

La objeción habitual es que una clase con un método podría ser una función
suelta. La respuesta está en las dependencias: el caso de uso **recibe el
repositorio al construirse** y lo conserva. Quien lo invoca no necesita
conocerlo.

De ahí se derivan tres propiedades:

- El caso de uso se comprueba con un repositorio falso, sin red ni base de datos.
- La misma operación se reutiliza desde varias pantallas sin duplicar reglas.
- El nombre de la clase documenta el sistema: la lista de casos de uso enumera lo
  que la aplicación sabe hacer.

### El mismo concepto, dos nombres

Las dos pistas del curso lo llaman de forma distinta, y conviene reconocer ambos
términos:

| Android | iOS |
|---|---|
| \`GetItemsUseCase\` | \`ItemsRequirement\` |
| Se invoca con \`operator fun invoke\` | Se invoca con un método \`execute\` |

La diferencia es de vocabulario, no de diseño: en los dos casos se trata de una
pieza que recibe un contrato, aplica reglas y devuelve modelos de dominio.
`;

const DIAGRAMA = `
flowchart LR
    subgraph domain["domain/"]
        R[ItemRepository]
        UC["GetItemsUseCase<br/>ItemsRequirement<br/>pieza de este ejercicio"]
    end
    subgraph presentation["presentation/"]
        VM[ItemsViewModel]
    end
    R --> UC
    UC --> VM
    style UC fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px
`;

const DONDE_MAS = `
- **Backend.** La capa de servicios de aplicación cumple esta función: recibe los
  repositorios, aplica las reglas y devuelve entidades. Los controladores HTTP
  solo traducen la petición.
- **Interacción por línea de órdenes.** Cada subcomando de una herramienta
  corresponde a un caso de uso; la parte que analiza los argumentos no contiene
  reglas.
- **Tareas programadas.** Un proceso nocturno invoca los mismos casos de uso que
  la interfaz, sin duplicar la lógica.
- **Pruebas de aceptación.** Un caso de uso por operación permite escribir
  pruebas que hablan el idioma del negocio, sin pasar por la interfaz.
`;

const ERRORES = `
- **Colocar las reglas en el repositorio.** El repositorio quedaría atado a una
  pantalla concreta y dejaría de servir a las demás.
- **Colocar las reglas en el ViewModel.** Se repiten en cada pantalla que las
  necesite, y dejan de poder comprobarse sin construir la pantalla.
- **Recibir el repositorio en el método en lugar de en el constructor.** Quien
  invoca la operación vuelve a necesitar conocer la fuente de datos.
- **Depender de la implementación concreta.** El caso de uso recibe el contrato;
  si recibiera la clase que habla con la API, la inversión de dependencias del
  ejercicio anterior quedaría deshecha.
- **Ordenar en la interfaz.** El orden es una regla del negocio en este
  enunciado, y su lugar es esta pieza.
`;

const COMPRUEBA = `
Cuatro comprobaciones. Cada una construye un repositorio falso con datos fijos,
lo entrega a la pieza y muestra el resultado con el formato
\`número de artículos:nombres separados por comas\`.

- **\`ordena_por_nombre\`** — dos artículos con unidades disponibles, en orden
  inverso al alfabético.
  Debe imprimir \`2:Abrigo,Camisa\`.
  *Verifica:* la regla de ordenación.
- **\`descarta_sin_stock\`** — dos artículos, uno de ellos con \`stock\` a cero.
  Debe imprimir \`1:Camisa\`.
  *Verifica:* la regla de disponibilidad.
- **\`repositorio_vacio\`** — un repositorio sin artículos.
  Debe imprimir \`0:\`.
  *Verifica:* que el resultado sea una lista vacía y no un error.
- **Una comprobación oculta** — tres artículos que exigen aplicar las dos reglas
  a la vez.
  *Verifica:* que el descarte y la ordenación no se estorben entre sí.

La comprobación oculta es deducible: el enunciado enumera las dos reglas, y las
comprobaciones visibles las ejercitan por separado.
`;

const CABECERA_KOTLIN = `data class Item(val id: String, val name: String, val stock: Int)

interface ItemRepository {
    fun obtenerTodos(): List<Item>
    fun obtenerPorId(id: String): Item?
}

class RepositorioFijo(private val items: List<Item>) : ItemRepository {
    override fun obtenerTodos(): List<Item> = items
    override fun obtenerPorId(id: String): Item? = items.firstOrNull { it.id == id }
}`;

const CABECERA_SWIFT = `import Foundation

struct Item {
    var id: String
    var name: String
    var stock: Int
}

protocol ItemRepository {
    func obtenerTodos() -> [Item]
    func obtenerPorId(_ id: String) -> Item?
}

struct RepositorioFijo: ItemRepository {
    var items: [Item]
    func obtenerTodos() -> [Item] { items }
    func obtenerPorId(_ id: String) -> Item? { items.first { $0.id == id } }
}`;

const DRIVER_KOTLIN = `${CABECERA_KOTLIN}

{{solucion}}

fun main() {
    fun mostrar(l: List<Item>) =
        println(l.size.toString() + ":" + l.joinToString(",") { it.name })
    when (readLine()?.trim() ?: "") {
        "ordena_por_nombre" -> mostrar(
            GetItemsUseCase(RepositorioFijo(listOf(
                Item("1", "Camisa", 2), Item("2", "Abrigo", 5),
            )))()
        )
        "descarta_sin_stock" -> mostrar(
            GetItemsUseCase(RepositorioFijo(listOf(
                Item("1", "Camisa", 2), Item("2", "Abrigo", 0),
            )))()
        )
        "repositorio_vacio" -> mostrar(GetItemsUseCase(RepositorioFijo(emptyList()))())
        "descarta_y_ordena" -> mostrar(
            GetItemsUseCase(RepositorioFijo(listOf(
                Item("1", "Zapato", 0), Item("2", "Camisa", 3), Item("3", "Abrigo", 1),
            )))()
        )
        else -> println("caso desconocido")
    }
}`;

const DRIVER_SWIFT = `${CABECERA_SWIFT}

{{solucion}}

func mostrar(_ l: [Item]) {
    print("\\(l.count):" + l.map { $0.name }.joined(separator: ","))
}

let caso = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
switch caso {
case "ordena_por_nombre":
    let r = RepositorioFijo(items: [Item(id: "1", name: "Camisa", stock: 2),
                                    Item(id: "2", name: "Abrigo", stock: 5)])
    mostrar(ItemsRequirement(repositorio: r).execute())
case "descarta_sin_stock":
    let r = RepositorioFijo(items: [Item(id: "1", name: "Camisa", stock: 2),
                                    Item(id: "2", name: "Abrigo", stock: 0)])
    mostrar(ItemsRequirement(repositorio: r).execute())
case "repositorio_vacio":
    let r = RepositorioFijo(items: [])
    mostrar(ItemsRequirement(repositorio: r).execute())
case "descarta_y_ordena":
    let r = RepositorioFijo(items: [Item(id: "1", name: "Zapato", stock: 0),
                                    Item(id: "2", name: "Camisa", stock: 3),
                                    Item(id: "3", name: "Abrigo", stock: 1)])
    mostrar(ItemsRequirement(repositorio: r).execute())
default:
    print("caso desconocido")
}`;

const CASOS = [
  { entrada: 'ordena_por_nombre\n', salidaEsperada: '2:Abrigo,Camisa', oculto: false },
  { entrada: 'descarta_sin_stock\n', salidaEsperada: '1:Camisa', oculto: false },
  { entrada: 'repositorio_vacio\n', salidaEsperada: '0:', oculto: false },
  { entrada: 'descarta_y_ordena\n', salidaEsperada: '2:Abrigo,Camisa', oculto: true },
];

const FIRMAS = `
**Kotlin** — \`domain/usecase/GetItemsUseCase.kt\`:

\`\`\`kotlin
class GetItemsUseCase(private val repositorio: ItemRepository) {
    operator fun invoke(): List<Item>
}
\`\`\`

**Swift** — \`Requerimientos/ItemsRequirement.swift\`:

\`\`\`swift
struct ItemsRequirement {
    let repositorio: ItemRepository
    func execute() -> [Item]
}
\`\`\`

\`Item\`, \`ItemRepository\` y un repositorio falso se proporcionan ya escritos.
\`Item\` tiene los campos \`id\`, \`name\` y \`stock\`.
`;

const SOL_KOTLIN = [
  // Estrategia A: cadena de operadores de colección.
  `class GetItemsUseCase(private val repositorio: ItemRepository) {
    operator fun invoke(): List<Item> =
        repositorio.obtenerTodos()
            .filter { it.stock > 0 }
            .sortedBy { it.name }
}`,
  // Estrategia B: recorrido explícito y ordenación al final.
  `class GetItemsUseCase(private val repositorio: ItemRepository) {
    operator fun invoke(): List<Item> {
        val disponibles = mutableListOf<Item>()
        for (i in repositorio.obtenerTodos()) {
            if (i.stock > 0) disponibles.add(i)
        }
        disponibles.sortWith(compareBy { it.name })
        return disponibles
    }
}`,
];

const SOL_SWIFT = [
  // Estrategia A: filter + sorted.
  `struct ItemsRequirement {
    let repositorio: ItemRepository

    func execute() -> [Item] {
        repositorio.obtenerTodos()
            .filter { $0.stock > 0 }
            .sorted { $0.name < $1.name }
    }
}`,
  // Estrategia B: recorrido explícito y ordenación al final.
  `struct ItemsRequirement {
    let repositorio: ItemRepository

    func execute() -> [Item] {
        var disponibles: [Item] = []
        for i in repositorio.obtenerTodos() where i.stock > 0 {
            disponibles.append(i)
        }
        disponibles.sort { $0.name < $1.name }
        return disponibles
    }
}`,
];

export const casoDeUso: Ejercicio[] = [
  // --- GUIADO ---------------------------------------------------------------
  {
    slugBase: 'mvvm-caso-uso',
    tituloBase: 'Caso de uso (Android) · Requirement (iOS)',
    nivel: 'guiado',
    categoria: CATEGORIA,
    lenguajes: ['kotlin', 'swift'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
La pieza que aplica las dos reglas.
${FIRMAS}
`,
    pasoAPaso: `
1. Declara la clase recibiendo el repositorio al construirse. El tipo del
   parámetro es **el contrato**, no la clase concreta que lo implementa.
2. Dentro de la operación, pide al repositorio todos los artículos. La pieza no
   decide de dónde salen.
3. Aplica la regla de disponibilidad: descarta los artículos cuyo \`stock\` no sea
   mayor que cero.
4. Aplica la regla de orden: ordena por \`name\`.
5. Devuelve el resultado sin transformarlo a otro tipo. El caso de uso opera en
   el vocabulario del dominio.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    plantilla: { kotlin: DRIVER_KOTLIN, swift: DRIVER_SWIFT },
    inicial: {
      kotlin: `class GetItemsUseCase(private val repositorio: ItemRepository) {
    operator fun invoke(): List<Item> {
        val todos = repositorio.obtenerTodos()
        // TODO 1: descartar los que no tengan unidades disponibles
        // TODO 2: ordenar por nombre
        return todos
    }
}
`,
      swift: `struct ItemsRequirement {
    let repositorio: ItemRepository

    func execute() -> [Item] {
        let todos = repositorio.obtenerTodos()
        // TODO 1: descartar los que no tengan unidades disponibles
        // TODO 2: ordenar por nombre
        return todos
    }
}
`,
    },
    casos: CASOS,
    soluciones: { kotlin: SOL_KOTLIN, swift: SOL_SWIFT },
  },

  // --- BASE -----------------------------------------------------------------
  {
    slugBase: 'mvvm-caso-uso',
    tituloBase: 'Caso de uso (Android) · Requirement (iOS)',
    nivel: 'base',
    categoria: CATEGORIA,
    lenguajes: ['kotlin', 'swift'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
La pieza que aplica las dos reglas del enunciado, con estas firmas:
${FIRMAS}
`,
    pasoAPaso: `
1. Decide qué recibe la pieza al construirse y qué recibe en la operación. La
   diferencia determina si quien la invoca necesita conocer el repositorio.
2. Aplica las dos reglas del apartado "El problema".
3. Comprueba que el orden de aplicación no altere el resultado.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    plantilla: { kotlin: DRIVER_KOTLIN, swift: DRIVER_SWIFT },
    inicial: {
      kotlin: `// Escribe aquí GetItemsUseCase.
// Item, ItemRepository y RepositorioFijo ya están declarados.
`,
      swift: `// Escribe aquí ItemsRequirement.
// Item, ItemRepository y RepositorioFijo ya están declarados.
`,
    },
    casos: CASOS,
    soluciones: { kotlin: SOL_KOTLIN, swift: SOL_SWIFT },
  },

  // --- RETO -----------------------------------------------------------------
  {
    slugBase: 'mvvm-caso-uso',
    tituloBase: 'Caso de uso (Android) · Requirement (iOS)',
    nivel: 'reto',
    categoria: CATEGORIA,
    lenguajes: ['kotlin', 'swift'],
    capa: CAPA,
    problema: `
El catálogo incorpora un buscador. La operación deja de ser "dame los artículos
disponibles" y pasa a ser "dame los artículos disponibles que coincidan con lo
que el usuario ha escrito".

Eso introduce un dato que antes no existía: **la consulta**. Y con ella, una
decisión de diseño que el nivel base no planteaba: la consulta no puede recibirse
al construir la pieza, porque cambia con cada pulsación, mientras que el
repositorio se fija una sola vez.

Aparece además una regla de presentación de resultados. Cuando el usuario escribe
el nombre exacto de un artículo, espera verlo el primero, aunque
alfabéticamente no le corresponda esa posición.
`,
    deDondeViene: `
La distinción que este nivel introduce es entre **dependencias** y
**parámetros**, y se decide por su ciclo de vida:

- Una **dependencia** es aquello de lo que la pieza no puede prescindir y que no
  cambia entre invocaciones: el repositorio. Se recibe al construir.
- Un **parámetro** es el dato concreto de cada invocación: la consulta. Se recibe
  al invocar.

Confundirlas tiene consecuencias observables. Si la consulta se recibiera al
construir, habría que crear un caso de uso nuevo por cada pulsación de teclado.
Si el repositorio se recibiera al invocar, quien llama tendría que conocerlo, y
la inversión de dependencias quedaría deshecha.

La regla de ordenación introduce un segundo concepto: **la relevancia**. Ordenar
por un criterio y desempatar por otro es la forma más simple de lo que un motor
de búsqueda hace con puntuaciones. Aquí se reduce a dos niveles —coincidencia
exacta primero, resto después— pero la estructura del código es la misma: se
ordena por una clave compuesta.
`,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: `
- **Motores de búsqueda.** La ordenación por relevancia con desempate
  alfabético es el caso más simple de puntuación de resultados.
- **Listados de comercio electrónico.** Los filtros aplicados son parámetros; el
  catálogo del que se leen es una dependencia.
- **Informes.** Un generador de informes recibe la fuente de datos al construirse
  y el rango de fechas en cada invocación.
`,
    queEscribes: `
Una pieza que recibe la consulta en la invocación:

**Kotlin**:

\`\`\`kotlin
class BuscarItemsUseCase(private val repositorio: ItemRepository) {
    operator fun invoke(consulta: String): List<Item>
}
\`\`\`

**Swift**:

\`\`\`swift
struct BuscarItemsRequirement {
    let repositorio: ItemRepository
    func execute(consulta: String) -> [Item]
}
\`\`\`

Reglas, en este orden:

1. Se descartan los artículos sin unidades disponibles.
2. Si la consulta está vacía o solo contiene espacios, no se filtra por nombre.
   En caso contrario, se conservan los artículos cuyo nombre **contenga** la
   consulta, sin distinguir mayúsculas de minúsculas.
3. El resultado se ordena así: primero los artículos cuyo nombre coincida
   **exactamente** con la consulta, también sin distinguir mayúsculas; después,
   el resto. Dentro de cada grupo, por orden alfabético.
`,
    pasoAPaso: `
1. Mantén el repositorio como dependencia del constructor y añade la consulta
   como parámetro de la operación.
2. Normaliza la consulta antes de usarla: elimina los espacios de los extremos y
   llévala a minúsculas una sola vez, no dentro de cada comparación.
3. Aplica el descarte por disponibilidad antes que el filtro por nombre. El
   resultado coincide, pero el código expresa mejor que la disponibilidad es una
   regla del catálogo y la consulta es una petición del usuario.
4. Resuelve la ordenación con una clave compuesta: un primer criterio que
   distinga la coincidencia exacta y un segundo criterio alfabético. Kotlin
   dispone de \`sortedWith(compareBy(...))\`; Swift, de \`sorted\` con una
   comparación que contemple ambos criterios.
5. Verifica el caso de una consulta que no coincide con ningún artículo: el
   resultado es una lista vacía.
`,
    erroresTipicos: `
- **Recibir la consulta en el constructor.** Obliga a crear una instancia nueva
  por cada búsqueda y confunde parámetro con dependencia.
- **Comparar sin normalizar las mayúsculas.** El filtro dejaría fuera
  coincidencias válidas según cómo escriba el usuario.
- **Ordenar solo por coincidencia exacta.** Sin el criterio alfabético de
  desempate, el orden dentro de cada grupo queda indeterminado.
- **Tratar la consulta vacía como una coincidencia vacía.** Toda cadena contiene
  la cadena vacía, de modo que el filtro no elimina nada; el enunciado exige
  además que una consulta de solo espacios se comporte igual.
`,
    comoSeComprueba: `
Las comprobaciones construyen un repositorio con cuatro artículos y muestran el
resultado con el formato \`número de artículos:nombres separados por comas\`.

El catálogo es siempre el mismo: \`Camisa\` (3 unidades), \`camisa larga\` (2),
\`Abrigo\` (1) y \`Zapato\` (0).

- **\`consulta_vacia\`** — la cadena vacía.
  Debe imprimir \`3:Abrigo,Camisa,camisa larga\`.
  *Verifica:* que la consulta vacía no filtre, y que \`Zapato\` quede fuera por no
  tener unidades.
- **\`coincidencia_parcial\`** — la consulta \`cami\`.
  Debe imprimir \`2:Camisa,camisa larga\`.
  *Verifica:* la búsqueda por contenido, sin distinguir mayúsculas.
- **\`sin_coincidencias\`** — la consulta \`bufanda\`.
  Debe imprimir \`0:\`.
  *Verifica:* que la ausencia de resultados sea una lista vacía.
- **Una comprobación oculta** — una consulta que coincide exactamente con el
  nombre de un artículo y parcialmente con el de otro.
  *Verifica:* la regla de ordenación por coincidencia exacta.

La comprobación oculta es deducible: la regla 3 del enunciado describe
exactamente esa situación, y ninguna comprobación visible la ejercita.

El orden alfabético es el del lenguaje: las mayúsculas preceden a las minúsculas,
de modo que \`Camisa\` va antes que \`camisa larga\`.
`,
    plantilla: {
      kotlin: `${CABECERA_KOTLIN}

{{solucion}}

fun main() {
    val catalogo = RepositorioFijo(listOf(
        Item("1", "Camisa", 3),
        Item("2", "camisa larga", 2),
        Item("3", "Abrigo", 1),
        Item("4", "Zapato", 0),
    ))
    val uc = BuscarItemsUseCase(catalogo)
    fun mostrar(l: List<Item>) =
        println(l.size.toString() + ":" + l.joinToString(",") { it.name })
    when (readLine()?.trim() ?: "") {
        "consulta_vacia" -> mostrar(uc(""))
        "coincidencia_parcial" -> mostrar(uc("cami"))
        "sin_coincidencias" -> mostrar(uc("bufanda"))
        "exacta_va_primero" -> mostrar(uc("camisa"))
        else -> println("caso desconocido")
    }
}`,
      swift: `${CABECERA_SWIFT}

{{solucion}}

let catalogo = RepositorioFijo(items: [
    Item(id: "1", name: "Camisa", stock: 3),
    Item(id: "2", name: "camisa larga", stock: 2),
    Item(id: "3", name: "Abrigo", stock: 1),
    Item(id: "4", name: "Zapato", stock: 0),
])
let req = BuscarItemsRequirement(repositorio: catalogo)

func mostrar(_ l: [Item]) {
    print("\\(l.count):" + l.map { $0.name }.joined(separator: ","))
}

let caso = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
switch caso {
case "consulta_vacia": mostrar(req.execute(consulta: ""))
case "coincidencia_parcial": mostrar(req.execute(consulta: "cami"))
case "sin_coincidencias": mostrar(req.execute(consulta: "bufanda"))
case "exacta_va_primero": mostrar(req.execute(consulta: "camisa"))
default: print("caso desconocido")
}`,
    },
    inicial: {
      kotlin: `// Escribe aquí BuscarItemsUseCase, según las tres reglas del enunciado.
// Item, ItemRepository y RepositorioFijo ya están declarados.
//
//   class BuscarItemsUseCase(private val repositorio: ItemRepository) {
//       operator fun invoke(consulta: String): List<Item>
//   }
`,
      swift: `// Escribe aquí BuscarItemsRequirement, según las tres reglas del enunciado.
// Item, ItemRepository y RepositorioFijo ya están declarados.
//
//   struct BuscarItemsRequirement {
//       let repositorio: ItemRepository
//       func execute(consulta: String) -> [Item]
//   }
`,
    },
    casos: [
      {
        entrada: 'consulta_vacia\n',
        salidaEsperada: '3:Abrigo,Camisa,camisa larga',
        oculto: false,
      },
      {
        entrada: 'coincidencia_parcial\n',
        salidaEsperada: '2:Camisa,camisa larga',
        oculto: false,
      },
      { entrada: 'sin_coincidencias\n', salidaEsperada: '0:', oculto: false },
      {
        entrada: 'exacta_va_primero\n',
        salidaEsperada: '2:Camisa,camisa larga',
        oculto: true,
      },
    ],
    soluciones: {
      kotlin: [
        // Estrategia A: comparador compuesto.
        `class BuscarItemsUseCase(private val repositorio: ItemRepository) {
    operator fun invoke(consulta: String): List<Item> {
        val q = consulta.trim().lowercase()
        val disponibles = repositorio.obtenerTodos().filter { it.stock > 0 }
        val coincidentes =
            if (q.isEmpty()) disponibles
            else disponibles.filter { it.name.lowercase().contains(q) }
        return coincidentes.sortedWith(
            compareBy({ if (it.name.lowercase() == q) 0 else 1 }, { it.name })
        )
    }
}`,
        // Estrategia B: dos grupos ordenados por separado y concatenados.
        `class BuscarItemsUseCase(private val repositorio: ItemRepository) {
    operator fun invoke(consulta: String): List<Item> {
        val q = consulta.trim().lowercase()
        val salida = mutableListOf<Item>()
        for (i in repositorio.obtenerTodos()) {
            if (i.stock <= 0) continue
            if (q.isEmpty() || i.name.lowercase().contains(q)) salida.add(i)
        }
        val exactos = salida.filter { it.name.lowercase() == q }.sortedBy { it.name }
        val resto = salida.filter { it.name.lowercase() != q }.sortedBy { it.name }
        return exactos + resto
    }
}`,
      ],
      swift: [
        // Estrategia A: comparación con clave compuesta.
        `struct BuscarItemsRequirement {
    let repositorio: ItemRepository

    func execute(consulta: String) -> [Item] {
        let q = consulta.trimmingCharacters(in: .whitespaces).lowercased()
        let disponibles = repositorio.obtenerTodos().filter { $0.stock > 0 }
        let coincidentes = q.isEmpty
            ? disponibles
            : disponibles.filter { $0.name.lowercased().contains(q) }
        return coincidentes.sorted { a, b in
            let ra = a.name.lowercased() == q ? 0 : 1
            let rb = b.name.lowercased() == q ? 0 : 1
            if ra != rb { return ra < rb }
            return a.name < b.name
        }
    }
}`,
        // Estrategia B: dos grupos ordenados por separado.
        `struct BuscarItemsRequirement {
    let repositorio: ItemRepository

    func execute(consulta: String) -> [Item] {
        let q = consulta.trimmingCharacters(in: .whitespaces).lowercased()
        var salida: [Item] = []
        for i in repositorio.obtenerTodos() where i.stock > 0 {
            if q.isEmpty || i.name.lowercased().contains(q) { salida.append(i) }
        }
        let exactos = salida.filter { $0.name.lowercased() == q }.sorted { $0.name < $1.name }
        let resto = salida.filter { $0.name.lowercased() != q }.sorted { $0.name < $1.name }
        return exactos + resto
    }
}`,
      ],
    },
  },
];
