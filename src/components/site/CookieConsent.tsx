import { useEffect, useState } from 'react';
import { COOKIE_CONSENT_KEY } from '@lib/site';

export function CookieConsent(): JSX.Element | null {
  const [showBanner, setShowBanner] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!localStorage.getItem(COOKIE_CONSENT_KEY)) setShowBanner(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setShowBanner(false);
    grantConsent();
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
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
            <a href="/privacy" className="text-accent hover:underline">
              Privacy Policy
            </a>{' '}
            and{' '}
            <a href="/cookies" className="text-accent hover:underline">
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

/**
 * Lift Consent Mode's denied-by-default flags once the user accepts. The
 * analytics and ad tags are already loaded by BaseLayout, so consent is
 * communicated through gtag rather than by gating script insertion.
 */
function grantConsent(): void {
  window.gtag?.('consent', 'update', {
    analytics_storage: 'granted',
    ad_storage: 'granted',
  });
}
