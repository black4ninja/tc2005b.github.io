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
Este ejercicio construye **una sola pieza**: el tipo \`Item\`.

La pieza tiene dos vecinos, los que aparecen en el diagrama:

- **Quien la produce**: un traductor (\`toDomain\`) que convierte la respuesta de
  la API en \`Item\`. Corresponde a otro ejercicio.
- **Quien la consume**: el ViewModel, que lee \`Item\` para determinar qué se
  muestra. Corresponde también a otro ejercicio.

El problema que resuelve \`Item\` es de traducción. La API entrega los datos con
la forma que definió quien la escribió: nombres en minúscula, números
representados como texto, campos ausentes. Si esa forma llegara sin traducir
hasta el ViewModel, cualquier cambio en la API obligaría a modificarlo.

\`Item\` define la forma que utiliza la aplicación. Para escribirlo no se
requiere conocer el funcionamiento de sus vecinos.
`;

const DE_DONDE_VIENE = `
La separación entre el modelo y su representación externa es anterior al
desarrollo móvil. Eric Evans la describe en *Domain-Driven Design* (2003) bajo el
nombre de **modelo de dominio**: el conjunto de tipos que expresan el vocabulario
del negocio, sin detalles de infraestructura.

De ahí se deriva una regla práctica: **el dominio no depende de nada externo.**
Si \`Item\` requiriera una anotación de la librería de red o de la base de datos,
el vocabulario del negocio quedaría atado a una herramienta concreta.

### Código generado por el compilador

La declaración de este ejercicio no contiene instrucciones: son cuatro campos,
sin \`if\`, \`return\` ni \`println\`. Aun así, las comprobaciones producen salida.
El motivo es que la palabra \`data\` indica al compilador de Kotlin que **genere,
a partir de los campos del constructor, métodos que no aparecen en el código
fuente**.

Cuatro de ellos son relevantes aquí:

- \`equals\` — compara **campo por campo**, en lugar de comparar la identidad en
  memoria. Por eso \`==\` entre dos \`Item\` con los mismos valores devuelve
  \`true\` aunque sean objetos distintos.
- \`hashCode\` — coherente con \`equals\`; permite usar el tipo en un \`Set\` y como
  clave de un \`Map\`.
- \`copy\` — construye un objeto nuevo con los cambios indicados y deja intacto el
  original.
- \`toString\` — devuelve un texto legible con los campos, en lugar de
  \`Item@3f2a1b\`.

La comparación con \`class\`, declarando los mismos campos, delimita qué aporta
cada parte:

| Operación de la comprobación | Con \`data class\` | Con \`class\` |
|---|---|---|
| Leer \`a.id\`, \`a.name\`… | funciona | funciona |
| \`a == b\` con los mismos valores | \`true\` | \`false\`: compara identidad, y son dos objetos |
| \`a.copy(stock = 0)\` | funciona | **no compila**: \`copy\` no existe |

Los campos se declaran de forma explícita; el comportamiento que se comprueba lo
aporta \`data\`.

### Función en el resto de la arquitectura

- **Igualdad por valor**: sin \`equals\` no es posible determinar si un estado
  nuevo difiere del anterior, que es la condición para decidir si la pantalla
  debe redibujarse.
- **Copia con cambios**: construir un objeto nuevo en lugar de modificar el
  existente permite tratar el estado como inmutable, base de las capas
  posteriores.
`;

const DIAGRAMA = `
flowchart LR
    subgraph data["data/"]
        DTO["ItemDto<br/>forma de la API"]
    end
    subgraph domain["domain/"]
        M["Item<br/>pieza de este ejercicio"]
    end
    subgraph presentation["presentation/"]
        VM[ItemsViewModel]
    end
    DTO -->|toDomain| M
    M --> VM
    style M fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px
`;

const DONDE_MAS = `
La misma separación aparece en otros contextos, con otros nombres:

- **Backend.** Una API REST recibe un JSON, lo convierte a su tipo interno y solo
  entonces aplica reglas. El tipo interno no lleva anotaciones de HTTP.
- **Bases de datos.** El registro de la tabla y el objeto del negocio no son el
  mismo tipo; de esa distinción provienen los ORM y los *mappers*.
- **Sistemas con varias fuentes.** Cuando los mismos datos llegan de una API, de
  una caché y de un archivo, el modelo de dominio es el único elemento común a
  las tres.
`;

const ERRORES = `
- **Incluir en el modelo campos que solo conciernen a la API** (tokens de
  paginación, códigos de respuesta). El dominio no debería registrar que hubo una
  petición.
- **Declarar \`class\` en lugar de \`data class\`**, con la consiguiente pérdida de
  igualdad y copia. El código compila, pero la comparación de estados deja de
  funcionar y el origen del fallo resulta difícil de localizar.
- **Representar la ausencia mediante valores centinela** (\`-1\`, \`""\`) en lugar
  de tipos que la expresen. Se aborda en el nivel reto.
`;

const DRIVER = `{{solucion}}

fun main() {
    val caso = readLine()?.trim() ?: ""
    val a = Item("7", "Camisa", 24, listOf("ropa"))
    when (caso) {
        "campos_en_orden" -> println("\${a.id}|\${a.name}|\${a.stock}|\${a.tags.joinToString(",")}")
        "dos_items_iguales" -> println((a == Item("7", "Camisa", 24, listOf("ropa"))).toString())
        "copiar_no_toca_el_original" -> {
            val vendido = a.copy(stock = 0)
            println("\${vendido.id}|\${vendido.name}|\${vendido.stock}|\${a.stock}")
        }
        "lista_conserva_el_orden" -> {
            val b = Item("8", "Abrigo", 3, listOf("ropa", "invierno"))
            println(b.tags.size.toString() + ":" + b.tags.joinToString("+"))
        }
        else -> println("caso desconocido: " + caso)
    }
}`;

// TODOS visibles a propósito. En un ejercicio que solo declara un tipo no hay
// comportamiento que generalizar: un caso oculto no comprobaría comprensión,
// solo escondería un dato que el alumno no tiene forma de deducir.
const CASOS = [
  { entrada: 'campos_en_orden\n', salidaEsperada: '7|Camisa|24|ropa', oculto: false },
  { entrada: 'dos_items_iguales\n', salidaEsperada: 'true', oculto: false },
  { entrada: 'copiar_no_toca_el_original\n', salidaEsperada: '7|Camisa|0|24', oculto: false },
  { entrada: 'lista_conserva_el_orden\n', salidaEsperada: '2:ropa+invierno', oculto: false },
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
Cuatro comprobaciones, **todas visibles**. Ninguna está oculta: en una
declaración de tipo no hay comportamiento que generalizar, de modo que ocultar
una comprobación no verificaría la comprensión del concepto.

Cada una indica además **qué parte de la declaración verifica**.

- **\`campos_en_orden\`** — construye \`Item("7", "Camisa", 24, listOf("ropa"))\`
  y muestra sus cuatro campos, separados por barras verticales.
  Debe imprimir \`7|Camisa|24|ropa\`.
  *Verifica:* que los campos existan, con esos tipos y **en ese orden**. El
  objeto se construye por posición, no por nombre.
- **\`dos_items_iguales\`** — construye **dos** \`Item\` distintos con los mismos
  valores y los compara con \`==\`.
  Debe imprimir \`true\`.
  *Verifica:* el \`equals\` generado por \`data\`. Con \`class\` el resultado sería
  \`false\`.
- **\`copiar_no_toca_el_original\`** — ejecuta \`copy(stock = 0)\` y muestra los
  campos de la copia y, en último lugar, el stock del original.
  Debe imprimir \`7|Camisa|0|24\`: el \`0\` corresponde a la copia y el \`24\` al
  original, que no se modificó.
  *Verifica:* el \`copy\` generado por \`data\` y que los campos sean \`val\`.
- **\`lista_conserva_el_orden\`** — construye un \`Item\` con dos etiquetas y
  muestra cuántas hay y en qué orden.
  Debe imprimir \`2:ropa+invierno\`.
  *Verifica:* que \`tags\` sea una lista, y no un campo suelto ni un \`Set\`. Un
  \`Set\` no garantiza el orden.

Cuando una comprobación falla, el veredicto indica el valor esperado y el
obtenido.
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
La declaración se proporciona iniciada. **Completa los campos que faltan.**

\`\`\`kotlin
data class Item(
    val id: String,
    // faltan: name, stock, tags
)
\`\`\`

El catálogo requiere los siguientes campos, en este orden:

| Campo | Tipo | Función |
|---|---|---|
| \`id\` | \`String\` | Identificar el artículo |
| \`name\` | \`String\` | Mostrarlo en la lista |
| \`stock\` | \`Int\` | Unidades disponibles |
| \`tags\` | \`List<String>\` | Etiquetas para filtrar |
`,
    pasoAPaso: `
1. Observa que la declaración proporcionada ya es \`data class\` y no \`class\`. De
   ahí provienen la igualdad y la copia.
2. Añade \`name\` como \`String\`, después de \`id\`. **El orden es significativo**:
   el objeto se construye con parámetros posicionales.
3. Añade \`stock\` como \`Int\`.
4. Añade \`tags\` como \`List<String>\`. El tipo es \`List\` y no \`MutableList\`: no
   debe ser posible añadir etiquetas a un objeto ya creado.
5. No añadas ningún campo adicional. Los campos que la API proporciona pero la
   aplicación no utiliza no pertenecen al modelo de dominio.
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

Con ese orden de parámetros. La elección entre \`data class\` y \`class\`, y entre
\`List\` y \`MutableList\`, queda a criterio propio, con conocimiento de lo que
implica cada una.
`,
    pasoAPaso: `
1. Declara el tipo con los cuatro campos, en el orden de la firma.
2. Determina si se requiere \`data class\`. Considera que una de las
   comprobaciones compara dos instancias distintas y espera que resulten
   iguales.
3. Determina si \`tags\` debe poder modificarse después de crear el objeto.
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

Una solución frecuente consiste en emplear valores centinela: \`stock = -1\` para
descatalogado y \`precio = 0.0\` para "sin precio". El resultado es correcto hasta
que un cálculo suma precios e incluye los ceros, o un filtro por stock incorpora
los valores -1.
`,
    deDondeViene: `
El principio aplicable es **hacer irrepresentables los estados inválidos**,
formulado por Yaron Minsky como *"make illegal states unrepresentable"*. Si el
tipo no puede representar una situación que no debería existir, el compilador
impide construirla.

Un valor centinela produce el efecto contrario: introduce un significado especial
dentro del rango normal del tipo, de modo que **todo el código que lo utilice
debe contemplar la excepción**. Cuando algún punto del código la omite, el error
no se manifiesta de inmediato, sino que se propaga.

Kotlin ofrece dos mecanismos para este caso: los **tipos anulables** (\`Double?\`),
que distinguen la presencia de un valor de su ausencia, y los **enum o sealed
class**, que enumeran con nombre los estados posibles.
`,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: `
- **Bases de datos.** La diferencia entre \`NULL\` y \`0\` es exactamente esta
  discusión, y por eso \`SUM\` ignora los nulos pero no los ceros.
- **APIs.** Un campo ausente en un JSON no significa lo mismo que un campo con
  valor vacío. Confundirlos es una fuente clásica de bugs de integración.
- **Lenguajes sin nulos.** Rust y Haskell carecen de \`null\` y obligan a emplear
  \`Option\`/\`Maybe\`, aplicación estricta de este mismo principio.
`,
    queEscribes: `
Rediseña \`Item\` para que exprese ambas situaciones **sin valores centinela**. La
representación queda a criterio propio.

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
1. Determina la representación de "sin precio". La forma idiomática en Kotlin no
   requiere declarar ningún tipo nuevo.
2. Determina la representación del estado. Existen al menos dos opciones
   razonables; conviene elegir la que impida construir un artículo en un estado
   inexistente.
3. Escribe \`describir\` cubriendo las tres situaciones. Con una representación
   adecuada, el compilador señala los casos no contemplados.
4. Verifica la precedencia: un artículo descatalogado se describe como tal
   aunque tenga precio asignado.
`,
    erroresTipicos: `
- **Emplear \`-1\` o \`0.0\` como marca.** Es la práctica que el ejercicio pide
  evitar.
- **Declarar un \`Boolean\` llamado \`descatalogado\`.** Resulta suficiente con dos
  estados, pero al incorporar un tercero (\`agotado\`, \`próximamente\`) se obtienen
  dos booleanos y cuatro combinaciones, dos de ellas imposibles.
- **Omitir el orden de precedencia.** La descripción de un artículo
  descatalogado no depende de si tiene precio.
`,
    comoSeComprueba: `
Las comprobaciones construyen artículos en las tres situaciones y comparan el
texto devuelto por \`describir\`. La representación interna no se inspecciona:
cualquier diseño con el comportamiento correcto se considera válido.
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
// El programa de comprobación construye los artículos con estas dos funciones,
// que también deben escribirse aquí:
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
