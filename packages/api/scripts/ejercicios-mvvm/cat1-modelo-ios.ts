import type { Ejercicio } from './tipos.js';

/** Concepto 1.2 — Modelo de dominio (iOS), en tres niveles. */

const CATEGORIA = 'Modelo y capa de datos';
const CAPA = 'Modelos — `Modelos/Item.swift`';

const PROBLEMA = `
Este ejercicio construye **dos tipos**: \`Item\` y \`Catalogo\`. Nada más.

Sus vecinos, los del diagrama de abajo:

- **Quien los produce**: el decodificador de JSON. No lo escribes tú: lo genera
  Swift a partir de tus nombres de propiedad.
- **Quien los consume**: el repositorio, que los pasa hacia arriba. Es otro
  ejercicio.

En la pista de iOS estos tipos cumplen un papel doble: son a la vez lo que llega
del JSON y lo que utiliza la pantalla, sin traducción intermedia. Esa decisión
los vuelve más simples y, al mismo tiempo, más frágiles: si un nombre deja de
coincidir con la clave del JSON, la decodificación falla y produce un error en
lugar de datos.

De ahí la importancia de conocer con precisión el funcionamiento de \`Codable\`.
`;

const DE_DONDE_VIENE = `
\`Codable\` implementa **serialización por convención**: Swift genera el código de
decodificación a partir de los nombres de las propiedades, asumiendo que
coinciden con las claves del JSON. El compilador produce el código que, de otro
modo, habría que escribir manualmente.

El mecanismo es común a muchos entornos: Jackson en Java, \`serde\` en Rust,
\`encoding/json\` en Go, las dataclasses de Python. Todos plantean el mismo
compromiso: **menos código a cambio de acoplar los nombres del tipo a un formato
externo.**

### Código generado por el compilador

Las declaraciones de este ejercicio no contienen instrucciones: son propiedades.
Aun así, las comprobaciones decodifican JSON y construyen objetos. Esa ejecución
no procede del código escrito, sino del que Swift genera a partir de las
declaraciones.

Intervienen dos mecanismos distintos, que conviene no confundir:

- **El inicializador por miembros.** Todo \`struct\` dispone de un \`init\` con un
  parámetro por propiedad, en el orden de declaración. De ahí que
  \`Item(id:name:stock:)\` exista sin declararlo explícitamente.
- **La síntesis de \`Codable\`.** Al declarar \`: Codable\`, Swift genera el código
  que lee cada propiedad del JSON **buscando una clave con el mismo nombre**. Una
  propiedad llamada \`name\` busca la clave \`"name"\`; una propiedad llamada
  \`nombre\` busca \`"nombre"\`, no la encuentra, y la decodificación lanza un error.

La comparación delimita el aporte de cada mecanismo:

| Operación de la comprobación | Con \`struct: Codable\` | Sin \`: Codable\` |
|---|---|---|
| \`Item(id: …, name: …, stock: …)\` | funciona | funciona: el \`init\` procede del \`struct\` |
| \`JSONDecoder().decode(Item.self, …)\` | funciona | **no compila** |
| Renombrar una propiedad | altera la decodificación en ejecución | — |

La elección de \`struct\` frente a \`class\` tampoco es accesoria. Un \`struct\` es un
**tipo de valor**: al asignarlo se copia. Dos partes de la aplicación no pueden
compartir el mismo objeto y sobrescribir sus cambios de forma inadvertida, una
categoría de errores que no se produce al emplear \`struct\`.

La comparación con Android resulta ilustrativa: allí \`data\` genera \`equals\` y
\`copy\` para proporcionar igualdad por valor y copias explícitas. Aquí la copia no
se solicita, dado que la semántica de valor del \`struct\` la produce en cada
asignación.
`;

const DIAGRAMA = `
flowchart LR
    API["JSON de la API"] -->|Codable| M["Item y Catalogo<br/>piezas de este ejercicio"]
    M --> R[ItemRepository]
    R --> VM[ItemsViewModel]
    VM --> V[ContentView]
    style M fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px
`;

const DONDE_MAS = `
- **Backend.** Un servicio que expone JSON define los mismos tipos en sentido
  inverso: los serializa en lugar de decodificarlos. El acoplamiento entre nombre
  y clave es idéntico.
- **Configuración.** La lectura de un \`.json\` o un \`.yaml\` de ajustes emplea este
  mismo mecanismo, razón por la cual renombrar un campo de configuración impide
  el arranque.
- **Persistencia local.** El almacenamiento de un objeto en disco o en
  \`UserDefaults\` utiliza la misma codificación.
`;

const ERRORES = `
- **Renombrar una propiedad sin advertir** que la decodificación deja de
  funcionar. El compilador no emite ningún aviso: el error se manifiesta en
  tiempo de ejecución.
- **Emplear \`class\` por costumbre.** Se pierde la semántica de valor y vuelve a
  ser posible compartir estado de forma inadvertida.
- **Declarar las propiedades como \`let\`.** El tipo sigue siendo decodificable,
  pero deja de admitir la modificación de una copia y la última comprobación no
  compila. La firma proporcionada emplea \`var\`.
- **Incluir lógica de presentación en el modelo** (textos ya formateados,
  colores). El modelo describe los datos, no su representación visual.
`;

const DRIVER = `import Foundation

{{solucion}}

let caso = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
switch caso {
case "campos_en_orden":
    let a = Item(id: "7", name: "Camisa", stock: 24)
    print("\\(a.id)|\\(a.name)|\\(a.stock)")
case "decodifica_un_item":
    let json = "{\\"id\\":\\"9\\",\\"name\\":\\"Abrigo\\",\\"stock\\":3}"
    let d = try! JSONDecoder().decode(Item.self, from: json.data(using: .utf8)!)
    print("\\(d.id)|\\(d.name)|\\(d.stock)")
case "decodifica_catalogo_con_lista":
    let json = "{\\"total\\":2,\\"items\\":[{\\"id\\":\\"1\\",\\"name\\":\\"A\\",\\"stock\\":1},{\\"id\\":\\"2\\",\\"name\\":\\"B\\",\\"stock\\":0}]}"
    let c = try! JSONDecoder().decode(Catalogo.self, from: json.data(using: .utf8)!)
    print("\\(c.total):\\(c.items.map { $0.name }.joined(separator: "+"))")
case "asignar_hace_una_copia":
    var a = Item(id: "7", name: "Camisa", stock: 24)
    let b = a
    a.name = "Camiseta"
    print("\\(a.name)/\\(b.name)")
default:
    print("caso desconocido: \\(caso)")
}`;

// TODOS visibles: declarar un tipo no tiene comportamiento que generalizar, así
// que un caso oculto solo escondería un dato que el alumno no puede deducir.
const CASOS = [
  { entrada: 'campos_en_orden\n', salidaEsperada: '7|Camisa|24', oculto: false },
  { entrada: 'decodifica_un_item\n', salidaEsperada: '9|Abrigo|3', oculto: false },
  { entrada: 'decodifica_catalogo_con_lista\n', salidaEsperada: '2:A+B', oculto: false },
  { entrada: 'asignar_hace_una_copia\n', salidaEsperada: 'Camiseta/Camisa', oculto: false },
];

const SOLUCIONES = [
  `struct Item: Codable {
    var id: String
    var name: String
    var stock: Int
}

struct Catalogo: Codable {
    var total: Int
    var items: [Item]
}`,
  `struct Catalogo: Codable {
    var total: Int
    var items: [Item]
}

struct Item: Codable {
    var id: String
    var name: String
    var stock: Int

    // Igual de válida: Codable se sigue sintetizando con miembros calculados.
    var agotado: Bool { stock == 0 }
}`,
];

const COMPRUEBA = `
Cuatro comprobaciones, **todas visibles**. Cada una indica qué parte de las
declaraciones verifica.

- **\`campos_en_orden\`** — construye \`Item(id: "7", name: "Camisa", stock: 24)\`
  y muestra sus tres campos separados por barras verticales.
  Debe imprimir \`7|Camisa|24\`.
  *Verifica:* que las propiedades tengan esos nombres y ese orden. El
  inicializador por miembros los toma de la declaración.
- **\`decodifica_un_item\`** — decodifica \`{"id":"9","name":"Abrigo","stock":3}\`
  y muestra los campos del resultado.
  Debe imprimir \`9|Abrigo|3\`.
  *Verifica:* que \`Item\` sea \`Codable\` y que los nombres coincidan con las
  claves del JSON.
- **\`decodifica_catalogo_con_lista\`** — decodifica un catálogo con dos
  artículos y muestra el total y sus nombres.
  Debe imprimir \`2:A+B\`.
  *Verifica:* que \`Catalogo\` sea también \`Codable\` y que \`items\` sea un array de
  \`Item\`. La síntesis es recursiva: para decodificar el catálogo, Swift requiere
  la decodificación de cada artículo.
- **\`asignar_hace_una_copia\`** — asigna el \`Item\` a una segunda variable,
  modifica el nombre **del primero** y muestra ambos.
  Debe imprimir \`Camiseta/Camisa\`: el segundo conserva el valor anterior.
  *Verifica:* que el tipo sea \`struct\` y no \`class\`. Con \`class\`, ambas
  variables referenciarían el mismo objeto y el resultado sería
  \`Camiseta/Camiseta\`.

Si los nombres de las propiedades no coinciden con las claves del JSON, las dos
comprobaciones de decodificación fallan.
`;

export const modeloIos: Ejercicio[] = [
  {
    slugBase: 'mvvm-modelo-ios',
    tituloBase: 'Modelo de dominio (iOS)',
    nivel: 'guiado',
    categoria: CATEGORIA,
    lenguajes: ['swift'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
Se proporciona \`Item\` iniciado; \`Catalogo\` está pendiente de declarar.

\`\`\`swift
struct Item: Codable {
    var id: String
    // faltan: name, stock
}

// falta Catalogo entero
\`\`\`

El JSON que llega tiene esta forma:

\`\`\`json
{ "total": 2, "items": [ { "id": "1", "name": "A", "stock": 1 } ] }
\`\`\`
`,
    pasoAPaso: `
1. Añade \`name\` como \`String\` a \`Item\`.
2. Añade \`stock\` como \`Int\`.
3. Declara \`Catalogo\` con dos propiedades: \`total\` (\`Int\`) e \`items\`
   (\`[Item]\`). **Los nombres deben coincidir con las claves del JSON**
   anterior.
4. Declara \`Catalogo\` como \`Codable\`. Cuando un tipo contiene otro, ambos deben
   serlo.
5. Mantén \`struct\` en lugar de \`class\`: una de las comprobaciones verifica la
   semántica de valor.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    plantilla: { swift: DRIVER },
    inicial: {
      swift: `struct Item: Codable {
    var id: String
    // TODO: añade name y stock
}

// TODO: declara Catalogo con total e items
`,
    },
    casos: CASOS,
    soluciones: { swift: SOLUCIONES },
  },

  {
    slugBase: 'mvvm-modelo-ios',
    tituloBase: 'Modelo de dominio (iOS)',
    nivel: 'base',
    categoria: CATEGORIA,
    lenguajes: ['swift'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
Escribe los dos modelos en \`Modelos/Item.swift\`:

\`\`\`swift
struct Item: Codable {
    var id: String
    var name: String
    var stock: Int
}

struct Catalogo: Codable {
    var total: Int
    var items: [Item]
}
\`\`\`

Los nombres de las propiedades **son** el contrato con este JSON:

\`\`\`json
{ "total": 2, "items": [ { "id": "1", "name": "A", "stock": 1 } ] }
\`\`\`
`,
    pasoAPaso: `
1. Declara \`Item\` con sus tres propiedades y hazlo decodificable.
2. Declara \`Catalogo\` con \`total\` e \`items\`.
3. Elige entre \`struct\` y \`class\` considerando que una de las comprobaciones
   asigna el valor a otra variable y modifica el original.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    plantilla: { swift: DRIVER },
    inicial: {
      swift: `// Escribe aquí Item y Catalogo según el enunciado.
// Los nombres de las propiedades deben coincidir con las claves del JSON.
`,
    },
    casos: CASOS,
    soluciones: { swift: SOLUCIONES },
  },

  {
    slugBase: 'mvvm-modelo-ios',
    tituloBase: 'Modelo de dominio (iOS)',
    nivel: 'reto',
    categoria: CATEGORIA,
    lenguajes: ['swift'],
    capa: CAPA,
    problema: `
El equipo de backend cambia el formato. Ahora el JSON llega así:

\`\`\`json
{ "total_count": 2,
  "data": [ { "item_id": "1", "item_name": "A", "in_stock": 1, "is_active": true } ] }
\`\`\`

Nombres en \`snake_case\`, con prefijos, y un campo adicional. **El formato del
JSON no se puede modificar**, y esos nombres no deben propagarse al resto de la
aplicación: una vista no debería contener \`item.item_name\`.
`,
    deDondeViene: `
El patrón aplicable es la **capa anticorrupción**, otro término de
*Domain-Driven Design*: una frontera en la que el vocabulario externo se traduce
al propio, de modo que no se extienda al resto del sistema.

Swift lo resuelve mediante \`CodingKeys\`: un enum que declara la correspondencia
entre los nombres del modelo y los del JSON. El compilador deja de aplicar la
convención por defecto y utiliza esa tabla.

El mecanismo equivale a \`@SerializedName\` en Gson, \`@JsonProperty\` en Jackson o
\`#[serde(rename)]\` en Rust. Todos responden a la misma causa: **el formato
externo lo define un tercero**.
`,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: `
- **Integraciones con terceros.** Prácticamente ninguna API pública sigue las
  convenciones de nombres del cliente; esta traducción constituye el trabajo
  habitual de integración.
- **Migraciones de API.** Cuando el backend pasa de v1 a v2, la tabla de
  correspondencias es el único elemento que cambia si la capa está bien
  delimitada.
- **Formatos heredados.** La lectura de un CSV o un XML antiguo con nombres
  arbitrarios plantea el mismo problema.
`,
    queEscribes: `
Modelos con **nombres idiomáticos** que decodifiquen ese JSON:

\`\`\`swift
struct Item: Codable {
    var id: String
    var name: String
    var stock: Int
    var activo: Bool
}

struct Catalogo: Codable {
    var total: Int
    var items: [Item]
}
\`\`\`

La tarea consiste en hacer que esos nombres lean del JSON anterior. Se requiere
además una función:

\`\`\`swift
func resumen(_ c: Catalogo) -> String
\`\`\`

que devuelva \`<total>:<nombres de los activos separados por +>\`. Los artículos
inactivos se decodifican igualmente, pero no figuran en el resumen.
`,
    pasoAPaso: `
1. Declara los modelos con los nombres previstos para la aplicación, no con los
   del JSON.
2. Añade a cada uno la tabla de correspondencias que Swift requiere para
   decodificar. **Todas** las propiedades deben figurar en ella, incluidas las
   que ya coincidían.
3. Escribe \`resumen\` aplicando el filtro por el campo de actividad.
4. Contempla el caso de un catálogo sin artículos activos: debe devolver el total
   y una lista vacía, sin producir error.
`,
    erroresTipicos: `
- **Declarar en la tabla de correspondencias solo las propiedades que cambian.**
  Una vez declarado el enum, debe estar completo: las propiedades ausentes dejan
  de decodificarse.
- **Renombrar la propiedad en lugar de asociarla.** El vocabulario del backend
  volvería a introducirse en la aplicación.
- **Filtrar los artículos inactivos durante la decodificación.** Se perdería
  información que otra pantalla puede requerir. El filtrado corresponde al uso,
  no a la lectura.
`,
    comoSeComprueba: `
Las comprobaciones decodifican el JSON con el formato nuevo e invocan
\`resumen\`. Si la tabla de correspondencias está incompleta, la decodificación
falla y el veredicto lo indica.
`,
    plantilla: {
      swift: `import Foundation

{{solucion}}

let caso = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
let dosActivos = "{\\"total_count\\":2,\\"data\\":[{\\"item_id\\":\\"1\\",\\"item_name\\":\\"A\\",\\"in_stock\\":1,\\"is_active\\":true},{\\"item_id\\":\\"2\\",\\"item_name\\":\\"B\\",\\"in_stock\\":0,\\"is_active\\":true}]}"
let unoInactivo = "{\\"total_count\\":2,\\"data\\":[{\\"item_id\\":\\"1\\",\\"item_name\\":\\"A\\",\\"in_stock\\":1,\\"is_active\\":true},{\\"item_id\\":\\"2\\",\\"item_name\\":\\"B\\",\\"in_stock\\":0,\\"is_active\\":false}]}"
let ninguno = "{\\"total_count\\":1,\\"data\\":[{\\"item_id\\":\\"1\\",\\"item_name\\":\\"A\\",\\"in_stock\\":1,\\"is_active\\":false}]}"
func leer(_ s: String) -> Catalogo { try! JSONDecoder().decode(Catalogo.self, from: s.data(using: .utf8)!) }
switch caso {
case "renombra_campos":
    let c = leer(dosActivos)
    print("\\(c.items[0].id)|\\(c.items[0].name)|\\(c.items[0].stock)")
case "resumen_todos_activos":
    print(resumen(leer(dosActivos)))
case "resumen_con_inactivo":
    print(resumen(leer(unoInactivo)))
case "resumen_ninguno_activo":
    print(resumen(leer(ninguno)))
default:
    print("caso desconocido: \\(caso)")
}`,
    },
    inicial: {
      swift: `// Declara Item y Catalogo con nombres idiomáticos que decodifiquen el JSON
// del enunciado (snake_case con prefijos), y escribe:
//
//   func resumen(_ c: Catalogo) -> String
`,
    },
    casos: [
      { entrada: 'renombra_campos\n', salidaEsperada: '1|A|1', oculto: false },
      { entrada: 'resumen_todos_activos\n', salidaEsperada: '2:A+B', oculto: false },
      { entrada: 'resumen_con_inactivo\n', salidaEsperada: '2:A', oculto: true },
      { entrada: 'resumen_ninguno_activo\n', salidaEsperada: '1:', oculto: true },
    ],
    soluciones: {
      swift: [
        `struct Item: Codable {
    var id: String
    var name: String
    var stock: Int
    var activo: Bool

    enum CodingKeys: String, CodingKey {
        case id = "item_id"
        case name = "item_name"
        case stock = "in_stock"
        case activo = "is_active"
    }
}

struct Catalogo: Codable {
    var total: Int
    var items: [Item]

    enum CodingKeys: String, CodingKey {
        case total = "total_count"
        case items = "data"
    }
}

func resumen(_ c: Catalogo) -> String {
    let activos = c.items.filter { $0.activo }.map { $0.name }
    return "\\(c.total):\\(activos.joined(separator: "+"))"
}`,
        `struct Item: Codable {
    var id: String
    var name: String
    var stock: Int
    var activo: Bool

    private enum CodingKeys: String, CodingKey {
        case id = "item_id", name = "item_name", stock = "in_stock", activo = "is_active"
    }
}

struct Catalogo: Codable {
    var total: Int
    var items: [Item]

    private enum CodingKeys: String, CodingKey {
        case total = "total_count", items = "data"
    }
}

func resumen(_ c: Catalogo) -> String {
    var nombres: [String] = []
    for i in c.items where i.activo { nombres.append(i.name) }
    return String(c.total) + ":" + nombres.joined(separator: "+")
}`,
      ],
    },
  },
];
