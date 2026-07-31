import type { Ejercicio } from './tipos.js';

/** Firmas de lo ya proporcionado. Sin cuerpos: son solución de otros ejercicios. */
const YA_DECLARADO = {
  kotlin: `data class Item(val id: String, val name: String)

sealed class Result {
    object Cargando : Result()
    data class Exito(val datos: List<Item>) : Result()   // OJO: la propiedad es \`datos\`
    data class Error(val mensaje: String) : Result()
}`,
};


/**
 * Concepto 3.2 — `UiState` y el reducer (Android).
 *
 * Solo Kotlin: el estado de pantalla como dato único es la forma que enseña el
 * wiki de Android. La pista de iOS mantiene propiedades sueltas en el ViewModel
 * y se aborda en su propio ejercicio.
 */

const CATEGORIA = 'Estado y ViewModel';
const CAPA = 'Presentación — `presentation/items/ItemsUiState.kt`';

const PROBLEMA = `
Este ejercicio construye **dos piezas**: el tipo que describe todo lo que la
pantalla necesita saber para dibujarse, y la función que calcula el siguiente
estado a partir del actual.

Una pantalla de listado no muestra solo artículos. Muestra un indicador de carga
mientras espera, un mensaje si algo falla, y la lista cuando llega. Esas tres
cosas no son independientes entre sí: mientras se carga no hay error, y cuando
llega el error deja de cargarse.

Las piezas tienen dos vecinos:

- **Quien las invoca**: el ViewModel, que recibe cada respuesta y pide el estado
  siguiente. Corresponde a otro ejercicio.
- **Quien las consume**: la vista, que lee el estado y dibuja. No aparece en este
  curso como código: basta saber que solo lee.

El problema que resuelven es de coherencia. Con variables sueltas, cada punto del
código que cambia una debe acordarse de ajustar las demás, y el compilador no
avisa cuando alguna se olvida.
`;

const DE_DONDE_VIENE = `
La idea de representar la pantalla con **un único valor** procede de Elm
(2012) y se popularizó con Redux (2015) en el desarrollo web. Su formulación es
sencilla: el estado de la interfaz es un dato, y toda modificación se expresa
como una función que recibe el estado actual y devuelve el siguiente.

Esa función recibe el nombre de **reducer**, tomado de la operación de reducción
sobre colecciones: igual que una suma acumula elementos en un total, un reducer
acumula respuestas en un estado.

### Por qué el reducer es una función pura

Una función pura es la que cumple dos condiciones: con las mismas entradas
devuelve siempre el mismo resultado, y no modifica nada fuera de ella.

De esas dos condiciones se derivan las propiedades que hacen útil este patrón:

- **Se comprueba sin infraestructura.** No hace falta una pantalla, ni un
  emulador, ni red: se le pasa un estado y una respuesta, y se compara el
  resultado. Es exactamente lo que hacen las comprobaciones de este ejercicio.
- **Se puede reproducir un fallo.** Guardando la secuencia de respuestas se
  reconstruye cualquier estado al que llegó la aplicación.
- **El orden es explícito.** Al no haber variables que se modifiquen desde fuera,
  la única forma de llegar a un estado es la secuencia de llamadas.

Que el estado sea **inmutable** es lo que sostiene todo esto. Por eso \`copy\` del
primer ejercicio aparece aquí como herramienta principal: el reducer no modifica
el estado recibido, sino que produce uno nuevo con los cambios aplicados.

### Qué decide el reducer que no decide nadie más

El reducer concentra las decisiones sobre la coherencia entre campos. La más
relevante de este enunciado: **un error no borra los datos que ya se mostraban**.
Es una decisión de producto —la pantalla no se queda en blanco si falla una
recarga— y tiene un único lugar donde vive.
`;

const DIAGRAMA = `
flowchart LR
    subgraph domain["domain/"]
        R[Result]
    end
    subgraph presentation["presentation/"]
        RED["reducir()<br/>pieza de este ejercicio"]
        S["ItemsUiState<br/>pieza de este ejercicio"]
        VM[ItemsViewModel]
    end
    R --> RED
    S --> RED
    RED --> S
    S --> VM
    style RED fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px
    style S fill:#ddd6fe,stroke:#6d28d9,stroke-width:3px
`;

const DONDE_MAS = `
- **Redux y las bibliotecas de estado web.** El mismo par estado-reducer, con el
  mismo vocabulario.
- **Máquinas de estados.** Un pedido que pasa por recibido, enviado y entregado
  se modela igual: estado actual más suceso, igual a estado siguiente.
- **Sistemas distribuidos.** El registro de sucesos —*event sourcing*— reconstruye
  el estado aplicando en orden todo lo ocurrido; el reducer es esa operación.
- **Videojuegos.** El bucle de simulación aplica las entradas del jugador al
  estado del mundo para producir el fotograma siguiente.
`;

const ERRORES = `
- **Modificar el estado recibido en lugar de producir uno nuevo.** El reducer
  deja de ser puro, y quien lo invoca no puede comparar el estado anterior con el
  siguiente.
- **Borrar la lista al recibir un error.** La pantalla se queda vacía tras una
  recarga fallida, cuando los datos anteriores siguen siendo válidos.
- **Dejar activo el indicador de carga al recibir el error.** Produce una
  pantalla que muestra el error y sigue girando.
- **Consultar algo externo dentro del reducer**, como la hora o una preferencia
  guardada. Deja de dar el mismo resultado con las mismas entradas.
- **Guardar en el estado datos que la pantalla no usa.** El estado describe lo
  que se dibuja; lo demás pertenece al ViewModel.
`;

const CABECERA = `data class Item(val id: String, val name: String)

sealed class Result {
    object Cargando : Result()
    data class Exito(val datos: List<Item>) : Result()
    data class Error(val mensaje: String) : Result()
}`;

const DRIVER = `${CABECERA}

{{solucion}}

fun describir(s: ItemsUiState): String =
    s.items.joinToString(",") { it.name } + "|" + s.cargando.toString() + "|" +
        (s.error ?: "-")

fun main() {
    val datos = listOf(Item("1", "Camisa"), Item("2", "Abrigo"))
    val inicial = ItemsUiState()
    when (readLine()?.trim() ?: "") {
        "estado_inicial" -> println(describir(inicial))
        "al_empezar_la_carga" -> println(describir(reducir(inicial, Result.Cargando)))
        "al_llegar_los_datos" -> {
            val cargando = reducir(inicial, Result.Cargando)
            println(describir(reducir(cargando, Result.Exito(datos))))
        }
        "el_error_conserva_los_datos" -> {
            var s = reducir(inicial, Result.Cargando)
            s = reducir(s, Result.Exito(datos))
            s = reducir(s, Result.Cargando)
            s = reducir(s, Result.Error("sin conexion"))
            println(describir(s))
        }
        else -> println("caso desconocido")
    }
}`;

const CASOS = [
  { entrada: 'estado_inicial\n', salidaEsperada: '|false|-', oculto: false },
  { entrada: 'al_empezar_la_carga\n', salidaEsperada: '|true|-', oculto: false },
  {
    entrada: 'al_llegar_los_datos\n',
    salidaEsperada: 'Camisa,Abrigo|false|-',
    oculto: false,
  },
  {
    entrada: 'el_error_conserva_los_datos\n',
    salidaEsperada: 'Camisa,Abrigo|false|sin conexion',
    oculto: true,
  },
];

const FIRMA = `
\`\`\`kotlin
data class ItemsUiState(
    val items: List<Item> = emptyList(),
    val cargando: Boolean = false,
    val error: String? = null,
)

fun reducir(estado: ItemsUiState, resultado: Result): ItemsUiState
\`\`\`

Los valores por defecto **forman parte del enunciado**: el estado inicial se
construye con \`ItemsUiState()\`, sin argumentos.

\`Item\` y \`Result\` se proporcionan ya declarados. \`Result\` tiene las tres
alternativas del ejercicio anterior: \`Cargando\`, \`Exito\` con la lista y
\`Error\` con el mensaje.
`;

const TABLA_REGLAS = `
| Respuesta recibida | \`items\` | \`cargando\` | \`error\` |
|---|---|---|---|
| \`Cargando\` | se conservan | \`true\` | se limpia |
| \`Exito\` | los recibidos | \`false\` | se limpia |
| \`Error\` | **se conservan** | \`false\` | el mensaje |
`;

const COMPRUEBA = `
Cuatro comprobaciones. Cada una parte del estado inicial, aplica una secuencia de
respuestas y muestra el estado final con el formato
\`nombres|cargando|error\`. Cuando no hay error se imprime \`-\`.

- **\`estado_inicial\`** — el estado construido sin argumentos, sin aplicar
  ninguna respuesta.
  Debe imprimir \`|false|-\`. El primer campo aparece vacío porque no hay
  artículos.
  *Verifica:* los valores por defecto de la firma.
- **\`al_empezar_la_carga\`** — se aplica \`Cargando\` sobre el estado inicial.
  Debe imprimir \`|true|-\`.
  *Verifica:* la primera fila de la tabla de reglas.
- **\`al_llegar_los_datos\`** — se aplica \`Cargando\` y después \`Exito\` con dos
  artículos.
  Debe imprimir \`Camisa,Abrigo|false|-\`.
  *Verifica:* que el indicador de carga se apague al llegar la respuesta.
- **Una comprobación oculta** — una secuencia de cuatro respuestas que termina en
  \`Error\` después de haber mostrado datos.
  *Verifica:* la fila destacada de la tabla: el error no borra la lista.

La comprobación oculta es deducible: la tabla de reglas marca en negrita que los
artículos se conservan al recibir un error, y ninguna comprobación visible lo
ejercita.
`;

const SOLUCIONES = [
  // Estrategia A: when como expresión, con copy en cada rama.
  `data class ItemsUiState(
    val items: List<Item> = emptyList(),
    val cargando: Boolean = false,
    val error: String? = null,
)

fun reducir(estado: ItemsUiState, resultado: Result): ItemsUiState = when (resultado) {
    is Result.Cargando -> estado.copy(cargando = true, error = null)
    is Result.Exito -> estado.copy(items = resultado.datos, cargando = false, error = null)
    is Result.Error -> estado.copy(cargando = false, error = resultado.mensaje)
}`,
  // Estrategia B: construcción explícita del estado, sin copy.
  `data class ItemsUiState(
    val items: List<Item> = emptyList(),
    val cargando: Boolean = false,
    val error: String? = null,
)

fun reducir(estado: ItemsUiState, resultado: Result): ItemsUiState {
    if (resultado is Result.Cargando) {
        return ItemsUiState(estado.items, true, null)
    }
    if (resultado is Result.Exito) {
        return ItemsUiState(resultado.datos, false, null)
    }
    val e = resultado as Result.Error
    return ItemsUiState(estado.items, false, e.mensaje)
}`,
];

export const uiStateAndroid: Ejercicio[] = [
  // --- GUIADO ---------------------------------------------------------------
  {
    slugBase: 'mvvm-uistate',
    tituloBase: 'UiState y el reducer',
    nivel: 'guiado',
    categoria: CATEGORIA,
    lenguajes: ['kotlin'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
El estado de la pantalla y la función que lo hace avanzar.
${FIRMA}

Reglas del reducer:
${TABLA_REGLAS}
`,
    pasoAPaso: `
1. Declara \`ItemsUiState\` como \`data class\` con los tres campos y sus valores
   por defecto. La igualdad por valor y \`copy\` que aporta \`data\` se utilizan en
   los pasos siguientes.
2. Declara \`reducir\` recibiendo el estado actual y la respuesta, y devolviendo un
   estado nuevo. No modifiques el que recibes.
3. Resuelve la respuesta \`Cargando\`: activa el indicador y limpia el error. Los
   artículos se conservan, de modo que una recarga no vacía la pantalla.
4. Resuelve \`Exito\`: coloca los artículos recibidos, apaga el indicador y limpia
   el error.
5. Resuelve \`Error\`: apaga el indicador y guarda el mensaje, **sin tocar los
   artículos**.
6. Cubre las tres alternativas con un \`when\` sin rama \`else\`, para que el
   compilador avise si el tipo \`Result\` incorpora una cuarta.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    yaDeclarado: YA_DECLARADO,
    plantilla: { kotlin: DRIVER },
    inicial: {
      kotlin: `data class ItemsUiState(
    val items: List<Item> = emptyList(),
    val cargando: Boolean = false,
    val error: String? = null,
)

fun reducir(estado: ItemsUiState, resultado: Result): ItemsUiState = when (resultado) {
    is Result.Cargando -> estado   // TODO: activar el indicador y limpiar el error
    is Result.Exito -> estado      // TODO: colocar los datos y apagar el indicador
    is Result.Error -> estado      // TODO: guardar el mensaje, conservando los datos
}
`,
    },
    casos: CASOS,
    soluciones: { kotlin: SOLUCIONES },
  },

  // --- BASE -----------------------------------------------------------------
  {
    slugBase: 'mvvm-uistate',
    tituloBase: 'UiState y el reducer',
    nivel: 'base',
    categoria: CATEGORIA,
    lenguajes: ['kotlin'],
    capa: CAPA,
    problema: PROBLEMA,
    deDondeViene: DE_DONDE_VIENE,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: DONDE_MAS,
    queEscribes: `
El estado de la pantalla y la función que lo hace avanzar, con estas firmas:
${FIRMA}

Reglas del reducer:
${TABLA_REGLAS}
`,
    pasoAPaso: `
1. Declara el estado con los tres campos y sus valores por defecto.
2. Escribe el reducer respetando las tres filas de la tabla. Presta atención a la
   fila destacada: es la única en la que el campo se conserva en lugar de
   sustituirse.
3. Comprueba que la función no modifique el estado recibido.
`,
    erroresTipicos: ERRORES,
    comoSeComprueba: COMPRUEBA,
    yaDeclarado: YA_DECLARADO,
    plantilla: { kotlin: DRIVER },
    inicial: {
      kotlin: `// Escribe aquí ItemsUiState y la función reducir.
// Item y Result ya están declarados.
`,
    },
    casos: CASOS,
    soluciones: { kotlin: SOLUCIONES },
  },

  // --- RETO -----------------------------------------------------------------
  {
    slugBase: 'mvvm-uistate',
    tituloBase: 'UiState y el reducer',
    nivel: 'reto',
    categoria: CATEGORIA,
    lenguajes: ['kotlin'],
    capa: CAPA,
    problema: `
La pantalla incorpora el gesto de recarga: el usuario desliza hacia abajo y los
datos se vuelven a pedir. Y el indicador de esa recarga no es el mismo que el de
la carga inicial: uno ocupa la pantalla completa, el otro es una rueda pequeña
sobre la lista, que sigue viéndose.

Con un único campo \`cargando\` no se distinguen. La pantalla no puede saber cuál
de los dos indicadores dibujar.

Aparece además una situación que hasta ahora se confundía con otra: **la
respuesta correcta que no devuelve nada**. Una lista vacía porque el catálogo
está vacío debe mostrar un mensaje explicativo, y no es lo mismo que una lista
vacía porque todavía no ha llegado la respuesta.

Por último, el estado deja de calcularse a partir de respuestas de red para
calcularse a partir de **sucesos**, que incluyen también las acciones del
usuario.
`,
    deDondeViene: `
Este nivel completa el patrón introducido por Elm y Redux, cuyo enunciado
íntegro es *estado más suceso, igual a estado siguiente*. En el nivel base los
sucesos eran solo respuestas de red; aquí incluyen lo que hace el usuario, que es
la forma en que el patrón se aplica realmente.

En Android este esquema se conoce como **MVI** —*Model-View-Intent*—: la vista
emite intenciones, el reducer las convierte en estado, y la vista se redibuja. La
diferencia con MVVM no es de fondo, sino de granularidad: MVI obliga a que toda
modificación pase por un suceso con nombre.

### Estado derivado

El indicador de lista vacía **no se guarda**: se calcula a partir de los demás
campos. Es un ejemplo de *estado derivado*, y la regla que lo justifica es que
todo dato almacenado por duplicado acaba divergiendo.

Si la pantalla guardara un campo \`estaVacia\`, habría que acordarse de
actualizarlo en las cuatro ramas del reducer, y el compilador no avisaría del
olvido. Calculado a partir de los otros campos, no puede contradecirlos.

En Kotlin esto se expresa con una propiedad con \`get()\`, que se evalúa en cada
consulta y no ocupa lugar en el constructor ni participa en la igualdad por
valor.
`,
    diagrama: DIAGRAMA,
    dondeMasLoVeras: `
- **Interfaces web.** La distinción entre carga inicial y recarga en segundo
  plano es estándar en las bibliotecas de obtención de datos.
- **Bases de datos.** Una vista calculada es estado derivado: se define a partir
  de las tablas en lugar de duplicarlas.
- **Hojas de cálculo.** Una celda con fórmula es exactamente esto: un valor que
  no se guarda, se recalcula.
`,
    queEscribes: `
Un tipo de sucesos, un estado ampliado con propiedad derivada y el reducer
correspondiente:

\`\`\`kotlin
sealed class Evento {
    object Cargar : Evento()
    object Refrescar : Evento()
    data class DatosRecibidos(val items: List<Item>) : Evento()
    data class FalloRecibido(val mensaje: String) : Evento()
}

data class ItemsUiState(
    val items: List<Item> = emptyList(),
    val cargando: Boolean = false,
    val refrescando: Boolean = false,
    val error: String? = null,
) {
    val listaVacia: Boolean
}

fun reducir(estado: ItemsUiState, evento: Evento): ItemsUiState
\`\`\`

Reglas del reducer:

| Suceso | \`items\` | \`cargando\` | \`refrescando\` | \`error\` |
|---|---|---|---|---|
| \`Cargar\` | se conservan | \`true\` | \`false\` | se limpia |
| \`Refrescar\` | se conservan | \`false\` | \`true\` | se limpia |
| \`DatosRecibidos\` | los recibidos | \`false\` | \`false\` | se limpia |
| \`FalloRecibido\` | se conservan | \`false\` | \`false\` | el mensaje |

La propiedad \`listaVacia\` vale \`true\` únicamente cuando no hay artículos, no hay
nada en curso y no hay error.
`,
    pasoAPaso: `
1. Declara el tipo de sucesos. Los dos que no llevan datos se declaran como
   \`object\`, por el mismo motivo que \`Cargando\` en el ejercicio anterior.
2. Amplía el estado con el cuarto campo, manteniendo los valores por defecto.
3. Declara \`listaVacia\` como propiedad con \`get()\`, **fuera del constructor**.
   Situada dentro, se convertiría en un dato almacenado que habría que mantener
   al día.
4. Escribe el reducer cubriendo las cuatro filas. Las dos primeras se diferencian
   únicamente en qué indicador activan.
5. Verifica que \`Refrescar\` no active el indicador de carga inicial: es la
   distinción que motiva el nivel.
`,
    erroresTipicos: `
- **Guardar \`listaVacia\` como campo del constructor.** Habría que actualizarlo
  en las cuatro ramas y podría contradecir a los demás campos.
- **Activar los dos indicadores a la vez.** Ninguna fila de la tabla lo permite;
  son situaciones excluyentes.
- **Considerar vacía la lista mientras se carga.** El mensaje de catálogo vacío
  aparecería durante la primera carga, antes de saber si hay datos.
- **Añadir un suceso por cada campo del estado.** Los sucesos nombran lo que
  ocurre, no lo que cambia; un suceso por campo reproduce las variables sueltas
  con más pasos.
`,
    comoSeComprueba: `
Las comprobaciones parten del estado inicial, aplican una secuencia de sucesos y
muestran el estado final con el formato
\`nombres|cargando|refrescando|error|listaVacia\`. Cuando no hay error se imprime
\`-\`.

- **\`carga_inicial\`** — se aplica \`Cargar\` sobre el estado inicial.
  Debe imprimir \`|true|false|-|false\`.
  *Verifica:* que la carga inicial active su propio indicador, y que la lista no
  se considere vacía mientras se espera.
- **\`refresco_conserva_la_lista\`** — se cargan dos artículos y después se aplica
  \`Refrescar\`.
  Debe imprimir \`Camisa,Abrigo|false|true|-|false\`.
  *Verifica:* que el refresco no active el indicador de carga inicial ni borre
  los artículos.
- **\`fallo_conserva_la_lista\`** — se cargan dos artículos y después llega un
  fallo.
  Debe imprimir \`Camisa,Abrigo|false|false|sin conexion|false\`.
  *Verifica:* que el error apague ambos indicadores sin vaciar la pantalla.
- **Una comprobación oculta** — una carga que termina con una respuesta correcta
  sin artículos.
  *Verifica:* la propiedad derivada.

La comprobación oculta es deducible: el enunciado define \`listaVacia\` con las
tres condiciones exactas que esa secuencia cumple.
`,
    yaDeclarado: YA_DECLARADO,
    plantilla: {
      kotlin: `data class Item(val id: String, val name: String)

{{solucion}}

fun describir(s: ItemsUiState): String =
    s.items.joinToString(",") { it.name } + "|" + s.cargando.toString() + "|" +
        s.refrescando.toString() + "|" + (s.error ?: "-") + "|" + s.listaVacia.toString()

fun main() {
    val datos = listOf(Item("1", "Camisa"), Item("2", "Abrigo"))
    var s = ItemsUiState()
    when (readLine()?.trim() ?: "") {
        "carga_inicial" -> {
            s = reducir(s, Evento.Cargar)
        }
        "refresco_conserva_la_lista" -> {
            s = reducir(s, Evento.Cargar)
            s = reducir(s, Evento.DatosRecibidos(datos))
            s = reducir(s, Evento.Refrescar)
        }
        "fallo_conserva_la_lista" -> {
            s = reducir(s, Evento.Cargar)
            s = reducir(s, Evento.DatosRecibidos(datos))
            s = reducir(s, Evento.Refrescar)
            s = reducir(s, Evento.FalloRecibido("sin conexion"))
        }
        "respuesta_sin_articulos" -> {
            s = reducir(s, Evento.Cargar)
            s = reducir(s, Evento.DatosRecibidos(emptyList()))
        }
        else -> {
            println("caso desconocido")
            return
        }
    }
    println(describir(s))
}`,
    },
    inicial: {
      kotlin: `// Escribe aquí el tipo Evento, el estado ItemsUiState con su propiedad
// derivada listaVacia, y la función reducir. El tipo Item ya está declarado.
`,
    },
    casos: [
      { entrada: 'carga_inicial\n', salidaEsperada: '|true|false|-|false', oculto: false },
      {
        entrada: 'refresco_conserva_la_lista\n',
        salidaEsperada: 'Camisa,Abrigo|false|true|-|false',
        oculto: false,
      },
      {
        entrada: 'fallo_conserva_la_lista\n',
        salidaEsperada: 'Camisa,Abrigo|false|false|sin conexion|false',
        oculto: false,
      },
      {
        entrada: 'respuesta_sin_articulos\n',
        salidaEsperada: '|false|false|-|true',
        oculto: true,
      },
    ],
    soluciones: {
      kotlin: [
        // Estrategia A: when como expresión y copy.
        `sealed class Evento {
    object Cargar : Evento()
    object Refrescar : Evento()
    data class DatosRecibidos(val items: List<Item>) : Evento()
    data class FalloRecibido(val mensaje: String) : Evento()
}

data class ItemsUiState(
    val items: List<Item> = emptyList(),
    val cargando: Boolean = false,
    val refrescando: Boolean = false,
    val error: String? = null,
) {
    val listaVacia: Boolean
        get() = items.isEmpty() && !cargando && !refrescando && error == null
}

fun reducir(estado: ItemsUiState, evento: Evento): ItemsUiState = when (evento) {
    is Evento.Cargar -> estado.copy(cargando = true, refrescando = false, error = null)
    is Evento.Refrescar -> estado.copy(cargando = false, refrescando = true, error = null)
    is Evento.DatosRecibidos ->
        estado.copy(items = evento.items, cargando = false, refrescando = false, error = null)
    is Evento.FalloRecibido ->
        estado.copy(cargando = false, refrescando = false, error = evento.mensaje)
}`,
        // Estrategia B: sealed interface y construcción explícita del estado.
        `sealed interface Evento {
    object Cargar : Evento
    object Refrescar : Evento
    data class DatosRecibidos(val items: List<Item>) : Evento
    data class FalloRecibido(val mensaje: String) : Evento
}

data class ItemsUiState(
    val items: List<Item> = emptyList(),
    val cargando: Boolean = false,
    val refrescando: Boolean = false,
    val error: String? = null,
) {
    val listaVacia: Boolean
        get() {
            if (cargando || refrescando) return false
            if (error != null) return false
            return items.size == 0
        }
}

fun reducir(estado: ItemsUiState, evento: Evento): ItemsUiState {
    if (evento is Evento.Cargar) return ItemsUiState(estado.items, true, false, null)
    if (evento is Evento.Refrescar) return ItemsUiState(estado.items, false, true, null)
    if (evento is Evento.DatosRecibidos) return ItemsUiState(evento.items, false, false, null)
    val f = evento as Evento.FalloRecibido
    return ItemsUiState(estado.items, false, false, f.mensaje)
}`,
      ],
    },
  },
];
