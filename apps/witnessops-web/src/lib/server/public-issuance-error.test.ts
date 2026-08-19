import assert from "node:assert/strict";
import test from "node:test";

import {
  PUBLIC_ISSUANCE_ERROR,
  publicIssuanceErrorResponse,
} from "./public-issuance-error";

test("public issuance logging excludes exception messages", async () => {
  const originalConsoleError = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    logged.push(args);
  };

  let response: Response;
  try {
    response = publicIssuanceErrorResponse(
      "api/support",
      new Error("secret=never-log customer=claimant@example.com"),
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: PUBLIC_ISSUANCE_ERROR,
  });
  assert.deepEqual(logged, [
    ["[api/support] public issuance failed", { errorType: "Error" }],
  ]);
  assert.doesNotMatch(JSON.stringify(logged), /never-log|claimant@example\.com/);
});
