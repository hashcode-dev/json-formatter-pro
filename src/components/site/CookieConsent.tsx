import { useEffect, useState } from 'react';

export function CookieConsent(): JSX.Element | null {
  const [showBanner, setShowBanner] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const consent = localStorage.getItem('json-formatter-pro-cookie-consent');
    // Show banner if no consent preference stored
    if (!consent) {
      setShowBanner(true);
      // Block third-party scripts if no consent
      blockThirdPartyScripts();
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('json-formatter-pro-cookie-consent', 'accepted');
    setShowBanner(false);
    // Load third-party scripts after consent
    loadThirdPartyScripts();
  };

  const handleReject = () => {
    localStorage.setItem('json-formatter-pro-cookie-consent', 'rejected');
    setShowBanner(false);
  };

  if (!mounted || !showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 animate-slide-up">
      <div className="mx-auto flex max-w-7xl items-center gap-4 border-t border-border bg-surface p-4 text-sm text-subtle sm:p-6">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-fg sm:text-sm">
            Cookie Consent
          </p>
          <p className="mt-1">
            We use Google Analytics and Google AdSense cookies to understand how you use our site and to show
            relevant ads. By clicking "Accept," you consent to these cookies. See our{' '}
            <a href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </a>{' '}
            and{' '}
            <a href="/cookies" className="text-primary hover:underline">
              Cookie Policy
            </a>{' '}
            for details.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleReject}
            className="btn-ghost whitespace-nowrap px-3 py-2 text-xs sm:text-sm"
          >
            Reject
          </button>
          <button
            onClick={handleAccept}
            className="btn-primary whitespace-nowrap px-3 py-2 text-xs sm:text-sm"
          >
            Accept
          </button>
          <button
            onClick={handleReject}
            className="btn-icon text-lg leading-none"
            aria-label="Close cookie banner"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

function blockThirdPartyScripts(): void {
  // Google Analytics and AdSense scripts are initially blocked
  // They will be loaded after user consent
  const script = document.querySelector(
    'script[src*="googletagmanager.com"]',
  ) as HTMLScriptElement | null;
  if (script) script.dataset.consent = 'false';
}

function loadThirdPartyScripts(): void {
  // Load Google Analytics
  const gaScript = document.querySelector(
    'script[src*="googletagmanager.com"]',
  ) as HTMLScriptElement | null;
  if (gaScript) {
    gaScript.dataset.consent = 'true';
    // Re-execute Google Analytics if needed
    if ((window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
      });
    }
  }
}
