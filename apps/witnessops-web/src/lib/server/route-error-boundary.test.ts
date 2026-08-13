import assert from "node:assert/strict";
import test from "node:test";

import { logUnexpectedRouteError } from "./route-error-boundary";

test("unexpected route logging excludes exception messages", () => {
  const originalConsoleError = console.error;
  const logged: unknown[][] = [];
  console.error = (...args: unknown[]) => {
    logged.push(args);
  };

  try {
    logUnexpectedRouteError(
      "Bounded operation failed",
      new Error("/private/customer-store requires WITNESSOPS_PRIVATE_SECRET"),
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.deepEqual(logged, [
    ["Bounded operation failed", { errorType: "Error" }],
  ]);
  assert.doesNotMatch(JSON.stringify(logged), /customer-store|WITNESSOPS_/);
});
