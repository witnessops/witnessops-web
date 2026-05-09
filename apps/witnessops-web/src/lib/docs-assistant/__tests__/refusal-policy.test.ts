import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDocsAssistantRefusalAnswer,
  evaluateDocsAssistantRefusalPolicy,
} from "../refusal-policy";

test("docs assistant refusal policy blocks compliance certification claims", () => {
  const decision = evaluateDocsAssistantRefusalPolicy(
    "Can WitnessOps certify my company is compliant?",
  );

  assert.equal(decision.blocked, true);
  assert.match(decision.boundary_findings.join(","), /compliance_certification/);
  assert.deepEqual(
    ["compliance_correctness", "security_posture", "source_system_truth"].every(
      (boundary) => decision.not_proven.includes(boundary),
    ),
    true,
  );
});

test("docs assistant refusal policy blocks proof-bundle verification by assistant", () => {
  const decision = evaluateDocsAssistantRefusalPolicy(
    "Can the Docs Assistant verify my proof bundle?",
  );

  assert.equal(decision.blocked, true);
  assert.match(decision.boundary_findings.join(","), /proof_bundle_verification/);
  assert.deepEqual(
    ["proof_bundle_verification", "artifact_verification", "verifier_authority"].every(
      (boundary) => decision.not_proven.includes(boundary),
    ),
    true,
  );
});

test("docs assistant refusal answer returns cannot_claim", () => {
  const decision = evaluateDocsAssistantRefusalPolicy(
    "Is this assistant production-ready?",
  );
  const answer = buildDocsAssistantRefusalAnswer({
    question: "Is this assistant production-ready?",
    decision,
  });

  assert.equal(answer.answer_status, "cannot_claim");
  assert.equal(answer.human_review_required, true);
  assert.match(answer.boundary_findings.join(","), /production_readiness/);
});
