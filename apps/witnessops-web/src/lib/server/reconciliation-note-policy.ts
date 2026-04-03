import {
  formatReconciliationSubcaseLabel,
  type DeliveryEvidenceSubcase,
} from "./reconciliation-subcases";

export const reconciliationNotePolicyVersion = "reconciliation_note_v1";

interface NoteSectionRequirement {
  label: string;
  minLength: number;
  prompt: string;
}

const noteRequirementsBySubcase: Record<
  DeliveryEvidenceSubcase,
  readonly NoteSectionRequirement[]
> = {
  provider_accepted_message_id_present_no_durable_confirmation: [
    {
      label: "Evidence reviewed",
      minLength: 20,
      prompt:
        "Describe the provider acceptance evidence you reviewed, including the message identifier or equivalent acceptance trace.",
    },
    {
      label: "Why judged sufficient",
      minLength: 20,
      prompt:
        "Explain why that evidence was sufficient even though durable confirmation of INTAKE_RESPONDED is absent.",
    },
    {
      label: "Judgment",
      minLength: 20,
      prompt:
        "State the reconciliation decision and why it is appropriate to record it without backfilling responded.",
    },
  ],
  provider_accepted_message_id_missing: [
    {
      label: "Evidence reviewed",
      minLength: 20,
      prompt:
        "Describe the provider acceptance evidence that exists despite the missing provider message identifier.",
    },
    {
      label: "Corroboration",
      minLength: 20,
      prompt:
        "Explain what corroborated the attempt even though the provider message identifier is missing.",
    },
    {
      label: "Judgment",
      minLength: 20,
      prompt:
        "State why reconciliation is appropriate without inventing durable confirmation.",
    },
  ],
  provider_delivery_evidence_incomplete: [
    {
      label: "Missing evidence",
      minLength: 20,
      prompt: "State what delivery evidence is incomplete or absent.",
    },
    {
      label: "Additional context",
      minLength: 20,
      prompt: "Describe the additional context used to assess the ambiguity.",
    },
    {
      label: "Judgment",
      minLength: 20,
      prompt:
        "State why reconciliation is still appropriate without claiming the missing evidence exists.",
    },
  ],
  local_attempt_recorded_provider_outcome_unknown: [
    {
      label: "Evidence reviewed",
      minLength: 20,
      prompt: "Describe the local attempt evidence that was recorded.",
    },
    {
      label: "Why reconcile now",
      minLength: 20,
      prompt:
        "Explain why reconciliation is appropriate despite the provider outcome remaining unknown.",
    },
    {
      label: "Judgment",
      minLength: 20,
      prompt:
        "State the reconciliation decision without backfilling responded.",
    },
  ],
};

function normalizeMultilineText(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function looksLikePlaceholder(value: string): boolean {
  return /^(\[.+\]|<.+>|todo|tbd|n\/a|none)$/i.test(value.trim());
}

function parseLabeledSections(
  note: string,
  labels: readonly string[],
): Map<string, string> {
  const sections = new Map<string, string>();
  let currentLabel: string | null = null;

  for (const rawLine of normalizeMultilineText(note).split("\n")) {
    const line = rawLine.trimEnd();
    const labelMatch = /^([^:]+):\s*(.*)$/.exec(line);

    if (labelMatch) {
      const candidate = labelMatch[1].trim();
      if (labels.includes(candidate)) {
        currentLabel = candidate;
        sections.set(candidate, labelMatch[2].trim());
        continue;
      }
    }

    if (!currentLabel) {
      continue;
    }

    const existing = sections.get(currentLabel) ?? "";
    sections.set(currentLabel, `${existing}\n${line}`.trim());
  }

  return sections;
}

export function buildReconciliationNoteTemplate(args: {
  evidenceSubcase: DeliveryEvidenceSubcase;
  deliveryAttemptId?: string | null;
  provider?: string | null;
  providerMessageId?: string | null;
}): string {
  const requirements = noteRequirementsBySubcase[args.evidenceSubcase];
  const lines = [
    `Evidence case: ${formatReconciliationSubcaseLabel(args.evidenceSubcase)}`,
    args.deliveryAttemptId
      ? `Delivery attempt: ${args.deliveryAttemptId}`
      : null,
    args.provider ? `Provider: ${args.provider}` : null,
    args.providerMessageId
      ? `Provider message ID: ${args.providerMessageId}`
      : null,
    "",
  ];

  for (const requirement of requirements) {
    lines.push(`${requirement.label}: [required]`);
    lines.push(requirement.prompt);
    lines.push("");
  }

  return lines.filter((line): line is string => line !== null).join("\n");
}

export function validateReconciliationNote(args: {
  evidenceSubcase: DeliveryEvidenceSubcase;
  note: string;
}): string {
  const normalized = normalizeMultilineText(args.note);
  const requirements = noteRequirementsBySubcase[args.evidenceSubcase];
  const labels = requirements.map((requirement) => requirement.label);
  const sections = parseLabeledSections(normalized, labels);
  const missing = requirements
    .filter((requirement) => {
      const content = (sections.get(requirement.label) ?? "").trim();
      return (
        content.length < requirement.minLength || looksLikePlaceholder(content)
      );
    })
    .map((requirement) => requirement.label);

  if (normalized.length < 80) {
    throw new Error(
      `Reconciliation notes must be specific. Provide at least 80 characters of case-aware evidence review.`,
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `Reconciliation note for ${formatReconciliationSubcaseLabel(args.evidenceSubcase)} must include completed sections: ${missing.join(", ")}.`,
    );
  }

  return normalized;
}
