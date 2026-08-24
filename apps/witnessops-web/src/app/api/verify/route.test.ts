import test, { afterEach } from "node:test";
import assert from "node:assert/strict";

import { _resetAllStores } from "@witnessops/config/rate-limit";
import { loadVerifyFixture } from "@/lib/verify-fixtures";
import { makePublicExposureReviewReceipt } from "@/lib/public-exposure-review-verify-adapter.test-fixture";

import { POST } from "./route";

const VERIFY_REQUEST_BODY_LIMIT_BYTES = 256 * 1024;

afterEach(() => {
  _resetAllStores();
});

test("verify route keeps receipt-only success indeterminate without artifact revalidation", async () => {
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
  assert.equal(payload.verdict, "indeterminate");
  assert.equal(payload.proofStageClaimed, "PV");
  assert.equal(payload.scope, "receipt-only");
});

test("verify route keeps a valid Public Exposure Review profile indeterminate with explicit unchecked inputs", async () => {
  const response = await POST(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt: makePublicExposureReviewReceipt() }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    ok: boolean;
    inputKind?: string;
    adapter?: string;
    verdict?: string;
    checks?: Array<{
      name: string;
      status: string;
      compatibilityAliasFor?: string;
    }>;
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.inputKind, "public-exposure-review-receipt");
  assert.equal(
    payload.adapter,
    "witnessops.verify.public_exposure_review_receipt.v1",
  );
  assert.equal(payload.verdict, "indeterminate");
  for (const name of [
    "production_key_authorization",
    "request_record",
    "scope_authorization",
    "workflow_contract_complete",
    "verification_method_execution",
    "manifest_hash",
    "artifact_hashes",
    "evidence_support",
  ]) {
    assert.equal(
      payload.checks?.find((item) => item.name === name)?.status,
      "not_checked",
      name,
    );
  }
  assert.equal(
    payload.checks?.find(
      (item) => item.name === "verification_method_definition",
    )?.status,
    "verified",
  );
  assert.equal(
    payload.checks?.find((item) => item.name === "verification_method")
      ?.compatibilityAliasFor,
    "verification_method_definition",
  );
});

test("verify route returns invalid when a Public Exposure Review claim is missing", async () => {
  const receipt = makePublicExposureReviewReceipt();
  (receipt.claims as unknown[]).pop();

  const response = await POST(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    ok: boolean;
    verdict?: string;
    checks?: Array<{ name: string; status: string }>;
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.verdict, "invalid");
  assert.equal(
    payload.checks?.find((item) => item.name === "receipt_claims")?.status,
    "unverified",
  );
});

test("verify route returns invalid when a required Public Exposure Review limitation is missing", async () => {
  const receipt = makePublicExposureReviewReceipt();
  const context = receipt.verification_context as Record<string, unknown>;
  context.limitations = (
    context.limitations as string[]
  ).filter((item) => item !== "not_a_penetration_test");

  const response = await POST(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    ok: boolean;
    verdict?: string;
    checks?: Array<{ name: string; status: string }>;
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.verdict, "invalid");
  assert.equal(
    payload.checks?.find((item) => item.name === "receipt_limitations")
      ?.status,
    "unverified",
  );
});

test("verify route does not call a well-formed signature mutation invalid while production trust is absent", async () => {
  const receipt = makePublicExposureReviewReceipt();
  const signature = receipt.signature as Record<string, unknown>;
  signature.signature = `c${"b".repeat(127)}`;

  const response = await POST(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    ok: boolean;
    verdict?: string;
    checks?: Array<{ name: string; status: string }>;
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.verdict, "indeterminate");
  assert.equal(
    payload.checks?.find(
      (item) => item.name === "receipt_signature_cryptographic",
    )?.status,
    "not_checked",
  );
});

test("verify route rejects evidence bundled with a Public Exposure Review receipt", async () => {
  const receipt = makePublicExposureReviewReceipt();
  receipt.evidence = [{ artifact_id: "offsec_000000000000000000000000" }];

  const response = await POST(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt }),
    }),
  );

  assert.equal(response.status, 422);
  const payload = (await response.json()) as {
    ok: boolean;
    failureClass?: string;
    verdict?: string;
  };
  assert.equal(payload.ok, false);
  assert.equal(payload.failureClass, "FAILURE_INPUT_UNSUPPORTED");
  assert.equal(payload.verdict, undefined);
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

test("verify route accepts primary local-server-audit receipt structurally", async () => {
  const fixture = loadVerifyFixture("local-server-audit-valid");
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
  assert.equal(payload.inputKind, "local-server-audit-receipt");
  assert.equal(payload.adapter, "witnessops.verify.local_server_audit_receipt.v1");
  assert.equal(payload.verdict, "indeterminate");
  assert.equal(payload.proofStageClaimed, "unknown");
});

test("verify route dual-reads legacy offsecshield receipt schema", async () => {
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
  };
  assert.equal(payload.ok, true);
  assert.equal(payload.inputKind, "local-server-audit-receipt");
  assert.equal(payload.adapter, "witnessops.verify.local_server_audit_receipt.v1");
  assert.equal(payload.verdict, "indeterminate");
});

test("verify route rejects bundle-shaped JSON even when proof_stage is present", async () => {
  const response = await POST(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receipt: {
          schema_version: "1.0.0",
          proof_stage: "PV",
          receipt_id: "rcpt_bundle_stage_001",
          files: [{ path: "evidence.bin" }],
        },
      }),
    }),
  );

  assert.equal(response.status, 422);
  const payload = (await response.json()) as {
    ok: boolean;
    failureClass?: string;
    message?: string;
    verdict?: string;
  };
  assert.equal(payload.ok, false);
  assert.equal(payload.failureClass, "FAILURE_INPUT_UNSUPPORTED");
  assert.equal(payload.message, "proof bundles are not supported on /verify v1.");
  assert.equal(payload.verdict, undefined);
});

test("verify route rejects Swarm mesh export outside the receipt-only boundary", async () => {
  const raw = loadVerifyFixture("swarm-mesh-export-round3");
  assert.ok(raw);

  const response = await POST(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt: JSON.parse(raw.receiptInput) }),
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

test("verify route rejects local-server-audit receipt with bad authority binding", async () => {
  const fixture = loadVerifyFixture("local-server-audit-bad-binding");
  assert.ok(fixture);

  const response = await POST(
    new Request("https://witnessops.com/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt: JSON.parse(fixture.receiptInput) }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = (await response.json()) as { ok: boolean; verdict?: string; inputKind?: string };
  assert.equal(payload.ok, true);
  assert.equal(payload.verdict, "invalid");
  assert.equal(payload.inputKind, "local-server-audit-receipt");
});
