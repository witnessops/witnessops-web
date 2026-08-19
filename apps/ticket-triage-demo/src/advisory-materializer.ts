import type { TicketTriage, TicketTriageInput } from "./types.js";

type TicketTopic =
  | "reported_link"
  | "phone_recovery"
  | "performance"
  | "printer"
  | "generic";

function ticketTopic(ticket: TicketTriageInput): TicketTopic {
  const ticketText = `${ticket.subject}\n${ticket.description}`;
  if (
    /\bclicked\b[^.\n]{0,50}\blink\b|\b(?:phish(?:ing)?|suspicious)\b[^.\n]{0,80}\b(?:email|message|link)\b/iu.test(
      ticketText,
    )
  ) {
    return "reported_link";
  }
  if (/\b(?:new|replaced|old)\b[^.\n]{0,30}\bphone\b/iu.test(ticketText)) {
    return "phone_recovery";
  }
  if (/\bprinter\b/iu.test(ticketText)) {
    return "printer";
  }
  if (/\b(?:slow|slowness|performance|latency|unavailable)\b/iu.test(ticketText)) {
    return "performance";
  }
  return "generic";
}

function priorityReason(triage: TicketTriage): string {
  if (triage.suggested_priority.level === "P1") {
    return "The structured result requires immediate human review.";
  }
  if (
    triage.suggested_priority.level === "P2" &&
    triage.category === "security_event"
  ) {
    return "A possible security event requires prompt human security review.";
  }
  if (triage.suggested_priority.level === "P2") {
    return "The structured result requires prompt human review.";
  }
  if (triage.suggested_priority.level === "P3") {
    return "The reported issue requires normal human investigation.";
  }
  return "The reported issue is suitable for routine human review.";
}

function assignmentReason(
  queue: TicketTriage["suggested_assignment"]["queue"],
): string {
  const reasons: Record<typeof queue, string> = {
    service_desk: "The service desk should perform the initial human review.",
    identity: "An authorised identity reviewer should assess the access issue.",
    security:
      "A human security reviewer should assess the possible security event.",
    network: "A network specialist should review the reported symptoms.",
    endpoint: "An endpoint specialist should review the reported device issue.",
    unknown: "A human reviewer must select the appropriate assignment.",
  };
  return reasons[queue];
}

function submittedImpactFact(
  impact: TicketTriageInput["reported_impact"],
): string {
  const facts: Record<typeof impact, string> = {
    single_user: "The submitted impact classification is single user.",
    multiple_users: "The submitted impact classification is multiple users.",
    company_wide: "The submitted impact classification is company wide.",
    unknown: "The submitted impact classification is unknown.",
  };
  return facts[impact];
}

const UNVERIFIED_EVIDENCE_FACT =
  "No source-system evidence has been independently verified by this demo.";

function factsFor(ticket: TicketTriageInput, triage: TicketTriage): string[] {
  const topic = ticketTopic(ticket);
  if (topic === "reported_link") {
    return [
      "The ticket includes suspicious-message or link wording.",
      submittedImpactFact(ticket.reported_impact),
      UNVERIFIED_EVIDENCE_FACT,
    ];
  }

  if (topic === "phone_recovery") {
    return [
      "The ticket includes phone-related sign-in wording.",
      submittedImpactFact(ticket.reported_impact),
      triage.category === "security_event"
        ? UNVERIFIED_EVIDENCE_FACT
        : "No external change has been performed by this demo.",
    ];
  }

  if (topic === "performance") {
    return [
      "The ticket includes performance or availability wording.",
      submittedImpactFact(ticket.reported_impact),
      triage.category === "security_event"
        ? UNVERIFIED_EVIDENCE_FACT
        : "No confirmed cause has been established.",
    ];
  }

  if (topic === "printer") {
    return [
      "The ticket includes printer-availability wording.",
      submittedImpactFact(ticket.reported_impact),
      triage.category === "security_event"
        ? UNVERIFIED_EVIDENCE_FACT
        : "No external change has been performed by this demo.",
    ];
  }

  return [
    submittedImpactFact(ticket.reported_impact),
    "The ticket requires human review before any action.",
  ];
}

function missingInformationFor(
  ticket: TicketTriageInput,
  triage: TicketTriage,
): TicketTriage["missing_information"] {
  const topic = ticketTopic(ticket);
  if (triage.category === "security_event" && topic !== "reported_link") {
    return [
      {
        question:
          "What event timeline and sign-in, account, or device evidence can a reviewer confirm?",
        reason: "The possible security event requires human evidence review.",
        blocking: true,
      },
      {
        question: "Which accounts, users, or devices could be affected?",
        reason: "The affected security scope is not yet established.",
        blocking: false,
      },
    ];
  }
  if (topic === "reported_link") {
    return [
      {
        question:
          "Where was the reported content encountered, and what source context or destination URL is available?",
        reason:
          "The available source context is needed for human security review.",
        blocking: true,
      },
      {
        question:
          "Was the link opened, and was any authentication information entered?",
        reason:
          "The human reviewer must establish the reported interaction boundary.",
        blocking: false,
      },
    ];
  }
  if (
    topic === "phone_recovery" ||
    (topic === "generic" && triage.category === "access_identity")
  ) {
    return [
      {
        question: "Can the requester complete the approved identity verification process?",
        reason: "Identity verification is required before account recovery.",
        blocking: true,
      },
      {
        question: "Is another approved authentication method available?",
        reason:
          "The recovery path must be selected by an authorised human reviewer.",
        blocking: false,
      },
    ];
  }
  if (
    topic === "performance" ||
    (topic === "generic" && triage.category === "performance_availability")
  ) {
    return [
      {
        question:
          "Which users, devices, applications, websites, or services are affected?",
        reason: "The affected scope is not yet established.",
        blocking: true,
      },
      {
        question: "Which location and network connection are in use?",
        reason: "Network context is needed for human diagnosis.",
        blocking: false,
      },
    ];
  }
  if (topic === "printer") {
    return [
      {
        question: "Are other users or devices unable to use the printer?",
        reason: "The service desk must establish the affected scope.",
        blocking: true,
      },
      {
        question:
          "What status and error are shown by the printer and workstation?",
        reason: "A human reviewer needs current diagnostic evidence.",
        blocking: false,
      },
    ];
  }
  return [
    {
      question: "What observable result and affected scope can a reviewer confirm?",
      reason: "A human reviewer needs bounded evidence before proposing a change.",
      blocking: true,
    },
  ];
}

function actionsFor(
  ticket: TicketTriageInput,
  triage: TicketTriage,
): TicketTriage["next_actions"] {
  const topic = ticketTopic(ticket);
  if (triage.category === "security_event" && topic !== "reported_link") {
    return [
      {
        order: 1,
        action:
          "Preserve available sign-in, account, and device evidence for human security review.",
        owner: "security_team",
        requires_human_approval: true,
      },
      {
        order: 2,
        action:
          "Have a security reviewer assess the evidence before any identity or containment change.",
        owner: "security_team",
        requires_human_approval: true,
      },
    ];
  }
  if (topic === "reported_link") {
    return [
      {
        order: 1,
        action:
          "Preserve any available source context, reported content, and destination URL for human security review.",
        owner: "requester",
        requires_human_approval: true,
      },
      {
        order: 2,
        action:
          "Review relevant sign-in and device evidence before deciding on containment.",
        owner: "security_team",
        requires_human_approval: true,
      },
    ];
  }
  if (
    topic === "phone_recovery" ||
    (topic === "generic" && triage.category === "access_identity")
  ) {
    return [
      {
        order: 1,
        action: "Verify the requester through the approved identity process.",
        owner: "identity_team",
        requires_human_approval: true,
      },
      {
        order: 2,
        action:
          "Review the registered authentication methods and select an authorised recovery path.",
        owner: "identity_team",
        requires_human_approval: true,
      },
    ];
  }
  if (
    topic === "performance" ||
    (topic === "generic" && triage.category === "performance_availability")
  ) {
    return [
      {
        order: 1,
        action:
          "Confirm the affected users, devices, applications, websites, and services.",
        owner: "service_desk",
        requires_human_approval: true,
      },
      {
        order: 2,
        action:
          "Collect current device and network observations before suggesting a cause or change.",
        owner: "service_desk",
        requires_human_approval: true,
      },
    ];
  }
  if (topic === "printer") {
    return [
      {
        order: 1,
        action: "Confirm the printer status and affected user scope.",
        owner: "service_desk",
        requires_human_approval: true,
      },
      {
        order: 2,
        action: "Collect the current printer and workstation error details.",
        owner: "service_desk",
        requires_human_approval: true,
      },
    ];
  }
  return [
    {
      order: 1,
      action:
        "Have an authorised person review the ticket and select the next step.",
      owner: "human_reviewer",
      requires_human_approval: true,
    },
  ];
}

function summaryFor(triage: TicketTriage): string {
  const summaries: Record<TicketTriage["category"], string> = {
    access_identity:
      "A synthetic requester reports an access or identity issue requiring human review.",
    security_event:
      "A synthetic requester reports a possible security event requiring human security review.",
    performance_availability:
      "A synthetic requester reports a performance or availability issue with scope still to establish.",
    general_request:
      "A synthetic requester reports a general support issue requiring human review.",
    other:
      "A synthetic requester reports an uncategorised issue requiring human review.",
    unknown:
      "The synthetic ticket requires human review before a category is selected.",
  };
  return summaries[triage.category];
}

function draftFor(ticket: TicketTriageInput, triage: TicketTriage): string {
  if (triage.category === "security_event") {
    if (ticketTopic(ticket) === "reported_link") {
      return "Thank you for reporting this. Avoid further interaction with the reported content and keep any available source context. A human security reviewer will assess the evidence and decide the next step.";
    }
    return "Thank you for reporting this. A possible security event requires human security review. Avoid making account or device changes based on this draft; a reviewer will assess available evidence and decide the next step.";
  }
  if (triage.category === "access_identity") {
    return "Thank you for the details. An authorised human reviewer will verify identity through the approved process before changing any authentication method. Do not include authentication secrets in this ticket.";
  }
  if (triage.category === "performance_availability") {
    return "Thank you for the report. A human reviewer will first establish the affected users, devices, services, and network context before suggesting a cause or change.";
  }
  return "Thank you for the report. An authorised human reviewer will confirm the affected scope and decide the next step. This advisory draft has not performed any external action.";
}

function uncertaintiesFor(
  ticket: TicketTriageInput,
  triage: TicketTriage,
): string[] {
  if (triage.category === "security_event") {
    if (ticketTopic(ticket) !== "reported_link") {
      return [
        "The reported security event and affected scope have not been independently established.",
      ];
    }
    return [
      "The reported content has not been independently confirmed as malicious.",
      "The full interaction and evidence boundary is not yet established.",
    ];
  }
  if (triage.category === "performance_availability") {
    return ["The affected scope and cause are not yet established."];
  }
  return [
    "The cause and appropriate human-approved action are not yet established.",
  ];
}

/**
 * Converts validated structured model classifications into server-owned prose.
 * No provider-generated string is copied into the operator-facing result.
 */
export function materializeAdvisoryTriage(
  ticket: TicketTriageInput,
  triage: TicketTriage,
): TicketTriage {
  return {
    summary: summaryFor(triage),
    category: triage.category,
    suggested_priority: {
      level: triage.suggested_priority.level,
      confidence: triage.suggested_priority.confidence,
      reason: priorityReason(triage),
    },
    facts: factsFor(ticket, triage),
    assumptions: [],
    missing_information: missingInformationFor(ticket, triage),
    suggested_assignment: {
      queue: triage.suggested_assignment.queue,
      reason: assignmentReason(triage.suggested_assignment.queue),
    },
    next_actions: actionsFor(ticket, triage),
    draft_customer_response: draftFor(ticket, triage),
    escalation: structuredClone(triage.escalation),
    uncertainties: uncertaintiesFor(ticket, triage),
  };
}
