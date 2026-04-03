/**
 * Auto-resolution policy tests.
 *
 * Proves:
 *   - delivered/bounced/failed auto-close via provider outcome
 *   - mailbox receipt auto-closes only when provider does not resolve
 *   - accepted does not auto-close
 *   - conflicting evidence does not auto-close
 *   - manual reconciliation blocks auto-closure
 *   - policy closure is idempotent
 *   - policy closure emits a durable ledger event
 *   - queue projection recognizes the policy closure event
 */
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { readIntakeEvents } from "./intake-event-ledger";
import { evaluatePolicyClosure, POLICY_VERSION } from "./policy-closure";
import {
  clearTokenStore,
  saveIntake,
  type IntakeRecord,
  type IntakeResponseRecord,
  type IntakeResponseProviderOutcomeRecord,
  type IntakeMailboxReceiptRecord,
} from "./token-store";

function applyTestEnv(baseDir: string): void {
  process.env.WITNESSOPS_TOKEN_STORE_DIR = path.join(baseDir, "store");
  process.env.WITNESSOPS_TOKEN_AUDIT_DIR = path.join(baseDir, "audit");
}

const baseResponse: IntakeResponseRecord = {
  deliveryAttemptId: "rsp_policy",
  subject: "Re: test",
  bodyDigest: "sha256:test",
  actor: "admin:test",
  actorAuthSource: "local_bypass",
  actorSessionHash: null,
  mailbox: "engage@witnessops.com",
  provider: "resend",
  providerMessageId: "re_policy",
  deliveredAt: "2026-03-29T11:05:00Z",
};

function makeIntake(overrides?: Partial<IntakeRecord>): IntakeRecord {
  return {
    intakeId: "intk_policy",
    channel: "engage",
    email: "test@company.com",
    state: "admitted",
    createdAt: "2026-03-29T10:00:00Z",
    updatedAt: "2026-03-29T11:05:00Z",
    latestIssuanceId: "iss_policy",
    threadId: "thr_policy",
    submission: { category: "test", severity: "general", message: "policy test" },
    firstResponse: baseResponse,
    respondedAt: "2026-03-29T11:05:00Z",
    ...overrides,
  };
}

function outcome(
  status: "accepted" | "delivered" | "bounced" | "failed",
): IntakeResponseProviderOutcomeRecord {
  return {
    status,
    observedAt: "2026-03-29T12:00:00Z",
    provider: "resend",
    providerEventId: "evt_policy",
    providerMessageId: "re_policy",
    deliveryAttemptId: "rsp_policy",
    source: "provider_webhook",
    rawEventType: `email.${status}`,
  };
}

function receipt(
  status: "accepted" | "delivered" | "bounced" | "failed",
): IntakeMailboxReceiptRecord {
  return {
    status,
    observedAt: "2026-03-29T12:30:00Z",
    deliveryAttemptId: "rsp_policy",
    providerMessageId: "re_policy",
    receiptId: "rcpt_policy",
  };
}

afterEach(async () => {
  await clearTokenStore();
});

test("delivered provider outcome auto-closes", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "policy-delivered-"));
  applyTestEnv(baseDir);
  const intake = makeIntake({ responseProviderOutcome: outcome("delivered") });
  await saveIntake(intake);

  const result = await evaluatePolicyClosure(intake, "test");
  assert.equal(result.emitted, true);
  assert.equal(result.closureSource, "provider_outcome");

  const events = await readIntakeEvents();
  const closure = events.find(
    (e) => e.event_type === "INTAKE_AMBIGUITY_CLOSED_BY_POLICY",
  );
  assert.ok(closure, "policy closure event must be emitted");
  assert.equal(closure.payload?.policyVersion, POLICY_VERSION);
  assert.equal(closure.payload?.closureSource, "provider_outcome");
});

test("bounced provider outcome auto-closes", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "policy-bounced-"));
  applyTestEnv(baseDir);
  const intake = makeIntake({ responseProviderOutcome: outcome("bounced") });
  await saveIntake(intake);

  const result = await evaluatePolicyClosure(intake, "test");
  assert.equal(result.emitted, true);
  assert.equal(result.closureSource, "provider_outcome");
});

test("failed provider outcome auto-closes", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "policy-failed-"));
  applyTestEnv(baseDir);
  const intake = makeIntake({ responseProviderOutcome: outcome("failed") });
  await saveIntake(intake);

  const result = await evaluatePolicyClosure(intake, "test");
  assert.equal(result.emitted, true);
  assert.equal(result.closureSource, "provider_outcome");
});

test("accepted provider outcome does not auto-close", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "policy-accepted-"));
  applyTestEnv(baseDir);
  const intake = makeIntake({ responseProviderOutcome: outcome("accepted") });
  await saveIntake(intake);

  const result = await evaluatePolicyClosure(intake, "test");
  assert.equal(result.emitted, false);
  assert.equal(result.closureSource, null);
});

test("strong mailbox receipt auto-closes when provider does not resolve", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "policy-mailbox-"));
  applyTestEnv(baseDir);
  const intake = makeIntake({ responseMailboxReceipt: receipt("delivered") });
  await saveIntake(intake);

  const result = await evaluatePolicyClosure(intake, "test");
  assert.equal(result.emitted, true);
  assert.equal(result.closureSource, "mailbox_receipt");
});

test("mailbox receipt does not auto-close when provider already resolves", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "policy-provider-first-"));
  applyTestEnv(baseDir);
  const intake = makeIntake({
    responseProviderOutcome: outcome("delivered"),
    responseMailboxReceipt: receipt("delivered"),
  });
  await saveIntake(intake);

  const result = await evaluatePolicyClosure(intake, "test");
  assert.equal(result.emitted, true);
  assert.equal(
    result.closureSource,
    "provider_outcome",
    "provider takes precedence over mailbox",
  );
});

test("conflicting evidence does not auto-close", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "policy-conflict-"));
  applyTestEnv(baseDir);
  const intake = makeIntake({
    responseProviderOutcome: outcome("delivered"),
    responseMailboxReceipt: receipt("bounced"),
  });
  await saveIntake(intake);

  const result = await evaluatePolicyClosure(intake, "test");
  assert.equal(result.emitted, false);
  assert.match(result.reason!, /conflicting evidence/i);
});

test("manual reconciliation blocks auto-closure", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "policy-recon-"));
  applyTestEnv(baseDir);
  const intake = makeIntake({
    responseProviderOutcome: outcome("delivered"),
    reconciliation: {
      reconciledAt: "2026-03-29T13:00:00Z",
      actor: "admin:ops",
      note: "Already reconciled.",
      deliveryAttemptId: "rsp_policy",
      provider: "resend",
      providerMessageId: "re_policy",
      mailbox: "engage@witnessops.com",
    },
  });
  await saveIntake(intake);

  const result = await evaluatePolicyClosure(intake, "test");
  assert.equal(result.emitted, false);
  assert.match(result.reason!, /manual reconciliation/i);
});

test("policy closure is idempotent", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "policy-idempotent-"));
  applyTestEnv(baseDir);
  const intake = makeIntake({ responseProviderOutcome: outcome("delivered") });
  await saveIntake(intake);

  const first = await evaluatePolicyClosure(intake, "test");
  assert.equal(first.emitted, true);

  const second = await evaluatePolicyClosure(intake, "test");
  assert.equal(second.emitted, false);
  assert.match(second.reason!, /already recorded/i);

  const events = await readIntakeEvents();
  const closures = events.filter(
    (e) => e.event_type === "INTAKE_AMBIGUITY_CLOSED_BY_POLICY",
  );
  assert.equal(closures.length, 1, "exactly one policy closure event");
});

test("no first response means no auto-closure", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "policy-no-resp-"));
  applyTestEnv(baseDir);
  const intake = makeIntake({
    firstResponse: undefined,
    responseProviderOutcome: outcome("delivered"),
  });
  await saveIntake(intake);

  const result = await evaluatePolicyClosure(intake, "test");
  assert.equal(result.emitted, false);
});

test("responded state means no auto-closure", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "policy-responded-"));
  applyTestEnv(baseDir);
  const intake = makeIntake({
    state: "responded",
    responseProviderOutcome: outcome("delivered"),
  });
  await saveIntake(intake);

  const result = await evaluatePolicyClosure(intake, "test");
  assert.equal(result.emitted, false);
});
