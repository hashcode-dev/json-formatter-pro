import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * Unit tests run outside Astro, so the `@lib`/`@components`/… aliases from
 * astro.config.mjs have to be repeated here for any module that uses them.
 * Keep the two lists in step.
 */
export default defineConfig({
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
  test: {
    include: ['src/**/*.test.ts'],
  },
});
