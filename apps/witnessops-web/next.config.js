const path = require("path");
const { resolveDistDir } = require("../../packages/config/next/resolve-dist-dir");
const { securityHeaders } = require("../../packages/config/next/security-headers");

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: resolveDistDir(),
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
        destination: "/catalog",
        permanent: true,
      },
      {
        source: "/pl/catalog/offsec-access-removed",
        destination: "/pl/catalog",
        permanent: true,
      },
      {
        source: "/catalog/offsec",
        destination: "/catalog",
        permanent: true,
      },
      {
        source: "/access-change-proof-run",
        destination: "/catalog/workflows",
        permanent: true,
      },
      {
        source: "/catalog/workflow-s",
        destination: "/catalog/workflows",
        permanent: true,
      },
      {
        source: "/catalog/workflow-m",
        destination: "/catalog/workflows",
        permanent: true,
      },
      {
        source: "/catalog/workflow-l",
        destination: "/catalog/workflows",
        permanent: true,
      },
      {
        source: "/catalog/workflow-rerun",
        destination: "/catalog/workflows",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
