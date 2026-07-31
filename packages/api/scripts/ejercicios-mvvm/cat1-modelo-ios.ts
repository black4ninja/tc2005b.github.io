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

En la pista de iOS estos tipos tienen un papel doble: son lo que llega del JSON
**y** lo que usa la pantalla, sin traducción intermedia. Eso los hace más simples
y más frágiles a la vez: si un nombre deja de coincidir con la clave del JSON, la
decodificación falla y devuelve un error en vez de datos.

Por eso aquí conviene saber exactamente qué hace \`Codable\` por debajo.
`;

const DE_DONDE_VIENE = `
\`Codable\` es **serialización por convención**: Swift genera el código de
decodificación mirando los nombres de tus propiedades y asumiendo que coinciden
con las claves del JSON. No hay magia — hay un compilador escribiendo por ti el
código que escribirías a mano.

La idea es vieja y está en todas partes: Jackson en Java, \`serde\` en Rust,
\`encoding/json\` en Go, los dataclasses de Python. Todas hacen el mismo trato:
**menos código a cambio de acoplar los nombres de tu tipo a un formato externo.**

Y \`struct\` en vez de \`class\` no es un detalle. Un \`struct\` es un **tipo de
valor**: al asignarlo se copia. Dos partes de la app no pueden acabar compartiendo
el mismo objeto y pisándose los cambios sin darse cuenta, que es una clase entera
de errores que en iOS simplemente no ocurre si usas \`struct\`.
`;

const DIAGRAMA = `
flowchart LR
    API["JSON de la API"] -->|Codable| M["Item y Catalogo<br/>lo que escribes"]
    M --> R[ItemRepository]
    R --> VM[ItemsViewModel]
    VM --> V[ContentView]
    style M fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px
`;

const DONDE_MAS = `
- **Backend.** Un servicio que expone JSON define los mismos tipos al revés: los
  serializa en vez de decodificarlos. El acoplamiento nombre-clave es idéntico.
- **Configuración.** Leer un \`.json\` o un \`.yaml\` de ajustes usa exactamente
  este mecanismo; por eso renombrar un campo de config rompe el arranque.
- **Persistencia local.** Guardar un objeto en disco o en \`UserDefaults\` pasa por
  la misma codificación.
`;

const ERRORES = `
- **Renombrar una propiedad y no darse cuenta** de que se ha roto la
  decodificación. El compilador no avisa: el error aparece en tiempo de
  ejecución.
- **Usar \`class\` por costumbre.** Pierdes la semántica de valor y vuelves a
  poder compartir estado sin querer.
- **Meter lógica de presentación en el modelo** (textos ya formateados, colores).
  El modelo describe datos, no cómo se pintan.
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
case "copiar_no_toca_el_original":
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
  { entrada: 'copiar_no_toca_el_original\n', salidaEsperada: 'Camiseta/Camisa', oculto: false },
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
Cuatro comprobaciones, **todas visibles**.

- **\`campos_en_orden\`** — construye \`Item(id: "7", name: "Camisa", stock: 24)\`
  y muestra sus tres campos separados por barras verticales.
  Debe imprimir \`7|Camisa|24\`.
- **\`decodifica_un_item\`** — decodifica \`{"id":"9","name":"Abrigo","stock":3}\`
  y muestra los campos del resultado.
  Debe imprimir \`9|Abrigo|3\`.
- **\`decodifica_catalogo_con_lista\`** — decodifica un catálogo con dos
  artículos y muestra el total y sus nombres.
  Debe imprimir \`2:A+B\`.
- **\`copiar_no_toca_el_original\`** — copia el \`Item\` a otra variable, cambia
  el nombre **de la copia** y muestra los dos.
  Debe imprimir \`Camiseta/Camisa\`.

Si tus nombres de propiedad no coinciden con las claves del JSON, las dos
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
Te damos \`Item\` empezado y \`Catalogo\` por hacer.

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
   (\`[Item]\`). **Los nombres deben coincidir con las claves del JSON** de arriba.
4. Marca \`Catalogo\` como \`Codable\` también. Si un tipo contiene otro, los dos
   tienen que serlo.
5. No cambies \`struct\` por \`class\`: uno de los casos comprueba la semántica de
   valor.
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
3. Decide entre \`struct\` y \`class\` sabiendo que un caso copia el valor y
   modifica la copia.
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

Nombres en \`snake_case\`, con prefijos, y un campo nuevo. **No puedes cambiar el
JSON**, y no quieres que esos nombres se propaguen por toda tu app: nadie debería
escribir \`item.item_name\` en una vista.
`,
    deDondeViene: `
Esto es una **capa anticorrupción**, otro término de *Domain-Driven Design*: una
frontera donde el vocabulario ajeno se traduce al tuyo, para que no contamine el
resto del sistema.

Swift lo resuelve con \`CodingKeys\`: un enum que declara la correspondencia entre
tus nombres y los del JSON. El compilador deja de adivinar por convención y usa
tu tabla.

Es lo mismo que \`@SerializedName\` en Gson, \`@JsonProperty\` en Jackson o
\`#[serde(rename)]\` en Rust. Todos existen por la misma razón: **quien define el
formato externo no eres tú**.
`,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: `
- **Integraciones con terceros.** Casi ninguna API pública usa tus convenciones
  de nombres; esta traducción es el trabajo diario de integrar.
- **Migraciones de API.** Cuando el backend pasa de v1 a v2, la tabla de
  correspondencias es lo único que cambia si la capa está bien puesta.
- **Formatos heredados.** Leer un CSV o un XML antiguo con nombres imposibles es
  el mismo problema.
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

Tuyo es hacer que esos nombres lean del JSON de arriba. Y además una función:

\`\`\`swift
func resumen(_ c: Catalogo) -> String
\`\`\`

que devuelva \`<total>:<nombres de los activos separados por +>\`. Los inactivos
se decodifican igual, pero no aparecen en el resumen.
`,
    pasoAPaso: `
1. Declara los modelos con los nombres que quieres usar en tu app, no los del
   JSON.
2. Añade a cada uno la tabla de correspondencias que Swift necesita para
   decodificar. **Todas** las propiedades deben aparecer en ella, también las que
   ya coincidían.
3. Escribe \`resumen\` filtrando por el campo de actividad.
4. Comprueba el caso de un catálogo donde ninguno está activo: debe dar el total
   y una lista vacía, no fallar.
`,
    erroresTipicos: `
- **Listar solo las propiedades que cambian** en la tabla de correspondencias. Si
  declaras el enum, tiene que estar completo: las que falten dejan de
  decodificarse.
- **Renombrar la propiedad en vez de mapearla.** Volverías a tener el vocabulario
  del backend dentro de tu app.
- **Filtrar los inactivos al decodificar.** Perderías información que quizá otra
  pantalla necesita. Se filtra al usar, no al leer.
`,
    comoSeComprueba: `
El driver decodifica el JSON con el formato nuevo y llama a \`resumen\`. Si tu
tabla de correspondencias está incompleta, la decodificación falla y lo verás en
el veredicto.
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
