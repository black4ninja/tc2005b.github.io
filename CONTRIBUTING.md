# Guía de contribución — TC2005B

Lineamientos de desarrollo para este repositorio. Son de cumplimiento obligatorio
para cualquier cambio que entre a `main`.

---

## 0. Instalación — Node y `--ignore-engines`

```bash
yarn install --ignore-engines
```

**El `--ignore-engines` no es opcional y sin él el install falla en seco.** No es
un descuido, así que conviene entender de dónde sale antes de intentar
«arreglarlo»:

- **Suelo: Node 20.19.** Es lo que declaran los `package.json` (`engines.node`),
  y no es un número elegido: lo imponen `jwks-rsa` (`^20.19.0 || ^22.12.0 ||
  >=23`) y `vite` (`^20.19.0 || >=22.12.0`).
- **Techo: `@parse/s3-files-adapter` pide `<23`**, y ese techo el proyecto lo
  salta a conciencia. Por eso NO se declara en `engines`: declararlo rompería el
  install en cualquier máquina con Node moderno sin ganar nada a cambio.

Es decir, cualquier Node ≥20.19 sirve, pero uno ≥23 incumplirá al adaptador de S3
y yarn se plantará si no le pasas la bandera. Lo mismo aplica a `yarn add`.

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

> Para llevar **varias features a la vez** no uses `git switch`: cada una va en su
> propio worktree, con su dev-server y sus puertos. Ver [§8](#8-worktrees--varias-features-en-paralelo).

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
yarn test                              # pruebas (Vitest) — desde la RAÍZ del repo
cd packages/web && npx tsc --noEmit    # type-check del web
yarn build                             # build completo si afecta el output
```

## 8. Worktrees — varias features en paralelo

Cuando hay **más de un frente vivo** (dos US, una feature y un hotfix, un PR en
review mientras empiezas el siguiente), cada uno va en su propio **git worktree**:
una copia física del árbol de trabajo en otra carpeta, compartiendo el mismo
`.git`. No es un `git clone` — el historial no se duplica.

Lo que aporta es **simultaneidad**: varias copias abiertas a la vez, cada una con
su `yarn dev`, sin `git stash` ni cambiar de rama a media tarea. Si solo trabajas
una cosa, una rama normal basta.

### Ciclo de vida (obligatorio de punta a punta)

| # | Paso | Comando |
|---|---|---|
| 1 | Crear worktree + rama desde `main` al día | `wt new feature/mi-cambio` |
| 2 | Levantar el dev-server del worktree | `yarn dev` (dentro) o `wt dev feature/mi-cambio` |
| 3 | Trabajar y commitear (Conventional Commits) | `git commit` |
| 4 | Pruebas manuales sobre ESE servidor, y correcciones | — |
| 5 | Verificación de §7 y push | `git push -u origin feature/mi-cambio` |
| 6 | Abrir PR con el template | `gh pr create` |
| 7 | Code review de §5 y resolución de hilos | — |
| 8 | Merge del PR | `gh pr merge` |
| 9 | Cerrar worktree, borrar rama y sincronizar | `wt done feature/mi-cambio` + `git pull` en el principal |

El worktree **no se cierra antes del merge**: los pasos 4 y 7 pueden devolverte a
él para correcciones. `wt done` se niega a borrar una rama sin mergear, y solo
tira la carpeta si no hay cambios sin guardar (`--force` para forzar).

### El helper `wt`

Vive en [`tools/wt.zsh`](./tools/wt.zsh). Instalación, una vez:

```bash
echo 'source ~/ITESM/TC2005B/Calendario/tc2005b.github.io/tools/wt.zsh' >> ~/.zshrc
```

```bash
wt new <spec> [--base <ref>] [--no-install]   # worktree + rama + bootstrap + cd
wt ls                                          # worktrees vivos y su puerto web
wt cd <spec> | wt path <spec>                  # navegar
wt dev <spec>                                  # yarn dev en ese worktree
wt done <spec> [--force]                       # cerrar y borrar la rama
```

El `<spec>` es el nombre de la rama. Sin prefijo de Conventional Branch se asume
`feature/`. Los worktrees se crean **fuera del repo**, en `../.worktrees/<spec>`,
para que Vite y `tsc` no vean una copia del árbol dentro del árbol.

Si la rama **ya existe**, `wt new` la **adopta** en vez de crearla — sirve para
retomar una rama, revisar el PR de otro, o mover a un worktree trabajo que empezó
en el checkout principal. Como una rama solo puede estar checkouteada en un sitio
a la vez, primero hay que salir de ella (`git switch main`).

### Puertos: por qué no colisionan

Lo que git ignora (`node_modules`, `.env`) **no se copia** al worktree; de eso se
encarga el bootstrap de `wt new`, que además le asigna un par de puertos propio:

- Busca el primer desplazamiento libre sobre los del checkout principal
  (web `5173`, api `3006`) → el primer worktree usa `5174/3007`, el segundo
  `5175/3008`, etc.
- "Libre" es **ni escuchando ahora ni reservado** por otro worktree: se leen los
  `.env.local` de todos, así que dos worktrees creados en frío tampoco chocan.
- Escribe `packages/api/.env` (con `PORT` y `SERVER_URL` reescritos) y
  `packages/web/.env.local` (`VITE_PORT`, `VITE_API_PORT`, que
  [`vite.config.ts`](./packages/web/vite.config.ts) lee para el server y el proxy).

Por eso dentro de un worktree basta `yarn dev`: los puertos ya están en su sitio.
El dev-server usa `strictPort`, así que si un puerto estuviera tomado falla en
vez de saltar al siguiente y quedarse proxeando al API de otra rama.

> ⚠️ **Todos los worktrees comparten la BD de PRODUCCIÓN**, igual que el checkout
> principal (ver `CLAUDE.md`). Aislar el puerto no aísla los datos: las pruebas
> manuales de un worktree escriben en la misma base que las de otro.
