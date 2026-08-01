// Must match COOKIE_CONSENT_KEY in src/lib/site.ts and GA_ID in src/layouts/BaseLayout.astro
(function () {
  // Google Consent Mode v2 Initializer
  var consentKey = "json-formatter-pro-cookie-consent";
  var gaId = "G-TKJSHMQD3E";

  window.dataLayer = window.dataLayer || [];
  // Assigned onto window explicitly so CookieConsent can call window.gtag
  // to push the consent update.
  window.gtag = function gtag() {
    dataLayer.push(arguments);
  };

  var savedConsent =
    typeof localStorage !== "undefined" ? localStorage.getItem(consentKey) : null;
  var isGranted = savedConsent === "granted" || savedConsent === "accepted";

  // No ad_storage/ad_user_data/ad_personalization here: this site runs
  // no advertising or ad-network scripts, so there is no ad-consent
  // signal to gate. Only GA4 analytics_storage is meaningful.
  gtag("consent", "default", {
    analytics_storage: isGranted ? "granted" : "denied",
    wait_for_update: 500,
  });

  gtag("js", new Date());
  gtag("config", gaId);
})();
