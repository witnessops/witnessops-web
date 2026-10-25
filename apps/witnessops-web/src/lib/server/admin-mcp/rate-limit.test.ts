import assert from "node:assert/strict";
import test from "node:test";

import { handleAdminMcpPost } from "./gate";
import {
  AUTH_FAILURE_BLOCK_MS,
  AUTH_FAILURE_LIMIT,
  AUTH_FAILURE_WINDOW_MS,
  PRE_AUTH_IP_LIMIT,
} from "./constants";
import {
  createAdminMcpFixture,
  FIXTURE_NOW,
  initializeBody,
  syntheticToken,
} from "./fixture.test-support";
import {
  authFailureBlocked,
  consumePreAuthIp,
  noteAuthFailure,
  resetAdminMcpLimitsForTests,
} from "./rate-limit";

const SECRET = "a".repeat(43);

function bearer(clientId: string): string {
  return `wo_mcp_${clientId}_${SECRET}`;
}

function requestFor(clientId: string | null, ip?: string): Request {
  const headers = new Headers();
  if (ip) headers.set("x-forwarded-for", ip);
  if (clientId !== null) headers.set("authorization", `Bearer ${bearer(clientId)}`);
  return new Request("https://witnessops.com/api/agent/mcp", { method: "POST", headers });
}

function gateRequest(token: string | null, init: { ip?: string; host?: string; body?: string } = {}): Request {
  const headers = new Headers();
  headers.set("host", init.host ?? "witnessops.com");
  headers.set("content-type", "application/json");
  if (init.ip) headers.set("x-forwarded-for", init.ip);
  if (token !== null) headers.set("authorization", `Bearer ${token}`);
  return new Request("https://witnessops.com/api/agent/mcp", {
    method: "POST",
    headers,
    body: init.body ?? JSON.stringify({ jsonrpc: "2.0", id: "1", method: "ping" }),
  });
}

test("unknown-IP pre-auth buckets are per claimed client and real IPs stay shared", () => {
  resetAdminMcpLimitsForTests();
  try {
    for (let attempt = 0; attempt < PRE_AUTH_IP_LIMIT; attempt += 1) {
      assert.equal(consumePreAuthIp(requestFor("alpha")).ok, true);
    }
    assert.equal(consumePreAuthIp(requestFor("alpha")).ok, false);
    assert.equal(consumePreAuthIp(requestFor("beta")).ok, true);
    assert.equal(consumePreAuthIp(requestFor(null)).ok, true);

    const shared = "203.0.113.44";
    const other = "203.0.113.45";
    for (let attempt = 0; attempt < PRE_AUTH_IP_LIMIT; attempt += 1) {
      assert.equal(consumePreAuthIp(requestFor("alpha", shared)).ok, true);
    }
    assert.equal(consumePreAuthIp(requestFor("beta", shared)).ok, false);
    assert.equal(consumePreAuthIp(requestFor("beta", other)).ok, true);

    const realIpOnly = requestFor("alpha");
    realIpOnly.headers.set("x-real-ip", "198.51.100.20");
    const sameRealIp = requestFor("beta");
    sameRealIp.headers.set("x-real-ip", "198.51.100.20");
    for (let attempt = 0; attempt < PRE_AUTH_IP_LIMIT; attempt += 1) {
      assert.equal(consumePreAuthIp(realIpOnly).ok, true);
    }
    assert.equal(consumePreAuthIp(sameRealIp).ok, false);
  } finally {
    resetAdminMcpLimitsForTests();
  }
});

test("unknown-IP auth failures block only that claimed client", () => {
  resetAdminMcpLimitsForTests();
  const now = FIXTURE_NOW;
  try {
    for (let attempt = 0; attempt < AUTH_FAILURE_LIMIT; attempt += 1) {
      noteAuthFailure(requestFor("alpha"), now);
    }
    assert.equal(authFailureBlocked(requestFor("alpha"), now).ok, false);
    assert.equal(authFailureBlocked(requestFor("beta"), now).ok, true);
    assert.equal(authFailureBlocked(requestFor(null), now).ok, true);
    assert.equal(authFailureBlocked(requestFor("alpha"), now + AUTH_FAILURE_BLOCK_MS).ok, true);

    for (let attempt = 0; attempt < AUTH_FAILURE_LIMIT; attempt += 1) {
      noteAuthFailure(requestFor(null), now);
    }
    const malformed = new Request("https://witnessops.com/api/agent/mcp", {
      method: "POST",
      headers: { authorization: "Bearer not-a-token" },
    });
    assert.equal(authFailureBlocked(malformed, now).ok, false);
    assert.equal(authFailureBlocked(requestFor("beta"), now).ok, true);

    const shared = "203.0.113.50";
    for (let attempt = 0; attempt < AUTH_FAILURE_LIMIT; attempt += 1) {
      noteAuthFailure(requestFor("alpha", shared), now);
    }
    assert.equal(authFailureBlocked(requestFor("beta", shared), now).ok, false);
    assert.equal(authFailureBlocked(requestFor("beta", "203.0.113.51"), now).ok, true);

    const invalidForwarded = requestFor("gamma");
    invalidForwarded.headers.set("x-forwarded-for", "not-an-ip");
    const invalidOther = requestFor("delta");
    invalidOther.headers.set("x-forwarded-for", "not-an-ip");
    for (let attempt = 0; attempt < AUTH_FAILURE_LIMIT; attempt += 1) {
      noteAuthFailure(invalidForwarded, now + 1);
    }
    assert.equal(authFailureBlocked(invalidForwarded, now + 1).ok, false);
    assert.equal(authFailureBlocked(invalidOther, now + 1).ok, true);
  } finally {
    resetAdminMcpLimitsForTests();
  }
});

test("unknown-IP client buckets are capped and stale buckets are reused", () => {
  resetAdminMcpLimitsForTests();
  const now = FIXTURE_NOW;
  try {
    for (let index = 0; index < 32; index += 1) {
      noteAuthFailure(requestFor(`c${index}`), now);
      assert.equal(consumePreAuthIp(requestFor(`p${index}`)).ok, true);
    }
    for (let attempt = 0; attempt < 5; attempt += 1) {
      noteAuthFailure(requestFor(null), now);
      assert.equal(consumePreAuthIp(requestFor(null)).ok, true);
    }
    assert.equal(authFailureBlocked(requestFor("c0"), now).ok, true);
    assert.equal(authFailureBlocked(requestFor("overflow"), now).ok, false);
    assert.equal(consumePreAuthIp(requestFor("overflow")).ok, false);
    assert.equal(authFailureBlocked(requestFor(null), now).ok, true);
    noteAuthFailure(requestFor("overflow"), now);
    assert.equal(authFailureBlocked(requestFor("overflow"), now).ok, false);
    assert.equal(authFailureBlocked(requestFor("c0"), now).ok, true);

    const later = now + AUTH_FAILURE_WINDOW_MS;
    assert.equal(authFailureBlocked(requestFor("fresh"), later).ok, true);
    noteAuthFailure(requestFor("fresh"), later);
    assert.equal(authFailureBlocked(requestFor("fresh"), later).ok, true);

    const blockedAt = now;
    for (let attempt = 0; attempt < AUTH_FAILURE_LIMIT; attempt += 1) {
      noteAuthFailure(requestFor("held"), blockedAt);
    }
    assert.equal(authFailureBlocked(requestFor("held"), blockedAt + AUTH_FAILURE_WINDOW_MS).ok, false);
    assert.equal(authFailureBlocked(requestFor("held"), blockedAt + AUTH_FAILURE_BLOCK_MS).ok, true);
  } finally {
    resetAdminMcpLimitsForTests();
  }
});

test("missing proxy headers do not let client A lock out client B", async () => {
  const other = syntheticToken("other");
  const issuedAt = new Date(FIXTURE_NOW - 60_000).toISOString();
  const expiresAt = new Date(FIXTURE_NOW + 14 * 24 * 60 * 60 * 1000).toISOString();
  const fixture = await createAdminMcpFixture({
    now: FIXTURE_NOW,
    extraTokens: [{
      clientId: "other",
      token: other.token,
      hash: other.hash,
      scopes: [
        "health:read",
        "counts:read",
        "sync:read",
        "reviews:read",
        "deliveries:read",
        "receipts:read",
      ],
      issuedAt,
      expiresAt,
    }],
  });
  const post = (request: Request) => handleAdminMcpPost(request, { now: () => fixture.now });
  try {
    const failing = `wo_mcp_reader_${"b".repeat(43)}`;
    for (let attempt = 0; attempt < AUTH_FAILURE_LIMIT; attempt += 1) {
      const response = await post(gateRequest(failing));
      assert.equal(response.status, 401);
      assert.equal((await response.json() as { code?: string }).code, "unauthorized");
    }
    const blocked = await post(gateRequest(fixture.token));
    assert.equal(blocked.status, 429);
    assert.equal((await blocked.json() as { code?: string }).code, "rate_limited");
    const placeholder = await post(gateRequest("not-a-token"));
    assert.equal(placeholder.status, 401);
    const allowed = await post(gateRequest(other.token));
    assert.equal(allowed.status, 200);

    for (let attempt = 0; attempt < PRE_AUTH_IP_LIMIT; attempt += 1) {
      const response = await post(gateRequest(bearer("alpha"), {
        host: "evil.example",
        body: initializeBody(),
      }));
      assert.equal(response.status, 403);
    }
    const limited = await post(gateRequest(bearer("alpha"), {
      host: "evil.example",
      body: initializeBody(),
    }));
    assert.equal(limited.status, 429);
    const otherClient = await post(gateRequest(bearer("beta"), {
      host: "evil.example",
      body: initializeBody(),
    }));
    assert.equal(otherClient.status, 403);
  } finally {
    await fixture.cleanup();
  }
});
