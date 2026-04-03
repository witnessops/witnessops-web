import type { SurfaceId } from "./surfaces";
import { getSurfaceUrl, getDocsUrl } from "./surfaces";

/**
 * A Next.js-compatible redirect entry.
 *
 * Matches the shape expected by `next.config.js` `redirects()`.
 */
export type SurfaceRedirect = {
  source: string;
  destination: string;
  permanent: boolean;
  statusCode?: 301 | 308;
};

/**
 * Shared marketing routes that satellite surfaces redirect to vaultmesh.
 * These are the static, non-dynamic redirects safe for next.config.
 *
 * Route handlers originally used 301; page components used 308.
 * We preserve the original status codes exactly.
 */
function getMarketingRedirects(surfaceId: SurfaceId): SurfaceRedirect[] {
  // Only satellite VaultMesh surfaces redirect marketing routes.
  // vaultmesh-web owns these pages. witnessops owns its own.
  if (surfaceId === "vaultmesh" || surfaceId === "witnessops") {
    return [];
  }

  const vmUrl = (path: string) => getSurfaceUrl("vaultmesh", path);

  return [
    // route.ts handlers → 301
    { source: "/compliance", destination: vmUrl("/compliance"), permanent: true, statusCode: 301 },
    { source: "/consultancies", destination: vmUrl("/consultancies"), permanent: true, statusCode: 301 },
    { source: "/how-it-works", destination: vmUrl("/how-it-works"), permanent: true, statusCode: 301 },
    { source: "/pricing", destination: vmUrl("/pricing"), permanent: true, statusCode: 301 },
    { source: "/spec", destination: vmUrl("/spec"), permanent: true, statusCode: 301 },

    // page.tsx permanentRedirect → 308
    { source: "/contact", destination: vmUrl("/contact"), permanent: true, statusCode: 308 },
    { source: "/privacy", destination: vmUrl("/privacy"), permanent: true, statusCode: 308 },
    { source: "/terms", destination: vmUrl("/terms"), permanent: true, statusCode: 308 },
    { source: "/security", destination: vmUrl("/security"), permanent: true, statusCode: 308 },
    { source: "/support", destination: vmUrl("/support"), permanent: true, statusCode: 308 },
  ];
}

/**
 * Cross-surface redirects that route users to the canonical surface for a
 * given concern (verify, status, docs).
 *
 * /proofs is archival/deferred and intentionally not emitted as a live public
 * redirect here.
 */
function getCrossSurfaceRedirects(surfaceId: SurfaceId): SurfaceRedirect[] {
  const redirects: SurfaceRedirect[] = [];

  // /verify → verify surface (unless this IS the verify surface)
  if (surfaceId !== "verify" && surfaceId !== "vaultmesh" && surfaceId !== "witnessops") {
    redirects.push({
      source: "/verify",
      destination: getSurfaceUrl("verify"),
      permanent: true,
      statusCode: 301,
    });
  }

  // /status → status surface (unless this IS status)
  if (surfaceId !== "status" && surfaceId !== "vaultmesh" && surfaceId !== "witnessops") {
    redirects.push({
      source: "/status",
      destination: getSurfaceUrl("status"),
      permanent: true,
      statusCode: 301,
    });
  }

  // /docs → docs surface (static redirect for the index only)
  if (surfaceId !== "vaultmesh" && surfaceId !== "witnessops") {
    redirects.push({
      source: "/docs",
      destination: getDocsUrl("vaultmesh"),
      permanent: true,
      statusCode: 308,
    });
  }

  return redirects;
}

/**
 * Returns all static redirects for a given surface, suitable for use in
 * `next.config.js` `redirects()`.
 *
 * Dynamic redirects (e.g. /docs/[...slug], /support/[slug])
 * still require route files because they need runtime parameter resolution.
 */
export function getSurfaceRedirects(surfaceId: SurfaceId): SurfaceRedirect[] {
  return [
    ...getMarketingRedirects(surfaceId),
    ...getCrossSurfaceRedirects(surfaceId),
  ];
}
