/** Fallback origin used when PUBLIC_SITE_URL is not set. */
export const SITE_URL = 'https://www.formatjson.in';

/**
 * Normalizes an internal route path to the trailing-slash form Astro's
 * static build actually serves for directory routes (e.g. `/json-formatter`
 * -> `/json-formatter/`), so canonical tags, schema URLs, and internal links
 * never point at a URL that 308-redirects. `/404` is exempt: Astro builds it
 * as a flat `404.html`, not a directory, so it has no trailing-slash form.
 */
export function canonicalPath(path: string): string {
  if (path === '/404') return path;
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

/**
 * localStorage key holding the cookie-consent decision ('accepted' | 'rejected').
 * Read by BaseLayout's pre-hydration Consent Mode script and written by
 * CookieConsent — both must agree or the consent default never sees the choice.
 */
export const COOKIE_CONSENT_KEY = 'json-formatter-pro-cookie-consent';
