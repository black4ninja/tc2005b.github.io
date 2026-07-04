# Generación de contenido (CMS "Contenidos")

Guía para escribir tutoriales/documentación con **agentes de IA** (Claude Code) o a
mano, revisarlos localmente y subirlos al CMS. Reemplaza el flujo que dábamos con
Docusaurus ("escribir archivos → probar → desplegar"), pero ahora la **fuente de
verdad es la base de datos**, no archivos en el repo.

> TL;DR del loop:
> **1)** escribe `.md` en una carpeta → **2)** `preview-contenido.ts` lo renderiza en
> el navegador (sin servidor) → **3)** `importar-markdown.ts` lo sube como **BORRADOR**
> → **4)** lo revisas en el admin y lo **publicas**.

---

## Modelo mental

El contenido vive en Parse (MongoDB), no en el filesystem:

- **Colección** (`Coleccion`) — un "sitio de docs" por materia (p. ej. `tc2005b`,
  `tc2007b`). Ya existen; **este flujo agrega páginas a una colección existente**, no
  crea colecciones (eso se hace desde el admin o con `importar-docusaurus.ts`).
- **Documento** — una página (`tipo: 'md'` o `'html'`) o una **categoría**
  (`tipo: 'categoria'`, agrupa páginas), identificada por su `slug` dentro de su padre.
- **DocumentoVersion** — el cuerpo. Cada página tiene una **versión publicada**
  (`version`) y/o un **borrador** en curso (`borrador`). Publicar congela el borrador
  como nueva versión inmutable.
- **Recurso** — un archivo (imagen, PDF…) ligado a un documento; se sirve por un
  endpoint con permisos (`/api/contenidos/recursos/`), nunca directo desde S3.

**Draft-first:** el importador sube todo como **borrador** por defecto. Un borrador
**no es visible para los alumnos** hasta que lo publicas. Así puedes revisar sin riesgo.

---

## Requisitos

- **API corriendo** (los scripts hablan con Parse):
  ```bash
  cd packages/api
  yarn dev            # o: ./node_modules/.bin/tsx src/index.ts
  ```
- ⚠️ **El entorno de desarrollo comparte la BD de PRODUCCIÓN** (Atlas). Todo lo que el
  importador escribe cae en la base real. Por eso: **usa siempre `--dry-run` primero**,
  y deja el contenido como **borrador** hasta validarlo.

---

## Paso 1 — Escribir los `.md`

Crea una carpeta (fuera del repo o en un scratch; no necesita vivir en el árbol del
proyecto). Estructura:

```
mi-tutorial/
  _category_.json          (opcional: { "label": "Mi Módulo", "position": 3 })
  00-intro.md
  01-instalacion.md
  temas-avanzados/         (subcarpeta = categoría anidada)
    _category_.json
    caching.md
  imagenes/                (carpeta SIN .md = solo assets; NO se vuelve categoría)
    diagrama.png
```

Reglas de la estructura:

- **Subcarpeta con `.md` → categoría.** El nombre (o `_category_.json.label`) es su título.
- **Subcarpeta sin ningún `.md` → assets.** Ahí guardas imágenes; el importador no la
  convierte en categoría, solo resuelve las imágenes que referencies.
- **Prefijos numéricos** (`00-`, `01-`) ordenan y se quitan del slug/título
  (`00-intro.md` → slug `intro`).
- **Frontmatter** opcional por archivo:
  ```yaml
  ---
  title: Título visible de la página
  slug: mi-slug-estable          # recomendado: fija el slug (la idempotencia se basa en él)
  sidebar_position: 2            # orden dentro de su categoría
  ---
  ```
  Sin `title`, se usa el primer `# H1`. Sin `slug`, se deriva del nombre del archivo.

### Markdown soportado

El pipeline (`@tc2005b/contenido-pipeline`) es el **mismo** que renderiza el visor en
producción. Soporta:

- **GFM**: tablas, listas de tareas, tachado, autolinks.
- **Admonitions** estilo Docusaurus (directivas `:::`):
  ```markdown
  :::tip Título opcional
  Contenido del aviso.
  :::
  ```
  Tipos: `note`, `tip`, `info`, `warning`, `danger`, `caution`.
- **Bloques de código** con resaltado (```` ```js ````, etc.).
- **Imágenes relativas**: `![alt](imagenes/diagrama.png)`. El importador las **sube como
  Recurso** y reescribe el enlace a `recurso:<id>/<archivo>` automáticamente.
- **Enlaces internos** entre páginas del CMS: usa rutas absolutas del visor,
  `[ver](/contenidos/tc2005b/backend/node/instalacion)`.

⚠️ **HTML crudo se sanea**: `<script>`, `<iframe>`, estilos inline y handlers se
eliminan (allowlist de `rehype-sanitize`). No metas HTML arbitrario esperando que pase.

---

## Paso 2 — Previsualizar localmente (sin servidor ni BD)

```bash
cd packages/api
./node_modules/.bin/tsx scripts/preview-contenido.ts <archivo.md | carpeta>
```

Renderiza con el pipeline real + los estilos del visor y abre un HTML autocontenido en
el navegador. Útil para iterar rápido con el agente antes de tocar la BD.

- `--no-open` genera el HTML sin abrir el navegador (imprime la ruta).
- Las imágenes por referencia `recurso:` **no** cargan en el preview local (aún no
  existen en el CMS); es esperado. Lo demás (texto, admonitions, tablas, código) se ve
  igual que en producción.

---

## Paso 3 — Importar como borrador

**Siempre en seco primero:**

```bash
cd packages/api
./node_modules/.bin/tsx scripts/importar-markdown.ts \
    --coleccion tc2005b --dry-run mi-tutorial/
```

Reporta qué páginas **crearía** vs **actualizaría** y cuántas imágenes subiría, sin
escribir nada. Cuando el reporte se vea bien, quita `--dry-run`:

```bash
./node_modules/.bin/tsx scripts/importar-markdown.ts \
    --coleccion tc2005b mi-tutorial/
```

Opciones:

| Flag | Efecto |
|------|--------|
| `--coleccion <slug>` | **Requerido.** Colección destino (debe existir): `tc2005b`, `tc2007b`. |
| `--padre <slug/slug/...>` | Cuelga el contenido bajo una **categoría existente** (p. ej. `backend/node`) en vez de la raíz. |
| `--dry-run` | No escribe; solo reporta. |
| `--publish` | Publica directo además de subir (salta la revisión). Úsalo solo si ya validaste con preview + dry-run. |

**Idempotencia:** la identidad de una página es `(colección, categoría padre, slug)`.
Re-ejecutar el importador tras editar los `.md` **actualiza el borrador** de cada página
—no duplica— y **reutiliza** el Recurso de cada imagen (no deja huérfanos). Por eso
conviene **fijar `slug:` en el frontmatter**: si renombras el archivo sin `slug`, el
importador lo verá como página nueva.

---

## Paso 4 — Revisar y publicar

1. Entra al admin: **`/admin/contenidos`** → abre la colección → verás la página con su
   borrador (`admin/contenidos/:id/editar/:docId`).
2. Revisa el render y el contenido. Si algo no cuadra, corrige los `.md` y re-importa
   (paso 3); el borrador se actualiza.
3. **Publica** desde el admin (o corre el import con `--publish`). Recién publicado, el
   contenido es visible para los alumnos con acceso a esa materia en
   `/contenidos/<slug>/...`.

---

## Receta para un agente (resumen accionable)

> Objetivo: agregar un tutorial a la colección `<coleccion>`.
>
> 1. Asegúrate de que el API corre (`cd packages/api && yarn dev`).
> 2. Escribe los `.md` en una carpeta temporal, con frontmatter `title` + `slug`
>    estables, admonitions `:::`, imágenes relativas en una subcarpeta `imagenes/`.
> 3. `./node_modules/.bin/tsx scripts/preview-contenido.ts <carpeta>` y revisa el HTML.
> 4. `./node_modules/.bin/tsx scripts/importar-markdown.ts --coleccion <coleccion> --dry-run <carpeta>`;
>    verifica el reporte (crea/actualiza esperados, 0 "sin resolver").
> 5. Repite sin `--dry-run` para subir como **borrador**.
> 6. **NO publiques automáticamente.** Avisa al humano para que revise en `/admin/contenidos`
>    y publique. (La BD de dev es la de producción — no dejes basura ni publiques sin visto bueno.)

Scripts: [`packages/api/scripts/preview-contenido.ts`](./packages/api/scripts/preview-contenido.ts),
[`packages/api/scripts/importar-markdown.ts`](./packages/api/scripts/importar-markdown.ts).
Migración masiva desde un Docusaurus completo: [`importar-docusaurus.ts`](./packages/api/scripts/importar-docusaurus.ts).
