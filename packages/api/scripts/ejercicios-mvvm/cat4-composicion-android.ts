import type { Ejercicio } from './tipos.js';

/** Firmas de lo ya proporcionado. Sin cuerpos: son solución de otros ejercicios. */
const YA_DECLARADO = {
  kotlin: `data class ItemDto(val item_id: String?, val item_name: String?, val in_stock: String?)
data class Item(val id: String, val name: String, val stock: Int)

interface FuenteRemota {
    fun leer(): List<ItemDto>          // LANZA excepción si la fuente falla
}

interface ItemRepository {
    fun obtenerTodos(): List<Item>
}

class GetItemsUseCase(private val repositorio: ItemRepository) {
    operator fun invoke(): List<Item>  // descarta stock <= 0 y ordena por nombre
}

data class ItemsUiState(
    val items: List<Item> = emptyList(),
    val cargando: Boolean = false,
    val error: String? = null,
)

class ItemsViewModel(private val obtenerItems: GetItemsUseCase) {
    val estado: ItemsUiState
    fun observar(alCambiar: (ItemsUiState) -> Unit)
    fun cargar()                        // convierte la excepción en estado de error
}

// Fuentes de prueba, ya escritas:
class FuenteFija(private val dtos: List<ItemDto>) : FuenteRemota
class FuenteQueFalla(private val mensaje: String) : FuenteRemota`,
};


/**
 * Concepto 4.1 — Composición end-to-end (Android).
 *
 * Último de la pista: monta la cadena completa con las piezas de los ejercicios
 * anteriores. Todas se proporcionan ya escritas salvo las dos que se piden, para
 * que el ejercicio trate de la COMPOSICIÓN y no de reescribirlas.
 */

const CATEGORIA = 'Composición';
const CAPA = 'Aplicación — `di/Contenedor.kt` y `data/repository/ItemRepositoryApi.kt`';

const PROBLEMA = `
Este ejercicio construye **dos piezas**, y ninguna contiene reglas de negocio:

1. La implementación real del repositorio, que obtiene los DTO de la fuente
   remota y los traduce a modelos de dominio.
2. La función que **monta la cadena completa** y devuelve el ViewModel listo
   para usar.

Hasta ahora cada ejercicio construyó una pieza suelta y las comprobaciones le
entregaron sus vecinos ya hechos. Falta responder a una pregunta que ninguna
pieza puede responder por sí misma: **quién decide qué implementación concreta
usa cada contrato**.

La respuesta no puede estar dentro de las piezas. Si el caso de uso eligiera su
repositorio, dejaría de poder comprobarse con uno falso; si el ViewModel eligiera
su caso de uso, ocurriría lo mismo un nivel más arriba. La decisión se concentra
en un único punto, y ese punto es la segunda pieza de este ejercicio.
`;

const DE_DONDE_VIENE = `
Ese punto único recibe el nombre de **raíz de composición** —*composition root*—,
término acuñado por Mark Seemann en *Dependency Injection in .NET* (2011). Su
definición es precisa: el lugar, lo más cercano posible al arranque del programa,
donde se construye el grafo de objetos.

La regla que lo acompaña es igual de precisa: **ninguna otra parte del código
construye sus dependencias**. Las recibe.

### Qué se gana al concentrar la decisión

- **Sustituir una implementación es un cambio de una línea.** Cambiar de API,
  añadir una caché o leer de un fichero se hace en la raíz, sin tocar el dominio
  ni la presentación.
- **Las comprobaciones montan su propia cadena.** Cada ejercicio anterior pudo
  comprobarse porque nada construía sus dependencias por dentro.
- **Las dependencias son visibles.** Al leer la raíz se sabe qué depende de qué,
  sin buscar por todo el proyecto.

### Inyección de dependencias, sin biblioteca

Entregar a cada pieza lo que necesita, en lugar de que lo construya, se denomina
**inyección de dependencias**. Las bibliotecas del ecosistema —Hilt y Dagger en
Android, Swinject en iOS— automatizan esa entrega, pero no son el concepto: el
concepto es el constructor que recibe en vez de construir.

Este ejercicio lo hace a mano, que es la forma de ver que la biblioteca resuelve
un problema de volumen, no de diseño.

### Dónde queda la traducción

La primera pieza es el otro extremo de la misma idea. El repositorio real es el
único punto donde el formato de la API entra al sistema: recibe los DTO, invoca
la traducción y devuelve modelos de dominio. Por eso las capas superiores nunca
llegan a ver un \`ItemDto\`.
`;

const DIAGRAMA = `
flowchart TB
    ROOT["crearViewModel()<br/>raíz de composición"]
    subgraph data["data/"]
        F[FuenteRemota]
        REPO["ItemRepositoryApi<br/>pieza de este ejercicio"]
    end
    subgraph domain["domain/"]
        C[ItemRepository]
        UC[GetItemsUseCase]
    end
    subgraph presentation["presentation/"]
        VM[ItemsViewModel]
    end
    ROOT --> REPO
    ROOT --> UC
    ROOT --> VM
    F --> REPO
    REPO -.implementa.-> C
    C --> UC
    UC --> VM
    style ROOT fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px
    style REPO fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px
`;

const DONDE_MAS = `
- **Backend.** El arranque de un servidor construye el grupo de conexiones, los
  repositorios y los servicios, y los entrega a los controladores.
- **Herramientas de línea de órdenes.** La función principal analiza los
  argumentos y monta el grafo; el resto del programa solo recibe.
- **Marcos de trabajo con contenedor.** Spring, Angular o NestJS automatizan esta
  construcción; el concepto que implementan es este.
- **Pruebas de integración.** Montan una raíz alternativa con dobles en los
  puntos que interesa aislar, sin modificar el código de producción.
`;

const ERRORES = `
- **Construir dependencias dentro de las piezas.** Un caso de uso que cree su
  repositorio deja de poder comprobarse con uno falso.
- **Devolver el DTO desde el repositorio.** El formato de la API se propagaría a
  las capas superiores.
- **Colocar reglas de negocio en la raíz.** Su única responsabilidad es
  construir; filtrar u ordenar corresponde al caso de uso.
- **Declarar el repositorio con el tipo concreto** en la raíz. El resto de la
  cadena debe recibir el contrato, no la implementación.
- **Repetir la construcción en varios lugares.** Deja de haber un punto único, y
  con ello desaparece la ventaja del patrón.
`;

const CABECERA = `data class ItemDto(val item_id: String?, val item_name: String?, val in_stock: String?)

data class Item(val id: String, val name: String, val stock: Int)

interface FuenteRemota {
    fun leer(): List<ItemDto>
}

interface ItemRepository {
    fun obtenerTodos(): List<Item>
}

class GetItemsUseCase(private val repositorio: ItemRepository) {
    operator fun invoke(): List<Item> =
        repositorio.obtenerTodos().filter { it.stock > 0 }.sortedBy { it.name }
}

data class ItemsUiState(
    val items: List<Item> = emptyList(),
    val cargando: Boolean = false,
    val error: String? = null,
)

class ItemsViewModel(private val obtenerItems: GetItemsUseCase) {
    var estado: ItemsUiState = ItemsUiState()
        private set

    private var alCambiar: ((ItemsUiState) -> Unit)? = null

    fun observar(alCambiar: (ItemsUiState) -> Unit) {
        this.alCambiar = alCambiar
    }

    private fun emitir(nuevo: ItemsUiState) {
        estado = nuevo
        alCambiar?.invoke(nuevo)
    }

    fun cargar() {
        emitir(estado.copy(cargando = true, error = null))
        try {
            emitir(estado.copy(items = obtenerItems(), cargando = false, error = null))
        } catch (e: Exception) {
            emitir(estado.copy(cargando = false, error = e.message ?: "error"))
        }
    }
}

class FuenteFija(private val dtos: List<ItemDto>) : FuenteRemota {
    override fun leer(): List<ItemDto> = dtos
}

class FuenteQueFalla(private val mensaje: String) : FuenteRemota {
    override fun leer(): List<ItemDto> = throw RuntimeException(mensaje)
}`;

const DRIVER = `${CABECERA}

{{solucion}}

fun describir(s: ItemsUiState): String =
    s.items.joinToString(",") { it.name } + "|" + s.cargando.toString() + "|" +
        (s.error ?: "-")

fun main() {
    val dtos = listOf(
        ItemDto("1", "Camisa", "3"),
        ItemDto("2", "Abrigo", "1"),
        ItemDto("3", "Zapato", "0"),
    )
    when (readLine()?.trim() ?: "") {
        "flujo_completo" -> {
            val vm = crearViewModel(FuenteFija(dtos))
            vm.cargar()
            println(describir(vm.estado))
        }
        "descarta_sin_id" -> {
            val conInvalido = listOf(ItemDto(null, "Bufanda", "5")) + dtos
            val vm = crearViewModel(FuenteFija(conInvalido))
            vm.cargar()
            println(describir(vm.estado))
        }
        "fallo_llega_a_la_pantalla" -> {
            val vm = crearViewModel(FuenteQueFalla("sin conexion"))
            vm.cargar()
            println(describir(vm.estado))
        }
        "stock_no_numerico" -> {
            val raros = listOf(ItemDto("9", "Gorro", "muchos"), ItemDto("1", "Camisa", "3"))
            val vm = crearViewModel(FuenteFija(raros))
            vm.cargar()
            println(describir(vm.estado))
        }
        else -> println("caso desconocido")
    }
}`;

const CASOS = [
  { entrada: 'flujo_completo\n', salidaEsperada: 'Abrigo,Camisa|false|-', oculto: false },
  { entrada: 'descarta_sin_id\n', salidaEsperada: 'Abrigo,Camisa|false|-', oculto: false },
  {
    entrada: 'fallo_llega_a_la_pantalla\n',
    salidaEsperada: '|false|sin conexion',
    oculto: false,
  },
  { entrada: 'stock_no_numerico\n', salidaEsperada: 'Camisa|false|-', oculto: true },
];

const FIRMA = `
\`\`\`kotlin
class ItemRepositoryApi(private val fuente: FuenteRemota) : ItemRepository {
    override fun obtenerTodos(): List<Item>
}

fun crearViewModel(fuente: FuenteRemota): ItemsViewModel
\`\`\`

Se proporcionan ya escritos: \`ItemDto\`, \`Item\`, \`FuenteRemota\`,
\`ItemRepository\`, \`GetItemsUseCase\`, \`ItemsUiState\` e \`ItemsViewModel\`, con el
comportamiento de los ejercicios anteriores. También dos fuentes de prueba:
\`FuenteFija\` y \`FuenteQueFalla\`.
`;

const REGLAS_TRADUCCION = `
| Campo del DTO | Campo del dominio | Regla |
|---|---|---|
| \`item_id\` | \`id\` | Si falta o está vacío, **el DTO se descarta** |
| \`item_name\` | \`name\` | Si falta, \`sin nombre\` |
| \`in_stock\` | \`stock\` | Texto a entero. Si falta o no es un número, \`0\` |
`;

const COMPRUEBA = `
Cuatro comprobaciones. Cada una monta la cadena con una fuente distinta, invoca
\`cargar\` y muestra el estado final con el formato \`nombres|cargando|error\`.
Cuando no hay error se imprime \`-\`.

Conviene recordar que el caso de uso proporcionado descarta los artículos sin
unidades y ordena por nombre. El artículo \`Zapato\`, con \`in_stock\` a \`"0"\`, no
aparece en ningún resultado por ese motivo, no por la traducción.

- **\`flujo_completo\`** — tres DTO correctos.
  Debe imprimir \`Abrigo,Camisa|false|-\`.
  *Verifica:* que la cadena entera esté conectada y que la traducción produzca
  enteros a partir del texto.
- **\`descarta_sin_id\`** — se añade al principio un DTO sin identificador.
  Debe imprimir \`Abrigo,Camisa|false|-\`.
  *Verifica:* la primera fila de la tabla de traducción.
- **\`fallo_llega_a_la_pantalla\`** — la fuente lanza un error.
  Debe imprimir \`|false|sin conexion\`.
  *Verifica:* que el fallo atraviese la cadena y llegue como estado, no como
  excepción.
- **Una comprobación oculta** — un DTO cuyo \`in_stock\` contiene un texto que no
  es un número.
  *Verifica:* la última fila de la tabla, y su consecuencia al pasar por el caso
  de uso.

La comprobación oculta es deducible: la tabla fija el valor que toma \`stock\` en
ese caso, y la regla del caso de uso determina qué ocurre después con él.
`;

const SOLUCIONES = [
  // Estrategia A: extensión de traducción y cadena de operadores.
  `fun ItemDto.toDomain(): Item = Item(
    id = item_id ?: "",
    name = item_name ?: "sin nombre",
    stock = in_stock?.toIntOrNull() ?: 0,
)

class ItemRepositoryApi(private val fuente: FuenteRemota) : ItemRepository {
    override fun obtenerTodos(): List<Item> =
        fuente.leer()
            .filter { !it.item_id.isNullOrEmpty() }
            .map { it.toDomain() }
}

fun crearViewModel(fuente: FuenteRemota): ItemsViewModel {
    val repositorio: ItemRepository = ItemRepositoryApi(fuente)
    val casoDeUso = GetItemsUseCase(repositorio)
    return ItemsViewModel(casoDeUso)
}`,
  // Estrategia B: traducción privada y recorrido explícito.
  `class ItemRepositoryApi(private val fuente: FuenteRemota) : ItemRepository {
    private fun traducir(dto: ItemDto): Item {
        val nombre = if (dto.item_name == null) "sin nombre" else dto.item_name
        var unidades = 0
        val texto = dto.in_stock
        if (texto != null) {
            val n = texto.toIntOrNull()
            if (n != null) unidades = n
        }
        return Item(dto.item_id ?: "", nombre, unidades)
    }

    override fun obtenerTodos(): List<Item> {
        val salida = mutableListOf<Item>()
        for (dto in fuente.leer()) {
            val id = dto.item_id
            if (id == null || id.isEmpty()) continue
            salida.add(traducir(dto))
        }
        return salida
    }
}

fun crearViewModel(fuente: FuenteRemota): ItemsViewModel =
    ItemsViewModel(GetItemsUseCase(ItemRepositoryApi(fuente)))`,
];

export const composicionAndroid: Ejercicio[] = [
  // --- GUIADO ---------------------------------------------------------------
  {
    slugBase: 'mvvm-composicion-and',
    tituloBase: 'Composición end-to-end (Android)',
    nivel: 'guiado',
    categoria: CATEGORIA,
    lenguajes: ['kotlin'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
El repositorio real y la raíz de composición.
${FIRMA}

Reglas de traducción del repositorio:
${REGLAS_TRADUCCION}
`,
    pasoAPaso: `
1. Escribe la traducción de un \`ItemDto\` a un \`Item\` según la tabla. Es la misma
   del ejercicio del mapper, con un campo menos.
2. Declara \`ItemRepositoryApi\` recibiendo la fuente al construirse e
   implementando el contrato \`ItemRepository\`.
3. En \`obtenerTodos\`, pide los DTO a la fuente, descarta los que no tengan
   identificador y traduce el resto. No filtres por unidades ni ordenes: eso
   corresponde al caso de uso.
4. Observa la raíz de composición, que se proporciona montada. Léela de dentro
   hacia fuera: el repositorio recibe la fuente, el caso de uso recibe el
   repositorio y el ViewModel recibe el caso de uso. En el nivel base hay que
   escribirla.
5. Ninguna de esas piezas construye a las demás: todas las reciben. Esa es la
   propiedad que permite sustituir cualquiera sin tocar el resto.
6. No captures la excepción de la fuente en el repositorio. El ViewModel ya la
   convierte en estado, y capturarla aquí ocultaría el fallo.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    yaDeclarado: YA_DECLARADO,
    plantilla: { kotlin: DRIVER },
    inicial: {
      kotlin: `class ItemRepositoryApi(private val fuente: FuenteRemota) : ItemRepository {
    override fun obtenerTodos(): List<Item> {
        // TODO 1: pedir los DTO a la fuente
        // TODO 2: descartar los que no tengan identificador
        // TODO 3: traducir el resto según la tabla del enunciado
        return emptyList()
    }
}

// La raíz se proporciona montada: sirve de referencia para el nivel base, donde
// hay que escribirla. Léela de dentro hacia fuera para ver el orden de la
// cadena.
fun crearViewModel(fuente: FuenteRemota): ItemsViewModel =
    ItemsViewModel(GetItemsUseCase(ItemRepositoryApi(fuente)))
`,
    },
    casos: CASOS,
    soluciones: { kotlin: SOLUCIONES },
  },

  // --- BASE -----------------------------------------------------------------
  {
    slugBase: 'mvvm-composicion-and',
    tituloBase: 'Composición end-to-end (Android)',
    nivel: 'base',
    categoria: CATEGORIA,
    lenguajes: ['kotlin'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
El repositorio real y la raíz de composición, con estas firmas:
${FIRMA}

Reglas de traducción del repositorio:
${REGLAS_TRADUCCION}
`,
    pasoAPaso: `
1. Determina qué corresponde al repositorio y qué al caso de uso. La tabla de
   traducción marca el límite: el repositorio traduce, el caso de uso decide.
2. Monta la cadena en la raíz, declarando cada pieza con el tipo que deben
   recibir las demás.
3. Decide qué hacer con el error de la fuente. La comprobación correspondiente
   indica dónde debe terminar.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    yaDeclarado: YA_DECLARADO,
    plantilla: { kotlin: DRIVER },
    inicial: {
      kotlin: `// Escribe aquí ItemRepositoryApi y crearViewModel.
// ItemDto, Item, FuenteRemota, ItemRepository, GetItemsUseCase, ItemsUiState
// e ItemsViewModel ya están declarados.
`,
    },
    casos: CASOS,
    soluciones: { kotlin: SOLUCIONES },
  },

  // --- RETO -----------------------------------------------------------------
  {
    slugBase: 'mvvm-composicion-and',
    tituloBase: 'Composición end-to-end (Android)',
    nivel: 'reto',
    categoria: CATEGORIA,
    lenguajes: ['kotlin'],
    capa: CAPA,
    problema: `
La pantalla vuelve a pedir los datos cada vez que se abre, y la fuente remota es
lenta. Se necesita una caché: la primera obtención consulta la fuente, y las
siguientes devuelven lo ya obtenido sin volver a consultarla.

La pregunta relevante no es cómo guardar la lista, sino **dónde colocar ese
comportamiento**. Hay tres candidatos, y dos son incorrectos:

- En el repositorio real: quedaría mezclado con la traducción, y no habría forma
  de usar el repositorio sin caché.
- En el caso de uso: la caché es un detalle de obtención de datos, no una regla
  del negocio.
- En una pieza propia que **envuelva** al repositorio: cumple el mismo contrato,
  de modo que quien lo consume no distingue si hay caché o no.

La tercera opción es la del ejercicio, y su consecuencia es que **la raíz de
composición es el único archivo que cambia** al añadirla.
`,
    deDondeViene: `
Envolver un objeto con otro que cumple su mismo contrato y añade comportamiento
se denomina patrón **Decorador**, catalogado por la Banda de los Cuatro en
*Design Patterns* (1994). Su definición: añadir responsabilidades a un objeto de
forma dinámica, como alternativa a la herencia.

La condición que lo hace funcionar es que el decorador **implemente el mismo
contrato** que decora. Por eso puede ocupar su lugar sin que nadie más se entere,
que es la formulación del principio de sustitución de Liskov —la L de SOLID—.

### Por qué no herencia

Una subclase del repositorio con caché quedaría atada a esa implementación
concreta. Un decorador funciona con **cualquiera** que cumpla el contrato: el
real, el falso, o incluso otro decorador.

Esa composición es la propiedad más útil del patrón. Registro de actividad,
reintentos, medición de tiempos y caché son decoradores independientes que se
apilan en el orden que convenga, y el orden es una decisión de la raíz.

### El coste

Un decorador añade una capa de indirección. Con tres o cuatro apilados, seguir
una llamada exige recorrerlos todos, y la raíz pasa a ser el único sitio donde se
ve el orden real. Es el compromiso del patrón: flexibilidad a cambio de que el
comportamiento efectivo ya no se lea en una sola clase.
`,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: `
- **Clientes HTTP.** Los interceptores de OkHttp son decoradores apilados:
  autenticación, registro, reintento, caché.
- **Flujos de entrada y salida.** En Java, un flujo con memoria intermedia
  envuelve a otro flujo; es el ejemplo canónico del patrón.
- **Middleware web.** Cada capa de un servidor envuelve a la siguiente con la
  misma firma.
- **Bases de datos.** Una caché de consultas se coloca delante del cliente real y
  cumple su misma interfaz.
`,
    queEscribes: `
Un decorador con caché y una raíz que lo incorpora:

\`\`\`kotlin
class ItemRepositoryApi(private val fuente: FuenteRemota) : ItemRepository
class ItemRepositoryConCache(private val interno: ItemRepository) : ItemRepository

fun crearViewModel(fuente: FuenteRemota): ItemsViewModel
\`\`\`

Comportamiento exigido del decorador:

1. La primera invocación de \`obtenerTodos\` consulta al repositorio interno y
   conserva el resultado.
2. Las siguientes devuelven lo conservado **sin** volver a consultarlo.
3. Un resultado vacío también se conserva: es una respuesta válida, y consultar
   de nuevo por ella anularía la caché en el caso más frecuente de catálogo
   vacío.
4. Si el repositorio interno lanza un error, **no se conserva nada**: la
   invocación siguiente vuelve a intentarlo.

La raíz debe montar la cadena de forma que el caso de uso reciba el decorador, y
el decorador al repositorio real.

Las reglas de traducción son las del nivel base:
${REGLAS_TRADUCCION}
`,
    pasoAPaso: `
1. Reutiliza el repositorio real del nivel base sin modificarlo. El decorador no
   debe obligar a cambiarlo.
2. Declara el decorador recibiendo **el contrato**, no la clase concreta. Es lo
   que le permite envolver cualquier implementación.
3. Guarda el resultado en una propiedad que admita la ausencia. Distinguir "aún
   no se ha consultado" de "se consultó y no había nada" es justamente la regla
   3, y una lista vacía no sirve para expresar la primera.
4. No captures el error del repositorio interno: dejándolo pasar se cumple la
   regla 4 sin escribir nada.
5. En la raíz, monta el decorador alrededor del repositorio real y entrega el
   decorador al caso de uso.
`,
    erroresTipicos: `
- **Usar la lista vacía como marca de caché sin llenar.** Un catálogo vacío
  volvería a consultarse en cada invocación.
- **Heredar del repositorio real en lugar de envolver un contrato.** El decorador
  dejaría de servir para otras implementaciones.
- **Conservar el resultado cuando la consulta falla.** Un error de red quedaría
  memorizado y la pantalla no se recuperaría nunca.
- **Entregar el repositorio real al caso de uso** y dejar el decorador sin
  conectar. La cadena compila y funciona, pero la caché no llega a usarse.
`,
    comoSeComprueba: `
Las comprobaciones utilizan una fuente que **cuenta cuántas veces se la
consulta**, y muestran el estado final seguido de ese recuento, separados por
\` ; \`.

- **\`consulta_una_sola_vez\`** — se invoca \`cargar\` dos veces sobre el mismo
  ViewModel.
  Debe imprimir \`Abrigo,Camisa|false|- ; 1\`.
  *Verifica:* las reglas 1 y 2, y que el decorador esté conectado en la raíz.
- **\`resultado_vacio_se_conserva\`** — la fuente no devuelve ningún DTO y se
  invoca \`cargar\` dos veces.
  Debe imprimir \`|false|- ; 1\`.
  *Verifica:* la regla 3.
- **\`el_fallo_no_se_conserva\`** — la fuente falla siempre y se invoca \`cargar\`
  dos veces.
  Debe imprimir \`|false|sin conexion ; 2\`.
  *Verifica:* la regla 4.
- **Una comprobación oculta** — una fuente que falla la primera vez y responde la
  segunda.
  *Verifica:* las reglas 4 y 1 en la misma secuencia: tras el error se reintenta,
  y el resultado obtenido entonces sí se conserva.

La comprobación oculta es deducible: combina dos reglas ya enunciadas, sin
introducir ninguna nueva.
`,
    yaDeclarado: YA_DECLARADO,
    plantilla: {
      kotlin: `${CABECERA}

class FuenteContada(private val dtos: List<ItemDto>) : FuenteRemota {
    var consultas = 0
        private set

    override fun leer(): List<ItemDto> {
        consultas++
        return dtos
    }
}

class FuenteContadaQueFalla(private val mensaje: String) : FuenteRemota {
    var consultas = 0
        private set

    override fun leer(): List<ItemDto> {
        consultas++
        throw RuntimeException(mensaje)
    }
}

class FuenteFallaUnaVez(private val dtos: List<ItemDto>) : FuenteRemota {
    var consultas = 0
        private set

    override fun leer(): List<ItemDto> {
        consultas++
        if (consultas == 1) throw RuntimeException("sin conexion")
        return dtos
    }
}

{{solucion}}

fun describir(s: ItemsUiState): String =
    s.items.joinToString(",") { it.name } + "|" + s.cargando.toString() + "|" +
        (s.error ?: "-")

fun main() {
    val dtos = listOf(
        ItemDto("1", "Camisa", "3"),
        ItemDto("2", "Abrigo", "1"),
        ItemDto("3", "Zapato", "0"),
    )
    when (readLine()?.trim() ?: "") {
        "consulta_una_sola_vez" -> {
            val f = FuenteContada(dtos)
            val vm = crearViewModel(f)
            vm.cargar()
            vm.cargar()
            println(describir(vm.estado) + " ; " + f.consultas.toString())
        }
        "resultado_vacio_se_conserva" -> {
            val f = FuenteContada(emptyList())
            val vm = crearViewModel(f)
            vm.cargar()
            vm.cargar()
            println(describir(vm.estado) + " ; " + f.consultas.toString())
        }
        "el_fallo_no_se_conserva" -> {
            val f = FuenteContadaQueFalla("sin conexion")
            val vm = crearViewModel(f)
            vm.cargar()
            vm.cargar()
            println(describir(vm.estado) + " ; " + f.consultas.toString())
        }
        "reintenta_y_luego_guarda" -> {
            val f = FuenteFallaUnaVez(dtos)
            val vm = crearViewModel(f)
            vm.cargar()
            vm.cargar()
            vm.cargar()
            println(describir(vm.estado) + " ; " + f.consultas.toString())
        }
        else -> println("caso desconocido")
    }
}`,
    },
    inicial: {
      kotlin: `// Escribe aquí ItemRepositoryApi, ItemRepositoryConCache y crearViewModel.
// ItemDto, Item, FuenteRemota, ItemRepository, GetItemsUseCase, ItemsUiState
// e ItemsViewModel ya están declarados.
`,
    },
    casos: [
      {
        entrada: 'consulta_una_sola_vez\n',
        salidaEsperada: 'Abrigo,Camisa|false|- ; 1',
        oculto: false,
      },
      {
        entrada: 'resultado_vacio_se_conserva\n',
        salidaEsperada: '|false|- ; 1',
        oculto: false,
      },
      {
        entrada: 'el_fallo_no_se_conserva\n',
        salidaEsperada: '|false|sin conexion ; 2',
        oculto: false,
      },
      {
        entrada: 'reintenta_y_luego_guarda\n',
        salidaEsperada: 'Abrigo,Camisa|false|- ; 2',
        oculto: true,
      },
    ],
    soluciones: {
      kotlin: [
        // Estrategia A: propiedad anulable como marca de caché sin llenar.
        `fun ItemDto.toDomain(): Item = Item(
    id = item_id ?: "",
    name = item_name ?: "sin nombre",
    stock = in_stock?.toIntOrNull() ?: 0,
)

class ItemRepositoryApi(private val fuente: FuenteRemota) : ItemRepository {
    override fun obtenerTodos(): List<Item> =
        fuente.leer().filter { !it.item_id.isNullOrEmpty() }.map { it.toDomain() }
}

class ItemRepositoryConCache(private val interno: ItemRepository) : ItemRepository {
    private var guardado: List<Item>? = null

    override fun obtenerTodos(): List<Item> {
        val yaGuardado = guardado
        if (yaGuardado != null) return yaGuardado
        val obtenido = interno.obtenerTodos()
        guardado = obtenido
        return obtenido
    }
}

fun crearViewModel(fuente: FuenteRemota): ItemsViewModel {
    val real: ItemRepository = ItemRepositoryApi(fuente)
    val conCache: ItemRepository = ItemRepositoryConCache(real)
    return ItemsViewModel(GetItemsUseCase(conCache))
}`,
        // Estrategia B: indicador explícito de caché llena.
        `class ItemRepositoryApi(private val fuente: FuenteRemota) : ItemRepository {
    private fun traducir(dto: ItemDto): Item {
        val nombre = dto.item_name ?: "sin nombre"
        val unidades = dto.in_stock?.toIntOrNull() ?: 0
        return Item(dto.item_id ?: "", nombre, unidades)
    }

    override fun obtenerTodos(): List<Item> {
        val salida = mutableListOf<Item>()
        for (dto in fuente.leer()) {
            val id = dto.item_id
            if (id == null || id.isEmpty()) continue
            salida.add(traducir(dto))
        }
        return salida
    }
}

class ItemRepositoryConCache(private val interno: ItemRepository) : ItemRepository {
    private var lleno = false
    private var guardado: List<Item> = emptyList()

    override fun obtenerTodos(): List<Item> {
        if (lleno) return guardado
        guardado = interno.obtenerTodos()
        lleno = true
        return guardado
    }
}

fun crearViewModel(fuente: FuenteRemota): ItemsViewModel =
    ItemsViewModel(GetItemsUseCase(ItemRepositoryConCache(ItemRepositoryApi(fuente))))`,
      ],
    },
  },
];
