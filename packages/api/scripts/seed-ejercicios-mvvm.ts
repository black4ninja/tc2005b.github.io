/**
 * Ejercicios de ARQUITECTURA MVVM para `tc2007b`, capa por capa.
 *
 * Uso:
 *   ./node_modules/.bin/tsx scripts/seed-ejercicios-mvvm.ts [slugColeccion] [--dry-run] [--publicar]
 *
 * Idempotente (upsert por slug). Nacen como BORRADOR salvo `--publicar`.
 *
 * ── Cómo se evalúan ────────────────────────────────────────────────────────
 * Modo `plantilla`: el alumno escribe SOLO la capa que se le pide, y se inserta
 * en un driver oculto. El driver lee de stdin el nombre del caso y ejerce esa
 * parte, imprimiendo el valor observado; la `salidaEsperada` del caso es el
 * valor correcto. Es decir, **un test = un caso**, y la aserción la hace el
 * juez comparando stdout — sin framework de aserciones y sin tocar el motor.
 *
 * Consecuencias buscadas: cada test corre en su propio proceso (una excepción
 * solo tumba SU caso, no la corrida), tiene su propio timeout, y el veredicto
 * dice "3 de 5" de forma literal.
 *
 * ── Nomenclatura ───────────────────────────────────────────────────────────
 * Fiel a CADA pista, que es como lo enseña el wiki: Android usa `UseCase`,
 * `Result`, `UiState`, DTO + mapper; iOS usa `Requirement`, `Protocol` y structs
 * `Codable` directos. No se le enseña a iOS lo que su wiki no cubre.
 *
 * ── Qué NO se puede ejercitar aquí ─────────────────────────────────────────
 * El juez compila Kotlin y Swift de consola: nada de Compose, SwiftUI, Hilt,
 * Retrofit ni Combine (`@Published`/`ObservableObject` no existen en Linux).
 * Por eso los ejercicios se paran en las fronteras ViewModel↔View y
 * Repository↔Api, y sustituyen ambos extremos por dobles.
 */
import Parse from 'parse/node';
import { renderMarkdown } from '@tc2005b/contenido-pipeline';
import { config } from '../src/config/index.js';
import '../src/models/index.js';

Parse.initialize(config.appId);
(Parse as any).serverURL = config.serverURL;
(Parse as any).masterKey = config.masterKey;

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const PUBLICAR = argv.includes('--publicar');
const SLUG_COL = argv.find((a) => !a.startsWith('--')) || 'tc2007b';

const NOMBRE_BLOQUE = 'Arquitectura MVVM';

/** Categorías del bloque, en orden. Una por capa. */
const CATEGORIAS = [
  'Modelo y capa de datos',
  'Capa de dominio',
  'Estado y ViewModel',
  'Composición',
];

/**
 * OJO al autorar: los `casos` son **compartidos por todos los lenguajes** del
 * ejercicio. Si un ejercicio es bilingüe, los dos drivers tienen que reconocer
 * los MISMOS nombres de caso y producir la MISMA salida esperada. Cuando lo que
 * se pide difiere entre pistas —como el modelo de dominio, que en Android lleva
 * DTO y en iOS es un `Codable` directo— hay que partirlo en dos ejercicios, uno
 * por lenguaje, en vez de forzar un caso común.
 */
interface Caso { entrada: string; salidaEsperada: string; oculto: boolean }

interface Ejercicio {
  slug: string;
  titulo: string;
  categoria: string;
  lenguajes: ('kotlin' | 'swift')[];
  enunciado: string;
  /**
   * Diagrama Mermaid que sitúa la capa en el conjunto. Se inserta antes de la
   * primera sección del enunciado. Es lo que más ayuda contra la confusión que
   * reportan los alumnos: ver DÓNDE encaja lo que están escribiendo.
   */
  diagrama?: string;
  /** Plantilla con el driver oculto; `{{solucion}}` marca dónde entra el alumno. */
  plantilla: { kotlin?: string; swift?: string };
  inicial: { kotlin?: string; swift?: string };
  casos: Caso[];
  soluciones: { kotlin?: string[]; swift?: string[] };
}

// ---------------------------------------------------------------------------
// 1. Modelo de dominio
// ---------------------------------------------------------------------------

const EJ_MODELO_KOTLIN: Ejercicio = {
  slug: 'mvvm-modelo-dominio-android',
  titulo: 'Modelo de dominio (Android)',
  categoria: 'Modelo y capa de datos',
  lenguajes: ['kotlin'],
  diagrama: `flowchart LR
    subgraph data["data/"]
        DTO[PokemonDto]
    end
    subgraph domain["domain/"]
        M["Pokemon<br/>lo que escribes"]
    end
    subgraph presentation["presentation/"]
        VM[HomeViewModel]
    end
    DTO -->|toDomain| M
    M --> VM
    style M fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px`,
  enunciado: `# Modelo de dominio (Android)

**Capa:** Dominio — archivo \`domain/model/Pokemon.kt\`

El modelo de dominio es lo que el resto de la app entiende. No sabe de dónde
vinieron los datos ni cómo se van a pintar: es solo la forma de la información.
Por eso vive en \`domain/\` y no en \`data/\`.

## Qué escribes

\`\`\`kotlin
data class Pokemon(
    val id: String,
    val name: String,
    val imageUrl: String,
    val weight: Int,
    val height: Int,
    val types: List<String>,
)
\`\`\`

Escríbela **exactamente así**, con ese orden de parámetros.

## Por qué \`data class\` y no \`class\`

No es decorativo: te da **igualdad por valor** y \`copy()\` gratis. Dos \`Pokemon\`
con los mismos campos son iguales, y eso es lo que después permite comparar
estados del ViewModel y detectar cambios sin escribir nada extra.

> El equivalente de iOS es otro ejercicio: allí el modelo llega directo del JSON
> con \`Codable\`, sin capa de DTO.
`,
  plantilla: {
    kotlin: `{{solucion}}

fun main() {
    val caso = readLine()?.trim() ?: ""
    val p = Pokemon("25", "Pikachu", "https://img/25.png", 60, 4, listOf("electric"))
    when (caso) {
        "campos" -> println("\${p.id}|\${p.name}|\${p.imageUrl}|\${p.weight}|\${p.height}|\${p.types.joinToString(",")}")
        "igualdad_por_valor" -> {
            val otro = Pokemon("25", "Pikachu", "https://img/25.png", 60, 4, listOf("electric"))
            println(p == otro)
        }
        "copia_cambiando_un_campo" -> {
            val evolucion = p.copy(name = "Raichu", weight = 300)
            println("\${evolucion.id}|\${evolucion.name}|\${evolucion.weight}|\${evolucion.types.joinToString(",")}")
        }
        "lista_de_tipos" -> {
            val dual = Pokemon("6", "Charizard", "u", 905, 17, listOf("fire", "flying"))
            println(dual.types.size.toString() + ":" + dual.types.joinToString("+"))
        }
        else -> println("caso desconocido: " + caso)
    }
}`,
  },
  inicial: {
    kotlin: `// Escribe aquí la data class Pokemon del enunciado.
// Campos, en orden: id, name, imageUrl, weight, height, types
`,
  },
  casos: [
    { entrada: 'campos\n', salidaEsperada: '25|Pikachu|https://img/25.png|60|4|electric', oculto: false },
    { entrada: 'igualdad_por_valor\n', salidaEsperada: 'true', oculto: false },
    { entrada: 'copia_cambiando_un_campo\n', salidaEsperada: '25|Raichu|300|electric', oculto: true },
    { entrada: 'lista_de_tipos\n', salidaEsperada: '2:fire+flying', oculto: true },
  ],
  soluciones: {
    kotlin: [
      `data class Pokemon(
    val id: String,
    val name: String,
    val imageUrl: String,
    val weight: Int,
    val height: Int,
    val types: List<String>,
)`,
      `data class Pokemon(
    val id: String,
    val name: String,
    val imageUrl: String,
    val weight: Int,
    val height: Int,
    val types: List<String>
) {
    // Igual de válida: un miembro extra no cambia el contrato de datos.
    val esUnicoTipo: Boolean get() = types.size == 1
}`,
    ],
  },
};

// ---------------------------------------------------------------------------
// 1b. Modelo de dominio — iOS (otro ejercicio: el modelo de la pista difiere)
// ---------------------------------------------------------------------------

const EJ_MODELO_SWIFT: Ejercicio = {
  slug: 'mvvm-modelo-dominio-ios',
  titulo: 'Modelo de dominio (iOS)',
  categoria: 'Modelo y capa de datos',
  lenguajes: ['swift'],
  diagrama: `flowchart LR
    API[JSON de la PokeAPI] -->|Codable| M["Pokedex y Pokemon<br/>lo que escribes"]
    M --> R[PokemonRepository]
    R --> VM[ContentViewModel]
    VM --> V[ContentView]
    style M fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px`,
  enunciado: `# Modelo de dominio (iOS)

**Capa:** Modelos — archivo \`Modelos/Pokemon.swift\`

En la pista de iOS el modelo es lo que **llega del JSON** y lo que **usa la
vista**: el mismo tipo. Por eso es \`Codable\`, y por eso sus nombres de propiedad
coinciden con las claves del JSON de la PokeAPI.

## Qué escribes

\`\`\`swift
struct Pokedex: Codable {
    var count: Int
    var results: [Pokemon]
}

struct Pokemon: Codable {
    var name: String
    var url: String
}
\`\`\`

Escríbelos **exactamente así**. \`Pokedex\` es la respuesta completa del listado y
\`Pokemon\` cada entrada.

## Por qué \`struct\` y no \`class\`

Un \`struct\` es de **valor**: al asignarlo se copia. Eso evita que dos partes de
la app compartan sin querer el mismo objeto y se pisen los cambios.

## Por qué \`Codable\`

Con \`Codable\`, Swift **genera solo** el código de decodificación a partir de los
nombres de las propiedades. Si el nombre no coincide con la clave del JSON, no
decodifica — de ahí que aquí se respete \`name\` y \`url\` tal cual.
`,
  plantilla: {
    swift: `import Foundation

{{solucion}}

let caso = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
switch caso {
case "campos":
    let p = Pokemon(name: "pikachu", url: "https://pokeapi.co/api/v2/pokemon/25/")
    print("\\(p.name)|\\(p.url)")
case "decodifica_pokemon":
    let json = "{\\"name\\":\\"bulbasaur\\",\\"url\\":\\"https://pokeapi.co/api/v2/pokemon/1/\\"}"
    let d = try! JSONDecoder().decode(Pokemon.self, from: json.data(using: .utf8)!)
    print("\\(d.name)|\\(d.url)")
case "decodifica_pokedex":
    let json = "{\\"count\\":2,\\"results\\":[{\\"name\\":\\"a\\",\\"url\\":\\"u1\\"},{\\"name\\":\\"b\\",\\"url\\":\\"u2\\"}]}"
    let d = try! JSONDecoder().decode(Pokedex.self, from: json.data(using: .utf8)!)
    print("\\(d.count):\\(d.results.map { $0.name }.joined(separator: "+"))")
case "es_tipo_valor":
    var a = Pokemon(name: "pikachu", url: "u")
    let b = a
    a.name = "raichu"
    print("\\(a.name)/\\(b.name)")
default:
    print("caso desconocido: \\(caso)")
}`,
  },
  inicial: {
    swift: `// Escribe aquí los dos structs del enunciado.
// Pokedex: count, results
// Pokemon: name, url
// Los dos deben ser Codable.
`,
  },
  casos: [
    { entrada: 'campos\n', salidaEsperada: 'pikachu|https://pokeapi.co/api/v2/pokemon/25/', oculto: false },
    { entrada: 'decodifica_pokemon\n', salidaEsperada: 'bulbasaur|https://pokeapi.co/api/v2/pokemon/1/', oculto: false },
    { entrada: 'decodifica_pokedex\n', salidaEsperada: '2:a+b', oculto: true },
    { entrada: 'es_tipo_valor\n', salidaEsperada: 'raichu/pikachu', oculto: true },
  ],
  soluciones: {
    swift: [
      `struct Pokedex: Codable {
    var count: Int
    var results: [Pokemon]
}

struct Pokemon: Codable {
    var name: String
    var url: String
}`,
      `struct Pokemon: Codable {
    var name: String
    var url: String

    // Igual de válida: Codable se sigue sintetizando con miembros calculados.
    var idDeLaUrl: String? {
        url.split(separator: "/").last.map(String.init)
    }
}

struct Pokedex: Codable {
    var count: Int
    var results: [Pokemon]
}`,
    ],
  },
};

// ---------------------------------------------------------------------------
// 2. Mapper DTO → dominio (solo Android: iOS no tiene esta capa en su wiki)
// ---------------------------------------------------------------------------

const EJ_MAPPER: Ejercicio = {
  slug: 'mvvm-mapper-dto-dominio',
  titulo: 'Mapper: del DTO al modelo de dominio',
  categoria: 'Modelo y capa de datos',
  lenguajes: ['kotlin'],
  diagrama: `flowchart LR
    API[PokemonApi] --> DTO["PokemonDto<br/>forma de la API"]
    DTO --> MAP["toDomain()<br/>lo que escribes"]
    MAP --> DOM["Pokemon<br/>forma del dominio"]
    DOM --> UC[GetPokemonListUseCase]
    style MAP fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px`,
  enunciado: `# Mapper: del DTO al modelo de dominio

**Capa:** Datos (\`data/mapper/PokemonMapper.kt\`)

> Solo Kotlin. La pista de iOS no separa DTO y modelo: allí los \`struct Codable\`
> viajan del JSON a la vista tal cual.

El **DTO** es la forma que tiene el JSON de la API. El **modelo de dominio** es la
forma que quiere tu app. Casi nunca coinciden, y el sitio donde se traducen es el
**mapper**. Si esa traducción se cuela en el ViewModel, la app entera queda atada
al formato de la API.

## Qué escribes

Archivo \`data/mapper/PokemonMapper.kt\`, una **extension function**:

\`\`\`kotlin
fun PokemonDto.toDomain(): Pokemon
\`\`\`

Con estas reglas de traducción:

| Del DTO | Al dominio | Regla |
|---|---|---|
| \`id\` (Int) | \`id\` (String) | convertir a texto |
| \`name\` | \`name\` | **primera letra en mayúscula** |
| \`sprites.frontDefault\` | \`imageUrl\` | tal cual; si es \`null\`, cadena vacía |
| \`weight\`, \`height\` | igual | tal cual |
| \`types\` | \`types\` | lista de los \`type.name\`, **en el mismo orden** |

## Tipos que ya te damos

\`\`\`kotlin
data class PokemonDto(
    val id: Int,
    val name: String,
    val sprites: SpritesDto,
    val weight: Int,
    val height: Int,
    val types: List<TypeDto>,
)
data class SpritesDto(val frontDefault: String?)
data class TypeDto(val type: TypeInfoDto)
data class TypeInfoDto(val name: String)

data class Pokemon(
    val id: String, val name: String, val imageUrl: String,
    val weight: Int, val height: Int, val types: List<String>,
)
\`\`\`
`,
  plantilla: {
    kotlin: `data class PokemonDto(
    val id: Int,
    val name: String,
    val sprites: SpritesDto,
    val weight: Int,
    val height: Int,
    val types: List<TypeDto>,
)
data class SpritesDto(val frontDefault: String?)
data class TypeDto(val type: TypeInfoDto)
data class TypeInfoDto(val name: String)

data class Pokemon(
    val id: String, val name: String, val imageUrl: String,
    val weight: Int, val height: Int, val types: List<String>,
)

{{solucion}}

fun main() {
    val caso = readLine()?.trim() ?: ""
    val pikachu = PokemonDto(25, "pikachu", SpritesDto("https://img/25.png"), 60, 4, listOf(TypeDto(TypeInfoDto("electric"))))
    when (caso) {
        "traduce_todo" -> {
            val d = pikachu.toDomain()
            println("\${d.id}|\${d.name}|\${d.imageUrl}|\${d.weight}|\${d.height}|\${d.types.joinToString(",")}")
        }
        "capitaliza_el_nombre" -> println(pikachu.toDomain().name)
        "sprite_nulo_es_cadena_vacia" -> {
            val sinSprite = pikachu.copy(sprites = SpritesDto(null))
            println("[" + sinSprite.toDomain().imageUrl + "]")
        }
        "conserva_el_orden_de_tipos" -> {
            val charizard = PokemonDto(6, "charizard", SpritesDto("u"), 905, 17,
                listOf(TypeDto(TypeInfoDto("fire")), TypeDto(TypeInfoDto("flying"))))
            println(charizard.toDomain().types.joinToString(","))
        }
        "id_a_texto" -> println(pikachu.toDomain().id + "/" + pikachu.toDomain().id::class.simpleName)
        else -> println("caso desconocido: " + caso)
    }
}`,
  },
  inicial: {
    kotlin: `// Escribe aquí la extension function del enunciado.
fun PokemonDto.toDomain(): Pokemon {
    TODO("traduce el DTO al modelo de dominio")
}
`,
  },
  casos: [
    { entrada: 'traduce_todo\n', salidaEsperada: '25|Pikachu|https://img/25.png|60|4|electric', oculto: false },
    { entrada: 'capitaliza_el_nombre\n', salidaEsperada: 'Pikachu', oculto: false },
    { entrada: 'sprite_nulo_es_cadena_vacia\n', salidaEsperada: '[]', oculto: true },
    { entrada: 'conserva_el_orden_de_tipos\n', salidaEsperada: 'fire,flying', oculto: true },
    { entrada: 'id_a_texto\n', salidaEsperada: '25/String', oculto: true },
  ],
  soluciones: {
    kotlin: [
      `fun PokemonDto.toDomain(): Pokemon = Pokemon(
    id = id.toString(),
    name = name.replaceFirstChar { it.uppercase() },
    imageUrl = sprites.frontDefault ?: "",
    weight = weight,
    height = height,
    types = types.map { it.type.name },
)`,
      `fun PokemonDto.toDomain(): Pokemon {
    val nombre = if (name.isEmpty()) name else name.substring(0, 1).uppercase() + name.substring(1)
    val tipos = mutableListOf<String>()
    for (t in types) tipos.add(t.type.name)
    return Pokemon(id.toString(), nombre, sprites.frontDefault ?: "", weight, height, tipos)
}`,
    ],
  },
};

// ---------------------------------------------------------------------------
// 3. Contrato + doble de prueba (DIP) — el hueco más grande del wiki
// ---------------------------------------------------------------------------

const EJ_CONTRATO: Ejercicio = {
  slug: 'mvvm-contrato-repositorio',
  titulo: 'Contrato del repositorio y doble de prueba',
  categoria: 'Capa de dominio',
  lenguajes: ['kotlin', 'swift'],
  diagrama: `classDiagram
    class PokemonRepository {
        <<interface>>
        +getPokemonList()
        +getPokemonById(id)
    }
    class FakePokemonRepository {
        +getPokemonList()
        +getPokemonById(id)
    }
    class PokemonRepositoryImpl {
        +getPokemonList()
        +getPokemonById(id)
    }
    class GetPokemonListUseCase
    GetPokemonListUseCase ..> PokemonRepository : depende del CONTRATO
    PokemonRepository <|.. FakePokemonRepository : para pruebas
    PokemonRepository <|.. PokemonRepositoryImpl : para produccion`,
  enunciado: `# Contrato del repositorio y doble de prueba

**Capa:** Dominio (Android: \`domain/repository/\` · iOS: group \`data\`)

Esta es **la** razón de ser de MVVM. El ViewModel no depende de "el repositorio
que llama a la API", sino de un **contrato**. Cualquier cosa que cumpla ese
contrato le sirve: la de red, una en memoria, o una falsa para probar.

Eso es el **Principio de Inversión de Dependencias**: el dominio define lo que
necesita, y la capa de datos se adapta. El wiki lo menciona pero no lo
implementa; aquí lo haces tú.

## Qué escribes

### Kotlin

Archivo \`domain/repository/PokemonRepository.kt\`:

\`\`\`kotlin
interface PokemonRepository {
    fun getPokemonList(): List<Pokemon>
    fun getPokemonById(id: String): Pokemon?
}
\`\`\`

Y un doble en \`FakePokemonRepository.kt\`:

\`\`\`kotlin
class FakePokemonRepository(private val datos: List<Pokemon>) : PokemonRepository
\`\`\`

- \`getPokemonList()\` devuelve \`datos\`.
- \`getPokemonById(id)\` devuelve el que coincida, o \`null\` si no está.

### Swift

Protocolo \`PokemonAPIProtocol\` y su doble \`MockPokemonRepository\`
(los nombres son los del wiki de iOS):

\`\`\`swift
protocol PokemonAPIProtocol {
    func getPokemonList() -> [Pokemon]
    func getPokemon(id: String) -> Pokemon?
}

class MockPokemonRepository: PokemonAPIProtocol {
    // ...
}
\`\`\`

- El \`init\` recibe los datos: \`init(datos: [Pokemon])\`.
- \`getPokemonList()\` devuelve esos datos.
- \`getPokemon(id:)\` devuelve el que coincida, o \`nil\` si no está.

## Lo que se comprueba

El driver **solo conoce el contrato**, nunca tu clase concreta. Si tu doble
cumple la interfaz, funciona.
`,
  plantilla: {
    kotlin: `data class Pokemon(val id: String, val name: String)

{{solucion}}

fun main() {
    val caso = readLine()?.trim() ?: ""
    val datos = listOf(Pokemon("25", "Pikachu"), Pokemon("6", "Charizard"))
    // El driver depende del CONTRATO, no de la clase concreta.
    val repo: PokemonRepository = FakePokemonRepository(datos)
    when (caso) {
        "lista_completa" -> println(repo.getPokemonList().joinToString(",") { it.name })
        "busca_existente" -> println(repo.getPokemonById("6")?.name ?: "null")
        "busca_inexistente" -> println(repo.getPokemonById("999")?.name ?: "null")
        "repositorio_vacio" -> {
            val vacio: PokemonRepository = FakePokemonRepository(emptyList())
            println(vacio.getPokemonList().size.toString() + "/" + (vacio.getPokemonById("25")?.name ?: "null"))
        }
        else -> println("caso desconocido: " + caso)
    }
}`,
    swift: `import Foundation

struct Pokemon { var id: String; var name: String }

{{solucion}}

let caso = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
let datos = [Pokemon(id: "25", name: "Pikachu"), Pokemon(id: "6", name: "Charizard")]
// El driver depende del PROTOCOLO, no de la clase concreta.
let repo: PokemonAPIProtocol = MockPokemonRepository(datos: datos)
switch caso {
case "lista_completa":
    print(repo.getPokemonList().map { $0.name }.joined(separator: ","))
case "busca_existente":
    print(repo.getPokemon(id: "6")?.name ?? "null")
case "busca_inexistente":
    print(repo.getPokemon(id: "999")?.name ?? "null")
case "repositorio_vacio":
    let vacio: PokemonAPIProtocol = MockPokemonRepository(datos: [])
    print("\\(vacio.getPokemonList().count)/\\(vacio.getPokemon(id: "25")?.name ?? "null")")
default:
    print("caso desconocido: \\(caso)")
}`,
  },
  inicial: {
    kotlin: `// 1) El contrato que define el dominio
interface PokemonRepository {
    // TODO: declara getPokemonList() y getPokemonById(id)
}

// 2) El doble que lo cumple
class FakePokemonRepository(private val datos: List<Pokemon>) : PokemonRepository {
    // TODO: implementa el contrato
}
`,
    swift: `// 1) El contrato que define el dominio
protocol PokemonAPIProtocol {
    // TODO: declara getPokemonList() y getPokemon(id:)
}

// 2) El doble que lo cumple
class MockPokemonRepository: PokemonAPIProtocol {
    private let datos: [Pokemon]
    init(datos: [Pokemon]) { self.datos = datos }
    // TODO: implementa el contrato
}
`,
  },
  casos: [
    { entrada: 'lista_completa\n', salidaEsperada: 'Pikachu,Charizard', oculto: false },
    { entrada: 'busca_existente\n', salidaEsperada: 'Charizard', oculto: false },
    { entrada: 'busca_inexistente\n', salidaEsperada: 'null', oculto: true },
    { entrada: 'repositorio_vacio\n', salidaEsperada: '0/null', oculto: true },
  ],
  soluciones: {
    kotlin: [
      `interface PokemonRepository {
    fun getPokemonList(): List<Pokemon>
    fun getPokemonById(id: String): Pokemon?
}

class FakePokemonRepository(private val datos: List<Pokemon>) : PokemonRepository {
    override fun getPokemonList(): List<Pokemon> = datos
    override fun getPokemonById(id: String): Pokemon? = datos.find { it.id == id }
}`,
      `interface PokemonRepository {
    fun getPokemonList(): List<Pokemon>
    fun getPokemonById(id: String): Pokemon?
}

class FakePokemonRepository(private val datos: List<Pokemon>) : PokemonRepository {
    override fun getPokemonList(): List<Pokemon> {
        return datos
    }
    override fun getPokemonById(id: String): Pokemon? {
        for (p in datos) {
            if (p.id == id) return p
        }
        return null
    }
}`,
    ],
    swift: [
      `protocol PokemonAPIProtocol {
    func getPokemonList() -> [Pokemon]
    func getPokemon(id: String) -> Pokemon?
}

class MockPokemonRepository: PokemonAPIProtocol {
    private let datos: [Pokemon]
    init(datos: [Pokemon]) { self.datos = datos }

    func getPokemonList() -> [Pokemon] {
        return datos
    }
    func getPokemon(id: String) -> Pokemon? {
        return datos.first { $0.id == id }
    }
}`,
      `protocol PokemonAPIProtocol {
    func getPokemonList() -> [Pokemon]
    func getPokemon(id: String) -> Pokemon?
}

class MockPokemonRepository: PokemonAPIProtocol {
    private let datos: [Pokemon]
    init(datos: [Pokemon]) { self.datos = datos }

    func getPokemonList() -> [Pokemon] {
        return datos
    }
    func getPokemon(id: String) -> Pokemon? {
        for p in datos where p.id == id { return p }
        return nil
    }
}`,
    ],
  },
};

// ---------------------------------------------------------------------------
// 4. Parseo del id desde la URL
// ---------------------------------------------------------------------------

const EJ_ID_URL: Ejercicio = {
  slug: 'mvvm-id-desde-url',
  titulo: 'Extraer el id desde la URL',
  categoria: 'Modelo y capa de datos',
  lenguajes: ['kotlin', 'swift'],
  diagrama: `flowchart LR
    L["listado: name + url"] --> F["idDesdeUrl()<br/>lo que escribes"]
    F --> ID["id<br/>para pedir el detalle"]
    style F fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px`,
  enunciado: `# Extraer el id desde la URL

**Capa:** Datos

El listado de la PokeAPI no trae el id: trae la URL del detalle.

\`\`\`
https://pokeapi.co/api/v2/pokemon/25/
\`\`\`

Sacar el \`25\` de ahí es tarea de la **capa de datos**. Si esa lógica se cuela en
la vista o en el ViewModel, un cambio de formato de la API te obliga a tocarlos.

## Qué escribes

**Kotlin** — \`fun idDesdeUrl(url: String): String?\`
**Swift** — \`func idDesdeUrl(_ url: String) -> String?\`

Devuelve el último segmento numérico de la ruta, o \`null\`/\`nil\` si la URL no
termina en un número.

| Entrada | Resultado |
|---|---|
| \`.../pokemon/25/\` | \`"25"\` |
| \`.../pokemon/151\` (sin barra final) | \`"151"\` |
| \`.../pokemon/1025/\` | \`"1025"\` |
| \`no-es-una-url\` | \`null\` / \`nil\` |

> El wiki resuelve esto dos veces, de forma distinta en cada pista y sin cubrir
> la barra final ausente. Aquí lo haces bien una sola vez.
`,
  plantilla: {
    kotlin: `{{solucion}}

fun main() {
    val caso = readLine()?.trim() ?: ""
    val url = when (caso) {
        "con_barra_final" -> "https://pokeapi.co/api/v2/pokemon/25/"
        "sin_barra_final" -> "https://pokeapi.co/api/v2/pokemon/151"
        "id_de_cuatro_cifras" -> "https://pokeapi.co/api/v2/pokemon/1025/"
        "url_invalida" -> "no-es-una-url"
        else -> null
    }
    if (url == null) println("caso desconocido: " + caso)
    else println(idDesdeUrl(url) ?: "null")
}`,
    swift: `import Foundation

{{solucion}}

let caso = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
var url: String? = nil
switch caso {
case "con_barra_final": url = "https://pokeapi.co/api/v2/pokemon/25/"
case "sin_barra_final": url = "https://pokeapi.co/api/v2/pokemon/151"
case "id_de_cuatro_cifras": url = "https://pokeapi.co/api/v2/pokemon/1025/"
case "url_invalida": url = "no-es-una-url"
default: url = nil
}
if let u = url { print(idDesdeUrl(u) ?? "null") } else { print("caso desconocido: \\(caso)") }`,
  },
  inicial: {
    kotlin: `fun idDesdeUrl(url: String): String? {
    // TODO: devuelve el último segmento numérico, o null
    return null
}
`,
    swift: `func idDesdeUrl(_ url: String) -> String? {
    // TODO: devuelve el último segmento numérico, o nil
    return nil
}
`,
  },
  casos: [
    { entrada: 'con_barra_final\n', salidaEsperada: '25', oculto: false },
    { entrada: 'sin_barra_final\n', salidaEsperada: '151', oculto: false },
    { entrada: 'id_de_cuatro_cifras\n', salidaEsperada: '1025', oculto: true },
    { entrada: 'url_invalida\n', salidaEsperada: 'null', oculto: true },
  ],
  soluciones: {
    kotlin: [
      `fun idDesdeUrl(url: String): String? =
    url.trimEnd('/').substringAfterLast('/').takeIf { it.isNotEmpty() && it.all { c -> c.isDigit() } }`,
      `fun idDesdeUrl(url: String): String? {
    val partes = url.split("/").filter { it.isNotEmpty() }
    val ultima = partes.lastOrNull() ?: return null
    for (c in ultima) if (!c.isDigit()) return null
    return ultima
}`,
    ],
    swift: [
      `func idDesdeUrl(_ url: String) -> String? {
    let partes = url.split(separator: "/").map(String.init)
    guard let ultima = partes.last, !ultima.isEmpty,
          ultima.allSatisfy({ $0.isNumber }) else { return nil }
    return ultima
}`,
      `func idDesdeUrl(_ url: String) -> String? {
    var limpia = url
    while limpia.hasSuffix("/") { limpia.removeLast() }
    guard let corte = limpia.lastIndex(of: "/") else { return nil }
    let ultima = String(limpia[limpia.index(after: corte)...])
    if ultima.isEmpty { return nil }
    for c in ultima where !c.isNumber { return nil }
    return ultima
}`,
    ],
  },
};

// ---------------------------------------------------------------------------
// 5. Caso de uso / Requirement
// ---------------------------------------------------------------------------

const EJ_CASO_USO: Ejercicio = {
  slug: 'mvvm-caso-de-uso',
  titulo: 'Caso de uso (Android) · Requirement (iOS)',
  categoria: 'Capa de dominio',
  lenguajes: ['kotlin', 'swift'],
  diagrama: `sequenceDiagram
    participant VM as HomeViewModel
    participant UC as GetPokemonListUseCase
    participant R as PokemonRepository
    VM->>UC: invoke()
    Note over UC: recibe el repositorio,<br/>no lo construye
    UC->>R: getPokemonList()
    R-->>UC: List~Pokemon~
    UC-->>VM: List~Pokemon~`,
  enunciado: `# Caso de uso (Android) · Requirement (iOS)

**Capa:** Dominio (Android: \`domain/usecase/\` · iOS: group \`domain\`)

Un caso de uso representa **una acción** de la app. No sabe de dónde vienen los
datos: recibe el repositorio **ya construido**, por el constructor.

> Las dos pistas nombran esto distinto. Android lo llama \`UseCase\`; iOS lo llama
> **\`Requirement\`**, y el wiki lo dice explícitamente: *"podemos traducir [Caso de
> Uso e Historia de Usuario] en un Requerimiento o Requirement"*.

## Qué escribes

### Kotlin — \`domain/usecase/GetPokemonListUseCase.kt\`

\`\`\`kotlin
class GetPokemonListUseCase(private val repository: PokemonRepository) {
    operator fun invoke(): List<Pokemon>
}
\`\`\`

Con \`operator fun invoke()\` el caso de uso se llama como una función:
\`getPokemonListUseCase()\`, sin \`.execute()\`.

### Swift — \`domain/PokemonListRequirement.swift\`

\`\`\`swift
protocol PokemonListRequirementProtocol {
    func getPokemonList() -> [Pokemon]
}

class PokemonListRequirement: PokemonListRequirementProtocol {
    init(dataRepository: PokemonAPIProtocol)
}
\`\`\`

## La regla que se comprueba

**El caso de uso NO construye el repositorio.** Lo recibe. El driver le pasa un
repositorio espía que cuenta llamadas: si construyeras uno propio dentro, el
espía no registraría nada y el caso fallaría.
`,
  plantilla: {
    kotlin: `data class Pokemon(val id: String, val name: String)

interface PokemonRepository {
    fun getPokemonList(): List<Pokemon>
}

/** Repositorio ESPÍA: cuenta cuántas veces se le pidió la lista. */
class RepositorioEspia(private val datos: List<Pokemon>) : PokemonRepository {
    var llamadas = 0
    override fun getPokemonList(): List<Pokemon> {
        llamadas++
        return datos
    }
}

{{solucion}}

fun main() {
    val caso = readLine()?.trim() ?: ""
    val datos = listOf(Pokemon("25", "Pikachu"), Pokemon("6", "Charizard"))
    val espia = RepositorioEspia(datos)
    val useCase = GetPokemonListUseCase(espia)
    when (caso) {
        "devuelve_la_lista" -> println(useCase().joinToString(",") { it.name })
        "usa_el_repositorio_inyectado" -> {
            useCase()
            println(espia.llamadas.toString())
        }
        "repositorio_vacio" -> {
            val vacio = RepositorioEspia(emptyList())
            println(GetPokemonListUseCase(vacio)().size.toString())
        }
        else -> println("caso desconocido: " + caso)
    }
}`,
    swift: `import Foundation

struct Pokemon { var id: String; var name: String }

protocol PokemonAPIProtocol {
    func getPokemonList() -> [Pokemon]
}

/** Repositorio ESPÍA: cuenta cuántas veces se le pidió la lista. */
class RepositorioEspia: PokemonAPIProtocol {
    var llamadas = 0
    private let datos: [Pokemon]
    init(datos: [Pokemon]) { self.datos = datos }
    func getPokemonList() -> [Pokemon] {
        llamadas += 1
        return datos
    }
}

{{solucion}}

let caso = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
let datos = [Pokemon(id: "25", name: "Pikachu"), Pokemon(id: "6", name: "Charizard")]
let espia = RepositorioEspia(datos: datos)
let requirement = PokemonListRequirement(dataRepository: espia)
switch caso {
case "devuelve_la_lista":
    print(requirement.getPokemonList().map { $0.name }.joined(separator: ","))
case "usa_el_repositorio_inyectado":
    _ = requirement.getPokemonList()
    print("\\(espia.llamadas)")
case "repositorio_vacio":
    let vacio = RepositorioEspia(datos: [])
    print("\\(PokemonListRequirement(dataRepository: vacio).getPokemonList().count)")
default:
    print("caso desconocido: \\(caso)")
}`,
  },
  inicial: {
    kotlin: `class GetPokemonListUseCase(private val repository: PokemonRepository) {
    // TODO: operator fun invoke() que devuelve la lista del repositorio
}
`,
    swift: `protocol PokemonListRequirementProtocol {
    func getPokemonList() -> [Pokemon]
}

class PokemonListRequirement: PokemonListRequirementProtocol {
    // TODO: guarda el repositorio inyectado e implementa getPokemonList()
    init(dataRepository: PokemonAPIProtocol) {
    }
}
`,
  },
  casos: [
    { entrada: 'devuelve_la_lista\n', salidaEsperada: 'Pikachu,Charizard', oculto: false },
    { entrada: 'usa_el_repositorio_inyectado\n', salidaEsperada: '1', oculto: false },
    { entrada: 'repositorio_vacio\n', salidaEsperada: '0', oculto: true },
  ],
  soluciones: {
    kotlin: [
      `class GetPokemonListUseCase(private val repository: PokemonRepository) {
    operator fun invoke(): List<Pokemon> = repository.getPokemonList()
}`,
      `class GetPokemonListUseCase(private val repository: PokemonRepository) {
    operator fun invoke(): List<Pokemon> {
        val lista = repository.getPokemonList()
        return lista
    }
}`,
    ],
    swift: [
      `protocol PokemonListRequirementProtocol {
    func getPokemonList() -> [Pokemon]
}

class PokemonListRequirement: PokemonListRequirementProtocol {
    private let dataRepository: PokemonAPIProtocol
    init(dataRepository: PokemonAPIProtocol) { self.dataRepository = dataRepository }
    func getPokemonList() -> [Pokemon] { dataRepository.getPokemonList() }
}`,
      `protocol PokemonListRequirementProtocol {
    func getPokemonList() -> [Pokemon]
}

class PokemonListRequirement: PokemonListRequirementProtocol {
    private var repo: PokemonAPIProtocol
    init(dataRepository: PokemonAPIProtocol) { repo = dataRepository }
    func getPokemonList() -> [Pokemon] {
        let lista = repo.getPokemonList()
        return lista
    }
}`,
    ],
  },
};

// ---------------------------------------------------------------------------
// 6. Result (solo Android: iOS no tiene este tipo en su wiki)
// ---------------------------------------------------------------------------

const EJ_RESULT: Ejercicio = {
  slug: 'mvvm-result-android',
  titulo: 'Result: los tres estados de una carga',
  categoria: 'Estado y ViewModel',
  lenguajes: ['kotlin'],
  diagrama: `stateDiagram-v2
    [*] --> Loading: se pide la carga
    Loading --> Success: llegaron datos
    Loading --> Error: fallo
    Success --> Loading: recargar
    Error --> Loading: reintentar`,
  enunciado: `# Result: los tres estados de una carga

**Capa:** Dominio — \`domain/common/Result.kt\`

> Solo Kotlin. La pista de iOS no usa este tipo: allí los errores se manejan
> devolviendo opcionales.

Pedir datos no es "hay datos o no hay". Son **tres** situaciones distintas, y la
vista necesita distinguirlas: *cargando*, *listo*, *falló*.

## Qué escribes

\`\`\`kotlin
sealed class Result<out T> {
    object Loading : Result<Nothing>()
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val exception: Throwable) : Result<Nothing>()
}
\`\`\`

Escríbelo **exactamente así**.

## Por qué \`sealed\` y por qué \`object\` en Loading

- **\`sealed\`**: el compilador conoce todas las variantes, así que un \`when\` que
  las cubra todas **no necesita \`else\`**. Si mañana añades una cuarta, el
  compilador te señala cada \`when\` que hay que actualizar. Con un \`else\` genérico
  ese aviso se pierde.
- **\`object\`**: \`Loading\` no lleva datos, así que no tiene sentido crear
  instancias. Es un **singleton**: \`Result.Loading === Result.Loading\`.
`,
  plantilla: {
    kotlin: `{{solucion}}

fun describe(r: Result<Int>): String = when (r) {
    is Result.Loading -> "Loading"
    is Result.Success -> "Success:" + r.data
    is Result.Error -> "Error:" + r.exception.message
}

fun main() {
    when (readLine()?.trim() ?: "") {
        "loading" -> println(describe(Result.Loading))
        "success" -> println(describe(Result.Success(42)))
        "error" -> println(describe(Result.Error(RuntimeException("boom"))))
        "loading_es_singleton" -> println((Result.Loading === Result.Loading).toString())
        "success_igualdad_por_valor" -> println((Result.Success(7) == Result.Success(7)).toString())
        else -> println("caso desconocido")
    }
}`,
  },
  inicial: {
    kotlin: `// Escribe aquí la sealed class Result del enunciado,
// con sus tres variantes: Loading, Success<T> y Error.
`,
  },
  casos: [
    { entrada: 'loading\n', salidaEsperada: 'Loading', oculto: false },
    { entrada: 'success\n', salidaEsperada: 'Success:42', oculto: false },
    { entrada: 'error\n', salidaEsperada: 'Error:boom', oculto: false },
    { entrada: 'loading_es_singleton\n', salidaEsperada: 'true', oculto: true },
    { entrada: 'success_igualdad_por_valor\n', salidaEsperada: 'true', oculto: true },
  ],
  soluciones: {
    kotlin: [
      `sealed class Result<out T> {
    object Loading : Result<Nothing>()
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val exception: Throwable) : Result<Nothing>()
}`,
      `sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val exception: Throwable) : Result<Nothing>()
    object Loading : Result<Nothing>()
}`,
    ],
  },
};

// ---------------------------------------------------------------------------
// 7. UiState + reducer puro (solo Android)
// ---------------------------------------------------------------------------

const EJ_REDUCER: Ejercicio = {
  slug: 'mvvm-uistate-reducer-android',
  titulo: 'UiState y el reducer',
  categoria: 'Estado y ViewModel',
  lenguajes: ['kotlin'],
  diagrama: `flowchart LR
    S1["HomeUiState<br/>actual"] --> R["reduce()<br/>lo que escribes"]
    RES["Result<br/>Loading / Success / Error"] --> R
    R --> S2["HomeUiState<br/>siguiente"]
    S2 --> V[HomeScreen]
    style R fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px`,
  enunciado: `# UiState y el reducer

**Capa:** Presentación — \`presentation/screens/home/HomeUiState.kt\`

> Solo Kotlin. La pista de iOS no usa \`UiState\`: expone propiedades sueltas.

Un \`UiState\` es **todo lo que la pantalla necesita para pintarse**, en un único
objeto inmutable. La pantalla no pregunta nada: recibe un \`HomeUiState\` y dibuja.

Y el **reducer** es la función que, dado el estado actual y lo que acaba de
pasar, calcula el estado siguiente. Aislarlo así —fuera del ViewModel— es lo que
lo vuelve comprobable sin Android de por medio.

## Qué escribes

\`\`\`kotlin
data class HomeUiState(
    val pokemonList: List<Pokemon> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
)

fun reduce(state: HomeUiState, result: Result<List<Pokemon>>): HomeUiState
\`\`\`

Reglas del reducer, que son las del wiki:

| Llega | Estado resultante |
|---|---|
| \`Loading\` | \`isLoading = true\` (lo demás igual) |
| \`Success\` | \`pokemonList = data\`, \`isLoading = false\`, \`error = null\` |
| \`Error\` | \`error = mensaje\`, \`isLoading = false\`, **la lista NO se toca** |

Ese último detalle importa: si falla una recarga, el alumno debe seguir viendo
lo que ya tenía en pantalla, no una lista vacía.
`,
  plantilla: {
    kotlin: `data class Pokemon(val id: String, val name: String)

sealed class Result<out T> {
    object Loading : Result<Nothing>()
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val exception: Throwable) : Result<Nothing>()
}

{{solucion}}

fun pinta(s: HomeUiState): String =
    s.pokemonList.joinToString(",") { it.name } + "|" + s.isLoading + "|" + (s.error ?: "null")

fun main() {
    val lista = listOf(Pokemon("25", "Pikachu"))
    val inicial = HomeUiState()
    val cargado = HomeUiState(pokemonList = lista, isLoading = false, error = null)
    when (readLine()?.trim() ?: "") {
        "estado_inicial" -> println(pinta(inicial))
        "loading" -> println(pinta(reduce(inicial, Result.Loading)))
        "success" -> println(pinta(reduce(reduce(inicial, Result.Loading), Result.Success(lista))))
        "error_conserva_la_lista" -> println(pinta(reduce(cargado, Result.Error(RuntimeException("sin red")))))
        "success_limpia_el_error" -> {
            val conError = HomeUiState(pokemonList = emptyList(), isLoading = false, error = "viejo")
            println(pinta(reduce(conError, Result.Success(lista))))
        }
        else -> println("caso desconocido")
    }
}`,
  },
  inicial: {
    kotlin: `// 1) El estado de la pantalla
data class HomeUiState(
    // TODO: pokemonList, isLoading, error — con valores por defecto
)

// 2) La transición
fun reduce(state: HomeUiState, result: Result<List<Pokemon>>): HomeUiState {
    TODO("aplica las reglas de la tabla")
}
`,
  },
  casos: [
    { entrada: 'estado_inicial\n', salidaEsperada: '|false|null', oculto: false },
    { entrada: 'loading\n', salidaEsperada: '|true|null', oculto: false },
    { entrada: 'success\n', salidaEsperada: 'Pikachu|false|null', oculto: false },
    { entrada: 'error_conserva_la_lista\n', salidaEsperada: 'Pikachu|false|sin red', oculto: true },
    { entrada: 'success_limpia_el_error\n', salidaEsperada: 'Pikachu|false|null', oculto: true },
  ],
  soluciones: {
    kotlin: [
      `data class HomeUiState(
    val pokemonList: List<Pokemon> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
)

fun reduce(state: HomeUiState, result: Result<List<Pokemon>>): HomeUiState = when (result) {
    is Result.Loading -> state.copy(isLoading = true)
    is Result.Success -> state.copy(pokemonList = result.data, isLoading = false, error = null)
    is Result.Error -> state.copy(error = result.exception.message, isLoading = false)
}`,
      `data class HomeUiState(
    val pokemonList: List<Pokemon> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
)

fun reduce(state: HomeUiState, result: Result<List<Pokemon>>): HomeUiState {
    if (result is Result.Loading) return state.copy(isLoading = true)
    if (result is Result.Success) {
        return HomeUiState(pokemonList = result.data, isLoading = false, error = null)
    }
    val fallo = result as Result.Error
    return state.copy(error = fallo.exception.message, isLoading = false)
}`,
    ],
  },
};

// ---------------------------------------------------------------------------
// 8. ViewModel — Android
// ---------------------------------------------------------------------------

const EJ_VM_ANDROID: Ejercicio = {
  slug: 'mvvm-viewmodel-android',
  titulo: 'ViewModel (Android)',
  categoria: 'Estado y ViewModel',
  lenguajes: ['kotlin'],
  diagrama: `sequenceDiagram
    participant V as HomeScreen
    participant VM as HomeViewModel
    participant UC as GetPokemonListUseCase
    V->>VM: cargar()
    VM->>VM: reduce(estado, Loading)
    VM-->>V: uiState (isLoading = true)
    VM->>UC: invoke()
    UC-->>VM: List~Pokemon~
    VM->>VM: reduce(estado, Success)
    VM-->>V: uiState (lista lista)`,
  enunciado: `# ViewModel (Android)

**Capa:** Presentación — \`presentation/screens/home/HomeViewModel.kt\`

El ViewModel es el que **orquesta**: pide al caso de uso, aplica el reducer y
**publica** el estado. No conoce la vista, y la vista no conoce nada más que él.

> En la app real el estado se publica con \`MutableStateFlow\`/\`StateFlow\`. Aquí no
> hay corrutinas disponibles, así que el harness usa un **callback**
> \`onEstado\` que hace exactamente el mismo papel: avisar de cada estado nuevo.
> La estructura que practicas —privado mutable dentro, público de solo lectura
> fuera— es idéntica.

## Qué escribes

\`\`\`kotlin
class HomeViewModel(private val getPokemonListUseCase: GetPokemonListUseCase) {
    var uiState: HomeUiState = HomeUiState()
        private set

    var onEstado: ((HomeUiState) -> Unit)? = null

    fun cargar()
}
\`\`\`

\`cargar()\` debe, **en este orden**:

1. Aplicar \`reduce(uiState, Result.Loading)\`, guardarlo y **notificar**.
2. Pedir la lista al caso de uso.
3. Aplicar \`reduce(uiState, Result.Success(lista))\`, guardarlo y **notificar**.

## La regla clave

\`uiState\` es **de solo lectura desde fuera** (\`private set\`). Si la vista pudiera
escribirlo, dejaría de haber una única fuente de verdad y el estado cambiaría
por detrás del ViewModel.
`,
  plantilla: {
    kotlin: `data class Pokemon(val id: String, val name: String)

sealed class Result<out T> {
    object Loading : Result<Nothing>()
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val exception: Throwable) : Result<Nothing>()
}

data class HomeUiState(
    val pokemonList: List<Pokemon> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
)

fun reduce(state: HomeUiState, result: Result<List<Pokemon>>): HomeUiState = when (result) {
    is Result.Loading -> state.copy(isLoading = true)
    is Result.Success -> state.copy(pokemonList = result.data, isLoading = false, error = null)
    is Result.Error -> state.copy(error = result.exception.message, isLoading = false)
}

interface PokemonRepository { fun getPokemonList(): List<Pokemon> }
class RepoFijo(private val datos: List<Pokemon>) : PokemonRepository {
    override fun getPokemonList(): List<Pokemon> = datos
}
class GetPokemonListUseCase(private val repository: PokemonRepository) {
    operator fun invoke(): List<Pokemon> = repository.getPokemonList()
}

{{solucion}}

fun pinta(s: HomeUiState): String =
    s.pokemonList.joinToString(",") { it.name } + "|" + s.isLoading + "|" + (s.error ?: "null")

fun main() {
    val datos = listOf(Pokemon("25", "Pikachu"))
    val vm = HomeViewModel(GetPokemonListUseCase(RepoFijo(datos)))
    val emitidos = mutableListOf<HomeUiState>()
    vm.onEstado = { emitidos.add(it) }
    when (readLine()?.trim() ?: "") {
        "estado_inicial" -> println(pinta(vm.uiState))
        "estado_final" -> { vm.cargar(); println(pinta(vm.uiState)) }
        "secuencia_de_estados" -> { vm.cargar(); println(emitidos.joinToString(" >> ") { pinta(it) }) }
        "notifica_dos_veces" -> { vm.cargar(); println(emitidos.size.toString()) }
        "repositorio_vacio" -> {
            val vacio = HomeViewModel(GetPokemonListUseCase(RepoFijo(emptyList())))
            vacio.cargar()
            println(pinta(vacio.uiState))
        }
        else -> println("caso desconocido")
    }
}`,
  },
  inicial: {
    kotlin: `class HomeViewModel(private val getPokemonListUseCase: GetPokemonListUseCase) {
    // TODO: uiState público de SOLO LECTURA (private set), con HomeUiState() inicial
    // TODO: onEstado, el callback al que avisas en cada cambio
    // TODO: cargar() — Loading, pedir la lista, Success
}
`,
  },
  casos: [
    { entrada: 'estado_inicial\n', salidaEsperada: '|false|null', oculto: false },
    { entrada: 'estado_final\n', salidaEsperada: 'Pikachu|false|null', oculto: false },
    { entrada: 'secuencia_de_estados\n', salidaEsperada: '|true|null >> Pikachu|false|null', oculto: false },
    { entrada: 'notifica_dos_veces\n', salidaEsperada: '2', oculto: true },
    { entrada: 'repositorio_vacio\n', salidaEsperada: '|false|null', oculto: true },
  ],
  soluciones: {
    kotlin: [
      `class HomeViewModel(private val getPokemonListUseCase: GetPokemonListUseCase) {
    var uiState: HomeUiState = HomeUiState()
        private set

    var onEstado: ((HomeUiState) -> Unit)? = null

    fun cargar() {
        uiState = reduce(uiState, Result.Loading)
        onEstado?.invoke(uiState)
        val lista = getPokemonListUseCase()
        uiState = reduce(uiState, Result.Success(lista))
        onEstado?.invoke(uiState)
    }
}`,
      `class HomeViewModel(private val getPokemonListUseCase: GetPokemonListUseCase) {
    var uiState: HomeUiState = HomeUiState()
        private set

    var onEstado: ((HomeUiState) -> Unit)? = null

    private fun publicar(nuevo: HomeUiState) {
        uiState = nuevo
        val cb = onEstado
        if (cb != null) cb(nuevo)
    }

    fun cargar() {
        publicar(reduce(uiState, Result.Loading))
        publicar(reduce(uiState, Result.Success(getPokemonListUseCase())))
    }
}`,
    ],
  },
};

// ---------------------------------------------------------------------------
// 9. ViewModel — iOS
// ---------------------------------------------------------------------------

const EJ_VM_IOS: Ejercicio = {
  slug: 'mvvm-viewmodel-ios',
  titulo: 'ViewModel (iOS)',
  categoria: 'Estado y ViewModel',
  lenguajes: ['swift'],
  diagrama: `sequenceDiagram
    participant V as ContentView
    participant VM as ContentViewModel
    participant REQ as PokemonListRequirement
    V->>VM: getPokemonList()
    VM->>REQ: getPokemonList()
    REQ-->>VM: [Pokemon]
    VM->>VM: pokemonList = ...
    VM-->>V: onChange (en la app real, @Published)`,
  enunciado: `# ViewModel (iOS)

**Capa:** framework — \`Viewmodels/ContentViewModel.swift\`

El ViewModel pide los datos al *Requirement* y **publica** el resultado para que
la vista se redibuje.

> En la app real esto se hace con \`ObservableObject\` y \`@Published\`, que son de
> **Combine** y no existen fuera de Apple. Aquí el harness usa un **closure**
> \`onChange\`, que cumple el mismo papel: avisar de cada cambio. La estructura
> —propiedad de solo lectura desde fuera, mutable solo dentro— es idéntica.

## Qué escribes

\`\`\`swift
class ContentViewModel {
    private(set) var pokemonList: [Pokemon] = []
    var onChange: (([Pokemon]) -> Void)?

    init(pokemonListRequirement: PokemonListRequirementProtocol)

    func getPokemonList()
}
\`\`\`

\`getPokemonList()\` pide la lista al requirement, la guarda en \`pokemonList\` y
**avisa** por \`onChange\`.

## Dos reglas

- La dependencia se declara con el tipo del **protocolo**, nunca con la clase
  concreta. Es lo que permite meterle un doble en las pruebas.
- \`pokemonList\` es \`private(set)\`: la vista la lee, pero solo el ViewModel la
  escribe.
`,
  plantilla: {
    swift: `import Foundation

struct Pokemon { var id: String; var name: String }

protocol PokemonListRequirementProtocol { func getPokemonList() -> [Pokemon] }

class RequirementFijo: PokemonListRequirementProtocol {
    private let datos: [Pokemon]
    init(datos: [Pokemon]) { self.datos = datos }
    func getPokemonList() -> [Pokemon] { datos }
}

{{solucion}}

let caso = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
let datos = [Pokemon(id: "25", name: "Pikachu"), Pokemon(id: "6", name: "Charizard")]
let vm = ContentViewModel(pokemonListRequirement: RequirementFijo(datos: datos))
var avisos: [Int] = []
vm.onChange = { lista in avisos.append(lista.count) }
func pinta(_ l: [Pokemon]) -> String { l.map { $0.name }.joined(separator: ",") }
switch caso {
case "lista_inicial_vacia":
    print("[\\(pinta(vm.pokemonList))]")
case "lista_tras_cargar":
    vm.getPokemonList()
    print(pinta(vm.pokemonList))
case "avisa_por_onchange":
    vm.getPokemonList()
    print(avisos.map { String($0) }.joined(separator: ","))
case "requirement_vacio":
    let vacio = ContentViewModel(pokemonListRequirement: RequirementFijo(datos: []))
    vacio.getPokemonList()
    print("[\\(pinta(vacio.pokemonList))]")
default:
    print("caso desconocido: \\(caso)")
}`,
  },
  inicial: {
    swift: `class ContentViewModel {
    // TODO: pokemonList, de solo lectura desde fuera
    // TODO: onChange, el closure al que avisas
    // TODO: guarda el requirement inyectado

    init(pokemonListRequirement: PokemonListRequirementProtocol) {
    }

    // TODO: getPokemonList()
}
`,
  },
  casos: [
    { entrada: 'lista_inicial_vacia\n', salidaEsperada: '[]', oculto: false },
    { entrada: 'lista_tras_cargar\n', salidaEsperada: 'Pikachu,Charizard', oculto: false },
    { entrada: 'avisa_por_onchange\n', salidaEsperada: '2', oculto: true },
    { entrada: 'requirement_vacio\n', salidaEsperada: '[]', oculto: true },
  ],
  soluciones: {
    swift: [
      `class ContentViewModel {
    private(set) var pokemonList: [Pokemon] = []
    var onChange: (([Pokemon]) -> Void)?
    private let pokemonListRequirement: PokemonListRequirementProtocol

    init(pokemonListRequirement: PokemonListRequirementProtocol) {
        self.pokemonListRequirement = pokemonListRequirement
    }

    func getPokemonList() {
        pokemonList = pokemonListRequirement.getPokemonList()
        onChange?(pokemonList)
    }
}`,
      `class ContentViewModel {
    private(set) var pokemonList: [Pokemon] = []
    var onChange: (([Pokemon]) -> Void)?
    private var requirement: PokemonListRequirementProtocol

    init(pokemonListRequirement: PokemonListRequirementProtocol) {
        requirement = pokemonListRequirement
    }

    func getPokemonList() {
        let lista = requirement.getPokemonList()
        pokemonList = lista
        if let cb = onChange { cb(lista) }
    }
}`,
    ],
  },
};

// ---------------------------------------------------------------------------
// 10. Composición end-to-end — Android
// ---------------------------------------------------------------------------

const EJ_COMP_ANDROID: Ejercicio = {
  slug: 'mvvm-composicion-android',
  titulo: 'Composición end-to-end (Android)',
  categoria: 'Composición',
  lenguajes: ['kotlin'],
  diagrama: `flowchart LR
    API["FakePokemonApi<br/>devuelve DTOs"] --> IMPL["PokemonRepositoryImpl<br/>lo que escribes"]
    IMPL -->|toDomain| UC[GetPokemonListUseCase]
    UC --> VM[HomeViewModel]
    VM --> V[HomeScreen]
    style IMPL fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px`,
  enunciado: `# Composición end-to-end (Android)

**Capa:** Datos — \`data/repository/PokemonRepositoryImpl.kt\`

Aquí se junta todo. La cadena completa es:

\`\`\`
PokemonApi → PokemonRepositoryImpl → GetPokemonListUseCase → HomeViewModel
   (DTOs)         (mapea a dominio)        (una acción)        (estado)
\`\`\`

Te damos todas las piezas menos **una**: la implementación del repositorio, que
es justo la que traduce el mundo de la API al mundo del dominio.

## Qué escribes

\`\`\`kotlin
class PokemonRepositoryImpl(private val api: PokemonApi) : PokemonRepository {
    override fun getPokemonList(): List<Pokemon>
}
\`\`\`

Debe pedir los DTOs a \`api.getPokemonList()\` y convertirlos con \`toDomain()\`,
que ya está escrito.

## Por qué el sufijo \`Impl\`

El wiki lo dice: *"es la nomenclatura de Implementation. Todas las interfaces
siguen este estándar"*. El contrato vive en \`domain/\`; su implementación en
\`data/\`. **El dominio no sabe que existe la API.**
`,
  plantilla: {
    kotlin: `data class PokemonDto(val id: Int, val name: String, val sprites: SpritesDto)
data class SpritesDto(val frontDefault: String?)
data class Pokemon(val id: String, val name: String, val imageUrl: String)

fun PokemonDto.toDomain(): Pokemon =
    Pokemon(id.toString(), name.replaceFirstChar { it.uppercase() }, sprites.frontDefault ?: "")

interface PokemonApi { fun getPokemonList(): List<PokemonDto> }
interface PokemonRepository { fun getPokemonList(): List<Pokemon> }

/** API falsa: devuelve DTOs como los daría la red, sin salir a internet. */
class FakePokemonApi(private val dtos: List<PokemonDto>) : PokemonApi {
    var llamadas = 0
    override fun getPokemonList(): List<PokemonDto> {
        llamadas++
        return dtos
    }
}

class GetPokemonListUseCase(private val repository: PokemonRepository) {
    operator fun invoke(): List<Pokemon> = repository.getPokemonList()
}

class HomeViewModel(private val getPokemonListUseCase: GetPokemonListUseCase) {
    var pokemonList: List<Pokemon> = emptyList()
        private set
    fun cargar() { pokemonList = getPokemonListUseCase() }
}

{{solucion}}

fun main() {
    val dtos = listOf(
        PokemonDto(25, "pikachu", SpritesDto("https://img/25.png")),
        PokemonDto(6, "charizard", SpritesDto(null)),
    )
    val api = FakePokemonApi(dtos)
    val vm = HomeViewModel(GetPokemonListUseCase(PokemonRepositoryImpl(api)))
    when (readLine()?.trim() ?: "") {
        "cadena_completa" -> {
            vm.cargar()
            println(vm.pokemonList.joinToString(",") { it.id + ":" + it.name })
        }
        "aplica_el_mapper" -> {
            vm.cargar()
            println(vm.pokemonList.joinToString(",") { "[" + it.imageUrl + "]" })
        }
        "usa_la_api_inyectada" -> {
            vm.cargar()
            println(api.llamadas.toString())
        }
        "api_vacia" -> {
            val vacio = HomeViewModel(GetPokemonListUseCase(PokemonRepositoryImpl(FakePokemonApi(emptyList()))))
            vacio.cargar()
            println(vacio.pokemonList.size.toString())
        }
        else -> println("caso desconocido")
    }
}`,
  },
  inicial: {
    kotlin: `class PokemonRepositoryImpl(private val api: PokemonApi) : PokemonRepository {
    // TODO: pide los DTOs a la api y conviértelos con toDomain()
}
`,
  },
  casos: [
    { entrada: 'cadena_completa\n', salidaEsperada: '25:Pikachu,6:Charizard', oculto: false },
    { entrada: 'aplica_el_mapper\n', salidaEsperada: '[https://img/25.png],[]', oculto: false },
    { entrada: 'usa_la_api_inyectada\n', salidaEsperada: '1', oculto: true },
    { entrada: 'api_vacia\n', salidaEsperada: '0', oculto: true },
  ],
  soluciones: {
    kotlin: [
      `class PokemonRepositoryImpl(private val api: PokemonApi) : PokemonRepository {
    override fun getPokemonList(): List<Pokemon> = api.getPokemonList().map { it.toDomain() }
}`,
      `class PokemonRepositoryImpl(private val api: PokemonApi) : PokemonRepository {
    override fun getPokemonList(): List<Pokemon> {
        val salida = mutableListOf<Pokemon>()
        for (dto in api.getPokemonList()) salida.add(dto.toDomain())
        return salida
    }
}`,
    ],
  },
};

// ---------------------------------------------------------------------------
// 11. Composición end-to-end — iOS
// ---------------------------------------------------------------------------

const EJ_COMP_IOS: Ejercicio = {
  slug: 'mvvm-composicion-ios',
  titulo: 'Composición end-to-end (iOS)',
  categoria: 'Composición',
  lenguajes: ['swift'],
  diagrama: `flowchart LR
    N["NetworkAPIService<br/>devuelve Pokedex"] --> REPO["PokemonRepository<br/>lo que escribes"]
    REPO --> REQ[PokemonListRequirement]
    REQ --> VM[ContentViewModel]
    VM --> V[ContentView]
    style REPO fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px`,
  enunciado: `# Composición end-to-end (iOS)

**Capa:** data — \`data/PokemonRepository.swift\`

Aquí se junta todo. La cadena completa de la pista de iOS es:

\`\`\`
NetworkAPIService → PokemonRepository → PokemonListRequirement → ContentViewModel
     (red)            (cumple el         (una acción)              (estado)
                       protocolo)
\`\`\`

Te damos todas las piezas menos **una**: \`PokemonRepository\`, que es quien habla
con el servicio de red y cumple el protocolo que el resto espera.

## Qué escribes

\`\`\`swift
class PokemonRepository: PokemonAPIProtocol {
    init(nservice: NetworkAPIServiceProtocol)
    func getPokemonList() -> [Pokemon]
}
\`\`\`

Debe pedir el \`Pokedex\` al servicio y devolver sus \`results\`. Si el servicio
devuelve \`nil\` —no hubo respuesta—, devuelve **lista vacía**.

## Fíjate en el nombre del parámetro

Es \`nservice\`, como en el wiki: \`init(nservice: NetworkAPIService = NetworkAPIService.shared)\`.
Ese valor por defecto es la inyección de dependencias manual de la pista de iOS:
en producción usa el real, y en pruebas le pasas un doble.
`,
  plantilla: {
    swift: `import Foundation

struct Pokemon: Codable { var name: String; var url: String }
struct Pokedex: Codable { var count: Int; var results: [Pokemon] }

protocol NetworkAPIServiceProtocol { func getPokedex() -> Pokedex? }
protocol PokemonAPIProtocol { func getPokemonList() -> [Pokemon] }

/** Servicio de red falso: no sale a internet. */
class FakeNetworkAPIService: NetworkAPIServiceProtocol {
    var llamadas = 0
    private let pokedex: Pokedex?
    init(pokedex: Pokedex?) { self.pokedex = pokedex }
    func getPokedex() -> Pokedex? {
        llamadas += 1
        return pokedex
    }
}

protocol PokemonListRequirementProtocol { func getPokemonList() -> [Pokemon] }
class PokemonListRequirement: PokemonListRequirementProtocol {
    private let dataRepository: PokemonAPIProtocol
    init(dataRepository: PokemonAPIProtocol) { self.dataRepository = dataRepository }
    func getPokemonList() -> [Pokemon] { dataRepository.getPokemonList() }
}

class ContentViewModel {
    private(set) var pokemonList: [Pokemon] = []
    private let requirement: PokemonListRequirementProtocol
    init(pokemonListRequirement: PokemonListRequirementProtocol) { requirement = pokemonListRequirement }
    func getPokemonList() { pokemonList = requirement.getPokemonList() }
}

{{solucion}}

let caso = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
let pokedex = Pokedex(count: 2, results: [
    Pokemon(name: "pikachu", url: "u25"),
    Pokemon(name: "charizard", url: "u6"),
])
let service = FakeNetworkAPIService(pokedex: pokedex)
let vm = ContentViewModel(pokemonListRequirement:
    PokemonListRequirement(dataRepository: PokemonRepository(nservice: service)))
switch caso {
case "cadena_completa":
    vm.getPokemonList()
    print(vm.pokemonList.map { $0.name }.joined(separator: ","))
case "usa_el_servicio_inyectado":
    vm.getPokemonList()
    print("\\(service.llamadas)")
case "sin_respuesta_lista_vacia":
    let sinDatos = ContentViewModel(pokemonListRequirement:
        PokemonListRequirement(dataRepository: PokemonRepository(nservice: FakeNetworkAPIService(pokedex: nil))))
    sinDatos.getPokemonList()
    print("\\(sinDatos.pokemonList.count)")
case "pokedex_vacio":
    let vacio = ContentViewModel(pokemonListRequirement:
        PokemonListRequirement(dataRepository: PokemonRepository(nservice: FakeNetworkAPIService(pokedex: Pokedex(count: 0, results: [])))))
    vacio.getPokemonList()
    print("\\(vacio.pokemonList.count)")
default:
    print("caso desconocido: \\(caso)")
}`,
  },
  inicial: {
    swift: `class PokemonRepository: PokemonAPIProtocol {
    // TODO: guarda el servicio inyectado
    init(nservice: NetworkAPIServiceProtocol) {
    }

    // TODO: getPokemonList() — los results del Pokedex, o [] si vino nil
}
`,
  },
  casos: [
    { entrada: 'cadena_completa\n', salidaEsperada: 'pikachu,charizard', oculto: false },
    { entrada: 'usa_el_servicio_inyectado\n', salidaEsperada: '1', oculto: false },
    { entrada: 'sin_respuesta_lista_vacia\n', salidaEsperada: '0', oculto: true },
    { entrada: 'pokedex_vacio\n', salidaEsperada: '0', oculto: true },
  ],
  soluciones: {
    swift: [
      `class PokemonRepository: PokemonAPIProtocol {
    private let nservice: NetworkAPIServiceProtocol
    init(nservice: NetworkAPIServiceProtocol) { self.nservice = nservice }
    func getPokemonList() -> [Pokemon] {
        guard let pokedex = nservice.getPokedex() else { return [] }
        return pokedex.results
    }
}`,
      `class PokemonRepository: PokemonAPIProtocol {
    private var servicio: NetworkAPIServiceProtocol
    init(nservice: NetworkAPIServiceProtocol) { servicio = nservice }
    func getPokemonList() -> [Pokemon] {
        if let pokedex = servicio.getPokedex() {
            return pokedex.results
        }
        return []
    }
}`,
    ],
  },
};

const EJERCICIOS: Ejercicio[] = [
  EJ_MODELO_KOTLIN, EJ_MODELO_SWIFT, EJ_MAPPER, EJ_ID_URL,
  EJ_CONTRATO, EJ_CASO_USO,
  EJ_RESULT, EJ_REDUCER, EJ_VM_ANDROID, EJ_VM_IOS,
  EJ_COMP_ANDROID, EJ_COMP_IOS,
];

// ---------------------------------------------------------------------------

/**
 * Inserta el diagrama justo antes de la primera sección (`## `). Así queda tras
 * la cabecera y la línea de capa, que es donde el alumno mira primero.
 */
function conDiagrama(enunciado: string, diagrama?: string): string {
  if (!diagrama) return enunciado;
  const bloque = '## Dónde encaja\n\n' + '```mermaid\n' + diagrama.trim() + '\n```\n\n';
  const i = enunciado.indexOf('\n## ');
  if (i < 0) return enunciado + '\n' + bloque;
  return enunciado.slice(0, i + 1) + bloque + enunciado.slice(i + 1);
}

async function main(): Promise<void> {
  const col = await new Parse.Query('Coleccion')
    .equalTo('slug', SLUG_COL).first({ useMasterKey: true });
  if (!col) { console.error(`No existe la colección '${SLUG_COL}'.`); process.exit(1); }

  const bloque = await new Parse.Query('BloqueEjercicios')
    .equalTo('coleccion', col).equalTo('nombre', NOMBRE_BLOQUE).equalTo('exists', true)
    .first({ useMasterKey: true });
  if (!bloque) {
    console.error(`No existe el bloque "${NOMBRE_BLOQUE}". Corre antes seed-bloques-tc2007b.ts`);
    process.exit(1);
  }

  console.log(`Colección '${SLUG_COL}' · bloque "${NOMBRE_BLOQUE}"${DRY_RUN ? ' · DRY-RUN' : ''}\n`);

  // Categorías del bloque
  const CatModel = Parse.Object.extend('CategoriaEjercicio');
  const catPorNombre = new Map<string, Parse.Object>();
  for (const [i, nombre] of CATEGORIAS.entries()) {
    let cat = await new Parse.Query('CategoriaEjercicio')
      .equalTo('coleccion', col).equalTo('nombre', nombre).equalTo('exists', true)
      .first({ useMasterKey: true });
    const nueva = !cat;
    if (!cat) {
      cat = new CatModel();
      cat!.set('active', true); cat!.set('exists', true);
      cat!.set('coleccion', col); cat!.set('nombre', nombre);
      // Detrás de las 5 de introducción, para no intercalarse con ellas.
      cat!.set('orden', 100 + i);
    }
    cat!.set('bloque', bloque);
    console.log(`${nueva ? '+' : '·'} categoría "${nombre}"`);
    if (!DRY_RUN) await cat!.save(null, { useMasterKey: true });
    catPorNombre.set(nombre, cat!);
  }

  // Ejercicios
  const EjModel = Parse.Object.extend('EjercicioProgramacion');
  let orden = 100;
  for (const d of EJERCICIOS) {
    let ej = await new Parse.Query('EjercicioProgramacion')
      .equalTo('coleccion', col).equalTo('slug', d.slug).equalTo('exists', true)
      .first({ useMasterKey: true });
    const nuevo = !ej;
    if (!ej) { ej = new EjModel(); ej!.set('active', true); ej!.set('exists', true); }

    ej!.set('coleccion', col);
    ej!.set('categoria', catPorNombre.get(d.categoria));
    ej!.set('titulo', d.titulo);
    ej!.set('slug', d.slug);
    ej!.set('orden', orden++);
    const md = conDiagrama(d.enunciado, d.diagrama);
    ej!.set('enunciado', md);
    ej!.set('enunciadoHtml', await renderMarkdown(md));
    ej!.set('lenguajes', d.lenguajes);
    ej!.set('modoEvaluacion', 'plantilla');
    ej!.set('plantillaCodigo', d.plantilla);
    ej!.set('codigoInicial', d.inicial);
    ej!.set('casos', d.casos);
    ej!.set('solucionesReferencia', d.soluciones);
    ej!.set('limiteTiempoMs', 8000);
    ej!.set('limiteMemoriaMb', 256);
    if (nuevo) ej!.set('publicado', PUBLICAR);
    else if (PUBLICAR) ej!.set('publicado', true);

    console.log(`${nuevo ? '+' : '·'} ${d.slug} (${d.lenguajes.join('+')}, ${d.casos.length} casos)`);
    if (!DRY_RUN) await ej!.save(null, { useMasterKey: true });
  }

  console.log(`\n${DRY_RUN ? 'Plan verificado' : 'Aplicado'}${PUBLICAR ? ' y PUBLICADO' : ' como BORRADOR'}.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
