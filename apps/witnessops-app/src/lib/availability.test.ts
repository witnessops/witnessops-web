import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import { CliAuthStore } from "./db/cli-auth";
import { SharePasswordStore } from "./db/share-passwords";
import { IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MS } from "./db/pool";
import { createCliAuthService } from "./cli-auth-service";
import { createShareService } from "./share-server";
import { CLI_LOGIN_IP_LIMIT, CLI_LOGIN_IP_WINDOW_MS, ClientIpLimiter, SHARE_UNLOCK_IP_LIMIT, SHARE_UNLOCK_IP_WINDOW_MS, clientIpFromProxy } from "./client-ip-limit";

const origin = "http://127.0.0.1:3020";

test("idle in transaction timeout outlives the finalizer process window", () => {
  assert.equal(IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MS, 150_000);
  assert.ok(IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MS > 120_000);
});

test("proxy client IP uses the rightmost forwarded hop and ignores an unparseable value", () => {
  assert.equal(clientIpFromProxy(new Request("https://app.witnessops.com/api/cli/login")), null);
  assert.equal(clientIpFromProxy(new Request("https://app.witnessops.com/api/cli/login", { headers: { "x-forwarded-for": "not-an-ip" } })), null);
  assert.equal(clientIpFromProxy(new Request("https://app.witnessops.com/api/cli/login", { headers: { "x-forwarded-for": "unknown" } })), null);
  assert.equal(clientIpFromProxy(new Request("https://app.witnessops.com/api/cli/login", { headers: { "x-forwarded-for": "198.51.100.1, 203.0.113.10" } })), "203.0.113.10");
  assert.equal(clientIpFromProxy(new Request("https://app.witnessops.com/api/cli/login", { headers: { "x-forwarded-for": "not-an-ip", "x-real-ip": "203.0.113.10" } })), null);
  assert.equal(clientIpFromProxy(new Request("https://app.witnessops.com/api/cli/login", { headers: { "x-real-ip": "2001:db8::1" } })), "2001:db8::1");
});

test("a full address table does not deny a new address through one overflow bucket", () => {
  const limiter = new ClientIpLimiter(1, 60_000, () => 1_000_000);
  for (let index = 0; index < 4096; index += 1) {
    const ip = `10.${(index >> 16) & 255}.${(index >> 8) & 255}.${index & 255}`;
    assert.equal(limiter.allow(ip).allowed, true);
  }
  assert.equal(limiter.allow("10.0.0.0").allowed, false);
  assert.equal(limiter.allow("192.0.2.10").allowed, true);
  assert.equal(limiter.allow("192.0.2.10").allowed, true);
  assert.equal(limiter.allow(null).allowed, true);
});
test("per-IP windows do not share an unknown bucket and follow the injected clock", () => {
  let now = 1_000_000;
  const limiter = new ClientIpLimiter(2, 60_000, () => now);
  assert.equal(limiter.allow("203.0.113.10").allowed, true);
  assert.equal(limiter.allow("203.0.113.10").allowed, true);
  assert.equal(limiter.allow("203.0.113.10").allowed, false);
  assert.equal(limiter.allow("203.0.113.11").allowed, true);
  for (let index = 0; index < 5; index += 1) {
    assert.equal(limiter.allow(null).allowed, true);
  }
  now += 60_000;
  assert.equal(limiter.allow("203.0.113.10").allowed, true);
});

test("CLI login per-IP limit does not bucket missing or unparseable addresses together", async () => {
  let now = 1_000_000;
  let created = 0;
  const original = CliAuthStore.prototype.create;
  CliAuthStore.prototype.create = async function () {
    created += 1;
    return { device: "d".repeat(43), userCode: "ABCD-EFGH-IJKL", expiresAt: "2026-01-01T00:00:00.000Z", interval: 5 };
  };
  try {
    const service = createCliAuthService({ origin, pool: {} as Pool, ipLimiter: new ClientIpLimiter(2, 60_000, () => now) });
    const login = (ip?: string) => {
      const headers: Record<string, string> = { host: "127.0.0.1:3020", origin, "content-type": "application/json" };
      if (ip !== undefined) headers["x-forwarded-for"] = ip;
      return new Request(`${origin}/api/cli/login`, { method: "POST", headers, body: "{}" });
    };
    assert.equal((await service.handle(login("203.0.113.10"), "login")).status, 201);
    assert.equal((await service.handle(login("203.0.113.10"), "login")).status, 201);
    const limited = await service.handle(login("203.0.113.10"), "login");
    assert.equal(limited.status, 429);
    assert.deepEqual(await limited.json(), { code: "busy" });
    assert.equal(created, 2);
    assert.equal((await service.handle(login("203.0.113.11"), "login")).status, 201);
    assert.equal((await service.handle(login(), "login")).status, 201);
    assert.equal((await service.handle(login("not-an-ip"), "login")).status, 201);
    assert.equal((await service.handle(login("also-not-an-ip"), "login")).status, 201);
    assert.equal(created, 6);
    now += 60_000;
    assert.equal((await service.handle(login("203.0.113.10"), "login")).status, 201);
  } finally { CliAuthStore.prototype.create = original; }
});

test("share unlock per-IP limit leaves unknown addresses on the per-link limits", async () => {
  let unlocks = 0;
  const original = SharePasswordStore.prototype.unlock;
  SharePasswordStore.prototype.unlock = async function () {
    unlocks += 1;
    return { unlock: "u".repeat(43), expiresAt: "2026-01-01T00:30:00.000Z" };
  };
  try {
    const service = createShareService({ origin, pool: {} as Pool, unlockLimiter: new ClientIpLimiter(2, 60_000, () => 1_000_000) });
    const unlock = (ip?: string) => {
      const headers: Record<string, string> = { host: "127.0.0.1:3020", origin, "content-type": "application/json" };
      if (ip !== undefined) headers["x-forwarded-for"] = ip;
      return new Request(`${origin}/api/shares`, { method: "POST", headers, body: JSON.stringify({ action: "unlock", token: "t".repeat(43), password: "synthetic passphrase" }) });
    };
    assert.equal((await service(unlock("203.0.113.20"), true)).status, 200);
    assert.equal((await service(unlock("203.0.113.20"), true)).status, 200);
    const limited = await service(unlock("203.0.113.20"), true);
    assert.equal(limited.status, 429);
    assert.equal((await limited.json()).error, "Too many unlock attempts from this network. Try again shortly.");
    assert.match(limited.headers.get("retry-after") ?? "", /^[1-9]\d*$/);
    assert.equal(unlocks, 2);
    assert.equal((await service(unlock("203.0.113.21"), true)).status, 200);
    assert.equal((await service(unlock(), true)).status, 200);
    assert.equal((await service(unlock("not-an-ip"), true)).status, 200);
    assert.equal(unlocks, 5);
  } finally { SharePasswordStore.prototype.unlock = original; }
});

test("production CLI login and share unlock limits are per address and use their own windows", async () => {
  assert.equal(CLI_LOGIN_IP_LIMIT, 10);
  assert.equal(CLI_LOGIN_IP_WINDOW_MS, 60_000);
  assert.equal(SHARE_UNLOCK_IP_LIMIT, 10);
  assert.equal(SHARE_UNLOCK_IP_WINDOW_MS, 15 * 60_000);
  let now = 5_000_000;
  let created = 0;
  let unlocks = 0;
  const originalCreate = CliAuthStore.prototype.create;
  const originalUnlock = SharePasswordStore.prototype.unlock;
  CliAuthStore.prototype.create = async function () {
    created += 1;
    return { device: "d".repeat(43), userCode: "ABCD-EFGH-IJKL", expiresAt: "2026-01-01T00:00:00.000Z", interval: 5 };
  };
  SharePasswordStore.prototype.unlock = async function () {
    unlocks += 1;
    return { unlock: "u".repeat(43), expiresAt: "2026-01-01T00:30:00.000Z" };
  };
  const login = (ip?: string) => {
    const headers: Record<string, string> = { host: "127.0.0.1:3020", origin, "content-type": "application/json" };
    if (ip !== undefined) headers["x-forwarded-for"] = ip;
    return new Request(`${origin}/api/cli/login`, { method: "POST", headers, body: "{}" });
  };
  const unlock = (ip?: string) => {
    const headers: Record<string, string> = { host: "127.0.0.1:3020", origin, "content-type": "application/json" };
    if (ip !== undefined) headers["x-forwarded-for"] = ip;
    return new Request(`${origin}/api/shares`, { method: "POST", headers, body: JSON.stringify({ action: "unlock", token: "t".repeat(43), password: "synthetic passphrase" }) });
  };
  try {
    const cli = createCliAuthService({ origin, pool: {} as Pool, now: () => now });
    for (let index = 0; index < CLI_LOGIN_IP_LIMIT; index += 1) {
      assert.equal((await cli.handle(login("203.0.113.50"), "login")).status, 201);
    }
    const limitedLogin = await cli.handle(login("203.0.113.50"), "login");
    assert.equal(limitedLogin.status, 429);
    assert.deepEqual(await limitedLogin.json(), { code: "busy" });
    assert.equal(limitedLogin.headers.get("retry-after"), "5");
    assert.equal(created, CLI_LOGIN_IP_LIMIT);
    assert.equal((await cli.handle(login("203.0.113.51"), "login")).status, 201);
    for (let index = 0; index < CLI_LOGIN_IP_LIMIT + 1; index += 1) {
      assert.equal((await cli.handle(login(), "login")).status, 201);
    }
    now += CLI_LOGIN_IP_WINDOW_MS;
    assert.equal((await cli.handle(login("203.0.113.50"), "login")).status, 201);

    now = 5_000_000;
    const shares = createShareService({ origin, pool: {} as Pool, now: () => now });
    for (let index = 0; index < SHARE_UNLOCK_IP_LIMIT; index += 1) {
      assert.equal((await shares(unlock("203.0.113.60"), true)).status, 200);
    }
    const limitedUnlock = await shares(unlock("203.0.113.60"), true);
    assert.equal(limitedUnlock.status, 429);
    assert.equal((await limitedUnlock.json()).error, "Too many unlock attempts from this network. Try again shortly.");
    assert.equal(limitedUnlock.headers.get("retry-after"), String(SHARE_UNLOCK_IP_WINDOW_MS / 1000));
    assert.equal(unlocks, SHARE_UNLOCK_IP_LIMIT);
    now += 1_000;
    const laterUnlock = await shares(unlock("203.0.113.60"), true);
    assert.equal(laterUnlock.status, 429);
    assert.equal(laterUnlock.headers.get("retry-after"), String((SHARE_UNLOCK_IP_WINDOW_MS - 1_000) / 1000));
    assert.equal((await shares(unlock("203.0.113.61"), true)).status, 200);
    for (let index = 0; index < SHARE_UNLOCK_IP_LIMIT + 1; index += 1) {
      assert.equal((await shares(unlock(), true)).status, 200);
    }
    now += SHARE_UNLOCK_IP_WINDOW_MS - 1_000;
    assert.equal((await shares(unlock("203.0.113.60"), true)).status, 200);
  } finally {
    CliAuthStore.prototype.create = originalCreate;
    SharePasswordStore.prototype.unlock = originalUnlock;
  }
});
