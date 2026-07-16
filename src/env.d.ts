/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL: string;
  readonly PUBLIC_ANALYTICS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
