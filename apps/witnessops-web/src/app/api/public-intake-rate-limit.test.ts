import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import {
  _resetAllStores,
  getClientIp,
  VERIFY_RATE_LIMIT_CONFIG,
} from "@witnessops/config/rate-limit";
import {
  buildPublicIntakeRateLimitKey,
  enforcePublicIssuanceRecipientRateLimit,
  enforcePublicIssuanceRateLimits,
} from "@/lib/server/public-intake-rate-limit";

import { POST as POSTContact } from "./contact/route";
import { POST as POSTEngage } from "./engage/route";
import { POST as POSTReviewRequest } from "./review/request/route";
import { POST as POSTSupport } from "./support/route";
import { POST as POSTSupportMessage } from "./support/message/route";
import { POST as POSTVerify } from "./verify/route";
import { POST as POSTVerifyToken } from "./verify-token/route";

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

afterEach(() => {
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

test("spoofed leftmost forwarded addresses share the proxy-adjacent identity", () => {
  const first = new Request("https://witnessops.com/api/verify", {
    headers: { "x-forwarded-for": "198.51.100.1, 203.0.113.10" },
  });
  const second = new Request("https://witnessops.com/api/verify", {
    headers: { "x-forwarded-for": "198.51.100.2, 203.0.113.10" },
  });
  assert.equal(
    buildPublicIntakeRateLimitKey("verify", first),
    buildPublicIntakeRateLimitKey("verify", second),
  );
});

test("issuance recipient quota normalizes email and fails closed after its limit", async () => {
  const config = { limit: 2, windowMs: 60_000 };
  assert.equal(
    enforcePublicIssuanceRecipientRateLimit(
      "Buyer@Example.com",
      "review-request-issuance",
      config,
    ),
    null,
  );
  assert.equal(
    enforcePublicIssuanceRecipientRateLimit(
      " buyer@example.com ",
      "review-request-issuance",
      config,
    ),
    null,
  );
  const limited = enforcePublicIssuanceRecipientRateLimit(
    "buyer@example.com",
    "review-request-issuance",
    config,
  );
  assert.ok(limited);
  assert.equal(limited.status, 429);
  assert.deepEqual(await limited.json(), {
    ok: false,
    error: "Rate limit exceeded",
    code: "RATE_LIMITED",
  });
});

test("recipient quotas remain isolated by issuance operation", () => {
  const config = { limit: 1, windowMs: 60_000 };
  assert.equal(
    enforcePublicIssuanceRecipientRateLimit(
      "buyer@example.com",
      "review-request-issuance",
      config,
    ),
    null,
  );
  assert.equal(
    enforcePublicIssuanceRecipientRateLimit(
      "buyer@example.com",
      "support-issuance",
      config,
    ),
    null,
  );
});

test("global issuance quota bounds rotating recipients and client identities", async () => {
  const globalConfig = { limit: 2, windowMs: 60_000 };
  const recipientConfig = { limit: 10, windowMs: 60_000 };
  assert.equal(
    enforcePublicIssuanceRateLimits(
      "one@example.com",
      "bounded-issuance",
      globalConfig,
      recipientConfig,
    ),
    null,
  );
  assert.equal(
    enforcePublicIssuanceRateLimits(
      "two@example.net",
      "bounded-issuance",
      globalConfig,
      recipientConfig,
    ),
    null,
  );
  const limited = enforcePublicIssuanceRateLimits(
    "three@example.org",
    "bounded-issuance",
    globalConfig,
    recipientConfig,
  );
  assert.ok(limited);
  assert.equal(limited.status, 429);
  assert.deepEqual(await limited.json(), {
    ok: false,
    error: "Rate limit exceeded",
    code: "RATE_LIMITED",
  });
});

test("review-request aliases share one rate-limit budget per ip", async () => {
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
  await exerciseRateLimit(POSTEngage, "/api/engage", "203.0.113.20");
});

test("support aliases share one rate-limit budget per ip", async () => {
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

test("both support routes enforce the shared recipient issuance quota", async () => {
  const body = {
    email: "buyer@example.com",
    category: "access",
    severity: "normal",
    message: "Please help with access.",
  };

  for (const [post, pathname] of [
    [POSTSupport, "/api/support"],
    [POSTSupportMessage, "/api/support/message"],
  ] as const) {
    _resetAllStores();
    for (let index = 0; index < 3; index += 1) {
      assert.equal(
        enforcePublicIssuanceRateLimits(
          body.email,
          "support-issuance",
        ),
        null,
      );
    }
    const limited = await post(
      makeRequest(pathname, body, "203.0.113.74"),
    );
    assert.equal(limited.status, 429);
  }
});

test("verify route rate limits per route namespace and ip", async () => {
  await exerciseRateLimit(POSTVerify, "/api/verify", "203.0.113.50");
});

test("verify-token route rate limits per route namespace and ip", async () => {
  await exerciseRateLimit(POSTVerifyToken, "/api/verify-token", "203.0.113.60");

  const differentRoute = await POSTVerify(
    makeRequest("/api/verify", {}, "203.0.113.60"),
  );
  assert.equal(differentRoute.status, 400);
});

test("verify route rate limits unknown-IP requests instead of skipping", async () => {
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
