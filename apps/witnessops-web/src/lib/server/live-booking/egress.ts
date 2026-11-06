const ALLOWED_HOSTS = new Set([
  "oauth2.googleapis.com",
  "www.googleapis.com",
  "api.resend.com",
]);

export function assertLiveBookingEgress(target: string): URL {
  const url = new URL(target);
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname) || url.username || url.password) {
    throw new Error("egress_denied");
  }
  return url;
}

export async function liveBookingFetch(
  target: string,
  init: RequestInit,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<Response> {
  assertLiveBookingEgress(target);
  return fetchImpl(target, { ...init, redirect: "error", cache: "no-store" });
}
