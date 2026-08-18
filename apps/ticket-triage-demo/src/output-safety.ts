import type { TicketTriage } from "./types.js";

export type OutputSafetyViolation =
  | "secret_solicitation"
  | "prompt_disclosure"
  | "invented_external_action";

function triageText(triage: TicketTriage): string {
  return [
    triage.summary,
    triage.suggested_priority.reason,
    ...triage.facts,
    ...triage.assumptions,
    ...triage.missing_information.flatMap((item) => [
      item.question,
      item.reason,
    ]),
    triage.suggested_assignment.reason,
    ...triage.next_actions.map((item) => item.action),
    triage.draft_customer_response,
    ...triage.uncertainties,
  ].join("\n");
}

const SECRET_TERM = String.raw`(?:passwords?|passcodes?|pins?|one[- ]time\s+(?:passwords?|codes?)|otps?|mfa\s+(?:codes?|tokens?)|multi[- ]factor\s+(?:codes?|tokens?)|verification\s+codes?|recovery\s+codes?|authenticator\s+codes?|api\s+keys?|access\s+tokens?|session\s+tokens?|bearer\s+tokens?|client\s+secrets?|secret\s+keys?|private\s+keys?|authentication\s+(?:codes?|secrets?)|security\s+answers?|credentials?|login\s+details?)`;

const SECRET_SOLICITATION = new RegExp(
  String.raw`\b(?:(?:e-?mail|message|text)\s+(?:me|us|support|the\s+service\s+desk)|send|forward|transmit|transfer|share|provide|supply|enter|type|input|submit|upload|paste|include|attach|copy|disclose|reveal|reply\s+with|respond\s+with|give(?:\s+(?:me|us))?|tell(?:\s+(?:me|us))?|confirm|verify|state|write|furnish)\b[^.!?;\n]{0,80}\b${SECRET_TERM}\b`,
  "giu",
);

const SECRET_VALUE_QUESTION = new RegExp(
  String.raw`(?:^|\b)(?:what\s+(?:is|are)|what['’]s|which)\b[^.!?;\n]{0,60}\b${SECRET_TERM}\b|^\s*(?:your\s+)?${SECRET_TERM}\s*\?`,
  "iu",
);

const SECRET_REQUIREMENT = new RegExp(
  String.raw`\b(?:we|i|support|the\s+service\s+desk|the\s+technician)\s+(?:need|require|want|must\s+have)\b[^.!?;\n]{0,60}\b${SECRET_TERM}\b|\b${SECRET_TERM}\b[^.!?;\n]{0,40}\b(?:is|are)\s+(?:needed|required)\b`,
  "iu",
);

function isNegatedSolicitation(text: string, matchIndex: number): boolean {
  const prefix = text.slice(Math.max(0, matchIndex - 80), matchIndex);
  const clause = prefix.split(/[.!?;\n]|,|\bthen\b/iu).at(-1) ?? "";
  return (
    /\b(?:do\s+not|don't|never|must\s+not|should\s+not|cannot|can't|won't)\s*$/iu.test(
      clause,
    ) ||
    /\b(?:do\s+not|don't|never|must\s+not|should\s+not|cannot|can't|won't)\s+(?:ever\s+)?ask(?:ing)?\s+(?:you\s+)?to\s*$/iu.test(
      clause,
    )
  );
}

function asksOnlyWhetherSecretWasUsed(clause: string): boolean {
  return (
    /^\s*(?:did|have|has|was|were)\b/iu.test(clause) ||
    /\b(?:whether|if)\b[^.!?;\n]{0,60}\b(?:entered|shared|provided|sent|disclosed|revealed|submitted|used)\b/iu.test(
      clause,
    )
  );
}

function solicitsSecret(text: string): boolean {
  const clauses = text.split(/[.!?;\n,]|\b(?:then|but|and\s+then)\b/iu);
  for (const clause of clauses) {
    if (SECRET_VALUE_QUESTION.test(clause) || SECRET_REQUIREMENT.test(clause)) {
      return true;
    }
    SECRET_SOLICITATION.lastIndex = 0;
    for (const match of clause.matchAll(SECRET_SOLICITATION)) {
      if (
        !isNegatedSolicitation(clause, match.index ?? 0) &&
        !asksOnlyWhetherSecretWasUsed(clause)
      ) {
        return true;
      }
    }
  }
  return false;
}

function disclosesPrompt(text: string): boolean {
  return (
    /\b(?:the|my|our)\s+(?:system|developer)\s+(?:prompt|instructions?)\s*(?:is|are|says?|reads?|contains?|:)\b/iu.test(
      text,
    ) ||
    /\b(?:here(?:'s|\s+is)|following\s+is)\s+(?:the|my|our)\s+(?:system|developer)\s+(?:prompt|instructions?)\b/iu.test(
      text,
    ) ||
    /\byou are the witnessops ticket triage assistant\b/iu.test(text) ||
    /\breturn exactly one json object matching the supplied schema\b/iu.test(
      text,
    ) ||
    /\b(?:here\s+(?:are|is)|these\s+are|the\s+following\s+are)\b[^.!?\n]{0,40}\b(?:hidden|internal|private|system|developer)\s+(?:prompt|message|instructions?|rules?)\b/iu.test(
      text,
    ) ||
    /\b(?:my|the)\s+(?:hidden|internal|private)\s+(?:instructions?|rules?)\s+(?:are|say|read|contain|:)\b/iu.test(
      text,
    ) ||
    /\bi\s+was\s+(?:told|instructed)\s+to\b/iu.test(text)
  );
}

function claimsExternalAction(text: string): boolean {
  const action =
    "sent|emailed|notified|contacted|closed|resolved|reset|disabled|deleted|isolated|blocked|revoked|changed|updated|completed|fixed|repaired|restarted|restored|unlocked|removed|contained|quarantined|installed|deployed|performed|applied";
  return (
    new RegExp(
      `\\b(?:i|we|the\\s+(?:assistant|system|service\\s+desk|support\\s+team|technician))\\s+(?:have\\s+|already\\s+)?(?:${action})\\b`,
      "iu",
    ).test(text) ||
    new RegExp(
      `\\b(?:your\\s+(?:account|password|authentication|device|ticket|request)|the\\s+(?:ticket|case|request|issue|account|device|printer))\\s+(?:has\\s+been|was|is(?:\\s+now)?)\\s+(?:${action})\\b`,
      "iu",
    ).test(text) ||
    /\b(?:the\s+)?ticket\s+(?:is|has\s+been)\s+(?:closed|resolved)\b/iu.test(
      text,
    ) ||
    /\b(?:account\s+reset|resolution|fix|closure)\s+(?:is\s+)?complete\b/iu.test(
      text,
    )
  );
}

export function findOutputSafetyViolations(
  triage: TicketTriage,
): OutputSafetyViolation[] {
  const text = triageText(triage);
  const violations: OutputSafetyViolation[] = [];

  if (solicitsSecret(text)) {
    violations.push("secret_solicitation");
  }
  if (disclosesPrompt(text)) {
    violations.push("prompt_disclosure");
  }
  if (claimsExternalAction(text)) {
    violations.push("invented_external_action");
  }

  return violations;
}
