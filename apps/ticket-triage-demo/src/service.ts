import {
  InvalidProviderOutputError,
  ProviderUnavailableError,
} from "./openai-provider.js";
import { materializeAdvisoryTriage } from "./advisory-materializer.js";
import {
  hasBoundedLimitError,
  validateProviderTriage,
  validateTicketInput,
  validateTicketOutput,
} from "./schema-validator.js";
import { findOutputSafetyViolations } from "./output-safety.js";
import {
  DEMO_DATA_CLASSIFICATION,
  OUTPUT_SCHEMA_VERSION,
  type FailureCode,
  type TicketTriageInput,
  type TicketTriageOutput,
  type TriageProvider,
} from "./types.js";

const CONTROL: TicketTriageOutput["control"] = {
  human_review_required: true,
  external_actions_performed: [],
  content_disposition: "advisory_draft_only",
};

function safeTicketId(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const ticketId = (raw as { ticket_id?: unknown }).ticket_id;
  return typeof ticketId === "string" && /^DEMO-[0-9]{3}$/.test(ticketId)
    ? ticketId
    : null;
}

function failureOutput(args: {
  ticketId: string | null;
  status: "insufficient_input" | "rejected" | "system_error";
  code: FailureCode;
  message: string;
  retryable: boolean;
  humanAction: string;
}): TicketTriageOutput {
  const output: TicketTriageOutput = {
    schema_version: OUTPUT_SCHEMA_VERSION,
    ticket_id: args.ticketId,
    result_status: args.status,
    triage: null,
    failure: {
      code: args.code,
      message: args.message,
      retryable: args.retryable,
      human_action: args.humanAction,
    },
    control: CONTROL,
  };

  const validated = validateTicketOutput(output);
  if (!validated.ok) {
    throw new Error("ticket_triage_internal_failure_envelope_invalid");
  }
  return output;
}

function isNonSynthetic(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return false;
  }
  const classification = (raw as { data_classification?: unknown })
    .data_classification;
  return (
    typeof classification === "string" &&
    classification !== DEMO_DATA_CLASSIFICATION
  );
}

function isSemanticallyInsufficient(ticket: TicketTriageInput): boolean {
  return (
    ticket.subject.trim().length < 3 || ticket.description.trim().length < 12
  );
}

function requestsProhibitedAutonomousAction(
  ticket: TicketTriageInput,
): boolean {
  const text = `${ticket.subject}\n${ticket.description}`;
  return /\b(?:automatically|without (?:human )?(?:approval|review)|do (?:it|this) now)\b[^.\n]{0,120}\b(?:send|close|resolve|reset|disable|delete|isolate|block|revoke|change)\b|\b(?:send|close|resolve|reset|disable|delete|isolate|block|revoke|change)\b[^.\n]{0,120}\b(?:automatically|without (?:human )?(?:approval|review))\b/i.test(
    text,
  );
}

function applyServerPolicy(
  ticket: TicketTriageInput,
  triage: NonNullable<TicketTriageOutput["triage"]>,
): NonNullable<TicketTriageOutput["triage"]> {
  const policyTriage = structuredClone(triage);

  const ticketText = `${ticket.subject}\n${ticket.description}`;
  const hasCompromiseEvidence =
    /\b(?:unauthori[sz]ed|unknown|unexpected|unrecogni[sz]ed|suspicious)\b[^.\n]{0,60}\b(?:sign[ -]?in|login|access|activity|device)\b|\b(?:account\s+)?compromis(?:e|ed)|\bbreach(?:ed)?\b|\bstolen\b|\bphish(?:ing|ed)?\b|\b(?:gave|sent|provided|entered|submitted)\b[^.\n]{0,60}\b(?:password|passcode|mfa\s+code|verification\s+code|recovery\s+code|api\s+key|access\s+token|credentials?)\b/i.test(
      ticketText,
    );
  const hasSecurityReason = policyTriage.escalation.reason_codes.some((code) =>
    ["suspected_security_event", "potential_account_compromise"].includes(
      code,
    ),
  );
  const hasStructuredSecuritySignal =
    policyTriage.category === "security_event" ||
    policyTriage.suggested_assignment.queue === "security" ||
    policyTriage.escalation.route_to === "security" ||
    hasSecurityReason;
  const hasProviderDisposition =
    ["P1", "P2"].includes(policyTriage.suggested_priority.level) ||
    policyTriage.escalation.required ||
    policyTriage.escalation.route_to !== "none" ||
    policyTriage.escalation.reason_codes.length > 0 ||
    hasStructuredSecuritySignal;

  const boundedIdentityRecovery =
    policyTriage.category === "access_identity" &&
    ticket.reported_impact === "single_user" &&
    /(?:replaced|new) (?:my |their )?phone|old phone/i.test(
      ticketText,
    ) &&
    !hasCompromiseEvidence &&
    !hasProviderDisposition;
  if (boundedIdentityRecovery) {
    policyTriage.suggested_priority = {
      level: "P3",
      confidence: policyTriage.suggested_priority.confidence,
      reason: "One user is blocked in a bounded authentication-recovery case.",
    };
    policyTriage.suggested_assignment = {
      queue: "identity",
      reason: "Approved identity recovery is required before any factor change.",
    };
    policyTriage.escalation = {
      required: false,
      reason_codes: [],
      route_to: "none",
    };
  }

  if (hasCompromiseEvidence || hasStructuredSecuritySignal) {
    const primaryReason: (typeof policyTriage.escalation.reason_codes)[number] =
      hasCompromiseEvidence ||
      policyTriage.escalation.reason_codes.includes(
        "potential_account_compromise",
      )
        ? "potential_account_compromise"
        : "suspected_security_event";
    const reasonCodes: typeof policyTriage.escalation.reason_codes = [
      primaryReason,
      ...policyTriage.escalation.reason_codes.filter(
        (code) => code !== primaryReason,
      ),
    ];
    policyTriage.category = "security_event";
    policyTriage.escalation = {
      required: true,
      reason_codes: reasonCodes.slice(0, 4),
      route_to: "security",
    };
    policyTriage.suggested_assignment = {
      queue: "security",
      reason: "Security-category results require human security review.",
    };
    if (["P3", "P4"].includes(policyTriage.suggested_priority.level)) {
      policyTriage.suggested_priority.level = "P2";
      policyTriage.suggested_priority.reason =
        "A suspected security event requires prompt human security review.";
    }
  }

  const unknownPerformanceScope =
    policyTriage.category === "performance_availability" &&
    ticket.reported_impact === "unknown" &&
    ticket.context.affected_service === null &&
    ticket.context.location === null;
  if (unknownPerformanceScope) {
    policyTriage.suggested_priority.confidence = "low";
  }

  return policyTriage;
}

export async function runTicketTriage(args: {
  rawInput: unknown;
  provider: TriageProvider;
}): Promise<TicketTriageOutput> {
  const ticketId = safeTicketId(args.rawInput);

  if (isNonSynthetic(args.rawInput)) {
    return failureOutput({
      ticketId,
      status: "rejected",
      code: "DEMO_DATA_BOUNDARY",
      message: "This demonstration accepts synthetic data only.",
      retryable: false,
      humanAction: "Replace the input with an approved synthetic fixture.",
    });
  }

  const inputValidation = validateTicketInput(args.rawInput);
  if (!inputValidation.ok || !inputValidation.value) {
    const boundedLimit = hasBoundedLimitError(inputValidation.errors);
    return failureOutput({
      ticketId,
      status: boundedLimit ? "rejected" : "insufficient_input",
      code: boundedLimit ? "INPUT_LIMIT_EXCEEDED" : "INVALID_INPUT",
      message: boundedLimit
        ? "The submitted ticket exceeds the bounded demo input limits."
        : "The submitted ticket does not match the required input contract.",
      retryable: true,
      humanAction: "Correct the synthetic ticket fields and submit it again.",
    });
  }

  if (isSemanticallyInsufficient(inputValidation.value)) {
    return failureOutput({
      ticketId: inputValidation.value.ticket_id,
      status: "insufficient_input",
      code: "INSUFFICIENT_INFORMATION",
      message: "The ticket is too limited for a responsible triage draft.",
      retryable: true,
      humanAction: "Add a concise description of the observed issue and impact.",
    });
  }

  if (requestsProhibitedAutonomousAction(inputValidation.value)) {
    return failureOutput({
      ticketId: inputValidation.value.ticket_id,
      status: "rejected",
      code: "HUMAN_REVIEW_ONLY",
      message: "This demonstration cannot perform or approve external actions.",
      retryable: false,
      humanAction: "Have an authorised person review and perform any required action.",
    });
  }

  try {
    const triage = await args.provider.generate(inputValidation.value);
    const triageValidation = validateProviderTriage(triage);
    if (!triageValidation.ok || !triageValidation.value) {
      return failureOutput({
        ticketId: inputValidation.value.ticket_id,
        status: "system_error",
        code: "INVALID_MODEL_OUTPUT",
        message: "The model response did not satisfy the triage contract.",
        retryable: true,
        humanAction: "Use the original ticket and complete triage manually.",
      });
    }

    const policyTriage = applyServerPolicy(
      inputValidation.value,
      triageValidation.value,
    );
    const advisoryTriage = materializeAdvisoryTriage(
      inputValidation.value,
      policyTriage,
    );
    if (findOutputSafetyViolations(advisoryTriage).length > 0) {
      return failureOutput({
        ticketId: inputValidation.value.ticket_id,
        status: "system_error",
        code: "INTERNAL_ERROR",
        message: "The bounded advisory response could not be produced safely.",
        retryable: false,
        humanAction: "Use the original ticket and complete triage manually.",
      });
    }
    const output: TicketTriageOutput = {
      schema_version: OUTPUT_SCHEMA_VERSION,
      ticket_id: inputValidation.value.ticket_id,
      result_status:
        advisoryTriage.escalation.required ||
        advisoryTriage.category === "security_event" ||
        ["P1", "P2"].includes(advisoryTriage.suggested_priority.level)
          ? "human_review_required"
          : "completed",
      triage: advisoryTriage,
      failure: null,
      control: CONTROL,
    };

    const outputValidation = validateTicketOutput(output);
    if (!outputValidation.ok) {
      return failureOutput({
        ticketId: inputValidation.value.ticket_id,
        status: "system_error",
        code: "INVALID_MODEL_OUTPUT",
        message: "The completed response did not satisfy the output contract.",
        retryable: true,
        humanAction: "Use the original ticket and complete triage manually.",
      });
    }

    return output;
  } catch (error) {
    if (error instanceof InvalidProviderOutputError) {
      return failureOutput({
        ticketId: inputValidation.value.ticket_id,
        status: "system_error",
        code: "INVALID_MODEL_OUTPUT",
        message: "The model response did not satisfy the output contract.",
        retryable: true,
        humanAction: "Use the original ticket and complete triage manually.",
      });
    }

    if (error instanceof ProviderUnavailableError) {
      return failureOutput({
        ticketId: inputValidation.value.ticket_id,
        status: "system_error",
        code: "MODEL_UNAVAILABLE",
        message: "The configured model provider is temporarily unavailable.",
        retryable: true,
        humanAction: "Retry later or complete triage manually.",
      });
    }

    return failureOutput({
      ticketId: inputValidation.value.ticket_id,
      status: "system_error",
      code: "INTERNAL_ERROR",
      message: "The bounded triage runtime could not complete the request.",
      retryable: false,
      humanAction: "Use the original ticket and complete triage manually.",
    });
  }
}
