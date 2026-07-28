/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** Set by BaseLayout's Consent Mode initializer; queues into window.dataLayer. */
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
}
