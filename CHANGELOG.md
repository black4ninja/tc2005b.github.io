# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto sigue [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Temario de arquitectura MVVM reescrito y ampliado a 36 ejercicios** en la
  colección `tc2007b`: 12 conceptos × 3 niveles (guiado, base y reto). Los 12
  anteriores quedan **despublicados, no borrados**.
  - Los enunciados explican de dónde viene cada concepto, dónde más se usa fuera
    del móvil y qué problema resuelve, no solo qué escribir. Dominio neutro
    (`Item`) en lugar del dominio del wiki.
  - El vocabulario de arquitectura sigue siendo el de cada pista —`UseCase` en
    Android, `Requirement` en iOS—, porque es el que el alumno encontrará en la
    documentación de su plataforma.
  - 90 soluciones de referencia, mínimo dos por lenguaje y con estrategias
    distintas: dos soluciones válidas con veredictos distintos delatan un caso
    sobreajustado.
  - Las restricciones del juez se documentan en el enunciado en lugar de
    esquivarse: Combine no existe en Linux y no hay corrutinas, así que
    `@Published`, `StateFlow` y `LiveData` no compilan en el servidor y se
    sustituyen por un callback, con su tabla de equivalencias por plataforma.
- **Herramienta de medida de comprensión** (`packages/api/scripts/estudio-comprension.ts`):
  exporta lo que ve un alumno, evalúa código candidato contra el ejercicio real
  y calcula métricas de carga cognitiva.

### Changed
- **Los enunciados muestran las firmas de lo ya proporcionado.** Decir que un
  tipo "ya está declarado" sin enseñarlo obligaba a adivinar los nombres, y en
  lenguajes de tipado estático eso impide entregar aunque el razonamiento sea
  correcto.
- **El contrato de ejecución se lee antes que la firma**, y los casos se rotulan
  según lo que la entrada significa: en modo plantilla es el nombre de una
  comprobación, no datos que el alumno lea. En modo programa no cambia, porque
  ahí la entrada sí son datos.
- **El editor del solver acompaña al scroll del enunciado**, que dejaba de verse
  al bajar a leer qué hay que escribir.

### Fixed
- **Las imágenes del visor fallaban con 401 mientras el texto cargaba bien.** El
  SPA se autentica con el token de localStorage en la cabecera `x-session-token`,
  pero **un `<img>` no puede mandar cabeceras**: las imágenes del CMS dependen en
  exclusiva de la cookie de sesión. Si el token sobrevivía y la cookie no —cookies
  limpiadas, caducada antes, o sesión abierta antes de que la cookie existiera— la
  aplicación parecía funcionar y solo se rompían las imágenes, sin ningún aviso.
  Ahora `/auth/me`, que corre en cada arranque con el token ya validado, vuelve a
  sembrar la cookie si falta: con una recarga el usuario se recupera solo, sin
  tener que cerrar sesión.
- **Los diagramas se dibujaban siempre en claro, aunque el visor estuviera en
  oscuro.** El hook `useDiagramas` ya aceptaba un flag `oscuro` y ambos motores
  (Mermaid y PlantUML) lo soportan, pero `VisorContenidoPage` **nunca se lo
  pasaba**: quedaba en su valor por defecto `false`. Sobre fondo oscuro, las
  cajas salían blancas y las flechas y etiquetas —negras— eran directamente
  invisibles. Ahora el flag viaja desde el estado del tema.
  Además, el `<pre>` original ya **no se borra** al dibujar el SVG, sino que se
  oculta, y la limpieza del efecto deshace lo pintado: sin eso, cambiar de tema
  no repintaba nada porque no quedaba bloque que procesar, y el diagrama se
  quedaba con la paleta anterior hasta recargar la página.
- **Las pantallas de ejercicios fallaban con "No se pudo cargar".** Los dos
  listados pedían el documento completo de cada ejercicio —enunciado, plantillas,
  casos y soluciones— para construir respuestas que no usan ninguno de esos
  campos. Con 46 ejercicios eran 0.79 MB y hasta 37 s contra Atlas, por encima
  del timeout de 15 s del front: la vista de alumno fallaba de forma
  intermitente y la de admin siempre. Seleccionando solo los campos devueltos,
  14 KB y medio segundo.
- **Los diagramas no se dibujaban en el enunciado de un ejercicio.** Al cablear el
  hook en el solver se añadieron el `import` y el `ref`, pero **nunca la llamada**,
  así que el bloque se quedaba como código. El visor y el editor sí la tenían.
  - Se activa `noUnusedLocals` en el type-check del web, que es el guardarraíl que
    lo habría cazado: con la llamada ausente, el import queda sin usar y `tsc`
    falla. Comprobado reintroduciendo el bug a propósito. De paso se retiran las
    7 variables e imports muertos que impedían encender el flag.
- **Los diagramas con salto de línea en una etiqueta no se dibujaban.** `svgSeguro`
  parseaba el SVG como `image/svg+xml`, que es **XML estricto**, y Mermaid mete
  HTML dentro de `foreignObject` en cuanto una etiqueta lleva `<br/>`. El parser
  devolvía `parsererror` y el bloque caía al modo "no se pudo dibujar". Ahora se
  parsea como `text/html`, que entiende contenido extranjero y produce el mismo
  árbol SVG. Afectaba a la mayoría de diagramas útiles.

### Added
- **Diagramas en los enunciados de MVVM.** Los 12 ejercicios de arquitectura
  abren con un diagrama que sitúa la capa en el conjunto, con **la pieza que
  escribe el alumno resaltada**. Es lo que más ayuda contra la confusión que
  motivó estos ejercicios: ver *dónde* encaja lo que estás escribiendo antes de
  escribirlo. Se usan flowcharts para la estructura, secuencia para el flujo y
  un diagrama de estados para `Result`.
- **Diagramas-como-código en el CMS (Mermaid + PlantUML).** Los bloques de código
  de un documento o de un enunciado pueden ser diagramas y se dibujan en el
  navegador. Registro extensible por lenguaje de fence, con carga bajo demanda.
  - **El pipeline no necesitó ni un cambio**: la clase `language-…` ya sobrevivía
    al sanitizador, así que el código fuente llega intacto al DOM y solo se
    sustituye en el cliente.
  - **Se renderiza en el cliente a propósito.** El HTML se cachea en BD
    (`cuerpoHtml`, `enunciadoHtml`); incrustar el SVG ahí ataría cada
    actualización de la librería a re-renderizar todo lo ya publicado.
  - **PlantUML se detecta por contenido**, no solo por la etiqueta del fence: un
    bloque que empieza por `@startuml` se dibuja aunque el fence esté sin
    etiquetar. Eso enciende los **16 diagramas que ya existían** en el wiki de
    Android —paquete, componente, secuencia, estado— sin reescribir una línea.
  - **Bajo demanda**: el bundle inicial no crece. Mermaid (~600 KB) y PlantUML
    (~6 MB con Graphviz) van en chunks aparte que solo descarga quien abre una
    página con diagramas de ese motor.
  - **Previsualización en vivo** en el editor de Contenidos, reaprovechando su
    debounce: se ve el diagrama mientras se escribe.
  - **Si el render falla, el bloque no desaparece**: vuelve el código fuente con
    el motivo encima. Un typo debe dejar ver lo que escribiste, no un hueco.
  - El SVG se inserta parseado y con los atributos ejecutables retirados, además
    del modo estricto de Mermaid — el plan es que también los alumnos escriban
    diagramas, así que el código deja de ser de confianza.
- **Ejercicios de arquitectura MVVM, capa por capa (12 ejercicios).** Nuevo bloque
  con cuatro categorías —Modelo y capa de datos, Capa de dominio, Estado y
  ViewModel, y Composición— que llevan al alumno de entender cada capa por
  separado a componerlas de punta a punta.
  - **Se evalúan con el modo `plantilla` que ya existía**, sin tocar el motor: el
    alumno escribe solo su capa y un driver oculto la ejercita. La `entrada` del
    caso nombra el test y el driver imprime el valor observado, así que **un test
    = un caso** y la aserción la hace el juez comparando stdout. Cada test corre
    en su proceso con su propio timeout.
  - **Fiel a cada pista**, como la enseña el wiki: Android lleva DTO, mapper,
    `Result` y `UiState`; iOS structs `Codable` directos y `Requirement`. Cuando
    lo que se pide difiere entre pistas, el ejercicio se parte en uno por lenguaje.
  - Se ejercita la **inversión de dependencias** con repositorios espía: si el
    alumno construye el repositorio dentro del caso de uso en vez de recibirlo,
    el espía no registra llamadas y el caso falla.
  - Lo que no se puede ejercitar en consola queda sustituido y **explicado en el
    enunciado**: `StateFlow` y `@Published` (Combine no existe en Linux) se
    reemplazan por un callback con el mismo papel.
  - Sin narrativa y con nombres de archivo y clase explícitos, que es donde se
    pierden los alumnos al aprender la arquitectura.
- **Bloques de ejercicios: un nivel de agrupación por encima de las categorías.**
  El listado del alumno pasa a dos niveles (**bloque → categoría → ejercicios**),
  para que los ejercicios de arquitectura no queden mezclados con los de sintaxis
  en una lista plana. Nuevo `BloqueEjercicios` con su CRUD, y `CategoriaEjercicio`
  gana un vínculo **opcional** a un bloque.
  - **Sin migración, y sin cambio visible hasta que se quiera.** El vínculo es
    opcional en ambos sentidos: mientras no exista ningún bloque, el listado se
    pinta exactamente como antes. Hay un test que lo fija, para poder desplegar
    esto sin tocar un solo dato y crear los bloques después, desde la UI.
  - Es una **entidad** y no un campo en la categoría porque el nombre y el orden
    del bloque necesitan un dueño único: repetidos en cada categoría —y con un
    modal que guarda fila a fila— la incoherencia sería el caso normal, y su
    síntoma es justo el desorden que este nivel viene a evitar.
  - Borrar un bloque **desasigna** sus categorías, no las borra (misma semántica
    que borrar una categoría con sus ejercicios).
  - Admin: el modal administra bloques y categorías juntos, el editor de
    ejercicios agrupa el desplegable de categoría con `optgroup`, y la tabla
    muestra `Bloque › Categoría`.
- **Soluciones de referencia de los 10 ejercicios de `tc2007b`.** Script
  `seed-soluciones-referencia.ts` (idempotente, con `--dry-run`) que carga **dos
  soluciones por lenguaje**, de estrategia deliberadamente distinta —`sum()`
  contra bucle, `Set` contra recorrido, `when` contra tabla—, porque dos
  soluciones parecidas no detectan casos sobreajustados. **Verifica antes de
  escribir** y solo guarda lo que queda limpio: una solución que no pasa es peor
  que ninguna, ya que el verificador la daría por buena a futuro.
  - Resultado: **los 10 ejercicios quedan verificados como resolubles**, 0
    errores, en ambos lenguajes. Ningún caso resultó sobreajustado y ningún
    código inicial venía roto ni ya resuelto. Queda 1 aviso: `hola-mundo` no
    tiene ningún caso oculto.
- **Verificación automática de ejercicios (autoría en lote).** Los ejercicios
  pueden llevar **soluciones de referencia** —una **lista** por lenguaje, no una
  sola— y un verificador las usa como puerta de calidad antes de publicar:
  `tsx scripts/verificar-ejercicios.ts [coleccion] [--slug] [--lenguaje]
  [--publicados] [--rapido] [--json]`. Solo lee de la BD y sale con código 1 si
  hay errores.
  - **Por qué una lista.** Con una solución compruebas que el ejercicio es
    resoluble; con **dos o más** compruebas que los casos no estén
    **sobreajustados**: si dos soluciones igual de legítimas dan veredictos
    distintos, el defecto está en los casos (fijan un orden de iteración o un
    formato que el enunciado no pide), no en el código. No es heurístico.
  - **Errores:** solución rechazada, casos sobreajustados, código inicial que no
    compila o que ya viene aceptado, plantilla sin `{{solucion}}`, sin casos.
    **Avisos:** sin solución, sin casos ocultos, salida esperada vacía al
    normalizar, entrada repetida.
  - El código inicial hace de "solución incorrecta" para el test de
    discriminación: así funciona también en modo plantilla, donde un programa
    trivial ni compilaría.
  - Las soluciones **nunca** llegan al alumno: viven en la representación de
    admin, y el DTO del alumno es una whitelist aparte.
  - El juez y el verificador comparten la composición del harness
    (`componerCodigo`), para que el verificador no pueda dar por bueno algo que
    al alumno le falla.
- **Política de worktrees para trabajo en paralelo.** Cada feature/US en vuelo va
  en su propio git worktree, con su `yarn dev` y **puertos sin colisión** (web
  `5173+n`, api `3006+n`, asignados al crearlo comprobando lo que escucha y lo ya
  reservado por otros worktrees). Helper `wt` en `tools/wt.zsh`
  (`new`/`ls`/`cd`/`path`/`dev`/`done`) que crea worktree + rama desde `main` al
  día y hace el bootstrap de lo gitignored (`.env` del API con `PORT` y
  `SERVER_URL` reescritos, `.env.local` del web, `yarn install`). Ciclo de vida
  completo —crear → commits → PR → review → merge → cerrar y sincronizar— en
  `CONTRIBUTING.md` §8. `vite.config.ts` pasa a leer `VITE_PORT`/`VITE_API_PORT`
  y usa `strictPort` para no proxear en silencio al API de otra rama.
- **Ejercicios avanzados del mini-juez: cola, categorías, harness y completitud.**
  Expansión grande del módulo Ejercicios (todo en un PR):
  - **Cola asíncrona.** Con recursos reducidos (y Kotlin lento de compilar), las
    corridas ya no bloquean el request ni compilan en paralelo: cada envío se
    **encola** y un worker las procesa **1×1**. El alumno ve el estado en vivo
    (*en cola → posición → ejecutando → veredicto*) por polling. Los envíos se
    persisten (historial de **cualquier** usuario) y **sobreviven a un reinicio**
    (se re-encolan al arrancar).
  - **Categorías administrables.** Los ejercicios se agrupan por tema (p. ej.
    "Sintaxis básica", "POO", "SOLID"), gestionables desde Contenidos; el alumno
    los ve por secciones.
  - **Verificación con plantilla (harness).** Un ejercicio puede pedir que el
    alumno escriba **solo una función/clase**: su código se inserta en una
    plantilla con un driver oculto (`{{solucion}}`) y ese programa combinado se
    compila. Habilita ejercicios de POO/SOLID sin exigir el `main` completo.
  - **Completitud.** Cada ejercicio muestra si el usuario ya lo **resolvió**
    (tiene un envío aceptado) y una barra de progreso por colección.
  - **Contenido:** seed `seed-ejercicios-moviles.ts` con ejercicios básicos
    bilingües (Kotlin + Swift) por categoría, basados en las presentaciones de
    Android/iOS.
- **Experiencia del alumno del mini-juez (resolver ejercicios).** Fase final: el
  alumno ya puede **resolver ejercicios** desde el sitio. Nueva sección
  "Ejercicios" en su menú (solo si algún grupo suyo tiene el módulo **encendido**
  y con ejercicios publicados), con la lista de la colección y un **solver** por
  ejercicio: enunciado + casos de ejemplo, **editor de código** (CodeMirror con
  resaltado Kotlin/Swift), y tres acciones — **Probar** contra los casos de
  muestra, **Ejecutar con mi entrada** (modo interactivo con stdin propio) y
  **Enviar** (evalúa contra todos los casos, guarda el envío y da el veredicto).
  Los casos **ocultos** nunca se revelan al alumno.
  - Backend: endpoints de lectura gated (`/contenidos/:slug/ejercicios[...]`,
    `identifyUser` + acceso por colección/grupo/módulo, 404 a lo no permitido) que
    invocan el motor del juez (#56/#57). El acceso respeta el **opt-in**: la
    colección debe estar asignada a un grupo activo con `ejercicios` encendido.
  - El módulo `ejercicios` se completa en el front (catálogo espejo con default
    **opt-in**, toggle en el modal de **Asignaciones**), cerrando el ciclo
    "habilitar en Contenidos → asignar por grupo → resolver".
- **Autoría de ejercicios en Contenidos (admin).** Tercera fase del mini-juez: el
  admin ya puede **crear, editar, publicar y borrar** ejercicios de programación
  dentro de una colección. Se llega desde Contenidos (acción "Ejercicios" de la
  colección o botón en su detalle). El editor tiene título/slug, enunciado en
  **Markdown** (renderizado con el mismo pipeline del CMS), lenguajes permitidos
  (Kotlin/Swift), **código inicial** por lenguaje, límites de tiempo/memoria y un
  **editor de casos** entrada→salida con marca de "oculto". Publicar exige al menos
  un caso. Aún **sin experiencia de alumno** (llega en la última fase).
- **Modelos y registro del módulo "Ejercicios" (opt-in por grupo).** Segunda fase
  del mini-juez: los modelos Parse `EjercicioProgramacion` (pertenece a una
  colección, con enunciado, lenguajes, código inicial, límites y casos de prueba)
  y `EnvioEjercicio` (historial de entregas por alumno con su veredicto). Se
  registra `ejercicios` en el catálogo de módulos, pero **opt-in**: a diferencia de
  los otros cuatro (que nacen encendidos), este **nace apagado** y se enciende
  explícitamente por grupo. `moduloHabilitado` se generaliza para soportar ambos
  defaults sin migración (grupos existentes lo tienen apagado por ausencia). Aún
  **sin endpoints ni UI** — autoría y experiencia del alumno llegan después.
- **Motor de ejecución del juez de ejercicios (Kotlin y Swift).** Primera fase del
  módulo "Ejercicios" (mini-juez estilo UVA): una librería que **compila y ejecuta
  código del alumno en el propio servidor**, aislada con **bubblewrap** (open-source,
  sin Docker ni servicios de pago), y lo evalúa contra casos entrada/salida →
  veredicto (`aceptado`, `respuesta_incorrecta`, `tiempo_excedido`,
  `error_compilacion`, `error_ejecucion`, `limite_memoria`).
  - Cada corrida va sin red (`--unshare-net`), con filesystem de solo lectura salvo
    un workdir efímero, y con límites de tiempo (reloj de pared), CPU, procesos y
    memoria (`-Xmx` en la JVM, `ulimit -v` en binarios nativos). Corridas encoladas
    para no saturar el servidor.
  - Aún **sin endpoints ni UI** (llegan en fases siguientes). Se verifica con la CLI
    `scripts/probar-juez.ts` (AC/WA/TLE/error de compilación en ambos lenguajes).
    Provisión del servidor documentada en `JUEZ.md`.
- **Asignación de contenido por partes (grupo × colección).** Antes, asignar una
  colección a un grupo daba sus **4 partes** de golpe (Documentación, Páginas,
  Competencias, Actividades). Ahora, por colección, se habilita cualquier
  combinación. La asignación **sale del form de editar grupo** y pasa a una acción
  propia **"Asignaciones"** con su modal: filas de colección que se **expanden** al
  asignarlas, mostrando sus partes con todo **encendido por defecto** (compartir
  todo = cero clics extra).
  - **Se guarda lo APAGADO** (`Grupo.modulosDeshabilitados`), no lo encendido —
    a propósito: los grupos actuales no tienen el campo, así que conservan las 4
    partes (**cero migración**), y **un módulo que se agregue a futuro nace
    habilitado en todos los grupos** y se apaga por grupo. Un solo catálogo
    (`modulos-contenido.ts`, espejado en el front) que la UI, el sidebar y la
    validación iteran — sumar un módulo es una entrada, no reestructurar.
  - Cada una de las 4 partes filtra por su módulo (visor/Documentación,
    `competenciasDeGrupo`, `plantillasDeGrupo`, filtro de Páginas), y el **menú del
    grupo** solo muestra las secciones habilitadas. `PUT /admin/grupos/:id/asignaciones`
    (solo admin) reemplaza al viejo campo `colecciones` de crear/editar grupo.
  - **Comportamiento:** apagar Documentación oculta el visor de inmediato; apagar
    Competencias/Actividades afecta la **materialización futura** (malla, plantilla)
    y qué se ofrece, **no** borra lo ya estampado. De paso se elimina un
    `coleccionesDeGrupo` duplicado en `paginas.controller`.
- **Nuevo rol "profesor"**, con acceso restringido a su grupo. Al loguear, el
  profesor **no entra al panel admin**: cae directo en su grupo asignado (como el
  alumno cae en su área) y gestiona ese grupo con **las mismas capacidades** que un
  admin, pero **solo** los grupos donde figura en `Grupo.admins`. El admin sigue
  igual. (Datos: Enrique pasa a profesor; Alfer y Denisse siguen admin.)
  - **El candado vive en el API**, no solo en la UI (el front no protege rutas por
    rol). Un middleware nuevo (`grupo-scope.middleware`) valida, en cada ruta
    `/admin/grupos/:id/*`, que el profesor pertenezca a ese grupo; si no, 403.
    `GET /admin/grupos` le devuelve **solo sus grupos**. Se le bloquean las cosas
    globales (Administradores, crear grupos, dashboard, CMS, escritura de
    catálogos) y se le permiten las **lecturas de referencia** que sus pantallas de
    grupo necesitan (`GET /admin/competencias`, `GET /admin/profesores`).
  - En **Administradores**: columna **Rol**, acción **Editar** (nombre y rol) y
    botón **Nuevo usuario** con selección de rol (admin/profesor) y contraseña
    inicial. La lista ahora incluye a los profesores. Guardrail: no se puede dejar
    el sistema con **cero admins** (degradar al último admin da 400).
  - `scripts/migrate-enrique-profesor.ts` — cambia el rol de Enrique, idempotente
    y con `--dry-run`. Corre **después del deploy** (antes rompería su acceso en
    producción con el código viejo).
  - **Corrección de raíz aprovechada:** `admin.routes.ts` tenía un
    `router.use('/admin', requireAdmin)` que —al montarse primero— interceptaba
    **todo** `/api/admin/*`, incluidas rutas de otros routers. Se pasó a guards
    **por ruta** para que cada router aplique el suyo.
  - **Candado por sub-recurso (endurecimiento):** el guard valida el `:grupoId` de
    la URL, pero un profesor de su grupo podía referir un recurso de OTRO grupo en
    el mismo path. Se cierra por tres vías:
    - **Carga por id cruzado:** cada mutación restringe el sub-recurso a su grupo
      (`scopeGrupo`) — un id ajeno responde **404**. Cubre entrevistas, evaluaciones,
      equipos, avances, actividades de evaluación, malla y competencias del alumno.
    - **Ids en el BODY:** los `miembros` de un equipo deben ser alumnos del grupo y
      el `equipoId` de una entrevista debe ser del grupo (si no, **400**) — antes el
      refetch con `include('…miembros')` filtraba el roster de otro grupo. Aplica a
      crear y editar.
    - **GET de identidad:** `getMallaAlumno`, `getCompetenciasAlumno` y
      `getAvancesEquipo` devolvían el nombre/email del alumno o el roster del equipo
      sin validar pertenencia; ahora exigen que el alumno/equipo sea del grupo (**404**).
  - **`updateGrupo` no deja al profesor reasignar `admins`/`colecciones`** de su
    grupo (son configuración: quién da la materia, quién está a cargo). Puede editar
    nombre/fechas/agenda; esos dos campos solo los cambia un admin.
- **Administradores asignables a grupos, de forma bidireccional.** Desde el
  **grupo** (form de crear/editar, junto a las colecciones) se marcan sus
  administradores; desde **Administradores** cada fila tiene una acción "Grupos"
  que abre un modal con los grupos del admin. Ambos lados escriben la misma
  relación (`Grupo.admins`, array de pointers, como `colecciones`).
  - Es una **asociación organizativa**: registra quién está a cargo de qué grupo.
    **No cambia el acceso** — todo admin sigue viendo y gestionando todos los
    grupos, como hasta ahora.
  - El campo se ve como columna en las tablas de Grupos y de Administradores.
  - `GET /admin/administradores` gana un uso más; se agrega
    `PUT /admin/administradores/:id/grupos` (reconcilia los grupos de un admin
    sin tocar los que no cambian). El servidor valida que cada id asignado sea un
    admin activo: un alumno no puede colarse por el payload.
- **Vista "Administradores"** en el menú del admin: una tabla con los usuarios
  administradores dados de alta (nombre, correo, último acceso, fecha de alta).
  Solo lectura por ahora. El endpoint `GET /admin/administradores` filtra por
  `userType: 'admin'` y solo activos, así que **no incluye alumnos** — el censo
  de producción son 3 admins frente a 20 alumnos, y la tabla trae solo los 3.
- **Las páginas y las carpetas del CMS se pueden ocultar y volver a mostrar**, para
  escribir el curso completo de antemano e irlo liberando conforme avanza. El ojo
  aparece en las acciones de cada nodo del árbol, y las páginas además tienen un
  botón **Ocultar/Mostrar** en el encabezado del editor. Ocultar **no toca el
  contenido**: la versión publicada queda intacta y volver a mostrar la devuelve
  igual, sin versión nueva.
  - **Ocultar una carpeta se lleva todo su subárbol** —incluidas sus páginas
    publicadas— pero **no despublica ninguna**: al volver a mostrarla, cada página
    regresa al estado en el que estaba. Ocultar la carpeta y despublicar sus páginas
    una por una no son lo mismo, y solo lo primero es reversible sin perder el detalle.
  - La carpeta usa un campo **propio** (`Documento.oculto`) y no `publicado`. Una
    categoría no tiene publicación propia: se muestra si tiene alguna página publicada
    debajo — de hecho **las 54 categorías vivas tienen `publicado: false`** y se ven
    igual. Reusar ese campo como candado las habría **escondido todas** entre el deploy
    y la migración. `oculto` ausente = visible, así que esto **no necesita migración**.
  - La visibilidad es su **propio endpoint** (`PUT /admin/documentos/:id/publicacion`),
    separado de `/publicar`. Fundirlos habría hecho que "mostrar" desde el árbol
    publicara de rebote un borrador a medio escribir.
  - En el árbol, el punto gris ya no dice "Borrador" sino **"Oculta"**: chocaba con
    el *otro* borrador (los cambios sin publicar de una versión), y con esta función
    los dos conceptos convivían en la misma pantalla. Y una página publicada **dentro
    de una carpeta oculta** se pinta apagada: el punto dice lo que el alumno ve, no lo
    que el flag dice.
- **TC2008B entra al CMS** como colección `tc2008b` (Modelación de sistemas
  multiagentes con gráficas computacionales), importada desde su Docusaurus:
  15 páginas, 4 categorías, 379 recursos y 393 enlaces reescritos, con **0 sin
  resolver** en el reporte de paridad. De paso se corrigieron en el origen tres
  enlaces del README de medio término que apuntaban a `4_half_term/…` desde
  *dentro* de `4_half_term/`: estaban rotos también en el sitio publicado.

### Changed
- **Ejercicios pasa a vivir dentro del shell (topbar + sidebar).** Era una pantalla
  suelta: el enlace del menú estaba marcado `external`, así que abría una **pestaña
  nueva** sin topbar ni sidebar, con un "← TC2007B" que devolvía al **visor de
  Contenidos** en vez de al sitio desde el que se entró. Ahora se monta una vez por
  rol dentro del dashboard —`/admin/grupos/:id/ejercicios/:slug` (colgado del grupo,
  para que el sidebar siga en modo "detalle de grupo") y `/alumno/ejercicios/:slug`—
  y el listado **ya no lleva "volver"**, porque es sección de primer nivel del menú;
  la colección pasa a subtítulo. El "← Ejercicios" del solver sí se conserva: ahí el
  volver sí corresponde. Las URLs previas `/contenidos/:slug/ejercicios[...]`
  **redirigen** al árbol del rol, así que los enlaces viejos siguen funcionando.
- **El menú del grupo se agrupa por acción, no por colección.** "Contenidos" era
  una sola sección con una entrada por colección **y** acción: un grupo con tres
  materias daba una lista plana de **12 enlaces** ("TC2005B — Páginas", "TC2007B —
  Páginas", …) que no cabía en la pantalla. Ahora son cuatro secciones —
  **Contenido, Páginas, Competencias y Actividades**— y dentro de cada una, las
  colecciones del grupo, etiquetadas solo con su clave (la cabecera ya dice qué
  acción es; repetirla daba "Páginas → TC2005B — Páginas").
  - **Con una sola colección no hay submenú:** la sección se aplana a un enlace
    directo con el nombre de la acción. Un desplegable de un elemento es un clic
    de más, y es el caso normal — la mayoría de los grupos tienen una materia.
  - Sin colecciones asignadas se muestra **una** entrada que lo dice, en vez de
    cuatro secciones vacías.
  - `DocusMenu` pasa a llamarse `SeccionColecciones`: el nombre era herencia de
    Docusaurus, que se retiró hace tiempo, y el componente ya no tiene nada que ver.
- **El importador de Docusaurus dejó de depender de `packages/docusaurus`.** El
  corte de US-7 retiró ese paquete del repo, pero el script seguía leyendo su
  ruta hardcodeada: quedaba inservible para cualquier instancia nueva. Ahora
  recibe `--raiz <ruta>` —la carpeta con `docs/` y `static/`, viva donde viva— y
  resuelve solo el layout: `<raiz>/docs/<slug>` si existe (el viejo monorepo
  multi-instancia) y si no `<raiz>/docs` (un sitio por materia, que es como está
  armado el resto); `--docs <subruta>` lo fuerza. Dos ajustes que salieron de
  importar un sitio suelto:
  - Los **enlaces absolutos** se prueban con y sin el prefijo del `routeBasePath`
    (`/docs`) y del slug, porque ahí la instancia cuelga de la raíz de la URL y no
    de una subcarpeta.
  - Si **no hay `static/`** se avisa una vez, en vez de listar los assets
    absolutos uno por uno en `SIN RESOLVER` sin decir por qué.
- **`--publicar`** deja la colección publicada al importarla. El default sigue
  siendo **borrador**: publicar es la decisión que quiere un humano enfrente.
- **El cálculo de calificaciones es ahora UNO solo** (`@tc2005b/evaluacion`), no
  cuatro copias. Estaba duplicado en el API, la malla del profesor, el export
  XLSX y el dashboard del alumno, y las copias habían divergido —el bug de
  arriba es exactamente eso: tres copias se actualizaron para leer números y una
  se quedó atrás—. El paquete es puro (sin dependencias) y va con 28 tests que
  fijan las decisiones, no el resultado accidental: cómo se lee cada formato de
  valor, que una competencia sin evaluar cuenta como 0 y sí entra al promedio,
  y que un periodo acumulativo no puede contar dos veces la misma actividad.
  - Al unificar se corrigen dos divergencias más:
    - **Doble conteo en periodos acumulativos.** Las copias de la web sumaban una
      actividad una vez por cada periodo previo en el que apareciera. Hoy ninguna
      está en 2+ periodos, así que no llegó a morder, pero estaba armado.
    - **Redondeo.** El API redondeaba la nota de cada periodo *antes* de
      ponderarla y la web no, así que un mismo alumno podía tener dos notas
      oficiales distintas según la pantalla. Ahora se redondea una sola vez, al
      presentar. En producción esto mueve **una nota: 82.9 → 83**.
- **`yarn test` deja de salir siempre en rojo.** Sin configuración propia, vitest
  recorría todo el repo y arrastraba los `.test.js` de `deprecated/` —ejercicios
  de un curso de JS archivados ahí, ajenos al proyecto—, y uno de ellos importa un
  archivo que no existe. La suite terminaba en rojo aunque los tests reales
  pasaran, con lo que dejaba de servir como señal: cuando algo se rompiera de
  verdad, el rojo se habría visto igual. `vitest.config.ts` acota la búsqueda a
  `packages/`. De paso, los conteos que se venían reportando estaban inflados: de
  los 195 tests, **139 eran del curso archivado**; la suite real son **56** en 5
  archivos.
- **Las Actividades de Evaluación (la plantilla) pertenecen a una colección** y
  dejan de ser una lista global. `copiarPlantilla` estampaba la plantilla ENTERA
  en cualquier grupo, fuera de su materia o no; ahora copia solo las de las
  colecciones del grupo. Cada colección gana una acción **"Actividades"** en la
  tabla de Contenidos (`/admin/actividades?coleccion=<id>`), aparece en el menú
  del grupo como "TC2005B — Actividades", y **"Actividades" se retira del menú
  lateral**. La pantalla de Contenidos conserva "Ver todas las actividades".
  - **Copiar la plantilla es ahora INCREMENTAL.** Antes devolvía 409 si el grupo
    ya tenía cualquier actividad, lo que dejaba a un grupo con dos materias sin
    poder traer la segunda: copiaba las de la primera y quedaba bloqueado para
    siempre. Ahora deduplica por nombre y avisa de cuántas omitió.
  - `scripts/migrate-actividades-coleccion.ts` — backfill idempotente con
    `--dry-run`. **No toca ninguna calificación**, y esta vez es literal: la
    plantilla es un troquel de un solo uso, se copia POR VALOR y nada de lo ya
    estampado (274 actividades de grupo, 1482 celdas de malla) apunta a ella.

### Fixed
- **"No se pudo cargar" intermitente en las pantallas del alumno.** `useCargaGated`
  abortaba la petición anterior en el cleanup del efecto, pero el `.catch` de esa
  petición **ya abortada** marcaba `error` sobre el estado de la petición **nueva**:
  los datos llegaban bien y aun así se pintaba "No se pudo cargar. Revisa tu
  conexión", y solo se recuperaba al pulsar Reintentar (que resetea el flag). Se
  disparaba en cada remontaje —`React.StrictMode` lo provoca **siempre** en
  desarrollo— y al cambiar `url`/`sessionToken`. Ahora un resultado superseded se
  descarta en vez de escribir estado. Afectaba al listado de Ejercicios y al solver.
- **Una página oculta se podía quedar atrapada en invisible.** `POST /publicar`
  empezaba con `if (!borrador) → 400 'No hay cambios de borrador que publicar'`, así
  que una página que se ocultara **sin editarle nada** no tenía forma de volver:
  Publicar la rechazaba porque no había borrador que publicar. Ahora, sin borrador
  pero con versión y oculta, publicar **la re-expone** con su versión actual en vez
  de fallar. Publicar-contenido y publicar-visibilidad estaban fundidos en uno.
- **El alumno veía su calificación masivamente deflactada.** Su dashboard leía
  TODAS sus competencias como 0. El parser (`parseCompetenciaPercent`) empezaba
  con `if (typeof valor !== 'string') return 0`, y los valores se guardan como
  **número** — las 396 celdas de producción lo son. Como en el Periodo 2 las
  competencias pesan **70%**, **17 de los 18 alumnos de FebJun26 veían ~41.5
  puntos menos de su nota real** (peor caso, 51.9). La vista del profesor y el
  export XLSX siempre estuvieron bien: el error era solo de la pantalla del
  alumno, y siempre a la baja. Ninguna nota guardada estaba mal; lo que estaba
  mal era lo que se le mostraba.
- **El plan de evaluación se podía quedar atascado por ids muertos.** Sus
  `periodos[].competencias` y `periodos[].actividades` son ids sueltos sin FK, y
  cuando una actividad se borra (soft-delete) su id se puede quedar colgado ahí —
  en producción había dos así. La validación de pertenencia (abajo) los habría
  rechazado con un 400, dejando ese plan **imposible de guardar**: esos ids ni
  siquiera se pintan en la UI, así que nadie podía quitarlos. Ahora se distinguen
  dos casos: un id que apunta a algo **vivo de otro grupo/materia** es un error
  (400), y un id **muerto** se poda en silencio al guardar. `podados` viaja en la
  respuesta para que la UI pueda decirlo. `scripts/limpiar-plan-ids-huerfanos.ts`
  saca la basura ya existente. **No cambia ninguna nota**: esos ids no sumaban al
  numerador ni al denominador, porque al borrarse la actividad se borraron también
  las celdas de los alumnos.
- **El plan de evaluación no validaba que sus actividades fueran del grupo**, solo
  que existieran. Un plan podía referenciar la actividad de OTRO grupo y
  `computeActividadesScore` la omitiría del denominador: **la nota cambiaría sin
  error ni log**. Es el mismo agujero que ya se tapó para las competencias; a las
  actividades no se les había aplicado el mismo razonamiento.
- **Las Competencias pertenecen a una colección (materia)** y dejan de ser una
  lista global. Antes, la malla de un alumno se materializaba con **todas** las
  competencias del sistema, sin importar la materia de su grupo. Ahora se arma
  con las de las colecciones de su grupo (`Grupo.colecciones` →
  `Competencia.coleccion`), y cada colección gana una acción **"Competencias"** en
  la tabla de Contenidos que abre las suyas ya filtradas
  (`/admin/competencias?coleccion=<id>`).
  - **El plan de evaluación y las entrevistas solo ofrecen —y aceptan— las
    competencias del grupo.** `PlanEvaluacion.periodos[].competencias` son ids
    sueltos sin FK: si un periodo referenciara una competencia de otra materia, el
    alumno no tendría celda para ella y `computeCompetenciasScore` la omitiría del
    promedio — **la nota cambiaría sin que nadie tocara nada**. Ahora se valida la
    pertenencia, no solo la existencia.
  - **Una competencia calculada solo puede depender de competencias de su misma
    colección.** Si dependiera de una de otra materia, el alumno no tendría celda
    para esa dependencia y la calculada quedaría sin evaluar **para siempre, sin
    error ni log**. Se valida en el servidor y ni siquiera se ofrece en el form.
  - **Crear una malla sin colecciones ya no falla en silencio**: si el grupo no
    tiene materia asignada, el error lo dice y manda a Editar Grupo, en vez de
    dejar una malla vacía.
  - `scripts/migrate-competencias-coleccion.ts` — backfill idempotente con
    `--dry-run`. **No toca ninguna calificación**: las 198 celdas de malla, los
    planes y las entrevistas siguen apuntando a las mismas competencias.
- **Las Páginas se alcanzan desde Contenidos**, que es donde viven (cada `Pagina`
  pertenece a una `Coleccion`). Cada colección gana una acción **"Páginas"** que
  abre las suyas **ya filtradas**; el filtro vive ahora en la URL
  (`/admin/paginas?coleccion=<id>`), así que el enlace se puede compartir y
  recargar sin perderlo. "Páginas" se retira del menú lateral, pero la pantalla de
  Contenidos conserva un **"Ver todas las páginas"**: sin él solo se llegaría a
  listas ya filtradas, y se perderían la vista de conjunto (filtro por etiqueta
  entre colecciones) y el acceso a las páginas **sin colección**.

### Added
- **La agenda de entrevistas es ahora un campo del grupo**
  (`Grupo.urlAgendaEntrevistas`, opcional, editable en el form del grupo). Antes
  era una URL **hardcodeada en tres sitios** (el sidebar, el navbar público y el
  mock del calendario que lee el pie), la misma hoja para todos. Ahora cada grupo
  tiene la suya: el ítem "Agendar Entrevistas" desaparece del menú global del
  admin y aparece **dentro del grupo**, y el alumno ve la de **su** grupo. Sin
  URL, el ítem no se muestra (mismo criterio que "Documentación" sin colecciones).
  - **La URL se valida en el SERVIDOR: solo `http`/`https`.** Se renderiza como
    `<a href>`, así que un `javascript:` guardado ahí sería XSS en la sesión de
    quien pulsara el enlace. La validación vive en `utils/url.ts`, con 20 tests.
  - `scripts/migrate-agenda-entrevistas.ts` — pone en los grupos existentes la URL
    que estaba activa, para que nadie pierda el enlace (idempotente, `--dry-run`).
  - Los enlaces del **sitio público** (navbar y pie), que no tienen contexto de
    grupo, se consolidan en `config/enlaces.ts` en vez de estar copiados en dos
    componentes.

### Removed
- **`Grupo.enlaces`**: el `Record<string,string>` del modelo. Estaba **vacío en
  los 3 grupos** de producción y no lo consumía nadie — el pie del sitio, que
  parecía leerlo, lee en realidad el mock estático. Se va del modelo, del payload
  del calendario, del seed y del tipo del front. Es el quinto campo muerto que se
  retira de `Grupo`.

### Changed
- **CMS "Contenidos" — el editor a un clic.** El árbol de páginas se muda al
  sidebar (modo contextual, como `/admin/grupos/:id`) y seleccionar una página
  abre el editor **inline**, sin el paso intermedio de "Abrir editor". La página
  seleccionada viaja en la URL (`?doc=<id>`), así que recargar o compartir el
  enlace conserva lo que estabas editando. La ruta a pantalla completa
  (`/admin/contenidos/:id/editar/:docId`) sigue viva como modo enfocado.
  - **El árbol se maneja como un explorador de archivos**: arrastrar mueve
    (vertical reordena, horizontal cambia de nivel), doble clic renombra en
    línea, y al pasar el cursor aparecen las acciones de cambiar slug y eliminar.
  - **Renombrar cambia SOLO el título; el slug (la URL) no se toca.** 82 de los
    120 documentos tienen un slug que no deriva de su título (`readme`, herencia
    de Docusaurus) y hay ~59 enlaces internos apuntando a esas rutas sin ningún
    redirect: regenerar el slug al renombrar los habría roto en silencio. Al
    **crear**, en cambio, el slug sí se genera del título (nada apunta aún a la
    página), y el campo desaparece del formulario.
  - Cambiar el slug a propósito es una acción aparte, con un diálogo que muestra
    **la ruta actual y cómo quedará** antes de guardar.
  - Desaparece el panel de metadatos: todo se movió a donde se usa (la plantilla
    baja a la toolbar del editor).
  - El editor puede **colapsar el código o la vista previa** (código / ambos /
    preview; por defecto ambos, y se recuerda). El panel oculto no se desmonta,
    para no perder el historial de deshacer de CodeMirror.
- **Los diálogos del admin usan SweetAlert2** (`utils/dialogos.ts`). Se
  sustituyen los **25 `confirm()`/`prompt()`/`alert()` nativos** de todo el web:
  además de verse mejor, los nativos **bloquean el hilo del navegador** mientras
  están abiertos. Los borrados van en rojo y con el botón etiquetado ("Eliminar"),
  no con un "OK" genérico; la contraseña generada de un alumno se muestra en un
  diálogo copiable en vez de un `alert()` del sistema.

### Fixed
- **Pérdida de borrador al cambiar de página en el editor.** El autosave
  (debounce de 1.5 s) se **cancelaba** al cambiar de documento o desmontar, así
  que lo escrito en el último segundo y medio se perdía sin aviso. Ahora se
  vuelca antes de salir, con los valores del documento que se deja, encadenado al
  PUT en vuelo para no romper el single-flight.
- **El sidebar se colapsaba solo y no se dejaba abrir** en pantallas ≤1024 px: el
  handler de `resize` forzaba el colapso en **cada evento**, no solo al cruzar el
  umbral, y nunca lo revertía al ensanchar. Con el árbol dentro, eso dejaba al
  admin sin navegación.
- **Etiquetas de páginas que no se veían ni filtraban.** `Pagina.etiquetas`
  guardaba objectIds como **strings sueltos**, sin validar nada, así que se
  colaron NOMBRES de etiqueta (`"eval"`) donde debía ir el id. El render los
  descartaba en silencio (`if (!tag) return null`), de modo que **av2 y av3
  estaban etiquetadas como `eval` y aun así salían sin chip y no aparecían al
  filtrar** por esa etiqueta; av1 tenía la etiqueta duplicada (el nombre y el id).
  - `Pagina.etiquetas` pasa a ser un **array de pointers** a `Etiqueta`. Un
    pointer no admite un nombre suelto: la clase de bug queda cerrada de raíz.
  - El API **valida** los ids contra `Etiqueta` (400 si alguno no existe) y
    devuelve las etiquetas **hidratadas** (`{id, nombre, color, textColor}`),
    omitiendo las borradas. El cliente ya no resuelve ids contra un mapa, así que
    no puede volver a descartar referencias sin avisar.
  - `scripts/migrate-paginas-etiquetas-pointers.ts` — migración idempotente con
    `--dry-run`: convierte strings→pointers, **repara** las entradas que eran
    nombres (busca la `Etiqueta` por nombre) y deduplica. Ejecutada: 3 páginas,
    3 referencias reparadas, 0 descartadas.

### Added
- **Páginas por colección (materia)**: `Pagina` ahora apunta a una `Coleccion`
  del CMS "Contenidos" (pointer `Pagina.coleccion`), de modo que cada página
  pertenece a una materia. Al agregar una actividad al calendario, el picker de
  páginas solo ofrece las de las colecciones asignadas al grupo
  (`Grupo.colecciones`); si el grupo tiene varias, ofrece las de todas. Si no
  tiene ninguna, muestra todas con un aviso en lugar de quedarse vacío.
  - `GET /api/paginas?grupoId=` — listado público acotado a las colecciones del
    grupo; responde `filtrado: false` cuando no pudo acotar. Sin el parámetro, el
    comportamiento es el de siempre.
  - `GET /api/admin/paginas?coleccionId=` — filtro para la tabla del admin
    (`sin-coleccion` lista las que no tienen colección asignada).
  - `scripts/migrate-paginas-coleccion.ts` — backfill idempotente de las páginas
    existentes hacia una colección (`--coleccion <slug>`, `--dry-run`).
  - `scripts/seed-paginas.ts` acepta `--coleccion <slug>` para no volver a crear
    páginas huérfanas.

### Changed
- **La URL pública de las páginas no cambia** (`/paginas/:slug`) y el slug sigue
  siendo único global: las actividades del calendario enlazan a las páginas por
  string (`Actividad.enlace`), sin integridad referencial, y cambiar la forma de
  la URL las habría roto en silencio.
- Las páginas **siguen siendo públicas**: la colección organiza y filtra, no
  restringe el acceso. El gating del CMS "Contenidos" no se extiende a `/paginas`.
- `PaginaForm`: el campo "Grupo", que era un input de texto donde se tecleaba a
  mano el objectId del grupo, se sustituye por un `<select>` de colecciones. El
  admin ya no puede escribir un id inexistente: el API valida que la colección
  exista (antes creaba el pointer a ciegas con `createWithoutData`).
- `PaginasPage`: la columna "Alcance" (que solo derivaba de si había grupo o no)
  se sustituye por "Colección", con filtro por colección.

### Removed
- **`Pagina.grupo`**: el pointer a `Grupo` y la noción de "alcance Global/Grupo"
  derivada de él. No filtraba nada en ninguna capa —toda página publicada era
  visible para cualquiera con el slug— y ninguna de las 47 páginas en producción
  lo tenía asignado.
- **La entidad `Materia` completa**: modelo, CRUD (`/api/admin/materias`), seed,
  `Grupo.materia`, `Coleccion.materia`, `types/materia.ts` y su UI (el `<select>`
  del form de grupos y la columna de la tabla). `Materia` nació como el mecanismo
  de gating de Docusaurus; al retirarse Docusaurus (US-7) el gate murió y
  `Coleccion` ocupó su lugar, pero la entidad sobrevivió sin función: ninguna
  query, gate ni filtro dependía de ella. `Coleccion` era además un superconjunto
  estricto (`nombre`/`slug`/`codigo` → `nombre`/`slug`/`clave`, más `descripcion`,
  `icono` y `publicada`).
  - **`Grupo.colecciones` queda como fuente única.** Antes el form permitía
    guardar un grupo con `materia = TC2005B` y `colecciones = [TC2007B]`: el
    primero no hacía nada y el segundo decidía el acceso real. Esa contradicción
    ya no es representable.
  - La columna "Materia" de `/admin/grupos` pasa a ser **"Colecciones"**.
  - **Cambio de contrato:** el JSON de `Grupo` ya no incluye la clave `materia`.
  - `Coleccion.materia` nunca se escribió: la columna no existía en ningún
    documento de la BD.
  - `scripts/cleanup-materia.ts` limpia los datos huérfanos que quedan en Mongo
    (idempotente, con `--dry-run` y respaldo JSON). **Correrlo después del
    deploy**, no antes.
- **`Grupo.curso` y `Grupo.nombreCurso`**: strings legacy que duplicaban a
  `Grupo.materia`. `createGrupo`/`updateGrupo` dejaron de escribirlos al migrar
  a `Grupo.materia` (pointer), pero el payload de `GET /api/calendario/:grupo` y
  la interfaz `Calendario` del front seguían declarándolos — **y ningún
  componente los renderizaba**. Se retiran del modelo, del payload, del tipo, del
  seed y del mock. Sin cambio visible: el calendario nunca los mostró.
  `migrate-grupo-curso-to-materia.ts` sigue disponible para BDs sin migrar (lee
  las columnas crudas).
- **Docusaurus retirado (US-7)**: se elimina `packages/docusaurus`, el gate
  `/docs` por materia y el campo `Grupo.docusaurus[]`. `/docs/*` responde
  301 permanente hacia `/contenidos/*` (mapa del importador + heurística).
  La documentación vive ahora en el CMS "Contenidos".

### Changed
- **CMS "Contenidos" — retoques de nombre y enlaces tras el retiro de
  Docusaurus**: el menú del sidebar del grupo pasa de "Docusaurus" a
  "Contenidos"; las descripciones/enlaces de los labs que decían "Docusaurus
  del curso" ahora apuntan a la documentación del CMS (incluye reponer un
  enlace muerto de lab11). En la BD, los enlaces `/docs/...` de las Páginas se
  migran al visor `/contenidos/...` (21 páginas, 22 enlaces) con un script
  idempotente que respeta los `/docs/...` externos (MDN, Node, Tailwind…).
- El Docusaurus se sirve ahora en `/docs/...` en lugar de `/docs/docs/...`
  (`routeBasePath: '/'`). Las páginas registradas en BD y los enlaces de los
  labs se migraron al nuevo esquema.
- Branding genérico configurable: el nombre y subtítulo de la app
  (antes "TC2005B" / "Construcción de Software y Toma de Decisiones") ahora
  salen de `packages/web/src/config/app.ts` (`APP_NAME`, `APP_TAGLINE`) y se
  usan en login, navbar, home, sidebar, título del navegador y export XLSX.

### Deprecated
- Se elimina el despliegue por **GitHub Pages**. El sitio se despliega en un
  servidor (`groups.meeplab.com`) que hace `pull` del repositorio y sirve `dist/`.
  Se removieron los workflows de GitHub Pages, `.nojekyll` y el hack SPA `?/`.

### Added
- **CMS "Contenidos" — mejoras de autoría y lectura**: en el editor de Páginas,
  el bloque "Práctica" incluye un selector "Seleccionar del CMS" que enlaza a una
  página publicada (colección → página, con búsqueda) sin teclear la ruta. En el
  visor: el árbol lateral se puede colapsar/mostrar con un botón (útil al
  presentar con alumnos; se recuerda en `localStorage`), las barras de scroll del
  árbol y del TOC se ocultan (el scroll sigue activo), y cada bloque de código
  tiene un botón para copiarlo al portapapeles.
- **CMS "Contenidos" — flujo de autoría de contenido**: par de scripts para
  escribir y probar contenido antes de publicar, recuperando lo que daba
  Docusaurus pero contra la BD. `preview-contenido.ts` renderiza `.md` con el
  pipeline real y los estilos del visor a un HTML autocontenido (sin servidor
  ni BD); `importar-markdown.ts` sube una carpeta de `.md` a una colección
  existente como **borrador** (o `--publish`), idempotente por
  `(colección, padre, slug)`, con `--padre`, `--dry-run` y subida de imágenes
  relativas como Recurso. Documentado en `AUTHORING.md` y `CLAUDE.md`.
- **CMS "Contenidos" (US-8)**: storage en AWS S3 — el files adapter cambia a
  `@parse/s3-files-adapter` cuando el `.env` trae credenciales (bucket
  privado `groups-meeplab-contenidos`; `directAccess` desactivado: S3 jamás
  sirve directo) + script de migración GridFS→S3 con `--dry-run`.
- **CMS "Contenidos" (US-6)**: importador Docusaurus→Contenidos con
  `--dry-run` y reporte de paridad (verificado: tc2005b y tc2007b, 0 y 1
  enlaces sin resolver, preexistentes); asignación de colecciones a grupos
  (multi-select en el editor y submenú del grupo); redirects 301
  `/docs/*→/contenidos/*` con mapa generado, apagados hasta el corte (US-7).
- **CMS "Contenidos" (US-5)**: búsqueda full-text con scope por permisos
  (imposible sugerir contenido ajeno; índice de texto Mongo con degradación
  a regex) con buscador en el visor; y páginas HTML crudas servidas con CSP
  propia dentro de iframe sandbox (origen opaco, sin cookies).
- **CMS "Contenidos" (US-4)**: recursos adjuntos — subida (límite 50 MB) y
  pegado de imágenes en el editor con referencia `recurso:`, gestor por
  documento, y stream vía endpoint gated por colección; los archivos de
  Parse dejan de ser públicos (gate interno de `/parse/files`).
- **CMS "Contenidos" (US-3)**: visor de lectura `/contenidos/<slug>/...` con
  autorización por request (árbol, TOC, breadcrumb y prev/next calculados en
  servidor; no permitido = 404), caches de permisos con invalidación y tema
  claro/oscuro. Tests unitarios de la poda de seguridad y la sanitización.
- **CMS "Contenidos" (US-2)**: editor CodeMirror 6 con preview en vivo
  (`/admin/contenidos/:id/editar/:docId`), autosave a borrador único,
  publicar con versionado (`cuerpoHtml` renderizado en servidor), historial
  con restaurar, y el pipeline compartido `@tc2005b/contenido-pipeline`
  (GFM, admonitions estilo Docusaurus, sanitización allowlist, highlight).
- **CMS "Contenidos" (US-1)**: modelos Parse `Coleccion`, `Documento`,
  `DocumentoVersion` y `Recurso`; CRUD admin y sección `/admin/contenidos`
  con árbol de páginas (según `design/cms-contenidos.html`).
- Redirects de las URLs viejas `/docs/docs/...` hacia las nuevas
  (`@docusaurus/plugin-client-redirects`).
- `CONTRIBUTING.md`, plantilla de PR y este `CHANGELOG.md`.

[Unreleased]: https://github.com/black4ninja/tc2005b.github.io/commits/main
