import assert from "node:assert/strict";
import test from "node:test";

import { classifyQuestion } from "./authority-classifier";
import { executePolicy } from "./authority-policy-executor";
import { assembleAnswer } from "./authority-answer-assembler";
import {
  createAskRuntimeReceipt,
  verifyAskRuntimeReceipt,
} from "./ask-runtime-receipt";

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
