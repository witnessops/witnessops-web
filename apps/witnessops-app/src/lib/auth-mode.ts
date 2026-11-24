/** Select the app identity provider explicitly; existing deployments stay on WorkOS. */
export function appAuthMode(env: Record<string, string | undefined> = process.env): "workos" | "keycloak" {
  const mode = env.WITNESSOPS_APP_AUTH_PROVIDER ?? "workos";
  if (mode !== "workos" && mode !== "keycloak") {
    throw new Error("Unsupported app authentication provider");
  }
  // The separately bound AASR staging artifact has a fixed WorkOS client and
  // callback. It must never inherit an unrelated app identity cutover.
  if (mode === "keycloak" && env.WITNESSOPS_BUILD_PROFILE === "aasr-staging") {
    throw new Error("Keycloak is not admitted in AASR staging");
  }
  return mode;
}
