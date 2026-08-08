# Ampliación del módulo Diagramas — plan de trabajo

Estado: **propuesta**, pendiente de revisión. Fecha: 2026-08-08.

Cubre tres cosas que se decidieron juntas porque se condicionan entre sí:

1. Ampliar el **catálogo de tipos** de 8 a los que los motores soportan de verdad.
2. Extender el **juez** con normalizadores por familia y con los tipos UML que faltan.
3. Rehacer la **interfaz de ejercicios** aprovechando el sidebar y el topbar del
   armazón, en lugar de añadir una tercera columna de navegación.

---

## 1. Punto de partida

### 1.1 Lo que evalúa el juez hoy

Ocho tipos, y con el **motor fijado por tipo**. Esa restricción no se ve en
ninguna pantalla, pero está en los normalizadores y es la que decide qué puede
enviar un alumno:

| Tipo | Motor | Origen de la restricción |
| --- | --- | --- |
| `clases`, `secuencia`, `estados`, `er`, `flujo` | solo Mermaid | `normalizar-mermaid.ts:30` |
| `casos-de-uso`, `componentes`, `paquetes` | solo PlantUML | `normalizar-plantuml.ts:37` |

`catalogo.ts` reúne 36 aserciones, tres de ellas **cruzadas** contra los
diagramas de contexto del ejercicio (`mensaje-existe-como-operacion`,
`disparador-existe-como-operacion`, `participante-existe-como-clase`). Ese
mecanismo es el activo más valioso del módulo y buena parte del plan consiste en
darle más superficie donde aplicarse.

### 1.2 Ejercicios publicados

32 definiciones en `packages/api/scripts/ejercicios-diagrama/`: 8 ejemplos
resueltos (que no cuentan para el progreso) y **24 calificables**, tres por tipo.
La taxonomía ya existente coincide con la de la maqueta:

| Bloque | Categorías |
| --- | --- |
| Estructura | Clases, Entidad-relación |
| Interacción | Secuencia |
| Comportamiento | Estados, Flujo |
| Arquitectura | Casos de uso, Componentes, Paquetes |

### 1.3 El modo libre no está bloqueado, está mal rotulado

En `TallerDiagramasPage.tsx` el campo `tipo` **solo elige la plantilla de
arranque y la etiqueta de la lista**. El dibujo lo hace el motor real en el
navegador (`lib/diagramas/mermaid.ts`, `lib/diagramas/plantuml.ts`), que no
consulta ese campo. Escribir `gantt` con `tipo = clases` ya funciona hoy.

Consecuencia para el plan: **en modo libre no hay que desbloquear nada**. Hay que
ampliar el catálogo de tipos, escribir plantillas y corregir el rótulo. Es la
fase más barata y la de efecto más visible.

---

## 2. Qué soportan los motores (verificado sobre el repo)

Probado contra el parser real de `mermaid@11.16.0` con el entorno DOM del juez
(`entorno-dom.ts`), no de memoria.

**Mermaid — 30 familias disponibles:**
`flowchart`/`graph`, `sequenceDiagram`, `classDiagram`, `stateDiagram-v2`,
`erDiagram`, `journey`, `gantt`, `pie`, `quadrantChart`, `requirementDiagram`,
`gitGraph`, `C4Context`, `mindmap`, `timeline`, `sankey-beta`, `xychart-beta`,
`block-beta`, `packet-beta`, `kanban`, `architecture-beta`, `radar-beta`,
`treemap-beta`, `venn-beta`, `wardley-beta`, `cynefin-beta`, `ishikawa-beta`,
`swimlane-beta`, `treeView-beta`, `eventmodeling`, `railroad-beta`
(con variantes `railroad-ebnf-beta`, `railroad-abnf-beta`, `railroad-peg-beta`).

**No disponible: ZenUML.** Requiere el paquete externo
`@mermaid-js/mermaid-zenuml`. Aparece en la documentación de Mermaid pero no en
la distribución open source. Queda **fuera de alcance** salvo que se decida
añadir la dependencia; su valor docente es bajo porque duplica Secuencia.

Pendiente de fijar en implementación: la sintaxis exacta de `venn-beta`,
`swimlane-beta` y `eventmodeling`. Los tres detectores existen y responden
—fallan con «Parse error», no con «No diagram type detected»—, pero las muestras
que probé no son válidas.

**PlantUML `1.2026.6`** cubre los diecinueve de la barra del editor oficial.
`nwdiag` y Archimate necesitan Graphviz, que `plantuml.ts` ya carga.

---

## 3. El hueco principal está dentro de UML

Antes de los extras de Mermaid conviene registrar que **faltan tipos UML**. De
los catorce de UML 2.x el módulo cubre seis. Los ausentes con valor docente son:

| Tipo | Motor | Por qué importa |
| --- | --- | --- |
| **Objeto** | PlantUML | Contraparte de instancias de Clases. Habilita la comprobación cruzada «este objeto es instancia de una clase que existe», que es exactamente el error que el juez ya sabe detectar en otras vistas. |
| **Despliegue** | PlantUML | Nodos físicos y artefactos. Cierra la vista de arquitectura junto a Componentes. |
| **Actividad (UML)** | PlantUML | Lo que hoy se llama `flujo` es un `flowchart` de Mermaid: **no tiene calles de responsabilidad ni fork/join**, que son justo lo que se evalúa en un diagrama de actividad. |
| **Comunicación** | PlantUML | Misma información que Secuencia con otro énfasis. Permite el ejercicio de contrastar ambas vistas del mismo escenario. |
| **Timing** | PlantUML | Cambios de estado sobre un eje temporal. El más específico de los cinco. |

`er` y `flujo`, presentes hoy, no son diagramas UML: se conservan por su uso en
el curso, pero conviene que la interfaz no los presente como tales.

---

## 4. Arquitectura propuesta

### 4.1 Catálogo de tipos como fuente única

Hoy la lista de tipos está triplicada: `juez-diagramas/tipos.ts` (unión de la
API), `web/src/types/contenidos.ts` (unión del cliente) y
`web/src/lib/diagramas/etiquetas.ts` (rótulos). Con 8 tipos se sostiene; con ~45
deja de sostenerse.

Se propone un paquete nuevo del workspace, **`@tc2005b/diagramas-catalogo`**,
que ambos consumen —el precedente es `@tc2005b/contenido-pipeline`, que ya
comparten API y web—:

```ts
export interface TipoDiagramaDef {
  key: string;                 // 'clases' | 'objeto' | 'gantt' …
  label: string;               // 'Clases'
  descripcion: string;         // una línea, la que se pinta en el catálogo
  familia: Familia;            // decide qué normalizador lo lee
  ambito: 'uml' | 'extra';     // Curso UML | Catálogo adicional
  agrupacion: string;          // 'Estructura' … | 'Datos y gráficos' …
  /** Motores en los que el JUEZ sabe evaluarlo. Puede estar vacío. */
  motoresJuez: Motor[];
  /** Motores en los que el modo libre sabe DIBUJARLO, con su plantilla. */
  plantillas: Partial<Record<Motor, string>>;
}
```

La separación entre `motoresJuez` y `plantillas` es deliberada y resuelve el
defecto que arrastra la maqueta: **hay tipos que se dibujan pero no se evalúan**,
y la interfaz tiene que poder decirlo en vez de ofrecer una opción que fallará al
enviar.

### 4.2 Familias de normalizador

El acuerdo fue normalizadores **reales por familia**, no un volcado genérico.
Verifiqué que las siete familias exponen un modelo consultable:

| Familia | Tipos | Fuente del modelo | Modelo destino |
| --- | --- | --- | --- |
| `red` | architecture, block, C4, packet, nwdiag, **despliegue** | `.nodes`, `.groups`, `.edges`, `getC4ShapeArray()`, `getRels()` | `Nodo` + `Arista` (**el actual**) |
| `jerarquia` | mindmap, treemap, treeView, ishikawa, WBS | `getMindmap()`, `.root`, `getRoot()` | `Nodo` + `Arista` (**el actual**) |
| `planificacion` | gantt, timeline, kanban, journey | `getTasks()`, `getSections()` | `Tarea[]` (nuevo) |
| `series` | pie, xychart, radar, sankey, quadrant, venn | `getSections()`, `getXYChartData()`, `getAxes()`, `getNodes()`/`getLinks()` | `Serie[]` (nuevo) |
| `versionado` | gitGraph | `getBranchesAsObjArray()`, `getCommitsArray()` | `Nodo` + `Arista` |
| `gramatica` | railroad-ebnf, EBNF, regex, JSON, YAML | `getRules()` | `Regla[]` (nuevo) |
| `estrategia` | wardley, cynefin, requirement | `getWardleyData()`, `.requirements`/`.relations` | `Nodo` + `Arista` |

**Cuatro de las siete familias caen en el `Nodo`/`Arista` que el juez ya tiene**,
y por tanto heredan sin trabajo adicional las aserciones existentes:
`existe-nodo`, `conteo-nodos`, `relacion-entre`, `sin-ciclos`,
`nodos-alcanzables`, `contenido-en-paquete`, `sin-nombres-vagos`… Ese es el
hallazgo que hace el plan asumible: el coste real está solo en `planificacion`,
`series` y `gramatica`.

La extensión de `ModeloDiagrama` queda mínima:

```ts
export interface Serie { nombre: string; valores: { etiqueta: string; valor: number }[]; }
export interface Tarea {
  id: string; nombre: string; seccion?: string;
  inicio?: string; fin?: string; duracion?: string;
  dependeDe: string[]; estado?: string; orden: number;
}
export interface Regla { nombre: string; definicion: string; referencias: string[]; }

export interface ModeloDiagrama {
  // … campos actuales
  series: Serie[];   // vacío salvo en la familia `series`
  tareas: Tarea[];   // vacío salvo en `planificacion`
  reglas: Regla[];   // vacío salvo en `gramatica`
}
```

Sigue cumpliendo la regla dura del módulo: **ningún código numérico de ningún
motor entra en `tipos.ts`**; la traducción vive en el normalizador de cada
familia.

### 4.3 Clases y ER en PlantUML

`normalizar-plantuml.ts` es un parser del subconjunto enseñado, por línea, con
soporte ya escrito para contenedores `{ }` anidados. Ampliarlo exige:

1. Palabras nuevas en `PALABRAS`: `class`, `abstract class`, `enum`, `entity`,
   `struct`, `object`.
2. **Compartimentos de miembros** — el trabajo delicado. Hay que leer el interior
   de `{ }` como atributos y operaciones (`+nombre : Tipo`,
   `+metodo(p) : Tipo`, modificadores `{static}`/`{abstract}`, separadores
   `--`/`..`/`==`). El manejo de bloques anidados ya existe; lo que falta es el
   estado «estoy dentro de un compartimento».
3. **Mapa de flecha a `TipoArista`**, que hoy no existe: `normalizar-plantuml.ts:229`
   colapsa todo a `participa` o `asociacion`. Necesita
   `<|--` → herencia, `<|..` → implementación, `*--` → composición,
   `o--` → agregación, `..>` → dependencia.
4. **Pata de gallo de ER**: `||--o{`, `}o--||`, `}|--|{` → cardinalidades
   normalizadas.

El regex `FLECHA` ya captura `<|` y `|>`, así que el punto 3 es sobre todo
clasificación, no reconocimiento.

Con esto, los badges `[PlantUML, Mermaid]` que la maqueta pinta en Clases y
Entidad-relación pasan a ser ciertos. **Hoy no lo son**, y publicar la maqueta
tal cual dejaría al alumno eligiendo un motor que el juez rechaza.

### 4.4 Interfaz

**Sidebar.** Se replica el patrón que ya usa la wiki: cuando la ruta cae dentro
de `/…/diagramas/:slug`, el sidebar se convierte en el árbol del módulo, igual
que `isColeccionDetail` lo convierte hoy en `ArbolContenidos` (`Sidebar.tsx:364`).
Componente nuevo `ArbolDiagramas`, con:

- cabecera «← Volver a Diagramas» (o al grupo, según el árbol de rutas)
- buscador de tipo o ejercicio
- sección **Curso UML**: los cuatro bloques con su contador `n/m`
- sección **Catálogo**: los grupos de tipos adicionales

No se añade la columna de 248 px de la maqueta: esa navegación **es** el sidebar.

**Topbar.** `DashboardHeader.tsx` tiene el centro vacío entre el botón de menú y
el perfil. Se le añade un espacio de contenido que la página rellena mediante un
contexto, con el mismo patrón que `ColeccionArbolContext`. Ahí va el título de la
sección y la barra de progreso `n / m resueltos`, que hoy está en la cabecera de
la página.

**Contenido central.** Acordeón por tipo, como en la maqueta, con dos cambios:

- los badges de motor salen de `motoresJuez` del catálogo, no de una lista fija;
- los tipos sin ejercicios muestran «Abrir en modo libre →» en vez de aparentar
  que están vacíos.

**Modo libre.** El `<select>` de tipo pasa a `<optgroup>` por bloque y grupo, y
el de motor se limita a los motores con plantilla para ese tipo.

---

## 5. Fases y PRs

Cada fase es un PR desde `main`, con su rama y su entrada en `CHANGELOG.md`.
El orden respeta las dependencias: el catálogo es el cimiento y los ejercicios
son lo último porque necesitan sus aserciones ya en producción.

### Fase 1 — Catálogo de tipos y modo libre
`feature/diagramas-catalogo-tipos`

- Paquete `@tc2005b/diagramas-catalogo` con las ~45 definiciones.
- Plantillas de arranque por tipo y motor.
- `TallerDiagramasPage`: selectores agrupados, motor filtrado por tipo.
- `etiquetas.ts` y `types/contenidos.ts` pasan a leer del catálogo.
- Fijar la sintaxis de `venn-beta`, `swimlane-beta` y `eventmodeling`.

Sin tocar juez ni ejercicios. Nada de lo publicado cambia de comportamiento.

### Fase 2 — Interfaz de ejercicios
`feature/diagramas-interfaz-ejercicios`

- `ArbolDiagramas` en el sidebar; ruta que activa el modo árbol.
- Espacio de contenido en `DashboardHeader` + contexto de progreso.
- `DiagramasAlumnoPage` reescrita como acordeón por tipo con badges reales.
- Sección «Catálogo» con enlace a modo libre.

### Fase 3 — Motor doble en Clases y ER
`feature/juez-plantuml-clases-er`

- Compartimentos de miembros y mapa de flechas en `normalizar-plantuml.ts`.
- Pata de gallo de ER.
- Tests de paridad: el mismo modelo desde Mermaid y desde PlantUML debe producir
  aserciones equivalentes.
- Un diagrama de referencia en PlantUML añadido a cada ejercicio de Clases y ER
  existente, para verificar que se aceptan las dos escrituras.

### Fase 4 — Los cinco tipos UML que faltan
`feature/juez-uml-objeto-despliegue-actividad`

Normalizadores y aserciones. Se propone partirlo en dos PRs si crece:

- **4a** — Objeto y Despliegue. `ClaseNodo` gana `objeto`, `artefacto`,
  `nodo-fisico`. Aserciones nuevas: `objeto-es-instancia-de` (cruzada contra el
  diagrama de clases del contexto), `objeto-tiene-valor`, `enlace-entre-objetos`,
  `artefacto-desplegado-en`, `artefacto-corresponde-a-componente` (cruzada).
- **4b** — Actividad UML, Comunicación y Timing. `Nodo.papel` gana `fork`/`join`;
  las calles reutilizan `Nodo.contenedor`. Aserciones: `accion-en-calle`,
  `fork-tiene-join`, `decision-con-guardas`, `numeracion-jerarquica`,
  `mismos-mensajes-que` (cruzada contra el diagrama de secuencia),
  `estado-en-instante`.

### Fase 5 — Normalizadores por familia
`feature/juez-familias-extra`

Por orden de coste creciente, y con tests por familia:

- **5a** — `red`, `jerarquia`, `versionado`, `estrategia`. Caen en el modelo
  actual; casi todo el trabajo es de traducción, no de catálogo.
- **5b** — `planificacion` y `series`. Requieren `Tarea[]` y `Serie[]` en
  `ModeloDiagrama` y ~8 aserciones nuevas.
- **5c** — `gramatica`. La más aislada; puede posponerse sin bloquear nada.

### Fase 6 — Contenido de los ejercicios
`feature/ejercicios-diagrama-uml-faltantes` y
`feature/ejercicios-diagrama-catalogo`

| Grupo | Definiciones | Calificables |
| --- | --- | --- |
| UML faltante (5 tipos × ejemplo + 3 niveles) | 20 | 15 |
| Tipos extra (1 por tipo, nivel base) | ~32 | ~32 |

Total nuevo: ~52 definiciones, que llevarían el módulo de 24 a **~71
calificables**. Es volumen de contenido, no de código, y admite trocearse por
bloque sin romper nada: cada `cat*.ts` es independiente y
`verificar-definiciones-diagrama.ts` valida el lote entero sin tocar la base.

Los ejercicios de los tipos extra son deliberadamente más simples —un nivel,
sin «Paso a paso» extenso— tal y como se acordó: existen para que el tipo esté
incorporado y practicable, no para evaluarlo con la profundidad de UML.

---

## 6. Riesgos y decisiones abiertas

1. **Los tipos `-beta` de Mermaid pueden cambiar de sintaxis.** Ocho de los
   nuevos lo son. Mitigación: la frontera que ya protege al catálogo —el juez
   evalúa sobre `ModeloDiagrama`, nunca sobre texto— sigue valiendo; el impacto
   quedaría contenido en el normalizador de la familia y en la plantilla.
2. **`venn`, `swimlane` y `eventmodeling` sin sintaxis confirmada.** Si alguno
   resulta impracticable, se cae del catálogo sin efecto sobre el resto.
3. **Volumen de contenido de la fase 6.** Es la parte más larga y la que menos se
   puede paralelizar sin perder coherencia de registro. Conviene fijar antes el
   guion de un tipo extra y validarlo, para no reescribir treinta.
4. **Migración de datos.** Ninguna fase exige migrar registros existentes: los
   tipos nuevos son valores nuevos de un campo de texto ya existente
   (`EjercicioDiagrama.tipoDiagrama`, `DiagramaTaller.tipoDiagrama`). Si en algún
   momento hiciera falta, va **después del deploy**, nunca antes.
5. **La base de dev es la de producción.** Todo `seed-ejercicios-diagrama.ts` se
   corre con `--dry-run` primero, los ejercicios nacen como borrador y no se
   publica nada sin revisión humana.
6. **ZenUML fuera de alcance** salvo decisión explícita de añadir la dependencia.
