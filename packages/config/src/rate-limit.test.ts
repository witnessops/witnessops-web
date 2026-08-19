import assert from "node:assert/strict";
import test from "node:test";
import {
  checkRateLimit,
  getClientIp,
  rateLimitErrorBody,
  _cleanupExpiredEntries,
  _resetAllStores,
} from "./rate-limit";

// Reset state before each test
test.beforeEach(() => {
  _resetAllStores();
});

// ── checkRateLimit ──

test("first request is allowed", () => {
  const result = checkRateLimit("test", "1.2.3.4", { limit: 10, windowMs: 60_000 });
  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 9);
});

test("requests up to limit are allowed", () => {
  const config = { limit: 3, windowMs: 60_000 };
  const r1 = checkRateLimit("test", "1.2.3.4", config);
  const r2 = checkRateLimit("test", "1.2.3.4", config);
  const r3 = checkRateLimit("test", "1.2.3.4", config);

  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 2);
  assert.equal(r2.allowed, true);
  assert.equal(r2.remaining, 1);
  assert.equal(r3.allowed, true);
  assert.equal(r3.remaining, 0);
});

test("request beyond limit is rejected", () => {
  const config = { limit: 2, windowMs: 60_000 };
  checkRateLimit("test", "1.2.3.4", config);
  checkRateLimit("test", "1.2.3.4", config);
  const r3 = checkRateLimit("test", "1.2.3.4", config);

  assert.equal(r3.allowed, false);
  assert.equal(r3.remaining, 0);
  assert.ok(r3.retryAfterSeconds > 0);
  assert.ok(r3.retryAfterSeconds <= 60);
});

test("different keys are independently counted", () => {
  const config = { limit: 1, windowMs: 60_000 };
  const r1 = checkRateLimit("test", "1.1.1.1", config);
  const r2 = checkRateLimit("test", "2.2.2.2", config);

  assert.equal(r1.allowed, true);
  assert.equal(r2.allowed, true);

  const r3 = checkRateLimit("test", "1.1.1.1", config);
  assert.equal(r3.allowed, false);

  const r4 = checkRateLimit("test", "2.2.2.2", config);
  assert.equal(r4.allowed, false);
});

test("different namespaces are independently counted", () => {
  const config = { limit: 1, windowMs: 60_000 };
  const r1 = checkRateLimit("legacy", "1.1.1.1", config);
  const r2 = checkRateLimit("canonical", "1.1.1.1", config);

  assert.equal(r1.allowed, true);
  assert.equal(r2.allowed, true);
});

test("window expiry resets counter", () => {
  const config = { limit: 1, windowMs: 1 }; // 1ms window
  checkRateLimit("test", "1.2.3.4", config);

  // Wait for window to expire
  const start = Date.now();
  while (Date.now() - start < 5) {
    // busy wait 5ms
  }

  const r2 = checkRateLimit("test", "1.2.3.4", config);
  assert.equal(r2.allowed, true);
});

test("unknown fallback key still rate-limits", () => {
  const config = { limit: 1, windowMs: 60_000 };
  const r1 = checkRateLimit("test", "unknown", config);
  const r2 = checkRateLimit("test", "unknown", config);

  assert.equal(r1.allowed, true);
  assert.equal(r2.allowed, false);
});

test("cleanup retains entries until each entry's own window expires", () => {
  const originalDateNow = Date.now;
  const anchor = originalDateNow();
  try {
    Date.now = () => anchor;
    checkRateLimit("short", "client", { limit: 1, windowMs: 60_000 });
    checkRateLimit("long", "client", { limit: 1, windowMs: 15 * 60_000 });

    Date.now = () => anchor + 60_001;
    _cleanupExpiredEntries();

    Date.now = () => anchor;
    assert.equal(
      checkRateLimit("short", "client", { limit: 1, windowMs: 60_000 }).allowed,
      true,
    );
    assert.equal(
      checkRateLimit("long", "client", { limit: 1, windowMs: 15 * 60_000 }).allowed,
      false,
    );
  } finally {
    Date.now = originalDateNow;
  }
});

// ── getClientIp ──

test("getClientIp uses the proxy-adjacent x-forwarded-for value", () => {
  const request = new Request("https://example.com", {
    headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
  });
  assert.equal(getClientIp(request), "5.6.7.8");
});

test("getClientIp does not accept a spoofed leftmost forwarded value", () => {
  const request = new Request("https://example.com", {
    headers: { "x-forwarded-for": "198.51.100.10, 203.0.113.20" },
  });
  assert.equal(getClientIp(request), "203.0.113.20");
});

test("getClientIp uses x-real-ip as fallback", () => {
  const request = new Request("https://example.com", {
    headers: { "x-real-ip": "9.8.7.6" },
  });
  assert.equal(getClientIp(request), "9.8.7.6");
});

test("getClientIp returns unknown when no headers present", () => {
  const request = new Request("https://example.com");
  assert.equal(getClientIp(request), "unknown");
});

test("getClientIp ignores spoofed malformed values left of the proxy-adjacent hop", () => {
  const request = new Request("https://example.com", {
    headers: { "x-forwarded-for": "not-an-ip, 5.6.7.8" },
  });
  assert.equal(getClientIp(request), "5.6.7.8");
});

test("getClientIp fails closed when the proxy-adjacent value is malformed", () => {
  const request = new Request("https://example.com", {
    headers: { "x-forwarded-for": "203.0.113.20, not-an-ip" },
  });
  assert.equal(getClientIp(request), "unknown");
});

test("getClientIp accepts IPv6 x-real-ip", () => {
  const request = new Request("https://example.com", {
    headers: { "x-real-ip": "2001:db8::1" },
  });
  assert.equal(getClientIp(request), "2001:db8::1");
});

test("getClientIp treats malformed IPv6-like values as unknown", () => {
  for (const value of ["a:", ":::", "1.2.3.4:1234", "1.2.3.4:"]) {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": value },
    });
    assert.equal(getClientIp(request), "unknown", value);
  }
});

// ── rateLimitErrorBody ──

test("rateLimitErrorBody produces correct shape", () => {
  const body = rateLimitErrorBody(42);
  assert.equal(body.ok, false);
  assert.equal(body.error, "Rate limit exceeded");
  assert.equal(body.code, "RATE_LIMITED");
  assert.equal(body.retryAfterSeconds, 42);
});
