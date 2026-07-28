/** Fallback origin used when PUBLIC_SITE_URL is not set. */
export const SITE_URL = 'https://www.formatjson.in';

/**
 * localStorage key holding the cookie-consent decision ('accepted' | 'rejected').
 * Read by BaseLayout's pre-hydration Consent Mode script and written by
 * CookieConsent — both must agree or the consent default never sees the choice.
 */
export const COOKIE_CONSENT_KEY = 'json-formatter-pro-cookie-consent';
