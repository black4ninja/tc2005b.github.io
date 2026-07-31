import type { Ejercicio } from './tipos.js';

/**
 * Concepto 1.4 — Extraer el identificador desde una URL. Bilingüe.
 *
 * OJO: los casos son COMPARTIDOS por Kotlin y Swift. Los dos programas de
 * comprobación reconocen los mismos nombres y producen la misma salida; si eso
 * dejara de cumplirse habría que partir el ejercicio en dos.
 */

const CATEGORIA = 'Modelo y capa de datos';
const CAPA = 'Datos — `data/mapper/` (Android) · `Modelos/` (iOS)';

const PROBLEMA = `
Este ejercicio construye **una sola pieza**: la función que obtiene el
identificador de un artículo a partir de la URL que lo referencia.

Muchas APIs no envían el identificador en un campo propio. Envían la dirección
del recurso:

\`\`\`json
{ "name": "Camisa", "url": "https://api.ejemplo.com/items/25/" }
\`\`\`

El identificador —\`25\`— está dentro de esa cadena. La aplicación lo necesita
como dato independiente para construir la siguiente petición, para identificar
la fila seleccionada y para conservar la posición de la lista.

La pieza tiene un vecino: el mapper, que la invoca al traducir cada DTO.
Corresponde a otro ejercicio.
`;

const DE_DONDE_VIENE = `
Una URL que identifica un recurso no es una cadena arbitraria: tiene una
estructura definida. Que el identificador ocupe el último segmento de la ruta es
una convención de las **APIs REST**, descrita por Roy Fielding en su tesis
doctoral (2000) al definir el recurso como la unidad direccionable de un sistema
web.

De esa convención se deriva el problema práctico de este ejercicio: la
información que la aplicación necesita está codificada dentro de un texto, y
extraerla exige tomar una decisión sobre las variantes de ese texto.

### Por qué la extracción no es una operación trivial

La misma URL puede llegar en formas distintas sin dejar de ser válida:

- Con barra final o sin ella: \`/items/25/\` y \`/items/25\`.
- Con parámetros de consulta: \`/items/25?lang=es\`.
- Vacía, cuando el campo falta en la respuesta.

Cada variante rompe una implementación que solo contemple las demás. Por eso la
extracción se aísla en una función propia: concentra las variantes en un punto
y permite comprobarlas sin ejecutar la aplicación completa.

### Qué se hace con lo que no encaja

Una función que puede no encontrar un resultado debe declararlo en su tipo de
retorno. Devolver un valor especial —\`-1\`, cadena vacía— obliga a quien la
invoca a conocer esa convención. Devolver un tipo que admite la ausencia
(\`String?\` en Kotlin, \`String?\` en Swift) hace que el compilador exija tratar
el caso.
`;

const DIAGRAMA = `
flowchart LR
    API["JSON con url"] --> MAP[toDomain]
    MAP --> ID["idDesdeUrl()<br/>pieza de este ejercicio"]
    ID --> M[Item]
    M --> VM[ViewModel]
    style ID fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px
`;

const DONDE_MAS = `
- **Enrutado web.** Un servidor que atiende \`/items/25\` realiza esta misma
  extracción para determinar qué recurso se solicita.
- **Enlaces profundos.** Abrir una aplicación móvil desde una dirección externa
  exige interpretar la ruta y localizar el identificador dentro de ella.
- **Registros de servidor.** El análisis de un fichero de accesos agrupa por
  recurso, lo que requiere separar el identificador de la ruta.
- **Paginación.** Las APIs que devuelven un campo \`next\` con una URL completa
  obligan a extraer de ella el número de página.
`;

const ERRORES = `
- **Partir la cadena y tomar el último fragmento sin más.** Con una URL
  terminada en barra, el último fragmento está vacío.
- **Emplear una posición fija.** Contar caracteres desde el inicio funciona con
  el servidor actual y falla al cambiar de entorno o de versión de la API.
- **Devolver una cadena vacía cuando no hay identificador.** Quien invoca la
  función no puede distinguir esa respuesta de un identificador válido; el tipo
  debe expresar la ausencia.
- **Suponer que el identificador es numérico.** El enunciado no lo garantiza, y
  convertirlo a entero descarta identificadores válidos de otras APIs.
`;

const COMPRUEBA = `
Cuatro comprobaciones. Cada una invoca la función con una URL e imprime el
resultado. La ausencia de identificador se imprime como \`-\`.

- **\`con_barra_final\`** — \`https://api.ejemplo.com/items/25/\`.
  Debe imprimir \`25\`.
  *Verifica:* que la barra final no se confunda con un segmento.
- **\`sin_barra_final\`** — \`https://api.ejemplo.com/items/25\`.
  Debe imprimir \`25\`.
  *Verifica:* que la misma implementación cubra ambas formas.
- **\`cadena_vacia\`** — la cadena vacía.
  Debe imprimir \`-\`.
  *Verifica:* que la ausencia se represente en el tipo de retorno y no como un
  valor especial.
- **Una comprobación oculta** — una URL con parámetros de consulta, mencionada
  entre las variantes del apartado "De dónde viene".
  *Verifica:* que los parámetros no formen parte del identificador.

La comprobación oculta es deducible: el enunciado enumera las tres variantes que
la función debe admitir, y las visibles cubren solo dos.
`;

const DRIVER_KOTLIN = `{{solucion}}

fun main() {
    val caso = readLine()?.trim() ?: ""
    val url = when (caso) {
        "con_barra_final" -> "https://api.ejemplo.com/items/25/"
        "sin_barra_final" -> "https://api.ejemplo.com/items/25"
        "cadena_vacia" -> ""
        "con_parametros" -> "https://api.ejemplo.com/items/25?lang=es"
        else -> null
    }
    if (url == null) println("caso desconocido: " + caso)
    else println(idDesdeUrl(url) ?: "-")
}`;

const DRIVER_SWIFT = `import Foundation

{{solucion}}

let caso = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
var url: String? = nil
switch caso {
case "con_barra_final": url = "https://api.ejemplo.com/items/25/"
case "sin_barra_final": url = "https://api.ejemplo.com/items/25"
case "cadena_vacia": url = ""
case "con_parametros": url = "https://api.ejemplo.com/items/25?lang=es"
default: url = nil
}
if let u = url {
    print(idDesdeUrl(u) ?? "-")
} else {
    print("caso desconocido: \\(caso)")
}`;

const CASOS = [
  { entrada: 'con_barra_final\n', salidaEsperada: '25', oculto: false },
  { entrada: 'sin_barra_final\n', salidaEsperada: '25', oculto: false },
  { entrada: 'cadena_vacia\n', salidaEsperada: '-', oculto: false },
  { entrada: 'con_parametros\n', salidaEsperada: '25', oculto: true },
];

const SOL_KOTLIN = [
  // Estrategia A: recortar la parte de consulta y filtrar segmentos vacíos.
  `fun idDesdeUrl(url: String): String? =
    url.substringBefore("?")
        .split("/")
        .filter { it.isNotEmpty() }
        .lastOrNull()`,
  // Estrategia B: recorrido desde el final, sin construir la lista completa.
  `fun idDesdeUrl(url: String): String? {
    val sinConsulta = url.takeWhile { it != '?' }
    var fin = sinConsulta.length
    while (fin > 0 && sinConsulta[fin - 1] == '/') fin--
    if (fin == 0) return null
    var inicio = fin
    while (inicio > 0 && sinConsulta[inicio - 1] != '/') inicio--
    return sinConsulta.substring(inicio, fin)
}`,
];

const SOL_SWIFT = [
  // Estrategia A: separar por "/" y descartar los segmentos vacíos.
  `func idDesdeUrl(_ url: String) -> String? {
    let sinConsulta = url.split(separator: "?", maxSplits: 1).first.map(String.init) ?? ""
    let partes = sinConsulta.split(separator: "/").map(String.init)
    return partes.last
}`,
  // Estrategia B: apoyarse en URLComponents, de Foundation.
  `import Foundation

func idDesdeUrl(_ url: String) -> String? {
    guard let comp = URLComponents(string: url) else { return nil }
    let segmentos = comp.path.split(separator: "/").map(String.init)
    return segmentos.last
}`,
];

export const idDesdeUrl: Ejercicio[] = [
  // --- GUIADO ---------------------------------------------------------------
  {
    slugBase: 'mvvm-url-identificador',
    tituloBase: 'Extraer el identificador desde la URL',
    nivel: 'guiado',
    categoria: CATEGORIA,
    lenguajes: ['kotlin', 'swift'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
Una función que recibe la URL y devuelve el identificador, o la ausencia de él.

**Kotlin** — \`data/mapper/UrlId.kt\`:

\`\`\`kotlin
fun idDesdeUrl(url: String): String?
\`\`\`

**Swift** — \`Modelos/UrlId.swift\`:

\`\`\`swift
func idDesdeUrl(_ url: String) -> String?
\`\`\`

El identificador es **el último segmento no vacío de la ruta**, excluidos los
parámetros de consulta.
`,
    pasoAPaso: `
1. Elimina de la cadena todo lo que siga al carácter \`?\`, en caso de haberlo.
   Los parámetros de consulta no forman parte de la ruta.
2. Separa el resto por el carácter \`/\`.
3. Descarta los fragmentos vacíos. Una URL terminada en barra produce uno al
   final, y el prefijo \`https://\` produce otro.
4. Devuelve el último fragmento restante. Si no queda ninguno, devuelve la
   ausencia: \`null\` en Kotlin, \`nil\` en Swift.
5. No conviertas el resultado a entero. El tipo de retorno es textual.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    plantilla: { kotlin: DRIVER_KOTLIN, swift: DRIVER_SWIFT },
    inicial: {
      kotlin: `fun idDesdeUrl(url: String): String? {
    // TODO 1: recortar lo que siga a "?"
    // TODO 2: separar por "/"
    // TODO 3: descartar los fragmentos vacíos
    // TODO 4: devolver el último, o null si no queda ninguno
    return null
}
`,
      swift: `func idDesdeUrl(_ url: String) -> String? {
    // TODO 1: recortar lo que siga a "?"
    // TODO 2: separar por "/"
    // TODO 3: descartar los fragmentos vacíos
    // TODO 4: devolver el último, o nil si no queda ninguno
    return nil
}
`,
    },
    casos: CASOS,
    soluciones: { kotlin: SOL_KOTLIN, swift: SOL_SWIFT },
  },

  // --- BASE -----------------------------------------------------------------
  {
    slugBase: 'mvvm-url-identificador',
    tituloBase: 'Extraer el identificador desde la URL',
    nivel: 'base',
    categoria: CATEGORIA,
    lenguajes: ['kotlin', 'swift'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
**Kotlin** — \`data/mapper/UrlId.kt\`:

\`\`\`kotlin
fun idDesdeUrl(url: String): String?
\`\`\`

**Swift** — \`Modelos/UrlId.swift\`:

\`\`\`swift
func idDesdeUrl(_ url: String) -> String?
\`\`\`

El identificador es **el último segmento no vacío de la ruta**, excluidos los
parámetros de consulta. Cuando la ruta no contiene ningún segmento, el resultado
es la ausencia.
`,
    pasoAPaso: `
1. Determina qué formas puede adoptar la URL. El apartado "De dónde viene"
   enumera tres.
2. Resuelve las tres con una sola implementación, sin condicionales por caso.
3. Devuelve la ausencia mediante el tipo de retorno, no mediante un valor
   especial.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    plantilla: { kotlin: DRIVER_KOTLIN, swift: DRIVER_SWIFT },
    inicial: {
      kotlin: `// Escribe aquí idDesdeUrl(url: String): String?
`,
      swift: `// Escribe aquí idDesdeUrl(_ url: String) -> String?
`,
    },
    casos: CASOS,
    soluciones: { kotlin: SOL_KOTLIN, swift: SOL_SWIFT },
  },

  // --- RETO -----------------------------------------------------------------
  {
    slugBase: 'mvvm-url-identificador',
    tituloBase: 'Extraer el identificador desde la URL',
    nivel: 'reto',
    categoria: CATEGORIA,
    lenguajes: ['kotlin', 'swift'],
    capa: CAPA,
    problema: `
La API incorpora una segunda familia de recursos. Ahora las URL pueden
referirse a un artículo o a una de sus variantes:

\`\`\`
https://api.ejemplo.com/items/25
https://api.ejemplo.com/items/25/variants/3
\`\`\`

El último segmento ya no basta: en la segunda dirección vale \`3\`, y la
aplicación necesita saber además a qué artículo pertenece esa variante.

Extraer únicamente el último segmento pierde esa relación. La función debe
devolver **qué tipo de recurso** identifica la URL y **cuál es su identificador**,
de modo que quien la invoque no tenga que interpretar la cadena de nuevo.
`,
    deDondeViene: `
El principio aplicable es el mismo que en el nivel base, llevado un paso más
allá: **la función devuelve un tipo que expresa el resultado**, en lugar de una
cadena que el receptor debe interpretar.

Devolver \`String?\` obliga a quien invoca la función a deducir, a partir del
contexto, si ese texto identifica un artículo o una variante. Devolver un tipo
que distingue ambos casos traslada esa distinción al compilador: no es posible
tratar una variante como si fuera un artículo sin que el código lo declare.

Es la aplicación de *"make illegal states unrepresentable"* al resultado de una
función, y el motivo por el que los lenguajes ofrecen \`sealed class\` (Kotlin) y
\`enum\` con valores asociados (Swift): permiten enumerar los resultados posibles
y obligan a cubrirlos todos.
`,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: `
- **Enrutadores web.** Un enrutador asocia cada patrón de ruta a un
  identificador de recurso; la estructura del resultado es la de este ejercicio.
- **Enlaces profundos.** Una aplicación que se abre desde una dirección externa
  debe determinar qué pantalla corresponde, no solo qué número aparece.
- **Sistemas de permisos.** Autorizar el acceso a un recurso exige conocer su
  tipo, no únicamente su identificador.
`,
    queEscribes: `
Un tipo que represente el resultado y una función que lo devuelva.

**Kotlin**:

\`\`\`kotlin
fun analizarUrl(url: String): Recurso?
\`\`\`

**Swift**:

\`\`\`swift
func analizarUrl(_ url: String) -> Recurso?
\`\`\`

El tipo \`Recurso\` debe distinguir dos situaciones y queda a criterio propio:

| URL | Resultado |
|---|---|
| \`.../items/25\` | Un artículo con identificador \`25\` |
| \`.../items/25/variants/3\` | Una variante \`3\` del artículo \`25\` |
| Cualquier otra | Ausencia |

Las comprobaciones no inspeccionan el tipo directamente. Se apoyan en una
segunda función, que también forma parte del ejercicio:

\`\`\`kotlin
fun describir(r: Recurso): String
\`\`\`

\`\`\`swift
func describir(_ r: Recurso) -> String
\`\`\`

que devuelve \`item:25\` para un artículo y \`variant:25:3\` para una variante.
`,
    pasoAPaso: `
1. Declara el tipo \`Recurso\` con las dos situaciones. Kotlin dispone de
   \`sealed class\`; Swift, de \`enum\` con valores asociados.
2. Analiza la ruta en segmentos, reutilizando el tratamiento del nivel base para
   la barra final y los parámetros de consulta.
3. Distingue las dos formas por la estructura de la ruta, no por su longitud
   total: la variante contiene el segmento \`variants\` seguido de su
   identificador.
4. Devuelve la ausencia ante cualquier ruta que no corresponda a ninguna de las
   dos formas.
5. Escribe \`describir\` cubriendo las dos situaciones. Con un tipo adecuado, el
   compilador señala el caso no contemplado.
`,
    erroresTipicos: `
- **Distinguir las formas por el número de segmentos.** Una ruta con un prefijo
  adicional rompe esa suposición; la estructura se reconoce por los nombres de
  los segmentos.
- **Representar el resultado con dos cadenas y un booleano.** Admite
  combinaciones que no corresponden a ningún recurso real.
- **Perder el identificador del artículo** al analizar una variante. La relación
  entre ambos es precisamente lo que el nivel base no podía expresar.
`,
    comoSeComprueba: `
Las comprobaciones invocan \`analizarUrl\` y muestran el resultado mediante
\`describir\`. La ausencia se imprime como \`-\`.

- **\`solo_item\`** — \`https://api.ejemplo.com/items/25\`.
  Debe imprimir \`item:25\`.
- **\`item_con_variante\`** — \`https://api.ejemplo.com/items/25/variants/3\`.
  Debe imprimir \`variant:25:3\`.
- **\`ruta_desconocida\`** — \`https://api.ejemplo.com/health\`.
  Debe imprimir \`-\`.
- **Una comprobación oculta** — una de las dos formas válidas, expresada con una
  de las variantes de escritura que el nivel base ya contemplaba.
`,
    plantilla: {
      kotlin: `{{solucion}}

fun main() {
    val caso = readLine()?.trim() ?: ""
    val url = when (caso) {
        "solo_item" -> "https://api.ejemplo.com/items/25"
        "item_con_variante" -> "https://api.ejemplo.com/items/25/variants/3"
        "ruta_desconocida" -> "https://api.ejemplo.com/health"
        "variante_con_barra_final" -> "https://api.ejemplo.com/items/25/variants/3/"
        else -> null
    }
    if (url == null) {
        println("caso desconocido: " + caso)
    } else {
        val r = analizarUrl(url)
        println(if (r == null) "-" else describir(r))
    }
}`,
      swift: `import Foundation

{{solucion}}

let caso = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
var url: String? = nil
switch caso {
case "solo_item": url = "https://api.ejemplo.com/items/25"
case "item_con_variante": url = "https://api.ejemplo.com/items/25/variants/3"
case "ruta_desconocida": url = "https://api.ejemplo.com/health"
case "variante_con_barra_final": url = "https://api.ejemplo.com/items/25/variants/3/"
default: url = nil
}
if let u = url {
    if let r = analizarUrl(u) { print(describir(r)) } else { print("-") }
} else {
    print("caso desconocido: \\(caso)")
}`,
    },
    inicial: {
      kotlin: `// Declara aquí el tipo Recurso y las dos funciones del enunciado:
//
//   fun analizarUrl(url: String): Recurso?
//   fun describir(r: Recurso): String
`,
      swift: `// Declara aquí el tipo Recurso y las dos funciones del enunciado:
//
//   func analizarUrl(_ url: String) -> Recurso?
//   func describir(_ r: Recurso) -> String
`,
    },
    casos: [
      { entrada: 'solo_item\n', salidaEsperada: 'item:25', oculto: false },
      { entrada: 'item_con_variante\n', salidaEsperada: 'variant:25:3', oculto: false },
      { entrada: 'ruta_desconocida\n', salidaEsperada: '-', oculto: false },
      {
        entrada: 'variante_con_barra_final\n',
        salidaEsperada: 'variant:25:3',
        oculto: true,
      },
    ],
    soluciones: {
      kotlin: [
        // Estrategia A: sealed class y reconocimiento por nombre de segmento.
        `sealed class Recurso {
    data class Articulo(val id: String) : Recurso()
    data class Variante(val articulo: String, val id: String) : Recurso()
}

private fun segmentos(url: String): List<String> =
    url.substringBefore("?").split("/").filter { it.isNotEmpty() }

fun analizarUrl(url: String): Recurso? {
    val s = segmentos(url)
    val i = s.indexOf("items")
    if (i < 0 || i + 1 >= s.size) return null
    val idArticulo = s[i + 1]
    val j = s.indexOf("variants")
    if (j < 0) {
        return if (s.size == i + 2) Recurso.Articulo(idArticulo) else null
    }
    if (j + 1 >= s.size) return null
    return Recurso.Variante(idArticulo, s[j + 1])
}

fun describir(r: Recurso): String = when (r) {
    is Recurso.Articulo -> "item:" + r.id
    is Recurso.Variante -> "variant:" + r.articulo + ":" + r.id
}`,
        // Estrategia B: enum con campos anulables y comprobación por posición relativa.
        `enum class Tipo { ARTICULO, VARIANTE }

class Recurso(val tipo: Tipo, val articulo: String, val variante: String?)

fun analizarUrl(url: String): Recurso? {
    val partes = url.takeWhile { it != '?' }.split("/").filter { it.length > 0 }
    var idArticulo: String? = null
    var idVariante: String? = null
    var k = 0
    while (k < partes.size - 1) {
        if (partes[k] == "items") idArticulo = partes[k + 1]
        if (partes[k] == "variants") idVariante = partes[k + 1]
        k++
    }
    if (idArticulo == null) return null
    if (idVariante != null) return Recurso(Tipo.VARIANTE, idArticulo, idVariante)
    // Sin variante, el identificador del artículo debe cerrar la ruta.
    if (partes.last() != idArticulo) return null
    return Recurso(Tipo.ARTICULO, idArticulo, null)
}

fun describir(r: Recurso): String =
    if (r.tipo == Tipo.ARTICULO) "item:" + r.articulo
    else "variant:" + r.articulo + ":" + r.variante`,
      ],
      swift: [
        // Estrategia A: enum con valores asociados.
        `enum Recurso {
    case articulo(id: String)
    case variante(articulo: String, id: String)
}

private func segmentos(_ url: String) -> [String] {
    let sinConsulta = url.split(separator: "?", maxSplits: 1).first.map(String.init) ?? ""
    return sinConsulta.split(separator: "/").map(String.init)
}

func analizarUrl(_ url: String) -> Recurso? {
    let s = segmentos(url)
    guard let i = s.firstIndex(of: "items"), i + 1 < s.count else { return nil }
    let idArticulo = s[i + 1]
    guard let j = s.firstIndex(of: "variants") else {
        return s.count == i + 2 ? .articulo(id: idArticulo) : nil
    }
    guard j + 1 < s.count else { return nil }
    return .variante(articulo: idArticulo, id: s[j + 1])
}

func describir(_ r: Recurso) -> String {
    switch r {
    case .articulo(let id): return "item:" + id
    case .variante(let articulo, let id): return "variant:" + articulo + ":" + id
    }
}`,
        // Estrategia B: struct con campo opcional y recorrido por parejas.
        `struct Recurso {
    var articulo: String
    var variante: String?
}

func analizarUrl(_ url: String) -> Recurso? {
    let sinConsulta = url.split(separator: "?", maxSplits: 1).first.map(String.init) ?? ""
    let partes = sinConsulta.split(separator: "/").map(String.init)
    var idArticulo: String? = nil
    var idVariante: String? = nil
    var k = 0
    while k < partes.count - 1 {
        if partes[k] == "items" { idArticulo = partes[k + 1] }
        if partes[k] == "variants" { idVariante = partes[k + 1] }
        k += 1
    }
    guard let a = idArticulo else { return nil }
    // Sin variante, el identificador del artículo debe cerrar la ruta.
    if idVariante == nil && partes.last != a { return nil }
    return Recurso(articulo: a, variante: idVariante)
}

func describir(_ r: Recurso) -> String {
    if let v = r.variante { return "variant:" + r.articulo + ":" + v }
    return "item:" + r.articulo
}`,
      ],
    },
  },
];
