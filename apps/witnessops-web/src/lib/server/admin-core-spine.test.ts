import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { listReceipts } from "@/lib/receipts";

import {
  AdminCoreError,
  approveReviewRequest,
  buildDeliveryReadiness,
  buildProofReadiness,
  convertInboxItemToReviewRequest,
  createProductContractVersion,
  createProofRunForRequest,
  getAdminCoreState,
  getAdminCoreStorePath,
  getInboxItem,
  getProductContract,
  getProofRun,
  importGmailInboxItem,
  linkReceiptToDelivery,
  listAuditEvents,
  listCustomers,
  listDeliveries,
  listProductContracts,
  listProductContractChoicesForReview,
  listProofRuns,
  listReceiptRecords,
  listReviewRequests,
  markDeliverySendOutcomeUnknown,
  recordDeliverySent,
  reconcileDeliverySendReservation,
  recordGmailLabelSync,
  prepareDelivery,
  reserveDeliverySend,
  resetAdminCoreStoreForTests,
  searchCoreRecords,
  transitionDelivery,
  transitionProofRun,
  transitionReviewRequest,
  updateDeliveryDraft,
  updateProofRun,
} from "./admin-core-spine";

const founder = { actor: "founder@test", role: "Founder" as const };
const administrator = { actor: "admin@test", role: "Administrator" as const };

async function createCompletedDelivery(
  label: string,
  owner: { actor: string; role: "Delegated Operator" },
) {
  const imported = await importGmailInboxItem({
    gmailMessageId: `gmail-${label}`,
    gmailThreadId: `thread-${label}`,
    sender: `${label}@example.com`,
    recipients: ["engage@mail.witnessops.com"],
    subject: `${label} request`,
    receivedAt: "2026-08-13T08:00:00Z",
    excerpt: "Bounded request.",
  }, founder);
  const converted = await convertInboxItemToReviewRequest(imported.item.id, owner);
  await transitionReviewRequest(converted.reviewRequest.id, "triage", owner);
  await transitionReviewRequest(converted.reviewRequest.id, "fit_review", owner);
  await transitionReviewRequest(converted.reviewRequest.id, "fit_confirmed", owner);
  const product = (await listProductContracts(founder))[0]!;
  await approveReviewRequest(converted.reviewRequest.id, product.id, owner);
  const run = await createProofRunForRequest(converted.reviewRequest.id, product.id, owner);
  await transitionProofRun(run.id, "ready", owner);
  await transitionProofRun(run.id, "running", owner);
  await transitionProofRun(run.id, "operator_review", owner);
  await updateProofRun(run.id, {
    scopeComplete: true,
    evidenceState: "complete",
    outputReferences: [...run.requiredOutputs],
    evidenceReferences: [`evidence://${label}`],
    knownGaps: [],
    verificationInstructions: "Open the receipt and follow the verifier instructions.",
    customerWordingReviewed: true,
    unsupportedClaims: [],
  }, owner);
  await transitionProofRun(run.id, "complete", owner);
  return prepareDelivery(run.id, owner);
}

test("delegated operators may mutate only records assigned to them", async () => {
  process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR = await mkdtemp(path.join(os.tmpdir(), "witnessops-admin-core-ownership-"));
  await resetAdminCoreStoreForTests();

  const imported = await importGmailInboxItem({
    gmailMessageId: "gmail-msg-owned-001",
    gmailThreadId: "gmail-thread-owned-001",
    sender: "Owner Example <owner@example.com>",
    recipients: ["engage@mail.witnessops.com"],
    subject: "Assigned review",
    receivedAt: "2026-08-13T08:00:00Z",
    excerpt: "Review this bounded request.",
  }, founder);
  const owner = { actor: "owner@test", role: "Delegated Operator" as const };
  const otherOperator = { actor: "other@test", role: "Delegated Operator" as const };
  const converted = await convertInboxItemToReviewRequest(imported.item.id, owner);

  await assert.rejects(
    () => transitionReviewRequest(converted.reviewRequest.id, "triage", otherOperator),
    (error: unknown) =>
      error instanceof AdminCoreError && error.code === "RECORD_ASSIGNMENT_REQUIRED",
  );

  const transitioned = await transitionReviewRequest(
    converted.reviewRequest.id,
    "triage",
    owner,
  );
  assert.equal(transitioned.state, "triage");
});

test("delivery sends bind an immutable content revision and reject unresolved edits", async () => {
  process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-admin-core-send-content-"),
  );
  await resetAdminCoreStoreForTests();

  const owner = {
    actor: "delivery-owner@test",
    role: "Delegated Operator" as const,
  };
  const prepared = await createCompletedDelivery("send-content", owner);
  const approvedDraft = await updateDeliveryDraft(
    prepared.id,
    {
      subject: "Approved delivery subject",
      body: "Approved customer-facing delivery body.",
    },
    owner,
  );
  assert.equal(approvedDraft.contentRevision, prepared.contentRevision + 1);

  await linkReceiptToDelivery(
    prepared.id,
    {
      receiptId: "receipt-send-content",
      claimScope: "Bounded send-content test outputs.",
      structurallyValid: true,
      evidenceReferences: ["evidence://send-content"],
      verifierMechanism: "witnessops-receipt-verifier-v1",
      verifierResult: "valid",
      limitations: [],
      archiveLocation: "drive://receipts/send-content",
    },
    owner,
  );
  const linkedDelivery = (await listDeliveries(owner)).find(
    (delivery) => delivery.id === prepared.id,
  );
  assert.ok(linkedDelivery);
  assert.equal(
    linkedDelivery.contentRevision,
    approvedDraft.contentRevision + 1,
  );

  await transitionDelivery(
    prepared.id,
    "ready_for_operator_review",
    owner,
  );
  await assert.rejects(
    () => transitionDelivery(prepared.id, "sent", owner),
    (error: unknown) =>
      error instanceof AdminCoreError &&
      error.code === "DELIVERY_SEND_REQUIRED" &&
      error.status === 409,
  );

  const reservation = await reserveDeliverySend(
    prepared.id,
    owner,
    `delivery-send:${prepared.id}`,
  );
  assert.equal(reservation.kind, "reserved");
  assert.ok(reservation.kind === "reserved");
  assert.equal(reservation.contentRevision, linkedDelivery.contentRevision);
  assert.match(reservation.contentDigest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(reservation.sendContent.subject, approvedDraft.subject);
  assert.equal(reservation.sendContent.body, approvedDraft.body);
  assert.equal(reservation.sendContent.receiptId, "receipt-send-content");

  await assert.rejects(
    () =>
      updateDeliveryDraft(
        prepared.id,
        {
          subject: "Benign replacement intended to conceal sent content",
          body: "Replacement body.",
        },
        owner,
      ),
    (error: unknown) =>
      error instanceof AdminCoreError &&
      error.code === "DELIVERY_SEND_UNRESOLVED" &&
      error.status === 409,
  );
  await assert.rejects(
    () =>
      linkReceiptToDelivery(
        prepared.id,
        {
          receiptId: "receipt-send-content-replacement",
          claimScope: "Replacement receipt must not rebind an in-flight send.",
          structurallyValid: true,
          evidenceReferences: ["evidence://send-content-replacement"],
          verifierMechanism: "witnessops-receipt-verifier-v1",
          verifierResult: "valid",
          limitations: [],
          archiveLocation: "drive://receipts/send-content-replacement",
        },
        owner,
      ),
    (error: unknown) =>
      error instanceof AdminCoreError &&
      error.code === "DELIVERY_SEND_UNRESOLVED" &&
      error.status === 409,
  );

  const duringReservation = (await listDeliveries(owner)).find(
    (delivery) => delivery.id === prepared.id,
  );
  assert.equal(duringReservation?.subject, approvedDraft.subject);
  assert.equal(duringReservation?.body, approvedDraft.body);
  assert.equal(duringReservation?.receiptId, "receipt-send-content");
  assert.equal(
    (await listReceiptRecords(owner)).some(
      (receipt) => receipt.receiptId === "receipt-send-content-replacement",
    ),
    false,
  );

  await markDeliverySendOutcomeUnknown(
    prepared.id,
    reservation.reservationToken,
    owner,
  );
  await assert.rejects(
    () =>
      updateDeliveryDraft(
        prepared.id,
        { subject: "Still blocked while outcome is unknown" },
        owner,
      ),
    (error: unknown) =>
      error instanceof AdminCoreError &&
      error.code === "DELIVERY_SEND_UNRESOLVED",
  );
  await reconcileDeliverySendReservation(
    prepared.id,
    {
      outcome: "not_sent",
      note: "Provider evidence confirms the reserved message was not accepted.",
    },
    owner,
  );

  const corrected = await updateDeliveryDraft(
    prepared.id,
    {
      subject: "Corrected delivery subject",
      body: "Corrected customer-facing delivery body.",
    },
    owner,
  );
  assert.ok(corrected.contentRevision > reservation.contentRevision);
  const retry = await reserveDeliverySend(
    prepared.id,
    owner,
    `delivery-send:${prepared.id}:retry`,
  );
  assert.equal(retry.kind, "reserved");
  assert.ok(retry.kind === "reserved");
  assert.equal(retry.sendContent.subject, corrected.subject);
  assert.equal(retry.sendContent.body, corrected.body);

  const sent = await recordDeliverySent(
    prepared.id,
    {
      provider: "file",
      providerMessageId: "provider-send-content",
      sentAt: "2026-08-19T02:00:00Z",
    },
    owner,
    `delivery-send:${prepared.id}:retry`,
    retry.reservationToken,
  );
  assert.equal(sent.state, "sent");
  assert.equal(sent.sentContentRevision, retry.contentRevision);
  assert.equal(sent.sentContentDigest, retry.contentDigest);
  assert.equal(sent.subject, retry.sendContent.subject);
  assert.equal(sent.body, retry.sendContent.body);

  await assert.rejects(
    () =>
      updateDeliveryDraft(
        prepared.id,
        { body: "A sent delivery record must not be rewritten." },
        owner,
      ),
    (error: unknown) =>
      error instanceof AdminCoreError &&
      error.code === "DELIVERY_CONTENT_IMMUTABLE" &&
      error.status === 409,
  );

  await transitionDelivery(prepared.id, "failed", owner);
  await transitionDelivery(prepared.id, "draft", owner);
  await assert.rejects(
    () =>
      updateDeliveryDraft(
        prepared.id,
        { body: "A later state transition must not unlock sent content." },
        owner,
      ),
    (error: unknown) =>
      error instanceof AdminCoreError &&
      error.code === "DELIVERY_CONTENT_IMMUTABLE" &&
      error.status === 409,
  );
});

test("delegated reads expose only assigned record lineages", async () => {
  process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR = await mkdtemp(path.join(os.tmpdir(), "witnessops-admin-core-read-scope-"));
  await resetAdminCoreStoreForTests();

  const alice = { actor: "alice@test", role: "Delegated Operator" as const };
  const bob = { actor: "bob@test", role: "Delegated Operator" as const };
  const aliceInbox = await importGmailInboxItem({
    gmailMessageId: "gmail-alice",
    gmailThreadId: "thread-alice",
    sender: "Alice Customer <alice.customer@example.com>",
    recipients: ["engage@mail.witnessops.com"],
    subject: "Alice request",
    receivedAt: "2026-08-13T08:00:00Z",
    excerpt: "Alice bounded request",
  }, founder);
  const bobInbox = await importGmailInboxItem({
    gmailMessageId: "gmail-bob",
    gmailThreadId: "thread-bob",
    sender: "Bob Customer <bob.customer@example.com>",
    recipients: ["engage@mail.witnessops.com"],
    subject: "Bob request",
    receivedAt: "2026-08-13T08:01:00Z",
    excerpt: "Bob bounded request",
  }, founder);
  const aliceRequest = await convertInboxItemToReviewRequest(aliceInbox.item.id, alice);
  const bobRequest = await convertInboxItemToReviewRequest(bobInbox.item.id, bob);

  assert.deepEqual((await listReviewRequests(alice)).map((item) => item.id), [aliceRequest.reviewRequest.id]);
  assert.deepEqual((await listCustomers(alice)).map((item) => item.id), [aliceRequest.customer.id]);
  assert.equal((await getInboxItem(bobInbox.item.id, alice)), null);
  assert.equal((await getAdminCoreState(alice)).gmailSyncReceipts.length, 0);
  assert.equal((await listAuditEvents(undefined, alice)).every((event) => event.lineageId === aliceRequest.reviewRequest.lineageId), true);
  assert.equal((await searchCoreRecords("Bob request", alice)).length, 0);
  assert.equal((await listProofRuns(alice)).length, 0);
  assert.equal((await listDeliveries(alice)).length, 0);
  assert.equal((await listReceiptRecords(alice)).length, 0);
  assert.equal((await listProductContracts(alice)).length, 0);
  const founderProducts = await listProductContracts(founder);
  assert.equal(founderProducts.length > 0, true);
  const flagship = founderProducts[0]!;
  assert.deepEqual(
    (await listProductContractChoicesForReview(aliceRequest.reviewRequest.id, alice)).map(
      (item) => item.id,
    ),
    founderProducts.filter((item) => item.status === "current").map((item) => item.id),
  );
  await assert.rejects(
    () => listProductContractChoicesForReview(bobRequest.reviewRequest.id, alice),
    (error: unknown) =>
      error instanceof AdminCoreError && error.code === "RECORD_ASSIGNMENT_REQUIRED",
  );
  const siblingVersion = await createProductContractVersion(
    {
      productId: flagship.productId,
      productName: flagship.productName,
      contractVersion: "99.0.0-test",
      scope: "Unassigned sibling-version scope",
      boundaries: ["Unassigned sibling-version boundary"],
      expectedInputs: ["Unassigned sibling-version input"],
      expectedOutputs: ["Unassigned sibling-version output"],
      evidenceClasses: ["Unassigned sibling-version evidence"],
      verificationPath: "Unassigned sibling-version verification path",
      deliveryRequirements: ["Unassigned sibling-version delivery"],
      receiptRequirements: ["Unassigned sibling-version receipt"],
      responsibleOperator: null,
      commercialTerms: "Unassigned sibling-version terms",
      sourceCatalogVersion: null,
    },
    founder,
  );
  assert.equal(await getProductContract(flagship.id, alice), null);
  assert.equal(await getProductContract(siblingVersion.id, alice), null);
  assert.ok(await getProductContract(flagship.id, founder));

  await transitionReviewRequest(aliceRequest.reviewRequest.id, "triage", alice);
  await transitionReviewRequest(
    aliceRequest.reviewRequest.id,
    "fit_review",
    alice,
  );
  await transitionReviewRequest(
    aliceRequest.reviewRequest.id,
    "fit_confirmed",
    alice,
  );
  await approveReviewRequest(
    aliceRequest.reviewRequest.id,
    flagship.id,
    founder,
  );
  assert.deepEqual(
    (await listProductContracts(alice)).map((item) => item.id),
    [flagship.id],
  );
  assert.ok(await getProductContract(flagship.id, alice));
  assert.equal(await getProductContract(siblingVersion.id, alice), null);
  assert.equal(
    (await listProductContracts(alice)).some(
      (item) => item.id === siblingVersion.id,
    ),
    false,
  );
  assert.equal(await getProductContract(flagship.id, bob), null);
  assert.equal((await listReviewRequests(founder)).length, 2);
  assert.equal(bobRequest.reviewRequest.owner, bob.actor);
});

test("concurrent core mutations preserve every committed record", async () => {
  process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR = await mkdtemp(path.join(os.tmpdir(), "witnessops-admin-core-race-"));
  await resetAdminCoreStoreForTests();

  await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      importGmailInboxItem({
        gmailMessageId: `gmail-msg-race-${index}`,
        gmailThreadId: `gmail-thread-race-${index}`,
        sender: `buyer-${index}@example.com`,
        recipients: ["engage@mail.witnessops.com"],
        subject: `Concurrent request ${index}`,
        receivedAt: "2026-08-13T08:00:00Z",
        excerpt: "Bounded request.",
      }, founder),
    ),
  );

  assert.equal((await getAdminCoreState()).inboxItems.length, 12);
});

test("receipt linking and readiness enforce the assigned delivery lineage", async () => {
  process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR = await mkdtemp(path.join(os.tmpdir(), "witnessops-admin-core-receipt-lineage-"));
  await resetAdminCoreStoreForTests();

  const alice = { actor: "alice@test", role: "Delegated Operator" as const };
  const bob = { actor: "bob@test", role: "Delegated Operator" as const };
  const aliceDelivery = await createCompletedDelivery("alice-lineage", alice);
  const bobDelivery = await createCompletedDelivery("bob-lineage", bob);
  const originalCwd = process.cwd();
  const publishedFixtureRoot = await mkdtemp(
    path.join(os.tmpdir(), "witnessops-published-receipt-"),
  );
  const publishedFixtureAppDir = path.join(
    publishedFixtureRoot,
    "apps",
    "witnessops-web",
  );
  const publishedFixtureChainsDir = path.join(
    publishedFixtureRoot,
    "proofs",
    "offsec",
    "chains",
  );
  await mkdir(publishedFixtureAppDir, { recursive: true });
  await mkdir(publishedFixtureChainsDir, { recursive: true });
  await writeFile(
    path.join(publishedFixtureChainsDir, "published-chain.json"),
    JSON.stringify({
      chain: [
        {
          stage: "M0",
          receiptId: "published-receipt-test",
          prevReceiptId: null,
          timestamp: "2026-08-19T00:00:00Z",
        },
      ],
    }),
    "utf8",
  );
  process.chdir(publishedFixtureAppDir);

  try {
    const [publishedReceipt] = await listReceipts();
    assert.ok(publishedReceipt);

    await assert.rejects(
      () => linkReceiptToDelivery(bobDelivery.id, {
        receiptId: publishedReceipt.receiptId,
        claimScope: "Bob bounded outputs.",
        structurallyValid: true,
        evidenceReferences: ["evidence://bob-lineage"],
        verifierMechanism: "witnessops-receipt-verifier-v1",
        verifierResult: "valid",
        limitations: [],
        archiveLocation: "drive://receipts/rebound-published",
      }, bob),
      (error: unknown) =>
        error instanceof AdminCoreError &&
        error.code === "RECEIPT_LINEAGE_CONFLICT" &&
        error.status === 409,
    );
    await assert.rejects(
      () => linkReceiptToDelivery(bobDelivery.id, {
        receiptId: "receipt-bob-supersedes-published",
        claimScope: "Bob bounded outputs.",
        structurallyValid: true,
        evidenceReferences: ["evidence://bob-lineage"],
        verifierMechanism: "witnessops-receipt-verifier-v1",
        verifierResult: "valid",
        limitations: [],
        archiveLocation: "drive://receipts/supersedes-published",
        supersedesReceiptId: publishedReceipt.receiptId,
      }, bob),
      (error: unknown) =>
        error instanceof AdminCoreError &&
        error.code === "RECEIPT_LINEAGE_CONFLICT" &&
        error.status === 409,
    );
    const afterPublishedCollision = await getAdminCoreState();
    assert.equal(
      afterPublishedCollision.deliveries.find(
        (delivery) => delivery.id === bobDelivery.id,
      )?.receiptId,
      null,
    );
    assert.equal(
      afterPublishedCollision.receipts.some(
        (receipt) =>
          receipt.receiptId === publishedReceipt.receiptId ||
          receipt.receiptId === "receipt-bob-supersedes-published",
      ),
      false,
    );
    assert.equal(
      (await listReceipts()).some(
        (receipt) => receipt.receiptId === publishedReceipt.receiptId,
      ),
      true,
    );
  } finally {
    process.chdir(originalCwd);
  }

  const aliceReceipt = await linkReceiptToDelivery(aliceDelivery.id, {
    receiptId: "receipt-shared-id",
    claimScope: "Alice bounded outputs.",
    structurallyValid: true,
    evidenceReferences: ["evidence://alice-lineage"],
    verifierMechanism: "witnessops-receipt-verifier-v1",
    verifierResult: "valid",
    limitations: [],
    archiveLocation: "drive://receipts/alice-lineage",
  }, alice);

  await assert.rejects(
    () => linkReceiptToDelivery(bobDelivery.id, {
      receiptId: aliceReceipt.receiptId,
      claimScope: "Bob bounded outputs.",
      structurallyValid: true,
      evidenceReferences: ["evidence://bob-lineage"],
      verifierMechanism: "witnessops-receipt-verifier-v1",
      verifierResult: "valid",
      limitations: [],
      archiveLocation: "drive://receipts/bob-lineage",
    }, bob),
    (error: unknown) =>
      error instanceof AdminCoreError &&
      error.code === "RECEIPT_LINEAGE_CONFLICT" &&
      error.status === 409,
  );
  await assert.rejects(
    () => linkReceiptToDelivery(bobDelivery.id, {
      receiptId: "receipt-bob-superseding",
      claimScope: "Bob bounded outputs.",
      structurallyValid: true,
      evidenceReferences: ["evidence://bob-lineage"],
      verifierMechanism: "witnessops-receipt-verifier-v1",
      verifierResult: "valid",
      limitations: [],
      archiveLocation: "drive://receipts/bob-superseding",
      supersedesReceiptId: aliceReceipt.receiptId,
    }, bob),
    (error: unknown) =>
      error instanceof AdminCoreError && error.code === "RECEIPT_LINEAGE_CONFLICT",
  );
  await assert.rejects(
    () => linkReceiptToDelivery(bobDelivery.id, {
      receiptId: "receipt-bob-forward-reference",
      claimScope: "Bob bounded outputs.",
      structurallyValid: true,
      evidenceReferences: ["evidence://bob-lineage"],
      verifierMechanism: "witnessops-receipt-verifier-v1",
      verifierResult: "valid",
      limitations: [],
      archiveLocation: "drive://receipts/bob-forward-reference",
      supersedesReceiptId: "receipt-not-yet-created",
    }, bob),
    (error: unknown) =>
      error instanceof AdminCoreError && error.code === "RECEIPT_LINEAGE_CONFLICT",
  );
  await assert.rejects(
    () => linkReceiptToDelivery(bobDelivery.id, {
      receiptId: "receipt-bob-self-reference",
      claimScope: "Bob bounded outputs.",
      structurallyValid: true,
      evidenceReferences: ["evidence://bob-lineage"],
      verifierMechanism: "witnessops-receipt-verifier-v1",
      verifierResult: "valid",
      limitations: [],
      archiveLocation: "drive://receipts/bob-self-reference",
      supersedesReceiptId: "receipt-bob-self-reference",
    }, bob),
    (error: unknown) =>
      error instanceof AdminCoreError && error.code === "RECEIPT_LINEAGE_CONFLICT",
  );

  const unchanged = await getAdminCoreState();
  assert.equal(
    unchanged.deliveries.find((delivery) => delivery.id === bobDelivery.id)?.receiptId,
    null,
  );
  assert.equal(
    unchanged.receipts.find((receipt) => receipt.receiptId === aliceReceipt.receiptId)?.supersededByReceiptId,
    null,
  );
  assert.equal(
    unchanged.receipts.some((receipt) => receipt.receiptId === "receipt-bob-superseding"),
    false,
  );
  assert.equal(
    unchanged.receipts.some((receipt) =>
      receipt.receiptId === "receipt-bob-forward-reference" ||
      receipt.receiptId === "receipt-bob-self-reference"),
    false,
  );

  const concurrent = await Promise.allSettled([
    linkReceiptToDelivery(aliceDelivery.id, {
      receiptId: "receipt-alice-concurrent-superseding",
      claimScope: "Alice bounded outputs.",
      structurallyValid: true,
      evidenceReferences: ["evidence://alice-lineage"],
      verifierMechanism: "witnessops-receipt-verifier-v1",
      verifierResult: "valid",
      limitations: [],
      archiveLocation: "drive://receipts/alice-concurrent-superseding",
      supersedesReceiptId: "receipt-bob-concurrent",
    }, alice),
    linkReceiptToDelivery(bobDelivery.id, {
      receiptId: "receipt-bob-concurrent",
      claimScope: "Bob bounded outputs.",
      structurallyValid: true,
      evidenceReferences: ["evidence://bob-lineage"],
      verifierMechanism: "witnessops-receipt-verifier-v1",
      verifierResult: "valid",
      limitations: [],
      archiveLocation: "drive://receipts/bob-concurrent",
    }, bob),
  ]);
  assert.equal(concurrent[0]?.status, "rejected");
  assert.equal(concurrent[1]?.status, "fulfilled");
  const afterConcurrent = await getAdminCoreState();
  assert.equal(
    afterConcurrent.receipts.some((receipt) =>
      receipt.receiptId === "receipt-alice-concurrent-superseding"),
    false,
  );
  assert.equal(
    afterConcurrent.receipts.find((receipt) =>
      receipt.receiptId === "receipt-bob-concurrent")?.supersededByReceiptId,
    null,
  );

  const storePath = getAdminCoreStorePath();
  const stored = JSON.parse(await readFile(storePath, "utf8")) as {
    deliveries: Array<{ id: string; receiptId: string | null }>;
  };
  stored.deliveries.find((delivery) => delivery.id === bobDelivery.id)!.receiptId =
    aliceReceipt.receiptId;
  await writeFile(storePath, JSON.stringify(stored, null, 2) + "\n", "utf8");
  const readiness = await buildDeliveryReadiness(bobDelivery.id, bob);
  assert.equal(
    readiness.fail.some((item) => item.code === "RECEIPT_LINEAGE"),
    true,
  );
  assert.equal(
    readiness.pass.some((item) => item.code === "RECEIPT_STRUCTURAL_VALID"),
    false,
  );
});

test("admin core spine covers the complete message-to-receipt operating path", async () => {
  process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR = await mkdtemp(path.join(os.tmpdir(), "witnessops-admin-core-"));
  await resetAdminCoreStoreForTests();

  const imported = await importGmailInboxItem({
    gmailMessageId: "gmail-msg-001",
    gmailThreadId: "gmail-thread-001",
    sender: "Casey Example <casey@example.com>",
    recipients: ["engage@mail.witnessops.com"],
    subject: "Need a bounded launch review",
    receivedAt: "2026-07-11T12:00:00Z",
    excerpt: "Please review our launch posture and return a receipted proof pack.",
    gmailLabels: ["INBOX", "witnessops/new"],
    attachments: [{ attachmentId: "att-001", filename: "scope.pdf", mimeType: "application/pdf", sizeBytes: 1000 }],
  }, founder);
  assert.equal(imported.created, true);
  assert.equal(imported.item.source, "gmail");
  assert.equal(imported.item.attachments[0]?.reviewed, false);

  const duplicate = await importGmailInboxItem({
    gmailMessageId: "gmail-msg-001",
    gmailThreadId: "gmail-thread-001",
    sender: "Casey Example <casey@example.com>",
    recipients: [],
    subject: "Changed subject must not duplicate",
    receivedAt: "2026-07-11T12:00:00Z",
    excerpt: "duplicate",
  }, founder);
  assert.equal(duplicate.created, false);
  assert.equal(duplicate.item.id, imported.item.id);

  const security = await importGmailInboxItem({
    gmailMessageId: "gmail-security-001",
    gmailThreadId: "gmail-security-thread-001",
    sender: "researcher@example.com",
    recipients: ["security@witnessops.com"],
    subject: "Vulnerability report",
    receivedAt: "2026-07-11T12:01:00Z",
    excerpt: "Private vulnerability details.",
  }, founder);
  assert.equal(security.item.state, "security-routed");
  await assert.rejects(() => convertInboxItemToReviewRequest(security.item.id, founder), (error: unknown) => error instanceof AdminCoreError && error.code === "SECURITY_ROUTE");

  const converted = await convertInboxItemToReviewRequest(imported.item.id, founder);
  assert.equal(converted.reviewRequest.state, "new");
  assert.equal(converted.customer.email, "casey@example.com");
  const convertedAgain = await convertInboxItemToReviewRequest(imported.item.id, founder);
  assert.equal(convertedAgain.created, false);

  await transitionReviewRequest(converted.reviewRequest.id, "triage", founder);
  await assert.rejects(() => transitionReviewRequest(converted.reviewRequest.id, "closed", founder), (error: unknown) => error instanceof AdminCoreError && error.code === "INVALID_TRANSITION");
  assert.equal((await getInboxItem(imported.item.id))?.state, "linked");
  await transitionReviewRequest(converted.reviewRequest.id, "fit_review", founder);
  await transitionReviewRequest(converted.reviewRequest.id, "fit_confirmed", founder);
  await assert.rejects(() => approveReviewRequest(converted.reviewRequest.id, "missing-product", administrator), (error: unknown) => error instanceof AdminCoreError && error.code === "BUSINESS_AUTHORITY_REQUIRED");

  const product = (await listProductContracts())[0];
  assert.ok(product);
  const approved = await approveReviewRequest(converted.reviewRequest.id, product.id, founder);
  assert.equal(approved.state, "approved_for_proof_run");
  const run = await createProofRunForRequest(converted.reviewRequest.id, product.id, founder);
  assert.equal(run.productContractSnapshot.contractVersion, product.contractVersion);
  assert.equal(run.productContractSnapshot.scope, product.scope);

  const editedVersion = await createProductContractVersion({
    productId: product.productId,
    productName: product.productName,
    contractVersion: "2.0.0",
    status: "current",
    scope: "Changed scope must not mutate v1 proof runs.",
    boundaries: product.boundaries,
    expectedInputs: product.expectedInputs,
    expectedOutputs: product.expectedOutputs,
    evidenceClasses: product.evidenceClasses,
    verificationPath: product.verificationPath,
    deliveryRequirements: product.deliveryRequirements,
    receiptRequirements: product.receiptRequirements,
    responsibleOperator: product.responsibleOperator,
    commercialTerms: product.commercialTerms,
    sourceCatalogVersion: product.sourceCatalogVersion,
  }, founder);
  assert.notEqual(editedVersion.id, run.productContractVersionId);
  assert.equal((await getProofRun(run.id))?.productContractSnapshot.scope, product.scope);

  await transitionProofRun(run.id, "ready", founder);
  await transitionProofRun(run.id, "running", founder);
  await updateProofRun(run.id, { evidenceState: "partial" }, founder);
  assert.equal((await getProofRun(run.id))?.state, "running");
  assert.equal((await getProofRun(run.id))?.evidenceState, "partial");
  await transitionProofRun(run.id, "operator_review", founder);
  await assert.rejects(() => transitionProofRun(run.id, "complete", founder), (error: unknown) => error instanceof AdminCoreError && error.code === "PROOF_NOT_READY");

  await updateProofRun(run.id, {
    scopeComplete: true,
    evidenceState: "complete",
    outputReferences: [...run.requiredOutputs],
    evidenceReferences: ["evidence://case-001"],
    knownGaps: [],
    verificationInstructions: "Open the receipt and follow the named verifier mechanism.",
    customerWordingReviewed: true,
    unsupportedClaims: [],
  }, founder);
  const readyCheck = await buildProofReadiness(run.id);
  assert.equal(readyCheck.fail.length, 0);
  assert.equal(readyCheck.unresolved.length, 0);
  await transitionProofRun(run.id, "complete", founder);

  const deliveryRecord = await prepareDelivery(run.id, founder);
  const failedReadiness = await buildDeliveryReadiness(deliveryRecord.id);
  assert.ok(failedReadiness.fail.some((item) => item.code === "RECEIPT_LINKED"));

  const firstReceipt = await linkReceiptToDelivery(deliveryRecord.id, {
    receiptId: "receipt-001",
    claimScope: "Bounded launch review outputs listed in the product contract.",
    structurallyValid: true,
    evidenceReferences: ["evidence://case-001"],
    verifierMechanism: "witnessops-receipt-verifier-v1",
    verifierResult: "valid",
    limitations: ["Does not prove out-of-scope systems."],
    archiveLocation: "drive://receipts/receipt-001",
  }, founder);
  assert.equal(firstReceipt.verifierMechanism, "witnessops-receipt-verifier-v1");
  assert.equal(firstReceipt.structurallyValid, true);
  const secondReceipt = await linkReceiptToDelivery(deliveryRecord.id, {
    receiptId: "receipt-002",
    claimScope: "Superseding bounded launch review outputs.",
    structurallyValid: true,
    evidenceReferences: ["evidence://case-001", "evidence://case-002"],
    verifierMechanism: "witnessops-receipt-verifier-v1",
    verifierResult: "valid",
    limitations: [],
    archiveLocation: "drive://receipts/receipt-002",
    supersedesReceiptId: firstReceipt.receiptId,
  }, founder);
  assert.equal(secondReceipt.supersedesReceiptId, firstReceipt.receiptId);
  assert.equal((await getAdminCoreState()).receipts.find((receipt) => receipt.receiptId === firstReceipt.receiptId)?.supersededByReceiptId, secondReceipt.receiptId);

  const deliveryReady = await buildDeliveryReadiness(deliveryRecord.id);
  assert.equal(deliveryReady.fail.length, 0);
  assert.equal(deliveryReady.unresolved.length, 0);
  await transitionDelivery(deliveryRecord.id, "ready_for_operator_review", founder);
  const sendReservation = await reserveDeliverySend(
    deliveryRecord.id,
    founder,
    `delivery-send:${deliveryRecord.id}`,
  );
  assert.equal(sendReservation.kind, "reserved");
  assert.ok(sendReservation.kind === "reserved");
  const competingReservation = await reserveDeliverySend(
    deliveryRecord.id,
    founder,
    `delivery-send:${deliveryRecord.id}`,
  );
  assert.equal(competingReservation.kind, "in_progress");
  await assert.rejects(
    () => transitionDelivery(deliveryRecord.id, "draft", founder),
    (error: unknown) =>
      error instanceof AdminCoreError && error.code === "DELIVERY_SEND_UNRESOLVED",
  );
  await assert.rejects(
    () => reconcileDeliverySendReservation(
      deliveryRecord.id,
      { outcome: "not_sent", note: "Premature reconciliation attempt." },
      founder,
    ),
    (error: unknown) =>
      error instanceof AdminCoreError && error.code === "DELIVERY_SEND_STILL_ACTIVE",
  );
  await markDeliverySendOutcomeUnknown(
    deliveryRecord.id,
    sendReservation.reservationToken,
    founder,
  );
  await reconcileDeliverySendReservation(
    deliveryRecord.id,
    { outcome: "not_sent", note: "Provider log confirms no accepted message." },
    founder,
  );
  const retryReservation = await reserveDeliverySend(
    deliveryRecord.id,
    founder,
    `delivery-send:${deliveryRecord.id}:retry`,
  );
  assert.equal(retryReservation.kind, "reserved");
  assert.ok(retryReservation.kind === "reserved");
  await markDeliverySendOutcomeUnknown(
    deliveryRecord.id,
    retryReservation.reservationToken,
    founder,
  );
  const sent = await reconcileDeliverySendReservation(
    deliveryRecord.id,
    {
      outcome: "sent",
      provider: "file",
      providerMessageId: "provider-msg-001",
      sentAt: "2026-07-11T12:10:00Z",
      note: "Provider log confirms message acceptance.",
    },
    founder,
  );
  const sentAgain = await recordDeliverySent(deliveryRecord.id, { provider: "file", providerMessageId: "provider-msg-should-not-duplicate", sentAt: "2026-07-11T12:11:00Z" }, founder);
  assert.equal(sentAgain.providerMessageId, sent.providerMessageId);

  const replayReservation = await reserveDeliverySend(
    deliveryRecord.id,
    founder,
    `delivery-send:${deliveryRecord.id}`,
  );
  assert.equal(replayReservation.kind, "replay");

  const search = await searchCoreRecords("receipt-002");
  assert.ok(search.some((result) => result.type === "receipt" && result.id === secondReceipt.id));
  const serviceSearch = await searchCoreRecords("bounded-workflow-review");
  assert.deepEqual(
    serviceSearch.find((result) => result.type === "service"),
    {
      type: "service",
      id: "bounded-workflow-review",
      label: "Agent Workflow Reconstruction",
      href: "/admin/products#service-bounded-workflow-review",
      matchedField: "id",
    },
  );
  const before = await listAuditEvents();
  const snapshot = await getAdminCoreState();
  snapshot.auditEvents[0]!.action = "tampered in caller copy";
  assert.equal((await getAdminCoreState()).auditEvents[0]?.action, before[0]?.action);
  await recordGmailLabelSync(imported.item.id, ["witnessops/reviewed"], { status: "failed", error: "Gmail label API unavailable" }, founder);
  assert.equal((await getInboxItem(imported.item.id))?.state, "linked");
  assert.ok((await listAuditEvents(imported.item.lineageId)).some((event) => event.action === "gmail_label_sync"));
});
