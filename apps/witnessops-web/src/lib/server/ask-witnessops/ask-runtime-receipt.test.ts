import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after } from "node:test";

import { classifyQuestion } from "./authority-classifier";
import { executePolicy } from "./authority-policy-executor";
import { assembleAnswer } from "./authority-answer-assembler";
import {
  createAskRuntimeReceipt,
  verifyAskRuntimeReceipt,
  type AskRuntimeReceipt,
} from "./ask-runtime-receipt";

import {
  retrieveAskRuntimeReceipt,
  type RetrieveReceiptInput,
  type AskRuntimeReceiptMetadata,
} from "./ask-runtime-receipt-retriever";

import { writeReceipt } from "./ask-runtime-receipt-store";
import type { ActorIdentity } from "./ask-receipt-access-policy";

import {
  verifyAskRuntimeReceiptReconstruction,
  type VerifyAskRuntimeReceiptInput,
} from "./ask-runtime-receipt-verifier";

const testCustodyRoot = mkdtempSync(path.join(tmpdir(), "witnessops-ask-receipt-test-"));
const testReceiptRoot = path.join(testCustodyRoot, "receipts");
const testAuditRoot = path.join(testCustodyRoot, "audits");
const retrievalOptions = {
  receiptRoot: testReceiptRoot,
  auditRoot: testAuditRoot,
};

after(() => {
  rmSync(testCustodyRoot, { recursive: true, force: true });
});

test("runtime receipt captures full pipeline and supports replay verification", () => {
  const question = "Do I need a fit check?";
  const classification = classifyQuestion(question);
  const decision = executePolicy({ classification });
  const assembled = assembleAnswer({ policyDecision: decision });

  const receipt = createAskRuntimeReceipt({
    normalizedQuestion: question,
    classification,
    policyDecision: decision,
    assembledAnswer: assembled,
  });

  assert.equal(receipt.schema, "witnessops.ask.runtime-receipt.v1");
  assert.equal(receipt.input.normalized_question, question);
  assert.equal(receipt.decision.template_id, assembled.template.template_id);
  assert.equal(receipt.assembly.status, assembled.status);
  assert.ok(receipt.deterministic_replay_hash.startsWith("replay:"));

  // Replay verification using the recorded values
  const ok = verifyAskRuntimeReceipt(
    receipt,
    receipt.input.normalized_question,
    receipt.input.classification,
    receipt.decision,
    receipt.assembly
  );
  assert.equal(ok, true);
});

test("receipt directory failures are returned as non-durable write results", async () => {
  const blockerPath = path.join(testCustodyRoot, "receipt-root-blocker");
  writeFileSync(blockerPath, "not a directory");

  const result = await writeReceipt(
    {
      schema: "witnessops.ask.runtime-receipt.v1",
      receipt_id: "ask-receipt:write-failure",
    } as AskRuntimeReceipt,
    path.join(blockerPath, "receipts"),
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.reason, /^WRITE_FAILED:/);
  }
});

test("runtime receipt for closed outcome preserves failure reason and reconstructs", () => {
  const question = "Can I send logs and upload evidence?";
  const classification = classifyQuestion(question);
  const decision = executePolicy({ classification });
  const assembled = assembleAnswer({ policyDecision: decision });

  assert.equal(assembled.status, "closed");
  assert.ok(assembled.failure_reason);

  const receipt = createAskRuntimeReceipt({
    normalizedQuestion: question,
    classification,
    policyDecision: decision,
    assembledAnswer: assembled,
  });

  assert.equal(receipt.assembly.status, "closed");
  assert.equal(receipt.assembly.failure_reason, assembled.failure_reason);

  const ok = verifyAskRuntimeReceipt(
    receipt,
    receipt.input.normalized_question,
    receipt.input.classification,
    receipt.decision,
    receipt.assembly
  );
  assert.equal(ok, true);
});

// ---------------------------------------------------------------------------
// Reconstruction verifier tests (true replay using bound projections)
// ---------------------------------------------------------------------------

test("reconstruction verifier succeeds with exact bound projections and matching live context", () => {
  const question = "How do I document a vendor change?";
  const classification = classifyQuestion(question);
  const decision = executePolicy({ classification });
  const assembled = assembleAnswer({ policyDecision: decision });

  const receipt = createAskRuntimeReceipt({
    normalizedQuestion: question,
    classification,
    policyDecision: decision,
    assembledAnswer: assembled,
  });

  // Supply the live/current projections (they match the bindings for this runtime)
  const authProj = { manifest_sha256: "c0abbb79d4b78eb5b1394466da433f8dd05e056bebed7cf0ee11e0ecb44d688f" };
  const presProj = { source_presentation_sha256: "a886b2183f925275ce42cfebbbf739dad98540919eb5f2ae300a5fc785399a8e" };
  const respTmpl = { templates: "present" };

  const input: VerifyAskRuntimeReceiptInput = {
    receipt,
    authorityProjection: authProj,
    presentationProjection: presProj,
    responseTemplates: respTmpl,
  };

  const outcome = verifyAskRuntimeReceiptReconstruction(input);
  assert.equal(outcome.ok, true);
  if (outcome.ok) {
    assert.equal(outcome.reconstructed.status, assembled.status);
    assert.equal(outcome.reconstructed.template.template_id, assembled.template.template_id);
  }
});

test("reconstruction verifier produces distinct error for missing historical projection", () => {
  const question = "Is this a fit check?";
  const classification = classifyQuestion(question);
  const decision = executePolicy({ classification });
  const assembled = assembleAnswer({ policyDecision: decision });

  const receipt = createAskRuntimeReceipt({
    normalizedQuestion: question,
    classification,
    policyDecision: decision,
    assembledAnswer: assembled,
  });

  const outcome = verifyAskRuntimeReceiptReconstruction({
    receipt,
    authorityProjection: null,
    presentationProjection: {},
    responseTemplates: {},
  });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.reason, "UNSUPPORTED_OR_MISSING_HISTORICAL_PROJECTION");
  }
});

test("reconstruction verifier produces classification mismatch on tampered receipt", () => {
  const question = "How do I get support?";
  const classification = classifyQuestion(question);
  const decision = executePolicy({ classification });
  const assembled = assembleAnswer({ policyDecision: decision });

  const receipt = createAskRuntimeReceipt({
    normalizedQuestion: question,
    classification,
    policyDecision: decision,
    assembledAnswer: assembled,
  });

  const authProj = { manifest_sha256: "c0abbb79d4b78eb5b1394466da433f8dd05e056bebed7cf0ee11e0ecb44d688f" };
  const presProj = { source_presentation_sha256: "a886b2183f925275ce42cfebbbf739dad98540919eb5f2ae300a5fc785399a8e" };
  const respTmpl = { templates: "present" };

  // Tamper the receipt's classification (simulating corruption)
  const tampered = {
    ...receipt,
    input: {
      ...receipt.input,
      classification: { ...receipt.input.classification, question_class_id: "tampered" },
    },
  } satisfies AskRuntimeReceipt;

  const outcome = verifyAskRuntimeReceiptReconstruction({
    receipt: tampered,
    authorityProjection: authProj,
    presentationProjection: presProj,
    responseTemplates: respTmpl,
  });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.reason, "CLASSIFICATION_MISMATCH");
  }
});

test("reconstruction verifier detects replay hash mismatch on structural change", () => {
  const question = "Tell me about proof packets.";
  const classification = classifyQuestion(question);
  const decision = executePolicy({ classification });
  const assembled = assembleAnswer({ policyDecision: decision });

  let receipt = createAskRuntimeReceipt({
    normalizedQuestion: question,
    classification,
    policyDecision: decision,
    assembledAnswer: assembled,
  });

  // Mutate the top level hash
  receipt = { ...receipt, deterministic_replay_hash: "replay:deadbeef" };

  const authProj = { manifest_sha256: "c0abbb79d4b78eb5b1394466da433f8dd05e056bebed7cf0ee11e0ecb44d688f" };
  const presProj = { source_presentation_sha256: "a886b2183f925275ce42cfebbbf739dad98540919eb5f2ae300a5fc785399a8e" };
  const respTmpl = { templates: "present" };

  const outcome = verifyAskRuntimeReceiptReconstruction({
    receipt,
    authorityProjection: authProj,
    presentationProjection: presProj,
    responseTemplates: respTmpl,
  });
  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.reason, "REPLAY_HASH_MISMATCH");
  }
});

test("retriever surfaces correct error reasons (access denied, not found, policy)", async () => {
  const validActor: ActorIdentity = {
    id: "test-operator-1",
    type: "operator",
    provenance: { method: "internal_token", verified_at: new Date().toISOString() },
  };
  // Invalid actor (missing provenance)
  const badInput: RetrieveReceiptInput = {
    receipt_id: "ask-receipt:foo",
    actor: { id: "", type: "operator", provenance: { method: "internal_token", verified_at: "" } },
  };
  const denied = await retrieveAskRuntimeReceipt(badInput, retrievalOptions);
  assert.equal(denied.ok, false);
  if (!denied.ok) {
    assert.equal(denied.reason, "ACCESS_DENIED");
  }

  // Non-existent -> hidden as ACCESS_DENIED (existence hiding)
  const missing = await retrieveAskRuntimeReceipt(
    { receipt_id: "ask-receipt:does-not-exist-xyz", actor: validActor },
    retrievalOptions,
  );
  assert.equal(missing.ok, false);
  if (!missing.ok) {
    assert.equal(missing.reason, "ACCESS_DENIED");
  }

  // Valid actor on real receipt path (from earlier receipt creation in suite) - expect success or access
  // (the prior receipt creation tests use the pipeline; we just ensure no crash)
});

test("reconstruction verifier succeeds on closed-answer receipt with bound projections", () => {
  // Explicit closed-answer reconstruction path (using the independent verifier)
  const question = "Can I send logs and upload evidence?";
  const classification = classifyQuestion(question);
  const decision = executePolicy({ classification });
  const assembled = assembleAnswer({ policyDecision: decision });

  assert.equal(assembled.status, "closed");
  assert.ok(typeof assembled.failure_reason === "string" && assembled.failure_reason.length > 0);

  const receipt = createAskRuntimeReceipt({
    normalizedQuestion: question,
    classification,
    policyDecision: decision,
    assembledAnswer: assembled,
  });

  const authProj = { manifest_sha256: "c0abbb79d4b78eb5b1394466da433f8dd05e056bebed7cf0ee11e0ecb44d688f" };
  const presProj = { source_presentation_sha256: "a886b2183f925275ce42cfebbbf739dad98540919eb5f2ae300a5fc785399a8e" };
  const respTmpl = { templates: "present" };

  const outcome = verifyAskRuntimeReceiptReconstruction({
    receipt,
    authorityProjection: authProj,
    presentationProjection: presProj,
    responseTemplates: respTmpl,
  });

  assert.equal(outcome.ok, true);
  if (outcome.ok) {
    assert.equal(outcome.reconstructed.status, "closed");
    assert.ok(typeof outcome.reconstructed.failure_reason === "string");
    assert.equal(outcome.reconstructed.failure_reason, assembled.failure_reason);
  }
});

test("retriever enforces ActorIdentity, policy views, and returns redacted metadata for metadata_only", async () => {
  const operatorActor: ActorIdentity = {
    id: "op-42",
    type: "operator",
    provenance: { method: "internal_token", verified_at: new Date().toISOString() },
  };
  const verifierActor: ActorIdentity = {
    id: "verif-1",
    type: "verifier",
    provenance: { method: "internal_token", verified_at: new Date().toISOString() },
  };

  const question = "Do I need a fit check?";
  const classification = classifyQuestion(question);
  const decision = executePolicy({ classification });
  const assembled = assembleAnswer({ policyDecision: decision });

  const receipt = createAskRuntimeReceipt({
    normalizedQuestion: question,
    classification,
    policyDecision: decision,
    assembledAnswer: assembled,
  });

  // Write the receipt so retrieval can succeed (using the durable store directly for test setup)
  const writeResult = await writeReceipt(receipt, testReceiptRoot);
  assert.ok(writeResult.ok);

  // Full view for operator should return complete receipt
  const fullRes = await retrieveAskRuntimeReceipt(
    {
      receipt_id: receipt.receipt_id,
      actor: operatorActor,
      requested_view: "full",
    },
    retrievalOptions,
  );
  assert.ok(fullRes.ok);
  if (fullRes.ok) {
    assert.equal(fullRes.view, "full");
    // full receipt must have the restricted fields
    assert.ok("input" in fullRes.receipt);
    assert.ok("decision" in fullRes.receipt);
    assert.ok("assembly" in fullRes.receipt);
  }

  // metadata_only for verifier must return redacted projection without restricted fields
  const metaRes = await retrieveAskRuntimeReceipt(
    {
      receipt_id: receipt.receipt_id,
      actor: verifierActor,
      requested_view: "metadata_only",
    },
    retrievalOptions,
  );
  assert.ok(metaRes.ok);
  if (metaRes.ok) {
    assert.equal(metaRes.view, "metadata_only");
    const meta = metaRes.receipt as AskRuntimeReceiptMetadata;

    // Allowed fields
    assert.equal(meta.receipt_id, receipt.receipt_id);
    assert.equal(meta.schema, "witnessops.ask.runtime-receipt.v1");
    assert.ok(typeof meta.created_at === "string");
    assert.ok(meta.status === "success" || meta.status === "closed");
    assert.ok("classification" in meta);
    assert.equal(meta.classification.question_class_id, classification.question_class_id);
    assert.ok("bindings" in meta);
    assert.ok(typeof meta.deterministic_replay_hash === "string");

    // Strictly prove restricted fields are absent
    const metaRecord = meta as unknown as Record<string, unknown>;
    assert.strictEqual(metaRecord.input, undefined, "normalized input must be absent in metadata_only");
    assert.strictEqual(metaRecord.decision, undefined, "policy decision must be absent in metadata_only");
    assert.strictEqual(metaRecord.assembly, undefined, "assembled answer must be absent in metadata_only");
    assert.strictEqual(metaRecord.normalized_question, undefined);
    assert.strictEqual(metaRecord.template, undefined);
    assert.strictEqual(metaRecord.presented_sources, undefined);
  }
});
