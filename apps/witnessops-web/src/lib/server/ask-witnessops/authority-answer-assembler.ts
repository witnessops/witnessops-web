import "server-only";

import {
  PolicyDecision,
} from "./authority-policy-executor";

import {
  getTemplate,
  getPresentationForSource,
  getGlobalPresentationRules,
  getPresentationProjectionIdentity,
} from "./authority-loader";

import type {
  PresentationSourceRecord,
  GlobalPresentationRules,
} from "./authority-presentation-loader";

export interface AssembleAnswerInput {
  readonly policyDecision: PolicyDecision;
}

export interface AssembledAnswer {
  readonly schema: "witnessops.ask.assembled-answer.v1";
  readonly assembler_contract_id: "ASK_DETERMINISTIC_ANSWER_ASSEMBLER_V1";
  readonly assembler_contract_version: 1;
  readonly policy_decision: PolicyDecision;
  readonly template: {
    readonly template_id: string;
    readonly body: string;
    readonly source_display: string | null;
  };
  readonly presented_sources: readonly PresentationSourceRecord[];
  readonly presentation_rules_applied: GlobalPresentationRules;
  readonly deterministic_replay_hash: string;
  readonly source_presentation_projection_sha256: string;
  readonly response_templates_hash: string;
  readonly status: "success" | "closed";
  readonly failure_reason?: string;
}

export function assembleAnswer(input: AssembleAnswerInput): AssembledAnswer {
  const { policyDecision } = input;

  if (
    !policyDecision ||
    policyDecision.schema !== "witnessops.ask.policy-decision.v1" ||
    policyDecision.executor_contract_id !== "ASK_DETERMINISTIC_POLICY_EXECUTOR_V1"
  ) {
    return buildClosedAnswer(policyDecision || ({} as PolicyDecision), "INVALID_POLICY_DECISION");
  }

  const templateRecord: any = getTemplate(policyDecision.template_id);
  if (!templateRecord || templateRecord.template_id !== policyDecision.template_id) {
    return buildClosedAnswer(policyDecision, "MISSING_TEMPLATE_BINDING");
  }

  // Verify template binding via hash if possible (decision carries the hash)
  // For V1 we rely on id match + the decision's response_templates_hash
  if (policyDecision.response_templates_hash) {
    // The loader provides the hash via identity, but we trust the decision for now
    // Full cross-check can be added in future if hashes are on template record
  }

  const globalRules = getGlobalPresentationRules();
  const presIdentity = getPresentationProjectionIdentity();

  let presentedSources: PresentationSourceRecord[] = [];

  for (const sourceId of policyDecision.source_ids) {
    const pres = getPresentationForSource(sourceId);
    if (pres) {
      presentedSources.push(pres);
    }
  }

  // Deterministic ordering
  const citationOrder = globalRules.citation_order;
  presentedSources.sort((a, b) => {
    const indexA = citationOrder.indexOf(a.source_id);
    const indexB = citationOrder.indexOf(b.source_id);
    const posA = indexA === -1 ? 999 : indexA;
    const posB = indexB === -1 ? 999 : indexB;
    return posA - posB;
  });

  // Duplicate suppression
  if (globalRules.duplicate_source_suppression) {
    const seen = new Set<string>();
    presentedSources = presentedSources.filter((s) => {
      if (seen.has(s.source_id)) return false;
      seen.add(s.source_id);
      return true;
    });
  }

  // Max 5
  presentedSources = presentedSources.slice(0, globalRules.max_displayed_sources_per_response);

  // Refusal and decline handling
  const isRefusalOrDecline =
    policyDecision.authorized_action === "refuse" ||
    policyDecision.authorized_action === "bounded_decline" ||
    policyDecision.template_id.startsWith("refuse.") ||
    policyDecision.template_id.startsWith("decline.");

  if (isRefusalOrDecline) {
    if (
      globalRules.refusal_and_decline_presentation === "minimal_or_route_only" ||
      globalRules.route_only_answers === "route_without_full_citation_list"
    ) {
      presentedSources = [];
    }
  }

  const templateBody = templateRecord.body ?? "";
  const sourceDisplay = templateRecord.source_display ?? null;

  const assembled: AssembledAnswer = {
    schema: "witnessops.ask.assembled-answer.v1",
    assembler_contract_id: "ASK_DETERMINISTIC_ANSWER_ASSEMBLER_V1",
    assembler_contract_version: 1,
    policy_decision: policyDecision,
    template: {
      template_id: policyDecision.template_id,
      body: templateBody,
      source_display: sourceDisplay,
    },
    presented_sources: presentedSources,
    presentation_rules_applied: globalRules,
    deterministic_replay_hash: computeReplayHash(policyDecision, templateBody, presentedSources),
    source_presentation_projection_sha256: presIdentity.sourcePresentationSha256,
    response_templates_hash: policyDecision.response_templates_hash,
    status: "success",
  };

  return assembled;
}

function buildClosedAnswer(policyDecision: PolicyDecision, reason: string): AssembledAnswer {
  const globalRules = getGlobalPresentationRules();
  const presIdentity = getPresentationProjectionIdentity();

  return {
    schema: "witnessops.ask.assembled-answer.v1",
    assembler_contract_id: "ASK_DETERMINISTIC_ANSWER_ASSEMBLER_V1",
    assembler_contract_version: 1,
    policy_decision: policyDecision,
    template: {
      template_id: policyDecision.template_id || "unknown",
      body: "",
      source_display: null,
    },
    presented_sources: [],
    presentation_rules_applied: globalRules,
    deterministic_replay_hash: computeReplayHash(policyDecision, "", []) + ":closed:" + reason,
    source_presentation_projection_sha256: presIdentity.sourcePresentationSha256,
    response_templates_hash: policyDecision.response_templates_hash || "",
    status: "closed",
    failure_reason: reason,
  };
}

function computeReplayHash(
  decision: PolicyDecision,
  body: string,
  sources: readonly PresentationSourceRecord[]
): string {
  const input = JSON.stringify({
    d: decision.deterministic_replay_hash,
    t: decision.template_id,
    b: body,
    s: sources.map((s) => s.source_id),
  });
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return "replay:" + Math.abs(hash).toString(16);
}
