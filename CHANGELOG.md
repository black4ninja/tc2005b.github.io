# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto sigue [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
