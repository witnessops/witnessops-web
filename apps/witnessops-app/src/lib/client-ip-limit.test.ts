import test from "node:test";
import assert from "node:assert/strict";
import { ClientIpLimiter, clientIpFromProxy } from "./client-ip-limit";

const MAX_TRACKED_IPS = 4096;

function request(headers: Record<string, string> = {}) {
  return new Request("https://app.witnessops.com/api/cli/login", { headers });
}

function trackedAddress(index: number) {
  return `10.${(index >> 16) & 255}.${(index >> 8) & 255}.${index & 255}`;
}

test("an unparseable rightmost hop is not replaced by an earlier address or X-Real-IP", () => {
  const longestIp = "0000:0000:0000:0000:0000:ffff:255.255.255.255";
  assert.equal(longestIp.length, 45);
  const cases: Array<[Record<string, string>, string | null]> = [
    [{}, null],
    [{ "x-forwarded-for": "" }, null],
    [{ "x-forwarded-for": "   " }, null],
    [{ "x-forwarded-for": "", "x-real-ip": "203.0.113.10" }, null],
    [{ "x-forwarded-for": "203.0.113.10, not-an-ip" }, null],
    [{ "x-forwarded-for": "203.0.113.10," }, null],
    [{ "x-forwarded-for": "203.0.113.10, " }, null],
    [{ "x-forwarded-for": "198.51.100.1, 203.0.113.10:443" }, null],
    [{ "x-forwarded-for": "198.51.100.1, [2001:db8::1]" }, null],
    [{ "x-forwarded-for": "198.51.100.1, unknown" }, null],
    [{ "x-forwarded-for": "198.51.100.1, Unknown" }, null],
    [{ "x-forwarded-for": `198.51.100.1, ${"a".repeat(46)}` }, null],
    [{ "x-forwarded-for": "203.0.113.10, 198.51.100.8" }, "198.51.100.8"],
    [{ "x-forwarded-for": "  198.51.100.8  " }, "198.51.100.8"],
    [{ "x-forwarded-for": "203.0.113.10, 2001:db8::1" }, "2001:db8::1"],
    [{ "x-forwarded-for": "not-an-ip", "x-real-ip": "203.0.113.10" }, null],
    [{ "x-real-ip": "unknown" }, null],
    [{ "x-real-ip": "203.0.113.10:443" }, null],
    [{ "x-real-ip": "[2001:db8::1]" }, null],
    [{ "x-real-ip": "a".repeat(46) }, null],
    [{ "x-real-ip": longestIp }, longestIp],
    [{ "x-real-ip": " 203.0.113.10 " }, "203.0.113.10"],
  ];
  for (const [headers, expected] of cases) {
    assert.equal(clientIpFromProxy(request(headers)), expected, JSON.stringify(headers));
  }
});

test("retry-after is the remaining window and is at least one second", () => {
  let now = 1_000_000;
  const limiter = new ClientIpLimiter(1, 60_000, () => now);
  assert.deepEqual(limiter.allow("203.0.113.10"), { allowed: true, retryAfterSeconds: 0 });
  assert.deepEqual(limiter.allow("203.0.113.10"), { allowed: false, retryAfterSeconds: 60 });
  now += 59_001;
  assert.deepEqual(limiter.allow("203.0.113.10"), { allowed: false, retryAfterSeconds: 1 });
  now += 999;
  assert.deepEqual(limiter.allow("203.0.113.10"), { allowed: true, retryAfterSeconds: 0 });
  assert.deepEqual(limiter.allow("198.51.100.9"), { allowed: true, retryAfterSeconds: 0 });
});

test("expired windows are pruned so a saturated table starts enforcing a new address", () => {
  let now = 0;
  const limiter = new ClientIpLimiter(1, 1_000, () => now);
  for (let index = 0; index < MAX_TRACKED_IPS; index += 1) {
    assert.equal(limiter.allow(trackedAddress(index)).allowed, true);
  }
  assert.equal(limiter.allow("192.0.2.10").allowed, true);
  assert.equal(limiter.allow("192.0.2.10").allowed, true);
  now = 1_000;
  assert.deepEqual(limiter.allow("192.0.2.20"), { allowed: true, retryAfterSeconds: 0 });
  assert.deepEqual(limiter.allow("192.0.2.20"), { allowed: false, retryAfterSeconds: 1 });
  assert.equal(limiter.allow("192.0.2.21").allowed, true);
  assert.equal(limiter.allow(null).allowed, true);
});
