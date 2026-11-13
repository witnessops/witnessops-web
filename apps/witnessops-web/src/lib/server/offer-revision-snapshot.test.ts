import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { _resetAllStores } from "@witnessops/config/rate-limit";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";
import { offerRevisionFields, type OfferRevisionSnapshot } from "@/lib/offer-revision-snapshot";
import { POST as review } from "@/app/api/review/request/route";
import { POST as engage } from "@/app/api/engage/route";
import { POST as contact } from "@/app/api/contact/route";
import { POST as verify } from "@/app/api/verify-token/route";
import { buildAdmissionQueueView } from "./admission-queue";
import { appendIntakeEvent } from "./intake-event-ledger";
import { createVerificationIssuance } from "./token-issuance";
import { clearTokenStore, getIntakeById, getIssuanceById, saveIntake } from "./token-store";

const originalFetch = globalThis.fetch;

async function setup() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "witnessops-offer-revision-"));
  Object.assign(process.env, {
    WITNESSOPS_TOKEN_SIGNING_SECRET: "test-secret",
    WITNESSOPS_TOKEN_TTL_MINUTES: "15",
    WITNESSOPS_VERIFY_BASE_URL: "https://witnessops.com",
    WITNESSOPS_MAIL_PROVIDER: "file",
    WITNESSOPS_MAILBOX_ENGAGE: "engage@witnessops.com",
    WITNESSOPS_MAILBOX_NOREPLY: "witnessopsno-reply@witnessops.com",
    WITNESSOPS_TOKEN_STORE_DIR: path.join(directory, "store"),
    WITNESSOPS_MAIL_OUTPUT_DIR: path.join(directory, "mail"),
    WITNESSOPS_TOKEN_AUDIT_DIR: path.join(directory, "audit"),
    WITNESSOPS_INTAKE_EVENT_DIR: path.join(directory, "audit"),
  });
  globalThis.fetch = (() => { throw new Error("No external calls permitted in offer snapshot tests"); }) as typeof fetch;
  _resetAllStores();
  return directory;
}

afterEach(async () => {
  await clearTokenStore();
  _resetAllStores();
  globalThis.fetch = originalFetch;
  delete process.env.WITNESSOPS_INTAKE_EVENT_DIR;
});

async function issue(handler: typeof review, extra: Record<string, unknown> = {}) {
  const response = await handler(new Request("https://witnessops.com/api/review/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "buyer@example.org", intent: PUBLIC_AGENT_ACTION_OFFER.id,
      scope: "One synthetic coding-agent action; enquiry only.", ...extra }),
  }));
  assert.equal(response.status, 201);
  return await response.json() as { intakeId: string; issuanceId: string; email: string; createdAt: string };
}

async function verifyEnquiry(issued: Awaited<ReturnType<typeof issue>>) {
  const outbox = process.env.WITNESSOPS_MAIL_OUTPUT_DIR!;
  const [mailFile] = await readdir(outbox);
  const mail = await readFile(path.join(outbox, mailFile), "utf8");
  const token = /^Verification Code:\s+(\S+)$/m.exec(mail)?.[1];
  assert.ok(token);
  const response = await verify(new Request("https://witnessops.com/api/verify-token", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ issuanceId: issued.issuanceId, email: issued.email, token }),
  }));
  assert.equal(response.status, 200);
  const payload = await response.json() as { assessmentRunId: string | null; postVerifyPath: string };
  assert.equal(payload.assessmentRunId, null);
  assert.match(payload.postVerifyPath, /\/review\/request\/confirmed$/);
  const notificationFile = (await readdir(outbox)).find((name) => name !== mailFile);
  assert.ok(notificationFile);
  return await readFile(path.join(outbox, notificationFile), "utf8");
}

async function seedHistoricalLedger(directory: string, intakeId: string) {
  // A separate synthetic ledger models the older record consistently, without
  // rewriting the newly issued fixture's append-only event history.
  process.env.WITNESSOPS_INTAKE_EVENT_DIR = path.join(directory, "historical-events");
  const intake = await getIntakeById(intakeId);
  assert.ok(intake);
  await appendIntakeEvent({ event_type: "INTAKE_SUBMITTED", occurred_at: intake.createdAt,
    channel: "engage", intake_id: intakeId, issuance_id: null, thread_id: null,
    previous_state: null, next_state: "submitted", source: "historical-test-fixture",
    payload: { email: intake.email, ...(intake.submission.offerSnapshot
      ? { offerSnapshot: intake.submission.offerSnapshot } : {}) } });
  await appendIntakeEvent({ event_type: "INTAKE_VERIFICATION_SENT", occurred_at: intake.updatedAt,
    channel: "engage", intake_id: intakeId, issuance_id: intake.latestIssuanceId, thread_id: null,
    previous_state: "submitted", next_state: "verification_sent", source: "historical-test-fixture" });
}

for (const [name, handler] of [["review", review], ["engage", engage], ["contact", contact]] as const) {
  test(`${name} intake captures server terms despite forged revision fields`, async () => {
    const directory = await setup();
    const issued = await issue(handler, { locale: "pl", scopeRevision: "caller-selected-v1",
      offerSnapshot: { schemaVersion: 99, scopeRevision: "caller-selected-v1", capturedAt: "2000-01-01T00:00:00Z",
        offerId: "another-offer", price: { en: "Caller price", basis: "caller_terms" } },
      submission: { offerSnapshot: { scopeRevision: "nested-forgery" } } });
    const saved = await getIntakeById(issued.intakeId);
    assert.ok(saved?.submission.offerSnapshot);
    const snapshot = saved.submission.offerSnapshot;
    assert.equal(snapshot.schemaVersion, 1);
    assert.equal(snapshot.offerId, PUBLIC_AGENT_ACTION_OFFER.id);
    assert.equal(snapshot.scopeRevision, "one_action_adversarial_testing_v2");
    assert.equal(snapshot.price.basis, PUBLIC_AGENT_ACTION_OFFER.commercialContract.price);
    assert.equal(snapshot.price.en, PUBLIC_AGENT_ACTION_OFFER.price.en);
    assert.equal(snapshot.price.pl, PUBLIC_AGENT_ACTION_OFFER.price.pl);
    assert.equal(snapshot.timing.basis, PUBLIC_AGENT_ACTION_OFFER.commercialContract.timing);
    assert.equal(snapshot.timing.pl, PUBLIC_AGENT_ACTION_OFFER.timing.pl);
    assert.equal(snapshot.capturedAt, issued.createdAt);
    assert.equal(saved.submission.locale, "pl");
    const queue = await buildAdmissionQueueView();
    assert.deepEqual(queue.rows.find((row) => row.intakeId === issued.intakeId)?.submission.offerSnapshot, snapshot);
    const events = await readFile(path.join(directory, "audit/events.ndjson"), "utf8");
    const submitted = events.trim().split("\n").map((line) => JSON.parse(line))
      .find((event) => event.event_type === "INTAKE_SUBMITTED");
    assert.deepEqual(submitted.payload.offerSnapshot, snapshot);
    assert.doesNotMatch(JSON.stringify(saved.submission), /caller-selected|nested-forgery|Caller price/);
    // No schema change makes the snapshot a buyer-selected request/response field.
    assert.equal("offerSnapshot" in issued, false);
  });
}

test("issuance itself ignores supplied snapshots and the verified handoff retains server context", async () => {
  await setup();
  const issued = await createVerificationIssuance({ channel: "engage", email: "buyer@example.org", source: "test",
    submission: { intent: PUBLIC_AGENT_ACTION_OFFER.id,
      offerSnapshot: { scopeRevision: "forged-internal-input" } as OfferRevisionSnapshot } });
  const before = await getIntakeById(issued.intakeId);
  assert.equal(before?.submission.offerSnapshot?.scopeRevision, "one_action_adversarial_testing_v2");
  const notification = await verifyEnquiry(issued);
  const after = await getIntakeById(issued.intakeId);
  assert.deepEqual(after?.submission.offerSnapshot, before?.submission.offerSnapshot);
  assert.match(notification, /Offer revision: one_action_adversarial_testing_v2/);
  assert.match(notification, /Price at enquiry: Fee agreed in signed SOW/);
  assert.match(notification, /<strong>Offer revision:<\/strong> one_action_adversarial_testing_v2/);
  assert.match(notification, /Enquiry context only/);
  assert.equal((await getIssuanceById(issued.issuanceId))?.approvalStatus, "pending");
});

test("older unversioned enquiries are unchanged by reads, queue projection and verification", async () => {
  const directory = await setup();
  const issued = await issue(review);
  const intake = await getIntakeById(issued.intakeId);
  assert.ok(intake);
  delete intake.submission.offerSnapshot;
  intake.submission.scope = "Historical read-only request; terms recorded separately.";
  await saveIntake(intake);
  await seedHistoricalLedger(directory, issued.intakeId);
  const file = path.join(directory, "store/intakes", issued.intakeId + ".json");
  const bytes = await readFile(file, "utf8");
  const loaded = await getIntakeById(issued.intakeId);
  const queue = await buildAdmissionQueueView();
  assert.deepEqual(loaded?.submission, intake.submission);
  assert.equal(queue.rows.find((row) => row.intakeId === issued.intakeId)?.submission.offerSnapshot, undefined);
  assert.equal(await readFile(file, "utf8"), bytes);
  const notification = await verifyEnquiry(issued);
  assert.match(notification, /Unversioned — no offer snapshot recorded/);
  assert.doesNotMatch(notification, /one_action_adversarial_testing_v2|Fee agreed in signed SOW/);
  assert.deepEqual((await getIntakeById(issued.intakeId))?.submission, intake.submission);
});

test("previously recorded terms render unchanged instead of resolving today's offer", async () => {
  const directory = await setup();
  const issued = await issue(review);
  const intake = await getIntakeById(issued.intakeId);
  assert.ok(intake?.submission.offerSnapshot);
  const recorded = intake.submission.offerSnapshot;
  recorded.scopeRevision = "historical_read_only_revision";
  recorded.price = { basis: "historical_fixed_fee", en: "Historical agreed fee", pl: "Historyczna uzgodniona cena" };
  recorded.timing = { basis: "historical_timing", en: "Historical delivery window", pl: "Historyczny termin" };
  await saveIntake(intake);
  await seedHistoricalLedger(directory, issued.intakeId);
  const fields = offerRevisionFields((await getIntakeById(issued.intakeId))!.submission);
  assert.ok(fields.some((field) => field.value === "Historical agreed fee"));
  const notification = await verifyEnquiry(issued);
  assert.match(notification, /Offer revision: historical_read_only_revision/);
  assert.match(notification, /Price at enquiry: Historical agreed fee/);
  assert.doesNotMatch(notification, /one_action_adversarial_testing_v2|Fee agreed in signed SOW/);
  assert.deepEqual((await getIntakeById(issued.intakeId))?.submission.offerSnapshot, recorded);
});

test("contact and support issuance do not acquire paid-offer snapshots", async () => {
  await setup();
  const followUp = await issue(contact, { intent: "ask-ai-contact", offerSnapshot: { scopeRevision: "forged" } });
  assert.equal((await getIntakeById(followUp.intakeId))?.submission.offerSnapshot, undefined);
  const support = await createVerificationIssuance({ channel: "support", email: "buyer@example.org", source: "test",
    submission: { intent: PUBLIC_AGENT_ACTION_OFFER.id, category: "general", severity: "general", message: "Synthetic support request." } });
  assert.equal((await getIntakeById(support.intakeId))?.submission.offerSnapshot, undefined);
});
