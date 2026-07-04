# Runbook — Corte Docusaurus → CMS "Contenidos"

Plan de deprecación en 3 fases (design/cms-contenidos.html §6). **La regla:
no se retira nada hasta comprobar en producción que cada página importada
abre, navega y descarga sus recursos igual que su original.**

## Fase 1 — Paralelo (con US-1..6 y US-8 mergeadas, SIN mergear US-7)

1. Deploy normal (el servidor hace pull y build; Docusaurus sigue sirviendo `/docs`).
2. En el servidor, una sola vez:
   ```bash
   cd packages/api
   ./node_modules/.bin/tsx scripts/crear-indices-busqueda.ts
   ./node_modules/.bin/tsx scripts/importar-docusaurus.ts --slug tc2005b --clave TC2005B \
       --nombre "Construcción de software y toma de decisiones" --dry-run   # revisar reporte
   ./node_modules/.bin/tsx scripts/importar-docusaurus.ts --slug tc2005b --clave TC2005B \
       --nombre "Construcción de software y toma de decisiones"
   ./node_modules/.bin/tsx scripts/importar-docusaurus.ts --slug tc2007b --clave TC2007B \
       --nombre "Integración de seguridad informática en redes y sistemas de software" --dry-run
   ./node_modules/.bin/tsx scripts/importar-docusaurus.ts --slug tc2007b --clave TC2007B \
       --nombre "Integración de seguridad informática en redes y sistemas de software"
   ```
   ⚠️ El importador escribe `packages/api/data/redirects-docs.json`: **commitearlo**
   (rama + PR) para que el corte tenga el mapa exacto.
3. Desde el admin: revisar ambas colecciones (borrador), validar contra el
   reporte de paridad, y **publicarlas**.
4. Asignar las colecciones a los grupos (editor de grupo → "Colecciones de
   Contenidos con acceso").
5. **Validación de paridad** (visor, como alumno y como admin):
   - [ ] Cada sección del árbol abre y el orden coincide con Docusaurus
   - [ ] Página con imágenes: se ven (stream gated)
   - [ ] Página con ZIP/PDF: descargan
   - [ ] Búsqueda encuentra contenido propio y NO ajeno (probar con alumno de un solo grupo)
   - [ ] Alumno sin colección → 404 en /contenidos/<slug>/
   - [ ] El único enlace sin resolver conocido (CONTRIBUTING.md de Lab7Branches, roto ya en el original) decidido: corregir a mano o dejar

## Fase 2/3 — Corte y retiro (mergear el PR de US-7)

1. Mergear `chore/docusaurus-retiro` y deploy. Desde ese momento:
   - `/docs/*` responde **301 → /contenidos/*** (mapa + heurística)
   - `packages/docusaurus` ya no existe ni se buildea
2. En el servidor: quitar del script de deploy (`deploy-tc2005b.sh`) cualquier
   paso de build de Docusaurus.
3. Verificar: 3–4 URLs viejas de marcadores reales → redirigen a la página
   correcta del CMS.
4. Nota: los ~19 enlaces `/docs/...` en `packages/web/src/data/labs/*` se
   sirven vía el 301 (varios son carpetas→readme que SOLO el mapa exacto
   resuelve — no reescribirlos a mano con heurística). Limpieza opcional
   posterior: reescribirlos leyendo `packages/api/data/redirects-docs.json`.

## Activación de S3 (US-8, después del corte)

1. Copiar las variables de `~/.parse-contenidos-s3.env` al `.env` del servidor
   (`S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`).
   Con configuración parcial el API **no arranca** (a propósito).
2. Reiniciar el API — log esperado: `Files adapter: S3 (groups-meeplab-contenidos)`.
3. Migrar:
   ```bash
   cd packages/api
   ./node_modules/.bin/tsx scripts/migrar-archivos-s3.ts --dry-run
   ./node_modules/.bin/tsx scripts/migrar-archivos-s3.ts --borrar-gridfs   # o sin --borrar-gridfs para conservar respaldo
   ```
   El script verifica con una sonda que el server realmente guarda en S3 y
   aborta si no. Exit 1 = hubo fallidos (re-correr es seguro: deduplica).
4. Validar imágenes/descargas en el visor.

## Rollback

- Fase 1 no toca nada de Docusaurus: revertir = borrar colecciones del admin.
- Fase 2: revertir el merge de US-7 y re-deploy restaura Docusaurus (los 301
  cacheados en navegadores persisten hasta que expire su cache — por eso la
  validación de Fase 1 es obligatoria antes del corte).
- S3: quitar las S3_* del .env y reiniciar vuelve a GridFS (los archivos ya
  migrados a S3 dejan de leerse: solo hacer rollback si NO se corrió con
  --borrar-gridfs).
