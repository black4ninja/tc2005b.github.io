import type { Ejercicio } from './tipos.js';

/** Firmas de lo ya proporcionado. Sin cuerpos: son solución de otros ejercicios. */
const YA_DECLARADO = {
  swift: `struct Item {
    var id: String
    var name: String
    var stock: Int
}

struct ErrorCarga: Error { var mensaje: String }

protocol ItemRepository {
    func obtenerTodos() throws -> [Item]
}

// Aplica las reglas de negocio. Propaga el error del repositorio.
struct ItemsRequirement {
    let repositorio: ItemRepository
    func execute() throws -> [Item]
}

// Repositorios de prueba, ya escritos:
struct RepositorioFijo: ItemRepository { var items: [Item] }
struct RepositorioQueFalla: ItemRepository { var mensaje: String }`,
};


/**
 * Concepto 3.4 — ViewModel (iOS).
 *
 * RESTRICCIÓN DEL JUEZ, explicada en el enunciado: Combine no existe en Linux.
 * `ObservableObject` y `@Published` no compilan en el servidor. Se sustituyen
 * por un callback, que es el mismo mecanismo sin la biblioteca.
 *
 * La pista de iOS del wiki NO usa un tipo de estado único: mantiene propiedades
 * separadas en el ViewModel. El ejercicio es fiel a eso, y el contraste con
 * `ItemsUiState` de Android se explica en "De dónde viene".
 */

const CATEGORIA = 'Estado y ViewModel';
const CAPA = 'Presentación — `ViewModels/ItemsViewModel.swift`';

const PROBLEMA = `
Este ejercicio construye **una sola pieza**: el ViewModel de la pantalla de
listado en la pista de iOS.

Sus dos vecinos ya están escritos en ejercicios anteriores:

- **Quien lo abastece**: el \`ItemsRequirement\`, que aplica las reglas del
  negocio.
- **Quién lo observa**: la vista, que lee sus propiedades y se redibuja cuando
  cambian.

Su responsabilidad consiste en tres cosas: guardar qué se está mostrando,
ordenar la obtención cuando la vista lo pide, y avisar de que algo cambió.

Lo que no hace: obtener datos por su cuenta, aplicar reglas de negocio y dibujar.
`;

const DE_DONDE_VIENE = `
El patrón es el mismo que en Android —Presentation Model, descrito por Martin
Fowler en 2004— y responde a la misma necesidad: **el estado debe sobrevivir a la
vista**. En iOS una pantalla puede descargarse por falta de memoria y volver a
construirse después; si el estado viviera en ella, se perdería.

La regla que lo define también es la misma: el ViewModel **no conoce la vista**.
La dependencia va en un solo sentido.

### Dos formas de guardar el estado

Aquí las dos pistas del curso divergen, y conviene saber que la diferencia es
deliberada:

| | Android | iOS |
|---|---|---|
| Estado | un único \`ItemsUiState\` | propiedades separadas |
| Aviso | \`StateFlow\` o \`LiveData\` | \`@Published\` de Combine |
| Marca del tipo | — | \`ObservableObject\` |

Las propiedades separadas son más directas de escribir y encajan con la forma en
que SwiftUI observa los cambios. A cambio, no impiden las combinaciones
incoherentes: con \`cargando\` y \`error\` como campos independientes, nada evita
que ambos sean ciertos a la vez. Es el problema que en Android resuelve el tipo
de estado único.

Reconocer ese compromiso forma parte del ejercicio: ninguna de las dos formas es
incorrecta, y la elección la determina el marco de trabajo de cada plataforma.

### Por qué aquí no se usa Combine

El juez compila Swift de consola sobre Linux, donde **Combine no está
disponible**: \`ObservableObject\` y \`@Published\` no existen en esa plataforma y el
código no compilaría.

El mecanismo se sustituye por una función guardada en una propiedad, que el
ViewModel invoca cuando el estado cambia. Es lo mismo que hace \`@Published\` por
debajo: notificar a quien se ha suscrito, sin saber quién es.

### La clase, no la estructura

El ViewModel es \`class\` y no \`struct\`. Un tipo de valor se copia en cada
asignación, de modo que la vista y quien lanzó la carga acabarían trabajando
sobre copias distintas y los cambios de una no llegarían a la otra.

Es el mismo razonamiento del primer ejercicio, con la conclusión contraria: el
modelo de datos se beneficia de la semántica de valor; una pieza con identidad y
estado compartido requiere la de referencia.
`;

const DIAGRAMA = `
flowchart LR
    subgraph dominio["Requerimientos/"]
        UC[ItemsRequirement]
    end
    subgraph presentacion["ViewModels/"]
        VM["ItemsViewModel<br/>pieza de este ejercicio"]
    end
    V["ContentView<br/>observa"]
    UC --> VM
    VM -.notifica.-> V
    V -->|cargar| VM
    style VM fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px
`;

const DONDE_MAS = `
- **SwiftUI.** Un \`ObservableObject\` real cumple esta función; la diferencia con
  este ejercicio es solo la herramienta de aviso.
- **UIKit.** Antes de Combine, el mismo patrón se implementaba exactamente así:
  con una propiedad de tipo closure que la vista asignaba.
- **Web.** Los contenedores de estado de React o Vue resuelven el mismo problema
  con el mismo esquema de suscripción.
- **Escritorio.** WPF y JavaFX utilizan el patrón con su nombre original.
`;

const ERRORES = `
- **Declarar el ViewModel como \`struct\`.** Cada copia mantendría su propio
  estado y los cambios no llegarían a la vista.
- **Guardar una referencia a la vista.** Rompe la regla que define el patrón.
- **Exponer las propiedades como modificables desde fuera.** Cualquiera podría
  dejar el ViewModel en una combinación incoherente.
- **Aplicar reglas de negocio.** Su lugar es el \`Requirement\`.
- **Notificar antes de haber actualizado las propiedades.** Quien reciba el aviso
  y las consulte leería los valores anteriores.
- **Dejar que el error del requerimiento salga de \`cargar\`.** La vista no tiene
  forma de tratarlo; debe convertirse en estado.
`;

const CABECERA = `import Foundation

struct Item {
    var id: String
    var name: String
    var stock: Int
}

struct ErrorCarga: Error {
    var mensaje: String
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

struct RepositorioFijo: ItemRepository {
    var items: [Item]
    func obtenerTodos() throws -> [Item] { items }
}

struct RepositorioQueFalla: ItemRepository {
    var mensaje: String
    func obtenerTodos() throws -> [Item] { throw ErrorCarga(mensaje: mensaje) }
}`;

const DRIVER = `${CABECERA}

{{solucion}}

func describir(_ vm: ItemsViewModel) -> String {
    vm.items.map { $0.name }.joined(separator: ",") + "|" + String(vm.cargando) + "|" +
        (vm.error ?? "-")
}

let datos = [
    Item(id: "1", name: "Camisa", stock: 3),
    Item(id: "2", name: "Abrigo", stock: 1),
    Item(id: "3", name: "Zapato", stock: 0),
]
var emitidos: [String] = []
let caso = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
switch caso {
case "estado_inicial":
    let vm = ItemsViewModel(requerimiento: ItemsRequirement(repositorio: RepositorioFijo(items: datos)))
    print(describir(vm))
case "emite_al_cargar":
    let vm = ItemsViewModel(requerimiento: ItemsRequirement(repositorio: RepositorioFijo(items: datos)))
    vm.observar { emitidos.append(describir(vm)) }
    vm.cargar()
    print(emitidos.joined(separator: " / "))
case "carga_con_fallo":
    let vm = ItemsViewModel(requerimiento: ItemsRequirement(repositorio: RepositorioQueFalla(mensaje: "sin conexion")))
    vm.observar { emitidos.append(describir(vm)) }
    vm.cargar()
    print(describir(vm))
case "sin_observador":
    let vm = ItemsViewModel(requerimiento: ItemsRequirement(repositorio: RepositorioFijo(items: datos)))
    vm.cargar()
    print(describir(vm))
default:
    print("caso desconocido")
}`;

const CASOS = [
  { entrada: 'estado_inicial\n', salidaEsperada: '|false|-', oculto: false },
  {
    entrada: 'emite_al_cargar\n',
    salidaEsperada: '|true|- / Abrigo,Camisa|false|-',
    oculto: false,
  },
  { entrada: 'carga_con_fallo\n', salidaEsperada: '|false|sin conexion', oculto: false },
  { entrada: 'sin_observador\n', salidaEsperada: 'Abrigo,Camisa|false|-', oculto: true },
];

const FIRMA = `
\`\`\`swift
final class ItemsViewModel {
    private(set) var items: [Item]
    private(set) var cargando: Bool
    private(set) var error: String?

    init(requerimiento: ItemsRequirement)

    func observar(_ alCambiar: @escaping () -> Void)
    func cargar()
}
\`\`\`

\`Item\`, \`ItemRepository\`, \`ItemsRequirement\` y \`ErrorCarga\` se proporcionan ya
declarados. \`ItemsRequirement.execute()\` está marcado \`throws\` y propaga el
fallo del repositorio; \`ErrorCarga\` tiene una propiedad \`mensaje\`.
`;

const REGLAS = `
1. Al construirse: sin artículos, \`cargando\` en \`false\` y sin error.
2. \`observar\` guarda la función recibida. Solo hay un observador; una llamada
   posterior sustituye al anterior.
3. \`cargar\` produce **dos** avisos en este orden:
   - Primero, con \`cargando\` en \`true\` y el error limpio.
   - Después, con los artículos obtenidos y \`cargando\` en \`false\`, o con el
     mensaje de error si la obtención falló.
4. Las propiedades se actualizan **antes** de notificar, y se notifica solo si hay
   observador. Sin observador, las propiedades cambian igualmente.
5. El error del requerimiento no debe salir de \`cargar\`: se convierte en el
   mensaje de la propiedad \`error\`.
`;

const COMPRUEBA = `
Cuatro comprobaciones. El estado se muestra con el formato
\`nombres|cargando|error\`, y \`-\` cuando no hay error. Cuando se comprueban
varios avisos, se separan con \` / \`.

El requerimiento proporcionado descarta los artículos sin unidades y ordena por
nombre, de modo que el catálogo de tres artículos produce dos.

- **\`estado_inicial\`** — se construye el ViewModel y se consultan sus
  propiedades, sin invocar \`cargar\`.
  Debe imprimir \`|false|-\`.
  *Verifica:* la regla 1.
- **\`emite_al_cargar\`** — se registra un observador, se invoca \`cargar\` y se
  muestran **todos** los avisos recibidos.
  Debe imprimir \`|true|- / Abrigo,Camisa|false|-\`.
  *Verifica:* la regla 3, incluido el orden, y la regla 4: en cada aviso las
  propiedades ya tienen el valor nuevo.
- **\`carga_con_fallo\`** — el requerimiento lanza el error.
  Debe imprimir \`|false|sin conexion\`.
  *Verifica:* la regla 5.
- **Una comprobación oculta** — se invoca \`cargar\` **sin** registrar observador.
  *Verifica:* la última frase de la regla 4.

La comprobación oculta es deducible: la regla 4 indica explícitamente que las
propiedades cambian aunque no haya observador.
`;

const SOLUCIONES = [
  // Estrategia A: método privado que centraliza notificar.
  `final class ItemsViewModel {
    private(set) var items: [Item] = []
    private(set) var cargando: Bool = false
    private(set) var error: String? = nil

    private let requerimiento: ItemsRequirement
    private var alCambiar: (() -> Void)? = nil

    init(requerimiento: ItemsRequirement) {
        self.requerimiento = requerimiento
    }

    func observar(_ alCambiar: @escaping () -> Void) {
        self.alCambiar = alCambiar
    }

    private func notificar() {
        alCambiar?()
    }

    func cargar() {
        cargando = true
        error = nil
        notificar()
        do {
            items = try requerimiento.execute()
            cargando = false
            error = nil
        } catch let e as ErrorCarga {
            cargando = false
            error = e.mensaje
        } catch {
            cargando = false
            self.error = "error"
        }
        notificar()
    }
}`,
  // Estrategia B: los tres valores se calculan aparte y se asignan de una vez.
  `final class ItemsViewModel {
    private(set) var items: [Item] = []
    private(set) var cargando: Bool = false
    private(set) var error: String? = nil

    private let requerimiento: ItemsRequirement
    private var observador: (() -> Void)?

    init(requerimiento: ItemsRequirement) {
        self.requerimiento = requerimiento
    }

    func observar(_ alCambiar: @escaping () -> Void) {
        observador = alCambiar
    }

    private func aplicar(items: [Item], cargando: Bool, error: String?) {
        self.items = items
        self.cargando = cargando
        self.error = error
        if let o = observador { o() }
    }

    func cargar() {
        aplicar(items: items, cargando: true, error: nil)
        var obtenidos: [Item] = []
        do {
            obtenidos = try requerimiento.execute()
        } catch let e as ErrorCarga {
            aplicar(items: items, cargando: false, error: e.mensaje)
            return
        } catch {
            aplicar(items: items, cargando: false, error: "error")
            return
        }
        aplicar(items: obtenidos, cargando: false, error: nil)
    }
}`,
];

export const viewModelIos: Ejercicio[] = [
  // --- GUIADO ---------------------------------------------------------------
  {
    slugBase: 'mvvm-viewmodel-io',
    tituloBase: 'ViewModel (iOS)',
    nivel: 'guiado',
    categoria: CATEGORIA,
    lenguajes: ['swift'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
El ViewModel de la pantalla de listado.
${FIRMA}

Reglas:
${REGLAS}
`,
    pasoAPaso: `
1. Declara la clase como \`final class\`. La marca \`final\` indica que no está
   pensada para heredarse y permite al compilador resolver las llamadas de forma
   directa.
2. Declara las tres propiedades con \`private(set)\`: se leen desde fuera y solo se
   escriben desde dentro.
3. Guarda el requerimiento recibido en el inicializador.
4. Declara la propiedad del observador. Su tipo admite la ausencia, porque puede
   no haberse registrado ninguno, y la función debe marcarse \`@escaping\` porque
   se conserva más allá de la llamada.
5. Escribe \`cargar\`. Actualiza primero las propiedades para el estado en curso y
   notifica.
6. Invoca el requerimiento dentro de \`do\`/\`catch\`. En el camino correcto,
   coloca los artículos; en el de fallo, el mensaje de \`ErrorCarga\`.
7. Notifica una segunda vez, después de haber actualizado las propiedades.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    yaDeclarado: YA_DECLARADO,
    plantilla: { swift: DRIVER },
    inicial: {
      swift: `final class ItemsViewModel {
    private(set) var items: [Item] = []
    private(set) var cargando: Bool = false
    private(set) var error: String? = nil

    private let requerimiento: ItemsRequirement
    private var alCambiar: (() -> Void)? = nil

    init(requerimiento: ItemsRequirement) {
        self.requerimiento = requerimiento
    }

    func observar(_ alCambiar: @escaping () -> Void) {
        // TODO: guardar la función recibida
    }

    func cargar() {
        // TODO 1: pasar a estado de carga y notificar
        // TODO 2: invocar el requerimiento dentro de do/catch
        // TODO 3: colocar los artículos o el mensaje de error, y notificar
    }
}
`,
    },
    casos: CASOS,
    soluciones: { swift: SOLUCIONES },
  },

  // --- BASE -----------------------------------------------------------------
  {
    slugBase: 'mvvm-viewmodel-io',
    tituloBase: 'ViewModel (iOS)',
    nivel: 'base',
    categoria: CATEGORIA,
    lenguajes: ['swift'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
El ViewModel de la pantalla de listado, con esta firma:
${FIRMA}

Reglas:
${REGLAS}
`,
    pasoAPaso: `
1. Decide entre \`class\` y \`struct\`, y por qué. El apartado "De dónde viene"
   contiene el argumento.
2. Expón las propiedades de forma que se lean desde fuera y solo se escriban
   desde dentro.
3. Respeta el orden de la regla 3 y la precedencia de la regla 4.
4. Convierte el error del requerimiento en estado, sin dejar que salga de
   \`cargar\`.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    yaDeclarado: YA_DECLARADO,
    plantilla: { swift: DRIVER },
    inicial: {
      swift: `// Escribe aquí ItemsViewModel según el enunciado.
// Item, ItemRepository, ItemsRequirement y ErrorCarga ya están declarados.
`,
    },
    casos: CASOS,
    soluciones: { swift: SOLUCIONES },
  },

  // --- RETO -----------------------------------------------------------------
  {
    slugBase: 'mvvm-viewmodel-io',
    tituloBase: 'ViewModel (iOS)',
    nivel: 'reto',
    categoria: CATEGORIA,
    lenguajes: ['swift'],
    capa: CAPA,
    problema: `
El ViewModel del nivel base admite un solo observador y lo sustituye en cada
llamada. Una pantalla real tiene varios, y cada uno debe poder **darse de baja**
cuando desaparece.

La baja no es una comodidad. Guardar la función de un observador implica guardar
también todo lo que esa función captura, incluida la propia pantalla. Mientras el
ViewModel conserve esa función, la pantalla **no se libera de memoria**, aunque
ya no se vea.

En Swift esto es comprobable de forma directa, porque la liberación es
determinista: se puede saber con exactitud en qué momento un objeto deja de
existir.
`,
    deDondeViene: `
Swift administra la memoria con **ARC** —*Automatic Reference Counting*—. Cada
objeto lleva la cuenta de cuántas referencias fuertes lo señalan, y se libera en
el instante en que esa cuenta llega a cero. No hay recolector de basura ni
momento indeterminado: la liberación ocurre exactamente entonces, y es el motivo
por el que \`deinit\` sirve para comprobarlo.

Una **closure captura por referencia fuerte** todo lo que menciona, salvo
indicación contraria. Guardar una closure de un observador equivale, por tanto, a
guardar lo que esa closure mencione.

De ahí salen las dos situaciones que este nivel distingue:

- **Observador no cancelado.** El ViewModel conserva la closure, la closure
  conserva la pantalla, y la pantalla no se libera. Es una fuga.
- **Ciclo de retención.** Si además la pantalla conserva el ViewModel, ninguno de
  los dos llega a cero y **ninguno** se libera. Es el caso que la lista de
  captura \`[weak self]\` resuelve.

La solución del primero corresponde al ViewModel, y es lo que este ejercicio
pide: que la baja **retire realmente** la closure guardada. Una cancelación que
solo marque un indicador y siga conservando la función deja la fuga intacta,
aunque los avisos dejen de llegar.
`,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: `
- **Combine y RxSwift.** Toda suscripción devuelve un objeto de cancelación
  —\`AnyCancellable\`, \`Disposable\`— por exactamente este motivo.
- **NotificationCenter.** Los observadores registrados debían retirarse a mano
  hasta que la API pasó a devolver un testigo.
- **Navegadores.** \`addEventListener\` tiene su contrapartida
  \`removeEventListener\`; la fuga equivalente es la misma.
- **Perfiladores de memoria.** El grafo de retención que muestran Instruments o
  el depurador de memoria de Xcode representa justamente estas referencias.
`,
    queEscribes: `
Un ViewModel con varios observadores y baja individual:

\`\`\`swift
final class Suscripcion {
    let cancelar: () -> Void
    init(cancelar: @escaping () -> Void)
}

final class ItemsViewModel {
    private(set) var items: [Item]
    private(set) var cargando: Bool
    private(set) var error: String?

    init(requerimiento: ItemsRequirement)

    func observar(_ alCambiar: @escaping () -> Void) -> Suscripcion
    func cargar()
}
\`\`\`

Comportamiento exigido, además del nivel base:

1. \`observar\` **añade** un observador y devuelve una \`Suscripcion\` cuya
   operación \`cancelar\` retira **ese** observador. Todos los registrados reciben
   cada aviso, en el orden en que se registraron.
2. Cancelar una suscripción no afecta a las demás.
3. La cancelación debe **dejar de conservar** la función recibida, no limitarse a
   ignorarla. Una de las comprobaciones lo verifica observando cuándo se libera
   un objeto de memoria.
`,
    pasoAPaso: `
1. Sustituye la propiedad del observador único por una colección. Una closure no
   se puede comparar por igualdad, de modo que hará falta una clave o un índice
   para identificar cada registro.
2. Haz que \`observar\` guarde la función y devuelva la suscripción. La operación
   de cancelar debe retirar únicamente ese registro.
3. Comprueba que al cancelar la función deje de estar almacenada. Si la colección
   sigue conteniéndola, el objeto capturado no se libera.
4. Recorre una copia de la colección al notificar, para que un observador que se
   cancele durante el aviso no altere el recorrido en curso.
5. Mantén el resto del comportamiento del nivel base: orden de los avisos,
   actualización previa a la notificación y conversión del error en estado.
`,
    erroresTipicos: `
- **Cancelar marcando un indicador en lugar de retirar la función.** Los avisos
  dejan de llegar, pero la fuga de memoria permanece.
- **Vaciar la colección al cancelar.** Retira también a los demás observadores.
- **Identificar los registros por posición en un array.** Retirar uno desplaza a
  los siguientes, y las suscripciones ya entregadas pasan a señalar a otro.
- **Recorrer la colección original al notificar.** Cancelar dentro del aviso
  modificaría lo que se está recorriendo.
`,
    comoSeComprueba: `
Las comprobaciones registran observadores, provocan cargas y muestran lo
recibido. El estado se muestra igual que en el nivel base; los avisos de un mismo
observador se separan con \` / \` y los observadores entre sí con \` ; \`.

Las dos últimas utilizan una clase \`Pantalla\` que ya está escrita: lleva la
cuenta de cuántas instancias siguen vivas, incrementándola al crearse y
reduciéndola al liberarse.

- **\`dos_observadores\`** — dos observadores registrados y una carga correcta.
  Debe imprimir
  \`|true|- / Abrigo,Camisa|false|- ; |true|- / Abrigo,Camisa|false|-\`.
  *Verifica:* que ambos reciban todos los avisos.
- **\`cancelar_uno\`** — se registran dos, se cancela el primero y se carga.
  Debe imprimir \` ; |true|- / Abrigo,Camisa|false|-\`. El primer grupo queda
  vacío.
  *Verifica:* que la baja afecte solo a quien la solicitó.
- **\`cancelar_libera_la_pantalla\`** — se crea una \`Pantalla\`, se suscribe con
  una función que la menciona, se cancela la suscripción y se suelta la
  referencia. Se imprime cuántas quedan vivas.
  Debe imprimir \`0\`.
  *Verifica:* la regla 3: la cancelación deja de conservar la función.
- **Una comprobación oculta** — la misma secuencia **sin** cancelar antes de
  soltar la referencia.
  *Verifica:* la otra mitad de la regla 3.

La comprobación oculta es deducible: si cancelar libera la pantalla, no cancelar
la mantiene viva, y ese es precisamente el motivo por el que la baja existe.
`,
    yaDeclarado: YA_DECLARADO,
    plantilla: {
      swift: `${CABECERA}

final class Pantalla {
    static var vivas = 0
    var recibidos: [String] = []
    init() { Pantalla.vivas += 1 }
    deinit { Pantalla.vivas -= 1 }
}

{{solucion}}

func describir(_ vm: ItemsViewModel) -> String {
    vm.items.map { $0.name }.joined(separator: ",") + "|" + String(vm.cargando) + "|" +
        (vm.error ?? "-")
}

let datos = [
    Item(id: "1", name: "Camisa", stock: 3),
    Item(id: "2", name: "Abrigo", stock: 1),
    Item(id: "3", name: "Zapato", stock: 0),
]
var a: [String] = []
var b: [String] = []
let caso = readLine()?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
switch caso {
case "dos_observadores":
    let vm = ItemsViewModel(requerimiento: ItemsRequirement(repositorio: RepositorioFijo(items: datos)))
    _ = vm.observar { a.append(describir(vm)) }
    _ = vm.observar { b.append(describir(vm)) }
    vm.cargar()
    print(a.joined(separator: " / ") + " ; " + b.joined(separator: " / "))
case "cancelar_uno":
    let vm = ItemsViewModel(requerimiento: ItemsRequirement(repositorio: RepositorioFijo(items: datos)))
    let s = vm.observar { a.append(describir(vm)) }
    _ = vm.observar { b.append(describir(vm)) }
    s.cancelar()
    vm.cargar()
    print(a.joined(separator: " / ") + " ; " + b.joined(separator: " / "))
case "cancelar_libera_la_pantalla":
    let vm = ItemsViewModel(requerimiento: ItemsRequirement(repositorio: RepositorioFijo(items: datos)))
    var p: Pantalla? = Pantalla()
    let s = vm.observar { [p] in p?.recibidos.append("x") }
    s.cancelar()
    p = nil
    print("\\(Pantalla.vivas)")
case "sin_cancelar_sigue_viva":
    let vm = ItemsViewModel(requerimiento: ItemsRequirement(repositorio: RepositorioFijo(items: datos)))
    var p: Pantalla? = Pantalla()
    _ = vm.observar { [p] in p?.recibidos.append("x") }
    p = nil
    print("\\(Pantalla.vivas)")
default:
    print("caso desconocido")
}`,
    },
    inicial: {
      swift: `// Escribe aquí Suscripcion e ItemsViewModel, según el enunciado.
// Item, ItemRepository, ItemsRequirement, ErrorCarga y Pantalla ya están
// declarados.
//
//   final class Suscripcion {
//       let cancelar: () -> Void
//       init(cancelar: @escaping () -> Void) { self.cancelar = cancelar }
//   }
`,
    },
    casos: [
      {
        entrada: 'dos_observadores\n',
        salidaEsperada: '|true|- / Abrigo,Camisa|false|- ; |true|- / Abrigo,Camisa|false|-',
        oculto: false,
      },
      {
        entrada: 'cancelar_uno\n',
        salidaEsperada: ' ; |true|- / Abrigo,Camisa|false|-',
        oculto: false,
      },
      { entrada: 'cancelar_libera_la_pantalla\n', salidaEsperada: '0', oculto: false },
      { entrada: 'sin_cancelar_sigue_viva\n', salidaEsperada: '1', oculto: true },
    ],
    soluciones: {
      swift: [
        // Estrategia A: diccionario con clave incremental.
        `final class Suscripcion {
    let cancelar: () -> Void
    init(cancelar: @escaping () -> Void) {
        self.cancelar = cancelar
    }
}

final class ItemsViewModel {
    private(set) var items: [Item] = []
    private(set) var cargando: Bool = false
    private(set) var error: String? = nil

    private let requerimiento: ItemsRequirement
    private var observadores: [Int: () -> Void] = [:]
    private var siguiente = 0

    init(requerimiento: ItemsRequirement) {
        self.requerimiento = requerimiento
    }

    func observar(_ alCambiar: @escaping () -> Void) -> Suscripcion {
        let clave = siguiente
        siguiente += 1
        observadores[clave] = alCambiar
        return Suscripcion { [weak self] in
            self?.observadores.removeValue(forKey: clave)
        }
    }

    private func notificar() {
        for clave in observadores.keys.sorted() {
            observadores[clave]?()
        }
    }

    func cargar() {
        cargando = true
        error = nil
        notificar()
        do {
            items = try requerimiento.execute()
            cargando = false
            error = nil
        } catch let e as ErrorCarga {
            cargando = false
            error = e.mensaje
        } catch {
            cargando = false
            self.error = "error"
        }
        notificar()
    }
}`,
        // Estrategia B: array de registros con identificador.
        `final class Suscripcion {
    let cancelar: () -> Void
    init(cancelar: @escaping () -> Void) {
        self.cancelar = cancelar
    }
}

private struct Registro {
    let id: Int
    let funcion: () -> Void
}

final class ItemsViewModel {
    private(set) var items: [Item] = []
    private(set) var cargando: Bool = false
    private(set) var error: String? = nil

    private let requerimiento: ItemsRequirement
    private var registros: [Registro] = []
    private var contador = 0

    init(requerimiento: ItemsRequirement) {
        self.requerimiento = requerimiento
    }

    func observar(_ alCambiar: @escaping () -> Void) -> Suscripcion {
        contador += 1
        let id = contador
        registros.append(Registro(id: id, funcion: alCambiar))
        return Suscripcion { [weak self] in
            self?.registros.removeAll { $0.id == id }
        }
    }

    private func aplicar(items: [Item], cargando: Bool, error: String?) {
        self.items = items
        self.cargando = cargando
        self.error = error
        for r in registros { r.funcion() }
    }

    func cargar() {
        aplicar(items: items, cargando: true, error: nil)
        do {
            let obtenidos = try requerimiento.execute()
            aplicar(items: obtenidos, cargando: false, error: nil)
        } catch let e as ErrorCarga {
            aplicar(items: items, cargando: false, error: e.mensaje)
        } catch {
            aplicar(items: items, cargando: false, error: "error")
        }
    }
}`,
      ],
    },
  },
];
