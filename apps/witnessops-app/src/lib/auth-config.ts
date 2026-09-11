/** Fixed server configuration, never inferred from a posted host/redirect. */
export function authConfiguration(env = process.env) {
  if (!env.WORKOS_API_KEY || !env.WORKOS_CLIENT_ID || (env.WORKOS_COOKIE_PASSWORD?.length ?? 0) < 32) throw new Error("WorkOS configuration required");
  if (env.WORKOS_COOKIE_DOMAIN) throw new Error("App sessions must be host-only");
  if (env.WORKOS_COOKIE_SAMESITE && env.WORKOS_COOKIE_SAMESITE.toLowerCase() !== "lax") throw new Error("App sessions require SameSite=Lax");
  const callback = new URL(env.NEXT_PUBLIC_WORKOS_REDIRECT_URI ?? "");
  if (callback.pathname !== "/callback" || callback.search || callback.hash || callback.username || callback.password) throw new Error("Fixed callback required");
  if (callback.protocol !== "https:" && !(callback.protocol === "http:" && callback.hostname === "127.0.0.1")) throw new Error("HTTPS required outside local development");
  return { origin: callback.origin, callback: callback.href, issuer: `https://api.workos.com/user_management/${env.WORKOS_CLIENT_ID}` };
}
