import test, { afterEach } from "node:test";
import assert from "node:assert/strict";

import { _resetAllStores } from "@witnessops/config/rate-limit";
import { loadVerifyFixture } from "@/lib/verify-fixtures";

import { POST } from "./route";

const VERIFY_REQUEST_BODY_LIMIT_BYTES = 256 * 1024;

afterEach(() => {
  _resetAllStores();
});

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

test("verify route rejects duplicate top-level receipt fields before verifier verdict", async () => {
  const response = await POST(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:
        '{"receipt":{"schema_version":"1.0.0","proof_stage":"PV","proof_stage":"QV","receipt_id":"rcpt_duplicate_stage_001"}}',
    }),
  );

  assert.equal(response.status, 400);
  const payload = (await response.json()) as {
    ok: boolean;
    failureClass?: string;
    message?: string;
    verdict?: string;
  };
  assert.equal(payload.ok, false);
  assert.equal(payload.failureClass, "FAILURE_INPUT_MALFORMED");
  assert.equal(
    payload.message,
    "request body contains duplicate JSON object keys.",
  );
  assert.equal(payload.verdict, undefined);
});

test("verify route rejects duplicate nested receipt fields before verifier verdict", async () => {
  const ambiguousReceipt =
    '{"schema_version":"1.0.0","proof_stage":"PV","receipt_id":"rcpt_duplicate_nested_001","integrity":{"record_digest":{"algorithm":"sha256","algorithm":"blake3","value":"abc"}}}';

  const response = await POST(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt: ambiguousReceipt }),
    }),
  );

  assert.equal(response.status, 400);
  const payload = (await response.json()) as {
    ok: boolean;
    failureClass?: string;
    message?: string;
    verdict?: string;
  };
  assert.equal(payload.ok, false);
  assert.equal(payload.failureClass, "FAILURE_INPUT_MALFORMED");
  assert.equal(
    payload.message,
    "Receipt payload contains duplicate JSON object keys.",
  );
  assert.equal(payload.verdict, undefined);
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

test("verify route rejects oversized request bodies before verifier parsing", async () => {
  const response = await POST(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.70",
      },
      body: JSON.stringify({
        receipt: "a".repeat(VERIFY_REQUEST_BODY_LIMIT_BYTES),
      }),
    }),
  );

  assert.equal(response.status, 413);
  const payload = (await response.json()) as {
    ok: boolean;
    failureClass?: string;
    message?: string;
  };
  assert.equal(payload.ok, false);
  assert.equal(payload.failureClass, "FAILURE_INPUT_MALFORMED");
  assert.equal(
    payload.message,
    `request body must not exceed ${VERIFY_REQUEST_BODY_LIMIT_BYTES} bytes.`,
  );
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

test("verify route accepts OffSec Shield receipt via R2 structural adapter", async () => {
  const fixture = loadVerifyFixture("offsec-shield-valid");
  assert.ok(fixture);

  const response = await POST(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt: JSON.parse(fixture.receiptInput) }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    ok: boolean;
    inputKind?: string;
    adapter?: string;
    verdict?: string;
    proofStageClaimed?: string;
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.inputKind, "offsec-shield-receipt");
  assert.equal(payload.adapter, "witnessops.verify.offsec_shield_receipt.v1");
  assert.equal(payload.verdict, "valid");
  assert.equal(payload.proofStageClaimed, "unknown");
});

test("verify route accepts Swarm mesh export via R3 structural adapter", async () => {
  const raw = loadVerifyFixture("swarm-mesh-export-round3");
  assert.ok(raw);

  const response = await POST(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt: JSON.parse(raw.receiptInput) }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    ok: boolean;
    inputKind?: string;
    adapter?: string;
    verdict?: string;
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.inputKind, "offsec-swarm-mesh-export");
  assert.equal(payload.adapter, "witnessops.verify.offsec_swarm_mesh_export.v1");
  assert.equal(payload.verdict, "valid");
});

test("verify route rejects Shield receipt with bad authority binding", async () => {
  const fixture = loadVerifyFixture("offsec-shield-bad-binding");
  assert.ok(fixture);

  const response = await POST(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt: JSON.parse(fixture.receiptInput) }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as { ok: boolean; verdict?: string };
  assert.equal(payload.ok, true);
  assert.equal(payload.verdict, "invalid");
});
