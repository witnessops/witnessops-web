export const INPUT_SCHEMA_VERSION = "wops.ticket_triage.input.v1" as const;
export const OUTPUT_SCHEMA_VERSION = "wops.ticket_triage.output.v1" as const;
export const DEMO_DATA_CLASSIFICATION = "synthetic_demo" as const;
export const PINNED_DEMO_MODEL = "gpt-5.4-mini" as const;

export interface TicketTriageInput {
  schema_version: typeof INPUT_SCHEMA_VERSION;
  ticket_id: string;
  received_at: string;
  data_classification: typeof DEMO_DATA_CLASSIFICATION;
  requester: {
    display_name: string;
    company: string;
    contact: string;
  };
  channel: "email" | "portal" | "phone_note";
  subject: string;
  description: string;
  reported_impact:
    | "single_user"
    | "multiple_users"
    | "company_wide"
    | "unknown";
  context: {
    affected_service: string | null;
    device_type: string | null;
    operating_system: string | null;
    location: string | null;
    error_message: string | null;
  };
  attachments: Array<{
    file_name: string;
    media_type: string;
    description: string;
  }>;
}

export type TriageCategory =
  | "access_identity"
  | "security_event"
  | "performance_availability"
  | "general_request"
  | "other"
  | "unknown";

export interface TicketTriage {
  summary: string;
  category: TriageCategory;
  suggested_priority: {
    level: "P1" | "P2" | "P3" | "P4";
    confidence: "low" | "medium" | "high";
    reason: string;
  };
  facts: string[];
  assumptions: string[];
  missing_information: Array<{
    question: string;
    reason: string;
    blocking: boolean;
  }>;
  suggested_assignment: {
    queue:
      | "service_desk"
      | "identity"
      | "security"
      | "network"
      | "endpoint"
      | "unknown";
    reason: string;
  };
  next_actions: Array<{
    order: number;
    action: string;
    owner:
      | "service_desk"
      | "identity_team"
      | "security_team"
      | "requester"
      | "human_reviewer";
    requires_human_approval: true;
  }>;
  draft_customer_response: string;
  escalation: {
    required: boolean;
    reason_codes: Array<
      | "suspected_security_event"
      | "potential_account_compromise"
      | "widespread_outage"
      | "insufficient_evidence"
      | "other"
    >;
    route_to:
      | "service_desk"
      | "identity"
      | "security"
      | "network"
      | "endpoint"
      | "none";
  };
  uncertainties: string[];
}

export type FailureCode =
  | "INVALID_INPUT"
  | "INPUT_LIMIT_EXCEEDED"
  | "DEMO_DATA_BOUNDARY"
  | "INSUFFICIENT_INFORMATION"
  | "HUMAN_REVIEW_ONLY"
  | "MODEL_UNAVAILABLE"
  | "INVALID_MODEL_OUTPUT"
  | "INTERNAL_ERROR";

export interface TicketTriageOutput {
  schema_version: typeof OUTPUT_SCHEMA_VERSION;
  ticket_id: string | null;
  result_status:
    | "completed"
    | "human_review_required"
    | "insufficient_input"
    | "rejected"
    | "system_error";
  triage: TicketTriage | null;
  failure: {
    code: FailureCode;
    message: string;
    retryable: boolean;
    human_action: string;
  } | null;
  control: {
    human_review_required: true;
    external_actions_performed: [];
    content_disposition: "advisory_draft_only";
  };
}

export interface TriageProvider {
  readonly name: string;
  readonly model: string;
  generate(ticket: TicketTriageInput): Promise<TicketTriage>;
}
