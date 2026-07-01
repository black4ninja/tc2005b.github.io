# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto sigue [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- El Docusaurus se sirve ahora en `/docs/...` en lugar de `/docs/docs/...`
  (`routeBasePath: '/'`). Las páginas registradas en BD y los enlaces de los
  labs se migraron al nuevo esquema.

### Deprecated
- Se elimina el despliegue por **GitHub Pages**. El sitio se despliega en un
  servidor (`groups.meeplab.com`) que hace `pull` del repositorio y sirve `dist/`.
  Se removieron los workflows de GitHub Pages, `.nojekyll` y el hack SPA `?/`.

### Added
- Redirects de las URLs viejas `/docs/docs/...` hacia las nuevas
  (`@docusaurus/plugin-client-redirects`).
- `CONTRIBUTING.md`, plantilla de PR y este `CHANGELOG.md`.

[Unreleased]: https://github.com/black4ninja/tc2005b.github.io/commits/main
