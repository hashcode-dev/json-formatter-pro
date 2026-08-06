/** Fallback origin used when PUBLIC_SITE_URL is not set. */
export const SITE_URL = 'https://www.formatjson.in';

/**
 * Freshness/authorship signals for JSON-LD (see StructuredData.astro).
 *
 * These feed `datePublished`/`dateModified` on the WebApplication entity, which
 * Google AI Mode and Bing Copilot weight as recency signals. `SITE_PUBLISHED`
 * is the project's first-commit date and should not change. `SITE_MODIFIED`
 * MUST be bumped whenever site content is meaningfully updated — it is a hand-
 * maintained honest date, not an auto-updating build timestamp (bumping it on
 * every deploy without a real content change is exactly the "freshness
 * inflation" Google's structured-data guidelines warn against). Individual
 * pages may override via the `datePublished`/`dateModified` props.
 * ISO 8601 date form (YYYY-MM-DD).
 */
export const SITE_PUBLISHED = '2026-07-16';
export const SITE_MODIFIED = '2026-08-06';

/** Legal entity behind the site — used as the schema author/publisher. */
export const ORG_NAME = 'Hash Code Technologies & Software Solutions';

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
