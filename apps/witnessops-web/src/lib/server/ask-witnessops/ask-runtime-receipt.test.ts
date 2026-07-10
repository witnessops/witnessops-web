import assert from "node:assert/strict";
import test from "node:test";

import { classifyQuestion } from "./authority-classifier";
import { executePolicy } from "./authority-policy-executor";
import { assembleAnswer } from "./authority-answer-assembler";
import {
  createAskRuntimeReceipt,
  verifyAskRuntimeReceipt,
} from "./ask-runtime-receipt";

import {
  retrieveAskRuntimeReceipt,
  type RetrieveReceiptInput,
} from "./ask-runtime-receipt-retriever";

import {
  verifyAskRuntimeReceiptReconstruction,
  type VerifyAskRuntimeReceiptInput,
  type VerificationFailureReason,
} from "./ask-runtime-receipt-verifier";

test("runtime receipt captures full pipeline and supports replay verification", () => {
  const question = "How do I request a fit check?";
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

test("runtime receipt for closed outcome preserves failure reason and reconstructs", () => {
  const question = "Tell me about your private internal systems.";
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
  } as any;

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
  receipt = { ...receipt, deterministic_replay_hash: "replay:deadbeef" } as any;

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

test("retriever surfaces correct error reasons (access denied, not found)", async () => {
  // Access denied path (no actor)
  const badInput: RetrieveReceiptInput = { receipt_id: "ask-receipt:foo", actor: "" };
  const denied = await retrieveAskRuntimeReceipt(badInput);
  assert.equal(denied.ok, false);
  if (!denied.ok) {
    assert.equal(denied.reason, "ACCESS_DENIED");
  }

  // Non-existent -> not found (via read path)
  const missing = await retrieveAskRuntimeReceipt({ receipt_id: "ask-receipt:does-not-exist-xyz", actor: "test-operator" });
  assert.equal(missing.ok, false);
  if (!missing.ok) {
    assert.equal(missing.reason, "RECEIPT_NOT_FOUND");
  }
});

test("reconstruction verifier succeeds on closed-answer receipt with bound projections", () => {
  // Explicit closed-answer reconstruction path (using the independent verifier)
  const question = "Tell me about your private internal systems.";
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
