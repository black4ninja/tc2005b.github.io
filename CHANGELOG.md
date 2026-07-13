# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto sigue [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
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
