/**
 * Esqueleto de arranque de cada tipo en cada motor.
 *
 * Existen porque la barrera del diagrama-como-código no es el modelado sino la
 * primera línea: quien no recuerda si la palabra es `classDiagram` o `class` se
 * queda ante un editor vacío. Son deliberadamente CORTAS —dos o tres elementos y
 * una relación— para que se lean de un vistazo y se borren sin esfuerzo; no son
 * ejemplos que enseñen el tipo, sino un punto de partida sintáctico.
 *
 * REGLA: toda plantilla de Mermaid tiene que PARSEAR con el motor real. Lo
 * comprueba `packages/api/tests/diagramas-catalogo/plantillas.test.ts`, que las
 * pasa todas por el parser de Mermaid. Una plantilla que no parsea es peor que
 * no tener plantilla: el alumno abre el editor y lo primero que ve es un error
 * que no escribió él.
 *
 * Las de PlantUML no se pueden comprobar en CI: su motor está compilado con
 * TeaVM y no corre en Node (ver la cabecera de `normalizar-plantuml.ts`). La
 * prueba automática solo verifica que `@start…`/`@end…` estén emparejados, lo
 * que NO basta —PlantUML no lanza ante una directiva que no entiende, dibuja un
 * cartel de error dentro del propio SVG—.
 *
 * Por eso existe el arnés manual `packages/web/herramientas/verificar-plantuml.html`:
 * levanta el motor real en el navegador, pinta las 23 plantillas y detecta ese
 * cartel. **Hay que pasarlo al añadir o tocar una plantilla de PlantUML.** Su
 * primera pasada ya encontró una que el regex daba por buena: `red` necesitaba
 * `@startnwdiag`, no `@startuml`.
 */

/** @type {Record<string, { mermaid?: string, plantuml?: string }>} */
export const PLANTILLAS = {
  // --- Curso UML: estructura -------------------------------------------------
  clases: {
    mermaid: `classDiagram
    class Cliente {
        +String nombre
        +String correo
        +registrar() void
    }
    class Pedido {
        +Date fecha
        +total() float
    }
    Cliente "1" --> "*" Pedido : realiza
`,
    plantuml: `@startuml
class Cliente {
  +nombre : String
  +correo : String
  +registrar() : void
}
class Pedido {
  +fecha : Date
  +total() : float
}
Cliente "1" --> "*" Pedido : realiza
@enduml
`,
  },

  objeto: {
    plantuml: `@startuml
object cliente {
  nombre = "Ana Ruiz"
  correo = "ana@ejemplo.mx"
}
object pedido {
  folio = "P-1024"
  fecha = "2026-03-14"
}
cliente --> pedido : realiza
@enduml
`,
  },

  er: {
    mermaid: `erDiagram
    CLIENTE ||--o{ PEDIDO : realiza
    PEDIDO ||--|{ LINEA_PEDIDO : contiene
    CLIENTE {
        int id PK
        string nombre
    }
    PEDIDO {
        int id PK
        date fecha
    }
    LINEA_PEDIDO {
        int id PK
        int cantidad
    }
`,
    plantuml: `@startuml
hide circle
entity Cliente {
  * id : int
  --
  nombre : varchar
}
entity Pedido {
  * id : int
  --
  fecha : date
}
Cliente ||--o{ Pedido
@enduml
`,
  },

  paquetes: {
    mermaid: `flowchart TD
    subgraph presentacion["presentacion"]
        p1["PantallaPedido"]
    end
    subgraph dominio["dominio"]
        d1["Pedido"]
    end
    subgraph persistencia["persistencia"]
        r1["RepositorioPedido"]
    end
    presentacion --> dominio
    dominio --> persistencia
`,
    plantuml: `@startuml
package presentacion {
  class PantallaPedido
}
package dominio {
  class Pedido
}
package persistencia {
  class RepositorioPedido
}
presentacion ..> dominio
dominio ..> persistencia
@enduml
`,
  },

  componentes: {
    mermaid: `flowchart LR
    subgraph navegador["Navegador"]
        ui["Interfaz web"]
    end
    subgraph servidor["Servidor"]
        api["Servicio de pedidos"]
        bd[("Base de datos")]
    end
    ui --> api
    api --> bd
`,
    plantuml: `@startuml
component "Interfaz web" as Web
component "Servicio de pedidos" as Servicio
database "Base de datos" as BD
Web --> Servicio
Servicio --> BD
@enduml
`,
  },

  despliegue: {
    plantuml: `@startuml
node "Equipo del cliente" {
  artifact "Aplicacion movil" as App
}
node "Servidor de aplicaciones" {
  artifact "servicio-pedidos.jar" as Servicio
}
database "PostgreSQL" as BD
App --> Servicio : HTTPS
Servicio --> BD : JDBC
@enduml
`,
  },

  // --- Curso UML: interacción ------------------------------------------------
  secuencia: {
    mermaid: `sequenceDiagram
    actor Cliente
    participant Tienda
    participant Almacen
    Cliente->>Tienda: solicitarPedido()
    Tienda->>Almacen: reservarExistencias()
    Almacen-->>Tienda: reservaConfirmada
    Tienda-->>Cliente: pedidoRegistrado
`,
    plantuml: `@startuml
actor Cliente
participant Tienda
participant Almacen
Cliente -> Tienda : solicitarPedido()
Tienda -> Almacen : reservarExistencias()
Almacen --> Tienda : reservaConfirmada
Tienda --> Cliente : pedidoRegistrado
@enduml
`,
  },

  comunicacion: {
    plantuml: `@startuml
object Cliente
object Tienda
object Almacen
Cliente -> Tienda : 1: solicitarPedido()
Tienda -> Almacen : 1.1: reservarExistencias()
Almacen -> Tienda : 1.2: reservaConfirmada
@enduml
`,
  },

  timing: {
    plantuml: `@startuml
robust "Sesion" as S
concise "Peticion" as P

@0
S is Cerrada
P is Inactiva

@100
S is Abierta
P is EnCurso

@200
P is Completada
@enduml
`,
  },

  // --- Curso UML: comportamiento ---------------------------------------------
  estados: {
    mermaid: `stateDiagram-v2
    [*] --> Pendiente
    Pendiente --> Pagado : registrarPago
    Pagado --> Enviado : despachar
    Enviado --> [*]
`,
    plantuml: `@startuml
[*] --> Pendiente
Pendiente --> Pagado : registrarPago
Pagado --> Enviado : despachar
Enviado --> [*]
@enduml
`,
  },

  /**
   * Actividad UML. En Mermaid se usa `swimlane-beta`, que NO es un tipo aparte:
   * es el flowchart con el algoritmo de calles, así que la sintaxis es la del
   * flowchart y cada `subgraph` se dibuja como una calle de responsabilidad. Es
   * lo más cerca que llega Mermaid de un diagrama de actividad; para fork/join
   * la notación nativa es la de PlantUML.
   */
  actividad: {
    mermaid: `swimlane-beta
    subgraph Cliente
        a1["Solicitar devolucion"]
    end
    subgraph Atencion
        a2{"Procede?"}
        a3["Rechazar"]
    end
    subgraph Almacen
        a4["Recibir articulo"]
    end
    a1 --> a2
    a2 -- No --> a3
    a2 -- Si --> a4
`,
    plantuml: `@startuml
|Cliente|
start
:Solicitar devolucion;
|Atencion|
if (Procede?) then (si)
  |Almacen|
  :Recibir articulo;
  fork
    :Reponer inventario;
  fork again
    :Emitir reembolso;
  end fork
else (no)
  |Atencion|
  :Rechazar solicitud;
endif
stop
@enduml
`,
  },

  flujo: {
    mermaid: `flowchart TD
    inicio([Inicio]) --> validar{"¿Datos completos?"}
    validar -- No --> avisar["Mostrar error"]
    validar -- Si --> registrar["Registrar solicitud"]
    registrar --> fin([Fin])
    avisar --> fin
`,
    plantuml: `@startuml
start
:Recibir solicitud;
if (Datos completos?) then (si)
  :Registrar solicitud;
else (no)
  :Mostrar error;
endif
stop
@enduml
`,
  },

  // --- Curso UML: arquitectura -----------------------------------------------
  'casos-de-uso': {
    mermaid: `flowchart LR
    cliente["Cliente"]
    subgraph tienda["Tienda en linea"]
        uc1(("Consultar catalogo"))
        uc2(("Realizar pedido"))
    end
    cliente --- uc1
    cliente --- uc2
`,
    plantuml: `@startuml
left to right direction
actor Cliente
rectangle Tienda {
  usecase "Consultar catalogo" as UC1
  usecase "Realizar pedido" as UC2
}
Cliente --> UC1
Cliente --> UC2
@enduml
`,
  },

  // --- Catálogo: modelado adicional ------------------------------------------
  c4: {
    mermaid: `C4Context
    title Sistema de pedidos
    Person(cliente, "Cliente", "Realiza pedidos")
    System(tienda, "Tienda en linea", "Gestiona el catalogo y los pedidos")
    System_Ext(pasarela, "Pasarela de pago", "Procesa los cobros")
    Rel(cliente, tienda, "Realiza pedidos")
    Rel(tienda, pasarela, "Cobra")
`,
  },

  requisitos: {
    mermaid: `requirementDiagram
    requirement disponibilidad {
        id: "RF-01"
        text: "El catalogo responde en menos de dos segundos"
        risk: medium
        verifymethod: test
    }
    element servicioCatalogo {
        type: "componente"
    }
    servicioCatalogo - satisfies -> disponibilidad
`,
  },

  archimate: {
    plantuml: `@startuml
archimate #Business "Gestionar pedidos" as gestion <<business-process>>
archimate #Application "Servicio de pedidos" as servicio <<application-service>>
archimate #Technology "Servidor de aplicaciones" as servidor <<node>>
gestion -up-> servicio
servicio -up-> servidor
@enduml
`,
  },

  /**
   * Event Modeling. La sintaxis es poco evidente y conviene dejarla escrita: el
   * diagrama se divide en marcos temporales con `tf <numero>` y **cada marco
   * contiene UNA sola entidad**. Poner dos seguidas dentro del mismo marco es un
   * error de sintaxis, no una lista.
   *
   * Los nombres van en UN SOLO token (`FormularioDeAlta`, no «Formulario de
   * alta»): el terminal de identificador es `[_a-zA-Z][\w_]*` y no admite
   * espacios.
   */
  eventmodeling: {
    mermaid: `eventmodeling
    tf 1
    ui FormularioDeAlta
    tf 2
    cmd RegistrarCliente
    tf 3
    evt ClienteRegistrado
    tf 4
    rmo ListadoDeClientes
`,
  },

  // --- Catálogo: datos y gráficos --------------------------------------------
  pastel: {
    mermaid: `pie title Pedidos por canal
    "Web" : 55
    "Aplicacion movil" : 30
    "Telefono" : 15
`,
  },

  xy: {
    mermaid: `xychart-beta
    title "Pedidos por trimestre"
    x-axis [T1, T2, T3, T4]
    y-axis "Pedidos" 0 --> 400
    bar [180, 240, 310, 380]
    line [180, 240, 310, 380]
`,
  },

  cuadrantes: {
    mermaid: `quadrantChart
    title Prioridad de las mejoras
    x-axis Poco esfuerzo --> Mucho esfuerzo
    y-axis Poco impacto --> Mucho impacto
    quadrant-1 Planificar
    quadrant-2 Hacer ya
    quadrant-3 Descartar
    quadrant-4 Delegar
    Buscador: [0.3, 0.8]
    Modo oscuro: [0.2, 0.3]
`,
  },

  sankey: {
    mermaid: `sankey-beta

Visitas,Catalogo,1000
Catalogo,Carrito,320
Carrito,Pedido,140
Carrito,Abandono,180
`,
  },

  radar: {
    mermaid: `radar-beta
    title Perfil del equipo
    axis analisis["Analisis"], diseno["Diseno"], pruebas["Pruebas"]
    curve equipoA["Equipo A"]{3, 4, 2}
    curve equipoB["Equipo B"]{4, 2, 5}
`,
  },

  treemap: {
    mermaid: `treemap-beta
"Presupuesto"
    "Desarrollo"
        "Backend": 40
        "Frontend": 30
    "Operacion"
        "Infraestructura": 20
        "Soporte": 10
`,
  },

  venn: {
    mermaid: `venn-beta
    title Cobertura de pruebas
    set unitarias ["Unitarias"]: 40
    set integracion ["Integracion"]: 25
    union unitarias, integracion: 10
`,
  },

  // --- Catálogo: planificación -----------------------------------------------
  gantt: {
    mermaid: `gantt
    title Entrega del proyecto
    dateFormat YYYY-MM-DD
    section Analisis
    Requisitos       :req, 2026-02-02, 10d
    section Diseno
    Modelo de datos  :dat, after req, 7d
    Interfaz         :ifz, after req, 12d
`,
    plantuml: `@startgantt
Project starts 2026-02-02
[Requisitos] lasts 10 days
[Modelo de datos] lasts 7 days
[Interfaz] lasts 12 days
[Modelo de datos] starts at [Requisitos]'s end
[Interfaz] starts at [Requisitos]'s end
@endgantt
`,
  },

  kanban: {
    mermaid: `kanban
    Pendiente
        t1[Validar formulario de alta]
    En curso
        t2[Servicio de pedidos]
    Hecho
        t3[Modelo de datos]
`,
  },

  timeline: {
    mermaid: `timeline
    title Evolucion de la plataforma
    2024 : Primer prototipo
    2025 : Catalogo publico
         : Pagos en linea
    2026 : Aplicacion movil
`,
  },

  recorrido: {
    mermaid: `journey
    title Comprar en la tienda
    section Descubrir
      Abrir el catalogo: 5: Cliente
      Buscar un articulo: 3: Cliente
    section Comprar
      Agregar al carrito: 4: Cliente
      Pagar: 2: Cliente, Pasarela
`,
  },

  wbs: {
    plantuml: `@startwbs
* Plataforma de pedidos
** Analisis
*** Requisitos
*** Casos de uso
** Construccion
*** Servicio de pedidos
*** Interfaz web
** Pruebas
@endwbs
`,
  },

  // --- Catálogo: mapas y estructura ------------------------------------------
  'mapa-mental': {
    mermaid: `mindmap
  root((Plataforma))
    Catalogo
      Busqueda
      Filtros
    Pedidos
      Carrito
      Pago
    Cuentas
`,
    plantuml: `@startmindmap
* Plataforma
** Catalogo
*** Busqueda
*** Filtros
** Pedidos
*** Carrito
*** Pago
** Cuentas
@endmindmap
`,
  },

  git: {
    mermaid: `gitGraph
    commit id: "inicio"
    branch desarrollo
    commit id: "servicio-pedidos"
    commit id: "pruebas"
    checkout main
    merge desarrollo
    commit id: "version-1.0"
`,
  },

  bloques: {
    mermaid: `block-beta
    columns 3
    navegador["Navegador"] espacio api["API"]
    bd[("Base de datos")] espacio2 cache["Cache"]
`,
  },

  'arquitectura-nube': {
    mermaid: `architecture-beta
    group nube(cloud)[Nube]
    service balanceador(server)[Balanceador] in nube
    service api(server)[Servicio de pedidos] in nube
    service bd(database)[Base de datos] in nube
    balanceador:R -- L:api
    api:R -- L:bd
`,
  },

  /**
   * Topología de red. Va con `@startnwdiag`, NO con `@startuml`: verificado
   * contra el build de `@plantuml/core` que sirve el navegador, donde envolver
   * el bloque `nwdiag { … }` en `@startuml` dibuja un cartel de error en vez
   * del diagrama.
   */
  red: {
    plantuml: `@startnwdiag
nwdiag {
  network interna {
    address = "10.0.0.x"
    servidorWeb [address = "10.0.0.10"];
    servidorApp [address = "10.0.0.11"];
  }
  network datos {
    address = "10.0.1.x"
    servidorApp [address = "10.0.1.11"];
    baseDatos [address = "10.0.1.20"];
  }
}
@endnwdiag
`,
  },

  'paquete-red': {
    mermaid: `packet-beta
    0-15: "Puerto de origen"
    16-31: "Puerto de destino"
    32-63: "Numero de secuencia"
`,
  },

  arbol: {
    mermaid: `treeView-beta
    packages
        api
            src
            tests
        web
            src
`,
  },

  ishikawa: {
    mermaid: `ishikawa-beta
El pedido llega tarde
    Proceso
        Validacion manual
        Sin priorizacion
    Personas
        Turno incompleto
    Tecnologia
        Cola sin reintentos
`,
  },

  // --- Catálogo: texto y formatos --------------------------------------------
  ebnf: {
    mermaid: `railroad-ebnf-beta
    pedido = cliente, "-", numero;
    cliente = letra, { letra };
    numero = digito, { digito };
`,
    plantuml: `@startebnf
pedido = cliente, "-", numero;
cliente = letra, { letra };
numero = digito, { digito };
@endebnf
`,
  },

  regex: {
    plantuml: `@startregex
^[A-Z]{3}-\\d{4}$
@endregex
`,
  },

  json: {
    plantuml: `@startjson
{
  "folio": "P-1024",
  "cliente": { "nombre": "Ana Ruiz" },
  "lineas": [
    { "articulo": "Teclado", "cantidad": 1 }
  ]
}
@endjson
`,
  },

  yaml: {
    plantuml: `@startyaml
folio: P-1024
cliente:
  nombre: Ana Ruiz
lineas:
  - articulo: Teclado
    cantidad: 1
@endyaml
`,
  },

  wireframe: {
    plantuml: `@startsalt
{
  Alta de cliente
  ==
  Nombre  | "                    "
  Correo  | "                    "
  [Cancelar] | [Guardar]
}
@endsalt
`,
  },

  // --- Catálogo: estrategia --------------------------------------------------
  wardley: {
    mermaid: `wardley-beta
    title Cadena de valor de la tienda
    component Cliente [0.90, 0.65]
    component Catalogo [0.70, 0.55]
    component Base de datos [0.45, 0.80]
    Cliente -> Catalogo
    Catalogo -> Base de datos
`,
  },

  /**
   * Cynefin. Los dominios son palabras reservadas —`clear`, `complicated`,
   * `complex`, `chaotic`, `confusion`— y no admiten otro nombre. Cada uno abre
   * un bloque cuyos elementos van entrecomillados y en la línea siguiente.
   */
  cynefin: {
    mermaid: `cynefin-beta
    title Decisiones del proyecto
    clear
        "Alta de un campo al formulario"
    complicated
        "Migracion del modelo de datos"
    complex
        "Rediseno del flujo de pago"
    chaotic
        "Caida del servicio en produccion"
`,
  },
};

// ---------------------------------------------------------------------------
// Consultas que dependen de las plantillas
//
// Separadas de `catalogo.js` a propósito: importarlas arrastra la tabla de
// arriba, y solo el modo libre y el editor de autoría la necesitan.
// ---------------------------------------------------------------------------
import { MOTORES, tipoDiagrama } from './catalogo.js';

const CLAVES_MOTOR = MOTORES.map((m) => m.key);

/**
 * Motores en los que el tipo se DIBUJA, es decir, en los que tiene plantilla.
 * No confundir con `motoresJuez`; ver la cabecera de `catalogo.js`.
 */
export function motoresDe(key) {
  const p = PLANTILLAS[key];
  return p ? CLAVES_MOTOR.filter((m) => typeof p[m] === 'string') : [];
}

/** Esqueleto de arranque, o cadena vacía si esa combinación no se dibuja. */
export function plantilla(key, motor) {
  return PLANTILLAS[key]?.[motor] ?? '';
}

/**
 * Motor por omisión de un tipo: el primero que el juez acepta y, si no hay
 * ninguno, el primero que lo dibuja.
 *
 * El orden importa. Elegir el motor de dibujo antes que el del juez dejaría al
 * alumno arrancando un ejercicio de clases en PlantUML —que se dibuja— para que
 * el envío se rechazara después. Por el mismo motivo, cualquier código que
 * tenga que ELEGIR un motor debe llamar aquí y no a `motoresDe(...)[0]`: los
 * tres tipos de arquitectura se dibujan en Mermaid con una aproximación en
 * `flowchart` que sus ejercicios rechazan.
 */
export function motorPorOmision(key) {
  const def = tipoDiagrama(key);
  return def?.motoresJuez[0] ?? motoresDe(key)[0] ?? 'mermaid';
}
