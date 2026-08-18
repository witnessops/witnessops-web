import type {
  TicketTriage,
  TicketTriageInput,
  TriageProvider,
} from "./types.js";

const MOCK_TRIAGE: Record<string, TicketTriage> = {
  "DEMO-001": {
    summary:
      "One user cannot access Microsoft 365 because sign-in approval still targets a replaced phone.",
    category: "access_identity",
    suggested_priority: {
      level: "P3",
      confidence: "high",
      reason: "A single user is blocked from email without evidence of a wider outage.",
    },
    facts: [
      "The requester replaced their phone yesterday.",
      "Microsoft 365 asks for approval on the old phone.",
      "The impact is limited to one reported user.",
      "The requester says no password or verification code was shared.",
    ],
    assumptions: [
      "The old phone remains the registered authentication method.",
    ],
    missing_information: [
      {
        question: "Which approved identity-verification method can the service desk use?",
        reason: "Identity must be verified before changing authentication factors.",
        blocking: true,
      },
      {
        question: "Is another approved sign-in method already registered?",
        reason: "An existing method may restore access without resetting MFA.",
        blocking: false,
      },
    ],
    suggested_assignment: {
      queue: "identity",
      reason: "The reported failure concerns a registered sign-in factor.",
    },
    next_actions: [
      {
        order: 1,
        action: "Verify the requester through the approved identity-verification process.",
        owner: "identity_team",
        requires_human_approval: true,
      },
      {
        order: 2,
        action: "Review the account's registered authentication methods and recent sign-in state.",
        owner: "identity_team",
        requires_human_approval: true,
      },
      {
        order: 3,
        action: "After verification, use the approved recovery procedure if no valid alternate method exists.",
        owner: "identity_team",
        requires_human_approval: true,
      },
    ],
    draft_customer_response:
      "Thanks for the details. We will first verify your identity through the approved process and then review the authentication methods registered to your account. Please do not send passwords or verification codes in this ticket.",
    escalation: {
      required: false,
      reason_codes: [],
      route_to: "none",
    },
    uncertainties: [
      "It is not yet known whether an alternate authentication method is available.",
    ],
  },
  "DEMO-002": {
    summary:
      "A user clicked a suspicious Microsoft password-expiry link but reports closing the page without entering credentials or downloading a file.",
    category: "security_event",
    suggested_priority: {
      level: "P2",
      confidence: "high",
      reason: "A suspected phishing interaction requires prompt human security review.",
    },
    facts: [
      "The message claimed the user's Microsoft password would expire.",
      "The requester clicked the link.",
      "The requester says no credentials were entered.",
      "The requester says no file was downloaded or opened.",
      "The original email remains available.",
    ],
    assumptions: [],
    missing_information: [
      {
        question: "What are the sender address, message headers, and destination URL?",
        reason: "These details are needed for human security review.",
        blocking: true,
      },
      {
        question: "Did any browser download, extension prompt, or additional interaction occur?",
        reason: "The reported interaction boundary should be confirmed.",
        blocking: false,
      },
    ],
    suggested_assignment: {
      queue: "security",
      reason: "The ticket describes a suspected phishing interaction.",
    },
    next_actions: [
      {
        order: 1,
        action: "Do not reopen or interact further with the link.",
        owner: "requester",
        requires_human_approval: true,
      },
      {
        order: 2,
        action: "Preserve the original message and headers for human security review.",
        owner: "security_team",
        requires_human_approval: true,
      },
      {
        order: 3,
        action: "Review sign-in and endpoint evidence before deciding whether containment is required.",
        owner: "security_team",
        requires_human_approval: true,
      },
    ],
    draft_customer_response:
      "Thank you for reporting this. Please do not reopen or interact with the link. Keep the original message available while the security team reviews the sender, headers, URL, and relevant sign-in evidence. The information provided does not yet confirm phishing or account compromise.",
    escalation: {
      required: true,
      reason_codes: ["suspected_security_event"],
      route_to: "security",
    },
    uncertainties: [
      "The message has not been confirmed as malicious.",
      "It is not yet independently established whether any browser-side action occurred.",
    ],
  },
  "DEMO-003": {
    summary:
      "A user reports general laptop and website slowness since about 09:00, with scope and affected services not yet established.",
    category: "performance_availability",
    suggested_priority: {
      level: "P3",
      confidence: "low",
      reason: "The issue is materially disruptive but its scope and cause are unknown.",
    },
    facts: [
      "The requester reports laptop and website slowness since about 09:00.",
      "The requester does not know whether other users are affected.",
      "The browser was restarted but the laptop was not.",
      "No error message was reported.",
    ],
    assumptions: [],
    missing_information: [
      {
        question: "Are other users or devices affected?",
        reason: "This distinguishes a local device issue from a wider service issue.",
        blocking: true,
      },
      {
        question: "Which applications or websites are slow?",
        reason: "The affected service scope is not yet known.",
        blocking: true,
      },
      {
        question: "What location and network connection type are in use?",
        reason: "Network context is needed before suggesting a cause or change.",
        blocking: false,
      },
    ],
    suggested_assignment: {
      queue: "service_desk",
      reason: "Initial scope gathering and basic diagnostics are required.",
    },
    next_actions: [
      {
        order: 1,
        action: "Confirm the affected users, devices, applications, and websites.",
        owner: "service_desk",
        requires_human_approval: true,
      },
      {
        order: 2,
        action: "Record the user's location, connection type, and whether the issue can be reproduced.",
        owner: "service_desk",
        requires_human_approval: true,
      },
      {
        order: 3,
        action: "After scope is established, collect appropriate device and network diagnostics.",
        owner: "service_desk",
        requires_human_approval: true,
      },
    ],
    draft_customer_response:
      "Thanks for reporting this. We need to establish whether the issue is limited to your laptop or affects other users and services. Please tell us which applications or websites are slow, whether anyone else is affected, and your current location and connection type.",
    escalation: {
      required: false,
      reason_codes: [],
      route_to: "none",
    },
    uncertainties: [
      "The affected service scope is unknown.",
      "No root cause has been established.",
    ],
  },
  "DEMO-004": {
    summary:
      "One user reports that an office printer is unavailable; instruction-like text inside the ticket is treated as untrusted content.",
    category: "other",
    suggested_priority: {
      level: "P3",
      confidence: "medium",
      reason: "A single-user printer issue is reported without evidence of wider impact.",
    },
    facts: [
      "The office printer is reported as unavailable.",
      "The reported impact is one user.",
      "The ticket contains instruction-like text that is not an operational fact.",
    ],
    assumptions: [],
    missing_information: [
      {
        question: "Are other users unable to use the same printer?",
        reason: "The scope of the printer issue is not established.",
        blocking: false,
      },
      {
        question: "What status or error is shown on the printer and the user's device?",
        reason: "Diagnostic evidence is needed before proposing a cause.",
        blocking: false,
      },
    ],
    suggested_assignment: {
      queue: "service_desk",
      reason: "The report requires ordinary printer scope and status checks.",
    },
    next_actions: [
      {
        order: 1,
        action: "Confirm whether the printer issue affects other users.",
        owner: "service_desk",
        requires_human_approval: true,
      },
      {
        order: 2,
        action: "Collect the printer and workstation status or error information.",
        owner: "service_desk",
        requires_human_approval: true,
      },
    ],
    draft_customer_response:
      "Thanks for reporting the printer issue. Please let us know whether other users are affected and what status or error appears on the printer and your device. A technician will review the information before making any change.",
    escalation: {
      required: false,
      reason_codes: [],
      route_to: "none",
    },
    uncertainties: ["The scope and cause of the printer issue are unknown."],
  },
};

export function createMockProvider(): TriageProvider {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("ticket_triage_mock_provider_test_only");
  }

  return {
    name: "mock",
    model: "deterministic-fixture-v1",
    async generate(ticket: TicketTriageInput): Promise<TicketTriage> {
      const triage = MOCK_TRIAGE[ticket.ticket_id];
      if (!triage) {
        throw new Error("ticket_triage_mock_fixture_missing");
      }
      return structuredClone(triage);
    },
  };
}
