const path = require("node:path");
const { appSecurityHeaders } = require("./src/lib/app-security-headers");
const { aasrBuildProfile } = require('./src/lib/aasr-staging/build-profile');
const profile = aasrBuildProfile();

/** @type {import('next').NextConfig} */
module.exports = {
  // Browser fixtures use separate output so they cannot overwrite a live local sign-in build.
  poweredByHeader: false,
  env: {
    WITNESSOPS_COMPILED_BUILD_PROFILE: profile.profile,
    WITNESSOPS_COMPILED_STAGING_ORIGIN: profile.origin,
    WITNESSOPS_COMPILED_STAGING_WORKOS_CLIENT_ID: profile.workosClientId,
    WITNESSOPS_COMPILED_STAGING_DATABASE_SHA256: profile.databaseSha256,
  },
  logging: { incomingRequests: { ignore: [/^\/callback(?:\?|$)/] } },
  distDir: process.env.WITNESSOPS_APP_BROWSER_TEST === "1" ? ".next-browser" : process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@witnessops/ui", "@witnessops/config"],
  async headers() {
    // appSecurityHeaders throws if the shared form-action directive or Referrer-Policy entry is missing.
    return [{ source: "/:path*", headers: appSecurityHeaders() }];
  },
};
