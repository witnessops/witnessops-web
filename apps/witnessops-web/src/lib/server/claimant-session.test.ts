import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import {
  CLAIMANT_SESSION_MAX_AGE_SECONDS,
  claimantSessionCookieName,
  claimantSessionCookieOptions,
  createClaimantSessionCookieValue,
  isClaimantSessionAuthorized,
} from "./claimant-session";

afterEach(() => {
  delete process.env.WITNESSOPS_CLAIMANT_SESSION_SECRET;
});

test("claimant sessions use issuance-specific cookie names and a 30-day lifetime", () => {
  assert.notEqual(
    claimantSessionCookieName("iss_one"),
    claimantSessionCookieName("iss_two"),
  );
  assert.match(
    claimantSessionCookieName("iss_one"),
    /^witnessops_claimant_session_[a-f0-9]{16}$/,
  );
  assert.equal(CLAIMANT_SESSION_MAX_AGE_SECONDS, 30 * 24 * 60 * 60);
  assert.equal(
    claimantSessionCookieOptions("https://witnessops.com").maxAge,
    CLAIMANT_SESSION_MAX_AGE_SECONDS,
  );
});

test("claimant authorization reads only the cookie scoped to the expected issuance", () => {
  process.env.WITNESSOPS_CLAIMANT_SESSION_SECRET = "test-claimant-secret";
  const first = { issuanceId: "iss_one", email: "buyer@example.com" };
  const second = { issuanceId: "iss_two", email: "buyer@example.com" };
  const firstCookie = createClaimantSessionCookieValue(first);

  const authorized = new Request("https://witnessops.com/package/iss_one", {
    headers: {
      cookie: `${claimantSessionCookieName(first.issuanceId)}=${firstCookie}`,
    },
  });
  assert.equal(isClaimantSessionAuthorized(authorized, first), true);

  const wrongName = new Request("https://witnessops.com/package/iss_one", {
    headers: {
      cookie: `${claimantSessionCookieName(second.issuanceId)}=${firstCookie}`,
    },
  });
  assert.equal(isClaimantSessionAuthorized(wrongName, first), false);
});
