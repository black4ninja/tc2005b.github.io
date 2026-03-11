# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static course website for **TC2005B - Construcción de Software y Toma de Decisiones** at Tecnológico de Monterrey, Campus Querétaro. Hosted via GitHub Pages.

## Commands

- **Run tests:** `npm test` (uses Vitest with `--globals` flag)
- **Serve locally:** Open `index.html` in a browser or use any static file server (e.g., `npx serve .`)

## Architecture

- **Static HTML site** — no build step, no static site generator. Pages are plain `.html` files.
- **UI Framework:** Materialize CSS (`css/materialize.min.css`, `js/materialize.min.js`) with Google Material Icons.
- **Custom styles:** `css/daw.css`
- **Language:** Spanish (es-mx). All page content, labels, and calendar entries are in Spanish.

### Key Pages

- `index.html` — Landing page with group selection links
- `grupo1.html`, `grupo2.html` — Class schedule/calendar per group (table-based calendars)
- `code_reviews.html` — Team work policies

### Content Directories

- `labs/` — Web development labs (HTML, CSS, JS, Node, Express, MVC, sessions, auth, AJAX, REST, deployment)
- `laboratorios/` — Database labs (SQL, stored procedures, transactions, optimization)
- `ejercicios/` — Database exercises (ER models, relational algebra, SQL, normalization)
- `lecturas/` — Reading materials on databases, SQL, usability, application design
- `avances/` — Project milestone/deliverable descriptions
- `documentos/` — Course documents, presentations (.pptx), and supplementary files
- `archived/` — Deprecated content from prior semesters

### Conventions

- All HTML pages use the same Materialize boilerplate: navbar, main container, footer with important links.
- Calendar pages (`grupo*.html`) use `<table class="calendario">` with weekly rows.
- Links to labs/exercises use relative paths from the root.
