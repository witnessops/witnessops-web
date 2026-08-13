import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { triggerAssessment } from "./assessment-client";
import { authorizeRun, submitCustomerAcceptance } from "./control-plane-client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.GES_SERVER_URL;
  delete process.env.GES_ASSESSMENT_KEY;
  delete process.env.CONTROL_PLANE_URL;
  delete process.env.CONTROL_PLANE_API_KEY;
});

test("assessment errors omit upstream bodies", async () => {
  process.env.GES_SERVER_URL = "https://ges.internal";
  process.env.GES_ASSESSMENT_KEY = "key";
  globalThis.fetch = async () =>
    new Response("secret=assessment-token host=http://private.internal", {
      status: 500,
    });

  await assert.rejects(
    () =>
      triggerAssessment({
        email: "claimant@example.com",
        domain: "example.com",
        issuanceId: "iss_test",
      }),
    (error: unknown) =>
      error instanceof Error &&
      error.message === "Assessment service request failed." &&
      !/assessment-token|private\.internal/.test(error.message),
  );
});

test("control-plane conflict results omit upstream bodies", async () => {
  process.env.CONTROL_PLANE_URL = "https://cp.internal";
  process.env.CONTROL_PLANE_API_KEY = "key";
  globalThis.fetch = async () =>
    new Response("secret=control-token trace=http://cp.private", { status: 409 });

  const authorize = await authorizeRun("run_test");
  assert.deepEqual(authorize, {
    kind: "conflict",
    status: 409,
    message: "Control-plane run authorization conflicts with its current state.",
  });

  const disposition = await submitCustomerAcceptance("run_test", {
    disposition: "accepted",
    accepted_by: "claimant@example.com",
    comment: null,
  });
  assert.deepEqual(disposition, {
    kind: "conflict",
    message: "Proof package disposition conflicts with its current state.",
  });
});
