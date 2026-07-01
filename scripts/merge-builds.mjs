#!/usr/bin/env node
/**
 * merge-builds.mjs — Assembles the final dist/ directory:
 *   1. Copies Vite build output (dist/web/) to dist/
 *   2. Copies Docusaurus build to dist/docs/
 *   3. Copies legacy static content to dist/
 *   4. Creates a 404.html SPA fallback (deep-link restore)
 */

import { cpSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');

// 1. Vite build is already at dist/web/ — copy contents to dist root
const webDist = join(DIST, 'web');
if (existsSync(webDist)) {
  cpSync(webDist, DIST, { recursive: true, force: true });
  console.log('✓ Vite build → dist/');
}

// 2. Docusaurus build → dist/docs/
const docsBuild = join(ROOT, 'packages/docusaurus/build');
if (existsSync(docsBuild)) {
  mkdirSync(join(DIST, 'docs'), { recursive: true });
  cpSync(docsBuild, join(DIST, 'docs'), { recursive: true, force: true });
  console.log('✓ Docusaurus build → dist/docs/');
}

// 3. Legacy static content
const legacyDirs = ['ejercicios', 'laboratorios', 'lecturas', 'documentos', 'imagenes', 'uml'];
const legacySrc = join(ROOT, 'static-legacy');

for (const dir of legacyDirs) {
  const src = join(legacySrc, dir);
  if (existsSync(src)) {
    cpSync(src, join(DIST, dir), { recursive: true, force: true });
    console.log(`✓ ${dir}/ → dist/${dir}/`);
  }
}

// Copy legacy CSS/JS for legacy HTML pages
const legacyCss = join(legacySrc, 'css');
const legacyJs = join(legacySrc, 'js');
if (existsSync(legacyCss)) {
  // Merge into dist/css without overwriting Vite assets
  cpSync(legacyCss, join(DIST, 'css'), { recursive: true, force: false });
  console.log('✓ legacy css/ → dist/css/');
}
if (existsSync(legacyJs)) {
  cpSync(legacyJs, join(DIST, 'js'), { recursive: true, force: false });
  console.log('✓ legacy js/ → dist/js/');
}

// 4. SPA fallback 404.html (deep-link restore)
//    Lo ideal en el servidor es `try_files $uri /index.html;` (nginx) para que
//    las rutas del SPA sirvan index.html directamente. Este 404.html es un
//    respaldo agnóstico del host: si el servidor sirve 404.html para rutas no
//    encontradas, guarda la URL solicitada y regresa a la raíz para que el
//    decoder de index.html la restaure vía history.replaceState.
const spa404 = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TC2005B</title>
  <script>
    sessionStorage.redirect = location.href;
    location.replace(location.protocol + '//' + location.host + '/');
  </script>
</head>
<body></body>
</html>
`;
writeFileSync(join(DIST, '404.html'), spa404);
console.log('✓ 404.html (SPA fallback)');

console.log('\n✅ Build merge complete!\n');
