/**
 * Shared redirect config generator for Next.js.
 *
 * Generates static redirects from satellite surfaces to their canonical
 * owners. Called from next.config.js at build time.
 *
 * This is a plain JS file (not TypeScript) because next.config.js runs
 * before transpilation.
 */

const surfaceRegistry = [
  { surfaceId: "vaultmesh", hostname: "vaultmesh.org", canonicalUrl: "https://vaultmesh.org", localPort: 3000, docsHost: "docs.vaultmesh.org" },
  { surfaceId: "verify", hostname: "verify.vaultmesh.org", canonicalUrl: "https://verify.vaultmesh.org", localPort: 3003 },
  { surfaceId: "attest", hostname: "attest.vaultmesh.org", canonicalUrl: "https://attest.vaultmesh.org", localPort: 3004 },
  { surfaceId: "status", hostname: "status.vaultmesh.org", canonicalUrl: "https://status.vaultmesh.org", localPort: 3002 },
  { surfaceId: "hub", hostname: "hub.vaultmesh.org", canonicalUrl: "https://hub.vaultmesh.org", localPort: 3005 },
  { surfaceId: "offsec", hostname: "offsec.global", canonicalUrl: "https://offsec.global", localPort: 3001, docsHost: "docs.offsec.global" },
];

function getSurfaceOrigin(surfaceId) {
  const surface = surfaceRegistry.find((s) => s.surfaceId === surfaceId);
  if (!surface) throw new Error(`Unknown surface: ${surfaceId}`);
  if (process.env.NODE_ENV !== "production" && surface.localPort) {
    return `http://localhost:${surface.localPort}`;
  }
  return surface.canonicalUrl;
}

function surfaceUrl(surfaceId, pathname) {
  const p = pathname || "/";
  const normalized = p.startsWith("/") ? p : `/${p}`;
  return new URL(normalized, getSurfaceOrigin(surfaceId)).toString();
}

function docsUrl(surfaceId) {
  const surface = surfaceRegistry.find((s) => s.surfaceId === surfaceId);
  if (!surface) throw new Error(`Unknown surface: ${surfaceId}`);
  if (process.env.NODE_ENV !== "production" && surface.localPort) {
    return `${getSurfaceOrigin(surfaceId)}/docs`;
  }
  return `https://${surface.docsHost || "docs.vaultmesh.org"}`;
}

/**
 * Returns static Next.js redirect entries for a satellite surface.
 *
 * /proofs is archival/deferred and intentionally omitted from the live public
 * redirect set.
 *
 * @param {string} surfaceId - The surface ID (e.g. "verify", "attest", "hub")
 * @returns {Array<{source: string, destination: string, permanent: boolean, statusCode: number}>}
 */
function getSurfaceRedirects(surfaceId) {
  // Only satellite VaultMesh surfaces get shared redirects.
  if (surfaceId === "vaultmesh" || surfaceId === "offsec") {
    return [];
  }

  const vm = (path) => surfaceUrl("vaultmesh", path);
  const redirects = [];

  // Marketing routes → vaultmesh (originally route.ts with 301)
  redirects.push(
    { source: "/compliance", destination: vm("/compliance"), permanent: true, statusCode: 301 },
    { source: "/consultancies", destination: vm("/consultancies"), permanent: true, statusCode: 301 },
    { source: "/how-it-works", destination: vm("/how-it-works"), permanent: true, statusCode: 301 },
    { source: "/pricing", destination: vm("/pricing"), permanent: true, statusCode: 301 },
    { source: "/spec", destination: vm("/spec"), permanent: true, statusCode: 301 },
  );

  // Legal/support/contact → vaultmesh (originally page.tsx with 308)
  redirects.push(
    { source: "/contact", destination: vm("/contact"), permanent: true, statusCode: 308 },
    { source: "/privacy", destination: vm("/privacy"), permanent: true, statusCode: 308 },
    { source: "/terms", destination: vm("/terms"), permanent: true, statusCode: 308 },
    { source: "/security", destination: vm("/security"), permanent: true, statusCode: 308 },
    { source: "/support", destination: vm("/support"), permanent: true, statusCode: 308 },
  );

  // Cross-surface static redirects (originally route.ts with 301)
  // /verify always redirects: other surfaces → verify surface; verify itself → its own root
  if (surfaceId === "verify") {
    redirects.push({ source: "/verify", destination: "/", permanent: true, statusCode: 301 });
  } else {
    redirects.push({ source: "/verify", destination: surfaceUrl("verify"), permanent: true, statusCode: 301 });
  }

  if (surfaceId !== "status") {
    redirects.push({ source: "/status", destination: surfaceUrl("status"), permanent: true, statusCode: 301 });
  }

  // Docs index → docs surface (originally page.tsx with 308)
  redirects.push({ source: "/docs", destination: docsUrl("vaultmesh"), permanent: true, statusCode: 308 });

  return redirects;
}

module.exports = { getSurfaceRedirects };
