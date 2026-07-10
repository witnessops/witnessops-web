// witnessops-authority-companion-validator 1.0.0
// Cross-layer, hash, custody-boundary, and manifest validation for Ask authority V1.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { canonicalize } from "../tools/jcs.mjs";

export const TOOL_NAME = "witnessops-authority-companion-validator";
export const TOOL_VERSION = "1.0.0";

const ACTIONS = new Set(["answer", "refuse", "route_fit_check", "route_support", "route_security_disclosure", "bounded_decline"]);
const CONFIDENCE = new Set(["exact_template", "single_source", "multiple_sources", "claim_boundary", "policy_only"]);
const QUESTION_IDS = new Set([
  "fit_check", "proof_packet", "receipt", "verification_path", "launch_readiness", "vendor_change",
  "ai_agent_action", "incident", "access_authority", "offline_inspection", "workspace_access",
  "security_disclosure", "support", "secret_or_evidence_intake", "exploit_or_bypass_request",
  "private_system_verification", "private_receipt_or_infrastructure",
  "unsupported_verification_claim", "outside_approved_public_context",
]);
const BASENAMES = [
  "question-classes.v1.json", "ask-context-pack.v1.json", "claim-boundary.v1.json",
  "policy-rules.v1.json", "response-templates.v1.json",
];
const FORBIDDEN_KEY = /(matcher|regex|keyword|score|weight|runtime[_-]?precedence)/i;
const FORBIDDEN_STRING = /(\/Users\/|\/home\/|\/var\/receipts(?:\/|\b)|\.codex(?:\/|\b)|127\.0\.0\.1|localhost)/i;

function sha256(bytes) { return crypto.createHash("sha256").update(bytes).digest("hex"); }
function unique(values) { return new Set(values).size === values.length; }
function assert(condition, code, errors) { if (!condition) errors.push(code); }
function flattenConditional(value) {
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap((entry) => Array.isArray(entry) ? entry : []);
}
function collectStringsAndKeys(value, location, strings, keys) {
  if (typeof value === "string") { strings.push([location, value]); return; }
  if (Array.isArray(value)) { value.forEach((entry, index) => collectStringsAndKeys(entry, `${location}/${index}`, strings, keys)); return; }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      keys.push([`${location}/${key}`, key]);
      collectStringsAndKeys(entry, `${location}/${key}`, strings, keys);
    }
  }
}

export function scanForbiddenContent(value, location = "$") {
  const strings = [], keys = [], errors = [];
  collectStringsAndKeys(value, location, strings, keys);
  keys.forEach(([entryLocation, key]) => { if (FORBIDDEN_KEY.test(key)) errors.push(`runtime_field:${entryLocation}`); });
  strings.forEach(([entryLocation, stringValue]) => { if (FORBIDDEN_STRING.test(stringValue)) errors.push(`private_path:${entryLocation}`); });
  return errors.sort();
}

function resolvePath(staging, basename, pending) {
  return path.join(staging, pending ? `.${basename}.pending` : basename);
}

function loadArtifact(staging, basename, pending, errors) {
  const file = resolvePath(staging, basename, pending);
  assert(fs.existsSync(file), `missing_file:${basename}`, errors);
  if (!fs.existsSync(file)) return null;
  const bytes = fs.readFileSync(file);
  let value;
  try { value = JSON.parse(bytes.toString("utf8")); } catch (error) { errors.push(`json_parse:${basename}:${error.message}`); return null; }
  try { assert(Buffer.compare(bytes, canonicalize(value)) === 0, `noncanonical:${basename}`, errors); }
  catch (error) { errors.push(`canonicalization:${basename}:${error.message}`); }
  return { value, bytes, digest: sha256(bytes), file };
}

function idSet(records, key, label, errors) {
  const values = records.map((record) => record[key]);
  assert(values.every((value) => typeof value === "string" && value.length > 0), `${label}:invalid_id`, errors);
  assert(unique(values), `${label}:duplicate_id`, errors);
  return new Set(values);
}

function checkDependencies(record, expected, label, errors) {
  const dependencies = record.value.dependencies || {};
  for (const [artifactId, target] of Object.entries(expected)) {
    const dependency = dependencies[artifactId];
    assert(Boolean(dependency), `${label}:dependency_missing:${artifactId}`, errors);
    if (!dependency) continue;
    assert(dependency.basename === target.basename, `${label}:dependency_basename:${artifactId}`, errors);
    assert(dependency.sha256 === target.digest, `${label}:dependency_hash:${artifactId}`, errors);
  }
  assert(Object.keys(dependencies).length === Object.keys(expected).length, `${label}:dependency_count`, errors);
}

export function validateAuthoritySet(staging, { pending = false, requireManifest = false } = {}) {
  const errors = [];
  const loaded = Object.fromEntries(BASENAMES.map((basename) => [basename, loadArtifact(staging, basename, pending, errors)]));
  if (errors.length || Object.values(loaded).some((entry) => !entry)) return errors.sort();
  const q = loaded[BASENAMES[0]], c = loaded[BASENAMES[1]], b = loaded[BASENAMES[2]], p = loaded[BASENAMES[3]], t = loaded[BASENAMES[4]];

  checkDependencies(c, { QUESTION_CLASSES_V1: { basename: BASENAMES[0], digest: q.digest } }, "context", errors);
  checkDependencies(b, {
    QUESTION_CLASSES_V1: { basename: BASENAMES[0], digest: q.digest },
    ASK_CONTEXT_PACK_V1: { basename: BASENAMES[1], digest: c.digest },
  }, "claim", errors);
  checkDependencies(p, {
    QUESTION_CLASSES_V1: { basename: BASENAMES[0], digest: q.digest },
    ASK_CONTEXT_PACK_V1: { basename: BASENAMES[1], digest: c.digest },
    CLAIM_BOUNDARY_V1: { basename: BASENAMES[2], digest: b.digest },
  }, "policy", errors);
  checkDependencies(t, {
    QUESTION_CLASSES_V1: { basename: BASENAMES[0], digest: q.digest },
    ASK_CONTEXT_PACK_V1: { basename: BASENAMES[1], digest: c.digest },
    CLAIM_BOUNDARY_V1: { basename: BASENAMES[2], digest: b.digest },
    POLICY_RULES_V1: { basename: BASENAMES[3], digest: p.digest },
  }, "template", errors);

  assert(q.value.classes.length === 19, "count:question_classes", errors);
  assert(c.value.authorities.length === 10, "count:authorities", errors);
  assert(c.value.sources.length === 11, "count:sources", errors);
  assert(c.value.selected_sections.length === 49, "count:selected_sections", errors);
  assert(c.value.question_class_support.length === 19, "count:class_support", errors);
  assert(c.value.routes.length === 3, "count:routes", errors);
  assert(c.value.terminology.length === 16, "count:terminology", errors);
  assert(c.value.deferred_items.length === 1, "count:deferred", errors);
  assert(c.value.rejected_items.length === 1, "count:rejected", errors);
  assert(b.value.rules.length === 33, "count:claim_rules", errors);
  assert(b.value.inference_classes.length === 5, "count:inference_classes", errors);
  assert(b.value.mechanism_vocabulary.length === 7, "count:mechanisms", errors);
  assert(p.value.rules.length === 11, "count:policy_rules", errors);
  assert(t.value.templates.length === 19, "count:templates", errors);

  const questionIds = idSet(q.value.classes, "question_class_id", "question", errors);
  assert(questionIds.size === QUESTION_IDS.size && [...QUESTION_IDS].every((id) => questionIds.has(id)), "question:id_set", errors);
  const authorityIds = idSet(c.value.authorities, "authority_id", "authority", errors);
  const sourceIds = idSet(c.value.sources, "source_id", "source", errors);
  const sectionIds = idSet(c.value.selected_sections, "section_id", "section", errors);
  const claimIds = idSet(b.value.rules, "claim_rule_id", "claim", errors);
  const policyIds = idSet(p.value.rules, "policy_rule_id", "policy", errors);
  const templateIds = idSet(t.value.templates, "template_id", "template", errors);
  assert(templateIds.size === 19, "template:id_count", errors);

  for (const record of q.value.classes) {
    assert(policyIds.has(record.default_policy_rule_ref), `question:policy_ref:${record.question_class_id}`, errors);
    record.adjacent_classes.forEach((id) => assert(questionIds.has(id), `question:adjacent_ref:${record.question_class_id}:${id}`, errors));
  }
  for (const authority of c.value.authorities) {
    authority.source_ids.forEach((id) => assert(sourceIds.has(id), `authority:source_ref:${authority.authority_id}:${id}`, errors));
    authority.supported_classes.forEach((id) => assert(questionIds.has(id), `authority:class_ref:${authority.authority_id}:${id}`, errors));
  }
  const sectionOwner = new Map();
  for (const section of c.value.selected_sections) {
    assert(sourceIds.has(section.source_id), `section:source_ref:${section.section_id}`, errors);
    assert(!sectionOwner.has(section.section_id), `section:duplicate_owner:${section.section_id}`, errors);
    sectionOwner.set(section.section_id, section.source_id);
  }
  for (const source of c.value.sources) {
    source.selected_section_ids.forEach((id) => assert(sectionOwner.get(id) === source.source_id, `source:section_owner:${source.source_id}:${id}`, errors));
    source.supported_question_classes.forEach((id) => assert(questionIds.has(id), `source:class_ref:${source.source_id}:${id}`, errors));
  }
  for (const support of c.value.question_class_support) {
    assert(questionIds.has(support.question_class_id), `support:class_ref:${support.question_class_id}`, errors);
    support.authority_ids.forEach((id) => assert(authorityIds.has(id), `support:authority_ref:${support.question_class_id}:${id}`, errors));
    support.source_ids.forEach((id) => assert(sourceIds.has(id), `support:source_ref:${support.question_class_id}:${id}`, errors));
  }
  const routeMap = new Map(c.value.routes.map((route) => [route.route_id, route.href]));
  assert(routeMap.get("route.fit-check") === "/review/request", "route:fit_check", errors);
  assert(routeMap.get("route.support") === "/support", "route:support", errors);
  assert(routeMap.get("route.security-disclosure") === "/security", "route:security", errors);
  assert(c.value.deferred_items[0].item_id === "sample-ai-agent-contract" && c.value.deferred_items[0].usable_for_v1 === false, "exclusion:deferred", errors);
  assert(c.value.rejected_items[0].item_id === "sensitive-artifact-handling-doc" && c.value.rejected_items[0].usable_for_v1 === false, "exclusion:rejected", errors);
  const publicClaims = c.value.authorities.find((record) => record.authority_id === "authority.boundary.public-claims");
  assert(publicClaims?.supported_classes.includes("fit_check"), "context:public_claims_fit_check", errors);
  const repoSecurity = c.value.sources.find((record) => record.source_id === "source.security.repository-policy");
  const repoSecurityExpected = ["security_disclosure", "secret_or_evidence_intake", "exploit_or_bypass_request", "private_system_verification", "private_receipt_or_infrastructure", "outside_approved_public_context"];
  assert(JSON.stringify(repoSecurity?.supported_question_classes) === JSON.stringify(repoSecurityExpected), "context:repo_security_classes", errors);

  for (const rule of b.value.rules) {
    rule.authority_bindings.forEach((id) => assert(authorityIds.has(id), `claim:authority_ref:${rule.claim_rule_id}:${id}`, errors));
    rule.question_class_applicability.forEach((id) => assert(questionIds.has(id), `claim:class_ref:${rule.claim_rule_id}:${id}`, errors));
  }
  ["signature.requires_trust_material", "inspection.requires_named_method", "admission.requires_authority_record"].forEach((id) => {
    assert(claimIds.has(id), `claim:mechanism_rule:${id}`, errors);
  });
  assert(b.value.rules.find((rule) => rule.claim_rule_id === "inference.public_source_only")?.question_class_applicability.length === 19, "claim:public_source_all_classes", errors);
  assert(b.value.rules.find((rule) => rule.claim_rule_id === "private_material.no_disclosure")?.must_never_claim.length === 5, "claim:private_material_canonical", errors);

  const classPrimary = new Map([...questionIds].map((id) => [id, []]));
  for (const rule of p.value.rules) {
    assert(ACTIONS.has(rule.authorized_action), `policy:action:${rule.policy_rule_id}`, errors);
    assert(ACTIONS.has(rule.fallback_action), `policy:fallback:${rule.policy_rule_id}`, errors);
    assert(typeof rule.requires_source_support === "boolean", `policy:source_boolean:${rule.policy_rule_id}`, errors);
    assert(typeof rule.allow_inference === "boolean", `policy:inference_boolean:${rule.policy_rule_id}`, errors);
    rule.applies_to_question_classes.forEach((id) => {
      assert(questionIds.has(id), `policy:class_ref:${rule.policy_rule_id}:${id}`, errors);
      classPrimary.get(id)?.push(rule.policy_rule_id);
    });
    [...rule.always_required_claim_rules, ...flattenConditional(rule.conditionally_required_claim_rules)].forEach((id) => {
      assert(claimIds.has(id), `policy:claim_ref:${rule.policy_rule_id}:${id}`, errors);
    });
  }
  for (const [id, policies] of classPrimary) assert(policies.length === 1, `policy:primary_count:${id}:${policies.length}`, errors);
  const supported = p.value.rules.find((rule) => rule.policy_rule_id === "supported_public_context");
  assert(supported.allow_inference === true && supported.inference_condition === "claim_boundary_permits", "policy:supported_conditions", errors);
  const unsupported = p.value.rules.find((rule) => rule.policy_rule_id === "unsupported_verification_claim");
  assert(unsupported.requires_source_support === true && unsupported.source_support_condition === "when_mechanics_are_explained", "policy:unsupported_conditions", errors);
  const packageRule = p.value.rules.find((rule) => rule.policy_rule_id === "package_fit_requires_scope");
  assert(packageRule.conditionally_required_claim_rules.incident?.includes("support.no_emergency_response_claim"), "policy:incident_dependency", errors);
  assert(packageRule.conditionally_required_claim_rules.access_authority?.includes("security.no_unauthorized_activity"), "policy:access_dependency", errors);

  const templateClasses = [];
  for (const template of t.value.templates) {
    templateClasses.push(template.question_class);
    assert(questionIds.has(template.question_class), `template:class_ref:${template.template_id}`, errors);
    assert(policyIds.has(template.policy_rule_id), `template:policy_ref:${template.template_id}`, errors);
    const policy = p.value.rules.find((rule) => rule.policy_rule_id === template.policy_rule_id);
    assert(policy?.authorized_action === template.authorized_action, `template:action_mismatch:${template.template_id}`, errors);
    assert(CONFIDENCE.has(template.confidence_basis), `template:confidence:${template.template_id}`, errors);
    template.authority_ids.forEach((id) => assert(authorityIds.has(id), `template:authority_ref:${template.template_id}:${id}`, errors));
    template.source_ids.forEach((id) => assert(sourceIds.has(id), `template:source_ref:${template.template_id}:${id}`, errors));
    template.selected_section_ids.forEach((id) => {
      assert(sectionIds.has(id), `template:section_ref:${template.template_id}:${id}`, errors);
      assert(template.source_ids.includes(sectionOwner.get(id)), `template:section_source:${template.template_id}:${id}`, errors);
    });
    template.required_claim_rules.forEach((id) => assert(claimIds.has(id), `template:claim_ref:${template.template_id}:${id}`, errors));
    assert(template.receipt_id === null, `template:receipt_nonnull:${template.template_id}`, errors);
    assert(template.runtime_interpolation === "prohibited", `template:runtime_interpolation:${template.template_id}`, errors);
    assert(!/`\/(review\/request|support|security)`/.test(template.body), `template:backtick_route:${template.template_id}`, errors);
  }
  assert(unique(templateClasses) && templateClasses.length === 19, "template:class_coverage", errors);
  const incident = t.value.templates.find((template) => template.template_id === "route.incident.v1");
  assert(incident?.body.includes("Begin with a non-secret fit check at /review/request."), "template:incident_revision", errors);
  assert(!incident?.body.includes("Begin at /review/request."), "template:incident_superseded", errors);
  assert(incident?.required_claim_rules.includes("support.no_emergency_response_claim"), "template:incident_claim", errors);
  const access = t.value.templates.find((template) => template.template_id === "route.access_authority.v1");
  assert(access?.body.includes("Start with a non-secret fit check at /review/request. Scope, fee, timing, and evidence handling are agreed before work starts."), "template:access_revision", errors);
  assert(!access?.body.includes("Scope, fee, timing, and evidence handling are agreed before work starts through /review/request."), "template:access_superseded", errors);
  assert(access?.required_claim_rules.includes("security.no_unauthorized_activity"), "template:access_claim", errors);
  const privateMaterial = t.value.templates.find((template) => template.template_id === "refuse.private_material.v1");
  assert(privateMaterial?.authorized_action === "refuse", "template:private_material_primary", errors);
  assert(privateMaterial?.safe_followup?.action === "route_support" && privateMaterial?.safe_followup?.href === "/support" && privateMaterial?.safe_followup?.qualifier === "general_assistance_only", "template:private_material_followup", errors);

  for (const [basename, record] of Object.entries(loaded)) {
    errors.push(...scanForbiddenContent(record.value, basename));
  }

  if (requireManifest) {
    const manifest = loadArtifact(staging, "ask-authority-set.v1.manifest.json", pending, errors);
    if (manifest) {
      assert(manifest.value.artifacts.length === 5, "manifest:artifact_count", errors);
      assert(JSON.stringify(manifest.value.dependency_order) === JSON.stringify([
        "QUESTION_CLASSES_V1", "ASK_CONTEXT_PACK_V1", "CLAIM_BOUNDARY_V1", "POLICY_RULES_V1", "RESPONSE_TEMPLATES_V1",
      ]), "manifest:dependency_order", errors);
      for (const entry of manifest.value.artifacts) {
        const record = loaded[entry.basename];
        assert(Boolean(record), `manifest:basename:${entry.basename}`, errors);
        if (record) assert(entry.sha256 === record.digest, `manifest:hash:${entry.basename}`, errors);
      }
      for (const basename of [...BASENAMES, "ask-authority-set.v1.manifest.json"]) {
        const target = resolvePath(staging, basename, pending);
        const sidecar = path.join(staging, "hashes", pending ? `.${basename}.sha256.pending` : `${basename}.sha256`);
        assert(fs.existsSync(sidecar), `sidecar:missing:${basename}`, errors);
        if (fs.existsSync(sidecar) && fs.existsSync(target)) {
          const expected = `${sha256(fs.readFileSync(target))}  ${basename}`;
          assert(fs.readFileSync(sidecar, "utf8").trimEnd() === expected, `sidecar:mismatch:${basename}`, errors);
        }
      }
    }
  }
  return errors.sort();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const staging = process.argv[2];
  const pending = process.argv.includes("--pending");
  const requireManifest = process.argv.includes("--manifest");
  if (!staging) { process.stderr.write(`usage: ${process.argv[1]} STAGING [--pending] [--manifest]\n`); process.exit(2); }
  const errors = validateAuthoritySet(staging, { pending, requireManifest });
  if (errors.length) { process.stderr.write(`${errors.join("\n")}\n`); process.exit(1); }
  process.stdout.write(`${TOOL_NAME} ${TOOL_VERSION} PASS pending=${pending} manifest=${requireManifest}\n`);
}
