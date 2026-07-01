// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'TC2005B',
  tagline: 'Construcción de software y toma de decisiones',
  favicon: 'img/favicon.ico',

  // URL de producción del sitio (usada para sitemap y canonical/og tags)
  url: 'https://groups.meeplab.com',
  // El Docusaurus se sirve bajo /docs/ del sitio (merge-builds → dist/docs/)
  baseUrl: '/docs/',

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          // Instancia por defecto = materia TC2005B → /docs/tc2005b/...
          // (multi-instancia: cada materia tendrá su carpeta, routeBasePath y sidebar).
          path: 'docs/tc2005b',
          routeBasePath: 'tc2005b',
          sidebarPath: './sidebars/tc2005b.js',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      /** @type {import('@docusaurus/plugin-client-redirects').Options} */
      ({
        // Redirige los esquemas viejos a las nuevas rutas /docs/tc2005b/...
        // `existingPath` es la ruta nueva sin baseUrl (p. ej.
        // "/tc2005b/backend/.../Lab1HTML"); el baseUrl "/docs/" se antepone al
        // valor devuelto. Reproducimos:
        //   - esquema previo:   /docs/backend/.../Lab1HTML   (devolviendo "/backend/...")
        //   - esquema original: /docs/docs/backend/.../Lab1HTML (devolviendo "/docs/backend/...")
        createRedirects(existingPath) {
          if (!existingPath.startsWith('/tc2005b/')) return undefined;
          const withoutSlug = existingPath.replace(/^\/tc2005b/, '');
          return [withoutSlug, `/docs${withoutSlug}`];
        },
      }),
    ],
    [
      // Segunda instancia de docs: materia TC2007B → /docs/tc2007b/...
      // (para agregar más materias, replicar este bloque con su id/path/slug).
      '@docusaurus/plugin-content-docs',
      /** @type {import('@docusaurus/plugin-content-docs').Options} */
      ({
        id: 'tc2007b',
        path: 'docs/tc2007b',
        routeBasePath: 'tc2007b',
        sidebarPath: './sidebars/tc2007b.js',
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'Docs',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'TC2005B',
          },
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            docsPluginId: 'tc2007b',
            position: 'left',
            label: 'TC2007B',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `Copyright © ${new Date().getFullYear()} TC2005B.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
