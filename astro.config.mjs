import { defineConfig } from 'astro/config';
import { fileURLToPath, URL } from 'node:url';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

const SITE_URL = process.env.PUBLIC_SITE_URL ?? 'https://formatjson.in';
const r = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false, nesting: true }),
    sitemap({ changefreq: 'monthly', priority: 0.7 }),
  ],
  vite: {
    resolve: {
      alias: {
        '@': r('./src'),
        '@lib': r('./src/lib'),
        '@components': r('./src/components'),
        '@store': r('./src/store'),
        '@hooks': r('./src/hooks'),
        '@workers': r('./src/workers'),
        '@styles': r('./src/styles'),
      },
    },
    worker: { format: 'es' },
    build: {
      cssMinify: true,
      sourcemap: false,
    },
  },
});
