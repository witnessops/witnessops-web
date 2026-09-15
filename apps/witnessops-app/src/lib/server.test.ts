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

const productionOrigin = "https://app.witnessops.com";
function proxyRequest(overrides: Record<string, string> = {}, url = "https://0.0.0.0:3020/api/workspace") {
  return new Request(url, { headers: { host: "app.witnessops.com", "x-forwarded-host": "app.witnessops.com", "x-forwarded-proto": "https", ...overrides } });
}
test("standalone bind URL reproduces production rejection until fixed proxy mode is explicitly enabled", () => {
  assert.throws(() => admitRequest(proxyRequest(), productionOrigin));
  assert.doesNotThrow(() => admitRequest(proxyRequest(), productionOrigin, "caddy-loopback-v1"));
  assert.throws(() => admitRequest(proxyRequest(), productionOrigin, "unknown"));
});
test("fixed proxy contract rejects unapproved hosts, schemes, origins and forwarding chains", () => {
  const rejectedHeaders: Record<string, string>[] = [
    { host: "localhost" }, { host: "arbitrary.example" },
    { "x-forwarded-host": "attacker.example" }, { "x-forwarded-host": "app.witnessops.com:8443" },
    { "x-forwarded-host": "app.witnessops.com, attacker.example" },
    { "x-forwarded-proto": "http" }, { "x-forwarded-proto": "https,http" },
    { origin: "https://arbitrary.example" }, { origin: "http://127.0.0.1:3020" },
    { forwarded: "malformed" }, { forwarded: "host=app.witnessops.com;proto=https" },
  ];
  for (const headers of rejectedHeaders) assert.throws(() => admitRequest(proxyRequest(headers), productionOrigin, "caddy-loopback-v1"));
  for (const url of ["http://0.0.0.0:3020/api/workspace", "https://127.0.0.1:3020/api/workspace", "https://attacker.example/api/workspace", "https://0.0.0.0:8443/api/workspace"]) {
    assert.throws(() => admitRequest(proxyRequest({}, url), productionOrigin, "caddy-loopback-v1"));
  }
  for (const missing of ["host", "x-forwarded-host", "x-forwarded-proto"]) {
    const request = proxyRequest(); request.headers.delete(missing);
    assert.throws(() => admitRequest(request, productionOrigin, "caddy-loopback-v1"));
  }
  assert.throws(() => admitRequest(proxyRequest(), "http://127.0.0.1:3020", "caddy-loopback-v1"));
  assert.throws(() => admitRequest(proxyRequest(), "https://staging.example", "caddy-loopback-v1"));
});
test("correct production proxy request reaches authentication without database or execution", async () => {
  const service = createFoundationService({ origin: productionOrigin, proxyMode: "caddy-loopback-v1", identity: async () => null, run: async () => { throw new Error("Must not execute"); } });
  const response = await service.handle(proxyRequest(), "workspace");
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Sign in to WitnessOps." });
});
