# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto sigue [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Removed
- **Docusaurus retirado (US-7)**: se elimina `packages/docusaurus`, el gate
  `/docs` por materia y el campo `Grupo.docusaurus[]`. `/docs/*` responde
  301 permanente hacia `/contenidos/*` (mapa del importador + heurística).
  La documentación vive ahora en el CMS "Contenidos".

### Changed
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
