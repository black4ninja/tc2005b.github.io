# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Course website for **TC2005B - Construcción de Software y Toma de Decisiones** at Tecnológico de Monterrey, Campus Querétaro. Deployed on a server (`groups.meeplab.com`) that pulls from this repository and serves the built `dist/` directory (previously hosted on GitHub Pages).

## Architecture

**Monorepo** with npm workspaces containing three packages:

- `packages/web/` — React 19 + Vite 6 + TypeScript SPA (main site: calendar, labs, avances, policies, CMS "Contenidos")
- `packages/api/` — Express + Parse Server API (incluye el CMS "Contenidos": colecciones, documentos, recursos, visor gated en `/contenidos/`)
- `packages/contenido-pipeline/` — pipeline unified compartido (render Markdown del CMS)

Legacy static HTML content (ejercicios, laboratorios, lecturas, documentos) lives in `static-legacy/` and is copied to the build output.

## Commands

- **Dev servers:** `npm run dev` — starts Vite (port 5173) and the API concurrently
- **Build:** `npm run build` — builds web + api + merges into `dist/`
- **Preview:** `npm run preview` — serves the built `dist/` directory
- **Run tests:** `npm test` (uses Vitest with `--globals` flag)
- **Type check:** `cd packages/web && npx tsc --noEmit`

## Key Directories

### `packages/web/src/`
- `components/` — React components organized by feature (layout, home, calendar, labs, avances, policies)
- `data/` — Migrated data files as typed ES modules (labs, avances, calendario)
- `types/` — TypeScript interfaces (Lab, Avance, Calendario, Actividad, etc.)
- `hooks/` — Custom hooks (useCalendarFilter, useWeekNavigation)
- `styles/` — CSS variables and global styles

### Routing (React Router 7)
| Route | Component |
|-------|-----------|
| `/` | HomePage |
| `/calendario/:grupoId` | CalendarPage |
| `/labs/:labId` | LabPage |
| `/avances/:avanceId` | AvancePage |
| `/politicas` | CodeReviewsPage |

### Data Sources
- `data-source/labs/` — Original JS lab data files (34 files, source of truth)
- `data-source/avances/` — Original JS avance data files (6 files)
- `data-source/calendario/` — Original JS calendario data file
- Migrated to TypeScript via `scripts/migrate-data.mjs`

### Legacy Content
- `static-legacy/` — ejercicios, laboratorios, lecturas, documentos, imagenes (copied to build)
- `deprecated/` — All legacy HTML pages, viewers, assets, and content duplicates (not used at runtime)

## Conventions

- **Language:** Spanish (es-mx). All content, labels, and calendar entries are in Spanish.
- **Styling:** CSS Modules with design tokens in `variables.css`. No Tailwind.
- **Fonts:** Inter (Google Fonts) + Material Icons.
- **Data pattern:** Each lab/avance is a separate TS file with typed `export default`. Barrel exports use dynamic imports for code splitting.
- **Links:** Internal links use React Router paths (`/labs/lab1`, `/avances/av1`). External links use full URLs.

## Development workflow

Full rules in [`CONTRIBUTING.md`](./CONTRIBUTING.md). Key points (mandatory):

- **Never commit or push directly to `main`.** All changes land via reviewed PR. Branch off `main`; no `develop` branch.
- **Branch names:** [Conventional Branch](https://conventionalbranch.org/) — `feature/…`, `bugfix/…`, `hotfix/…`, `chore/…`, `docs/…`, `test/…` (lowercase kebab-case).
- **Commits:** [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) — `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, etc.; `!`/`BREAKING CHANGE:` for major.
- **Versioning:** [SemVer](https://semver.org/), tracked in [`CHANGELOG.md`](./CHANGELOG.md) (Keep a Changelog).
- **Code review:** done when the branch is finished, before merge. No general comments — leave **inline** comments on the specific code, following [Conventional Comments](https://conventionalcomments.org/). Resolve every thread within the same PR before merging.
- **PRs:** title follows Conventional Commits; body follows [the PR template](./.github/PULL_REQUEST_TEMPLATE.md). Per user preference, PRs and commits carry **no AI/Claude references or co-author lines**.
