const path = require("node:path");
const { securityHeaders } = require("../../packages/config/next/security-headers");

/** @type {import('next').NextConfig} */
module.exports = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@witnessops/ui", "@witnessops/config"],
  async headers() {
    return [{ source: "/:path*", headers: [...securityHeaders,
      { key: "Cache-Control", value: "no-store" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "Referrer-Policy", value: "no-referrer" },
    ] }];
  },
};
