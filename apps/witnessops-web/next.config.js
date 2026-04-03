const path = require("path");
const { resolveDistDir } = require("../../packages/config/next/resolve-dist-dir");
const { securityHeaders } = require("../../packages/config/next/security-headers");

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: resolveDistDir(),
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: [
    "@public-surfaces/ui",
    "@public-surfaces/config",
    "@public-surfaces/content",
    "@public-surfaces/proof",
  ],
  serverExternalPackages: ["blake3"],
  webpack: (config) => {
    // blake3 is an optional native binding used by packages/proof verify paths.
    // offsec-web never calls it at runtime — externalize to suppress the warning.
    config.resolve.alias["blake3"] = false;
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
