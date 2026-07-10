type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

export type QuestionClassRecord = Readonly<JsonObject> & {
  readonly question_class_id: string;
  readonly default_policy_rule_ref: string;
};

export type PolicyRuleRecord = Readonly<JsonObject> & {
  readonly policy_rule_id: string;
  readonly authorized_action: string;
};

export type TemplateRecord = Readonly<JsonObject> & {
  readonly template_id: string;
  readonly question_class: string;
  readonly policy_rule_id: string;
  readonly authorized_action: string;
};

export type SourceRecord = Readonly<JsonObject> & {
  readonly source_id: string;
};

export type AuthorityRecord = Readonly<JsonObject> & {
  readonly authority_id: string;
};

export type RouteRecord = Readonly<JsonObject> & {
  readonly route_id: string;
  readonly href: string;
};

export interface AuthoritySetIdentity {
  readonly projectionId: "ASK_RUNTIME_AUTHORITY_SET_V1";
  readonly projectionVersion: 1;
  readonly projectionSha256: string;
  readonly authoritySetId: "ASK_AUTHORITY_SET_V1";
  readonly manifestSha256: string;
  readonly layers: Readonly<{
    questionClasses: Readonly<{ artifactVersion: 1; sha256: string }>;
    contextPack: Readonly<{ artifactVersion: 1; sha256: string }>;
    claimBoundary: Readonly<{ artifactVersion: 1; sha256: string }>;
    policyRules: Readonly<{ artifactVersion: 1; sha256: string }>;
    responseTemplates: Readonly<{ artifactVersion: 1; sha256: string }>;
  }>;
}

export interface AskAuthorityLoader {
  getQuestionClass(id: string): QuestionClassRecord | null;
  getPolicyRule(id: string): PolicyRuleRecord | null;
  getTemplate(id: string): TemplateRecord | null;
  getTemplateForQuestionClass(id: string): TemplateRecord | null;
  getSource(id: string): SourceRecord | null;
  getAuthority(id: string): AuthorityRecord | null;
  getRoute(id: string): RouteRecord | null;
  getAuthoritySetIdentity(): AuthoritySetIdentity;
}

const PROJECTION_SHA256 =
  "8c64e10fbb7e738dc314dfad5fb0df4f74e838600492f8e2c8be7af70a6bfb34";
const MANIFEST_SHA256 =
  "c0abbb79d4b78eb5b1394466da433f8dd05e056bebed7cf0ee11e0ecb44d688f";
const APPROVED_STATUS = "COMPLETE_FOR_MATERIALIZATION_REVIEW";

const EXPECTED_LAYERS = [
  {
    artifactId: "QUESTION_CLASSES_V1",
    sha256: "585eb145fd9a9b92cd8bd6935b5b436b82eb0b4ab17fcb3fca01f5edb594472c",
    identityKey: "questionClasses",
  },
  {
    artifactId: "ASK_CONTEXT_PACK_V1",
    sha256: "fc593a7d349011e4c89082efb4178423c9e3266b7183a25f0b4cdf5e227a93ca",
    identityKey: "contextPack",
  },
  {
    artifactId: "CLAIM_BOUNDARY_V1",
    sha256: "f4bcd085300922ea8d821276bbd462e7439913f0f9162476261f313359e33d76",
    identityKey: "claimBoundary",
  },
  {
    artifactId: "POLICY_RULES_V1",
    sha256: "2e5a2799f37e97464eb6b06fcbd3ef77c14ca42c2f5c19edf087a85d5a4f1a5c",
    identityKey: "policyRules",
  },
  {
    artifactId: "RESPONSE_TEMPLATES_V1",
    sha256: "5f04bc9877f4da4bbfb28c397408253fc5f36959b71e08a6236c92419a620c64",
    identityKey: "responseTemplates",
  },
] as const;

function fail(code: string): never {
  throw new Error(`ask_authority_loader_init_failed:${code}`);
}

function asObject(value: unknown, code: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  return value as JsonObject;
}

function asArray(value: unknown, code: string): JsonValue[] {
  if (!Array.isArray(value)) fail(code);
  return value as JsonValue[];
}

function asString(value: unknown, code: string): string {
  if (typeof value !== "string" || value.length === 0) fail(code);
  return value;
}

function asNumber(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) fail(code);
  return value;
}

function asStringArray(value: unknown, code: string): string[] {
  const values = asArray(value, code);
  if (!values.every((entry) => typeof entry === "string" && entry.length > 0)) {
    fail(code);
  }
  return values as string[];
}

function approvedRecords(document: JsonObject, key: string, count: number): JsonObject[] {
  const records = asArray(document[key], `invalid_collection:${key}`);
  if (records.length !== count) fail(`invalid_count:${key}`);
  return records.map((value, index) => {
    const record = asObject(value, `invalid_record:${key}:${index}`);
    if (record.approval_status !== APPROVED_STATUS) {
      fail(`unapproved_record:${key}:${index}`);
    }
    return record;
  });
}

function indexBy(records: JsonObject[], field: string, label: string): Map<string, JsonObject> {
  const index = new Map<string, JsonObject>();
  for (const record of records) {
    const id = asString(record[field], `invalid_id:${label}`);
    if (index.has(id)) fail(`duplicate_id:${label}:${id}`);
    index.set(id, record);
  }
  return index;
}

function requireReference(
  index: ReadonlyMap<string, JsonObject>,
  id: string,
  label: string,
): void {
  if (!index.has(id)) fail(`unresolved_reference:${label}:${id}`);
}

function requireReferences(
  record: JsonObject,
  field: string,
  index: ReadonlyMap<string, JsonObject>,
  label: string,
): void {
  for (const id of asStringArray(record[field], `invalid_references:${label}`)) {
    requireReference(index, id, label);
  }
}

function deepFreeze(value: JsonValue): void {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) deepFreeze(child);
  Object.freeze(value);
}

function layerDocument(
  layers: JsonValue[],
  index: number,
  artifactId: string,
  sha256: string,
): JsonObject {
  const layer = asObject(layers[index], `invalid_layer:${artifactId}`);
  if (layer.artifact_id !== artifactId) fail(`invalid_layer_order:${artifactId}`);
  if (asNumber(layer.artifact_version, `invalid_layer_version:${artifactId}`) !== 1) {
    fail(`invalid_layer_version:${artifactId}`);
  }
  if (layer.sha256 !== sha256) fail(`invalid_layer_hash:${artifactId}`);
  return asObject(layer.document, `invalid_layer_document:${artifactId}`);
}

export function buildAuthorityLoader(raw: unknown): AskAuthorityLoader {
  const root = asObject(structuredClone(raw), "invalid_projection_root");
  if (root.schema !== "witnessops.ask.runtime-authority-set.v1") {
    fail("invalid_projection_schema");
  }
  if (root.projection_id !== "ASK_RUNTIME_AUTHORITY_SET_V1") {
    fail("invalid_projection_id");
  }
  if (root.projection_version !== 1) fail("invalid_projection_version");
  if (root.authority_set_id !== "ASK_AUTHORITY_SET_V1") {
    fail("invalid_authority_set_id");
  }
  if (root.manifest_sha256 !== MANIFEST_SHA256) fail("invalid_manifest_hash");

  const layers = asArray(root.layers, "invalid_layers");
  if (layers.length !== EXPECTED_LAYERS.length) fail("invalid_layer_count");

  const questionDocument = layerDocument(
    layers,
    0,
    EXPECTED_LAYERS[0].artifactId,
    EXPECTED_LAYERS[0].sha256,
  );
  const contextDocument = layerDocument(
    layers,
    1,
    EXPECTED_LAYERS[1].artifactId,
    EXPECTED_LAYERS[1].sha256,
  );
  const claimDocument = layerDocument(
    layers,
    2,
    EXPECTED_LAYERS[2].artifactId,
    EXPECTED_LAYERS[2].sha256,
  );
  const policyDocument = layerDocument(
    layers,
    3,
    EXPECTED_LAYERS[3].artifactId,
    EXPECTED_LAYERS[3].sha256,
  );
  const templateDocument = layerDocument(
    layers,
    4,
    EXPECTED_LAYERS[4].artifactId,
    EXPECTED_LAYERS[4].sha256,
  );

  const questionClasses = approvedRecords(questionDocument, "classes", 19);
  const authorities = approvedRecords(contextDocument, "authorities", 10);
  const sources = approvedRecords(contextDocument, "sources", 11);
  const sections = approvedRecords(contextDocument, "selected_sections", 49);
  const classSupport = approvedRecords(contextDocument, "question_class_support", 19);
  const routes = approvedRecords(contextDocument, "routes", 3);
  const terminology = approvedRecords(contextDocument, "terminology", 16);
  const claimRules = approvedRecords(claimDocument, "rules", 33);
  const policyRules = approvedRecords(policyDocument, "rules", 11);
  const templates = approvedRecords(templateDocument, "templates", 19);

  const questionIndex = indexBy(questionClasses, "question_class_id", "question_class");
  const authorityIndex = indexBy(authorities, "authority_id", "authority");
  const sourceIndex = indexBy(sources, "source_id", "source");
  const sectionIndex = indexBy(sections, "section_id", "selected_section");
  const supportIndex = indexBy(classSupport, "question_class_id", "class_support");
  const routeIndex = indexBy(routes, "route_id", "route");
  indexBy(terminology, "terminology_id", "terminology");
  const claimIndex = indexBy(claimRules, "claim_rule_id", "claim_rule");
  const policyIndex = indexBy(policyRules, "policy_rule_id", "policy_rule");
  const templateIndex = indexBy(templates, "template_id", "template");

  for (const questionClass of questionClasses) {
    const id = asString(questionClass.question_class_id, "invalid_question_class_id");
    requireReference(
      policyIndex,
      asString(questionClass.default_policy_rule_ref, `invalid_default_policy:${id}`),
      `question_default_policy:${id}`,
    );
    requireReference(supportIndex, id, `question_class_support:${id}`);
  }

  for (const authority of authorities) {
    const id = asString(authority.authority_id, "invalid_authority_id");
    requireReferences(authority, "source_ids", sourceIndex, `authority_sources:${id}`);
    requireReferences(
      authority,
      "supported_classes",
      questionIndex,
      `authority_classes:${id}`,
    );
  }

  for (const source of sources) {
    const id = asString(source.source_id, "invalid_source_id");
    requireReferences(
      source,
      "selected_section_ids",
      sectionIndex,
      `source_sections:${id}`,
    );
    requireReferences(
      source,
      "supported_question_classes",
      questionIndex,
      `source_classes:${id}`,
    );
  }

  for (const section of sections) {
    const id = asString(section.section_id, "invalid_section_id");
    const sourceId = asString(section.source_id, `invalid_section_source:${id}`);
    requireReference(sourceIndex, sourceId, `section_source:${id}`);
    const source = sourceIndex.get(sourceId)!;
    if (!asStringArray(source.selected_section_ids, `invalid_source_sections:${sourceId}`).includes(id)) {
      fail(`section_ownership_mismatch:${id}`);
    }
  }

  for (const support of classSupport) {
    const id = asString(support.question_class_id, "invalid_support_class");
    requireReference(questionIndex, id, `support_class:${id}`);
    requireReferences(support, "authority_ids", authorityIndex, `support_authorities:${id}`);
    requireReferences(support, "source_ids", sourceIndex, `support_sources:${id}`);
  }

  for (const claimRule of claimRules) {
    const id = asString(claimRule.claim_rule_id, "invalid_claim_rule_id");
    requireReferences(
      claimRule,
      "authority_bindings",
      authorityIndex,
      `claim_authorities:${id}`,
    );
    requireReferences(
      claimRule,
      "question_class_applicability",
      questionIndex,
      `claim_classes:${id}`,
    );
  }

  for (const policyRule of policyRules) {
    const id = asString(policyRule.policy_rule_id, "invalid_policy_rule_id");
    requireReferences(
      policyRule,
      "applies_to_question_classes",
      questionIndex,
      `policy_classes:${id}`,
    );
    requireReferences(
      policyRule,
      "always_required_claim_rules",
      claimIndex,
      `policy_claims:${id}`,
    );
    const conditional = asObject(
      policyRule.conditionally_required_claim_rules,
      `invalid_conditional_claims:${id}`,
    );
    for (const [condition, claimIds] of Object.entries(conditional)) {
      for (const claimId of asStringArray(claimIds, `invalid_conditional_claims:${id}:${condition}`)) {
        requireReference(claimIndex, claimId, `conditional_policy_claim:${id}:${condition}`);
      }
    }
  }

  const templateForQuestion = new Map<string, JsonObject>();
  for (const template of templates) {
    const id = asString(template.template_id, "invalid_template_id");
    const questionClass = asString(template.question_class, `invalid_template_class:${id}`);
    const policyRuleId = asString(template.policy_rule_id, `invalid_template_policy:${id}`);
    requireReference(questionIndex, questionClass, `template_class:${id}`);
    requireReference(policyIndex, policyRuleId, `template_policy:${id}`);
    requireReferences(template, "required_claim_rules", claimIndex, `template_claims:${id}`);
    requireReferences(template, "authority_ids", authorityIndex, `template_authorities:${id}`);
    requireReferences(template, "source_ids", sourceIndex, `template_sources:${id}`);
    requireReferences(
      template,
      "selected_section_ids",
      sectionIndex,
      `template_sections:${id}`,
    );
    if (template.body_approval_status !== "APPROVED") fail(`unapproved_template_body:${id}`);
    if (template.receipt_id !== null) fail(`non_null_receipt_id:${id}`);
    if (template.runtime_interpolation !== "prohibited") {
      fail(`runtime_interpolation_enabled:${id}`);
    }
    const policyRule = policyIndex.get(policyRuleId)!;
    if (template.authorized_action !== policyRule.authorized_action) {
      fail(`policy_template_action_conflict:${id}`);
    }
    if (templateForQuestion.has(questionClass)) {
      fail(`multiple_templates_for_question_class:${questionClass}`);
    }
    templateForQuestion.set(questionClass, template);
  }

  for (const questionClass of questionIndex.keys()) {
    if (!templateForQuestion.has(questionClass)) {
      fail(`missing_template_for_question_class:${questionClass}`);
    }
  }

  deepFreeze(root);
  const identity = {
    projectionId: "ASK_RUNTIME_AUTHORITY_SET_V1",
    projectionVersion: 1,
    projectionSha256: PROJECTION_SHA256,
    authoritySetId: "ASK_AUTHORITY_SET_V1",
    manifestSha256: MANIFEST_SHA256,
    layers: {
      questionClasses: { artifactVersion: 1, sha256: EXPECTED_LAYERS[0].sha256 },
      contextPack: { artifactVersion: 1, sha256: EXPECTED_LAYERS[1].sha256 },
      claimBoundary: { artifactVersion: 1, sha256: EXPECTED_LAYERS[2].sha256 },
      policyRules: { artifactVersion: 1, sha256: EXPECTED_LAYERS[3].sha256 },
      responseTemplates: { artifactVersion: 1, sha256: EXPECTED_LAYERS[4].sha256 },
    },
  } as AuthoritySetIdentity;
  deepFreeze(identity as unknown as JsonValue);

  return Object.freeze({
    getQuestionClass: (id: string) =>
      (questionIndex.get(id) as QuestionClassRecord | undefined) ?? null,
    getPolicyRule: (id: string) =>
      (policyIndex.get(id) as PolicyRuleRecord | undefined) ?? null,
    getTemplate: (id: string) =>
      (templateIndex.get(id) as TemplateRecord | undefined) ?? null,
    getTemplateForQuestionClass: (id: string) =>
      (templateForQuestion.get(id) as TemplateRecord | undefined) ?? null,
    getSource: (id: string) => (sourceIndex.get(id) as SourceRecord | undefined) ?? null,
    getAuthority: (id: string) =>
      (authorityIndex.get(id) as AuthorityRecord | undefined) ?? null,
    getRoute: (id: string) => (routeIndex.get(id) as RouteRecord | undefined) ?? null,
    getAuthoritySetIdentity: () => identity,
  });
}
