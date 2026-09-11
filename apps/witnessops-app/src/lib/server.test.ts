import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createFoundationService, localAppEnabled, SESSION_COOKIE, SESSION_TTL_MS } from "./server";
import { CHECK_IDS, type Asset, type ExternalSnapshotV1, type Run, type Workspace } from "./model";

const captured = JSON.parse(readFileSync(new URL("../../../../tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json", import.meta.url), "utf8")) as ExternalSnapshotV1;
const originalNodeEnv = process.env.NODE_ENV;
const originalDevSession = process.env.WITNESSOPS_APP_DEV_SESSION;
before(() => { Object.assign(process.env, { NODE_ENV: "development", WITNESSOPS_APP_DEV_SESSION: "1" }); });
after(() => {
  if (originalNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Object.assign(process.env, { NODE_ENV: originalNodeEnv });
  if (originalDevSession === undefined) delete process.env.WITNESSOPS_APP_DEV_SESSION; else process.env.WITNESSOPS_APP_DEV_SESSION = originalDevSession;
});

function snapshot(hostname = captured.target): ExternalSnapshotV1 {
  const copy = structuredClone(captured);
  copy.target = hostname;
  copy.checks.forEach(check => { check.target = hostname; });
  return copy;
}
function request(endpoint: string, method = "POST", value: unknown = {}, session = "", extraHeaders: Record<string, string> = {}) {
  return new Request(`http://127.0.0.1:3020/api/${endpoint}`, {
    method,
    headers: { host: "127.0.0.1:3020", origin: "http://127.0.0.1:3020", "content-type": "application/json", ...(session ? { cookie: session } : {}), ...extraHeaders },
    ...(method === "GET" ? {} : { body: JSON.stringify(value) }),
  });
}
function service(run: (hostname: string) => Promise<ExternalSnapshotV1> = async hostname => snapshot(hostname)) {
  let time = Date.parse("2026-09-11T12:00:00Z");
  const calls: string[] = [];
  const api = createFoundationService({ now: () => time, run: async hostname => { calls.push(hostname); return run(hostname); } });
  return { ...api, calls, advance: (ms: number) => { time += ms; } };
}
type Service = ReturnType<typeof service>;
async function session(api: Service) {
  const response = await api.handle(request("session"), "session");
  assert.equal(response.status, 201);
  const cookie = response.headers.get("set-cookie")!;
  assert.match(cookie, new RegExp(`^${SESSION_COOKIE}=[a-f0-9]{64};`));
  assert.match(cookie, /HttpOnly; SameSite=Strict; Max-Age=3600/);
  return cookie.split(";")[0];
}
async function asset(api: Service, cookie: string, hostname = "witnessops.com") {
  const response = await api.handle(request("assets", "POST", { hostname }, cookie), "assets");
  assert.equal(response.status, 201);
  return response.json() as Promise<Asset>;
}
async function collect(api: Service, cookie: string, assetId: string) {
  return api.handle(request("runs", "POST", { assetId, authorized: true }, cookie), "runs");
}
async function workspace(api: Service, cookie: string) {
  const response = await api.handle(request("workspace", "GET", undefined, cookie), "workspace");
  assert.equal(response.status, 200);
  return response.json() as Promise<Workspace>;
}

test("local session seam requires explicit development mode and exact loopback authority", () => {
  const enabled = { NODE_ENV: "development", WITNESSOPS_APP_DEV_SESSION: "1" } as NodeJS.ProcessEnv;
  for (const host of ["localhost:3020", "127.0.0.1:3020", "[::1]:3020"]) assert.equal(localAppEnabled(host, enabled), true);
  for (const host of [null, "app.witnessops.com", "localhost.evil.test:3020", "localhost:3020/path", "user@localhost:3020"]) assert.equal(localAppEnabled(host, enabled), false);
  for (const mode of ["production", "test"] as const) assert.equal(localAppEnabled("localhost:3020", { ...enabled, NODE_ENV: mode }), false);
  assert.equal(localAppEnabled("localhost:3020", { ...enabled, WITNESSOPS_APP_DEV_SESSION: "0" }), false);
});

test("production request gate stays closed even with a development-session flag", async () => {
  Object.assign(process.env, { NODE_ENV: "production" });
  try {
    const api = service();
    assert.equal((await api.handle(request("session"), "session")).status, 404);
    assert.equal(api.calls.length, 0);
  } finally { Object.assign(process.env, { NODE_ENV: "development" }); }
});

test("missing or unrecognized workspace cookie cannot read, add or run", async () => {
  const api = service();
  for (const endpoint of ["workspace", "assets", "runs"] as const) {
    const method = endpoint === "workspace" ? "GET" : "POST";
    assert.equal((await api.handle(request(endpoint, method), endpoint)).status, 401);
    assert.equal((await api.handle(request(endpoint, method, {}, `${SESSION_COOKIE}=unrecognized`), endpoint)).status, 401);
  }
  assert.deepEqual(api.calls, []);
});

test("cross-origin, forwarded-host spoofing, query and non-loopback requests fail before execution", async () => {
  const api = service();
  const cookie = await session(api);
  const added = await asset(api, cookie);
  const value = { assetId: added.id, authorized: true };
  const requests = [
    request("runs", "POST", value, cookie, { origin: "https://evil.test" }),
    request("runs", "POST", value, cookie, { "sec-fetch-site": "cross-site" }),
    request("runs", "POST", value, cookie, { host: "evil.test", "x-forwarded-host": "127.0.0.1:3020" }),
    new Request("http://evil.test/api/runs", { method: "POST", headers: { host: "127.0.0.1:3020", origin: "http://127.0.0.1:3020", cookie }, body: JSON.stringify(value) }),
    request("runs?hostname=other.com", "POST", value, cookie),
  ];
  for (const candidate of requests) assert.ok([400, 403, 404].includes((await api.handle(candidate, "runs")).status));
  assert.deepEqual(api.calls, []);
});

test("Next internal loopback aliases preserve browser-origin admission without relaxing host or port checks", async () => {
  const api = service();
  const headers = { host: "127.0.0.1:3020", origin: "http://127.0.0.1:3020", "content-type": "application/json" };
  const admitted = await api.handle(new Request("http://localhost:3020/api/session", { method: "POST", headers, body: "{}" }), "session");
  assert.equal(admitted.status, 201);
  const cookie = admitted.headers.get("set-cookie")!.split(";")[0];
  const read = await api.handle(new Request("http://localhost:3020/api/workspace", { headers: { host: "127.0.0.1:3020", cookie } }), "workspace");
  assert.equal(read.status, 200);
  for (const url of ["http://localhost:3021/api/session", "http://evil.test:3020/api/session", "http://192.168.1.2:3020/api/session"]) {
    assert.equal((await api.handle(new Request(url, { method: "POST", headers, body: "{}" }), "session")).status, 404);
  }
  const wrongOrigin = new Request("http://localhost:3020/api/session", { method: "POST", headers: { ...headers, origin: "http://localhost:3020" }, body: "{}" });
  assert.equal((await api.handle(wrongOrigin, "session")).status, 403);
  assert.deepEqual(api.calls, []);
});

test("exact bounded JSON fields reject injected execution options, duplicate keys and oversized bodies", async () => {
  const api = service(), cookie = await session(api), added = await asset(api, cookie);
  const valid = { assetId: added.id, authorized: true };
  for (const value of [
    { ...valid, hostname: "other.com" }, { ...valid, ports: [22] }, { ...valid, transport: {} },
    { ...valid, now: "2020-01-01" }, { ...valid, profile: ["custom"] },
    { assetId: "x".repeat(1100), authorized: true }, [], null,
  ]) assert.equal((await api.handle(request("runs", "POST", value, cookie), "runs")).status, 400);
  const duplicate = new Request("http://127.0.0.1:3020/api/runs", { method: "POST", headers: { host: "127.0.0.1:3020", origin: "http://127.0.0.1:3020", "content-type": "application/json", cookie }, body: `{"assetId":"${added.id}","authorized":false,"authorized":true}` });
  assert.equal((await api.handle(duplicate, "runs")).status, 400);
  for (const headers of [{ "content-type": "text/plain" }, { "content-encoding": "gzip" }] as Record<string, string>[]) assert.equal((await api.handle(request("runs", "POST", valid, cookie, headers), "runs")).status, 400);
  assert.deepEqual(api.calls, []);
});

test("hostname admission uses canonical hostname-only rules before any runner call", async () => {
  const api = service(), cookie = await session(api);
  for (const hostname of ["https://witnessops.com", "127.0.0.1", "localhost", "host.internal", "witnessops.com:443", "user@witnessops.com", "witnessops.com/path"]) {
    assert.equal((await api.handle(request("assets", "POST", { hostname }, cookie), "assets")).status, 400);
  }
  const normalized = await asset(api, cookie, " WITNESSOPS.COM. ");
  assert.equal(normalized.hostname, "witnessops.com");
  assert.equal((await api.handle(request("assets", "POST", { hostname: "witnessops.com" }, cookie), "assets")).status, 409);
  assert.deepEqual(api.calls, []);
});

test("authorization is an explicit boolean and assets remain isolated between sessions", async () => {
  const api = service(), first = await session(api), second = await session(api), added = await asset(api, first);
  for (const authorized of [false, "true", 1, null]) assert.equal((await api.handle(request("runs", "POST", { assetId: added.id, authorized }, first), "runs")).status, 400);
  assert.equal((await collect(api, second, added.id)).status, 404);
  assert.deepEqual((await workspace(api, second)).assets, []);
  assert.deepEqual((await workspace(api, second)).runs, []);
  assert.deepEqual(api.calls, []);
});

test("retains ten-check source fields and digest in append-only runs without aliasing runner data", async () => {
  const supplied = snapshot();
  const api = service(async () => supplied), cookie = await session(api), added = await asset(api, cookie);
  const expected = structuredClone(supplied), response = await collect(api, cookie, added.id);
  assert.equal(response.status, 201);
  for (const [name, value] of Object.entries({ "cache-control": "no-store", "referrer-policy": "no-referrer", "x-robots-tag": "noindex, nofollow" })) assert.equal(response.headers.get(name), value);
  const first = await response.json() as Run;
  assert.deepEqual(first.snapshot, expected);
  assert.deepEqual(first.snapshot.checks.map(check => check.check_id), CHECK_IDS);
  assert.equal(first.sourceDigest, createHash("sha256").update(JSON.stringify(expected)).digest("hex"));
  assert.deepEqual(first.snapshot.usage, expected.usage);
  assert.deepEqual(first.snapshot.network, expected.network);
  supplied.checks[0].interpretation = "Changed after the first response";
  api.advance(60_001);
  const secondResponse = await collect(api, cookie, added.id);
  assert.equal(secondResponse.status, 201);
  const second = await secondResponse.json() as Run;
  const state = await workspace(api, cookie);
  assert.equal(state.runs.length, 2);
  assert.deepEqual(state.runs[0], first);
  assert.deepEqual(state.runs[1], second);
  assert.notEqual(first.id, second.id);
  assert.ok(Date.parse(first.createdAt) < Date.parse(second.createdAt));
  assert.notEqual(first.sourceDigest, second.sourceDigest);
  assert.deepEqual(api.calls, ["witnessops.com", "witnessops.com"]);
});

test("per-host cooldown is normalized, cross-session and allows a new immutable run after one minute", async () => {
  const api = service(), first = await session(api), second = await session(api);
  const a = await asset(api, first), b = await asset(api, second, "WITNESSOPS.COM.");
  assert.equal((await collect(api, first, a.id)).status, 201);
  assert.equal((await collect(api, second, b.id)).status, 429);
  api.advance(59_999);
  assert.equal((await collect(api, first, a.id)).status, 429);
  api.advance(1);
  assert.equal((await collect(api, first, a.id)).status, 201);
  assert.equal(api.calls.length, 2);
});

test("injected wrong-target or malformed snapshots cannot be retained and internal errors do not leak", async () => {
  for (const run of [async () => snapshot("other.com"), async () => ({ ...snapshot(), checks: [] }), async () => { throw new Error("internal resolver detail"); }]) {
    const api = service(run), cookie = await session(api), added = await asset(api, cookie);
    const response = await collect(api, cookie, added.id);
    assert.equal(response.status, 422);
    assert.doesNotMatch(await response.text(), /internal resolver detail/);
    assert.equal((await workspace(api, cookie)).runs.length, 0);
  }
});

test("global run rate admits only ten distinct hostname runs per minute", async () => {
  const api = service(), cookie = await session(api);
  for (let index = 0; index < 11; index++) {
    const added = await asset(api, cookie, `host${index}.witnessops.com`);
    assert.equal((await collect(api, cookie, added.id)).status, index < 10 ? 201 : 429);
  }
  assert.equal(api.calls.length, 10);
});

test("two concurrent runs maximum, with admission restored after completion", async () => {
  const pending = new Map<string, (value: ExternalSnapshotV1) => void>();
  const api = service(hostname => new Promise(resolve => pending.set(hostname, resolve))), cookie = await session(api);
  const a = await asset(api, cookie, "one.witnessops.com"), b = await asset(api, cookie, "two.witnessops.com"), c = await asset(api, cookie, "three.witnessops.com");
  const first = collect(api, cookie, a.id);
  const second = collect(api, cookie, b.id);
  // The injected runner is reached asynchronously after bounded body admission.
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(pending.size, 2);
  assert.equal((await collect(api, cookie, c.id)).status, 429);
  pending.get(a.hostname)!(snapshot(a.hostname)); pending.get(b.hostname)!(snapshot(b.hostname));
  assert.equal((await first).status, 201); assert.equal((await second).status, 201);
  const third = collect(api, cookie, c.id);
  await new Promise<void>(resolve => setImmediate(resolve));
  pending.get(c.hostname)!(snapshot(c.hostname));
  assert.equal((await third).status, 201);
});

test("clear and expiry remove session data and cannot reuse the old cookie", async () => {
  const api = service(), cookie = await session(api), added = await asset(api, cookie);
  assert.equal((await collect(api, cookie, added.id)).status, 201);
  const cleared = await api.handle(request("session", "DELETE", {}, cookie), "session");
  assert.equal(cleared.status, 200); assert.match(cleared.headers.get("set-cookie")!, /Max-Age=0/);
  assert.equal((await api.handle(request("workspace", "GET", undefined, cookie), "workspace")).status, 401);
  const fresh = await session(api);
  assert.deepEqual((await workspace(api, fresh)).runs, []);
  api.advance(SESSION_TTL_MS);
  assert.equal((await api.handle(request("workspace", "GET", undefined, fresh), "workspace")).status, 401);
});

test("session cleared while collecting cannot retain or return a completed snapshot", async () => {
  let resolveRun: (value: ExternalSnapshotV1) => void = () => {};
  const api = service(() => new Promise(resolve => { resolveRun = resolve; })), cookie = await session(api), added = await asset(api, cookie);
  const pending = collect(api, cookie, added.id);
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal((await api.handle(request("session", "DELETE", {}, cookie), "session")).status, 200);
  resolveRun(snapshot());
  const response = await pending;
  assert.equal(response.status, 401);
  assert.doesNotMatch(await response.text(), /checks|sourceDigest/);
});
