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

const EJERCICIOS: Ejercicio[] = [EJ_MODELO_KOTLIN, EJ_MODELO_SWIFT, EJ_MAPPER, EJ_CONTRATO];

// ---------------------------------------------------------------------------

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
    ej!.set('enunciado', d.enunciado);
    ej!.set('enunciadoHtml', await renderMarkdown(d.enunciado));
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
