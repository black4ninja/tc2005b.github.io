# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto sigue [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **El reloj de la etapa, también donde manda el profesor.** El tiempo de cada
  etapa lo veían solo los alumnos, en la banda de su tablero. Pero quien decide
  cuándo se corta es el profesor, y para saber cuánto queda tenía que leerlo del
  proyector o preguntar. Ahora el mismo contador sale en tres sitios: la
  pantalla que se proyecta —en grande, junto al nombre de la etapa— y la barra
  de mandos, que vive tanto en el listado de dinámicas como dentro de la
  dinámica abierta. Pasado el tiempo sigue contando en negativo, igual que lo ve
  el alumno: cuánto se pasaron es justo el dato de la retrospectiva. Con la
  dinámica cerrada no se enseña, porque entonces marcaría las horas que han
  pasado desde la clase. El reloj pasa a un `useCuentaRegresiva` compartido en
  vez de repetir el intervalo en cada pantalla.
- **Las reglas del Scrum dejan de ser un aviso y las hace cumplir el servidor.**
  - **Sin etapa abierta no se toca nada.** Hasta ahora, mientras el profesor no
    señalaba una etapa regía la política de base —que lo permite todo— y un
    equipo podía adelantarse a escribir historias y a repartírselas antes de
    empezar. El corte va en `equipoEditable`, antes que cualquier política de
    zona, para que no se quede fuera ningún endpoint: ni el tablero, ni las
    épicas, ni los roles.
  - **En el backlog las historias no llevan responsable.** El backlog es la
    lista de lo que está por hacer, y poner nombres ahí es decidir quién hace
    qué antes de que el equipo se haya comprometido. Una historia que vuelve al
    backlog deja de ser de nadie.
  - **Nada avanza en el sprint sin alguien que responda por ello**, y **una
    persona lleva una historia a la vez**: si ya tiene una que no está en Done,
    no se le puede dar otra —tampoco sacando la suya de Done por la puerta de
    atrás—. Entre las dos, repartir el trabajo deja de ser opcional. Quien está
    ocupado sale en el menú, apagado y con la historia que lleva.
  - **En desarrollo el sprint ya está comprometido**: ni entra nada del backlog
    —lo prometía la pista de la etapa y no lo cumplía nadie— ni sale nada hacia
    él, porque devolver lo que no dio tiempo sería esquivar el bloqueo del
    cierre. **La daily se mira**: treinta segundos para decir en qué va cada
    uno, no el rato de poner el tablero al día.
  - «Solo lectura» pasa a significarlo: cambiar una historia se comprobaba
    contra una zona que no mira ninguna política, así que en la daily —y en la
    review— se podía seguir reescribiéndola, reasignarla o borrarla desde el
    detalle.
  - La barra de etapas está también **dentro de cada dinámica**, junto a los
    demás mandos, y actúa sobre esa dinámica.

### Changed
- **El burndown vuelve a decir lo que dice un burndown.**
  - Empieza en el **compromiso**. El primer corte se tomaba al entrar en el
    planning, con el sprint backlog todavía vacío, así que la curva arrancaba
    cayendo a cero y volvía a subir mientras el equipo planeaba.
  - La **línea ideal deja de moverse**: se recalculaba sobre los cortes que
    hubiera hasta ese momento, de modo que su pendiente dependía de cuántas
    veces cambiara de etapa el profesor y no del trabajo del equipo. Ahora baja
    del compromiso a cero sobre el ciclo entero, se fija al comprometerse y se
    queda en cero si el equipo da más vueltas de las previstas.
  - El **reporte final** lleva el burndown de cada sprint bajo el del proyecto,
    y la **proyección** los enseña todos por equipo en una tira que se arrastra
    de lado, como las columnas del kanban.
  - `packages/api/scripts/normalizar-burndown.ts` (con `--dry-run`) pone al día
    los sprints jugados con el esquema anterior.
- **El «por qué» es el titular de la historia y su único campo obligatorio.**
  Estaba al revés: la tarjeta se leía por el «qué» y el «qué» era lo que no se
  podía dejar en blanco, con lo que se podía guardar una historia que decía qué
  construir sin decir para qué.

### Fixed
- **La pestaña «Tableros» del profesor reventaba entera** al pintar las épicas:
  armaba los tableros por su cuenta y a los equipos les faltaban las épicas, la
  retro, los compromisos y el marcador. Había dos formas de armar un tablero;
  ahora hay una.
- **El objetivo del sprint no le llegaba al alumno**, que leía «Sin definir» con
  el del profesor puesto: se pintaba un campo por equipo que nadie escribía.
- **Escribir una historia se borraba solo.** El formulario se rellenaba con lo
  guardado cada vez que cambiaban sus props, y dos de ellas son objetos nuevos
  en cada refresco del tablero: escribir una historia entera sin que cayera un
  refresco en medio era cuestión de suerte.
- **El parche de etapa mandaba el sprint a medias** y le borraba al alumno el
  número y el objetivo durante los dos segundos que tardaba en llegar el estado
  completo.
- Tres sitios guardaban un puntero de usuario **sin datos** y devolvían el
  nombre en blanco: los miembros de un equipo, el responsable de una historia y
  el de un compromiso.
- **Borrar una dinámica dejaba huérfanos** épicas, tarjetas de retro, sprints y
  marcadores; borrar un equipo, lo suyo. La base es la de producción y se
  comparte.
- **Cerrar el sprint** pedía las historias y el marcador dentro del bucle de
  equipos: con nueve, dieciocho viajes encadenados en el botón que se pulsa con
  la clase esperando el marcador.
- **Marcar un compromiso previo parecía no hacer nada.** Marcarlo lo cierra y el
  servidor lo saca de la lista, pero la pantalla solo lo sustituía en su sitio, y
  la tarjeta se pinta igual con estado o sin él: quedaba idéntica hasta que un
  par de segundos después bajaba el tablero entero. Y el loader que sí había se
  iba al 45 % de opacidad, porque mientras uno viaja se apagan los dos botones.

### Performance
- **El tablero del alumno pasa de ~3,5 s a ~1,2 s.** La mayor parte se iba antes
  de empezar a trabajar: la lista de grupos de un alumno lleva dos niveles de
  include y cada petición suya la pedía **dos veces** —al validar la sesión y al
  evaluar el permiso—. Ahora se guarda tres segundos, con olvido explícito al
  dar de alta, de baja o completar el perfil. Leer el tablero pedía además la
  dinámica dos veces y los equipos otras dos.
- **Armar los equipos deja de recargar el detalle entero** en cada gesto: cada
  cambio devuelve la foto del reparto y la pantalla la fusiona. Asignar un
  alumno pasa de ~3,5 s a ~1,5 s y crear una dinámica de ~1,6 s a 0,85 s, con
  velo bloqueante mientras viaja.
- **Lo que se guarda se ve al momento**, sin esperar a que el tablero entero
  baje por el stream: al cerrarse el modal de una historia ya está puesta, la
  épica nueva aparece al volver el POST, y la retrospectiva contesta al Enter
  —el recuadro se queda con su texto, apagado y diciendo «Guardando…», en vez de
  vaciarse y dejar la duda—.
- **Cambiar de etapa** deja de desplegar lo que no usa: las dos lecturas del
  handler pasan de 209 ms a 94 ms. Lo que queda del viaje es validar la sesión
  contra la base, que es de la plataforma entera; **no se cachea a propósito**,
  porque una sesión revocada seguiría valiendo unos segundos en todo el sitio.

### Added
- **El aula va deprisa: la etapa llega a todas las pantallas a la vez, y nadie
  pisa el trabajo de nadie.**
  - **Cambiar de etapa era el gesto más lento** justo siendo el que más corre:
    reconstruía el estado entero —ocho consultas contra una base remota— antes
    de avisar a nadie, y encima hacía el ritual del ciclo por delante. Ahora
    manda un **aviso barato** que no consulta nada, contesta antes de escribir,
    y deja el ritual —fijar lo planeado, cobrar la deuda, tomar el corte— para
    después. Medido: del clic del profesor a que al alumno le cambie la
    instrucción hay **10 ms**; antes había más de un segundo de desfase.
  - **El ritual ya no va en fila india.** Era una consulta por equipo y por
    paso; ahora es una lectura para todos y el trabajo en paralelo.
  - **Cada gesto del alumno hace un viaje y no dos.** Mover una tarjeta pedía el
    estado completo otra vez justo cuando el stream ya lo traía. Si el stream no
    está vivo, se sigue recargando.
  - **Indicadores de carga donde hacían falta**: la etapa que se está aplicando
    gira y bloquea las demás, y cerrar un sprint o abrir el siguiente deshabilita
    su botón. Sin eso el profesor pulsaba dos veces.
  - **Semáforo de edición.** Abrir una historia la reserva: quien llegue después
    ve «Fulano está editando esto ahora mismo» y no puede ni abrirla ni
    arrastrarla. El candado se comprueba también en el servidor —entre que
    alguien abre y a los demás les llega el aviso caben milisegundos—, se
    refresca mientras el formulario esté abierto y **caduca solo a los treinta
    segundos**, que es lo que salva a la tarjeta de quien cerró la pestaña.
  - La red de seguridad del stream baja de un minuto a **veinte segundos**: en
    una dinámica donde una etapa dura treinta, enterarse un minuto tarde de que
    la conexión se cayó es enterarse cuando ya pasó todo.

- **La dinámica de Scrum completa: sprints, deuda técnica, retrospectiva y
  cierre.** El módulo pasa de ser un tablero a ser la actividad entera, con las
  reglas que la clase repetía en voz alta puestas donde se cumplen solas.
  - **La etapa manda sobre el tablero.** Cada etapa declara qué deja ver y tocar
    —backlog y sprint backlog por separado: editable, solo lectura, plegado u
    oculto—, qué movimientos permite y cuánto dura. En **planning** el sprint
    backlog se ve apagado con su candado y solo se entra de Backlog a Planned;
    en **grooming** se pliega; en la **daily** se pliega el backlog y salen los
    burndown; en **review** no se mueve nada; en la **retrospectiva** desaparece
    el kanban entero. Se añade **Desarrollo**, que no es una ceremonia de Scrum
    pero hace falta: es el momento en que se construye sin que ninguna regla
    estorbe.
  - **Solo entra al sprint lo estimado.** La escala pasa a `?` · 1 · 2 · 3 · 5 ·
    `∞`, y ni «desconocido» ni «demasiado grande» dejan pasar una historia. El ∞
    no es un castigo: es la manera de que partirla sea el único camino.
  - **Sprints de verdad.** El profesor abre los que quiera —el objetivo de los
    cuatro primeros sale de la presentación de la actividad— y al cerrar uno lo
    terminado se archiva, lo abierto se queda donde está y de ahí sale el
    **bloqueo**: puntos sin cerrar más una por cada restricción incumplida, que
    el profesor recoge del PO en el review.
  - **La deuda técnica se cobra sola.** Al salir del planning del siguiente
    sprint, el sistema devuelve al backlog historias AL AZAR hasta cubrir el
    bloqueo —pasándose de largo si hace falta— y avisa al equipo de qué acaba de
    pasar. Si el bloqueo supera lo que planearon, solo les queda lo que dejaron
    abierto: exactamente la regla de la dinámica.
  - **Retrospectiva con consecuencias.** Su propio tablero de tres columnas —qué
    hicimos bien, qué hicimos mal, qué podemos mejorar—, donde solo la última
    lleva responsable porque solo ella genera un compromiso. Los compromisos se
    arrastran al siguiente sprint, se ven bajo el tablero durante todo el sprint
    y aparecen en la retro siguiente con sus botones de sí/no. **Una persona solo
    puede llevar un compromiso abierto**: un equipo que no los cierra se queda
    sin gente a quien asignarle los nuevos.
  - **Burndown**: del sprint y del proyecto, con un corte en cada cambio de
    etapa, que es el ritmo al que la actividad pide actualizarlo. Y el reparto
    por integrante, con lo que hay que decir en voz alta: si una historia es de
    todos a la vez, no es de nadie.
  - **Épicas**: el entregable completo del que cuelgan las historias. El borde de
    la tarjeta lleva su color, y meter en el sprint una historia de otra épica
    sale señalado — «solo se puede trabajar en 1 modelo a la vez».
  - **Roles**: el equipo elige a su Product Owner desde su propia cabecera, con
    la descripción de qué se espera de cada rol al lado.
  - **Definición de terminado y restricciones** a un botón del tablero, editables
    por el profesor. Dejan de vivir en una diapositiva que nadie tiene delante.
  - **Resumen final**: al terminar la dinámica cada equipo ve lo que logró y lo
    que le faltó —sprint a sprint, quién cerró qué, qué nunca salió del backlog,
    cuánto costó la deuda—, que es lo que contesta las preguntas del cierre de
    la sesión.
  - **En la proyección** las columnas tienen ancho fijo y cada panel se desplaza:
    apretarlas hasta que el rótulo diga «PL…» es peor que tener que desplazar. Y
    un interruptor cambia los tableros por un resumen por equipo, que es lo que
    hace falta en la daily con seis o nueve.

- **Módulo «Actividad de Scrum»: el profesor arma equipos y cada equipo lleva su
  tablero kanban con historias de usuario.** Es un módulo de APRENDIZAJE, no un
  gestor de proyectos: todo está recortado a propósito para que lo que se
  practique sea el ciclo, no la herramienta. Se enciende por colección, como
  Ejercicios y Diagramas.
  - **El profesor** crea *dinámicas* (un sprint, un taller) y dentro de cada una
    los equipos. El reparto está pensado para el clic repetido de los primeros
    diez minutos de clase: los alumnos sin equipo a la izquierda, se marcan
    varios y se mandan de golpe, se arrastra uno a su tarjeta, o se reparte todo
    con **Repartir automáticamente** —en rueda, para que 13 personas en equipos
    de 5 salgan 5-4-4 y no 5-5-3—.
  - Los equipos son de la DINÁMICA y no del grupo: se rehacen en cada sprint,
    que es parte del ejercicio, y no tocan los equipos del proyecto semestral.
    Un alumno pertenece a un solo equipo por dinámica; asignarlo lo saca del
    anterior en vez de fallar.
  - **La etapa del Scrum** (planning, grooming, daily, review, retrospectiva) es
    un catálogo POR GRUPO con color propio y **descripción**, editable: cada
    materia corre su versión del ciclo. El profesor la cambia desde su panel y a
    todos los tableros abiertos les cambia la banda al instante. La descripción
    dice **qué hay que hacer en ese momento** y se lee en la propia banda: es lo
    que necesita quien levanta la vista a mitad de la sesión y no se acuerda de
    en qué punto del ciclo va la clase.
  - **El alumno** ve el tablero de su equipo con cinco columnas. Las cuatro del
    sprint —planned, doing, review, done— van dentro de un recuadro punteado
    rotulado **sprint backlog**, con el **objetivo del sprint** dentro; el
    backlog del producto queda fuera. La forma es la enseñanza: lo que el equipo
    se comprometió a hacer se ve separado de lo que solo está anotado.
  - **Las historias son post-its** con tres campos separados —¿por qué? (qué
    valor aporta), ¿qué? y ¿cómo?—, estimación en puntos (Fibonacci recortado,
    con «sin estimar» y con el significado de cada cifra en la propia opción) y
    prioridad **MoSCoW**. Separar los campos es lo que impide omitir el valor,
    que es la parte que se cae cuando el formato es texto libre.
  - En el TABLERO la tarjeta enseña solo el «qué»; el porqué y el cómo se leen
    al abrirla. Con los tres campos la tarjeta crecía tanto que en una columna
    cabían dos y el tablero dejaba de leerse de un vistazo, que es justo para lo
    que sirve un tablero.
  - **Una sola persona responsable por historia**, o ninguna. No es una
    advertencia: el selector es excluyente y el servidor exige que sea alguien
    del equipo. Dejar marcar a varios es la manera silenciosa de que al final no
    la lleve nadie. «Sin asignar» se ve, no se esconde: es la señal de que falta
    repartir.
  - **Las historias nacen en el backlog** y solo ahí. Meter trabajo directamente
    en «doing» es justo el hábito contra el que existe el sprint backlog.
  - **Proyección**: `Proyectar` abre en otra pestaña los tableros de los equipos
    elegidos. A partir de cuatro deja de repartirse en columnas —seguir
    estirando la fila deja tarjetas que no se leen desde el fondo del aula— y
    pasa a rejilla: 4 en 2 × 2, 5 y 6 en 3 × 2, de 7 a 9 en 3 × 3, bajando
    también el detalle de cada post-it. Nueve equipos es el tope por esa razón,
    no por una limitación técnica.
  - **Las tarjetas se arrastran con el dedo, con el ratón y con el lápiz**, por
    el mismo camino de código (eventos de puntero). El arrastre nativo de HTML5
    no existe en táctil: en una tableta el tablero no se podía mover. Con el
    dedo hay que **mantener pulsado** antes de arrastrar, que es lo que deja
    convivir el arrastre con tocar la tarjeta para abrirla y con deslizar para
    desplazar la columna; con ratón arranca al mover. El contenedor se desplaza
    solo al acercarse a un borde, porque mientras se arrastra el
    desplazamiento con el dedo está bloqueado. Quien no quiera arrastrar sigue
    teniendo el desplegable de columna dentro de la historia.
  - Las pantallas **escuchan en vez de preguntar** (SSE): quien arrastra una
    tarjeta la mueve también en la de sus compañeros y en el proyector. El
    estado se construye una sola vez por cambio y se reparte a todos los que
    escuchan, con un refresco lento de red de seguridad por si el wifi del aula
    corta la conexión sin avisar.

- **Agenda de entrevistas: el alumno elige su hora y de ahí sale el orden de la
  proyección.** El profesor puede repartir las preguntas semanas antes, pero
  quién pasa primero no lo decide él: lo escriben los alumnos al apuntarse, y
  eso solo se sabe el día de la entrevista.
  - **El profesor** abre días (fecha y franja) desde la pestaña **Agenda** de
    Preguntas. El día se parte solo en bloques del tiempo que rige en el grupo, y
    ese tamaño queda **congelado en el día**: cambiar el tiempo del módulo
    después movería las citas que los alumnos ya tienen apuntadas.
  - El día se lee como una fila: **hora, alumno, competencia, en qué intento va y
    qué pregunta le toca**. Los huecos vacíos seguidos se resumen en una línea
    —«Sin entrevistas hasta las 10:00 · 8 libres»—, porque cuatro horas son 48
    bloques y lo que hace falta saber es dónde hay un respiro. **Proyectar el
    día** usa ese orden.
  - Una cita **sin pregunta para su intento** sale avisada en la fila, no al
    pulsar «Proyectar» con el alumno delante.
  - **El alumno** ve sus huecos libres, elige competencia y reserva o cancela. Es
    lo único del módulo que ve: ni el banco, ni qué pregunta le tocará, ni la de
    nadie más —los huecos ajenos salen como «ocupado», sin nombre—.
  - Las reglas de la hoja de cálculo dejan de ser un texto en la cabecera y las
    aplica el servidor: **24 horas hábiles de antelación** (el fin de semana no
    corre), **cancelar hasta 5 minutos antes** y **2 oportunidades por
    competencia**. Los huecos que aún no cumplen la antelación se ven apagados y
    con su motivo, en vez de desaparecer: así el rechazo no llega con el clic ya
    dado.
  - El profesor puede agendar por un alumno y cancelar sin margen —para el que no
    se presentó—; el tope de intentos rige para los dos.

- **La proyección se abre en su propia pestaña y se maneja a distancia.** Antes
  era una capa sobre el panel: proyectar significaba tapar la pantalla desde la
  que se trabaja, y con un solo aparato no había forma de enseñarle la pregunta
  al alumno sin enseñarle también el roster.
  - Ahora **Proyectar** abre `/admin/grupos/:id/proyeccion` en otra pestaña, que
    puede vivir en otro aparato —el iPad, el cañón del aula—, y el panel se
    convierte en el **mando**: dice qué hay en pantalla, con su reloj, y lleva
    anterior/siguiente, iniciar, detener y reiniciar. La fila que se está
    proyectando queda marcada en la tabla.
  - Se sincronizan por el servidor y no por el navegador: un `BroadcastChannel`
    habría bastado entre pestañas del mismo Chrome, pero no cruza dispositivos.
  - **Tres estados.** *Por iniciar* y *detenida/finalizada* no enseñan la
    pregunta —solo el nombre, la competencia y cuánto tiempo habrá—; *en curso*
    la enseña con el reloj corriendo. Al llegar a cero la pregunta **se queda
    cinco segundos más** antes de retirarse: que la pantalla cambie de golpe
    mientras el alumno está cerrando la frase se vive como un portazo. Entra y
    sale con un fundido.
  - El reloj **no viaja**: el servidor guarda cuándo se pulsó iniciar y cada
    pantalla calcula lo que queda corrigiendo el desfase de su propio reloj. Así
    entrar a mitad enseña el número correcto y las dos pantallas coinciden.
  - En la pantalla proyectada **no hay controles**, y bajo el nombre va la
    **competencia** que se evalúa —fuera la matrícula y el «3 de 28», que eran
    del profesor y no del alumno—.
  - **La pantalla proyectada escucha en vez de preguntar.** Sondear una vez por
    segundo costaba, en cada vuelta, validar la sesión —con su escritura—,
    comprobar el acceso al grupo y leer la fila, para contestar «no ha cambiado»
    el 99 % de las veces; y al pulsar «Iniciar» el alumno lo veía **hasta 2,6 s
    después**. Ahora abre una conexión (SSE) y el servidor le empuja los
    cambios: se ven **a los 0,6 s del clic**, que es lo que tarda el guardado, y
    el aviso no añade nada. Debajo queda un sondeo cada 20 s como red de
    seguridad.
  - Dos cambios más de los que se benefician también el resto de pantallas: la
    fila de proyección guarda una **foto** de lo que hay en pantalla —resolver
    los punteros hasta la competencia y la colección eran cinco idas y vueltas a
    la base, 310 ms—, y la sesión deja de **reescribirse en cada petición**
    (ahora como mucho cada cinco minutos), lo que quita unos 80 ms a *toda*
    llamada al API.
  - **Las notas se escriben donde se toman.** La nota del intento estaba en una
    columna que solo existía con una competencia elegida: con «todas» no había
    dónde escribirla, y durante la entrevista había que salir a buscarla. Ahora
    el mando lleva su campo —la nota del intento que está en pantalla— y cada
    fila abre las de **todos** los intentos del alumno, con su competencia, su
    número y el enunciado, que es lo que se relee antes de la segunda entrevista.
    El icono de la fila queda marcado cuando hay algo escrito.
  - **El mando contesta al instante.** Cada orden viaja al servidor y de ahí a
    la otra pantalla, y ese viaje se nota: pulsar «Iniciar» y no ver nada
    durante un segundo se lee como que el botón no funciona. Ahora el reloj
    arranca con el clic, el botón dice *Iniciando…* / *Deteniendo…* y la barra
    marca **Enviando…** hasta que el servidor confirma; mientras tanto no admite
    otra orden. Si falla, vuelve a lo que hay guardado.

### Changed
- **Repartir una pregunta se hace desde la propia pregunta, y de una sentada.**
  La vista «Por pregunta» tenía un enlace *Asignar a un alumno…* que abría una
  lista, se cerraba al primer clic y no decía nada más. Ahora cada tarjeta lleva
  **el mismo chip que la vista por alumno**, con la cuenta de a cuántos les ha
  tocado ya —`Asignada a 3 de 26`—, y al pulsarlo la lista se queda abierta:
  cada alumno es un interruptor que se marca al asignársela y la quita si se
  vuelve a pulsar.
  - La cuenta es de **este grupo** y sale del mismo estado que la tabla, así que
    se mueve con el clic y no cuando conteste el servidor. Lo de otros grupos
    en curso pasa a un aviso aparte, que es lo que de verdad avisa de una
    repetición que no se ve desde aquí.
  - No hay tope: una pregunta se repite cuantas veces haga falta. Lo que sí
    limita es el alumno —dos intentos por competencia—, y por eso cada fila
    enseña su `1/2` y quien los agotó queda apagado en vez de escondido.

- **El sidebar del módulo Ejercicios se vuelve el índice de la colección.** Al
  entrar al juez de programación la columna izquierda seguía siendo el menú
  global entero —Calendario, Hub, Alumnos, Equipos, Entrevistas…— mientras el
  enunciado y el editor de código se repartían lo que quedaba. Ahora pasa a ser
  el árbol del módulo: las secciones de la colección con su avance, el filtro de
  lenguaje y el buscador de ejercicios. Es el mismo patrón que ya usaba
  Diagramas, y sigue visible mientras se resuelve, así que ir al siguiente
  ejercicio ya no obliga a volver al listado.
  - El filtro de lenguaje se mueve de la página al árbol porque manda sobre los
    contadores de sección y sobre el avance del topbar: en la página, filtrar
    por Swift dejaba al árbol contando también los de Kotlin.
  - La página se queda con el panel principal: las categorías de la sección
    abierta. Sin bloques definidos se comporta igual que antes, que es la
    garantía que fija `agruparEjercicios.test.ts`.

- **Las etiquetas salen de la interfaz de preguntas.** Eran un segundo eje por
  debajo de la competencia, pensado para matizar lo que esta no distingue, y en
  la práctica no se usaron: casi todas las preguntas del banco no tienen
  ninguna. Se van el campo del formulario, los chips del selector y del roster,
  y la búsqueda por etiqueta —que ahora mira el enunciado y la competencia, que
  es por donde se busca de verdad—.
  - El campo sigue en el modelo y el API lo sigue aceptando: lo que ya estaba
    guardado no se toca, y el guardado solo escribe etiquetas si alguien las
    manda. Se retira la interfaz, no el dato.

- **El banco de preguntas se queda con lo que se usa para elegir.** Se van las
  columnas **Etiquetas** y **Uso**: la primera estaba vacía en casi todas las
  preguntas y la segunda contestaba a algo que ya no se pregunta desde ahí —a
  cuántos alumnos se les puso— y que sigue viéndose donde importa, al asignar.
  - Con la columna se va también su consulta: el listado del banco dejaba de
    ser una lectura simple para recorrer TODAS las asignaciones en cada carga.
- **Contenidos deja la tabla y pasa a tarjetas por materia.** Cada colección
  traía **nueve** botones de acción en una fila, todos iconos sin rótulo y con el
  mismo peso: había que pasar el ratón uno por uno para saber cuál era cuál, y
  «eliminar» se veía igual que «entrar a Preguntas».
  - Las nueve no eran una sola cosa: **siete son destinos** dentro de la materia
    (wiki, páginas, competencias, actividades, ejercicios, diagramas, preguntas)
    y **dos son operaciones** sobre la colección (editar, eliminar). Ahora los
    destinos son botones rotulados en una rejilla de dos columnas dentro de la
    tarjeta, y las operaciones quedan arriba, apagadas y aparte.
  - El icono de cada módulo lleva el color de su familia —contenido, evaluación,
    práctica—, que orienta antes de leer el rótulo.
  - **Buscador** por clave, nombre y slug, que ignora acentos y cruza palabras
    sueltas: «informatica» encuentra TC2007B y «datos artificial» encuentra
    TC3009C. Lo traía la tabla y se habría perdido con ella; con la rejilla
    creciendo hacia abajo hace más falta que antes.
  - Tres tarjetas por fila en el panel, dos por debajo de 1100 px y una en
    móvil.
  - Cada materia puede llevar **categoría**, del **mismo catálogo que los
    grupos** («Móviles», «Gráficas», «IA»). Compartirlo es el punto: la materia
    y sus grupos se reconocen por el mismo color, y cambiarle el color a «IA» los
    repinta todos a la vez. En la tarjeta sale como banda junto a la clave y como
    chip relleno junto al estado —los mismos valores que en la lista de grupos—,
    y el buscador la encuentra: «moviles» trae las materias de móviles.
  - Las categorías se administran desde Contenidos con la **misma ventana** que
    ya usaban los grupos, así que agregar una aquí la deja disponible allí y al
    revés. Su texto lo dice, porque desde cualquiera de las dos se puede
    recolorear o borrar algo que está en uso en la otra sin verlo.
  - Al elegir el color, junto a las ocho muestras hay ahora una novena que abre
    el **selector del sistema** y admite cualquier tono. El servidor nunca
    estuvo limitado a la paleta —valida la forma del hexadecimal, no la lista—,
    así que esto solo abre lo que ya se podía guardar.

- **Un solo catálogo de tipos de actividad.** Había siete tablas paralelas
  —rótulos en el Hub, en la barra de filtros, en el resumen de la semana, en el
  formulario, en la exportación a Excel y en tres pantallas del panel— y se
  habían desincronizado sin que nadie lo notara. El síntoma de las tablas
  paralelas nunca es «falta un rótulo»: es que un tipo desaparece de una pantalla
  y sigue en las demás.
  - Los varios rótulos por tipo se conservan, porque no son redundancia: un
    desplegable explica qué cubre el tipo («Discusión / Resolución de dudas»), un
    filtro habla de conjuntos («Discusiones»), un chip estrecho necesita caber
    («Eval») y el título de una actividad sin nombre tiene que leerse como un
    nombre («Discusión»). Ahora están en columnas de una misma tabla, así que las
    diferencias son deliberadas y no accidentales.
  - Que un tipo no cuente en el resumen de la semana pasa a ser un campo ausente
    y documentado, en vez de un hueco en un mapa.
  - Los colores no se guardan: se derivan de `var(--color-<tipo>)`, que es donde
    el tema claro y el oscuro los redefinen.

- **El calendario solo ofrece filtros de los tipos de actividad que usa.** La
  barra pintaba las nueve píldoras siempre, así que un grupo sin evaluaciones ni
  proyecto veía filtros que únicamente podían vaciarle la pantalla, y que de paso
  le sugerían tipos de actividad que no le corresponden. Ahora se construye con
  los tipos que ese calendario tiene de verdad, en el orden del catálogo — el
  mismo criterio que ya seguía el Hub de materiales.
  - Al quedarse sin tipos (un calendario vacío) desaparecen también el rótulo
    «Filtrar:»; el expandir/colapsar se queda, que no depende de los filtros.
  - Si el último laboratorio se borra mientras se filtra por «Labs», la selección
    se **poda** con la píldora: si no, el filtro seguiría escondiendo cosas sin
    ningún control con el que deshacerlo.

### Fixed
- **El editor de contenidos no dibujaba los diagramas de PlantUML.** Salía «No
  se pudo dibujar el diagrama: PlantUML tardó demasiado en responder» en unos
  paneles mientras el de al lado, con la misma sintaxis, se pintaba bien. No era
  lentitud: el motor es una sola instancia con estado interno compartido y el
  upstream exige serializar los renders («the engine … will silently overwrite
  the previous result»). El editor de ejercicios de diagrama monta hasta ocho
  vistas previas a la vez —código inicial, cada comprobación, cada referencia y
  la trampa— y las lanzaba todas en paralelo. Medido sobre ese ejercicio: en
  paralelo 1 de 8 y 20 s; en cola, 8 de 8 y 0,4 s.
  - El tope de 20 s, además, se armaba al PEDIR el render y no al empezarlo, así
    que el que esperaba detrás de otros tres agotaba su plazo sin haber dibujado
    nada.
- **Los diagramas se dibujaban con la paleta clara fuera del visor del alumno.**
  Los motores meten los colores DENTRO del SVG, así que no hay CSS que los
  rescate. El visor pasaba el tema, pero la vista previa del editor y los tres
  listados que renderizan diagramas del enunciado lo llevaban fijo a claro: los
  rótulos de los canales y todas las flechas de un diagrama de actividad salían
  en `#000000` sobre el panel oscuro. Completa lo que el paso a tokens de los
  CSS (#122) no podía alcanzar.
- **El hover de las tarjetas y filas era ilegible en oscuro.** El `a:hover`
  global fijaba `#1d4ed8`, un azul pensado para el tema claro, que sobre el
  fondo de tarjeta oscuro queda en ~1,6:1. Pasa a un token que se aclara en
  oscuro. Y como esa regla gana en especificidad a las clases de las tarjetas,
  al pasar el ratón se volvían azules y subrayadas enteras —descripción
  incluida—: las filas y tarjetas que son superficies, no enlaces de texto,
  reafirman ahora su color y su ausencia de subrayado.
- **Los dos módulos se enseñaban las secciones del otro.** `BloqueEjercicios` y
  `CategoriaEjercicio` son tablas únicas por colección y las comparten Diagramas
  y el juez de programación, sin ningún campo que diga a cuál pertenecen: cada
  módulo devolvía TODOS los bloques. El árbol del juez listaba
  «Comportamiento», «Estructura», «Arquitectura» e «Interacción» en «0/0», y el
  de Diagramas listaba «Arquitectura MVVM» e «Introducción al lenguaje». Dos
  módulos independientes leyéndose como uno, con secciones que prometían
  ejercicios inexistentes.
  - A falta de ese campo, la pertenencia se deduce de los ejercicios que ya se
    van a devolver: una categoría es del módulo si alguno de sus ejercicios lo
    es, y un bloque si alguna de sus categorías lo es. Sin consultas extra.
  - Un bloque recién creado, aún sin ejercicios publicados, deja de salir en el
    árbol —también para el admin—. Se administran en Contenidos, y el árbol del
    módulo es una vista de consumo; antes ese bloque salía en LOS DOS árboles,
    nunca en el suyo.

- **Ejercicios y Diagramas se leían a medias en tema oscuro.** Los dos módulos
  se escribieron con la paleta clara de GitHub a mano —`#1f2328` de texto,
  `#57606a` de secundario, `#f6f8fa` de fondo— en vez de los tokens del tema, y
  esos valores no cambian al pasar a oscuro. El resultado era texto casi negro
  sobre fondo casi negro: los títulos de los ejercicios sin resolver, los nombres
  de categoría y el botón «Probar casos de muestra» desaparecían, y el enunciado
  del solver se volvía ilegible —incluidos sus bloques de código, que sí tenían
  fondo del tema pero heredaban el texto oscuro—.
  - El ejercicio resuelto, además, se pintaba como una tarjeta **blanca** en
    medio de la lista oscura: su verde de fondo también estaba escrito a mano.
  - Los 111 colores fijos de los cinco archivos pasan a tokens, que es la regla
    que `variables.css` ya enuncia («NUNCA un color escrito a mano»). No hacen
    falta reglas propias de tema oscuro: los tokens ya se redefinen solos.
  - De paso el acento deja de ser un índigo propio del módulo y pasa a
    `--dash-primary`, el mismo que usa el botón primario del panel.

- **El juez de programación abría en blanco.** El editor tumbaba la pantalla
  entera con `Unrecognized extension value in extension set`: había **dos copias
  de `@codemirror/state`** instaladas, y CodeMirror identifica sus extensiones
  contra registros que viven dentro del propio módulo, así que las que creaba
  `@codemirror/view` con una copia no las reconocía el `EditorState` de la otra.
  - La segunda copia la metió el lockfile en el #117: quedaron dos resoluciones
    del mismo paquete (`^6.5.0` → 6.7.1 y el resto → 6.7.0) pudiendo servir una
    sola a todos. En una instalación limpia eso son dos carpetas —una arriba y
    otra anidada bajo `@codemirror/view`—, que es lo que tiene el servidor.
  - **No se reproducía en un checkout viejo**: quien ya tenía `node_modules` de
    antes del #117 seguía con una sola copia. Aparecía al instalar en limpio, que
    es lo que hacen el servidor y cada worktree nuevo.
  - Se unifica el rango que pide `packages/web` y se añade `resolve.dedupe` de la
    familia CodeMirror en Vite: aunque `node_modules` vuelva a duplicarse, el
    bundle se queda con una copia.

- **El resumen de la semana ya cuenta las actividades del plan de evaluación.**
  Las de tipo `actividad` no salían en los chips: una semana entera de
  actividades enseñaba el resumen vacío, como si no trajera trabajo. Era el
  hueco que quedaba en el mapa de rótulos del resumen.

- **La exportación a Excel de la malla ya no escribe «presentacion» en crudo.**
  Ese tipo faltaba en el mapa de rótulos del exportador y la celda salía con la
  clave interna en lugar de «Presentación».

- **Discusiones, Información y Asuetos ya se pueden filtrar en el calendario.**
  Faltaban en la barra desde siempre. El síntoma no era que no hubiera botón: era
  que al filtrar por cualquier otro tipo, las actividades de esos tres se
  atenuaban y no había forma de volver a incluirlas.

### Added
- **Un fallo de render ya no deja la ventana en blanco.** No había ningún
  `ErrorBoundary` en la aplicación, así que cualquier excepción durante el render
  desmontaba el árbol entero de React y dejaba la pantalla vacía, sin mensaje ni
  rastro. Todos los fallos distintos producían el MISMO síntoma, y por eso un
  reporte no podía decir más que «no se ve nada» —costó una tarde localizar así
  el juez de programación—.
  - Ahora sale un aviso con qué falló, el detalle técnico plegado para copiarlo
    en el reporte, y botones de reintentar y recargar.
  - Va **por dentro** de los layouts: el menú y la cabecera siguen ahí, así que
    desde una sección rota se puede ir a otra sin recargar. Navegar reinicia el
    aviso; si el fallo sigue, reaparece solo.
  - Queda una última red envolviendo las rutas, para cuando lo que revienta es el
    propio layout o una pantalla que no vive dentro de ninguno.

- **Módulo «Preguntas»: banco para las entrevistas personales.** El profesor
  guardaba en su cabeza —o en una hoja suelta— qué le iba a preguntar a cada
  alumno, y en una entrevista de treinta personas eso se rompe siempre por el
  mismo sitio: se repite la pregunta, o se le hace a quien no tocaba. Ahora hay
  un banco, una asignación por alumno y una proyección con temporizador.
  - Es un **módulo de contenido opt-in** más, como Ejercicios y Diagramas: el
    banco cuelga de la materia y se enciende por grupo desde Asignaciones. No es
    simetría: la **categoría** de una pregunta es una **competencia**, y las
    competencias son de una colección.
  - La competencia se puede enlazar **aunque sea de otra materia**, y el editor
    la ofrece detrás de un «ver competencias de otras materias». Hoy solo una
    asignatura usa el módulo, pero una competencia transversal puede vivir en
    otra; atarla a la colección cerraría esa puerta sin ganar nada, porque el
    módulo ya está acotado por dónde se enciende. Cuando difieren, la interfaz lo
    señala en ámbar.
  - El **tiempo** no es de cada pregunta: se configura una vez en la materia y el
    grupo puede anularlo —el mismo temario no se entrevista igual en un grupo de
    treinta y cinco que en uno de doce—. Pedírselo al autor pregunta a pregunta
    era pedirle una decisión que siempre tomaba igual.
  - Tampoco hay **título**. Se probó con uno y sobraba: el rótulo con el que se
    reconoce una pregunta en una lista sale del propio enunciado recortado, y
    mantener las dos cosas solo abría la puerta a que dijeran cosas distintas.
  - Las **etiquetas** siguen, como segundo eje por debajo de la competencia:
    matizan lo que esta no distingue —a qué perfil le va bien, de qué parcial es,
    si es dura o de calentamiento—. Los dos filtros se cruzan.
  - **Nada de esto tiene camino de alumno.** No es que esté oculto por permisos:
    es que no existe el endpoint. Las notas del profesor —qué buscar en la
    respuesta, el ajuste para ese alumno— no se pintan ni siquiera en la vista
    que se proyecta, que es justo la pantalla que el alumno mira.
  - **Una pregunta por competencia, alumno e intento.** Cada competencia admite
    hasta **dos entrevistas** —la segunda es la oportunidad de quien no salió
    bien en la primera—, así que cada alumno tiene `competencias × 2` huecos.
    Competencia e intento no son filtros: son el modo de trabajo. Con «todas» se
    ve el mapa del grupo (cuántos huecos lleva cada alumno en cada competencia) y
    al elegir competencia + intento se trabaja en ese hueco concreto. Sin ese
    corte, una tabla con una columna por competencia y por intento no cabría.
  - Al repartir el segundo intento **no se le repite al alumno la pregunta que ya
    tuvo** en el primero, y si se elige a mano el selector lo avisa: la misma
    pregunta dos veces no evalúa nada. Repetirla entre alumnos distintos sigue
    estando permitido.
  - **Repetir una pregunta está permitido**, en el mismo grupo y entre grupos. Se
    probó a impedirlo y la restricción salía carísima: obligaba a tener tantas
    preguntas como alumnos por cada competencia. En su lugar el sistema se limita
    a decir **a cuántos alumnos se la has puesto ya** —en el banco, en el selector
    y en la vista por pregunta—, que es lo que permite variar a propósito en vez
    de por accidente. El conteo mira solo grupos en curso: cerrar el semestre deja
    el banco como nuevo.
  - **Repartir** da una pregunta a cada alumno al que le falte, agotando el banco
    de esa competencia antes de reciclarlo: con más preguntas que alumnos nadie
    repite, y con menos las repeticiones quedan lo más espaciadas posible.
  - Dos vistas, porque el profesor piensa en los dos sentidos: **por alumno** y
    **por pregunta**. La segunda enseña el enunciado entero y de ahí se elige a
    quién le va, que es el orden natural al personalizar; antes obligaba a abrir
    el banco en otra pestaña.
  - El selector de preguntas enseña el **enunciado completo**, filtra por
    competencia y **se queda abierto**: es una lista de interruptores, no un menú
    de un solo uso. Cada alumno lleva hasta dos preguntas por competencia, así
    que cerrarlo en cuanto se pulsa una obligaba a reabrirlo para la segunda y no
    dejaba ver si lo pulsado había entrado. Lo asignado se marca en verde y
    volver a pulsarlo se lo quita. Al llegar al tope de intentos, las demás se
    **apagan** en vez de sustituir a una en silencio: pulsar y que cambie otra
    cosa sin avisar es peor que no poder pulsar. Lo mismo al revés —desde una
    pregunta, el alumno sin intentos libres sale apagado—. Mientras un cambio se guarda, la
    lista no admite clics: dos altas solapadas calculan su hueco con un estado
    que el servidor todavía no ha visto, y lo que queda guardado deja de ser lo
    que se ve.
  - El banco de la materia se **filtra por competencia** (con 145 preguntas la
    tabla sin filtrar no se lee) y marca cuáles llevan sin estrenarse.
  - Asignar y quitar cambian la fila **en el acto** y el servidor solo confirma o
    revierte. Antes se recargaba la tabla entera en cada clic —con la regla de
    unicidad hacía falta, porque asignar cambiaba el estado de las demás
    preguntas—, y el precio se veía: la lista parpadeaba y se perdía el sitio
    donde estabas trabajando. La fila queda marcada mientras se guarda; si algo
    falla, la tabla vuelve exactamente a como estaba.
  - La asignación es un **historial**, no un campo que se sobrescribe: a lo largo
    del semestre hay varias entrevistas, y lo que se le preguntó en la primera es
    justo lo que hay que consultar para no repetírselo en la segunda.
  - La **proyección** es la pregunta a pantalla completa con el reloj arriba a la
    derecha, y se avanza por el grupo con ← →. No tiene diseño propio a
    propósito: sale de los tokens del tema, así que hereda el claro/oscuro que el
    profesor ya tenga puesto. El reloj arranca parado —entre que se proyecta y el
    alumno termina de leer pasan unos segundos que no son suyos—, avisa en ámbar
    en los últimos treinta y se maneja con Espacio, R y Esc.
  - Archivar una pregunta la saca del selector pero no de las entrevistas ya
    puestas: borrarla se rechaza si alguien la tiene asignada, para no dejar
    huecos en el historial.

- **Editor de contenidos: scroll sincronizado y bloque resaltado a los dos
  lados.** Con las dos columnas a la vista había dos scrolls independientes, así
  que comprobar cómo queda un párrafo obligaba a buscarlo a mano en el otro
  panel. Ahora las dos mitades se mueven juntas, el bloque bajo el cursor se
  resalta en la fuente **y** en la vista previa, y un clic en la vista previa
  lleva el cursor a esa línea del Markdown.
  - El anclaje no adivina por el texto: el pipeline puede estampar `data-linea`
    en cada bloque con la línea de la que sale, y de ahí sale una tabla de
    correspondencias. Entre bloque y bloque se **interpola**, para que un párrafo
    largo no dé saltos secos al recorrerlo.
  - El resaltado, además de ubicar, es la forma de ver **dónde el mapeo no cuadra
    del todo** — que es justo para lo que se mira esta vista.
  - `data-linea` es **solo del preview**: lo que se publica se renderiza sin la
    opción, así que el HTML servido a los alumnos no cambia.
  - Se puede apagar con el botón de la barra (solo aparece en la vista de dos
    columnas) y la preferencia se recuerda entre sesiones.

- **Copiar el plan de evaluación de otro grupo.** Armar un plan de cero es
  tedioso y propenso a errores cuando ya hay modelos probados; ahora se replica
  el de otro grupo y se ajusta lo que cambie. Se copian los periodos con sus
  pesos, y se traducen las dos listas de ids, cada una por su motivo:
  - Las **competencias** viven en el catálogo de la materia, así que dos grupos
    de la misma asignatura comparten ids y se copian literales. Si el destino
    evalúa otra materia, se descartan: dejarlas metería competencias que el
    alumno no tiene y el cálculo las omitiría del promedio sin decir nada.
  - Las **actividades** son de cada grupo y **no guardan referencia a su
    plantilla**, así que el único puente es el NOMBRE — la misma identidad que ya
    usa «copiar plantilla» para no estampar dos veces la misma.
  - Copiar hacia un grupo de otra materia **no falla**: deja la forma con las
    listas vacías, que es un punto de partida útil. Lo que sí no puede pasar es
    que algo se caiga en silencio, así que se informa de cuántas competencias y
    actividades no se pudieron traducir.
  - El grupo de origen puede estar **cerrado**: los modelos que uno quiere
    replicar están justamente en los grupos del semestre pasado, y al cerrarlos
    se borran. (Un profesor solo puede copiar de grupos suyos y vivos; el admin,
    de cualquiera.)
  - Sustituye el plan del destino, así que se confirma antes.

- **Nivel «Incipiente B −30 pts»: la sanción por conducta.** No es un nivel de
  logro más. Los otros cinco entran al promedio como porcentaje; este vale **0
  como nivel** —es un Incipiente B— y **además resta 30 puntos directos** a la
  nota del periodo. Se acumula: cada competencia sancionada son otros 30. El
  suelo es 0; nunca hay nota negativa.
  - Los 30 puntos **arrastran a las actividades**, no se quedan en el bloque de
    competencias. Si el daño se limitara a ese bloque, a partir de la segunda
    sanción daría igual tener dos que cinco.
  - Son 30 puntos **del periodo**. Lo que le quitan a la nota final depende del
    peso de ese periodo; en un plan de un solo periodo al 100% —el formato de
    TC2007B, para el que se hizo esto— las dos cosas coinciden.
  - Cuenta **aunque la competencia no esté en la selección del plan**: es una
    sanción por conducta, no la nota de esa competencia, y descartarla por eso
    la dejaría sin efecto sin que nadie se entere.
  - Se guarda como un valor centinela (`-30`), imposible entre los niveles
    reales, para que sea inconfundible mirando la base y para que ningún
    consumidor pueda tomarlo por una nota.
  - **Sin sanciones, la nota es exactamente la de siempre.**
  - Se enciende **por materia** (`Coleccion.permitePenalizacion`) y, dentro de
    ella, competencia por competencia con una casilla explícita: un texto de
    rúbrica en blanco no distingue «no aplica» de «se me olvidó escribirlo». La
    materia manda: una competencia no puede admitir el nivel si su colección no
    lo permite, aunque el payload lo pida.
  - Al **apagarlo en una materia**, sus competencias dejan de ofrecerlo y se
    informa de cuántas se tocaron. Las sanciones ya puestas a un alumno se
    respetan: se asignaron cuando era válido, y borrarlas sería reescribir su
    historial.

- **Cada competencia puede pesar lo suyo en la nota.** Hasta ahora el bloque de
  competencias era un **promedio simple**: todas valían igual. TC2007B califica
  de otra forma —un solo bloque, sin actividades, donde cada competencia aporta
  los puntos que tiene sobre 100— y eso no se podía expresar.
  - `Competencia.puntos` vive en el **catálogo**, por materia, no en el plan del
    grupo: la misma asignatura debe calificar igual en todos sus grupos.
  - El bloque pasa a ser un **promedio ponderado normalizado** por los puntos de
    las competencias que ese periodo evalúa. Lo de normalizar no es un detalle:
    en el formato de TC2005B un periodo evalúa 3 de 9 competencias, y sin
    normalizar ese periodo no podría llegar a 100 ni con todo perfecto.
  - **Sin puntos, la nota no se mueve.** Si ninguna competencia del periodo
    tiene puntos, todas pesan igual y el resultado es idéntico al de siempre —y
    poner el mismo número a todas también. Es la propiedad que hace segura la
    migración: hoy ninguna de las 16 competencias tiene puntos.
  - Una competencia sin puntos **habiendo otras con puntos no cuenta**, ni en el
    numerador ni en el denominador. El cálculo lo reporta (`competenciasSinPuntos`)
    para poder decirlo en pantalla en vez de descontarlo en silencio, y el
    formulario avisa antes.
  - El XLSX de la malla gana la columna **Puntos**, junto al nivel.

### Fixed
- **«Crear mallas» no funcionaba.** La columna `valorPeriodo1` es numérica en la
  base, y la creación guardaba la cadena `'0'`: Parse rechazaba el lote entero
  con un *schema mismatch* que salía como un «Error al crear competencias de
  alumnos» sin más pistas. Por eso los 133 alumnos de este semestre estaban a
  cero mallas. También se arregla el camino de vuelta: «Sin evaluar» ahora
  **quita** el campo en vez de guardar `''`, que en una columna numérica es el
  mismo error.

### Added
- **La sanción «Incipiente B −30 pts» ya se puede asignar.**
  - Desde la **malla**, solo en las competencias que la admiten, y pidiendo el
    motivo por delante: resta 30 puntos de golpe y es lo primero que un alumno
    va a reclamar. El servidor la rechaza igualmente sin retroalimentación —no
    se fía de que el cliente pinte o no la opción— y la registra en la bitácora.
  - Desde las **entrevistas**: al liberarlas, la sanción llega a la malla como
    cualquier otro nivel.
  - El alumno la **ve en su rúbrica**, con el texto de esa competencia, y solo
    en las que la admiten: en las demás sería una amenaza que no existe.
  - La malla explica **de dónde viene la caída** (`− 30 pts por 1 competencia en
    Incipiente B −30 pts (50.0 → 20.0)`). Sin esa línea el desglose no cuadra:
    quien suma los dos factores obtiene otro número.
  - En el **XLSX** tiene etiqueta y color propios, distintos del Incipiente B
    normal, y la leyenda aclara que no es un porcentaje.
  - Las **competencias calculadas** no la heredan: para su mínimo vale 0. Si se
    propagara, el alumno perdería 60 puntos por una sola falta.

### Added
- **Nivel «Incipiente B −30 pts»: la sanción por conducta.** No es un nivel de
  logro más. Los otros cinco entran al promedio como porcentaje; este vale **0
  como nivel** —es un Incipiente B— y **además resta 30 puntos directos** a la
  nota del periodo. Se acumula: cada competencia sancionada son otros 30. El
  suelo es 0; nunca hay nota negativa.
  - Los 30 puntos **arrastran a las actividades**, no se quedan en el bloque de
    competencias. Si el daño se limitara a ese bloque, a partir de la segunda
    sanción daría igual tener dos que cinco.
  - Son 30 puntos **del periodo**. Lo que le quitan a la nota final depende del
    peso de ese periodo; en un plan de un solo periodo al 100% —el formato de
    TC2007B, para el que se hizo esto— las dos cosas coinciden.
  - Cuenta **aunque la competencia no esté en la selección del plan**: es una
    sanción por conducta, no la nota de esa competencia, y descartarla por eso
    la dejaría sin efecto sin que nadie se entere.
  - Se guarda como un valor centinela (`-30`), imposible entre los niveles
    reales, para que sea inconfundible mirando la base y para que ningún
    consumidor pueda tomarlo por una nota.
  - **Sin sanciones, la nota es exactamente la de siempre.**
  - Se enciende **por materia** (`Coleccion.permitePenalizacion`) y, dentro de
    ella, competencia por competencia con una casilla explícita: un texto de
    rúbrica en blanco no distingue «no aplica» de «se me olvidó escribirlo». La
    materia manda: una competencia no puede admitir el nivel si su colección no
    lo permite, aunque el payload lo pida.
  - Al **apagarlo en una materia**, sus competencias dejan de ofrecerlo y se
    informa de cuántas se tocaron. Las sanciones ya puestas a un alumno se
    respetan: se asignaron cuando era válido, y borrarlas sería reescribir su
    historial.

### Added
- **Cada competencia puede pesar lo suyo en la nota.** Hasta ahora el bloque de
  competencias era un **promedio simple**: todas valían igual. TC2007B califica
  de otra forma —un solo bloque, sin actividades, donde cada competencia aporta
  los puntos que tiene sobre 100— y eso no se podía expresar.
  - `Competencia.puntos` vive en el **catálogo**, por materia, no en el plan del
    grupo: la misma asignatura debe calificar igual en todos sus grupos.
  - El bloque pasa a ser un **promedio ponderado normalizado** por los puntos de
    las competencias que ese periodo evalúa. Lo de normalizar no es un detalle:
    en el formato de TC2005B un periodo evalúa 3 de 9 competencias, y sin
    normalizar ese periodo no podría llegar a 100 ni con todo perfecto.
  - **Sin puntos, la nota no se mueve.** Si ninguna competencia del periodo
    tiene puntos, todas pesan igual y el resultado es idéntico al de siempre —y
    poner el mismo número a todas también. Es la propiedad que hace segura la
    migración: hoy ninguna de las 16 competencias tiene puntos.
  - Una competencia sin puntos **habiendo otras con puntos no cuenta**, ni en el
    numerador ni en el denominador. El cálculo lo reporta (`competenciasSinPuntos`)
    para poder decirlo en pantalla en vez de descontarlo en silencio, y el
    formulario avisa antes.
  - El XLSX de la malla gana la columna **Puntos**, junto al nivel.

### Fixed
- **Un grupo evalúa las competencias de una sola materia.** Un grupo puede tener
  varias colecciones asignadas —así el alumno llega al wiki de varias materias—,
  pero la malla es UNA lista. Con dos colecciones aportando competencias, a cada
  alumno le nacían las de las dos asignaturas mezcladas, y el módulo
  `competencias` nace ENCENDIDO: bastaba con asignar una segunda colección, sin
  tocar ningún ajuste, para quedar en ese estado. Es el caso real de los grupos
  de TC2007B, que tienen asignadas TC2007B y TC2005B.
  - El servidor rechaza guardar una asignación con dos colecciones aportando
    competencias, y lo explica.
  - El modal no deja llegar ahí: encender Competencias en una colección la apaga
    en las demás, y asignar una nueva no la enciende si ya hay otra que las
    aporta. Con dos colecciones o más, se avisa antes de que pase.
  - Se comprueba al CONFIGURAR y no al crear la malla: ahí el error llegaría
    tarde y disfrazado de «aparecieron competencias de otra materia».

### Fixed
- **El alumno nuevo ya no se queda mirando un menú gris sin saber qué hacer.**
  Reportado por los propios alumnos. Hasta que rellenan el perfil del grupo, el
  menú les deja bloqueados Malla, Competencias, Wiki, Ejercicios y Agendar
  entrevistas; pero al entrar aterrizaban en el **calendario**, que es de lo
  poco que no se bloquea y que no menciona el asunto por ninguna parte. Lo
  bloqueado tampoco lo contaba: eran `div`s con `pointer-events: none`, así que
  su explicación —un `title`— no llegaba a salir **nunca**, ni pasando el ratón.
  Pasa igual a quien ya llevaba tiempo en la plataforma y entra a un grupo
  NUEVO: el perfil es por grupo y vuelve a estar incompleto justo cuando ya no
  espera tener que rellenar nada.
  - Con el perfil a medias, entrar lleva al **panel**, que es donde está el
    formulario (y que ya se abre en modo edición solo).
  - En el calendario y en el Hub —las dos secciones que no se bloquean— sale un
    aviso que nombra lo que está cerrado, dice que se rellena una sola vez por
    grupo y lleva al panel de un clic.
  - Los ítems bloqueados llevan un **candado** en vez de solo estar atenuados, y
    su tooltip funciona y dice dónde se desbloquean.
  - El grupo con el que se decide es el mismo con el que se le reabre la sesión
    (el último que tenía abierto), no el primero de la lista: si no, el menú
    diría un grupo y la página estaría enseñando otro.
- **Las dos puertas de entrada devuelven los mismos datos de sesión.** Entrar
  con contraseña —que es como entran los alumnos— construía su propia lista de
  grupos y se quedaba en `{id, name}`: sin el color del selector, sin la URL de
  la agenda y, para el profesor, **sin grupos**, así que acababa en el panel
  global en vez de en su grupo. Ahora las dos salen del mismo sitio.

### Added
- **Copiar el enlace público de una página desde el árbol.** Junto al botón del
  slug —que es de donde sale la URL— hay otro que copia la dirección completa
  en `groups.meeplab.com`, con toda la ruta de carpetas, para abrir la página
  tal como la ve el alumno o pasársela a alguien. Antes había que recomponerla
  a mano juntando el slug de la colección con el de cada carpeta.
  - Solo en páginas: una carpeta no tiene dirección propia en el wiki —en el
    visor solo abre y cierra—, así que copiarla daría un enlace roto.
  - El dominio es fijo a propósito: en desarrollo, `location.origin` sería
    `localhost` y el enlace copiado no le serviría a nadie.
- **El árbol de contenidos se puede reorganizar sin ratón.** Mover era
  exclusivamente un arrastre: quien no usa ratón —o simplemente no puede
  arrastrar con precisión— no tenía forma ninguna de cambiar el orden ni la
  jerarquía. Con el foco en una fila (con el tabulador): **Espacio** la coge,
  **↑↓** la ordenan, **→** la mete en la carpeta de arriba, **←** la saca,
  **Espacio** la suelta y **Escape** cancela. El paso horizontal es literalmente
  el mismo desplazamiento que haría el ratón, así que decide el mismo destino y
  la carpeta que va a recibirla se resalta igual.
  - **Enter abre la página.** La fila es un `div` con `role="button"` y el
    navegador no le dispara el clic al pulsar Enter: hasta ahora solo se podía
    abrir con el ratón.
  - Lo que pasa durante el movimiento se **anuncia en español** (a dónde caería,
    dónde acabó, si se canceló). Las dos únicas señales que había —el resaltado
    de la carpeta y la sangría— son visuales, así que moverlo con el teclado
    habría sido moverlo a ciegas.
  - La pista del árbol dice ahora también el atajo: un atajo que no se anuncia
    no existe.

### Changed
- **El editor dice qué versión estás editando.** Siempre se escribe en el
  borrador —ver o restaurar una versión antigua nunca muta el pasado—, pero eso
  no se decía en ninguna parte: después de restaurar, el editor volvía a verse
  exactamente igual que antes y no había forma de saber si lo que se escribía a
  continuación caía sobre la versión vieja, sobre la publicada o sobre otra
  cosa. Ahora la cabecera lo dice junto al estado de guardado:
  - `v3 publicada · sin cambios` cuando el borrador coincide con lo publicado, y
    `v3 publicada · con cambios` —en ámbar— cuando hay algo que los alumnos aún
    no ven. El número va primero porque la cabecera recorta por la derecha y
    «v3» es justo el dato que no puede perderse; la frase completa vive en el
    `title`.
  - Al restaurar aparece qué pasó (`El borrador ahora tiene el contenido de la
    v1. Publica para que los alumnos lo vean.`), descartable al pulsarlo.
  - La vista de una versión antigua se marca como **solo lectura**, que es lo
    que siempre fue.
- **La cabecera del editor de contenidos se queda solo con lo suyo.** Tenía tres
  cosas que no le pertenecían y le comían el ancho al nombre de la colección:
  - **Ejercicios** y **Diagramas** se leían como parte de la navegación del
    editor, pero llevan a catálogos distintos y sacaban de él sin avisar. Se
    sigue llegando a ambos desde la lista de Contenidos, que es donde cuelgan de
    su colección.
  - **«← Contenidos»** era una segunda salida al mismo sitio a dos centímetros
    de la que ya tiene el sidebar arriba del todo.
- **El árbol explica cómo se mueve.** Arrastrar para reordenar y para cambiar de
  nivel ya funcionaba —también para meter algo en una carpeta VACÍA—, pero es un
  gesto invisible y no había dónde descubrirlo: la única nota vivía en el panel
  de la derecha, que desaparece en cuanto se abre una página. Ahora el aviso está
  junto al árbol, donde se usa.
    Va en una línea y apagado, con el mismo peso que los atajos del editor
    (`⌘S guardar · ⌘⇧P publicar`): es una ayuda para no adivinar, no un cartel.
    La frase completa vive en su `title`.
  - **La carpeta que va a recibir lo arrastrado se resalta** mientras dura el
    gesto. La proyección ya sabía a dónde iba a caer, pero solo lo decía
    moviendo la sangría del elemento arrastrado 14 px, y nadie mira eso mientras
    arrastra: se acababa soltando encima o debajo de la carpeta en vez de
    dentro. El anillo va por dentro para no empujar las filas vecinas justo
    cuando se está apuntando.
  - Se añaden pruebas de `proyectar`, que es quien decide a qué carpeta cae lo
    arrastrado: meter en una carpeta vacía, sacar de una carpeta, no poder
    anidar bajo una página, y no dejar huérfano al de abajo.

### Added
- **Hub: todo el material del curso en una lista, para reencontrarlo.** El
  calendario responde «¿qué toca esta semana?»; con el semestre avanzado, la
  pregunta que se hace el alumno es la contraria —«¿dónde estaba aquel
  laboratorio?»— y eso obliga a rebuscar semana por semana.
  - Nueva entrada **Hub** en el menú del alumno, junto al Calendario, con la
    lista en el **orden del calendario** y una columna con la **semana y la
    fecha exacta** de cada material: es la referencia temporal que se pierde al
    aplanar. La fecha se deduce del día de la semana, porque el calendario la
    guarda por SEMANA y no por actividad.
  - Cada material enlaza **de vuelta al calendario**, que se abre en su semana y
    **lo señala con un realce ámbar que parpadea y se desvanece solo**
    (`?semana=<n>&actividad=<id>`). Llevar a la semana no basta: una semana
    cargada tiene veinte cosas y hay que volver a buscar la que se venía a ver.
    - El anillo va **hacia dentro**: la actividad se pinta dentro de un
      contenedor con `overflow: hidden` —el que revela los botones de editar y
      borrar— y uno hacia fuera se recortaba entero.
    - **Ámbar y no el azul del panel**, que es el color de los enlaces y del tipo
      «lab»: se confundía con el contenido en vez de destacar sobre él.
  - **Buscador** por nombre, descripción y texto de los enlaces —el título de un
    laboratorio no siempre trae la palabra que uno recuerda— y **filtros por
    tipo**, que solo ofrecen los tipos que ese grupo tiene: proponer
    «Evaluación» donde no hay ninguna es prometer un filtro que sale vacío.
  - **Solo entra lo que se puede abrir** (enlace, adjunto o enlaces extra). Un
    receso o un aviso sin enlace es calendario, no material: en una lista para
    reencontrar cosas, una fila que no lleva a ningún sitio es ruido.
  - Es **solo consulta**: no se crea, ni se edita, ni se borra. La gobernanza
    sigue siendo del calendario, y dos sitios donde se toca lo mismo acabarían
    en dos verdades.
  - **También en el menú del grupo para el staff**, con la misma vista: sirve
    para comprobar qué material les está llegando a los alumnos, sin tener que
    entrar como uno de ellos.
  - Sin API nueva: se lee el mismo calendario del grupo, con el mismo control de
    acceso, y la lista se deriva en el cliente.
- **Crear páginas y carpetas desde el propio árbol, como en un explorador de
  archivos.** Ya se podían crear —con el botón «+ Página / Categoría»—, pero
  desde un modal donde el destino se elegía en un desplegable de «Ubicación»: no
  se veía dónde iba a caer, y la carpeta como concepto quedaba escondida detrás
  de la palabra «Categoría».
  - Cada carpeta muestra al pasar el cursor **«nueva página aquí»** y **«nueva
    carpeta aquí»**, y crea dentro de ella. Una página no los muestra: no puede
    tener hijos, y el servidor lo rechaza.
  - Aparece una **fila con su campo de nombre en el sitio exacto** donde va a
    quedar, con la sangría de su nivel. Enter confirma, Escape cancela y salir
    del campo también — el mismo gesto que el renombrado que ya existía.
  - La cabecera del árbol lleva los dos botones para crear en la **raíz**. Van
    siempre visibles porque son la única puerta de entrada cuando la colección
    está vacía, que antes era un callejón sin salida: el mensaje decía que no
    había páginas y no ofrecía crear ninguna.
  - Al crear dentro de una carpeta cerrada, se despliega sola; si no, lo recién
    creado nacía escondido y parecía que no había pasado nada.
  - El slug se deriva del nombre, como en el alta por formulario.

### Fixed
- **Los diálogos de confirmación se veían en blanco en tema oscuro.** El título
  y el cuerpo sí usaban tokens, pero el fondo lo pinta SweetAlert2 con su propio
  blanco: quedaba texto gris claro sobre blanco, casi ilegible. Ahora el popup,
  su campo de texto y el recuadro de aviso salen del tema. Se coló en la
  revisión del modo oscuro porque no llegué a abrir ningún diálogo.

### Added
- **Modo oscuro en todo el sitio, no solo en el wiki.** Hasta ahora solo el visor
  de contenidos tenía tema oscuro, con su propio interruptor y su propia
  preferencia guardada aparte.
  - **Tres opciones: claro, oscuro y automático**, en el menú de usuario, encima
    de «Cerrar sesión». En automático sigue al sistema operativo y cambia con él
    mientras dure la sesión.
  - **La preferencia vive en el usuario**, así que le sigue entre el portátil y
    el laboratorio. El navegador guarda una copia, pero solo para pintar el tema
    correcto antes de saber quién eres: sin ella la página aparece en blanco y
    salta a oscuro un instante después.
  - **El tema lo resuelve el código, no la hoja de estilos.** No hay ninguna
    `@media (prefers-color-scheme)`: si la hubiera, elegir «claro» a mano no
    podría ganarle al sistema.
  - **El interruptor del wiki sigue ahí** como atajo, pero ya cambia el tema
    global en vez de tener el suyo. Antes eran dos ajustes peleándose por la
    misma pantalla.
  - El contenido renderizado del wiki cuelga ahora del tema global, así que la
    vista previa del editor también se ve en oscuro; antes se quedaba en claro
    con el resto del sitio oscuro.

### Changed
- **Los colores del sitio pasan a ser tokens.** Había 813 colores escritos a mano
  repartidos en 79 hojas de estilo, y un tema oscuro no puede existir mientras
  cada pantalla decida su propio blanco.
  - Se convirtieron ~470 declaraciones de fondo, texto y borde. Lo que queda
    escrito a mano son acentos sólidos y velos negros translúcidos, que ya
    funcionan igual en los dos temas.
  - Se añaden **tokens de estado** (`--estado-error-*`, `--estado-aviso-*`,
    `--estado-exito-*`, `--estado-info-*`) donde antes había una docena de
    tintes distintos para decir lo mismo. En claro son pasteles; en oscuro, el
    mismo matiz translúcido sobre el fondo, que es lo que evita el deslumbre.
  - Los `var(--token, #respaldo)` pierden el respaldo: el token está definido en
    los dos temas y dejarlo invitaba a editarlo creyendo que servía de algo.

### Added
- **Acceso individual a una wiki, para el alumno cuyo grupo no se la da.** Hasta
  ahora el contenido colgaba solo del grupo: si una alumna necesitaba los
  laboratorios de TC2005B y su grupo no tenía esa colección, no había forma de
  dársela sin meterla en un grupo que no le corresponde.
  - **Nueva pantalla «Alumnos»**, debajo de Grupos: el padrón entero del sistema,
    con búsqueda y paginación resueltas en el servidor. Es el único listado de
    alumnos que no cuelga de un grupo.
  - **Es exclusivo del wiki.** No abre competencias, ni actividades, ni
    ejercicios, ni diagramas: esos siguen colgando del grupo y solo del grupo.
  - **Suma, nunca resta.** Se acumula con lo que dan sus grupos y no lo duplica;
    si el alumno pierde el grupo que le daba esa colección, la conserva por el
    permiso; y si entra a un grupo que ya la tiene, la sigue viendo una vez. En
    la pantalla, lo que ya viene del grupo sale marcado y no se puede tocar.
  - **No salta la publicación**: una colección en borrador no se ve ni con
    permiso. El permiso sustituye a «pertenece a un grupo con este contenido», no
    a «este contenido está listo para leerse».
  - Queda registrado **quién lo otorgó y cuándo**, y se muestra al lado de cada
    acceso.
  - Se guarda el conjunto entero de colecciones, no altas y bajas sueltas, así
    que dos pestañas abiertas a la vez no dejan los permisos a medias. Revocar
    da de baja el permiso en vez de borrarlo: volver a otorgarlo lo reactiva y
    conserva el rastro original.
  - **Ojo con el login**: el permiso no habilita a entrar al sistema. Un alumno
    sin ningún grupo activo sigue sin poder iniciar sesión, y entonces el
    permiso no le sirve de nada.

### Fixed
- **Los tests de IDOR vuelven a comprobar lo que dicen comprobar.** Sus seis
  casos llevaban tiempo en rojo y, lo importante, ya no verificaban nada: el
  grupo de prueba no tenía colección asignada, y desde que los endpoints del
  alumno exigen que el módulo esté encendido en alguna, respondían 404 **antes**
  de llegar a la comprobación de propiedad. El 403 esperado nunca se ejercitaba.
  - El fixture crea ahora una colección para el grupo, sin publicar (el gate solo
    mira que exista) y se destruye al terminar, como el resto de datos de prueba.
  - Un grupo reaprovechado de una corrida que no llegó a limpiar se normaliza en
    vez de darse por bueno: podía venir sin colección o bloqueado.
  - **No había ningún agujero de seguridad**: el 404 negaba el acceso igual. Lo
    que fallaba era la prueba, que pasaba por el camino equivocado.
- **Un test de integración dejó de fallar por tiempo agotado.** Cada caso hace
  una petición HTTP real contra un Mongo remoto y ronda los 3-4 s, así que el
  límite de 5 s de vitest no daba margen. Se sube solo en ese fichero: hacerlo en
  la configuración global taparía la lentitud de los tests unitarios.

### Added
- **Categorías de grupo con color, para distinguir de un vistazo grupos que se
  llaman casi igual.** Nace de un error real: dos alumnos acabaron en
  «AgoDic26 TC2008B 101» cuando iban al 102. Los dos nombres comparten 17 de sus
  20 caracteres, y en una lista —o dentro del modal de alta, donde el nombre del
  grupo ni siquiera se veía— se leen igual.
  - **Catálogo administrable** (`CategoriaGrupo`) con nombre y color: «Móviles»,
    «Gráficas», «IA», «6to»… Es dinámico porque cambia cada semestre con lo que
    se asigne. Se gestiona desde el botón «Administrar categorías» de Grupos.
  - **El color vive en la categoría, no en el grupo**: hay una sola fuente de
    verdad y recolorear «IA» repinta todos sus grupos de golpe. El nombre no se
    puede repetir (ignorando mayúsculas y espacios de sobra) y el color solo
    admite hexadecimal, porque acaba en un atributo `style` del cliente.
  - **La sección del nombre se pinta destacada y aparte** (`AgoDic26 TC2008B`
    ⟦101⟧). Es la otra mitad del problema: dos secciones de la misma materia
    comparten categoría, y por tanto color, así que el color solo no las separa.
  - **El selector de grupo deja de ser un `<select>` nativo** —dentro de un
    `<option>` no se puede pintar ni el color ni la insignia— y pasa a un
    listbox propio, en el sidebar del alumno y en el del profesor.
  - **El modal de «Agregar alumno» dice a qué grupo va**, sin poder cambiarlo:
    solo para corroborar antes de dar de alta.
  - **Filtro por categoría** en la lista de grupos, y el **nombre desempata el
    orden** cuando la fecha de inicio coincide: los grupos de un mismo semestre
    salían en orden arbitrario, con el 101 debajo del 102.
  - Borrar una categoría en uso se rechaza y se dice qué grupos la tienen, en
    vez de dejarlos apuntando a un pointer muerto.
  - **El catálogo se ordena arrastrando**, y ese orden manda en el desplegable
    del grupo, en los chips de filtro y en el propio catálogo. Las categorías
    nuevas entran al final, para no colarse en medio de un orden puesto a mano.
    - También se reordena **con el teclado**: enfocar el asa, espacio y flechas.
      Dejarlo solo al ratón excluye a quien no lo usa.
    - El servidor recibe la lista COMPLETA de ids, no un «mueve este de la 3 a
      la 1»: así la operación es idempotente y dos pestañas arrastrando a la vez
      no dejan el orden a medias. Una lista parcial, con repetidos o con un id
      desconocido se rechaza entera.
    - En pantalla el orden se aplica antes de que conteste el servidor; si la
      petición falla, se deshace y se dice por qué.

### Changed
- **Las acciones de una fila dejan de quedarse al otro lado del scroll.** En las
  tablas anchas —Grupos es la peor— había que arrastrar la barra horizontal
  hasta el final solo para pulsar «Editar», y por el camino se perdía de vista
  de qué fila se trataba.
  - **La columna de acciones se ancla a la derecha** (`position: sticky`) en
    todas las tablas de administración: el scroll mueve el resto y ella se
    queda, con una sombra que insinúa que hay más columnas detrás.
  - **Los iconos siguen todos a la vista**, sin menú de por medio: son las
    operaciones del día a día y esconderlas cuesta un clic en cada una. El ancho
    que ocupan ya no empuja nada fuera de la pantalla, que era el problema.
  - Cada botón gana un `aria-label` con el nombre de su fila («Editar AgoDic26
    TC2008B 101»). Antes su único contenido era la ligadura de Material Icons,
    que se anuncia como «edit» y repetida en todas las filas.
  - En móvil, donde la tabla ya se convierte en tarjetas apiladas, el anclaje se
    desactiva: sacaría la celda de su tarjeta.
- **La lista de grupos cabe en menos ancho.** Las dos columnas de fecha se
  fusionan en un «Periodo» que comparte el año cuando ambas caen en el mismo
  («10 ago – 23 oct 2026»); «Administradores» muestra el primero y un contador,
  con la lista completa en el `title`; y se habilita el menú «Columnas», que ya
  existía en la tabla pero esta pantalla no activaba, para apagar las que no se
  miren (la elección se recuerda).
  - Las búsquedas siguen encontrando por lo que NO se ve: los accessors
    conservan la lista completa de administradores y la fecha en ISO.

### Fixed
- **Las listas del wiki vuelven a tener viñeta, número y sangría.** El reset de
  `globals.css` quita la marca a toda la aplicación (`ul, ol { list-style: none }`),
  que es lo que quieren los menús, y la hoja del contenido renderizado nunca la
  devolvía: un `- punto` del Markdown salía como una línea suelta, una lista
  numerada perdía hasta los números y los niveles anidados se veían igual que
  los de primer nivel. Los labs ya lo resolvían en su `.instruccionesHtml`; ahora
  `.contenido-render` hace lo mismo, así que aplica al visor y al preview del
  editor por igual.
  - Cubre también los casos que se rompen solos: listas «sueltas» (con línea en
    blanco entre puntos, donde remark envuelve cada uno en `<p>`) y las casillas
    de GFM, que se alinean con su checkbox pero conservan la sangría de sus
    subtareas.
- **Un grupo bloqueado (`active: false`) deja de dar acceso a sus alumnos.** El
  bloqueo solo se respetaba en el CMS: el resto de caminos miraba únicamente si
  el grupo existía, así que el alumno seguía viéndolo en su selector, entrando a
  sus secciones y abriendo su calendario —que además era público— como si nada.
  Ahora un grupo bloqueado es, para el alumno, un grupo que no existe.
  - La regla se concentra en `grupoDaAccesoAlumno` y la usan todos los caminos
    del alumno (selector, login, secciones de `/alumno/grupos/:grupoId`, módulos
    de contenido y adjuntos de las presentaciones). Estaba copiada en cada uno, y
    bastaba con que a uno se le olvidara para que el bloqueo no sirviera.
  - **El staff conserva el acceso**: bloquear cierra la puerta a la clase, no al
    profesor que necesita su material del semestre pasado. Por eso el calendario
    de un grupo bloqueado deja de ser público pero sigue abriéndose —y
    editándose— con sesión de staff.
  - **A quien solo le quedan grupos bloqueados no se le deja entrar**, igual que
    al alumno sin grupos: el login ya no cuenta los grupos bloqueados.
  - **Si el alumno tenía ese grupo abierto, al recargar salta al primero
    disponible.** La lista se recalcula en cada arranque (`/auth/me`), y si la
    URL se quedó apuntando al grupo bloqueado se le redirige a la misma sección
    del grupo nuevo con `replace`, para que el botón de atrás no lo devuelva a
    una pantalla que responde 403 a todo.

### Added
- **Nuevo tipo de actividad «Presentación»**, que apunta a una URL **o** a un
  archivo subido desde el propio modal. Un `.html` autocontenido se abre en una
  pestaña; cualquier otro formato (PDF, PPTX…) lo descarga el navegador. Hasta
  50 MB.
  - **El HTML se sirve con `Content-Security-Policy: sandbox`**, que lo mete en
    un origen opaco. El CMS ya había descartado servir HTML inline por ser XSS
    en el origen del sitio (`recursos.controller.ts`); el sandbox es lo que
    permite abrirlo sin reabrir ese agujero: la presentación se ve y su JS
    corre, pero no puede leer la cookie de sesión ni llamar al API en nombre de
    quien la abre.
  - **El archivo solo lo abre quien pertenece al grupo** (alumno con inscripción
    activa, profesor del grupo o admin), aunque el calendario en sí siga siendo
    público. A quien no pertenece se le responde 404, no 403: así tampoco
    averigua si el archivo existe.
  - El enlace funciona como navegación normal del navegador porque la sesión
    viaja también en cookie; no hizo falta meter el token en la URL.
- **Los días con clase de cada semana se eligen a mano, de lunes a viernes.** El
  calendario daba por hecho que toda semana era lunes–jueves: el rango estaba
  cableado en el modelo, en la API y en la retícula, así que un grupo que ve
  clase martes y viernes no tenía dónde ponerla. Ahora la semana guarda sus
  `diasActivos` y el alta/edición de semana los marca con chips (Lu Ma Mi Ju Vi),
  de modo que combinaciones como lu-mi-ju-vi o lu-ma-mi-ju son válidas y la
  retícula dibuja tantas columnas como días tenga.
  - **Se pueden editar las semanas ya creadas** (botón de lápiz en la cabecera):
    antes solo se podía crear o borrar, y borrar exige que la semana esté vacía,
    así que cambiar los días de un calendario en marcha era imposible.
  - Quitar un día que ya tiene actividades queda bloqueado en el formulario y
    rechazado por la API: las actividades quedarían fuera del calendario sin
    forma de recuperarlas. Un día con contenido se sigue mostrando aunque no
    esté marcado.
  - Las semanas anteriores al campo conservan lunes–jueves. No se deduce del
    rango de fechas a propósito: hay semanas viejas con un `fechaFin` que se pasa
    del jueves y ampliarlas solas cambiaría calendarios que nadie tocó. Como el
    rango de la cabecera ahora sale de los días con clase, esas semanas muestran
    «10 al 13 de agosto» en vez del `fechaFin` desfasado.
- **El importador de Docusaurus admite material de clase**, no solo imágenes y
  PDFs: `.py`, `.ipynb`, `.pptx`/`.pptm`/`.ppt`, `.docx`, `.xlsx`, `.txt` y
  `.json`. Antes, una página que enlazara un `.py` o una presentación se
  importaba con el enlace apuntando a la ruta del sitio viejo, y el alumno se
  encontraba un 404 sin que nada lo avisara — solo aparecía como «extensión no
  manejada» en el reporte.
- **La malla y las competencias del alumno respetan los módulos de su grupo.** El
  menú metía «Malla» y «Competencias» SIEMPRE, sin mirar las asignaciones: con el
  módulo apagado el alumno veía la sección igualmente y entraba a una pantalla
  vacía. Ahora el ítem desaparece, y sus endpoints responden 404 en vez de
  servir datos de un módulo que el grupo no comparte — esconder el enlace sin
  cerrar la puerta habría sido cosmético.
  - **Un grupo que no usa la malla tampoco enseña la «Calificación Acumulada»**
    en el panel del alumno: un 0.0 sobre 100 en un curso que no la evalúa así
    solo confunde. El panel distingue «este grupo no usa malla» de «falló la
    carga», que antes se veían igual.
  - No hace falta un interruptor nuevo: el módulo **Actividades** ya era la
    fuente de la malla (`ActividadEvaluacion` → `ActividadEvaluacionGrupo` →
    `ActividadEvaluacionAlumno`). Se renombra a **«Actividades y malla»** en el
    modal de asignaciones para que se entienda sin conocer el modelo de datos.
- **El alumno ve siempre en qué grupo está.** El selector de grupo del menú solo
  aparecía con dos o más grupos, así que quien está en uno —lo normal— no leía el
  nombre por ningún lado. Ahora sale igualmente, deshabilitado cuando no hay nada
  que elegir, en vez de desaparecer.
- **Solo se exige cambiar la contraseña a quien nunca ha elegido una.** Marca
  nueva en el usuario, `AppUser.passwordAsignada`: se pone al crear el alumno
  (alta manual o import CSV, donde la contraseña la genera el sistema) y se
  levanta en cuanto la persona elige la suya.
  - Antes esto se deducía de `GrupoAlumno.perfilCompleto`, que es POR GRUPO, y
    fallaba por los dos lados: a un alumno con contraseña propia que entraba a un
    grupo nuevo se le volvía a exigir cambiarla, y a uno con la contraseña de
    fábrica en un grupo cuyo perfil ya había rellenado no se le exigía nunca.
  - Al que la tiene de fábrica se le dice por qué («la conocen otras personas»);
    al que ya tiene la suya se le ofrece cambiarla dejando claro que no hace falta.
  - Ausente = la eligió la persona. Es el default a propósito: los usuarios
    anteriores a esta marca no se molestan.
- **Cada grupo decide qué campos del perfil pide a sus alumnos.** En «Editar
  Grupo» hay una sección nueva, *Perfil que se pide al alumno*, con una casilla
  por campo opcional. De momento solo uno: **Repositorio individual**, porque no
  todos los cursos trabajan con repositorio propio.
  - Desmarcarlo hace dos cosas a la vez: el campo **desaparece** del formulario
    del alumno y **sale de la regla** que marca el perfil como completo. Es lo
    importante: mientras el perfil está incompleto, el alumno tiene en gris
    Malla, Competencias, Documentación, Ejercicios y Agendar Entrevistas, así que
    un campo que no puede rellenar le bloquea el panel entero.
  - Experiencia, expectativas y compromiso se piden **siempre**: son el
    compromiso mínimo con el alumno y no se pueden apagar. El servidor rechaza
    con 400 cualquier intento de desactivar uno de ellos, y la comprobación
    ignora la lista guardada para esos campos, por si llegara un dato viejo.
  - Los grupos sin la lista la tienen ausente y siguen pidiéndolo todo: cero
    migración.
  - En la tabla de alumnos, la columna «Repositorio» desaparece en los grupos que
    no lo piden, en vez de enseñar una columna entera de guiones.

- **La importación de alumnos por CSV comprueba que la matrícula y el correo de
  cada fila concuerden**, y salta —reportándola— la que no. En el Tec el correo
  institucional se deriva de la matrícula (`A01278654` → `a01278654@tec.mx`), así
  que las dos columnas dicen lo mismo dos veces; cuando discrepan no es un alumno
  raro, es una errata de quien editó el CSV a mano.
  - No es cosmético: la deduplicación del import mira el **correo**, así que una
    fila con la matrícula de un alumno y el correo de otro se importaba como
    usuario nuevo y dejaba al de esa matrícula duplicado más adelante.
  - Solo se compara la parte local, no el dominio: un correo personal o el
    `@itesm.mx` viejo siguen valiendo mientras la parte local sea la matrícula.
    Una fila sin matrícula pasa igual que antes, porque no hay nada que contrastar.
- **16 ejercicios para los cuatro tipos UML que tenían juez y ningún material**:
  Actividad, Objetos, Despliegue y Comunicación. Ejemplo resuelto más tres
  niveles cada uno, con el mismo tratamiento que los ocho tipos originales. El
  módulo pasa de 33 a **49 definiciones**, y de 9 a **13 tipos con ejercicios**.
  - Los tres tipos que tienen contraparte estructural se apoyan en un **diagrama
    de contexto**, porque su valor está en el cruce: un objeto que no es
    instancia de ninguna clase declarada, un artefacto desplegado que nadie
    diseñó, un mensaje que invoca una operación inexistente. Son errores que un
    diagrama aislado no puede delatar.
  - Cada `diagramaTrampa` reproduce el **error dominante documentado** del tipo:
    bifurcar con una decisión lo que ocurre a la vez, poner el tipo donde va el
    valor, conectar en vez de desplegar, numerar en plano una interacción
    anidada.
  - Se amplía `aplicaA` de 11 aserciones reutilizables para que el editor de
    autoría las ofrezca en los tipos nuevos: las cinco de flujo valen igual en
    actividad, las cinco de interacción en comunicación, y `contenido-en-paquete`,
    `relacion-entre` y `sin-ciclos` en despliegue. Sin esto el editor las
    escondía justo donde hacían falta.
- **Familias «red», «versionado» y «estrategia»** del catálogo adicional: ocho
  tipos más evaluables —C4, bloques, arquitectura en la nube, paquete de red,
  ramas de Git, requisitos, mapa de Wardley y Cynefin—. Dibujan cosas sin
  relación aparente y son, por debajo, lo mismo: elementos, agrupaciones y
  conexiones. Se normalizan al `Nodo`/`Arista` que el juez ya tenía y **heredan
  sin escribir nada** `existe-nodo`, `conteo-nodos`, `relacion-entre`,
  `contenido-en-paquete`, `sin-ciclos` y `nodos-alcanzables`. Cero aserciones
  nuevas.
  - Lo propio de cada tipo es un adaptador: dónde están los elementos y cómo se
    llama su etiqueta. Si un tipo necesitara algo que no cabe en `Nodo`/`Arista`
    —valores, fechas, series— pertenece a otra familia, no a estas.
  - Las agrupaciones se conservan como contenedores, que es lo que permite
    preguntar qué hay dentro de una frontera de C4, de un grupo de la nube, de
    una rama de Git o de un dominio de Cynefin.
  - Una arista hacia un elemento no declarado **se descarta**: C4 dibuja igual un
    `Rel(...)` con un alias inexistente, y dejarla rompería los recorridos del
    catálogo.
  - El catálogo pasa de **16 a 24 tipos evaluables** de 44.
- **Agregar al grupo un alumno que ya existe, buscándolo por matrícula, nombre o
  correo.** El modal «Agregar Alumno» abre en una pestaña «Buscar existente»
  (además de la de siempre, «Crear nuevo»), que consulta el padrón completo —no
  solo el grupo—, porque el caso de uso es justo el alumno que viene de otro
  grupo o de un semestre anterior.
  - El alta ya reutilizaba al alumno existente **si el correo coincidía exacto**,
    pero sin buscador había que sabérselo de memoria: una letra de más creaba un
    usuario duplicado, con su historial vacío y el viejo abandonado.
  - Cada resultado dice si ya está en el grupo (no se ofrece agregarlo) o si
    estuvo y se le dio de baja (el botón dice «Reactivar»: recupera su perfil del
    grupo, que cuelga del vínculo, en vez de empezar de cero).
  - Vincular NO crea usuario ni genera contraseña: el alumno conserva la suya y
    su historial.
  - Crear a mano un alumno con una **matrícula que ya existe** ahora responde 409
    diciendo de quién es, en vez de dar de alta al duplicado. La deduplicación
    por correo no veía a la misma persona registrada con otro correo, que es como
    se colaban. La importación por CSV mantiene su comportamiento (deduplica por
    correo y no por matrícula).
- **Filtro por estado en el listado de grupos** (`/admin/grupos`): Activos —por
  defecto—, Inactivos, Eliminados y Todos. Se resuelve en el servidor
  (`GET /admin/grupos?estado=`), no filtrando en el cliente lo que ya se
  descargó: de partida solo viajan los activos, y un grupo borrado solo sale del
  servidor si se pide expresamente.
  - Los grupos **eliminados** ahora se pueden consultar. El borrado siempre fue
    lógico (`softDelete()` deja el registro con `active`/`exists` en false), pero
    no había forma de ver lo borrado desde la interfaz: para comprobar qué se
    había eliminado había que entrar a la base de datos.
  - Un grupo eliminado se lista **sin acciones** y con su propia insignia
    (Eliminado, distinta de Inactivo). Editar, archivar o abrir el detalle exigen
    un grupo vivo y responderían 404, así que no se ofrecen. Restaurarlo sigue
    siendo una operación manual sobre la base.
  - `estado` sin valor conserva el comportamiento anterior (todo lo no
    eliminado). No es un detalle cosmético: el sidebar y la página de detalle
    resuelven el grupo actual desde este mismo listado, y con "activos" por
    defecto se quedarían sin nombre al abrir un grupo inactivo.
- **Diagrama de ACTIVIDAD de UML y diagrama de COMUNICACIÓN**, fase 4b.
  - La actividad tiene **parser propio** (`normalizar-actividad.ts`): es la única
    sintaxis imperativa del temario —se describe un recorrido, no elementos y
    relaciones—, así que no comparte nada con el parser declarativo. Cubre
    `start`/`stop`, acciones de una o varias líneas, `if`/`elseif`/`else`/`endif`,
    `fork`/`fork again`/`end fork`, `while`/`endwhile` y las **calles de
    responsabilidad** (`|Cliente|`).
  - Es lo que `flujo` no puede sustituir: a un `flowchart` le faltan las calles
    —quién hace cada acción— y el paralelismo, que son justo lo que se evalúa en
    esta vista.
  - Dos aserciones nuevas: `accion-en-calle` y `fork-tiene-join`, que caza el
    error clásico de dejar ramas paralelas que nunca se vuelven a juntar.
  - La **comunicación** reutiliza el parser declarativo —es la misma sintaxis de
    relaciones— y deriva encima los mensajes. El orden sale de la **numeración
    escrita** (`1`, `1.2`, `1.10`), no del orden de las líneas: en esta vista la
    secuencia la fija el número, y ordenar por el texto haría que mover una línea
    cambiara el significado. Los enlaces se conservan además como aristas, que es
    lo que esta vista destaca frente a la de secuencia.

### Fixed
- **Con varios grupos, el panel del alumno enseñaba los datos de otro grupo.** El
  grupo elegido vivía en el estado local del menú y el panel leía siempre
  `user.grupos[0]`, así que menú y panel podían estar mirando grupos distintos:
  el menú dejaba la Wiki en gris —correcto, ese grupo tenía el perfil
  incompleto— mientras el panel enseñaba el perfil completo del primero. Los dos
  decían la verdad, pero de grupos distintos.
  - El grupo activo pasa a un contexto compartido, así que menú y panel siempre
    coinciden.
  - **Se recuerda cuál fue el último**, en el servidor (`AppUser.ultimoGrupoId`),
    no en `localStorage`: al volver se retoma donde se dejó, también desde otro
    navegador. Antes cada recarga volvía al primero de la lista. Es solo una
    preferencia: no da acceso a nada, y si el alumno ya no pertenece a ese grupo
    se cae al primero sin romperse.
  - **Cambiar de grupo estando dentro de una sección lleva a la misma sección del
    grupo nuevo.** Antes el menú apuntaba al grupo nuevo pero la página seguía
    enseñando el anterior.
  - Si esa sección no existe en el grupo nuevo, se dice **«Esta sección no está
    disponible en tu grupo»** en vez de «Error al cargar»: no es un fallo, es que
    ahí no existe. Aplica también a quien llegue por una URL a mano.
- **`nodos-alcanzables` contaba los contenedores como pasos del flujo.** Una
  calle de responsabilidad agrupa acciones, no se «alcanza», así que la
  comprobación dejaba en rojo cualquier diagrama de actividad con calles — es
  decir, todos.
- **Familia «jerarquía» del catálogo adicional**, primera de las siete del plan.
  Mapa mental, mapa de árbol, árbol de ficheros y diagrama de Ishikawa dibujan
  cosas distintas y son, por debajo, el mismo árbol: se normalizan al
  `Nodo`/`Arista` que el juez ya tenía y **heredan sin escribir nada**
  `existe-nodo`, `conteo-nodos`, `nodos-alcanzables`, `sin-ciclos` y
  `sin-nombres-vagos`. Lo único propio de cada tipo es un adaptador de tres
  líneas, porque Mermaid llama a la etiqueta `descr`, `name` o `text` según el
  diagrama y dos de los cuatro cuelgan el árbol de una raíz sintética.
  - Dos aserciones nuevas: `nodo-tiene-hijo` y `profundidad-minima`, que ataca el
    error dominante del tipo —quedarse en un nivel de ramas, que es una lista con
    otro dibujo—.
  - Los ids se derivan del CAMINO y no de la etiqueta: repetir una palabra en dos
    ramas es normal en un mapa mental, y con ids por etiqueta las dos se fundían
    en un nodo con dos padres, que ya no es un árbol.
- **Primer ejercicio del catálogo adicional** (`mapa-mental-modulos-plataforma`),
  escrito como MUESTRA para fijar el formato antes de producir los treinta que
  faltan. El hallazgo es que `EjercicioDiagramaDef` **no necesita cambios**: lo
  que varía frente a un ejercicio del temario es la dosis —un nivel en vez de
  tres, sin ejemplo resuelto aparte, procedencia en dos frases—, y queda escrito
  en la cabecera del fichero.
- El sidebar reparte los bloques de la colección entre «Curso UML» y «Catálogo»
  **por nombre**. Sin eso, sembrar un ejercicio del catálogo dejaba un bloque
  «Catálogo» colgando del temario, diciendo que un mapa mental es materia del
  curso.
- **Diagramas de objetos y de despliegue**, fase 4a de la ampliación. Son los dos
  tipos UML estructurales que faltaban, y lo que aportan —y ningún otro tipo
  puede dar— es la verificación **cruzada** de su vista: un objeto que no es
  instancia de ninguna clase declarada, y un artefacto desplegado que nadie
  diseñó. Cinco aserciones nuevas, dos de ellas cruzadas.
  - `artefacto-desplegado-en` mira la **contención**, no las flechas: un
    artefacto suelto con una flecha hacia un nodo no está desplegado en él, que
    es el error clásico de esta vista.
  - `enlace-entre-objetos` no exige dirección: un enlace es la instancia de una
    asociación, y pedir un sentido concreto suspendería un diagrama correcto.
  - `Miembro` gana `valor`, aparte de `tipo`: en un diagrama de objetos lo que
    distingue una instancia de su clase no es el tipo del atributo sino lo que
    vale, y mezclarlos habría roto las comprobaciones que miran tipos.
  - `node`, `cloud` y `database` pasan a ser **nodos físicos** en despliegue y
    siguen siendo contenedores genéricos en el resto, con una prueba que fija
    que fuera de despliegue nada cambia.
- **Clases y entidad-relación se evalúan también en PlantUML**, tercera fase de
  la ampliación. Hasta ahora el juez solo leía esos dos tipos en Mermaid, así
  que la notación UML canónica para un diagrama de clases no se podía usar en un
  ejercicio del curso.
  - `normalizar-plantuml.ts` aprende **compartimentos de miembros**
    (`+folio : String`, `+calcular(iva : float) : Double`, `{static}`,
    separadores `--`), los calificadores `abstract` y `enum` —que viajan como
    anotación, igual que el `<<enumeration>>` de Mermaid— y la distinción entre
    una llave que abre un compartimento y una que abre un contenedor.
  - **Semántica de las seis relaciones de clases** por su adorno: herencia,
    implementación, composición, agregación, dependencia y asociación. La
    dirección se normaliza por SIGNIFICADO —hijo → padre, todo → parte—, de modo
    que `A <|-- B` y `B --|> A` producen el mismo modelo. En los otros tipos la
    semántica no cambia.
  - **Pata de gallo de ER** (`||--o{`, `}o--|{`…) traducida a las mismas
    cardinalidades normalizadas que produce Mermaid.
  - Una prueba de **paridad entre motores** comprueba que el mismo modelo escrito
    en Mermaid y en PlantUML produce el mismo `ModeloDiagrama`. Sin ella, un
    ejercicio aceptaría una escritura y rechazaría la otra.
  - El listado anuncia ahora el motor **del ejercicio** y no el del tipo: desde
    que un tipo se evalúa en los dos, anunciar los del tipo prometería una
    escritura que ese ejercicio concreto rechaza.

  **Limitación conocida:** el motor sigue siendo del EJERCICIO, no del envío. El
  alumno resuelve en el que fijó el autor; que pudiera elegir exige que el
  ejercicio lleve sus diagramas de referencia en ambos motores.
- **Navegación del módulo Diagramas dentro del armazón**, segunda fase de la
  ampliación. La maqueta original traía una tercera columna propia de 248 px;
  no se añade, porque esa navegación es exactamente lo que el sidebar hace.
  - **`ArbolDiagramas` en el sidebar**, con el mismo patrón contextual que
    `ArbolContenidos`: dos secciones —«Curso UML», con los bloques del temario y
    su avance, y «Catálogo», con los tipos sin ejercicios— y un buscador que
    mira ejercicios y tipos a la vez, porque el alumno no distingue unos de
    otros. Sigue en pie **mientras se resuelve un ejercicio**, así que volver ya
    no exige pasar por el menú global.
  - **El avance pasa al topbar**, donde permanece visible durante el solver, que
    es cuando de verdad importa: en la página del ejercicio la cabecera del
    listado ya no está.
  - El listado se agrupa ahora **por tipo de diagrama** y no por categoría, y
    cada cabecera muestra el motor que sale de `motoresJuez` —el único en el que
    un envío de ese tipo se puede corregir—.
  - La sección abierta viaja en la URL (`?seccion=`), de modo que el botón de
    volver del navegador funciona y una sección concreta se puede enlazar.
  - Las tarjetas del catálogo abren el taller **con su tipo ya seleccionado**
    (`?tipo=`), en vez de dejarlo en el último que se hubiera usado.
  - Se añade el arnés `packages/web/herramientas/vista-diagramas.html`, que monta
    el árbol y el listado con datos de prueba y el catálogo real: la base de
    desarrollo es la de PRODUCCIÓN, y revisar estas pantallas «de verdad» exigía
    entrar con una cuenta real de un grupo real.
- **Catálogo compartido de tipos de diagrama** (`packages/diagramas-catalogo`),
  primera fase de la ampliación del módulo. Sustituye a las **tres listas
  paralelas** que había —la unión de la API, la unión del cliente y la tabla de
  rótulos del web—, que con ocho tipos se sostenían y con más de cuarenta ya no.
  - **44 tipos**: los 8 que ya existían, 5 tipos UML que faltaban (objetos,
    despliegue, actividad, comunicación, tiempos) y 31 del catálogo adicional de
    Mermaid y PlantUML. Los tipos nuevos están disponibles **en modo libre**; su
    evaluación llega en fases posteriores.
  - `motoresJuez` y las plantillas son campos **distintos** a propósito: hay
    tipos que se dibujan y no se corrigen, y tipos que se dibujan en dos motores
    pero solo se evalúan en uno. Fusionarlos llevaría a ofrecer un motor en el
    que el envío del alumno se rechaza.
  - Cada tipo trae su **esqueleto de arranque**, y una prueba pasa todas las
    plantillas de Mermaid por el parser real: una plantilla rota no falla en el
    build, falla en la cara del alumno que abre el editor. Las de PlantUML no se
    pueden validar en CI —su motor está compilado con TeaVM y no corre en Node—,
    así que se añade el arnés manual
    `packages/web/herramientas/verificar-plantuml.html`, que las pinta con el
    motor real del navegador y detecta el cartel de error que PlantUML dibuja
    DENTRO del SVG en vez de lanzar.
  - El **editor de autoría** ya no permite emparejar un tipo con un motor que el
    juez no sabe leer, y el API rechaza el par con 400. Antes se podía guardar
    un ejercicio de «Paquetes» en Mermaid: se guardaba sin protestar y **cada
    envío de alumno respondía 500**, dejando el ejercicio irresoluble para todo
    el grupo. El caso peor era en un diagrama de contexto, donde el juez lanza
    antes siquiera de mirar el diagrama del alumno.
  - Se anota que `er` y `flujo` **no son notación UML** (Chen y diagrama de
    flujo); se conservan por su uso en el curso, con `actividad` como el
    equivalente UML de este último.
  - **ZenUML queda fuera**: no está en la distribución open source de Mermaid,
    requiere el paquete externo `@mermaid-js/mermaid-zenuml`.

- **Núcleo del juez de diagramas UML** (`packages/api/src/services/juez-diagramas/`),
  primera fase del módulo de ejercicios de diseño. Evalúa el **modelo** del
  diagrama, no su texto: sintaxis, léxico (nombres y convenciones) y semántica
  (estructura).
  - Corre Mermaid en el servidor sin navegador (`jsdom` solo porque lo necesita
    DOMPurify) y extrae el modelo con `mermaidAPI.getDiagramFromText`: clases con
    visibilidad, tipo y retorno; secuencia con mensajes síncronos, asíncronos y
    de retorno; estados con transiciones y sus disparadores.
  - **Sin sandbox, sin compilador y sin cola**: la evaluación es síncrona y tarda
    milisegundos, así que `EnvioDiagrama` no necesita estados de trabajo.
  - **27 aserciones** en un catálogo cerrado y declarativo. El autor elige y
    parametriza; el servidor no ejecuta código de nadie y cada comprobación se
    describe sola al alumno en español, de modo que el rótulo no puede
    desincronizarse de lo que se comprueba.
  - **Aserciones cruzadas entre diagramas** (`mensaje-existe-como-operacion`,
    `disparador-existe-como-operacion`, `participante-existe-como-clase`): son el
    eje del módulo, porque los errores dominantes medidos en alumnos no son de
    notación local sino de trazabilidad entre vistas.
  - Los códigos numéricos de Mermaid —que no son API contractual— quedan
    confinados a `codigos-mermaid.ts`, con un **test-alambre** que repite el
    experimento del que salió la tabla y falla si una actualización la mueve.
  - Modelos `EjercicioDiagrama` y `EnvioDiagrama`, y módulo de contenido
    `diagramas`, **opt-in** como `ejercicios`.
- **Autoría de ejercicios de diagrama en Contenidos**: CRUD de admin, editor con
  vista previa en vivo del diagrama y constructor de comprobaciones a partir del
  catálogo, sin escribir JSON a mano.
  - **Verificación de autoría** (`diagramas-verificacion.service.ts` y
    `scripts/verificar-ejercicios-diagrama.ts`): cada diagrama de referencia debe
    pasar todas las comprobaciones y el **diagrama trampa** debe fallar alguna.
    Lo primero delata aserciones sobreajustadas; lo segundo, aserciones tan laxas
    que el ejercicio se aprueba solo. **Publicar exige pasarla**, no solo tener
    comprobaciones: a diferencia de un caso de prueba, una aserción mal calibrada
    no se nota al leerla.

- **32 ejercicios de diagrama** publicados en `tc2007b`, cubriendo los **ocho
  tipos** en tres niveles cada uno (guiado, base y reto): clases, secuencia,
  estados, entidad-relación, flujo, casos de uso, componentes y paquetes.
  - **Un «ejercicio completo» por tipo**, los ocho sobre el mismo caso de reserva
    de salas y cada uno **al principio de la categoría de su tipo**: abren con el
    diagrama ya terminado, llevan el distintivo en el propio nombre y no cuentan
    para el progreso. Su código inicial ES su primera
    solución de referencia, así que la verificación demuestra que enviarlos sin
    tocar nada pasa.
  - Documento guía «Un caso completo: reserva de salas», con el mismo sistema
    modelado en las tres vistas y la tabla de correspondencias entre ellas.
    Importado como BORRADOR.
  - Cada enunciado explica de dónde viene la notación, qué significa cada
    elemento y dónde se usa la misma idea fuera de UML, con la sintaxis del
    diagramador separada de la teoría.
  - **Cuatro de los nueve usan comprobaciones cruzadas** contra un diagrama de
    clases dado: es donde están los errores dominantes medidos en alumnos.
  - Todos pasan la verificación de autoría: dos soluciones válidas y distintas
    cumplen todas las comprobaciones y el diagrama trampa falla alguna.
- **Marca de agua en los diagramas renderizados**: aviso inclinado «Solo para
  fines académicos» y crédito «developed by meeplab». Se inyecta dentro del SVG
  y no como capa de CSS, así que viaja con la imagen al guardarla o copiarla, y
  se coloca a partir del lienzo real del diagrama para no salirse en los
  pequeños ni quedar invisible en los grandes. Se dibuja con `currentColor` para
  seguir a la paleta del tema: un gris fijo desaparecía en el visor en oscuro,
  justo donde el resto del diagrama sí se ve.
- **Taller de diagramas**: espacio para dibujar libremente, sin ejercicio ni
  juez, con selector de motor y de tipo, plantillas de arranque para los ocho
  tipos en ambos motores, vista previa en vivo y el mismo control de vista de
  tres estados que el solver.
  - Los diagramas se **guardan con nombre, se listan y se editan después**
    (`DiagramaTaller`, CRUD bajo `/me/diagramas-taller`). Pertenecen al alumno y
    no al curso, así que sobreviven a un cambio de grupo.
  - Cada operación comprueba la **propiedad** del objeto, no solo la sesión, y
    un diagrama ajeno responde 404 en lugar de 403: decir «existe pero no es
    tuyo» confirmaría que el identificador es real.
  - Entra en el menú como **«Diagramar»**, hermano de «Diagramas» y no como una
    opción dentro de los ejercicios: dibujar libremente no es resolver nada.
- **Plegar el enunciado** en los solvers de diagramas y de programación, y
  control de vista de tres estados en el de diagramas, con los mismos iconos que
  el editor del CMS. Las preferencias se recuerdan entre sesiones.
- **Experiencia del alumno en Diagramas**: listado agrupado por bloque y
  categoría con su progreso, y solver con enunciado, diagramas de contexto ya
  dibujados, editor con vista previa en vivo, historial de envíos y la columna
  del editor siguiendo el scroll.
  - **Sin cola ni sondeo**: el veredicto llega en la respuesta de la propia
    petición, porque juzgar un diagrama cuesta milisegundos. El módulo de código
    necesita `pendiente → ejecutando → listo` solo porque compilar tarda.
  - Las comprobaciones **ocultas** se listan con su marca de fallo pero sin el
    porqué, que el servidor omite antes de responder.

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
- **Ajustes de la wiki (visor de contenidos)**, para alinearla con el módulo de
  Diagramas:
  - **«Mi panel» baja al pie del menú lateral**, con su flecha, como el «Volver
    al sitio» de Diagramas. En el topbar quedaba perdido entre el buscador y el
    botón de tema.
  - **Fuera el título del topbar**: el selector ya dice en qué wiki estás, así
    que salía dos veces. El selector se queda **siempre**, deshabilitado cuando
    solo hay una wiki asignada — mismo criterio que el selector de grupo del
    alumno. Si la colección abierta no está en esa lista, se pinta su nombre como
    texto: un `select` cuyo valor no casa con ninguna opción enseñaría la
    primera, que es otra wiki.
  - **El índice «En esta página» se puede plegar**, con un botón al pie y una
    pestaña en el borde para recuperarlo. Al plegarlo, el contenido ocupa esa
    columna.
  - El botón de ocultar el menú pierde su caja, para que se vea como el de
    Diagramas.
- **El menú del alumno deja de pintarse por etapas.** Salía con los ítems en
  gris, luego se activaban, y luego desaparecían Malla y Competencias cuando
  llegaba la validación de módulos: tres estados distintos en más de un segundo.
  - La causa eran **cinco peticiones sueltas** (perfil, módulos, colecciones,
    ejercicios, diagramas), cada una desde su propio efecto y cada una de entre
    0,5 y 1,5 s. Ahora hay **una sola**, `GET /alumno/grupos/:grupoId/menu`, que
    resuelve lo mismo en paralelo en el servidor reutilizando los mismos helpers
    —el alcance de cada dato no cambia—, y mientras tanto se enseña un esqueleto.
  - De paso se quitan dos consultas repetidas: los dos módulos salen de UNA
    lectura del grupo, y `perfilCompleto` sale del vínculo que la validación ya
    había traído.
  - La latencia total es parecida a la que tenía la más lenta de las cinco: el
    coste está en la autenticación por petición y en resolver las colecciones
    permitidas, no en el número de viajes. Lo que se arregla es el parpadeo.
- **«Documentación» pasa a llamarse «Wiki»** en toda la interfaz: el ítem del menú
  del alumno, la casilla del modal de asignaciones, la sección del menú de grupo
  —que se llamaba «Contenido» y apunta al mismo visor—, la acción «Abrir wiki» de
  una colección y la tarjeta de la portada. Solo cambian las etiquetas: la key
  interna del módulo sigue siendo `documentacion`, así que no hay que migrar
  nada ni tocar el backend.
  - «Contenidos» (la sección del admin donde se administra) se queda como está:
    ahí dentro viven también Páginas, Competencias, Actividades, Ejercicios y
    Diagramas, así que no es sinónimo de la wiki.
- **«Situaciones especiales» pasa a llamarse «Situaciones/condiciones especiales
  o algo que debamos saber para apoyarte mejor»** en el formulario del alumno.
  La etiqueta anterior sonaba a trámite y se prestaba a dejarla en «Ninguna»;
  esta dice para qué sirve. En la ficha del admin se queda la versión corta
  («Situaciones/condiciones especiales»), que ahí es una etiqueta de tabla.
- **El listado de grupos ordena por fecha de inicio ascendente** de entrada, en
  vez de por fecha de creación descendente. Con varios semestres dados de alta,
  el orden de creación no dice nada: lo que se busca es el grupo que empieza
  antes.
  - Las dos columnas de fecha se ordenan por *timestamp*, no por el texto ISO, y
    los grupos sin fecha caen al final en cualquier sentido. Como contrapartida,
    quedan fuera del buscador de la tabla: su valor ya no es texto y un número de
    época solo daría coincidencias sin sentido.
- **El juez de diagramas monta su DOM con `linkedom` en vez de `jsdom`.** Mermaid
  parsea en Node, pero arrastra DOMPurify, que exige un `window`; aquí NO se
  renderiza nada, así que un DOM completo sobraba. jsdom 30 declara
  `engines: ^22.22.2 || ^24.15.0 || >=26.0.0` y arrastra `undici`: le imponía al
  servidor un Node muy reciente por instalar un navegador entero para leer texto.
  `linkedom` pide `>=16`. Verificado con las 162 pruebas del juez, que cubren los
  cinco tipos de Mermaid.
  - jsdom **no desaparece del repo**: pasa a dependencia de desarrollo del web,
    donde dos pruebas lo necesitan de verdad. `ajustar.test.ts` comprueba
    `getPropertyPriority('max-width') === 'important'`, y linkedom descarta el
    `!important`, así que ahí sustituirlo daría una prueba que ya no comprueba lo
    que dice.
- **Se declara `engines.node: >=20.19.0`** en los cuatro `package.json`. No es un
  número elegido: es el suelo que ya imponían `jwks-rsa` (`^20.19.0 || ^22.12.0
  || >=23`) y `vite` (`^20.19.0 || >=22.12.0`). Estaba sin documentar, así que la
  única forma de descubrirlo era desplegar y ver qué se rompía.
  - Ojo con el techo, que no se declara porque el proyecto lo salta a conciencia:
    `@parse/s3-files-adapter` pide `<23`, y por eso `yarn` necesita
    `--ignore-engines` en este repo.
- La regla de acceso a los módulos opt-in se unifica en
  `acceso-modulos.service.ts`, parametrizada por módulo. Era idéntica para
  Ejercicios y Diagramas, y dos copias de una regla de **permisos** divergen en
  cuanto se corrige una sola. `ejercicios-alumno.service.ts` pasa a delegar en
  ella conservando sus nombres públicos.
- La invalidación de la caché de acceso deja de ser por módulo: lo que la dispara
  —cambiar las asignaciones de un grupo o archivarlo— afecta a todos por igual,
  así que **una** llamada los invalida todos. Con el patrón anterior había que
  acordarse de añadir una línea por cada módulo nuevo.

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

### Removed
- **`Grupo.enlaces`**: el `Record<string,string>` del modelo. Estaba **vacío en
  los 3 grupos** de producción y no lo consumía nadie — el pie del sitio, que
  parecía leerlo, lee en realidad el mock estático. Se va del modelo, del payload
  del calendario, del seed y del tipo del front. Es el quinto campo muerto que se
  retira de `Grupo`.

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

### Fixed
- **Un grupo desactivado no se podía editar ni configurar.** `updateGrupo` y
  `setAsignacionesGrupo` resolvían el grupo con `BaseModel.queryActive`, que
  exige `active === true` además de `exists === true`, así que archivar un grupo
  lo dejaba inmodificable: el 404 saltaba al guardar, con la edición ya escrita
  y perdida. Ahora consultan por `exists`, como archivar y eliminar — un grupo
  inactivo sigue siendo un grupo.
- **Un año menor a 0100 se guardaba desplazado 1900 años.** `Date.UTC(26, …)`
  arrastra el mapeo heredado de años de dos cifras y devuelve 1926; el campo de
  año de Chrome produce `0026` con solo teclear «26», así que llegaba de verdad
  desde el formulario y se guardaba sin una queja. Se comprueba que el año
  sobrevive al viaje de ida y vuelta, lo que cubre ese mapeo y cualquier otro
  ajuste silencioso.
- **Las fechas de un grupo se enseñaban un día antes de la capturada.** Al
  guardar el 10-ago, la tabla de grupos mostraba el 9-ago. La fecha nunca se
  guardó mal: `new Date('2026-08-10')` es la medianoche **UTC**, y al pintarla
  el navegador la traducía a hora local, donde en México (UTC-6) esa medianoche
  cae a las 18:00 del día anterior. Por eso el formulario de edición sí enseñaba
  el día correcto —lee en UTC— y la tabla no: cada uno interpretaba el mismo
  dato en una zona distinta.
  - `fechaInicio` y `fechaFin` son días de calendario, no instantes. Ahora el día
    va anclado a UTC de punta a punta: `parseFechaDia()` lo construye con
    `Date.UTC` al guardar y la tabla lo pinta con `timeZone: 'UTC'`. La zona del
    servidor deja de influir en lo que se ve.
  - De paso, un día imposible (`2026-02-31`) se rechaza con 400 en vez de
    guardarse. `new Date` no lo considera inválido: lo **desborda** al 3 de
    marzo, así que se guardaba una fecha que nadie escribió. La validación es
    por componentes, con años bisiestos incluidos.
- **No se podía quitar una fecha de un grupo una vez puesta.** Vaciar el campo
  en el formulario no borraba nada: se mandaba `fechaInicio: undefined`, que
  `JSON.stringify` elimina del cuerpo, y el servidor lo leía como "no toques
  este campo". La única salida era poner otra fecha válida.
  - El formulario manda `null` para borrar (distinguible de "ausente") y el
    modelo hace `unset()` del campo — un `set(campo, undefined)` tampoco lo
    quita del objeto de Parse.
  - Cada fecha lleva un botón **Quitar** cuando tiene valor: vaciar a mano un
    `<input type="date">` obliga a borrar día, mes y año por separado, y en
    algunos navegadores no se puede.
- **El taller de diagramas guardaba mal el tipo.** El API acotaba `tipoDiagrama`
  a los ocho tipos del juez y convertía **en silencio** cualquier otro a
  `clases`, así que un diagrama guardado con un tipo del catálogo se recuperaba
  mal etiquetado y con un motor que podía no corresponderle. Ahora un tipo
  desconocido se rechaza con 400 —adivinar era la corrupción silenciosa que había
  que quitar—, y el motor se acota a los que saben dibujar ESE tipo, en el
  servidor y en los selectores. Al cambiar de tipo sobre un diagrama ya escrito,
  el taller **avisa** de que ha cambiado el motor y de cómo deshacerlo, en vez de
  dejar la vista previa fallando sobre un texto que el alumno no tocó.
- **La plantilla de topología de red no se dibujaba.** `nwdiag` necesita
  `@startnwdiag`, no `@startuml`; con `@startuml` el motor pinta un cartel de
  error. Lo encontró la primera pasada del arnés de verificación, que la
  comprobación estructural daba por buena.
- **El juez declaraba ambigua una máquina de estados escrita correctamente.** Las
  guardas se comparaban con `clave()`, que borra todo lo que no sea letra o
  dígito —y en una guarda los operadores son justo lo que la distingue de su
  contraria—, así que `[activo]` y `[!activo]`, o `[x > 0]` y `[x >= 0]`, daban
  la misma clave y la elección canónica de UML se marcaba como no determinista.
  - La prueba que cubría el caso pasaba **por accidente**: usaba `<=`, y jsdom
    escapaba el `<` a `&lt;`, dejando las letras «lt» que hacían distintas las
    dos claves. Cambiar de DOM la puso roja y destapó el defecto de fondo, que ya
    estaba en producción. Ahora las guardas se comparan conservando los
    operadores, y hay casos para la negación, para dos operadores sobre el mismo
    operando y para el contrapunto —la misma guarda con otros espacios sigue
    siendo ambigua—, que es lo que evita que la comprobación se vuelva vacía.
- Un documento en la raíz de una colección podía **renombrarse** al slug
  reservado `ejercicios` y tapar la ruta del módulo: la reserva solo se
  comprobaba al crear. Ahora se comprueba también al renombrar, y la lista de
  slugs reservados es una sola constante que incluye `diagramas`.
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
- **Las imágenes del visor fallaban con 401 mientras el texto cargaba bien.** El
  SPA se autentica con el token de localStorage en la cabecera `x-session-token`,
  pero **un `<img>` no puede mandar cabeceras**: las imágenes del CMS dependen en
  exclusiva de la cookie de sesión. Si el token sobrevivía y la cookie no —cookies
  limpiadas, caducada antes, o sesión abierta antes de que la cookie existiera— la
  aplicación parecía funcionar y solo se rompían las imágenes, sin ningún aviso.
  Ahora `/auth/me`, que corre en cada arranque con el token ya validado, vuelve a
  sembrar la cookie si falta: con una recarga el usuario se recupera solo, sin
  tener que cerrar sesión.
[Unreleased]: https://github.com/black4ninja/tc2005b.github.io/commits/main
