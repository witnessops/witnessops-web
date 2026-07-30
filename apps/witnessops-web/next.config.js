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
        source: "/:path*",
        headers: securityHeaders,
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
    ];
  },
};

module.exports = nextConfig;
