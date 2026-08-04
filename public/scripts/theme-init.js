// Must match STORE_KEY in src/store/index.ts
// Set theme early to avoid FOUC.
(function () {
  var storeKey = "json-formatter-pro";
  try {
    var stored = JSON.parse(localStorage.getItem(storeKey) || "{}");
    var pref = stored.state && stored.state.theme;
    if (pref !== "light" && pref !== "dark" && pref !== "auto") {
      pref = undefined;
    }
    var mode =
      pref === "light" || pref === "dark"
        ? pref
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.dataset.theme = mode;
  } catch (_) {
    document.documentElement.dataset.theme = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches
      ? "dark"
      : "light";
  }
})();
