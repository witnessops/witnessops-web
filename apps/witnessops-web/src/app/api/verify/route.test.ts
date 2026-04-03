import test from "node:test";
import assert from "node:assert/strict";

import { loadVerifyFixture } from "@/lib/verify-fixtures";

import { POST } from "./route";

test("verify route returns valid for a canonical valid receipt fixture", async () => {
  const fixture = loadVerifyFixture("pv-valid");
  assert.ok(fixture);

  const response = await POST(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt: fixture.receiptInput }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    ok: boolean;
    verdict?: string;
    proofStageClaimed?: string;
    scope?: string;
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.verdict, "valid");
  assert.equal(payload.proofStageClaimed, "PV");
  assert.equal(payload.scope, "receipt-only");
});

test("verify route returns invalid for a canonical failing receipt fixture", async () => {
  const fixture = loadVerifyFixture("qv-bad-imprint");
  assert.ok(fixture);

  const response = await POST(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt: fixture.receiptInput }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    ok: boolean;
    verdict?: string;
    breaches?: Array<{ code: string }>;
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.verdict, "invalid");
  assert.ok(
    payload.breaches?.some(
      (breach) => breach.code === "ANCHOR_RFC3161_IMPRINT_MISMATCH",
    ),
  );
});

test("verify route distinguishes malformed request bodies", async () => {
  const fixture = loadVerifyFixture("malformed-json");
  assert.ok(fixture);

  const response = await POST(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt: fixture.receiptInput }),
    }),
  );

  assert.equal(response.status, 400);
  const payload = (await response.json()) as {
    ok: boolean;
    failureClass?: string;
    message?: string;
  };
  assert.equal(payload.ok, false);
  assert.equal(payload.failureClass, "FAILURE_INPUT_MALFORMED");
  assert.equal(payload.message, "Receipt payload is not valid JSON.");
});

test("verify route keeps field-level messages for structurally valid receipt objects", async () => {
  const response = await POST(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receipt: {
          schema_version: "1.0.0",
          receipt_id: "rcpt_missing_stage_001",
        },
      }),
    }),
  );

  assert.equal(response.status, 400);
  const payload = (await response.json()) as {
    ok: boolean;
    failureClass?: string;
    message?: string;
  };
  assert.equal(payload.ok, false);
  assert.equal(payload.failureClass, "FAILURE_INPUT_MALFORMED");
  assert.equal(payload.message, "receipt.proof_stage is required.");
});

test("verify route distinguishes unsupported receipt inputs", async () => {
  const fixture = loadVerifyFixture("unsupported-stage");
  assert.ok(fixture);

  const response = await POST(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt: fixture.receiptInput }),
    }),
  );

  assert.equal(response.status, 422);
  const payload = (await response.json()) as {
    ok: boolean;
    failureClass?: string;
  };
  assert.equal(payload.ok, false);
  assert.equal(payload.failureClass, "FAILURE_INPUT_UNSUPPORTED");
});
