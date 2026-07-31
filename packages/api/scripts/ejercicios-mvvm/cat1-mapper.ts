import type { Ejercicio } from './tipos.js';

/** Firmas de lo ya proporcionado. Sin cuerpos: son solución de otros ejercicios. */
const YA_DECLARADO = {
  kotlin: `data class Item(val id: String, val name: String, val stock: Int, val tags: List<String>)

data class ItemDto(
    val item_id: String?,
    val item_name: String?,
    val in_stock: String?,
    val tag_list: List<String>?,
)`,
};


/**
 * Concepto 1.3 — Mapper: del DTO al modelo de dominio (Android), en tres niveles.
 *
 * Es el vecino "productor" del ejercicio 1.1: allí se declara `Item`, aquí se
 * escribe quien lo construye. El orden entre ambos no es una dependencia real
 * —el enunciado se entiende suelto— pero leerlos seguidos cierra la pareja.
 */

const CATEGORIA = 'Modelo y capa de datos';
const CAPA = 'Datos — `data/mapper/ItemMapper.kt`';

const PROBLEMA = `
Este ejercicio construye **una sola pieza**: la función que convierte un
\`ItemDto\` en un \`Item\`.

La pieza tiene dos vecinos, los que aparecen en el diagrama:

- **Quien la invoca**: el repositorio, que recibe los DTO de la API y los
  traduce antes de devolverlos. Corresponde a otro ejercicio.
- **Qué produce**: el tipo \`Item\` del dominio, declarado en otro ejercicio. Aquí
  se proporciona ya escrito.

Los dos tipos existen porque describen cosas distintas. \`ItemDto\` describe **lo
que la API envía**: nombres en \`snake_case\`, números representados como texto,
campos que pueden faltar. \`Item\` describe **lo que la aplicación necesita**:
nombres idiomáticos, tipos exactos y ningún valor ausente.

La distancia entre ambas descripciones es el trabajo de esta función.
`;

const DE_DONDE_VIENE = `
La traducción entre una representación externa y una interna recibe el nombre de
**Data Mapper**, catalogado por Martin Fowler en *Patterns of Enterprise
Application Architecture* (2002). Su definición es una capa que transfiere datos
entre dos modelos manteniéndolos independientes entre sí.

La propiedad relevante es la independencia. Sin mapper, el formato de la API se
propaga por todo el código que lo consume, y cualquier cambio en ese formato
obliga a modificar cada punto que lo toca. Con mapper, el cambio queda confinado
a una función.

### Dónde se absorben las diferencias

Un mapper concentra tres decisiones que, de otro modo, se repartirían por el
resto del sistema:

- **Conversión de tipo.** El JSON transporta \`"24"\` como texto; el dominio
  requiere un \`Int\`. La conversión ocurre una vez, en la frontera.
- **Valores ausentes.** Un campo puede faltar en la respuesta. El dominio no
  admite ausencias, de modo que el mapper decide qué valor ocupa su lugar.
- **Datos no válidos.** El texto \`"muchos"\` no es un número. La función debe
  definir un comportamiento para ese caso, en lugar de propagar una excepción a
  quien la invoca.

Estas tres decisiones son el motivo por el que el mapper existe como pieza
propia y no como un constructor del modelo.
`;

const DIAGRAMA = `
flowchart LR
    subgraph data["data/"]
        DTO["ItemDto<br/>forma de la API"]
        MAP["toDomain()<br/>pieza de este ejercicio"]
        REPO[ItemRepository]
    end
    subgraph domain["domain/"]
        M[Item]
    end
    DTO --> MAP
    MAP --> M
    REPO --> MAP
    style MAP fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px
`;

const DONDE_MAS = `
- **Backend.** Un servicio que consume otro servicio realiza exactamente esta
  traducción antes de aplicar sus reglas. El tipo interno nunca es el tipo de la
  respuesta ajena.
- **Bases de datos.** La conversión entre el registro de una tabla y el objeto
  del negocio es un mapper; los ORM lo automatizan sin eliminar el concepto.
- **Formularios web.** Los datos de un formulario llegan siempre como texto y se
  convierten a los tipos del modelo en un único punto, antes de validarlos.
- **Migraciones de versión.** Cuando conviven dos versiones de una API, cada una
  tiene su mapper y el dominio permanece invariable.
`;

const ERRORES = `
- **Propagar el DTO más allá de esta capa.** Si el repositorio devuelve
  \`ItemDto\`, el mapper deja de cumplir su función y los nombres de la API
  alcanzan la interfaz.
- **Lanzar una excepción ante un dato no válido.** Quien invoca la función
  raramente puede recuperarse de ella. El mapper define un valor por defecto y
  documenta cuál es.
- **Incorporar reglas de negocio.** Descartar artículos, ordenarlos o calcular
  totales corresponde a capas superiores. El mapper traduce; no decide.
- **Duplicar la traducción.** Cuando el mismo DTO se convierte en dos lugares
  distintos, ambos dejan de coincidir en cuanto uno cambia.
`;

const DRIVER = `data class Item(
    val id: String,
    val name: String,
    val stock: Int,
    val tags: List<String>,
)

data class ItemDto(
    val item_id: String?,
    val item_name: String?,
    val in_stock: String?,
    val tag_list: List<String>?,
)

{{solucion}}

fun main() {
    val caso = readLine()?.trim() ?: ""
    fun mostrar(i: Item) = println("\${i.id}|\${i.name}|\${i.stock}|\${i.tags.size}")
    when (caso) {
        "traduce_todos_los_campos" ->
            mostrar(ItemDto("7", "Camisa", "24", listOf("ropa")).toDomain())
        "stock_llega_como_texto" ->
            mostrar(ItemDto("8", "Abrigo", "3", listOf("ropa", "invierno")).toDomain())
        "campos_ausentes" ->
            mostrar(ItemDto(null, null, null, null).toDomain())
        "stock_no_numerico" ->
            mostrar(ItemDto("9", "Gorro", "muchos", listOf("ropa")).toDomain())
        else -> println("caso desconocido: " + caso)
    }
}`;

// `stock_no_numerico` está oculto porque la tabla de correspondencias del
// enunciado enuncia la regla: es deducible sin haberlo visto.
const CASOS = [
  { entrada: 'traduce_todos_los_campos\n', salidaEsperada: '7|Camisa|24|1', oculto: false },
  { entrada: 'stock_llega_como_texto\n', salidaEsperada: '8|Abrigo|3|2', oculto: false },
  { entrada: 'campos_ausentes\n', salidaEsperada: '|sin nombre|0|0', oculto: false },
  { entrada: 'stock_no_numerico\n', salidaEsperada: '9|Gorro|0|1', oculto: true },
];

const TABLA = `
| Campo del DTO | Campo del dominio | Regla |
|---|---|---|
| \`item_id\` | \`id\` | Si falta, cadena vacía |
| \`item_name\` | \`name\` | Si falta, \`sin nombre\` |
| \`in_stock\` | \`stock\` | Texto a entero. Si falta o no es un número, \`0\` |
| \`tag_list\` | \`tags\` | Si falta, lista vacía |
`;

const SOLUCIONES = [
  // Estrategia A: operador elvis sobre cada campo.
  `fun ItemDto.toDomain(): Item = Item(
    id = item_id ?: "",
    name = item_name ?: "sin nombre",
    stock = in_stock?.toIntOrNull() ?: 0,
    tags = tag_list ?: emptyList(),
)`,
  // Estrategia B: cuerpo con bloque y variables intermedias.
  `fun ItemDto.toDomain(): Item {
    val id = if (item_id == null) "" else item_id
    val nombre = if (item_name == null) "sin nombre" else item_name
    var unidades = 0
    if (in_stock != null) {
        val n = in_stock.toIntOrNull()
        if (n != null) unidades = n
    }
    val etiquetas = tag_list.orEmpty()
    return Item(id, nombre, unidades, etiquetas)
}`,
];

const COMPRUEBA = `
Cuatro comprobaciones. Cada una construye un \`ItemDto\`, invoca \`toDomain()\` y
muestra el resultado con el formato \`id|name|stock|número de etiquetas\`.

- **\`traduce_todos_los_campos\`** — un DTO con los cuatro campos presentes y
  correctos.
  Debe imprimir \`7|Camisa|24|1\`.
  *Verifica:* la correspondencia entre campos y la conversión de \`"24"\` a
  entero.
- **\`stock_llega_como_texto\`** — un DTO con dos etiquetas.
  Debe imprimir \`8|Abrigo|3|2\`.
  *Verifica:* que las etiquetas se transfieran completas, sin recortar la lista.
- **\`campos_ausentes\`** — un DTO con los cuatro campos a \`null\`.
  Debe imprimir \`|sin nombre|0|0\`. El primer valor está vacío porque \`id\` toma
  la cadena vacía; el texto \`sin nombre\` ocupa el lugar del nombre.
  *Verifica:* los valores por defecto de la tabla de correspondencias.
- **Una comprobación oculta** — aplica la última regla de la tabla: qué ocurre
  cuando \`in_stock\` contiene un texto que no representa un número.
  *Verifica:* que la conversión no lance una excepción.

La comprobación oculta es deducible: la tabla de correspondencias enuncia la
regla que la determina.
`;

export const mapperAndroid: Ejercicio[] = [
  // --- GUIADO ---------------------------------------------------------------
  {
    slugBase: 'mvvm-mapper',
    tituloBase: 'Mapper: del DTO al modelo de dominio',
    nivel: 'guiado',
    categoria: CATEGORIA,
    lenguajes: ['kotlin'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
Los dos tipos se proporcionan ya declarados:

\`\`\`kotlin
data class Item(val id: String, val name: String, val stock: Int, val tags: List<String>)

data class ItemDto(
    val item_id: String?,
    val item_name: String?,
    val in_stock: String?,
    val tag_list: List<String>?,
)
\`\`\`

Escribe la función de extensión que los relaciona:

\`\`\`kotlin
fun ItemDto.toDomain(): Item
\`\`\`

Correspondencia entre campos:
${TABLA}
`,
    pasoAPaso: `
1. Declara la función como extensión de \`ItemDto\`. Dentro de ella, los campos
   del DTO son accesibles por su nombre, sin prefijo.
2. Asigna \`id\` a partir de \`item_id\`. El campo del DTO admite \`null\` y el del
   dominio no, de modo que se requiere un valor para el caso ausente.
3. Asigna \`name\` a partir de \`item_name\`, con \`sin nombre\` como valor ausente.
4. Convierte \`in_stock\` a entero. La conversión debe contemplar dos situaciones
   distintas: el campo ausente y el campo presente con un texto que no es un
   número. Kotlin dispone de \`toIntOrNull()\`, que devuelve \`null\` en lugar de
   lanzar una excepción.
5. Asigna \`tags\` a partir de \`tag_list\`, con la lista vacía como valor ausente.
6. No añadas ninguna otra operación. Filtrar, ordenar o transformar los datos
   corresponde a otras capas.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    yaDeclarado: YA_DECLARADO,
    plantilla: { kotlin: DRIVER },
    inicial: {
      kotlin: `fun ItemDto.toDomain(): Item = Item(
    id = "",             // TODO: tomar item_id
    name = "",           // TODO: tomar item_name, con "sin nombre" si falta
    stock = 0,           // TODO: in_stock llega como texto
    tags = emptyList(),  // TODO: tomar tag_list
)
`,
    },
    casos: CASOS,
    soluciones: { kotlin: SOLUCIONES },
  },

  // --- BASE -----------------------------------------------------------------
  {
    slugBase: 'mvvm-mapper',
    tituloBase: 'Mapper: del DTO al modelo de dominio',
    nivel: 'base',
    categoria: CATEGORIA,
    lenguajes: ['kotlin'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
\`Item\` e \`ItemDto\` se proporcionan ya declarados, con estas firmas:

\`\`\`kotlin
data class Item(val id: String, val name: String, val stock: Int, val tags: List<String>)

data class ItemDto(
    val item_id: String?,
    val item_name: String?,
    val in_stock: String?,
    val tag_list: List<String>?,
)
\`\`\`

Escribe en \`data/mapper/ItemMapper.kt\`:

\`\`\`kotlin
fun ItemDto.toDomain(): Item
\`\`\`

Correspondencia entre campos:
${TABLA}
`,
    pasoAPaso: `
1. Resuelve los cuatro campos según la tabla de correspondencias.
2. Presta atención a que \`in_stock\` presenta dos formas de fallo distintas: el
   campo ausente y el texto que no representa un número. Ambas conducen al mismo
   resultado, pero requieren comprobaciones distintas.
3. Mantén la función libre de reglas de negocio.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    yaDeclarado: YA_DECLARADO,
    plantilla: { kotlin: DRIVER },
    inicial: {
      kotlin: `// Escribe aquí la función toDomain() según la tabla del enunciado.
// Los tipos Item e ItemDto ya están declarados.
`,
    },
    casos: CASOS,
    soluciones: { kotlin: SOLUCIONES },
  },

  // --- RETO -----------------------------------------------------------------
  {
    slugBase: 'mvvm-mapper',
    tituloBase: 'Mapper: del DTO al modelo de dominio',
    nivel: 'reto',
    categoria: CATEGORIA,
    lenguajes: ['kotlin'],
    capa: CAPA,
    problema: `
La API no devuelve un artículo, sino una lista, y esa lista contiene entradas
inutilizables: registros sin identificador, o con el identificador repetido a
causa de un error de paginación en el servidor.

Un artículo sin identificador no puede mostrarse ni seleccionarse: no hay forma
de referirse a él. Un identificador repetido produce dos filas indistinguibles
en la interfaz.

La decisión relevante es **dónde se descartan** esas entradas. Si el descarte
ocurre en la interfaz, cada pantalla debe repetirlo. Si ocurre al traducir, el
resto del sistema recibe una lista en la que ese problema ya no existe.
`,
    deDondeViene: `
El principio aplicable es la **validación en la frontera**: los datos se
verifican en el punto en que entran al sistema, no en cada punto que los
utiliza. Alexis King lo formuló como *"parse, don't validate"*: en lugar de
comprobar repetidamente que un dato es correcto, se transforma una sola vez en
un tipo cuya existencia ya garantiza que lo es.

Aplicado a este caso: después del mapper, ningún \`Item\` carece de identificador.
Esa garantía no requiere comprobarse de nuevo, porque no existe forma de
construir un \`Item\` que la incumpla.

La alternativa —dejar pasar los registros defectuosos y comprobarlos más
adelante— distribuye la misma comprobación por todo el sistema y hace que un
punto olvidado se manifieste como un error de interfaz difícil de localizar.
`,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: `
- **Procesos de importación.** La carga de un CSV descarta o corrige las filas
  defectuosas en la lectura, no en cada consulta posterior.
- **Colas de mensajes.** Un consumidor descarta los mensajes mal formados al
  recibirlos y los deriva a una cola de errores, en lugar de propagarlos.
- **Validación de formularios.** Los datos se convierten a los tipos del modelo
  una vez; a partir de ese punto, el resto del código opera sobre valores ya
  correctos.
`,
    queEscribes: `
Además de la conversión de un elemento, la de una lista completa:

\`\`\`kotlin
fun ItemDto.toDomain(): Item
fun List<ItemDto>.toDomain(): List<Item>
\`\`\`

La conversión de la lista aplica dos reglas:

1. **Descarta** los DTO cuyo \`item_id\` sea \`null\` o cadena vacía.
2. Ante identificadores repetidos, **conserva la primera aparición** y descarta
   las siguientes.

El orden de los elementos restantes se mantiene. Las reglas de correspondencia
por campo son las del nivel base:
${TABLA}
`,
    pasoAPaso: `
1. Escribe primero la conversión de un elemento. La conversión de la lista se
   apoya en ella.
2. Aplica el descarte **antes** de traducir: un DTO sin identificador no llega a
   convertirse en \`Item\`.
3. Resuelve los identificadores repetidos conservando el orden. Kotlin dispone de
   \`distinctBy\`, que conserva la primera aparición de cada clave.
4. Verifica el caso de una lista en la que todos los elementos se descartan: el
   resultado es una lista vacía, no un error.
`,
    erroresTipicos: `
- **Descartar después de traducir.** El resultado coincide, pero se convierten
  elementos que van a eliminarse y la condición de descarte queda expresada sobre
  el tipo equivocado.
- **Eliminar duplicados con un \`Set\`.** Un \`Set\` no garantiza el orden, y la
  comprobación de orden falla.
- **Considerar válida la cadena vacía.** Un \`item_id\` con valor \`""\` no
  identifica nada, aunque no sea \`null\`.
- **Descartar también los artículos sin nombre.** El enunciado no lo pide: un
  artículo sin nombre puede mostrarse con el valor por defecto, mientras que uno
  sin identificador no puede mostrarse en absoluto.
`,
    comoSeComprueba: `
Las comprobaciones construyen listas de DTO e imprimen el resultado con el
formato \`número de elementos:identificadores separados por comas\`.

- **\`descarta_sin_id\`** — una lista de tres elementos en la que el segundo
  tiene \`item_id\` a \`null\`.
  Debe imprimir \`2:1,3\`.
- **\`descarta_id_vacio\`** — el elemento intermedio tiene \`item_id\` con valor
  \`""\`.
  Debe imprimir \`2:1,3\`.
- **\`conserva_la_primera_de_las_repetidas\`** — dos elementos comparten
  identificador.
  Debe imprimir \`2:1,2\`.
- **Una comprobación oculta** — combina las reglas anteriores sobre una lista en
  la que no sobrevive ningún elemento. El formato de salida indica que, en ese
  caso, se imprime el recuento seguido de una lista vacía.

La comprobación oculta es deducible: aplica las dos reglas del enunciado al caso
límite que menciona el paso 4.
`,
    yaDeclarado: YA_DECLARADO,
    plantilla: {
      kotlin: `data class Item(
    val id: String,
    val name: String,
    val stock: Int,
    val tags: List<String>,
)

data class ItemDto(
    val item_id: String?,
    val item_name: String?,
    val in_stock: String?,
    val tag_list: List<String>?,
)

{{solucion}}

fun main() {
    val caso = readLine()?.trim() ?: ""
    fun dto(id: String?, n: String) = ItemDto(id, n, "1", listOf("ropa"))
    fun mostrar(l: List<Item>) = println(l.size.toString() + ":" + l.joinToString(",") { it.id })
    when (caso) {
        "descarta_sin_id" ->
            mostrar(listOf(dto("1", "A"), dto(null, "B"), dto("3", "C")).toDomain())
        "descarta_id_vacio" ->
            mostrar(listOf(dto("1", "A"), dto("", "B"), dto("3", "C")).toDomain())
        "conserva_la_primera_de_las_repetidas" ->
            mostrar(listOf(dto("1", "A"), dto("2", "B"), dto("1", "C")).toDomain())
        "todos_descartados" ->
            mostrar(listOf(dto(null, "A"), dto("", "B")).toDomain())
        else -> println("caso desconocido: " + caso)
    }
}`,
    },
    inicial: {
      kotlin: `// Escribe aquí las dos funciones del enunciado.
// Los tipos Item e ItemDto ya están declarados.
//
//   fun ItemDto.toDomain(): Item
//   fun List<ItemDto>.toDomain(): List<Item>
`,
    },
    casos: [
      { entrada: 'descarta_sin_id\n', salidaEsperada: '2:1,3', oculto: false },
      { entrada: 'descarta_id_vacio\n', salidaEsperada: '2:1,3', oculto: false },
      {
        entrada: 'conserva_la_primera_de_las_repetidas\n',
        salidaEsperada: '2:1,2',
        oculto: false,
      },
      { entrada: 'todos_descartados\n', salidaEsperada: '0:', oculto: true },
    ],
    soluciones: {
      kotlin: [
        // Estrategia A: cadena de operadores sobre la colección.
        `fun ItemDto.toDomain(): Item = Item(
    id = item_id ?: "",
    name = item_name ?: "sin nombre",
    stock = in_stock?.toIntOrNull() ?: 0,
    tags = tag_list ?: emptyList(),
)

fun List<ItemDto>.toDomain(): List<Item> =
    filter { !it.item_id.isNullOrEmpty() }
        .distinctBy { it.item_id }
        .map { it.toDomain() }`,
        // Estrategia B: recorrido explícito con registro de identificadores vistos.
        `fun ItemDto.toDomain(): Item {
    val unidades = in_stock?.toIntOrNull() ?: 0
    return Item(item_id ?: "", item_name ?: "sin nombre", unidades, tag_list.orEmpty())
}

fun List<ItemDto>.toDomain(): List<Item> {
    val vistos = mutableSetOf<String>()
    val salida = mutableListOf<Item>()
    for (dto in this) {
        val id = dto.item_id
        if (id == null || id.isEmpty()) continue
        if (!vistos.add(id)) continue
        salida.add(dto.toDomain())
    }
    return salida
}`,
      ],
    },
  },
];
