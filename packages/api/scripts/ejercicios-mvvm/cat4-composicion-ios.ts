import type { Ejercicio } from './tipos.js';

/** Firmas de lo ya proporcionado. Sin cuerpos: son solución de otros ejercicios. */
const YA_DECLARADO = {
  swift: `struct Item: Codable { var id: String; var name: String; var stock: Int }
struct Catalogo: Codable { var items: [Item] }
struct ErrorCarga: Error { var mensaje: String }

protocol FuenteRemota {
    func leer() throws -> Data          // devuelve el JSON en bruto
}

protocol ItemRepository {
    func obtenerTodos() throws -> [Item]
}

struct ItemsRequirement {
    let repositorio: ItemRepository
    func execute() throws -> [Item]     // descarta stock <= 0 y ordena por nombre
}

final class ItemsViewModel {
    private(set) var items: [Item]
    private(set) var cargando: Bool
    private(set) var error: String?
    init(requerimiento: ItemsRequirement)
    func cargar()                       // convierte el error lanzado en estado
}

// Fuentes de prueba, ya escritas:
struct FuenteFija: FuenteRemota { var texto: String }
struct FuenteQueFalla: FuenteRemota { var mensaje: String }`,
};


/**
 * Concepto 4.2 — Composición end-to-end (iOS).
 *
 * Cierra la pista de iOS. Mismo objetivo que su equivalente de Android, con el
 * vocabulario y los mecanismos propios: `Requirement` en lugar de `UseCase`,
 * `Codable` en lugar de mapper explícito, y `throws` en lugar de un tipo Result.
 */

const CATEGORIA = 'Composición';
const CAPA = 'Aplicación — `Composicion/Contenedor.swift` y `Repositorios/ItemRepositoryApi.swift`';

const PROBLEMA = `
Este ejercicio construye **dos piezas**, y ninguna contiene reglas de negocio:

1. La implementación real del repositorio, que decodifica el JSON que entrega la
   fuente y produce modelos.
2. La función que **monta la cadena completa** y devuelve el ViewModel listo para
   usar.

Hasta ahora cada ejercicio construyó una pieza suelta y las comprobaciones le
entregaron sus vecinos ya hechos. Falta responder a una pregunta que ninguna
pieza puede responder por sí misma: **quién decide qué implementación concreta
cumple cada protocolo**.

La respuesta no puede estar dentro de las piezas. Si el requerimiento eligiera su
repositorio, dejaría de poder comprobarse con uno falso. La decisión se concentra
en un único punto, y ese punto es la segunda pieza de este ejercicio.
`;

const DE_DONDE_VIENE = `
Ese punto único recibe el nombre de **raíz de composición** —*composition
root*—, término acuñado por Mark Seemann en *Dependency Injection in .NET*
(2011): el lugar, lo más cercano posible al arranque, donde se construye el grafo
de objetos. La regla que lo acompaña es que **ninguna otra parte del código
construye sus dependencias**; las recibe.

Entregar a cada pieza lo que necesita se denomina **inyección de dependencias**.
Swinject o Factory lo automatizan en iOS, pero el concepto es el inicializador
que recibe en lugar de construir. Este ejercicio lo hace a mano, que es la forma
de ver que la biblioteca resuelve un problema de volumen, no de diseño.

### Dónde entra el formato externo

La primera pieza es el otro extremo de la misma idea. El repositorio real es el
único punto donde el JSON entra al sistema: recibe los datos en bruto, los
decodifica y devuelve modelos. Las capas superiores nunca ven un \`Data\` ni un
\`JSONDecoder\`.

En la pista de iOS esa decodificación la genera \`Codable\`, de modo que la
traducción no se escribe: se declara. Lo que sí decide esta pieza es **qué ocurre
cuando el JSON no encaja**.

### Errores que se propagan

Swift no dispone en esta pista de un tipo \`Result\`: los fallos se propagan con
\`throws\`, y quien no puede tratarlos los deja pasar. Es una decisión de la
plataforma con una consecuencia concreta en la cadena de este ejercicio: el
repositorio no captura nada, y el ViewModel —el primero que puede hacer algo
útil con el fallo— lo convierte en estado.

Esa regla, *capturar donde se puede actuar*, es la misma que en Android lleva a
que el error viaje dentro del tipo hasta el ViewModel. Cambia el mecanismo, no el
lugar donde se decide.
`;

const DIAGRAMA = `
flowchart TB
    ROOT["crearViewModel()<br/>raíz de composición"]
    subgraph datos["Repositorios/"]
        F[FuenteRemota]
        REPO["ItemRepositoryApi<br/>pieza de este ejercicio"]
    end
    subgraph dominio["Requerimientos/"]
        C[ItemRepository]
        UC[ItemsRequirement]
    end
    subgraph presentacion["ViewModels/"]
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
- **Backend.** El arranque de un servidor construye conexiones, repositorios y
  servicios, y los entrega a los controladores.
- **Extensiones de aplicación.** Un widget o una extensión comparten el dominio
  con la aplicación principal y montan su propia raíz, con fuentes distintas.
- **Marcos con contenedor.** Spring, Angular o NestJS automatizan esta
  construcción; el concepto que implementan es este.
- **Pruebas de interfaz.** Se lanzan con una raíz alternativa que sustituye la
  fuente real por una fija, para obtener resultados reproducibles.
`;

const ERRORES = `
- **Construir dependencias dentro de las piezas.** Un requerimiento que cree su
  repositorio deja de poder comprobarse con uno falso.
- **Capturar el error en el repositorio.** El fallo quedaría oculto y la pantalla
  mostraría una lista vacía en lugar de un mensaje.
- **Devolver los datos sin decodificar.** El formato externo alcanzaría las capas
  superiores.
- **Colocar reglas de negocio en la raíz.** Su única responsabilidad es
  construir.
- **Declarar la variable con el tipo concreto** en lugar del protocolo. El resto
  de la cadena debe recibir la abstracción.
`;

const CABECERA = `import Foundation

struct Item: Codable {
    var id: String
    var name: String
    var stock: Int
}

struct Catalogo: Codable {
    var items: [Item]
}

struct ErrorCarga: Error {
    var mensaje: String
}

protocol FuenteRemota {
    func leer() throws -> Data
}

protocol ItemRepository {
    func obtenerTodos() throws -> [Item]
}

struct ItemsRequirement {
    let repositorio: ItemRepository

    func execute() throws -> [Item] {
        try repositorio.obtenerTodos().filter { $0.stock > 0 }.sorted { $0.name < $1.name }
    }
}

final class ItemsViewModel {
    private(set) var items: [Item] = []
    private(set) var cargando: Bool = false
    private(set) var error: String? = nil

    private let requerimiento: ItemsRequirement

    init(requerimiento: ItemsRequirement) {
        self.requerimiento = requerimiento
    }

    func cargar() {
        cargando = true
        error = nil
        do {
            items = try requerimiento.execute()
            cargando = false
        } catch let e as ErrorCarga {
            cargando = false
            error = e.mensaje
        } catch {
            cargando = false
            self.error = "formato invalido"
        }
    }
}

struct FuenteFija: FuenteRemota {
    var texto: String
    func leer() throws -> Data { texto.data(using: .utf8)! }
}

struct FuenteQueFalla: FuenteRemota {
    var mensaje: String
    func leer() throws -> Data { throw ErrorCarga(mensaje: mensaje) }
}`;

const JSON_OK =
  '{\\"items\\":[{\\"id\\":\\"1\\",\\"name\\":\\"Camisa\\",\\"stock\\":3},' +
  '{\\"id\\":\\"2\\",\\"name\\":\\"Abrigo\\",\\"stock\\":1},' +
  '{\\"id\\":\\"3\\",\\"name\\":\\"Zapato\\",\\"stock\\":0}]}';

const DRIVER = `${CABECERA}

{{solucion}}

func describir(_ vm: ItemsViewModel) -> String {
    vm.items.map { $0.name }.joined(separator: ",") + "|" + String(vm.cargando) + "|" +
        (vm.error ?? "-")
}

let jsonOk = "${JSON_OK}"
let jsonVacio = "{\\"items\\":[]}"
let jsonRoto = "{\\"items\\":[{\\"id\\":\\"1\\"}]}"

let caso = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
switch caso {
case "flujo_completo":
    let vm = crearViewModel(FuenteFija(texto: jsonOk))
    vm.cargar()
    print(describir(vm))
case "catalogo_vacio":
    let vm = crearViewModel(FuenteFija(texto: jsonVacio))
    vm.cargar()
    print(describir(vm))
case "fallo_de_la_fuente":
    let vm = crearViewModel(FuenteQueFalla(mensaje: "sin conexion"))
    vm.cargar()
    print(describir(vm))
case "json_incompleto":
    let vm = crearViewModel(FuenteFija(texto: jsonRoto))
    vm.cargar()
    print(describir(vm))
default:
    print("caso desconocido")
}`;

const CASOS = [
  { entrada: 'flujo_completo\n', salidaEsperada: 'Abrigo,Camisa|false|-', oculto: false },
  { entrada: 'catalogo_vacio\n', salidaEsperada: '|false|-', oculto: false },
  {
    entrada: 'fallo_de_la_fuente\n',
    salidaEsperada: '|false|sin conexion',
    oculto: false,
  },
  { entrada: 'json_incompleto\n', salidaEsperada: '|false|formato invalido', oculto: true },
];

const FIRMA = `
\`\`\`swift
struct ItemRepositoryApi: ItemRepository {
    let fuente: FuenteRemota
    func obtenerTodos() throws -> [Item]
}

func crearViewModel(_ fuente: FuenteRemota) -> ItemsViewModel
\`\`\`

Se proporcionan ya escritos: \`Item\` y \`Catalogo\` —ambos \`Codable\`—,
\`ErrorCarga\`, \`FuenteRemota\`, \`ItemRepository\`, \`ItemsRequirement\` e
\`ItemsViewModel\`. También dos fuentes de prueba: \`FuenteFija\`, que devuelve un
texto fijo, y \`FuenteQueFalla\`.

El JSON que entrega la fuente tiene esta forma:

\`\`\`json
{ "items": [ { "id": "1", "name": "Camisa", "stock": 3 } ] }
\`\`\`
`;

const SOLUCIONES = [
  // Estrategia A: decodificación directa del catálogo.
  `struct ItemRepositoryApi: ItemRepository {
    let fuente: FuenteRemota

    func obtenerTodos() throws -> [Item] {
        let datos = try fuente.leer()
        let catalogo = try JSONDecoder().decode(Catalogo.self, from: datos)
        return catalogo.items
    }
}

func crearViewModel(_ fuente: FuenteRemota) -> ItemsViewModel {
    let repositorio: ItemRepository = ItemRepositoryApi(fuente: fuente)
    let requerimiento = ItemsRequirement(repositorio: repositorio)
    return ItemsViewModel(requerimiento: requerimiento)
}`,
  // Estrategia B: decodificador guardado como propiedad.
  `struct ItemRepositoryApi: ItemRepository {
    let fuente: FuenteRemota
    private let decodificador = JSONDecoder()

    func obtenerTodos() throws -> [Item] {
        try decodificador.decode(Catalogo.self, from: try fuente.leer()).items
    }
}

func crearViewModel(_ fuente: FuenteRemota) -> ItemsViewModel {
    ItemsViewModel(
        requerimiento: ItemsRequirement(repositorio: ItemRepositoryApi(fuente: fuente))
    )
}`,
];

const COMPRUEBA = `
Cuatro comprobaciones. Cada una monta la cadena con una fuente distinta, invoca
\`cargar\` y muestra el estado final con el formato \`nombres|cargando|error\`.
Cuando no hay error se imprime \`-\`.

Conviene recordar que el requerimiento proporcionado descarta los artículos sin
unidades y ordena por nombre. El artículo \`Zapato\`, con \`stock\` a \`0\`, no
aparece en ningún resultado por ese motivo, no por la decodificación.

- **\`flujo_completo\`** — un JSON con tres artículos correctos.
  Debe imprimir \`Abrigo,Camisa|false|-\`.
  *Verifica:* que la cadena entera esté conectada y que la decodificación
  produzca los modelos.
- **\`catalogo_vacio\`** — un JSON con la lista vacía.
  Debe imprimir \`|false|-\`.
  *Verifica:* que un catálogo vacío sea una respuesta correcta y no un error.
- **\`fallo_de_la_fuente\`** — la fuente lanza \`ErrorCarga\`.
  Debe imprimir \`|false|sin conexion\`.
  *Verifica:* que el repositorio deje pasar el error y el ViewModel lo convierta
  en estado.
- **Una comprobación oculta** — un JSON al que le faltan campos obligatorios.
  *Verifica:* que el fallo de decodificación también se propague, y que el
  ViewModel lo distinga del anterior.

La comprobación oculta es deducible: el ViewModel proporcionado distingue dos
clases de fallo en sus ramas de captura, y el enunciado indica que el repositorio
no captura ninguna.
`;

export const composicionIos: Ejercicio[] = [
  // --- GUIADO ---------------------------------------------------------------
  {
    slugBase: 'mvvm-composicion-io',
    tituloBase: 'Composición end-to-end (iOS)',
    nivel: 'guiado',
    categoria: CATEGORIA,
    lenguajes: ['swift'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
El repositorio real y la raíz de composición.
${FIRMA}
`,
    pasoAPaso: `
1. Declara \`ItemRepositoryApi\` recibiendo la fuente y cumpliendo el protocolo
   \`ItemRepository\`.
2. En \`obtenerTodos\`, pide los datos a la fuente. La llamada está marcada
   \`throws\`, de modo que requiere \`try\`.
3. Decodifica esos datos como \`Catalogo\` y devuelve su lista de artículos. La
   decodificación también puede fallar y también requiere \`try\`.
4. No escribas \`do\`/\`catch\`. Al estar la función marcada \`throws\`, los dos
   errores se propagan solos hasta el ViewModel, que es quien puede actuar.
5. No filtres ni ordenes: eso corresponde al requerimiento.
6. Escribe \`crearViewModel\` construyendo la cadena de dentro hacia fuera:
   repositorio con la fuente, requerimiento con el repositorio, ViewModel con el
   requerimiento.
7. Declara la variable del repositorio con el tipo del **protocolo**. Es lo que
   permite sustituir la implementación sin tocar nada más.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    yaDeclarado: YA_DECLARADO,
    plantilla: { swift: DRIVER },
    inicial: {
      swift: `struct ItemRepositoryApi: ItemRepository {
    let fuente: FuenteRemota

    func obtenerTodos() throws -> [Item] {
        // TODO 1: pedir los datos a la fuente
        // TODO 2: decodificarlos como Catalogo
        // TODO 3: devolver su lista de artículos
        return []
    }
}

func crearViewModel(_ fuente: FuenteRemota) -> ItemsViewModel {
    // TODO 4: montar repositorio, requerimiento y ViewModel, en ese orden
    return ItemsViewModel(
        requerimiento: ItemsRequirement(repositorio: ItemRepositoryApi(fuente: fuente))
    )
}
`,
    },
    casos: CASOS,
    soluciones: { swift: SOLUCIONES },
  },

  // --- BASE -----------------------------------------------------------------
  {
    slugBase: 'mvvm-composicion-io',
    tituloBase: 'Composición end-to-end (iOS)',
    nivel: 'base',
    categoria: CATEGORIA,
    lenguajes: ['swift'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
El repositorio real y la raíz de composición, con estas firmas:
${FIRMA}
`,
    pasoAPaso: `
1. Determina qué corresponde al repositorio y qué al requerimiento. El
   repositorio decodifica; el requerimiento decide.
2. Decide qué hacer con los dos errores que pueden producirse: el de la fuente y
   el de la decodificación. Las comprobaciones indican dónde deben terminar.
3. Monta la cadena en la raíz, declarando cada pieza con el tipo que deben
   recibir las demás.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    yaDeclarado: YA_DECLARADO,
    plantilla: { swift: DRIVER },
    inicial: {
      swift: `// Escribe aquí ItemRepositoryApi y crearViewModel.
// Item, Catalogo, ErrorCarga, FuenteRemota, ItemRepository, ItemsRequirement
// e ItemsViewModel ya están declarados.
`,
    },
    casos: CASOS,
    soluciones: { swift: SOLUCIONES },
  },

  // --- RETO -----------------------------------------------------------------
  {
    slugBase: 'mvvm-composicion-io',
    tituloBase: 'Composición end-to-end (iOS)',
    nivel: 'reto',
    categoria: CATEGORIA,
    lenguajes: ['swift'],
    capa: CAPA,
    problema: `
La aplicación debe seguir mostrando el catálogo sin conexión. Se dispone de un
almacén local que guarda y devuelve los últimos artículos obtenidos, y la regla
es la siguiente: se intenta la fuente remota y, si falla, se recurre a lo
guardado. Cuando la fuente responde, lo obtenido se guarda para la próxima vez.

La pregunta relevante no es cómo guardar, sino **dónde colocar ese
comportamiento**. Hay tres candidatos, y dos son incorrectos:

- En el repositorio remoto: quedaría mezclado con la decodificación, y no habría
  forma de usarlo sin respaldo local.
- En el requerimiento: de dónde vienen los datos no es una regla del negocio.
- En una pieza propia que **envuelva** al repositorio remoto: cumple el mismo
  protocolo, de modo que quien la consume no distingue si hay respaldo o no.

La tercera es la del ejercicio, y su consecuencia es que **la raíz de composición
es el único archivo que cambia** al añadirla.
`,
    deDondeViene: `
Envolver un objeto con otro que cumple su mismo protocolo y añade comportamiento
se denomina patrón **Decorador**, catalogado por la Banda de los Cuatro en
*Design Patterns* (1994).

La condición que lo hace funcionar es que el decorador **cumpla el mismo
protocolo** que decora. Por eso puede ocupar su lugar sin que nadie más se
entere, que es la formulación del principio de sustitución de Liskov —la L de
SOLID—.

En Swift el patrón encaja de forma especialmente directa, porque los protocolos
no obligan a heredar: cualquier \`struct\` o \`class\` puede cumplirlos. Una
subclase del repositorio remoto quedaría atada a esa implementación concreta; un
decorador funciona con **cualquiera** que cumpla el protocolo.

### Degradación controlada

La estrategia que implementa este nivel se denomina **degradación controlada**:
ante un fallo, el sistema ofrece una respuesta de menor calidad en lugar de
ninguna. Un catálogo con horas de antigüedad es preferible a una pantalla de
error, siempre que la aplicación no dependa de que el dato esté al día.

La decisión de cuándo es aceptable degradar y cuándo no pertenece al producto, no
al código. Un catálogo admite datos antiguos; un saldo bancario, no.

### El coste

Un decorador añade una capa de indirección, y con varios apilados el
comportamiento efectivo deja de leerse en una sola clase: hay que recorrer la
raíz para conocer el orden. Es el compromiso del patrón.
`,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: `
- **Clientes HTTP.** Las políticas de caché y reintento se implementan como
  capas que envuelven al cliente real.
- **Aplicaciones sin conexión.** El repositorio con respaldo local es el patrón
  estándar de las aplicaciones que deben funcionar sin red.
- **Interruptores de circuito.** Un decorador que deja de intentar la llamada
  remota tras varios fallos seguidos es la misma estructura.
`,
    queEscribes: `
Un decorador con respaldo local y una raíz que lo incorpora:

\`\`\`swift
protocol AlmacenLocal {
    func guardar(_ items: [Item])
    func leer() -> [Item]?
}

struct ItemRepositoryApi: ItemRepository { ... }

struct ItemRepositoryConRespaldo: ItemRepository {
    let remoto: ItemRepository
    let almacen: AlmacenLocal
    func obtenerTodos() throws -> [Item]
}

func crearViewModel(_ fuente: FuenteRemota, _ almacen: AlmacenLocal) -> ItemsViewModel
\`\`\`

El protocolo \`AlmacenLocal\` y una implementación en memoria se proporcionan ya
escritos.

Comportamiento exigido del decorador:

1. Si el repositorio remoto responde, se **guarda** el resultado y se devuelve.
2. Si el repositorio remoto falla y el almacén tiene algo guardado, se devuelve
   lo guardado, **sin** propagar el error.
3. Si el repositorio remoto falla y el almacén está vacío, se **propaga** el
   error original.
4. Un resultado remoto vacío también se guarda: es una respuesta válida.
`,
    pasoAPaso: `
1. Reutiliza el repositorio remoto del nivel base sin modificarlo.
2. Declara el decorador recibiendo **el protocolo** y el almacén, no la clase
   concreta.
3. Envuelve la llamada al remoto en \`do\`/\`catch\`. Es el único punto de la
   cadena donde capturar tiene sentido, porque es el único que dispone de una
   alternativa.
4. En el camino de fallo, consulta el almacén. Si devuelve la ausencia, vuelve a
   lanzar el error recibido; la palabra \`throw\` dentro del \`catch\` lo permite.
5. En la raíz, monta el decorador alrededor del remoto y entrégalo al
   requerimiento.
`,
    erroresTipicos: `
- **Capturar el error y devolver una lista vacía cuando el almacén está vacío.**
  La pantalla mostraría un catálogo vacío en lugar del mensaje de error.
- **Guardar antes de saber si la llamada remota tuvo éxito.** Se sobrescribiría
  el respaldo con datos que no llegaron.
- **Consultar el almacén antes que el remoto.** Convertiría el respaldo en caché
  permanente y los datos no se actualizarían nunca.
- **Tratar la lista vacía del almacén como ausencia.** Un catálogo vacío guardado
  es un dato legítimo; la ausencia se expresa con \`nil\`.
`,
    comoSeComprueba: `
Las comprobaciones montan la cadena con una fuente y un almacén en memoria, y
muestran el estado final con el formato \`nombres|cargando|error\`.

- **\`remoto_responde_y_guarda\`** — la fuente responde. Después se consulta
  directamente el almacén y se imprime cuántos artículos conserva, separado por
  \` ; \`.
  Debe imprimir \`Abrigo,Camisa|false|- ; 3\`. El almacén conserva **tres**: el
  filtrado por unidades ocurre en el requerimiento, después del repositorio.
  *Verifica:* la regla 1, y que el guardado ocurra antes del filtro del negocio.
- **\`sin_red_usa_el_respaldo\`** — el almacén ya contiene artículos y la fuente
  falla.
  Debe imprimir \`Abrigo,Camisa|false|- ; 3\`.
  *Verifica:* la regla 2: el error no llega a la pantalla.
- **\`sin_red_y_sin_respaldo\`** — la fuente falla y el almacén está vacío.
  Debe imprimir \`|false|sin conexion ; 0\`.
  *Verifica:* la regla 3.
- **Una comprobación oculta** — la fuente responde con un catálogo vacío.
  *Verifica:* la regla 4.

La comprobación oculta es deducible: la regla 4 la enuncia de forma explícita, y
ninguna comprobación visible la ejercita.
`,
    yaDeclarado: YA_DECLARADO,
    plantilla: {
      swift: `${CABECERA}

protocol AlmacenLocal {
    func guardar(_ items: [Item])
    func leer() -> [Item]?
}

final class AlmacenEnMemoria: AlmacenLocal {
    private var guardados: [Item]? = nil

    init(inicial: [Item]? = nil) {
        guardados = inicial
    }

    func guardar(_ items: [Item]) {
        guardados = items
    }

    func leer() -> [Item]? {
        guardados
    }

    var cuantos: Int {
        guardados?.count ?? 0
    }
}

{{solucion}}

func describir(_ vm: ItemsViewModel) -> String {
    vm.items.map { $0.name }.joined(separator: ",") + "|" + String(vm.cargando) + "|" +
        (vm.error ?? "-")
}

let jsonOk = "${JSON_OK}"
let jsonVacio = "{\\"items\\":[]}"
let guardados = [
    Item(id: "1", name: "Camisa", stock: 3),
    Item(id: "2", name: "Abrigo", stock: 1),
    Item(id: "3", name: "Zapato", stock: 0),
]

let caso = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
switch caso {
case "remoto_responde_y_guarda":
    let a = AlmacenEnMemoria()
    let vm = crearViewModel(FuenteFija(texto: jsonOk), a)
    vm.cargar()
    print(describir(vm) + " ; \\(a.cuantos)")
case "sin_red_usa_el_respaldo":
    let a = AlmacenEnMemoria(inicial: guardados)
    let vm = crearViewModel(FuenteQueFalla(mensaje: "sin conexion"), a)
    vm.cargar()
    print(describir(vm) + " ; \\(a.cuantos)")
case "sin_red_y_sin_respaldo":
    let a = AlmacenEnMemoria()
    let vm = crearViewModel(FuenteQueFalla(mensaje: "sin conexion"), a)
    vm.cargar()
    print(describir(vm) + " ; \\(a.cuantos)")
case "remoto_vacio_se_guarda":
    let a = AlmacenEnMemoria(inicial: guardados)
    let vm = crearViewModel(FuenteFija(texto: jsonVacio), a)
    vm.cargar()
    print(describir(vm) + " ; \\(a.cuantos)")
default:
    print("caso desconocido")
}`,
    },
    inicial: {
      swift: `// Escribe aquí ItemRepositoryApi, ItemRepositoryConRespaldo y crearViewModel.
// Item, Catalogo, ErrorCarga, FuenteRemota, ItemRepository, ItemsRequirement,
// ItemsViewModel, AlmacenLocal y AlmacenEnMemoria ya están declarados.
//
//   func crearViewModel(_ fuente: FuenteRemota, _ almacen: AlmacenLocal) -> ItemsViewModel
`,
    },
    casos: [
      {
        entrada: 'remoto_responde_y_guarda\n',
        salidaEsperada: 'Abrigo,Camisa|false|- ; 3',
        oculto: false,
      },
      {
        entrada: 'sin_red_usa_el_respaldo\n',
        salidaEsperada: 'Abrigo,Camisa|false|- ; 3',
        oculto: false,
      },
      {
        entrada: 'sin_red_y_sin_respaldo\n',
        salidaEsperada: '|false|sin conexion ; 0',
        oculto: false,
      },
      { entrada: 'remoto_vacio_se_guarda\n', salidaEsperada: '|false|- ; 0', oculto: true },
    ],
    soluciones: {
      swift: [
        // Estrategia A: do/catch con consulta al almacén en el camino de fallo.
        `struct ItemRepositoryApi: ItemRepository {
    let fuente: FuenteRemota

    func obtenerTodos() throws -> [Item] {
        let datos = try fuente.leer()
        return try JSONDecoder().decode(Catalogo.self, from: datos).items
    }
}

struct ItemRepositoryConRespaldo: ItemRepository {
    let remoto: ItemRepository
    let almacen: AlmacenLocal

    func obtenerTodos() throws -> [Item] {
        do {
            let obtenidos = try remoto.obtenerTodos()
            almacen.guardar(obtenidos)
            return obtenidos
        } catch {
            if let respaldo = almacen.leer() {
                return respaldo
            }
            throw error
        }
    }
}

func crearViewModel(_ fuente: FuenteRemota, _ almacen: AlmacenLocal) -> ItemsViewModel {
    let remoto: ItemRepository = ItemRepositoryApi(fuente: fuente)
    let conRespaldo: ItemRepository =
        ItemRepositoryConRespaldo(remoto: remoto, almacen: almacen)
    return ItemsViewModel(requerimiento: ItemsRequirement(repositorio: conRespaldo))
}`,
        // Estrategia B: resultado intermedio y guard let sobre el respaldo.
        `struct ItemRepositoryApi: ItemRepository {
    let fuente: FuenteRemota
    private let decodificador = JSONDecoder()

    func obtenerTodos() throws -> [Item] {
        try decodificador.decode(Catalogo.self, from: try fuente.leer()).items
    }
}

struct ItemRepositoryConRespaldo: ItemRepository {
    let remoto: ItemRepository
    let almacen: AlmacenLocal

    func obtenerTodos() throws -> [Item] {
        var obtenidos: [Item]
        do {
            obtenidos = try remoto.obtenerTodos()
        } catch let fallo {
            guard let respaldo = almacen.leer() else { throw fallo }
            return respaldo
        }
        almacen.guardar(obtenidos)
        return obtenidos
    }
}

func crearViewModel(_ fuente: FuenteRemota, _ almacen: AlmacenLocal) -> ItemsViewModel {
    ItemsViewModel(
        requerimiento: ItemsRequirement(
            repositorio: ItemRepositoryConRespaldo(
                remoto: ItemRepositoryApi(fuente: fuente),
                almacen: almacen
            )
        )
    )
}`,
      ],
    },
  },
];
