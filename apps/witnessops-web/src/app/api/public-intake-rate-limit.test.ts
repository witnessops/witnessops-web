import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  _resetAllStores,
  getClientIp,
  VERIFY_RATE_LIMIT_CONFIG,
} from "@witnessops/config/rate-limit";
import { clearTokenStore } from "@/lib/server/token-store";
import { buildPublicIntakeRateLimitKey } from "@/lib/server/public-intake-rate-limit";

import { POST as POSTContact } from "./contact/route";
import { POST as POSTEngage } from "./engage/route";
import { POST as POSTReviewRequest } from "./review/request/route";
import { POST as POSTSupport } from "./support/route";
import { POST as POSTSupportMessage } from "./support/message/route";
import { POST as POSTVerify } from "./verify/route";
import { POST as POSTVerifyToken } from "./verify-token/route";

function applyTestEnv(baseDir: string): void {
  process.env.WITNESSOPS_TOKEN_SIGNING_SECRET = "test-secret";
  process.env.WITNESSOPS_TOKEN_TTL_MINUTES = "15";
  process.env.WITNESSOPS_TOKEN_FROM_EMAIL = "engage@witnessops.com";
  process.env.WITNESSOPS_VERIFY_BASE_URL = "https://witnessops.com";
  process.env.WITNESSOPS_MAIL_PROVIDER = "file";
  process.env.WITNESSOPS_MAILBOX_ENGAGE = "engage@witnessops.com";
  process.env.WITNESSOPS_MAILBOX_SUPPORT = "support@witnessops.com";
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_MAIL_OUTPUT_DIR = path.join(baseDir, "mail-out");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
}

function makeRequest(
  pathname: string,
  body: unknown,
  ip: string,
): Request {
  return new Request(`https://witnessops.com${pathname}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
  });
}

async function exerciseRateLimit(
  post: (request: Request) => Promise<Response>,
  pathname: string,
  ip: string,
) {
  const body = {};
  for (let i = 0; i < 10; i += 1) {
    const response = await post(makeRequest(pathname, body, ip));
    assert.equal(response.status, 400);
  }

  const limited = await post(makeRequest(pathname, body, ip));
  assert.equal(limited.status, 429);
  const limitedBody = (await limited.json()) as {
    ok: false;
    error: string;
    code: string;
  };
  assert.deepEqual(limitedBody, {
    ok: false,
    error: "Rate limit exceeded",
    code: "RATE_LIMITED",
  });
  assert.match(limited.headers.get("Retry-After") ?? "", /^\d+$/);

  const repeated = await post(makeRequest(pathname, body, ip));
  assert.equal(repeated.status, 429);
  const repeatedBody = (await repeated.json()) as typeof limitedBody;
  assert.deepEqual(repeatedBody, limitedBody);
}

afterEach(async () => {
  await clearTokenStore();
  _resetAllStores();
});

test("public intake rate limit key groups aliases by logical operation and client ip", () => {
  const request = makeRequest("/api/contact", {}, "203.0.113.10");
  assert.equal(
    buildPublicIntakeRateLimitKey("contact", request),
    "review-request-issuance:203.0.113.10",
  );
  assert.equal(
    buildPublicIntakeRateLimitKey("engage", request),
    "review-request-issuance:203.0.113.10",
  );
  assert.equal(
    buildPublicIntakeRateLimitKey("support-message", request),
    "support-issuance:203.0.113.10",
  );
});

test("non-IP forwarded-for values share the unknown rate-limit identity", () => {
  const request = new Request("https://witnessops.com/api/verify", {
    headers: { "x-forwarded-for": "not-an-ip" },
  });
  assert.equal(getClientIp(request), "unknown");
  assert.equal(
    buildPublicIntakeRateLimitKey("verify", request),
    "verify:unknown",
  );
});

test("review-request aliases share one rate-limit budget per ip", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-contact-"));
  applyTestEnv(baseDir);

  await exerciseRateLimit(POSTContact, "/api/contact", "203.0.113.10");

  const differentIpResponse = await POSTContact(
    makeRequest("/api/contact", {}, "203.0.113.11"),
  );
  assert.equal(differentIpResponse.status, 400);

  const sameIpDifferentRoute = await POSTEngage(
    makeRequest("/api/engage", {}, "203.0.113.10"),
  );
  assert.equal(sameIpDifferentRoute.status, 429);

  const sameIpCanonicalRoute = await POSTReviewRequest(
    makeRequest("/api/review/request", {}, "203.0.113.10"),
  );
  assert.equal(sameIpCanonicalRoute.status, 429);
});

test("contact route rate limit resets after the configured window", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-expiry-"));
  applyTestEnv(baseDir);

  await exerciseRateLimit(POSTContact, "/api/contact", "203.0.113.40");

  const originalDateNow = Date.now;
  const expiryAnchor = originalDateNow() + VERIFY_RATE_LIMIT_CONFIG.windowMs + 1;
  try {
    Date.now = () => expiryAnchor;

    const afterExpiry = await POSTContact(
      makeRequest("/api/contact", {}, "203.0.113.40"),
    );
    assert.equal(afterExpiry.status, 400);
  } finally {
    Date.now = originalDateNow;
  }
});

test("engage route rate limits per route namespace and ip", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-engage-"));
  applyTestEnv(baseDir);

  await exerciseRateLimit(POSTEngage, "/api/engage", "203.0.113.20");
});

test("support aliases share one rate-limit budget per ip", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-support-"));
  applyTestEnv(baseDir);

  await exerciseRateLimit(POSTSupport, "/api/support", "203.0.113.30");

  const sameIpAlias = await POSTSupportMessage(
    makeRequest("/api/support/message", {}, "203.0.113.30"),
  );
  assert.equal(sameIpAlias.status, 429);

  const differentIpAlias = await POSTSupportMessage(
    makeRequest("/api/support/message", {}, "203.0.113.31"),
  );
  assert.equal(differentIpAlias.status, 400);
});

test("verify route rate limits per route namespace and ip", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-verify-"));
  applyTestEnv(baseDir);

  await exerciseRateLimit(POSTVerify, "/api/verify", "203.0.113.50");
});

test("verify-token route rate limits per route namespace and ip", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-verify-token-"));
  applyTestEnv(baseDir);

  await exerciseRateLimit(POSTVerifyToken, "/api/verify-token", "203.0.113.60");

  const differentRoute = await POSTVerify(
    makeRequest("/api/verify", {}, "203.0.113.60"),
  );
  assert.equal(differentRoute.status, 400);
});

test("verify route rate limits unknown-IP requests instead of skipping", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "witnessops-verify-unknown-"));
  applyTestEnv(baseDir);

  const body = {};
  for (let i = 0; i < 10; i += 1) {
    const response = await POSTVerify(
      new Request("https://witnessops.com/api/verify", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      }),
    );
    assert.equal(response.status, 400);
  }

  const limited = await POSTVerify(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
  );
  assert.equal(limited.status, 429);
});

test("verify-token route rate limits unknown-IP requests instead of skipping", async () => {
  const baseDir = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-verify-token-unknown-"),
  );
  applyTestEnv(baseDir);

  const body = {};
  for (let i = 0; i < 10; i += 1) {
    const response = await POSTVerifyToken(
      new Request("https://witnessops.com/api/verify-token", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      }),
    );
    assert.equal(response.status, 400);
  }

  const limited = await POSTVerifyToken(
    new Request("https://witnessops.com/api/verify-token", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
  );
  assert.equal(limited.status, 429);
});
