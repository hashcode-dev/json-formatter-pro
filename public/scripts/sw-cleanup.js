// One-time cleanup: unregister any service worker a previous ad-vendor
// integration (5gvci.com) installed at this origin's root scope, since
// that access would otherwise persist for returning visitors even
// after the vendor's script tags are removed from this page.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) reg.unregister();
  });
}
