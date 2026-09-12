import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, fontProviders } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';

import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import partytown from '@astrojs/partytown';
import icon from 'astro-icon';
import compress from 'astro-compress';
import type { AstroIntegration } from 'astro';

import astrowind from './vendor/integration';
import { readingTimeRemarkPlugin, responsiveTablesRehypePlugin } from './src/utils/frontmatter';

const copySitemapToBlog = () => ({
  name: 'copy-sitemap-to-blog',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      const targetDir = fileURLToPath(dir);
      const blogSubDir = path.join(targetDir, 'blog');

      if (!fs.existsSync(blogSubDir)) {
        fs.mkdirSync(blogSubDir, { recursive: true });
      }

      const sitemap0 = path.join(targetDir, 'sitemap-0.xml');
      const sitemapIndex = path.join(targetDir, 'sitemap-index.xml');
      const rssFile = path.join(targetDir, 'rss.xml');

      // Copia o sitemap real para dentro da pasta /blog/
      if (fs.existsSync(sitemap0)) {
        fs.copyFileSync(sitemap0, path.join(blogSubDir, 'sitemap.xml'));
        fs.copyFileSync(sitemap0, path.join(blogSubDir, 'sitemap-0.xml'));
      }

      // Copia e ajusta o sitemap-index caso seja chamado
      if (fs.existsSync(sitemapIndex)) {
        let indexXml = fs.readFileSync(sitemapIndex, 'utf-8');
        indexXml = indexXml.replace(
          'https://saber.imb.br/sitemap-0.xml',
          'https://saber.imb.br/blog/sitemap-0.xml'
        );
        fs.writeFileSync(path.join(blogSubDir, 'sitemap-index.xml'), indexXml, 'utf-8');
      }

      // Copia também o RSS para /blog/rss.xml
      if (fs.existsSync(rssFile)) {
        fs.copyFileSync(rssFile, path.join(blogSubDir, 'rss.xml'));
      }
    },
  },
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const hasExternalScripts = false;
const whenExternalScripts = (items: (() => AstroIntegration) | (() => AstroIntegration)[] = []) =>
  hasExternalScripts ? (Array.isArray(items) ? items.map((item) => item()) : [items()]) : [];

export default defineConfig({
  output: 'static',

  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },

  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: ['100 900'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
    },
  ],

  integrations: [
    sitemap(),
    mdx(),
    icon({
      iconDir: 'src/assets/icons',
      include: {
        tabler: ['*'],
        'flat-color-icons': [
          'template',
          'gallery',
          'approval',
          'document',
          'advertising',
          'currency-exchange',
          'voice-presentation',
          'business-contact',
          'database',
        ],
      },
    }),

    ...whenExternalScripts(() =>
      partytown({
        config: { forward: ['dataLayer.push'] },
      })
    ),

    compress({
      CSS: { csso: false, lightningcss: { minify: true } },
      HTML: {
        'html-minifier-terser': {
          removeAttributeQuotes: false,
        },
      },
      Image: false,
      JavaScript: true,
      SVG: false,
      Logger: 1,
    }),

    astrowind({
      config: './src/config.yaml',
    }),

    copySitemapToBlog(),
  ],

  image: {
    domains: ['cdn.pixabay.com', 'images.unsplash.com'],
    responsiveStyles: true,
  },

  markdown: {
    processor: unified({
      remarkPlugins: [readingTimeRemarkPlugin],
      rehypePlugins: [responsiveTablesRehypePlugin],
    }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'),
      },
    },
  },
});