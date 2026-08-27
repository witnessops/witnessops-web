import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { createDemoReceipt, receiptFilename, serializeDemoReceipt } from "./receipt";
import {
  WITNESSED_CRM_SPECIMEN,
  WITNESSED_CRM_SPECIMEN_SHA256,
} from "./specimen";

const CONSENT_AT = "2026-08-27T12:00:00.000Z";

test("published CRM specimen is exact and source-bound", () => {
  const bytes = readFileSync(
    resolve(process.cwd(), "public/samples/witnessed-crm-status-change/v1/specimen.json"),
  );
  assert.equal(createHash("sha256").update(bytes).digest("hex"), WITNESSED_CRM_SPECIMEN_SHA256);
  assert.equal(WITNESSED_CRM_SPECIMEN.engine.sourceCommit, "e7c8d1a354d44b9c0df3a2144c90b52dc66364e7");
  assert.deepEqual(
    WITNESSED_CRM_SPECIMEN.events.map(({ command }) => command),
    ["OPEN_CRM", "OPEN_ACCOUNT", "SELECT_STATUS", "SAVE_STATUS", "DONE"],
  );
});

test("specimen preserves the exact target change and independent read-back", () => {
  assert.deepEqual(WITNESSED_CRM_SPECIMEN.beforeState.map(({ status }) => status), ["NEW", "REVIEWED", "NEW"]);
  assert.deepEqual(WITNESSED_CRM_SPECIMEN.afterState.map(({ status }) => status), ["REVIEWED", "REVIEWED", "NEW"]);
  assert.equal(WITNESSED_CRM_SPECIMEN.verification.mechanism, "independent_http_state_snapshot_comparison");
  assert.equal(WITNESSED_CRM_SPECIMEN.verification.checks.onlyTargetChanged, true);
  assert.equal(WITNESSED_CRM_SPECIMEN.verification.checks.noWrongTargetAttempts, true);
});

test("unsigned receipt keeps replay consent distinct from execution authority", () => {
  const receipt = createDemoReceipt(
    WITNESSED_CRM_SPECIMEN,
    WITNESSED_CRM_SPECIMEN_SHA256,
    CONSENT_AT,
  );
  assert.equal(receipt.schema, "witnessops.demo-receipt.v1");
  assert.equal(receipt.signed, false);
  assert.equal(receipt.noNewExecution, true);
  assert.equal(receipt.replayConsent.authorizesExecution, false);
  assert.equal(receipt.replayConsent.authorizesMutation, false);
  assert.equal("receiptSha256" in receipt, false);
});

test("receipt digest binds the exact generated download bytes", () => {
  const receipt = createDemoReceipt(
    WITNESSED_CRM_SPECIMEN,
    WITNESSED_CRM_SPECIMEN_SHA256,
    CONSENT_AT,
  );
  const bytes = serializeDemoReceipt(receipt);
  const digest = createHash("sha256").update(bytes).digest("hex");
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(
    receiptFilename(CONSENT_AT, digest),
    `witnessops-demo-receipt-2026-08-27T12-00-00-000Z_${digest.slice(0, 8)}.json`,
  );
  assert.equal(JSON.parse(bytes).signed, false);
});
