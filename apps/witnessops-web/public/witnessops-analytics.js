/* Public-site document-load analytics. The token identifies the existing site;
 * it is public configuration, not an API credential. */
(() => {
  const url = new URL(window.location.href);
  const publicPage = /^\/(?:$|(?:pricing|privacy|terms|security|media-kit|why|support|review|docs|articles|research|services|catalog|library|why-witnessops)(?:\/|$))/;
  if (url.protocol !== "https:" || !["witnessops.com", "www.witnessops.com"].includes(url.hostname)) return;
  // Never collect callback/query data, private delivery URLs or local tools.
  if (url.search || url.hash || !publicPage.test(url.pathname)) return;
  if (url.pathname.startsWith("/review/request")) return;
  if (document.referrer) {
    try {
      const referrer = new URL(document.referrer);
      if (referrer.search || referrer.hash) return;
      if (["witnessops.com", "www.witnessops.com"].includes(referrer.hostname) &&
          (!publicPage.test(referrer.pathname) || referrer.pathname.startsWith("/review/request"))) return;
    } catch { return; }
  }
  if (document.querySelector("script[data-cf-beacon]")) return;
  const script = document.createElement("script");
  script.type = "module";
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  // Prevent the beacon from observing subsequent client-side private routes.
  script.dataset.cfBeacon = JSON.stringify({ token: "94fea6b3ed28494399eb8b38345e650c", spa: false });
  // Native navigation destroys this document and its vendor listeners before
  // any private page loads. Leave default link behavior (including modifiers)
  // intact while preventing the React/Next delegated SPA handler from running.
  document.addEventListener("click", (event) => {
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (anchor && new URL(anchor.href, window.location.href).origin === url.origin) {
      event.stopImmediatePropagation();
    }
  }, true);
  document.head.appendChild(script);
})();
