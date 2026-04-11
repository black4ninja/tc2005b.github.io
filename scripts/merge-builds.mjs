#!/usr/bin/env node
/**
 * merge-builds.mjs — Assembles the final dist/ directory:
 *   1. Copies Vite build output (dist/web/) to dist/
 *   2. Copies Docusaurus build to dist/docs/
 *   3. Copies legacy static content to dist/
 *   4. Creates 404.html for SPA routing on GitHub Pages
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

// 4. SPA fallback 404.html for GitHub Pages
const spa404 = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TC2005B</title>
  <script>
    // SPA redirect for GitHub Pages
    // https://github.com/rafgraph/spa-github-pages
    var pathSegmentsToKeep = 0;
    var l = window.location;
    l.replace(
      l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
      l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
      l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
      (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
      l.hash
    );
  </script>
</head>
<body></body>
</html>
`;
writeFileSync(join(DIST, '404.html'), spa404);
console.log('✓ 404.html (SPA fallback)');

// 5. .nojekyll for GitHub Pages
writeFileSync(join(DIST, '.nojekyll'), '');
console.log('✓ .nojekyll');

console.log('\n✅ Build merge complete!\n');
