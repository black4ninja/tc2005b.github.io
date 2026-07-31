import type { Ejercicio } from './tipos.js';

/** Firmas de lo ya proporcionado. Sin cuerpos: son solución de otros ejercicios. */
const YA_DECLARADO = {
  kotlin: `data class Item(val id: String, val name: String, val stock: Int)

interface ItemRepository {
    fun obtenerTodos(): List<Item>
}

// Aplica las reglas de negocio. LANZA excepción si el repositorio falla.
class GetItemsUseCase(private val repositorio: ItemRepository) {
    operator fun invoke(): List<Item>
}

data class ItemsUiState(
    val items: List<Item> = emptyList(),
    val cargando: Boolean = false,
    val error: String? = null,
)

// Repositorios de prueba, ya escritos:
class RepositorioFijo(private val items: List<Item>) : ItemRepository
class RepositorioQueFalla(private val mensaje: String) : ItemRepository`,
};


/**
 * Concepto 3.3 — ViewModel (Android).
 *
 * RESTRICCIÓN DEL JUEZ, y está explicada en el propio enunciado: el servidor
 * compila Kotlin de consola sobre Linux, sin `kotlinx.coroutines` ni las
 * bibliotecas de Android. `StateFlow`, `LiveData` y `viewModelScope` no existen
 * ahí. El ejercicio usa un callback, que es la misma idea —avisar de que el
 * estado cambió— sin la biblioteca.
 */

const CATEGORIA = 'Estado y ViewModel';
const CAPA = 'Presentación — `presentation/items/ItemsViewModel.kt`';

const PROBLEMA = `
Este ejercicio construye **una sola pieza**: el ViewModel de la pantalla de
listado.

Sus dos vecinos ya están escritos en ejercicios anteriores:

- **Quien lo abastece**: el caso de uso, que aplica las reglas del negocio.
- **Qué produce**: el \`ItemsUiState\`, calculado por el reducer.

El ViewModel no repite el trabajo de ninguno de los dos. Su responsabilidad es
distinta, y consiste en tres cosas:

1. **Guardar** cuál es el estado actual de la pantalla.
2. **Ordenar** las operaciones cuando la vista lo pide.
3. **Avisar** de que el estado cambió, para que la vista se redibuje.

Lo que no hace es igual de importante: no obtiene datos por su cuenta, no aplica
reglas de negocio y no dibuja nada.
`;

const DE_DONDE_VIENE = `
El ViewModel procede del patrón **Presentation Model**, descrito por Martin
Fowler en 2004: un objeto que representa el estado y el comportamiento de una
pantalla, con independencia de la tecnología con que se dibuje. Microsoft lo
adoptó como MVVM para WPF en 2005, y Google lo incorporó a Android en 2017.

La razón por la que existe es concreta: **el estado debe sobrevivir a la vista**.
Una pantalla de Android se destruye y se reconstruye al girar el dispositivo; una
de iOS puede descargarse por falta de memoria. Si el estado viviera en la vista,
se perdería en cada uno de esos momentos.

### La regla que lo define

El ViewModel **no conoce la vista**. La dependencia va en un solo sentido: la
vista observa al ViewModel, no al revés.

De esa regla se derivan sus límites. Un ViewModel que guardara una referencia a
la pantalla podría llamarla directamente, y con ello impediría que existieran dos
vistas del mismo estado, provocaría fugas de memoria al conservar una vista ya
destruida, y haría imposible comprobarlo sin construir una pantalla.

### Cómo avisa sin conocer a quien avisa

El mecanismo de aviso es siempre el mismo: alguien se **suscribe** y el ViewModel
**notifica**. Cambia la herramienta según la plataforma:

| Entorno | Herramienta |
|---|---|
| Android actual | \`StateFlow\` o \`LiveData\` |
| iOS | \`@Published\` de Combine |
| Este ejercicio | una función guardada en una variable |

Las dos primeras no están disponibles aquí: el juez compila Kotlin de consola
sobre Linux, sin las bibliotecas de Android ni corrutinas. **La idea es la
misma**: una función que el ViewModel invoca cada vez que el estado cambia, sin
saber quién la puso ahí.

### Por qué el estado se emite entero

El ViewModel notifica el estado **completo**, no los campos que cambiaron. Así la
vista no tiene que combinar avisos parciales para saber qué dibujar, y no puede
quedarse en una combinación intermedia que nunca existió como estado real.
`;

const DIAGRAMA = `
flowchart LR
    subgraph domain["domain/"]
        UC[GetItemsUseCase]
    end
    subgraph presentation["presentation/"]
        VM["ItemsViewModel<br/>pieza de este ejercicio"]
        S[ItemsUiState]
    end
    V["Vista<br/>observa"]
    UC --> VM
    VM --> S
    S -.notifica.-> V
    V -->|cargar| VM
    style VM fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px
`;

const DONDE_MAS = `
- **Web.** Los contenedores de estado de React, Vue o Svelte cumplen esta
  función: guardan el estado fuera del componente y notifican los cambios.
- **Escritorio.** WPF y JavaFX utilizan el mismo patrón, con el nombre original
  de Presentation Model.
- **Videojuegos.** La separación entre el estado de la interfaz y su dibujado es
  la misma, y por el mismo motivo: el dibujado ocurre muchas veces por segundo y
  no puede ser el dueño del estado.
- **Aplicaciones de terminal.** Una interfaz de texto que se redibuja completa en
  cada pulsación necesita exactamente esta separación.
`;

const ERRORES = `
- **Guardar una referencia a la vista.** Rompe la regla que define el patrón y
  provoca fugas de memoria al conservar pantallas ya destruidas.
- **Aplicar reglas de negocio en el ViewModel.** Su lugar es el caso de uso; de
  lo contrario, cada pantalla que necesite las mismas reglas las repite.
- **Exponer el estado como propiedad modificable desde fuera.** Cualquiera podría
  dejarlo en una situación que el reducer nunca produciría.
- **Notificar campos sueltos en lugar del estado completo.** La vista tendría que
  recomponer el estado a partir de avisos parciales.
- **Notificar antes de haber guardado el estado nuevo.** Quien recibe el aviso y
  consulta el estado leería todavía el anterior.
`;

const CABECERA = `data class Item(val id: String, val name: String, val stock: Int)

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

class RepositorioFijo(private val items: List<Item>) : ItemRepository {
    override fun obtenerTodos(): List<Item> = items
}

class RepositorioQueFalla(private val mensaje: String) : ItemRepository {
    override fun obtenerTodos(): List<Item> = throw RuntimeException(mensaje)
}`;

const DRIVER = `${CABECERA}

{{solucion}}

fun describir(s: ItemsUiState): String =
    s.items.joinToString(",") { it.name } + "|" + s.cargando.toString() + "|" +
        (s.error ?: "-")

fun main() {
    val datos = listOf(
        Item("1", "Camisa", 3),
        Item("2", "Abrigo", 1),
        Item("3", "Zapato", 0),
    )
    val emitidos = mutableListOf<String>()
    when (readLine()?.trim() ?: "") {
        "estado_inicial" -> {
            val vm = ItemsViewModel(GetItemsUseCase(RepositorioFijo(datos)))
            println(describir(vm.estado))
        }
        "emite_al_cargar" -> {
            val vm = ItemsViewModel(GetItemsUseCase(RepositorioFijo(datos)))
            vm.observar { emitidos.add(describir(it)) }
            vm.cargar()
            println(emitidos.joinToString(" / "))
        }
        "carga_con_fallo" -> {
            val vm = ItemsViewModel(GetItemsUseCase(RepositorioQueFalla("sin conexion")))
            vm.observar { emitidos.add(describir(it)) }
            vm.cargar()
            println(describir(vm.estado))
        }
        "sin_observador" -> {
            val vm = ItemsViewModel(GetItemsUseCase(RepositorioFijo(datos)))
            vm.cargar()
            println(describir(vm.estado))
        }
        else -> println("caso desconocido")
    }
}`;

const CASOS = [
  { entrada: 'estado_inicial\n', salidaEsperada: '|false|-', oculto: false },
  {
    entrada: 'emite_al_cargar\n',
    salidaEsperada: '|true|- / Abrigo,Camisa|false|-',
    oculto: false,
  },
  {
    entrada: 'carga_con_fallo\n',
    salidaEsperada: '|false|sin conexion',
    oculto: false,
  },
  { entrada: 'sin_observador\n', salidaEsperada: 'Abrigo,Camisa|false|-', oculto: true },
];

const FIRMA = `
\`\`\`kotlin
class ItemsViewModel(private val obtenerItems: GetItemsUseCase) {
    val estado: ItemsUiState
    fun observar(alCambiar: (ItemsUiState) -> Unit)
    fun cargar()
}
\`\`\`

\`Item\`, \`ItemRepository\`, \`GetItemsUseCase\` e \`ItemsUiState\` se proporcionan ya
declarados, con el comportamiento de los ejercicios anteriores.
`;

const REGLAS = `
1. Al construirse, el estado es el inicial: sin artículos, sin carga en curso y
   sin error.
2. \`observar\` guarda la función recibida. Solo hay un observador; una llamada
   posterior sustituye al anterior.
3. \`cargar\` produce **dos** estados en este orden:
   - Primero, el estado con la carga en curso.
   - Después, el estado con los artículos obtenidos, o con el mensaje de error si
     la obtención falló.
4. Cada vez que el estado cambia, se guarda **antes** de notificar, y se notifica
   al observador si lo hay. Sin observador, el estado cambia igualmente.
5. Un fallo del caso de uso se convierte en estado de error. La excepción no debe
   salir de \`cargar\`.
`;

const COMPRUEBA = `
Cuatro comprobaciones. El estado se muestra con el formato
\`nombres|cargando|error\`, y \`-\` cuando no hay error. Cuando se comprueban
varias emisiones, se separan con \` / \`.

El caso de uso proporcionado descarta los artículos sin unidades y ordena por
nombre, de modo que el catálogo de tres artículos produce dos.

- **\`estado_inicial\`** — se construye el ViewModel y se consulta su estado, sin
  invocar \`cargar\`.
  Debe imprimir \`|false|-\`.
  *Verifica:* la regla 1.
- **\`emite_al_cargar\`** — se registra un observador, se invoca \`cargar\` y se
  muestran **todas** las emisiones recibidas.
  Debe imprimir \`|true|- / Abrigo,Camisa|false|-\`.
  *Verifica:* la regla 3, incluido el orden: el indicador de carga se emite antes
  que los datos.
- **\`carga_con_fallo\`** — el caso de uso falla al obtener los datos.
  Debe imprimir \`|false|sin conexion\`.
  *Verifica:* la regla 5: el fallo se convierte en estado, no en excepción.
- **Una comprobación oculta** — se invoca \`cargar\` **sin** registrar observador.
  *Verifica:* la última frase de la regla 4.

La comprobación oculta es deducible: la regla 4 indica explícitamente que el
estado cambia aunque no haya observador.
`;

const SOLUCIONES = [
  // Estrategia A: función privada que centraliza guardar y notificar.
  `class ItemsViewModel(private val obtenerItems: GetItemsUseCase) {
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
}`,
  // Estrategia B: propiedad con campo de respaldo y notificación en el setter.
  `class ItemsViewModel(private val obtenerItems: GetItemsUseCase) {
    private var interno: ItemsUiState = ItemsUiState()
    private var observador: ((ItemsUiState) -> Unit)? = null

    val estado: ItemsUiState
        get() = interno

    fun observar(alCambiar: (ItemsUiState) -> Unit) {
        observador = alCambiar
    }

    private fun aplicar(nuevo: ItemsUiState) {
        interno = nuevo
        val o = observador
        if (o != null) o(nuevo)
    }

    fun cargar() {
        aplicar(ItemsUiState(interno.items, true, null))
        val resultado = try {
            obtenerItems()
        } catch (e: Exception) {
            aplicar(ItemsUiState(interno.items, false, e.message ?: "error"))
            return
        }
        aplicar(ItemsUiState(resultado, false, null))
    }
}`,
];

export const viewModelAndroid: Ejercicio[] = [
  // --- GUIADO ---------------------------------------------------------------
  {
    slugBase: 'mvvm-viewmodel-and',
    tituloBase: 'ViewModel (Android)',
    nivel: 'guiado',
    categoria: CATEGORIA,
    lenguajes: ['kotlin'],
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
1. Declara la clase recibiendo el caso de uso al construirse.
2. Declara el estado con el valor inicial. Debe poder leerse desde fuera, pero no
   modificarse: Kotlin lo expresa con \`private set\`.
3. Declara una variable para el observador. Admite la ausencia, porque puede no
   haberse registrado ninguno.
4. Escribe \`observar\` guardando la función recibida.
5. Escribe una operación interna que haga siempre las dos cosas en el mismo
   orden: guardar el estado nuevo y, después, notificar. Concentrarlas en un solo
   punto evita que alguna llamada se olvide de una de las dos.
6. Escribe \`cargar\`. Emite primero el estado con la carga en curso; después
   invoca el caso de uso y emite el resultado.
7. Rodea la invocación del caso de uso con \`try\`/\`catch\` y convierte la
   excepción en estado de error. El mensaje está en \`e.message\`.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    yaDeclarado: YA_DECLARADO,
    plantilla: { kotlin: DRIVER },
    inicial: {
      kotlin: `class ItemsViewModel(private val obtenerItems: GetItemsUseCase) {
    var estado: ItemsUiState = ItemsUiState()
        private set

    private var alCambiar: ((ItemsUiState) -> Unit)? = null

    fun observar(alCambiar: (ItemsUiState) -> Unit) {
        // TODO: guardar la función recibida
    }

    private fun emitir(nuevo: ItemsUiState) {
        // TODO: guardar el estado y después notificar al observador, si lo hay
    }

    fun cargar() {
        // TODO 1: emitir el estado con la carga en curso
        // TODO 2: invocar el caso de uso y emitir los artículos
        // TODO 3: convertir un fallo en estado de error
    }
}
`,
    },
    casos: CASOS,
    soluciones: { kotlin: SOLUCIONES },
  },

  // --- BASE -----------------------------------------------------------------
  {
    slugBase: 'mvvm-viewmodel-and',
    tituloBase: 'ViewModel (Android)',
    nivel: 'base',
    categoria: CATEGORIA,
    lenguajes: ['kotlin'],
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
1. Decide cómo expones el estado para que se lea desde fuera y solo se modifique
   desde dentro.
2. Resuelve el registro del observador contemplando que puede no haber ninguno.
3. Escribe \`cargar\` respetando el orden de emisiones de la regla 3.
4. Contempla el fallo del caso de uso: la regla 5 exige que no salga de
   \`cargar\`.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    yaDeclarado: YA_DECLARADO,
    plantilla: { kotlin: DRIVER },
    inicial: {
      kotlin: `// Escribe aquí ItemsViewModel según el enunciado.
// Item, ItemRepository, GetItemsUseCase e ItemsUiState ya están declarados.
`,
    },
    casos: CASOS,
    soluciones: { kotlin: SOLUCIONES },
  },

  // --- RETO -----------------------------------------------------------------
  {
    slugBase: 'mvvm-viewmodel-and',
    tituloBase: 'ViewModel (Android)',
    nivel: 'reto',
    categoria: CATEGORIA,
    lenguajes: ['kotlin'],
    capa: CAPA,
    problema: `
El ViewModel del nivel base admite un solo observador y lo sustituye en cada
llamada. Una pantalla real tiene varios: la lista, el contador de la barra
superior y el indicador de recarga pueden observar el mismo estado.

Y quien observa debe poder **dejar de hacerlo**. Una vista destruida que
siguiera recibiendo avisos mantendría viva una pantalla que ya no existe, que es
la fuga de memoria clásica de este patrón.

Aparece además una necesidad distinta de las anteriores: comunicar algo que
**ocurre una sola vez**. Un mensaje emergente de "no se pudo actualizar" no es
estado: si lo fuera, volvería a mostrarse cada vez que la pantalla se redibuja,
por ejemplo al girar el dispositivo.
`,
    deDondeViene: `
Este nivel introduce dos distinciones.

**Estado frente a suceso.** El estado describe la situación actual y se puede
consultar en cualquier momento; el suceso ocurre una vez y se consume. Un mensaje
emergente, una navegación o una vibración son sucesos. Tratarlos como estado
produce el defecto conocido: el mensaje reaparece al girar la pantalla, porque la
vista vuelve a leer un estado que sigue diciendo que hay mensaje.

En Android actual esta distinción se resuelve con un \`Channel\` o un
\`SharedFlow\`; aquí se resuelve con una lista de funciones que se invocan y no se
recuerdan.

**Suscripción con cancelación.** Registrar un observador debe devolver la forma
de darse de baja. El patrón procede de las bibliotecas reactivas, donde recibe el
nombre de \`Disposable\` o \`Cancellable\`, y su motivo es siempre el mismo: quien se
suscribe no siempre es quien decide cuándo termina, de modo que la baja debe ser
un valor que se pueda guardar y ejecutar más tarde.

La consecuencia de no tenerlo es medible: cada rotación de pantalla añade un
observador más, y el mismo estado se procesa tantas veces como rotaciones se
hayan producido.
`,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: `
- **Bibliotecas reactivas.** RxJava y Combine devuelven un objeto de cancelación
  en cada suscripción, por este motivo.
- **Escucha de sucesos web.** \`addEventListener\` tiene su contrapartida
  \`removeEventListener\`; olvidarla es la fuga equivalente en el navegador.
- **Sistemas de mensajería.** La distinción entre un tema —estado consultable— y
  una cola —sucesos que se consumen— es la misma que separa estado de suceso.
`,
    queEscribes: `
Un ViewModel con varios observadores, cancelación y un canal de sucesos:

\`\`\`kotlin
class ItemsViewModel(private val obtenerItems: GetItemsUseCase) {
    val estado: ItemsUiState

    fun observar(alCambiar: (ItemsUiState) -> Unit): Cancelacion
    fun observarSucesos(alSuceso: (String) -> Unit)
    fun cargar()
}

class Cancelacion(val cancelar: () -> Unit)
\`\`\`

Comportamiento exigido, además del nivel base:

1. \`observar\` **añade** un observador y devuelve un objeto cuya operación
   \`cancelar\` lo retira. Todos los observadores registrados reciben cada estado,
   en el orden en que se registraron.
2. Un observador retirado deja de recibir avisos, sin afectar a los demás.
3. Cuando la carga falla, además del estado de error se emite **un suceso** con
   el texto \`fallo:\` seguido del mensaje.
4. Los sucesos **no se guardan**: quien se suscribe después de que ocurra uno no
   lo recibe.
`,
    pasoAPaso: `
1. Sustituye la variable del observador único por una lista.
2. Haz que \`observar\` añada a la lista y devuelva la cancelación. La operación de
   cancelar debe retirar **ese** observador, no vaciar la lista.
3. Recorre una copia de la lista al notificar. Un observador que se cancele a sí
   mismo durante la notificación modificaría la lista mientras se recorre.
4. Añade la lista de observadores de sucesos y la operación que los notifica.
5. Emite el suceso de fallo **después** del estado de error, para que quien
   reciba el suceso pueda consultar un estado ya coherente.
`,
    erroresTipicos: `
- **Devolver una cancelación que vacía la lista.** Retiraría también a los demás
  observadores.
- **Recorrer la lista original al notificar.** Cancelar dentro de la notificación
  provoca un fallo de recorrido.
- **Guardar el último suceso en una propiedad.** Vuelve a convertirlo en estado,
  con el defecto que el nivel pretende evitar.
- **Emitir el suceso antes que el estado.** Quien lo reciba y consulte el estado
  leería todavía el anterior.
`,
    comoSeComprueba: `
Las comprobaciones registran observadores, provocan cargas y muestran lo
recibido. El estado se muestra igual que en el nivel base; las emisiones se
separan con \` / \`.

- **\`dos_observadores\`** — se registran dos observadores y se invoca \`cargar\`.
  Se imprime lo recibido por cada uno, separado por \` ; \`.
  Debe imprimir
  \`|true|- / Abrigo,Camisa|false|- ; |true|- / Abrigo,Camisa|false|-\`.
  *Verifica:* que ambos reciban todas las emisiones.
- **\`cancelar_uno\`** — se registran dos, se cancela el primero y se invoca
  \`cargar\`.
  Debe imprimir \` ; |true|- / Abrigo,Camisa|false|-\`. El primer grupo queda
  vacío.
  *Verifica:* que la cancelación afecte solo a quien la solicitó.
- **\`suceso_al_fallar\`** — el caso de uso falla; se muestra el estado final y
  después los sucesos recibidos.
  Debe imprimir \`|false|sin conexion ; fallo:sin conexion\`.
  *Verifica:* que el fallo produzca estado **y** suceso.
- **Una comprobación oculta** — se provoca un fallo y **después** se registra un
  observador de sucesos.
  *Verifica:* la regla 4.

La comprobación oculta es deducible: la regla 4 indica que los sucesos no se
guardan, y ninguna comprobación visible lo ejercita.
`,
    yaDeclarado: YA_DECLARADO,
    plantilla: {
      kotlin: `${CABECERA}

{{solucion}}

fun describir(s: ItemsUiState): String =
    s.items.joinToString(",") { it.name } + "|" + s.cargando.toString() + "|" +
        (s.error ?: "-")

fun main() {
    val datos = listOf(
        Item("1", "Camisa", 3),
        Item("2", "Abrigo", 1),
        Item("3", "Zapato", 0),
    )
    val a = mutableListOf<String>()
    val b = mutableListOf<String>()
    val sucesos = mutableListOf<String>()
    when (readLine()?.trim() ?: "") {
        "dos_observadores" -> {
            val vm = ItemsViewModel(GetItemsUseCase(RepositorioFijo(datos)))
            vm.observar { a.add(describir(it)) }
            vm.observar { b.add(describir(it)) }
            vm.cargar()
            println(a.joinToString(" / ") + " ; " + b.joinToString(" / "))
        }
        "cancelar_uno" -> {
            val vm = ItemsViewModel(GetItemsUseCase(RepositorioFijo(datos)))
            val c = vm.observar { a.add(describir(it)) }
            vm.observar { b.add(describir(it)) }
            c.cancelar()
            vm.cargar()
            println(a.joinToString(" / ") + " ; " + b.joinToString(" / "))
        }
        "suceso_al_fallar" -> {
            val vm = ItemsViewModel(GetItemsUseCase(RepositorioQueFalla("sin conexion")))
            vm.observarSucesos { sucesos.add(it) }
            vm.cargar()
            println(describir(vm.estado) + " ; " + sucesos.joinToString(","))
        }
        "suceso_no_se_guarda" -> {
            val vm = ItemsViewModel(GetItemsUseCase(RepositorioQueFalla("sin conexion")))
            vm.cargar()
            vm.observarSucesos { sucesos.add(it) }
            println(sucesos.size.toString())
        }
        else -> println("caso desconocido")
    }
}`,
    },
    inicial: {
      kotlin: `// Escribe aquí ItemsViewModel y la clase Cancelacion, según el enunciado.
// Item, ItemRepository, GetItemsUseCase e ItemsUiState ya están declarados.
//
//   class Cancelacion(val cancelar: () -> Unit)
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
      {
        entrada: 'suceso_al_fallar\n',
        salidaEsperada: '|false|sin conexion ; fallo:sin conexion',
        oculto: false,
      },
      { entrada: 'suceso_no_se_guarda\n', salidaEsperada: '0', oculto: true },
    ],
    soluciones: {
      kotlin: [
        // Estrategia A: listas de funciones, cancelación por identidad de la función.
        `class Cancelacion(val cancelar: () -> Unit)

class ItemsViewModel(private val obtenerItems: GetItemsUseCase) {
    var estado: ItemsUiState = ItemsUiState()
        private set

    private val observadores = mutableListOf<(ItemsUiState) -> Unit>()
    private val deSucesos = mutableListOf<(String) -> Unit>()

    fun observar(alCambiar: (ItemsUiState) -> Unit): Cancelacion {
        observadores.add(alCambiar)
        return Cancelacion { observadores.remove(alCambiar) }
    }

    fun observarSucesos(alSuceso: (String) -> Unit) {
        deSucesos.add(alSuceso)
    }

    private fun emitir(nuevo: ItemsUiState) {
        estado = nuevo
        for (o in observadores.toList()) o(nuevo)
    }

    private fun suceso(texto: String) {
        for (o in deSucesos.toList()) o(texto)
    }

    fun cargar() {
        emitir(estado.copy(cargando = true, error = null))
        try {
            emitir(estado.copy(items = obtenerItems(), cargando = false, error = null))
        } catch (e: Exception) {
            val mensaje = e.message ?: "error"
            emitir(estado.copy(cargando = false, error = mensaje))
            suceso("fallo:" + mensaje)
        }
    }
}`,
        // Estrategia B: registro con clave numérica; la cancelación retira por clave.
        `class Cancelacion(val cancelar: () -> Unit)

class ItemsViewModel(private val obtenerItems: GetItemsUseCase) {
    private var interno: ItemsUiState = ItemsUiState()
    private val observadores = mutableMapOf<Int, (ItemsUiState) -> Unit>()
    private val deSucesos = mutableListOf<(String) -> Unit>()
    private var siguiente = 0

    val estado: ItemsUiState
        get() = interno

    fun observar(alCambiar: (ItemsUiState) -> Unit): Cancelacion {
        val clave = siguiente++
        observadores[clave] = alCambiar
        return Cancelacion { observadores.remove(clave) }
    }

    fun observarSucesos(alSuceso: (String) -> Unit) {
        deSucesos.add(alSuceso)
    }

    private fun aplicar(nuevo: ItemsUiState) {
        interno = nuevo
        for (clave in observadores.keys.sorted().toList()) {
            observadores[clave]?.invoke(nuevo)
        }
    }

    fun cargar() {
        aplicar(ItemsUiState(interno.items, true, null))
        val obtenidos = try {
            obtenerItems()
        } catch (e: Exception) {
            val mensaje = e.message ?: "error"
            aplicar(ItemsUiState(interno.items, false, mensaje))
            for (o in deSucesos.toList()) o("fallo:" + mensaje)
            return
        }
        aplicar(ItemsUiState(obtenidos, false, null))
    }
}`,
      ],
    },
  },
];
