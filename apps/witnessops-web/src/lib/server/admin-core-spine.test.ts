import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AdminCoreError,
  approveReviewRequest,
  buildDeliveryReadiness,
  buildProofReadiness,
  convertInboxItemToReviewRequest,
  createProductContractVersion,
  createProofRunForRequest,
  getAdminCoreState,
  getInboxItem,
  getProofRun,
  importGmailInboxItem,
  linkReceiptToDelivery,
  listAuditEvents,
  listProductContracts,
  recordDeliverySent,
  recordGmailLabelSync,
  prepareDelivery,
  resetAdminCoreStoreForTests,
  searchCoreRecords,
  transitionDelivery,
  transitionProofRun,
  transitionReviewRequest,
  updateProofRun,
} from "./admin-core-spine";

const founder = { actor: "founder@test", role: "Founder" as const };
const administrator = { actor: "admin@test", role: "Administrator" as const };

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
  const sent = await recordDeliverySent(deliveryRecord.id, { provider: "file", providerMessageId: "provider-msg-001", sentAt: "2026-07-11T12:10:00Z" }, founder);
  const sentAgain = await recordDeliverySent(deliveryRecord.id, { provider: "file", providerMessageId: "provider-msg-should-not-duplicate", sentAt: "2026-07-11T12:11:00Z" }, founder);
  assert.equal(sentAgain.providerMessageId, sent.providerMessageId);

  const search = await searchCoreRecords("receipt-002");
  assert.ok(search.some((result) => result.type === "receipt" && result.id === secondReceipt.id));
  const before = await listAuditEvents();
  const snapshot = await getAdminCoreState();
  snapshot.auditEvents[0]!.action = "tampered in caller copy";
  assert.equal((await getAdminCoreState()).auditEvents[0]?.action, before[0]?.action);
  await recordGmailLabelSync(imported.item.id, ["witnessops/reviewed"], { status: "failed", error: "Gmail label API unavailable" }, founder);
  assert.equal((await getInboxItem(imported.item.id))?.state, "linked");
  assert.ok((await listAuditEvents(imported.item.lineageId)).some((event) => event.action === "gmail_label_sync"));
});
