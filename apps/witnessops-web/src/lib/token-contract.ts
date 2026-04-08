import { z } from "zod";

import { channelNames } from "./channel-policy";
import {
  intakeResponseProviderOutcomeSources,
  intakeResponseProviderOutcomeStatuses,
} from "./provider-outcomes";

const rfc3339Schema = z.string().datetime({ offset: true });

const shortTextSchema = z.string().trim().max(240).optional();
const longTextSchema = z.string().trim().max(8_000).optional();

export const normalizedEmailSchema = z
  .string()
  .trim()
  .email()
  .transform((value) => value.toLowerCase());

export const adminActorAuthSourceSchema = z.enum([
  "local_bypass",
  "session_cookie",
  "oidc_session",
]);

export const intakeChannelSchema = z.enum(channelNames);
export const admissionStateSchema = z.enum([
  "submitted",
  "verification_sent",
  "verified",
  "expired",
  "replayed",
  "rejected",
  "admitted",
  "responded",
]);
export const issuanceStatusSchema = z.enum(["issued", "verified"]);
export const assessmentStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "unavailable",
]);

const deliveryEvidenceSubcaseSchema = z.enum([
  "provider_accepted_message_id_present_no_durable_confirmation",
  "provider_accepted_message_id_missing",
  "provider_delivery_evidence_incomplete",
  "local_attempt_recorded_provider_outcome_unknown",
]);

const reconciliationReportSubcaseSchema = z.enum([
  "provider_accepted_message_id_present_no_durable_confirmation",
  "provider_accepted_message_id_missing",
  "provider_delivery_evidence_incomplete",
  "local_attempt_recorded_provider_outcome_unknown",
  "reconciled_after_provider_evidence_review",
  "closed_after_strong_provider_outcome",
  "closed_after_strong_mailbox_receipt",
]);

const reconciliationResolutionKindSchema = z.enum([
  "manual_reconciliation",
  "provider_outcome",
  "mailbox_receipt",
]);

export const intakeResponseProviderOutcomeStatusSchema = z.enum(
  intakeResponseProviderOutcomeStatuses,
);

export const intakeResponseProviderOutcomeSourceSchema = z.enum(
  intakeResponseProviderOutcomeSources,
);

export const engageRequestSchema = z.object({
  email: normalizedEmailSchema,
  name: shortTextSchema,
  org: shortTextSchema,
  intent: shortTextSchema,
  scope: longTextSchema,
});

export const supportRequestSchema = z.object({
  email: normalizedEmailSchema,
  subject: shortTextSchema,
  category: z.string().trim().min(1).max(120),
  severity: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(8_000),
});

const verificationSentResponseSchema = z.object({
  intakeId: z.string().min(1),
  issuanceId: z.string().min(1),
  threadId: z.string().min(1).nullable(),
  email: normalizedEmailSchema,
  createdAt: rfc3339Schema,
  expiresAt: rfc3339Schema,
  status: z.literal("issued"),
  admissionState: z.literal("verification_sent"),
});

export const engageResponseSchema = verificationSentResponseSchema.extend({
  channel: z.literal("engage"),
});

export const supportResponseSchema = verificationSentResponseSchema.extend({
  channel: z.literal("support"),
});

export const verifyTokenRequestSchema = z.object({
  issuanceId: z.string().min(1),
  email: normalizedEmailSchema,
  token: z.string().trim().min(1),
});

export const verifyTokenResponseSchema = z.object({
  channel: intakeChannelSchema,
  intakeId: z.string().min(1),
  issuanceId: z.string().min(1),
  threadId: z.string().min(1).nullable(),
  email: normalizedEmailSchema,
  verifiedAt: rfc3339Schema,
  status: z.literal("verified"),
  admissionState: admissionStateSchema,
  assessmentRunId: z.string().nullable(),
  assessmentStatus: assessmentStatusSchema,
  run_id: z.string().optional(),
});

export const scopeApprovalRequestSchema = z.object({
  email: normalizedEmailSchema,
  approverName: shortTextSchema,
  approvalNote: z.string().trim().max(1_000).optional(),
});

export const scopeApprovalResponseSchema = z.object({
  status: z.enum(["approved", "already_approved"]),
  channel: intakeChannelSchema,
  intakeId: z.string().min(1),
  issuanceId: z.string().min(1),
  email: normalizedEmailSchema,
  approvedAt: rfc3339Schema,
  approvalStatus: z.literal("approved"),
  approverEmail: normalizedEmailSchema,
  approverName: z.string().trim().max(240).nullable(),
  approvalNote: z.string().trim().max(1_000).nullable(),
  assessmentRunId: z.string().nullable(),
  assessmentStatus: assessmentStatusSchema,
  run_id: z.string().optional(),
});

export type ScopeApprovalRequest = z.infer<typeof scopeApprovalRequestSchema>;
export type ScopeApprovalResponse = z.infer<
  typeof scopeApprovalResponseSchema
>;

export const adminIntakeRespondRequestSchema = z.object({
  intakeId: z.string().trim().min(1),
  subject: z.string().trim().min(1).max(240),
  body: z.string().trim().min(1).max(8_000),
});

export const adminIntakeRespondResponseSchema = z.object({
  status: z.enum(["sent", "already_responded"]),
  channel: intakeChannelSchema,
  intakeId: z.string().min(1),
  issuanceId: z.string().min(1).nullable(),
  threadId: z.string().min(1).nullable(),
  email: normalizedEmailSchema,
  respondedAt: rfc3339Schema,
  admissionState: z.literal("responded"),
  actor: z.string().min(1),
  actorAuthSource: adminActorAuthSourceSchema,
  actorSessionHash: z.string().min(1).nullable(),
  provider: z.string().min(1),
  providerMessageId: z.string().nullable(),
  deliveryAttemptId: z.string().min(1),
  mailbox: normalizedEmailSchema,
});

export const adminIntakeReconcileRequestSchema = z.object({
  intakeId: z.string().trim().min(1),
  evidenceSubcase: deliveryEvidenceSubcaseSchema,
  note: z.string().trim().min(1).max(2_000),
});

export const adminIntakeReconcileResponseSchema = z.object({
  status: z.enum(["reconciled", "already_reconciled"]),
  intakeId: z.string().min(1),
  channel: intakeChannelSchema,
  email: normalizedEmailSchema,
  threadId: z.string().min(1).nullable(),
  reconciledAt: rfc3339Schema,
  actor: z.string().min(1),
  actorAuthSource: adminActorAuthSourceSchema,
  actorSessionHash: z.string().min(1).nullable(),
  deliveryAttemptId: z.string().min(1),
  evidenceSubcase: deliveryEvidenceSubcaseSchema,
  notePolicyVersion: z.string().min(1),
  provider: z.string().min(1),
  providerMessageId: z.string().nullable(),
  mailbox: normalizedEmailSchema,
  note: z.string().min(1),
});

export const providerResponseOutcomeRequestSchema = z
  .object({
    provider: z.string().trim().min(1).max(120),
    providerEventId: z.string().trim().min(1).max(240),
    providerMessageId: z.string().trim().min(1).max(240).nullable().optional(),
    deliveryAttemptId: z.string().trim().min(1).max(240).nullable().optional(),
    outcome: intakeResponseProviderOutcomeStatusSchema,
    observedAt: rfc3339Schema,
    source: intakeResponseProviderOutcomeSourceSchema,
    rawEventType: z.string().trim().min(1).max(240),
    detail: z.string().trim().max(2_000).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.providerMessageId?.trim()) ||
      Boolean(value.deliveryAttemptId?.trim()),
    {
      message: "providerMessageId or deliveryAttemptId is required.",
      path: ["providerMessageId"],
    },
  );

export const providerResponseOutcomeResponseSchema = z.object({
  status: z.enum(["recorded", "already_recorded"]),
  intakeId: z.string().min(1),
  channel: intakeChannelSchema,
  threadId: z.string().min(1).nullable(),
  provider: z.string().min(1),
  providerEventId: z.string().min(1),
  providerMessageId: z.string().nullable(),
  deliveryAttemptId: z.string().min(1),
  outcome: intakeResponseProviderOutcomeStatusSchema,
  observedAt: rfc3339Schema,
  source: intakeResponseProviderOutcomeSourceSchema,
  rawEventType: z.string().min(1),
  detail: z.string().nullable(),
});

export const mailboxReceiptRequestSchema = z.object({
  deliveryAttemptId: z.string().trim().min(1).max(240),
  providerMessageId: z.string().trim().min(1).max(240).nullable().optional(),
  receiptId: z.string().trim().min(1).max(240),
  status: intakeResponseProviderOutcomeStatusSchema,
  observedAt: rfc3339Schema,
  detail: z.string().trim().max(2_000).optional(),
});

export const mailboxReceiptResponseSchema = z.object({
  status: z.enum(["recorded", "already_recorded"]),
  intakeId: z.string().min(1),
  channel: intakeChannelSchema,
  threadId: z.string().min(1).nullable(),
  deliveryAttemptId: z.string().min(1),
  receiptId: z.string().min(1),
  outcome: intakeResponseProviderOutcomeStatusSchema,
  observedAt: rfc3339Schema,
  detail: z.string().nullable(),
});

export type MailboxReceiptRequest = z.infer<typeof mailboxReceiptRequestSchema>;
export type MailboxReceiptResponse = z.infer<
  typeof mailboxReceiptResponseSchema
>;

const reconciliationChannelSummarySchema = z.object({
  channel: intakeChannelSchema,
  pending: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
});

const reconciliationTimelineEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ambiguityStarted: z.number().int().nonnegative(),
  ambiguityResolved: z.number().int().nonnegative(),
  openAtClose: z.number().int().nonnegative(),
});

const reconciliationSubcaseSummarySchema = z.object({
  subcase: reconciliationReportSubcaseSchema,
  total: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
});

const reconciliationEvidenceSummarySchema = z.object({
  subcase: deliveryEvidenceSubcaseSchema,
  total: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
});

const reconciliationProviderOutcomeSummarySchema = z.object({
  outcome: intakeResponseProviderOutcomeStatusSchema,
  total: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
});

const reconciliationReportRowSchema = z.object({
  intakeId: z.string().min(1),
  channel: intakeChannelSchema,
  email: normalizedEmailSchema.nullable(),
  ambiguityStartedAt: rfc3339Schema,
  ageHours: z.number().int().nonnegative(),
  subcase: reconciliationReportSubcaseSchema,
  evidenceSubcase: deliveryEvidenceSubcaseSchema,
  actor: z.string().min(1).nullable(),
  actorAuthSource: adminActorAuthSourceSchema.nullable(),
  actorSessionHash: z.string().min(1).nullable(),
  mailbox: normalizedEmailSchema.nullable(),
  provider: z.string().min(1).nullable(),
  providerMessageId: z.string().min(1).nullable(),
  deliveryAttemptId: z.string().min(1).nullable(),
  providerOutcomeStatus: intakeResponseProviderOutcomeStatusSchema.nullable(),
  providerOutcomeObservedAt: rfc3339Schema.nullable(),
  providerOutcomeEventId: z.string().min(1).nullable(),
  providerOutcomeSource: intakeResponseProviderOutcomeSourceSchema.nullable(),
  providerOutcomeRawEventType: z.string().min(1).nullable(),
  mailboxReceiptStatus: intakeResponseProviderOutcomeStatusSchema.nullable(),
  mailboxReceiptObservedAt: rfc3339Schema.nullable(),
  mailboxReceiptId: z.string().min(1).nullable(),
  resolutionKind: reconciliationResolutionKindSchema.nullable(),
  resolvedAt: rfc3339Schema.nullable(),
  reconciledAt: rfc3339Schema.nullable(),
  reconciliationActor: z.string().min(1).nullable(),
  reconciliationActorAuthSource: adminActorAuthSourceSchema.nullable(),
  reconciliationActorSessionHash: z.string().min(1).nullable(),
  reconciliationEvidenceSubcase: deliveryEvidenceSubcaseSchema.nullable(),
  reconciliationNotePolicyVersion: z.string().min(1).nullable(),
  note: z.string().min(1).nullable(),
});

const reconciliationProviderSummarySchema = z.object({
  provider: z.string().min(1),
  total: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
});

const reconciliationClosureSourceSummarySchema = z.object({
  source: reconciliationResolutionKindSchema,
  total: z.number().int().nonnegative(),
});

export const adminReconciliationReportResponseSchema = z.object({
  generatedAt: rfc3339Schema,
  disclaimer: z.string().min(1),
  pendingTotal: z.number().int().nonnegative(),
  resolvedTotal: z.number().int().nonnegative(),
  oldestPendingAt: rfc3339Schema.nullable(),
  latestResolvedAt: rfc3339Schema.nullable(),
  byChannel: z.array(reconciliationChannelSummarySchema),
  bySubcase: z.array(reconciliationSubcaseSummarySchema),
  byEvidenceSubcase: z.array(reconciliationEvidenceSummarySchema),
  byProviderOutcome: z.array(reconciliationProviderOutcomeSummarySchema),
  byProvider: z.array(reconciliationProviderSummarySchema),
  byClosureSource: z.array(reconciliationClosureSourceSummarySchema),
  timeline: z.array(reconciliationTimelineEntrySchema),
  pendingRows: z.array(reconciliationReportRowSchema),
  resolvedRows: z.array(reconciliationReportRowSchema),
});

export type AdmissionState = z.infer<typeof admissionStateSchema>;
export type IntakeChannel = z.infer<typeof intakeChannelSchema>;
export type AdminActorAuthSource = z.infer<typeof adminActorAuthSourceSchema>;
export type EngageRequest = z.infer<typeof engageRequestSchema>;
export type EngageResponse = z.infer<typeof engageResponseSchema>;
export type SupportRequest = z.infer<typeof supportRequestSchema>;
export type SupportResponse = z.infer<typeof supportResponseSchema>;
export type VerifyTokenRequest = z.infer<typeof verifyTokenRequestSchema>;
export type VerifyTokenResponse = z.infer<typeof verifyTokenResponseSchema>;
export type AdminIntakeRespondRequest = z.infer<
  typeof adminIntakeRespondRequestSchema
>;
export type AdminIntakeRespondResponse = z.infer<
  typeof adminIntakeRespondResponseSchema
>;
export type AdminIntakeReconcileRequest = z.infer<
  typeof adminIntakeReconcileRequestSchema
>;
export type AdminIntakeReconcileResponse = z.infer<
  typeof adminIntakeReconcileResponseSchema
>;
export type ProviderResponseOutcomeRequest = z.infer<
  typeof providerResponseOutcomeRequestSchema
>;
export type ProviderResponseOutcomeResponse = z.infer<
  typeof providerResponseOutcomeResponseSchema
>;
export type AdminReconciliationReportResponse = z.infer<
  typeof adminReconciliationReportResponseSchema
>;
