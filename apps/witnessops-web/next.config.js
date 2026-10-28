const path = require("path");
const { resolveDistDir } = require("../../packages/config/next/resolve-dist-dir");
const { securityHeaders } = require("../../packages/config/next/security-headers");
const checkScriptSrc = process.env.NODE_ENV === "development"
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin both flags into the bundle. An unset build becomes "0", so a later
  // runtime env cannot publish the assistant or the ask route.
  env: {
    NEXT_PUBLIC_WO_PREVIEW: process.env.NEXT_PUBLIC_WO_PREVIEW ?? "0",
    NEXT_PUBLIC_SOVEREIGN_RELEASE: process.env.NEXT_PUBLIC_SOVEREIGN_RELEASE ?? "0",
  },
  distDir: resolveDistDir(),
  poweredByHeader: false,
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: [
    "@witnessops/ui",
    "@witnessops/config",
    "@witnessops/content",
    "@witnessops/proof",
    "aegis-deterministic",
  ],
  serverExternalPackages: ["blake3"],
  webpack: (config) => {
    // blake3 is an optional native binding used by packages/proof verify paths.
    // witnessops-web never calls it at runtime — externalize to suppress the warning.
    config.resolve.alias["blake3"] = false;
    return config;
  },
  async headers() {
    return [
      {
        source: "/verify-token",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        source: "/api/verify-token",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // Permit the manual beacon only on public information pages. Local tools,
      // auth callbacks, admin, and private result routes retain the default CSP.
      ...["/", "/:section(pricing|privacy|terms|security|media-kit|why|support|review|docs|articles|research|services|catalog|library|why-witnessops)/:path*"].map((source) => ({
        source,
        headers: securityHeaders.filter(({ key }) => key === "Content-Security-Policy").map(({ key, value }) => ({
          key,
          value: value.replace("script-src 'self'", "script-src 'self' https://static.cloudflareinsights.com/beacon.min.js")
            .replace("connect-src 'self'", "connect-src 'self' https://cloudflareinsights.com/cdn-cgi/rum"),
        })),
      })),
      {
        source: "/proofpack",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        source: "/check",
        headers: [
          { key: "Content-Security-Policy", value: `default-src 'self'; ${checkScriptSrc}; worker-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'` },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        source: "/samples/api-key-rotation/v1/:artifact*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/samples/governed-agent-verifier-conformance/v1/:artifact*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/media-kit/logo-system-v1/:asset*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
      {
        source: "/.well-known/witnessops-demo-signing-keys.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, must-revalidate",
          },
        ],
      },
      // Sales one-pagers: open in the browser (new tab), do not force download.
      {
        source: "/assets/one-pagers/:file*",
        headers: [
          {
            key: "Content-Type",
            value: "application/pdf",
          },
          {
            key: "Content-Disposition",
            value: "inline",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
      {
        source: "/verify/skill",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/reviews",
        destination: "/reviews/agent-action-security-review",
        permanent: false,
      },
      {
        source: "/pl/reviews",
        destination: "/pl/reviews/agent-action-security-review",
        permanent: false,
      },
      {
        // Relative Location. A route handler would build the target from the
        // listen host (localhost under next start, 0.0.0.0 under standalone).
        source: "/og/home",
        destination: "/og/witnessops-home-editorial-a-2026-10.png",
        permanent: true,
      },
      {
        source: "/review/sample-cases/offsec-shield-local-server-audit",
        destination: "/review/sample-cases/local-server-security-review",
        permanent: true,
      },
      {
        source: "/review/sample-cases/offsec-shield-local-server-audit/:path*",
        destination: "/review/sample-cases/local-server-security-review/:path*",
        permanent: true,
      },
      {
        source: "/catalog/offsec-access-removed",
        destination: "/reviews",
        permanent: true,
      },
      {
        source: "/pl/catalog/offsec-access-removed",
        destination: "/pl/reviews",
        permanent: true,
      },
      {
        source: "/pl/catalog",
        destination: "/pl/reviews/agent-action-security-review",
        permanent: true,
      },
      {
        source: "/pl/catalog/offsec-external-exposure",
        destination: "/pl/reviews/external-attack-surface-review",
        permanent: true,
      },
      {
        source: "/catalog/offsec",
        destination: "/reviews",
        permanent: true,
      },
      {
        source: "/access-change-proof-run",
        destination: "/reviews",
        permanent: true,
      },
      {
        source: "/catalog/workflow-s",
        destination: "/reviews",
        permanent: true,
      },
      {
        source: "/catalog/workflow-m",
        destination: "/reviews",
        permanent: true,
      },
      {
        source: "/catalog/workflow-l",
        destination: "/reviews",
        permanent: true,
      },
      {
        source: "/catalog/workflow-rerun",
        destination: "/reviews",
        permanent: true,
      },
      {
        source: "/catalog",
        destination: "/reviews/agent-action-security-review",
        permanent: true,
      },
      {
        source: "/catalog/offsec-external-exposure",
        destination: "/reviews/external-attack-surface-review",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
