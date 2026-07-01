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
          // Servir los docs en la raíz del baseUrl (/docs/) en lugar de /docs/docs/
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
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
        // Redirige las URLs viejas /docs/docs/... a las nuevas /docs/...
        // `existingPath` es la ruta nueva sin baseUrl (p. ej.
        // "/backend/node/tutorials/intro_web/Lab1HTML"); el baseUrl "/docs/"
        // se antepone automáticamente al valor devuelto, así que devolver
        // "/docs<existingPath>" reproduce la URL vieja "/docs/docs/...".
        createRedirects(existingPath) {
          return [`/docs${existingPath}`];
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'TC2005B',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Guía del curso',
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
