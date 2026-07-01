<!-- El título del PR debe seguir Conventional Commits: <tipo>(<scope>): <descripción> -->
<!-- Ej.: feat(calendario): agrega filtro por grupo | fix(api): corrige slug duplicado en páginas -->

## Descripción

<!-- ¿Qué hace este PR y por qué? Resume el cambio, no el archivo por archivo. -->

## Tipo de cambio

<!-- Marca con una x lo que aplique. Debe ser consistente con el tipo del/los commit(s). -->

- [ ] `feat` — nueva funcionalidad (SemVer: MINOR)
- [ ] `fix` — corrección de bug (SemVer: PATCH)
- [ ] `refactor` / `perf` / `style` — cambio interno sin alterar comportamiento
- [ ] `docs` — solo documentación
- [ ] `test` — solo pruebas
- [ ] `build` / `ci` / `chore` — tooling, dependencias, configuración
- [ ] **BREAKING CHANGE** (SemVer: MAJOR) — describe la ruptura abajo

## ¿Cómo se probó?

<!-- Pasos para reproducir/verificar. Comandos, rutas, capturas si aplica. -->

- [ ] `npm test` / `yarn test` pasa
- [ ] `cd packages/web && npx tsc --noEmit` sin errores (si tocaste web)
- [ ] Build local OK (`yarn build`) si el cambio afecta el output

## Checklist

- [ ] La rama sigue [Conventional Branch](https://conventionalbranch.org/) (`feature/…`, `fix/…`, etc.)
- [ ] Los commits siguen [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- [ ] Actualicé `CHANGELOG.md` si el cambio es visible para usuarios
- [ ] Actualicé documentación relevante (`README`, `CLAUDE.md`, docs)
- [ ] No hay commits directos a `main`; este cambio entra vía PR revisado

## Issues relacionados

<!-- Closes #123 -->
