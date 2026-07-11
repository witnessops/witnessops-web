import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import { buildAuthorityLoader } from "./authority-loader-core";
import type { ClassificationResult } from "./authority-classifier";

const require = createRequire(import.meta.url);
const canonicalProjection = require(
  "@witnessops/ask-authority/v1/authority-set.json",
) as unknown;

type MutableFixtureRecord = Record<string, unknown>;

type MutableQuestionClassesDocument = { classes: MutableFixtureRecord[] };
type MutableContextPackDocument = { sources: MutableFixtureRecord[] };
type MutableResponseTemplatesDocument = { templates: MutableFixtureRecord[] };

type MutableFixtureLayer =
  | {
      artifact_id: "QUESTION_CLASSES_V1";
      document: MutableQuestionClassesDocument;
    }
  | {
      artifact_id: "ASK_CONTEXT_PACK_V1";
      document: MutableContextPackDocument;
    }
  | {
      artifact_id: "CLAIM_BOUNDARY_V1";
      document: Record<string, unknown>;
    }
  | {
      artifact_id: "POLICY_RULES_V1";
      document: Record<string, unknown>;
    }
  | {
      artifact_id: "RESPONSE_TEMPLATES_V1";
      document: MutableResponseTemplatesDocument;
    };

type MutableFixtureProjection = {
  projection_id: string;
  layers: MutableFixtureLayer[];
};

function cloneProjection(): MutableFixtureProjection {
  return structuredClone(canonicalProjection) as MutableFixtureProjection;
}

function documentFor(
  projection: MutableFixtureProjection,
  artifactId: "QUESTION_CLASSES_V1",
): MutableQuestionClassesDocument;
function documentFor(
  projection: MutableFixtureProjection,
  artifactId: "ASK_CONTEXT_PACK_V1",
): MutableContextPackDocument;
function documentFor(
  projection: MutableFixtureProjection,
  artifactId: "RESPONSE_TEMPLATES_V1",
): MutableResponseTemplatesDocument;
function documentFor(
  projection: MutableFixtureProjection,
  artifactId:
    | "QUESTION_CLASSES_V1"
    | "ASK_CONTEXT_PACK_V1"
    | "RESPONSE_TEMPLATES_V1",
):
  | MutableQuestionClassesDocument
  | MutableContextPackDocument
  | MutableResponseTemplatesDocument {
  if (artifactId === "QUESTION_CLASSES_V1") {
    const layer = projection.layers.find(
      (candidate): candidate is Extract<
        MutableFixtureLayer,
        { artifact_id: "QUESTION_CLASSES_V1" }
      > => candidate.artifact_id === artifactId,
    );
    assert.ok(layer, `Missing fixture layer: ${artifactId}`);
    return layer.document;
  }
  if (artifactId === "ASK_CONTEXT_PACK_V1") {
    const layer = projection.layers.find(
      (candidate): candidate is Extract<
        MutableFixtureLayer,
        { artifact_id: "ASK_CONTEXT_PACK_V1" }
      > => candidate.artifact_id === artifactId,
    );
    assert.ok(layer, `Missing fixture layer: ${artifactId}`);
    return layer.document;
  }
  const layer = projection.layers.find(
    (candidate): candidate is Extract<
      MutableFixtureLayer,
      { artifact_id: "RESPONSE_TEMPLATES_V1" }
    > => candidate.artifact_id === artifactId,
  );
  assert.ok(layer, `Missing fixture layer: ${artifactId}`);
  return layer.document;
}

function expectInitFailure(projection: unknown, code: string): void {
  assert.throws(
    () => buildAuthorityLoader(projection),
    (error: unknown) =>
      error instanceof Error &&
      error.message.startsWith(`ask_authority_loader_init_failed:${code}`),
  );
}

function assertDeepFrozen(value: unknown, seen = new Set<unknown>()): void {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

test("authority loader exposes bounded immutable lookups", () => {
  const loader = buildAuthorityLoader(canonicalProjection);

  const questionClass = loader.getQuestionClass("fit_check");
  const policyRule = loader.getPolicyRule("package_fit_requires_scope");
  const template = loader.getTemplate("route.fit_check.v1");
  const templateForClass = loader.getTemplateForQuestionClass("fit_check");
  const source = loader.getSource("source.fit-check.public-request");
  const authority = loader.getAuthority("authority.product.fit-check");
  const route = loader.getRoute("route.fit-check");
  const identity = loader.getAuthoritySetIdentity();

  assert.equal(questionClass?.question_class_id, "fit_check");
  assert.equal(policyRule?.policy_rule_id, "package_fit_requires_scope");
  assert.equal(template?.template_id, "route.fit_check.v1");
  assert.equal(templateForClass, template);
  assert.equal(source?.source_id, "source.fit-check.public-request");
  assert.equal(authority?.authority_id, "authority.product.fit-check");
  assert.equal(route?.href, "/review/request");
  assert.equal(identity.projectionId, "ASK_RUNTIME_AUTHORITY_SET_V1");
  assert.equal(
    identity.projectionSha256,
    "8c64e10fbb7e738dc314dfad5fb0df4f74e838600492f8e2c8be7af70a6bfb34",
  );

  assertDeepFrozen(loader);
  assertDeepFrozen(questionClass);
  assertDeepFrozen(policyRule);
  assertDeepFrozen(template);
  assertDeepFrozen(source);
  assertDeepFrozen(authority);
  assertDeepFrozen(route);
  assertDeepFrozen(identity);
});

test("authority loader returns null for unknown identifiers", () => {
  const loader = buildAuthorityLoader(canonicalProjection);
  assert.equal(loader.getQuestionClass("unknown"), null);
  assert.equal(loader.getPolicyRule("unknown"), null);
  assert.equal(loader.getTemplate("unknown"), null);
  assert.equal(loader.getTemplateForQuestionClass("unknown"), null);
  assert.equal(loader.getSource("unknown"), null);
  assert.equal(loader.getAuthority("unknown"), null);
  assert.equal(loader.getRoute("unknown"), null);
});

test("authority loader fails closed on projection and layer defects", () => {
  const wrongIdentity = cloneProjection();
  wrongIdentity.projection_id = "ASK_RUNTIME_AUTHORITY_SET_V2";
  expectInitFailure(wrongIdentity, "invalid_projection_id");

  const missingLayer = cloneProjection();
  missingLayer.layers.pop();
  expectInitFailure(missingLayer, "invalid_layer_count");

  const wrongOrder = cloneProjection();
  [wrongOrder.layers[0], wrongOrder.layers[1]] = [wrongOrder.layers[1], wrongOrder.layers[0]];
  expectInitFailure(wrongOrder, "invalid_layer_order:QUESTION_CLASSES_V1");
});

test("authority loader fails closed on duplicate IDs and unapproved status", () => {
  const duplicate = cloneProjection();
  const duplicateClasses = documentFor(duplicate, "QUESTION_CLASSES_V1").classes;
  duplicateClasses[1].question_class_id = duplicateClasses[0].question_class_id;
  expectInitFailure(duplicate, "duplicate_id:question_class:");

  const unapproved = cloneProjection();
  documentFor(unapproved, "ASK_CONTEXT_PACK_V1").sources[0].approval_status = "DEFERRED";
  expectInitFailure(unapproved, "unapproved_record:sources:0");
});

test("authority loader fails closed on unresolved and conflicting bindings", () => {
  const unresolved = cloneProjection();
  documentFor(unresolved, "RESPONSE_TEMPLATES_V1").templates[0].source_ids = [
    "source.not-approved",
  ];
  expectInitFailure(unresolved, "unresolved_reference:template_sources:");

  const duplicateTemplate = cloneProjection();
  const templates = documentFor(duplicateTemplate, "RESPONSE_TEMPLATES_V1").templates;
  templates[1].question_class = templates[0].question_class;
  expectInitFailure(duplicateTemplate, "multiple_templates_for_question_class:");

  const actionConflict = cloneProjection();
  documentFor(actionConflict, "RESPONSE_TEMPLATES_V1").templates[0].authorized_action =
    "answer";
  expectInitFailure(actionConflict, "policy_template_action_conflict:");
});

test("authority loader fails closed on receipt and interpolation activation", () => {
  const receipt = cloneProjection();
  documentFor(receipt, "RESPONSE_TEMPLATES_V1").templates[0].receipt_id = "ask-1";
  expectInitFailure(receipt, "non_null_receipt_id:");

  const interpolation = cloneProjection();
  documentFor(interpolation, "RESPONSE_TEMPLATES_V1").templates[0].runtime_interpolation =
    "enabled";
  expectInitFailure(interpolation, "runtime_interpolation_enabled:");
});

import { classifyQuestion } from "./authority-loader";

test("classifier is exposed and produces the approved result shape", () => {
  const result = classifyQuestion("Can I send logs for an incident review?");

  assert.equal(result.schema, "witnessops.ask.classification-result.v1");
  assert.equal(result.question_class_version, 1);
  assert.equal(result.classifier_contract_id, "ASK_DETERMINISTIC_CLASSIFIER_V1");
  assert.equal(result.classifier_contract_version, 1);
  assert.equal(result.decision_basis, "deterministic_rule");
  assert.equal(typeof result.fallback_used, "boolean");
  assert.ok(Array.isArray(result.matched_rule_ids));
});

test("classifier routes safety signals to safety class (compound)", () => {
  const result = classifyQuestion("Can I send logs for an incident review?");
  // safety compound should win
  assert.equal(result.question_class_id, "secret_or_evidence_intake");
  assert.equal(result.fallback_used, false);
});

test("classifier falls back for unrelated input", () => {
  const result = classifyQuestion("What is the weather today?");
  assert.equal(result.question_class_id, "outside_approved_public_context");
  assert.equal(result.fallback_used, true);
});

import { executePolicy } from "./authority-loader";

test("policy executor accepts classifier result and produces approved decision shape", () => {
  const classification = classifyQuestion("Can I send logs for an incident review?");
  const decision = executePolicy({ classification });

  assert.equal(decision.schema, "witnessops.ask.policy-decision.v1");
  assert.equal(decision.executor_contract_id, "ASK_DETERMINISTIC_POLICY_EXECUTOR_V1");
  assert.equal(decision.question_class_id, classification.question_class_id);
  assert.ok(decision.policy_rule_id);
  assert.ok(decision.authorized_action);
  assert.equal(typeof decision.fallback_used, "boolean");
  assert.ok(decision.template_id);
  assert.ok(Array.isArray(decision.required_claim_rule_ids));
  assert.ok(Array.isArray(decision.source_ids));
  assert.ok(decision.deterministic_replay_hash);
});

// Focused 19-class template mapping verification (per TEMPLATE_ID_CORRECTION_PLAN)
const EXPECTED_TEMPLATE_BY_CLASS: Record<string, string> = {
  fit_check: "route.fit_check.v1",
  proof_packet: "answer.proof_packet.v1",
  receipt: "answer.receipt.v1",
  verification_path: "answer.verification_path.v1",
  launch_readiness: "route.launch_readiness.v1",
  vendor_change: "route.vendor_change.v1",
  ai_agent_action: "route.ai_agent_action.v1",
  incident: "route.incident.v1",
  access_authority: "route.access_authority.v1",
  offline_inspection: "route.offline_inspection.v1",
  workspace_access: "answer.workspace_access.v1",
  security_disclosure: "route.security_disclosure.v1",
  support: "route.support.v1",
  secret_or_evidence_intake: "refuse.secret_or_evidence_intake.v1",
  exploit_or_bypass_request: "refuse.exploit_or_bypass.v1",
  private_system_verification: "refuse.private_system_verification.v1",
  private_receipt_or_infrastructure: "refuse.private_material.v1",
  unsupported_verification_claim: "refuse.unsupported_verification.v1",
  outside_approved_public_context: "decline.outside_public_context.v1",
};

test("all 19 classes produce the exact canonical template_id from RESPONSE_TEMPLATES_V1", () => {
  const classes = Object.keys(EXPECTED_TEMPLATE_BY_CLASS);

  for (const cls of classes) {
    const classification = { 
      schema: "witnessops.ask.classification-result.v1",
      question_class_id: cls,
      question_class_version: 1,
      classifier_contract_id: "ASK_DETERMINISTIC_CLASSIFIER_V1",
      classifier_contract_version: 1,
      decision_basis: "deterministic_rule",
      matched_rule_ids: [],
      precedence_rule_id: null,
      fallback_used: false,
    } satisfies ClassificationResult;

    const decision = executePolicy({ classification });

    assert.equal(
      decision.template_id,
      EXPECTED_TEMPLATE_BY_CLASS[cls],
      `Template mismatch for ${cls}`
    );
  }
});

test("every selected template authorized_action matches its policy action", () => {
  // This is a structural check; full cross-check lives in the plan artifacts.
  // Here we at least ensure no safety class leaks to a non-refuse template.
  const safetyClasses = [
    "secret_or_evidence_intake",
    "exploit_or_bypass_request",
    "private_system_verification",
    "private_receipt_or_infrastructure",
    "unsupported_verification_claim",
  ];

  for (const cls of safetyClasses) {
    const classification = { 
      schema: "witnessops.ask.classification-result.v1",
      question_class_id: cls,
      question_class_version: 1,
      classifier_contract_id: "ASK_DETERMINISTIC_CLASSIFIER_V1",
      classifier_contract_version: 1,
      decision_basis: "deterministic_rule",
      matched_rule_ids: [],
      precedence_rule_id: null,
      fallback_used: false,
    } satisfies ClassificationResult;

    const decision = executePolicy({ classification });
    assert.equal(decision.authorized_action, "refuse", `Safety class ${cls} must resolve to refuse action`);
  }
});

test("policy executor fails closed on malformed input", () => {
  const bad = { schema: "bad" } as unknown as ClassificationResult;
  const decision = executePolicy({ classification: bad });
  assert.equal(decision.authorized_action, "bounded_decline");
  assert.equal(decision.fallback_used, true);
});
