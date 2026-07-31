import type { Ejercicio } from './tipos.js';

/**
 * Concepto 1.1 — Modelo de dominio (Android), en tres niveles.
 *
 * El dominio es un catálogo de artículos. El tipo se llama `Item` porque la
 * arquitectura no depende de qué sea: lo mismo vale para usuarios o facturas.
 */

const CATEGORIA = 'Modelo y capa de datos';
const CAPA = 'Dominio — `domain/model/Item.kt`';

const PROBLEMA = `
Tu app muestra un catálogo. Los datos llegan de una API con la forma que decidió
quien la escribió: nombres en minúscula, fechas como texto, campos que a veces
faltan.

Si esa forma viaja tal cual hasta la pantalla, cualquier cambio en la API te
obliga a tocar la vista. Y al revés: no puedes probar la pantalla sin fabricar
respuestas con el formato exacto del servidor.

El **modelo de dominio** corta eso: es la forma que tu app entiende, decidida por
ti, independiente de quién te dé los datos.
`;

const DE_DONDE_VIENE = `
Separar el modelo de su representación externa es más viejo que las apps
móviles. Eric Evans lo llamó **modelo de dominio** en *Domain-Driven Design*
(2003): el conjunto de tipos que expresan el vocabulario del negocio, sin
contaminar con detalles de infraestructura.

La regla práctica que se deriva: **el dominio no importa nada de fuera.** Si tu
\`Item\` necesitara una anotación de la librería de red o de la base de datos,
habrías atado tu vocabulario a una herramienta concreta.

Que sea \`data class\` y no \`class\` no es cosmético. Te da dos cosas gratis:

- **Igualdad por valor**: dos \`Item\` con los mismos campos son iguales. Sin eso
  tendrías que escribir \`equals\` a mano, y sin \`equals\` no puedes comparar
  estados para saber si la pantalla cambió.
- **Copia con cambios** (\`copy\`): produce un objeto nuevo en vez de mutar el que
  ya tienes. Es lo que hace posible tratar el estado como inmutable, que es la
  base de todo lo que viene después en esta arquitectura.
`;

const DIAGRAMA = `
flowchart LR
    subgraph data["data/"]
        DTO["ItemDto<br/>forma de la API"]
    end
    subgraph domain["domain/"]
        M["Item<br/>lo que escribes"]
    end
    subgraph presentation["presentation/"]
        VM[ItemsViewModel]
    end
    DTO -->|toDomain| M
    M --> VM
    style M fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px
`;

const DONDE_MAS = `
La misma separación aparece en todas partes, con otros nombres:

- **Backend.** Una API REST recibe un JSON, lo convierte a su tipo interno y solo
  entonces aplica reglas. El tipo interno no lleva anotaciones de HTTP.
- **Bases de datos.** El registro de la tabla y el objeto del negocio no son el
  mismo tipo; por eso existen los ORM y los *mappers*.
- **Sistemas con varias fuentes.** Cuando los mismos datos llegan de una API, de
  una caché y de un archivo, el modelo de dominio es lo único común a las tres.
`;

const ERRORES = `
- **Meter en el modelo campos que solo importan a la API** (tokens de
  paginación, códigos de respuesta). El dominio no debería saber que hubo una
  petición.
- **Usar \`class\` en vez de \`data class\`** y perder igualdad y copia. El código
  compila, pero luego comparar estados deja de funcionar y cuesta ver por qué.
- **Representar la ausencia con valores centinela** (\`-1\`, \`""\`) en vez de con
  tipos que la expresen. Lo verás en el nivel reto.
`;

const DRIVER = `{{solucion}}

fun main() {
    val caso = readLine()?.trim() ?: ""
    val a = Item("7", "Camisa", 24, listOf("ropa"))
    when (caso) {
        "campos" -> println("\${a.id}|\${a.name}|\${a.stock}|\${a.tags.joinToString(",")}")
        "igualdad_por_valor" -> println((a == Item("7", "Camisa", 24, listOf("ropa"))).toString())
        "copia_cambiando_stock" -> {
            val vendido = a.copy(stock = 0)
            println("\${vendido.id}|\${vendido.name}|\${vendido.stock}|\${a.stock}")
        }
        "varias_etiquetas" -> {
            val b = Item("8", "Abrigo", 3, listOf("ropa", "invierno"))
            println(b.tags.size.toString() + ":" + b.tags.joinToString("+"))
        }
        else -> println("caso desconocido: " + caso)
    }
}`;

const CASOS = [
  { entrada: 'campos\n', salidaEsperada: '7|Camisa|24|ropa', oculto: false },
  { entrada: 'igualdad_por_valor\n', salidaEsperada: 'true', oculto: false },
  { entrada: 'copia_cambiando_stock\n', salidaEsperada: '7|Camisa|0|24', oculto: false },
  { entrada: 'varias_etiquetas\n', salidaEsperada: '2:ropa+invierno', oculto: true },
];

const SOLUCIONES_BASE = [
  `data class Item(
    val id: String,
    val name: String,
    val stock: Int,
    val tags: List<String>,
)`,
  `data class Item(
    val id: String,
    val name: String,
    val stock: Int,
    val tags: List<String>
) {
    // Igual de válida: un miembro calculado no cambia el contrato de datos.
    val agotado: Boolean get() = stock == 0
}`,
];

const COMPRUEBA = `
El driver construye un \`Item\` y observa cuatro cosas: que los campos estén en el
orden y con el tipo pedidos, que dos instancias iguales se comparen iguales, que
\`copy\` produzca un objeto nuevo **sin tocar el original**, y que la lista de
etiquetas conserve el orden.
`;

export const modeloAndroid: Ejercicio[] = [
  // --- GUIADO ---------------------------------------------------------------
  {
    slugBase: 'mvvm-modelo-android',
    tituloBase: 'Modelo de dominio (Android)',
    nivel: 'guiado',
    categoria: CATEGORIA,
    lenguajes: ['kotlin'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
Te damos la declaración empezada. **Completa los campos que faltan.**

\`\`\`kotlin
data class Item(
    val id: String,
    // faltan: name, stock, tags
)
\`\`\`

El catálogo necesita, en este orden:

| Campo | Tipo | Para qué |
|---|---|---|
| \`id\` | \`String\` | Identificar el artículo |
| \`name\` | \`String\` | Mostrarlo en la lista |
| \`stock\` | \`Int\` | Cuántas unidades quedan |
| \`tags\` | \`List<String>\` | Etiquetas para filtrar |
`,
    pasoAPaso: `
1. Abre la declaración que te damos y fíjate en que ya es \`data class\`, no
   \`class\`. Eso es lo que te dará igualdad y copia.
2. Añade \`name\` como \`String\`, después de \`id\`. **El orden importa**: el driver
   construye el objeto con parámetros posicionales.
3. Añade \`stock\` como \`Int\`.
4. Añade \`tags\` como \`List<String>\`. Fíjate en que es \`List\` y no
   \`MutableList\`: nadie debería poder añadir etiquetas al objeto ya creado.
5. No añadas nada más. Cualquier campo extra que la API te dé pero la app no
   necesite, no pertenece aquí.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    plantilla: { kotlin: DRIVER },
    inicial: {
      kotlin: `data class Item(
    val id: String,
    // TODO: añade name, stock y tags según la tabla del enunciado
)
`,
    },
    casos: CASOS,
    soluciones: { kotlin: SOLUCIONES_BASE },
  },

  // --- BASE -----------------------------------------------------------------
  {
    slugBase: 'mvvm-modelo-android',
    tituloBase: 'Modelo de dominio (Android)',
    nivel: 'base',
    categoria: CATEGORIA,
    lenguajes: ['kotlin'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
Escribe el modelo entero en \`domain/model/Item.kt\`:

\`\`\`kotlin
data class Item(
    val id: String,
    val name: String,
    val stock: Int,
    val tags: List<String>,
)
\`\`\`

Con ese orden de parámetros. Elige tú \`data class\` frente a \`class\`, y \`List\`
frente a \`MutableList\`, sabiendo lo que implica cada uno.
`,
    pasoAPaso: `
1. Declara el tipo con los cuatro campos, en el orden de la firma.
2. Decide si necesitas \`data class\`. Pista: el driver compara dos instancias
   distintas y espera que sean iguales.
3. Decide si \`tags\` debe poder modificarse después de crear el objeto.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    plantilla: { kotlin: DRIVER },
    inicial: {
      kotlin: `// Escribe aquí el modelo Item del enunciado.
// Campos, en orden: id, name, stock, tags
`,
    },
    casos: CASOS,
    soluciones: { kotlin: SOLUCIONES_BASE },
  },

  // --- RETO -----------------------------------------------------------------
  {
    slugBase: 'mvvm-modelo-android',
    tituloBase: 'Modelo de dominio (Android)',
    nivel: 'reto',
    categoria: CATEGORIA,
    lenguajes: ['kotlin'],
    capa: CAPA,
    problema: `
El catálogo crece y aparecen dos situaciones que el modelo actual no sabe
expresar:

- Un artículo puede estar **descatalogado**: sigue existiendo, pero ya no se
  vende.
- Un artículo puede **no tener precio asignado** todavía, que no es lo mismo que
  valer cero.

La tentación es resolverlo con valores centinela: \`stock = -1\` para
descatalogado, \`precio = 0.0\` para "sin precio". Funciona hasta que alguien
suma precios y cuenta los ceros, o filtra por stock y se lleva los -1 por
delante.
`,
    deDondeViene: `
Esto es **hacer imposibles los estados inválidos**, una idea que Yaron Minsky
resumió como *"make illegal states unrepresentable"*. Si el tipo no puede
representar algo que no debería existir, el compilador te impide crearlo.

Un valor centinela hace lo contrario: mete un significado especial dentro del
rango normal del tipo, y a partir de ahí **todo el que lo use tiene que
acordarse** de la excepción. El día que alguien no se acuerde, el error no salta:
se propaga silencioso.

Kotlin te da dos herramientas para esto: los **tipos anulables** (\`Double?\`), que
distinguen "hay un valor" de "no hay", y los **enum o sealed class**, que
enumeran los estados posibles con nombre.
`,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: `
- **Bases de datos.** La diferencia entre \`NULL\` y \`0\` es exactamente esta
  discusión, y por eso \`SUM\` ignora los nulos pero no los ceros.
- **APIs.** Un campo ausente en un JSON no significa lo mismo que un campo con
  valor vacío. Confundirlos es una fuente clásica de bugs de integración.
- **Lenguajes sin nulos.** Rust y Haskell no tienen \`null\`: obligan a usar
  \`Option\`/\`Maybe\`, que es este mismo principio llevado al extremo.
`,
    queEscribes: `
Rediseña \`Item\` para que exprese ambas situaciones **sin valores centinela**. Tú
decides cómo.

El modelo debe seguir teniendo \`id\`, \`name\`, \`stock\` y \`tags\`, y además:

- Un **precio que puede no existir**.
- Un **estado** que distinga disponible de descatalogado.

Y añade una función de nivel superior:

\`\`\`kotlin
fun describir(item: Item): String
\`\`\`

que devuelva, exactamente:

| Situación | Texto |
|---|---|
| Disponible y con precio | \`<name>: <precio>\` — el precio con un decimal |
| Disponible sin precio | \`<name>: sin precio\` |
| Descatalogado | \`<name>: descatalogado\` |
`,
    pasoAPaso: `
1. Decide cómo representas "sin precio". La respuesta idiomática en Kotlin no
   requiere ningún tipo nuevo.
2. Decide cómo representas el estado. Tienes al menos dos opciones razonables;
   elige la que impida construir un artículo en un estado que no existe.
3. Escribe \`describir\` cubriendo las tres situaciones. Si tu representación es
   buena, el compilador te ayudará a no olvidarte de ninguna.
4. Comprueba que "descatalogado" gana sobre el precio: un artículo descatalogado
   se describe así aunque tenga precio.
`,
    erroresTipicos: `
- **Usar \`-1\` o \`0.0\` como marca.** Es justo lo que el ejercicio pide evitar.
- **Un \`Boolean\` llamado \`descatalogado\`.** Funciona hoy, pero cuando aparezca
  un tercer estado (\`agotado\`, \`próximamente\`) tendrás dos booleanos y cuatro
  combinaciones, dos de ellas imposibles.
- **Olvidar el orden de precedencia.** Descatalogado se describe igual tenga
  precio o no.
`,
    comoSeComprueba: `
El driver construye artículos en las tres situaciones y compara el texto de
\`describir\`. No mira cómo lo representaste por dentro: si el comportamiento es
correcto, tu diseño vale.
`,
    plantilla: {
      kotlin: `{{solucion}}

fun main() {
    when (readLine()?.trim() ?: "") {
        "disponible_con_precio" -> println(describir(crear("1", "Camisa", 24.5)))
        "disponible_sin_precio" -> println(describir(crear("2", "Abrigo", null)))
        "descatalogado_con_precio" -> println(describir(descatalogar(crear("3", "Bufanda", 9.0))))
        "descatalogado_sin_precio" -> println(describir(descatalogar(crear("4", "Gorro", null))))
        else -> println("caso desconocido")
    }
}`,
    },
    inicial: {
      kotlin: `// Rediseña Item según el enunciado, sin valores centinela.
//
// El driver construye artículos con estas dos funciones, que también son tuyas:
//
//   fun crear(id: String, name: String, precio: Double?): Item
//   fun descatalogar(item: Item): Item
//
// y los describe con:
//
//   fun describir(item: Item): String
`,
    },
    casos: [
      { entrada: 'disponible_con_precio\n', salidaEsperada: 'Camisa: 24.5', oculto: false },
      { entrada: 'disponible_sin_precio\n', salidaEsperada: 'Abrigo: sin precio', oculto: false },
      { entrada: 'descatalogado_con_precio\n', salidaEsperada: 'Bufanda: descatalogado', oculto: true },
      { entrada: 'descatalogado_sin_precio\n', salidaEsperada: 'Gorro: descatalogado', oculto: true },
    ],
    soluciones: {
      kotlin: [
        // Estrategia A: sealed class para el estado.
        `sealed class Estado {
    object Disponible : Estado()
    object Descatalogado : Estado()
}

data class Item(
    val id: String,
    val name: String,
    val stock: Int = 0,
    val tags: List<String> = emptyList(),
    val precio: Double? = null,
    val estado: Estado = Estado.Disponible,
)

fun crear(id: String, name: String, precio: Double?): Item =
    Item(id = id, name = name, precio = precio)

fun descatalogar(item: Item): Item = item.copy(estado = Estado.Descatalogado)

fun describir(item: Item): String = when (item.estado) {
    is Estado.Descatalogado -> "\${item.name}: descatalogado"
    is Estado.Disponible -> {
        val p = item.precio
        if (p == null) "\${item.name}: sin precio" else "\${item.name}: " + String.format("%.1f", p)
    }
}`,
        // Estrategia B: enum para el estado.
        `enum class Estado { DISPONIBLE, DESCATALOGADO }

data class Item(
    val id: String,
    val name: String,
    val stock: Int = 0,
    val tags: List<String> = emptyList(),
    val precio: Double? = null,
    val estado: Estado = Estado.DISPONIBLE,
)

fun crear(id: String, name: String, precio: Double?): Item = Item(id, name, 0, emptyList(), precio)

fun descatalogar(item: Item): Item = item.copy(estado = Estado.DESCATALOGADO)

fun describir(item: Item): String {
    if (item.estado == Estado.DESCATALOGADO) return item.name + ": descatalogado"
    val p = item.precio ?: return item.name + ": sin precio"
    return item.name + ": " + String.format("%.1f", p)
}`,
      ],
    },
  },
];
