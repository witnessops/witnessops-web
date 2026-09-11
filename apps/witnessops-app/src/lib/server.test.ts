import test from "node:test";
import assert from "node:assert/strict";
import { createFoundationService, admitRequest } from "./server";
import { authConfiguration } from "./auth-config";
import { canonicalSource } from "./source-digest";

const origin = "http://127.0.0.1:3020";
function request(path = "/api/workspace", headers = {}, method = "GET") {
  return new Request(`${origin}${path}`, { method, headers: { host: "127.0.0.1:3020", origin, ...headers } });
}
test("unauthenticated product reads and writes fail before database or runner access", async () => {
  const api = createFoundationService({ origin, identity: async () => null, run: async () => { throw new Error("Must not execute"); } });
  for (const endpoint of ["workspace", "assets", "runs", "early-access", "feedback", "events"] as const) for (const method of ["GET", "POST"]) {
    const response = await api.handle(request(`/api/${endpoint}`, {}, method), endpoint);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});
test("mutation admission rejects cross-origin, forwarded host spoofing and unexpected queries", () => {
  for (const candidate of [
    request("/api/runs", { origin: "https://evil.test" }, "POST"),
    request("/api/runs", { "sec-fetch-site": "cross-site" }, "POST"),
    request("/api/runs", { host: "evil.test", "x-forwarded-host": "127.0.0.1:3020" }, "POST"),
    request("/api/runs?hostname=other.com", {}, "POST"),
    request("/api/runs?id=a&id=b"), request("/api/workspace?id=a"),
  ]) assert.throws(() => admitRequest(candidate, origin));
  for (const endpoint of ['events', 'feedback', 'early-access']) {
    assert.throws(() => admitRequest(request(`/api/${endpoint}`, { origin: 'https://evil.test' }, 'POST'), origin));
    assert.throws(() => admitRequest(request(`/api/${endpoint}?userId=other`), origin));
  }
  assert.doesNotThrow(() => admitRequest(request("/api/runs?id=a"), origin));
  assert.doesNotThrow(() => admitRequest(new Request("http://localhost:3020/api/workspace", { headers: { host: "127.0.0.1:3020" } }), origin));
});
test("auth configuration requires host-only Lax cookies and a fixed secure callback", () => {
  const env = { NODE_ENV: "test" as const, WORKOS_API_KEY: "test-placeholder", WORKOS_CLIENT_ID: "client_test", WORKOS_COOKIE_PASSWORD: "non-secret-test-placeholder-32-characters", NEXT_PUBLIC_WORKOS_REDIRECT_URI: `${origin}/callback` };
  assert.equal(authConfiguration(env).origin, origin);
  assert.equal(authConfiguration({ ...env, NEXT_PUBLIC_WORKOS_REDIRECT_URI: "https://app.example.com/callback" }).origin, "https://app.example.com");
  for (const change of [{ WORKOS_COOKIE_DOMAIN: ".example.com" }, { WORKOS_COOKIE_SAMESITE: "none" }, { WORKOS_COOKIE_PASSWORD: "" }, { NEXT_PUBLIC_WORKOS_REDIRECT_URI: "http://app.example.com/callback" }, { NEXT_PUBLIC_WORKOS_REDIRECT_URI: `${origin}/callback?returnTo=https://evil.test` }]) assert.throws(() => authConfiguration({ ...env, ...change }));
});
test("source canonical JSON is UTF-16-key-sorted, preserves arrays and rejects non-JSON values", () => {
  assert.equal(canonicalSource({ z: [3, 1], a: { b: true, a: "é" } }), '{"a":{"a":"é","b":true},"z":[3,1]}');
  assert.equal(canonicalSource({ "10": "a", "2": "b" }), '{"10":"a","2":"b"}');
  for (const value of [undefined, NaN, Infinity, BigInt(1), new Date(), { a: undefined }, [undefined]]) assert.throws(() => canonicalSource(value));
});
