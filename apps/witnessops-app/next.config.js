const path = require("node:path");
const { securityHeaders } = require("../../packages/config/next/security-headers");

/** @type {import('next').NextConfig} */
module.exports = {
  // Browser fixtures use separate output so they cannot overwrite a live local sign-in build.
  logging: { incomingRequests: { ignore: [/^\/callback(?:\?|$)/] } },
  distDir: process.env.WITNESSOPS_APP_BROWSER_TEST === "1" ? ".next-browser" : process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@witnessops/ui", "@witnessops/config"],
  async headers() {
    return [{ source: "/:path*", headers: [...securityHeaders.map(header => header.key === "Content-Security-Policy"
      ? { ...header, value: header.value.replace("form-action 'self'", "form-action 'self' https://api.workos.com") }
      : header),
      { key: "Cache-Control", value: "no-store" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "Referrer-Policy", value: "no-referrer" },
    ] }];
  },
};
