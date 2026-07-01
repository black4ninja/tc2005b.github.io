# Guía de contribución — TC2005B

Lineamientos de desarrollo para este repositorio. Son de cumplimiento obligatorio
para cualquier cambio que entre a `main`.

---

## 1. Flujo de ramas (Git)

Usamos un GitFlow **simplificado**, sin rama `develop`:

- **`main` es la única rama base y protegida.** Nunca se hace commit ni push directo a `main`.
- Todo cambio se desarrolla en una **rama corta** creada a partir de `main`.
- Todo cambio entra a `main` **exclusivamente vía Pull Request**, con code review
  antes de mergear. GitHub **no exige approval de terceros** (equipo pequeño /
  maintainer único), pero el PR y la resolución de hilos del review sí son obligatorios.
- La rama se **elimina** después de mergear.

```bash
git switch main
git pull --ff-only
git switch -c feature/mi-cambio     # crear rama desde main
# ... trabajo + commits ...
git push -u origin feature/mi-cambio
gh pr create                        # abre el PR usando el template del repo
```

## 2. Nombres de rama — [Conventional Branch](https://conventionalbranch.org/)

Formato: `<tipo>/<descripción-en-kebab-case>`. Solo minúsculas, números y guiones
(sin guiones al inicio/fin ni consecutivos). Opcionalmente incluye el issue.

| Prefijo | Uso |
|---|---|
| `feature/` | nueva funcionalidad |
| `bugfix/` | corrección de bug (no urgente) |
| `hotfix/` | corrección urgente en producción |
| `release/` | preparación de una versión |
| `chore/` | tooling, dependencias, configuración |
| `docs/` | solo documentación |
| `test/` | solo pruebas |

Ejemplos: `feature/exportar-malla-xlsx`, `bugfix/slug-duplicado`, `feature/issue-42-login-microsoft`.

## 3. Mensajes de commit — [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)

Formato:

```
<tipo>[scope opcional]: <descripción en imperativo, minúscula>

[cuerpo opcional]

[footer(s) opcional(es)]
```

Tipos: `feat`, `fix`, `refactor`, `perf`, `style`, `docs`, `test`, `build`, `ci`, `chore`.

- `feat:` → incrementa **MINOR**
- `fix:` → incrementa **PATCH**
- **Breaking change** → incrementa **MAJOR**: agrega `!` tras el tipo/scope
  (`feat(api)!: ...`) **o** un footer `BREAKING CHANGE: <descripción>`.

Ejemplos:

```
feat(docs): sirve el Docusaurus en /docs/ en vez de /docs/docs/
fix(paginas): evita slug duplicado al actualizar
chore(deps): actualiza @docusaurus/* a 3.9.2
refactor(api)!: renombra el endpoint de páginas públicas

BREAKING CHANGE: /paginas ahora responde bajo /public/paginas
```

El scope sugerido corresponde al paquete o área: `web`, `api`, `docs`, `calendario`,
`labs`, `avances`, `paginas`, `deps`, etc.

## 4. Versionado y changelog — [SemVer 2.0.0](https://semver.org/)

Las versiones son `MAJOR.MINOR.PATCH` y se derivan de los commits (ver arriba).

- Se registran en [`CHANGELOG.md`](./CHANGELOG.md) siguiendo el estilo *Keep a Changelog*.
- Cada release se etiqueta con un tag `vX.Y.Z` en `main`.
- Acumula los cambios visibles bajo `## [Unreleased]` mientras se desarrolla; al
  liberar, muévelos a una sección con la versión y la fecha.

## 5. Code Review

El code review se realiza **una vez finalizada la rama, antes de mergear** (no durante).

### Reglas

1. **Nada de comentarios generales.** Selecciona la porción específica del código y
   deja el comentario **inline** sobre esa línea/rango.
2. Cada comentario sigue [Conventional Comments](https://conventionalcomments.org/):

   ```
   <label> [decoración]: <mensaje>
   ```

   Labels: `praise`, `nitpick`, `suggestion`, `issue`, `todo`, `question`,
   `thought`, `chore`, `note`.
   Decoraciones: `(blocking)`, `(non-blocking)`, `(if-minor)`.

   Ejemplos:
   - `suggestion (non-blocking): extrae esto a un helper reutilizable`
   - `issue (blocking): este slug puede colisionar; falta validar unicidad`
   - `question: ¿por qué useMasterKey aquí?`

3. **Resolver dentro del mismo PR.** Atiende el máximo posible de comentarios en el
   propio PR; una vez atendido cada hilo, se **resuelve/cierra** (no se dejan hilos abiertos).
4. Se mergea solo cuando: se hizo el code review, **no quedan hilos sin resolver**
   (GitHub lo bloquea vía *required conversation resolution*), y CI/tests pasan.
   No se exige approval formal de terceros mientras haya un único maintainer.

### Con `gh` (comentarios inline y resolución de hilos)

> Autenticación: si `gh` vive detrás de 1Password, resuelve el token una vez:
> `export GH_TOKEN="$(gh auth token)"`.

```bash
# Comentario inline sobre una línea específica de un archivo del PR
gh api repos/{owner}/{repo}/pulls/{number}/comments \
  -f body='suggestion (non-blocking): extrae a un helper' \
  -f commit_id="$(gh pr view {number} --json headRefOid -q .headRefOid)" \
  -f path='packages/api/src/controllers/paginas.controller.ts' \
  -F line=42 -f side=RIGHT

# Resolver un hilo de review (GraphQL) una vez atendido
gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' \
  -f id='<THREAD_ID>'
```

En este repo también existe el comando `/code-review --comment`, que publica los
hallazgos como comentarios inline del PR automáticamente.

## 6. Pull Requests

- El **título del PR** sigue Conventional Commits (igual que los commits).
- La **descripción** usa el [PR template](./.github/PULL_REQUEST_TEMPLATE.md) del repo.
- Enlaza los issues que cierra (`Closes #123`).
- Un PR = un cambio coherente. Evita PRs que mezclan features no relacionadas.

## 7. Verificación antes de abrir el PR

```bash
yarn test                              # pruebas (Vitest)
cd packages/web && npx tsc --noEmit    # type-check del web
yarn build                             # build completo si afecta el output
```
