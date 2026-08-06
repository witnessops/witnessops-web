import { isBusinessEmail } from "@/lib/freemail-policy";
import { randomUUID } from "node:crypto";
import {
  getChannelMailbox,
  getChannelVerificationMailbox,
  getChannelPolicy,
  assertInboundAllowed,
  type ChannelName,
} from "@/lib/channel-policy";
import {
  ACCESS_CHANGE_POST_VERIFY_PATH,
  getProofRunRequestLabel,
  isAccessChangeProofRunIntent,
  isManualProofRunIntent,
} from "@/lib/access-change-proof-run";
import type {
  EngageResponse,
  SupportResponse,
  ScopeApprovalResponse,
  VerifyTokenRequest,
  VerifyTokenResponse,
} from "@/lib/token-contract";

import {
  digestToken,
  generateIntakeId,
  generateIssuanceId,
  generateRawToken,
  generateThreadId,
  tokenDigestMatches,
} from "./token-crypto";
import {
  getIntakeById,
  getIssuanceById,
  saveIntake,
  saveIssuance,
  updateIntake,
  updateIssuance,
  type AssessmentStatus,
  type IntakeRecord,
  type IntakeSubmissionRecord,
  type TokenIssuanceRecord,
} from "./token-store";
import { renderVerificationEmail } from "./token-email-template";
import { sendVerificationEmail } from "./send-verification-email";
import { triggerAssessment } from "./assessment-client";
import { notifyScopeApproved } from "./control-plane-client";
import { claimantActionBlocksApproval } from "./claimant-actions";
import { operatorRejectionBlocksApproval } from "./operator-actions";
import { appendIntakeEvent } from "./intake-event-ledger";

type VerificationChannel = Exclude<ChannelName, "noreply">;
type VerificationIssuanceResponse = EngageResponse | SupportResponse;

interface CreateVerificationIssuanceInput {
  channel: VerificationChannel;
  email: string;
  source: string;
  submission?: IntakeSubmissionRecord;
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderTextField(label: string, value: string | null | undefined): string {
  return `${label}: ${normalizeText(value) ?? "not provided"}`;
}

function renderHtmlField(label: string, value: string | null | undefined): string {
  return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(normalizeText(value) ?? "not provided")}</p>`;
}

function operatorNotificationSubject(intake: IntakeRecord): string {
  const requestLabel = getProofRunRequestLabel(intake.submission.intent);
  const org = normalizeText(intake.submission.org);
  const name = normalizeText(intake.submission.name);
  const identity = org ?? name ?? intake.email;
  return `Verified ${requestLabel}: ${identity}`;
}

function renderOperatorNotificationText(args: {
  intake: IntakeRecord;
  issuance: TokenIssuanceRecord;
}): string {
  const requestLabel = getProofRunRequestLabel(args.intake.submission.intent);
  return [
    `Verified WitnessOps ${requestLabel}`,
    "",
    "Reply to this email to continue fit, scope, fee, and evidence-handling discussion with the requester.",
    "",
    renderTextField("Requester", args.intake.submission.name),
    renderTextField("Work email", args.issuance.email),
    renderTextField("Company or team", args.intake.submission.org),
    renderTextField("Intent", args.intake.submission.intent),
    renderTextField("Locale", args.intake.submission.locale),
    `Intake ID: ${args.intake.intakeId}`,
    `Issuance ID: ${args.issuance.issuanceId}`,
    `Thread ID: ${args.intake.threadId ?? "not assigned"}`,
    "",
    "Submitted request summary:",
    args.intake.submission.scope ?? "not provided",
    "",
    "Operator boundary:",
    "No proof run has started.",
    "No customer evidence has been accepted.",
    "Do not request or accept secrets, credentials, private keys, MFA codes, source exports, full logs, screenshots, customer records, or production evidence until scope and evidence handling are agreed.",
  ].join("\n");
}

function renderOperatorNotificationHtml(args: {
  intake: IntakeRecord;
  issuance: TokenIssuanceRecord;
}): string {
  const requestLabel = getProofRunRequestLabel(args.intake.submission.intent);
  const scope = args.intake.submission.scope ?? "not provided";
  const C = {
    bg: "#f7f5f1",
    surface: "#ffffff",
    surfaceAlt: "#faf9f7",
    border: "#e4e0d8",
    text: "#121212",
    textSecondary: "#3f3c38",
    accent: "#f27a3d",
  } as const;
  return [
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:${C.bg};color:${C.text};font-family:Arial,Helvetica,sans-serif">`,
    '<tr><td style="padding:24px">',
    `<p style="margin:0 0 8px 0;color:${C.accent};font-size:12px;letter-spacing:1.8px;text-transform:uppercase">Verified request</p>`,
    `<h1 style="margin:0 0 16px 0;color:${C.text};font-size:22px;line-height:28px">${escapeHtml(`WitnessOps ${requestLabel}`)}</h1>`,
    `<p style="margin:0 0 20px 0;color:${C.textSecondary};font-size:14px;line-height:21px">Reply to this email to continue fit, scope, fee, and evidence-handling discussion with the requester.</p>`,
    `<div style="border:1px solid ${C.border};padding:16px;background:${C.surface}">`,
    renderHtmlField("Requester", args.intake.submission.name),
    renderHtmlField("Work email", args.issuance.email),
    renderHtmlField("Company or team", args.intake.submission.org),
    renderHtmlField("Intent", args.intake.submission.intent),
    renderHtmlField("Locale", args.intake.submission.locale),
    renderHtmlField("Intake ID", args.intake.intakeId),
    renderHtmlField("Issuance ID", args.issuance.issuanceId),
    renderHtmlField("Thread ID", args.intake.threadId ?? "not assigned"),
    "</div>",
    `<h2 style="margin:22px 0 8px 0;color:${C.text};font-size:15px;line-height:20px">Submitted request summary</h2>`,
    `<pre style="white-space:pre-wrap;margin:0;padding:14px;border:1px solid ${C.border};background:${C.surfaceAlt};color:${C.textSecondary};font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px">${escapeHtml(scope)}</pre>`,
    `<h2 style="margin:22px 0 8px 0;color:${C.text};font-size:15px;line-height:20px">Operator boundary</h2>`,
    `<p style="margin:0;color:${C.textSecondary};font-size:13px;line-height:20px">No proof run has started. No customer evidence has been accepted. Do not request or accept secrets, credentials, private keys, MFA codes, source exports, full logs, screenshots, customer records, or production evidence until scope and evidence handling are agreed.</p>`,
    "</td></tr>",
    "</table>",
  ].join("");
}

function normalizeSubmission(
  submission?: IntakeSubmissionRecord,
): IntakeSubmissionRecord {
  return {
    name: normalizeText(submission?.name),
    org: normalizeText(submission?.org),
    intent: normalizeText(submission?.intent),
    locale:
      submission?.locale === "pl"
        ? "pl"
        : submission?.locale === "en"
          ? "en"
          : null,
    scope: normalizeText(submission?.scope),
    subject: normalizeText(submission?.subject),
    category: normalizeText(submission?.category),
    severity: normalizeText(submission?.severity),
    message: normalizeText(submission?.message),
  };
}

function readVerifyBaseUrl(): string {
  const baseUrl = process.env.WITNESSOPS_VERIFY_BASE_URL;
  if (!baseUrl) {
    throw new Error("WITNESSOPS_VERIFY_BASE_URL is required");
  }
  return baseUrl;
}

function readTokenTtlMinutes(): number {
  const raw = process.env.WITNESSOPS_TOKEN_TTL_MINUTES ?? "15";
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("WITNESSOPS_TOKEN_TTL_MINUTES must be a positive number");
  }
  return value;
}

function computeExpiresAt(createdAt: string): string {
  const created = new Date(createdAt);
  created.setUTCMinutes(created.getUTCMinutes() + readTokenTtlMinutes());
  return created.toISOString().replace(/\.\d{3}Z$/, "Z");
}

async function transitionIntakeState(args: {
  intake: IntakeRecord;
  nextState: IntakeRecord["state"];
  eventType: string;
  source: string;
  occurredAt: string;
  issuanceId?: string | null;
  patch?: Partial<IntakeRecord>;
  payload?: Record<string, unknown>;
}): Promise<IntakeRecord> {
  const updated = await updateIntake(args.intake.intakeId, (current) => {
    const next: IntakeRecord = {
      ...current,
      ...args.patch,
      state: args.nextState,
      updatedAt: args.occurredAt,
    };

    if (args.nextState === "verification_sent") {
      next.verificationSentAt = args.occurredAt;
    }
    if (args.nextState === "verified") {
      next.verifiedAt = args.occurredAt;
    }
    if (args.nextState === "admitted") {
      next.admittedAt = args.occurredAt;
    }
    if (args.nextState === "expired") {
      next.expiredAt = args.occurredAt;
    }
    if (args.nextState === "rejected") {
      next.rejectedAt = args.occurredAt;
    }
    if (args.nextState === "responded") {
      next.respondedAt = args.occurredAt;
    }
    if (args.nextState === "replayed") {
      next.replayedAt = args.occurredAt;
    }

    return next;
  });

  await appendIntakeEvent({
    event_type: args.eventType,
    occurred_at: args.occurredAt,
    channel: updated.channel,
    intake_id: updated.intakeId,
    issuance_id: args.issuanceId ?? updated.latestIssuanceId,
    thread_id: updated.threadId,
    previous_state: args.intake.state,
    next_state: updated.state,
    source: args.source,
    payload: args.payload,
  });

  return updated;
}

async function ensureIssuanceContext(record: TokenIssuanceRecord): Promise<{
  intake: IntakeRecord;
  issuance: TokenIssuanceRecord;
}> {
  const inferredChannel = record.channel ?? "engage";
  const inferredThreadId = record.threadId ?? null;
  const intakeId = record.intakeId ?? generateIntakeId();
  const existingIntake = await getIntakeById(intakeId);

  const intake =
    existingIntake ??
    ({
      intakeId,
      channel: inferredChannel,
      email: record.email,
      state: record.status === "verified" ? "admitted" : "verification_sent",
      createdAt: record.createdAt,
      updatedAt: record.verifiedAt ?? record.consumedAt ?? record.createdAt,
      latestIssuanceId: record.issuanceId,
      threadId:
        record.status === "verified"
          ? (inferredThreadId ?? generateThreadId())
          : inferredThreadId,
      verificationSentAt: record.delivery.deliveredAt,
      verifiedAt: record.verifiedAt,
      admittedAt:
        record.status === "verified"
          ? (record.verifiedAt ?? record.consumedAt)
          : undefined,
      submission: {},
    } satisfies IntakeRecord);

  if (!existingIntake) {
    await saveIntake(intake);
  }

  if (
    record.intakeId === intake.intakeId &&
    record.channel === intake.channel
  ) {
    return {
      intake,
      issuance: record,
    };
  }

  const issuance = await updateIssuance(record.issuanceId, (current) => ({
    ...current,
    intakeId: intake.intakeId,
    channel: intake.channel,
    threadId: current.threadId ?? intake.threadId,
  }));

  return { intake, issuance };
}

async function admitVerifiedIntake(args: {
  intake: IntakeRecord;
  issuance: TokenIssuanceRecord;
  source: string;
  occurredAt: string;
}): Promise<{ intake: IntakeRecord; issuance: TokenIssuanceRecord }> {
  const threadId =
    args.intake.threadId ?? args.issuance.threadId ?? generateThreadId();
  const intake =
    args.intake.state === "admitted"
      ? await updateIntake(args.intake.intakeId, (current) => ({
          ...current,
          updatedAt: args.occurredAt,
          latestIssuanceId: args.issuance.issuanceId,
          threadId,
          admittedAt: current.admittedAt ?? args.occurredAt,
        }))
      : await transitionIntakeState({
          intake: args.intake,
          nextState: "admitted",
          eventType: "INTAKE_ADMITTED",
          source: args.source,
          occurredAt: args.occurredAt,
          issuanceId: args.issuance.issuanceId,
          patch: {
            latestIssuanceId: args.issuance.issuanceId,
            threadId,
          },
        });

  const issuance =
    args.issuance.threadId === threadId
      ? args.issuance
      : await updateIssuance(args.issuance.issuanceId, (current) => ({
          ...current,
          threadId,
        }));

  return { intake, issuance };
}

async function ensureOperatorNotificationSent(args: {
  intake: IntakeRecord;
  issuance: TokenIssuanceRecord;
  source: string;
  occurredAt: string;
}): Promise<IntakeRecord> {
  if (
    args.intake.channel !== "engage" ||
    !isManualProofRunIntent(args.intake.submission.intent)
  ) {
    return args.intake;
  }

  if (args.intake.operatorNotification) {
    return args.intake;
  }

  const mailbox = getChannelMailbox(args.intake.channel);
  const sender = getChannelVerificationMailbox(args.intake.channel);
  const deliveryAttemptId = `opnotif_${randomUUID().replace(/-/g, "")}`;
  const subject = operatorNotificationSubject(args.intake);
  const delivery = await sendVerificationEmail({
    to: mailbox,
    from: sender,
    replyTo: args.issuance.email,
    subject,
    text: renderOperatorNotificationText(args),
    html: renderOperatorNotificationHtml(args),
    deliveryAttemptId,
    messageClass: "internal_notification",
    signatureProfile: "none",
  });

  const updated = await updateIntake(args.intake.intakeId, (current) => ({
    ...current,
    updatedAt: args.occurredAt,
    operatorNotification: {
      deliveryAttemptId,
      subject,
      mailbox,
      replyTo: args.issuance.email,
      provider: delivery.provider,
      providerMessageId: delivery.providerMessageId,
      deliveredAt: delivery.deliveredAt,
    },
  }));

  await appendIntakeEvent({
    event_type: "INTAKE_OPERATOR_NOTIFICATION_SENT",
    occurred_at: delivery.deliveredAt,
    channel: updated.channel,
    intake_id: updated.intakeId,
    issuance_id: args.issuance.issuanceId,
    thread_id: updated.threadId,
    previous_state: args.intake.state,
    next_state: updated.state,
    source: args.source,
    payload: {
      mailbox,
      provider: delivery.provider,
      providerMessageId: delivery.providerMessageId,
      replyTo: args.issuance.email,
    },
  });

  return updated;
}

function toVerificationResponse(args: {
  intake: IntakeRecord;
  issuance: TokenIssuanceRecord;
  verifiedAt: string;
  assessmentRunId: string | null;
  assessmentStatus: AssessmentStatus;
}): VerifyTokenResponse {
  return {
    channel: args.intake.channel,
    intakeId: args.intake.intakeId,
    issuanceId: args.issuance.issuanceId,
    threadId: args.intake.threadId,
    email: args.issuance.email,
    verifiedAt: args.verifiedAt,
    status: "verified",
    admissionState: args.intake.state,
    assessmentRunId: args.assessmentRunId,
    assessmentStatus: args.assessmentStatus,
    postVerifyPath: buildPostVerifyPath(args.intake, args.issuance),
    run_id: args.assessmentRunId ?? undefined,
  };
}

function buildPostVerifyPath(
  intake: IntakeRecord,
  issuance: TokenIssuanceRecord,
): string {
  if (intake.channel === "support") {
    const search = new URLSearchParams({
      verified: "1",
      intakeId: intake.intakeId,
      email: issuance.email,
    });
    if (intake.threadId) {
      search.set("threadId", intake.threadId);
    }
    return `/support?${search.toString()}`;
  }

  if (isAccessChangeProofRunIntent(intake.submission.intent)) {
    return intake.submission.locale === "pl"
      ? "/pl/review/request/confirmed"
      : ACCESS_CHANGE_POST_VERIFY_PATH;
  }

  const search = new URLSearchParams({ email: issuance.email });
  return `/assessment/${encodeURIComponent(issuance.issuanceId)}?${search.toString()}`;
}

function shouldAttachAssessment(intake: IntakeRecord): boolean {
  const policy = getChannelPolicy(intake.channel ?? "engage");
  return (
    policy.autoAssessment &&
    !isAccessChangeProofRunIntent(intake.submission.intent)
  );
}

export async function createVerificationIssuance(
  input: CreateVerificationIssuanceInput,
): Promise<VerificationIssuanceResponse> {
  assertInboundAllowed(input.channel);

  const policy = getChannelPolicy(input.channel);
  if (policy.requiresBusinessEmail && !isBusinessEmail(input.email)) {
    throw new Error("Please use your business email.");
  }

  const intakeId = generateIntakeId();
  const issuanceId = generateIssuanceId();
  const rawToken = generateRawToken();
  const createdAt = nowIso();
  const expiresAt = computeExpiresAt(createdAt);
  const normalizedSubmission = normalizeSubmission(input.submission);
  const verifyUrl = new URL("/verify-token", readVerifyBaseUrl());
  verifyUrl.searchParams.set("issuanceId", issuanceId);
  verifyUrl.searchParams.set("email", input.email);

  const intake: IntakeRecord = {
    intakeId,
    channel: input.channel,
    email: input.email,
    state: "submitted",
    createdAt,
    updatedAt: createdAt,
    latestIssuanceId: null,
    threadId: null,
    submission: normalizedSubmission,
  };

  await saveIntake(intake);
  await appendIntakeEvent({
    event_type: "INTAKE_SUBMITTED",
    occurred_at: createdAt,
    channel: input.channel,
    intake_id: intakeId,
    issuance_id: null,
    thread_id: null,
    previous_state: null,
    next_state: "submitted",
    source: input.source,
    payload: {
      email: input.email,
    },
  });

  const template = renderVerificationEmail({
    channel: input.channel,
    email: input.email,
    intakeId,
    issuanceId,
    token: rawToken,
    expiresAt,
    verifyUrl: verifyUrl.toString(),
    intent: normalizedSubmission.intent,
  });

  const delivery = await sendVerificationEmail({
    to: input.email,
    from: getChannelVerificationMailbox(input.channel),
    subject: template.subject,
    text: template.text,
    html: template.html,
    messageClass: "transactional",
  });

  const issuanceRecord: TokenIssuanceRecord = {
    issuanceId,
    intakeId,
    channel: input.channel,
    email: input.email,
    tokenDigest: digestToken(rawToken),
    createdAt,
    expiresAt,
    status: "issued",
    threadId: null,
    approvalStatus: "pending",
    delivery: {
      mailbox: getChannelVerificationMailbox(input.channel),
      alias: null,
      templateVersion: template.templateVersion,
      provider: delivery.provider,
      providerMessageId: delivery.providerMessageId,
      deliveredAt: delivery.deliveredAt,
    },
  };

  await saveIssuance(issuanceRecord);
  await transitionIntakeState({
    intake,
    nextState: "verification_sent",
    eventType: "INTAKE_VERIFICATION_SENT",
    source: input.source,
    occurredAt: delivery.deliveredAt,
    issuanceId,
    patch: {
      latestIssuanceId: issuanceId,
    },
    payload: {
      mailbox: issuanceRecord.delivery.mailbox,
      provider: issuanceRecord.delivery.provider,
    },
  });

  return {
    channel: input.channel,
    intakeId,
    issuanceId,
    threadId: null,
    email: input.email,
    createdAt,
    expiresAt,
    status: "issued",
    admissionState: "verification_sent",
  };
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

interface AssessmentAttachment {
  assessmentRunId: string | null;
  assessmentStatus: AssessmentStatus;
}

async function ensureAssessmentAttached(
  record: TokenIssuanceRecord,
): Promise<AssessmentAttachment> {
  const latest = (await getIssuanceById(record.issuanceId)) ?? record;

  const channel = latest.channel ?? "engage";
  if (!getChannelPolicy(channel).autoAssessment) {
    await updateIssuance(record.issuanceId, (existing) => ({
      ...existing,
      assessmentStatus: existing.assessmentStatus ?? "unavailable",
      assessmentError: existing.assessmentError ?? null,
    }));
    return {
      assessmentRunId: null,
      assessmentStatus: "unavailable",
    };
  }

  if (latest.assessmentRunId) {
    return {
      assessmentRunId: latest.assessmentRunId,
      assessmentStatus: latest.assessmentStatus ?? "pending",
    };
  }

  if (!process.env.GES_SERVER_URL) {
    console.warn(
      "[token-issuance] GES_SERVER_URL not set — skipping assessment for",
      record.issuanceId,
    );
    await updateIssuance(record.issuanceId, (existing) => ({
      ...existing,
      assessmentStatus: "unavailable",
      assessmentError: "GES_SERVER_URL not configured",
    }));
    return {
      assessmentRunId: null,
      assessmentStatus: "unavailable",
    };
  }

  try {
    const result = await triggerAssessment({
      email: record.email,
      domain: record.email.split("@")[1] ?? "",
      issuanceId: record.issuanceId,
    });

    if (!result) {
      await updateIssuance(record.issuanceId, (existing) => ({
        ...existing,
        assessmentStatus: "unavailable",
        assessmentError: "Assessment server not configured",
      }));
      return {
        assessmentRunId: null,
        assessmentStatus: "unavailable",
      };
    }

    await updateIssuance(record.issuanceId, (existing) => ({
      ...existing,
      assessmentRunId: result.run_id,
      assessmentStatus: result.status,
      assessmentError: null,
    }));

    return {
      assessmentRunId: result.run_id,
      assessmentStatus: result.status,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[token-issuance] assessment trigger failed:", message);
    await updateIssuance(record.issuanceId, (existing) => ({
      ...existing,
      assessmentStatus: "unavailable",
      assessmentError: message,
    }));
    return {
      assessmentRunId: null,
      assessmentStatus: "unavailable",
    };
  }
}

interface ScopeApprovalInput {
  issuanceId: string;
  email: string;
  approverName?: string | null;
  approvalNote?: string | null;
  source: string;
}

interface ScopeApprovalResult extends ScopeApprovalResponse {
  status: "approved" | "already_approved";
}

export async function approveScopeAndStartRecon(
  input: ScopeApprovalInput,
): Promise<ScopeApprovalResult> {
  const record = await getIssuanceById(input.issuanceId);
  if (!record) {
    throw new Error("Unknown issuance");
  }

  const { intake: originalIntake, issuance: originalIssuance } =
    await ensureIssuanceContext(record);

  if (originalIssuance.email !== input.email) {
    throw new Error("Issuance email mismatch");
  }

  const policy = getChannelPolicy(originalIntake.channel ?? "engage");
  if (!policy.autoAssessment) {
    throw new Error("Scope approval is only available for governed recon issuances.");
  }

  if (originalIssuance.status !== "verified") {
    throw new Error("Issuance must be verified before scope approval.");
  }

  // WEB-003: a prior claimant retract / disagree blocks approval until
  // the engagement is re-opened. Amend does not block.
  const blocking = claimantActionBlocksApproval(originalIssuance);
  if (blocking.blocked) {
    throw new Error(
      `Scope approval is blocked because the claimant has ${blocking.kind === "retract" ? "retracted the engagement" : "disagreed with the proposed scope"}.`,
    );
  }

  // WEB-004: an operator rejection (approval_denied) blocks subsequent
  // approval through the same code path that gates claimant exits.
  if (operatorRejectionBlocksApproval(originalIssuance)) {
    throw new Error(
      "Scope approval is blocked because an operator has rejected this intake.",
    );
  }

  const approvedAt = nowIso();
  const approvalNote = normalizeText(input.approvalNote);
  const approverName = normalizeText(input.approverName);
  const isFirstApproval = originalIssuance.approvalStatus !== "approved";
  let latestIssuance = originalIssuance;

  if (isFirstApproval) {
    latestIssuance = await updateIssuance(
      originalIssuance.issuanceId,
      (existing) => ({
        ...existing,
        approvalStatus: "approved",
        approvalAt: approvedAt,
        approverEmail: originalIssuance.email,
        approverName,
        approvalNote,
        assessmentStatus: "pending",
        assessmentError: null,
      }),
    );

    await updateIntake(originalIntake.intakeId, (current) => ({
      ...current,
      latestIssuanceId: originalIssuance.issuanceId,
      updatedAt: approvedAt,
    }));

    await appendIntakeEvent({
      event_type: "INTAKE_SCOPE_APPROVED",
      occurred_at: approvedAt,
      channel: originalIntake.channel,
      intake_id: originalIntake.intakeId,
      issuance_id: originalIssuance.issuanceId,
      thread_id: originalIntake.threadId,
      previous_state: originalIntake.state,
      next_state: originalIntake.state,
      source: input.source,
      payload: {
        approverEmail: originalIssuance.email,
        approverName: approverName ?? undefined,
        approvalNote: approvalNote ?? undefined,
        scope: originalIntake.submission.scope ?? null,
      },
    });
  } else if (originalIssuance.controlPlaneRunId) {
    // Handoff already acknowledged — return cached display state.
    return {
      status: "already_approved",
      channel: originalIntake.channel,
      intakeId: originalIntake.intakeId,
      issuanceId: originalIssuance.issuanceId,
      email: originalIssuance.email,
      approvedAt: originalIssuance.approvalAt ?? approvedAt,
      approvalStatus: "approved",
      approverEmail: originalIssuance.approverEmail ?? originalIssuance.email,
      approverName: originalIssuance.approverName ?? null,
      approvalNote: originalIssuance.approvalNote ?? null,
      assessmentRunId: originalIssuance.controlPlaneRunId,
      assessmentStatus: originalIssuance.assessmentStatus ?? "pending",
      run_id: originalIssuance.controlPlaneRunId,
    };
  }

  // Send scope-approved handoff to control plane.
  // Throws on network error or rejection — caller retains scope_approved state.
  // Safe to retry: issuanceId is the idempotency key on the control-plane side.
  const ack = await notifyScopeApproved({
    issuanceId: originalIssuance.issuanceId,
    domain: originalIssuance.email.split("@")[1] ?? "",
    contactEmail: originalIssuance.email,
    scopeApproval: {
      timestamp: latestIssuance.approvalAt ?? approvedAt,
      approvedBy: originalIssuance.email,
      approverName: latestIssuance.approverName ?? null,
      approvalNote: latestIssuance.approvalNote ?? null,
      scope: originalIntake.submission.scope ?? null,
    },
  });

  if (!ack) {
    console.warn(
      "[token-issuance] CONTROL_PLANE_URL not configured — handoff skipped for",
      originalIssuance.issuanceId,
    );
    return {
      status: isFirstApproval ? "approved" : "already_approved",
      channel: originalIntake.channel,
      intakeId: originalIntake.intakeId,
      issuanceId: originalIssuance.issuanceId,
      email: originalIssuance.email,
      approvedAt: latestIssuance.approvalAt ?? approvedAt,
      approvalStatus: "approved",
      approverEmail: latestIssuance.approverEmail ?? originalIssuance.email,
      approverName: latestIssuance.approverName ?? null,
      approvalNote: latestIssuance.approvalNote ?? null,
      assessmentRunId: null,
      assessmentStatus: "pending",
    };
  }

  // Store control-plane run ID as display cache only.
  // Do not write assessmentRunId, assessmentStatus, or assessmentError here —
  // those fields are control-plane authority after handoff.
  await updateIssuance(originalIssuance.issuanceId, (existing) => ({
    ...existing,
    controlPlaneRunId: ack.runId,
  }));

  return {
    status: isFirstApproval ? "approved" : "already_approved",
    channel: originalIntake.channel,
    intakeId: originalIntake.intakeId,
    issuanceId: originalIssuance.issuanceId,
    email: originalIssuance.email,
    approvedAt: latestIssuance.approvalAt ?? approvedAt,
    approvalStatus: "approved",
    approverEmail: latestIssuance.approverEmail ?? originalIssuance.email,
    approverName: latestIssuance.approverName ?? null,
    approvalNote: latestIssuance.approvalNote ?? null,
    assessmentRunId: ack.runId,
    assessmentStatus: "pending",
    run_id: ack.runId,
  };
}

export async function verifyIssuedToken(
  request: VerifyTokenRequest,
): Promise<VerifyTokenResponse> {
  const record = await getIssuanceById(request.issuanceId);
  if (!record) {
    throw new Error("Unknown issuance");
  }

  const { intake: originalIntake, issuance: originalIssuance } =
    await ensureIssuanceContext(record);

  if (originalIssuance.email !== request.email) {
    throw new Error("Issuance email mismatch");
  }

  if (!tokenDigestMatches(request.token, originalIssuance.tokenDigest)) {
    throw new Error("Token mismatch");
  }

  if (originalIssuance.status === "verified") {
    const replayedAt = nowIso();
    await appendIntakeEvent({
      event_type: "INTAKE_REPLAYED",
      occurred_at: replayedAt,
      channel: originalIntake.channel,
      intake_id: originalIntake.intakeId,
      issuance_id: originalIssuance.issuanceId,
      thread_id: originalIntake.threadId,
      previous_state: originalIntake.state,
      next_state: originalIntake.state,
      source: "api/verify-token",
    });

    const admitted = await admitVerifiedIntake({
      intake: originalIntake,
      issuance: originalIssuance,
      source: "api/verify-token",
      occurredAt:
        originalIssuance.verifiedAt ??
        originalIssuance.consumedAt ??
        replayedAt,
    });
    const notifiedIntake = await ensureOperatorNotificationSent({
      intake: admitted.intake,
      issuance: admitted.issuance,
      source: "api/verify-token",
      occurredAt: replayedAt,
    });
    const assessment = shouldAttachAssessment(notifiedIntake)
      ? await ensureAssessmentAttached(admitted.issuance)
      : {
          assessmentRunId: null,
          assessmentStatus: "unavailable" as const,
        };
    return toVerificationResponse({
      intake: notifiedIntake,
      issuance: admitted.issuance,
      verifiedAt:
        admitted.issuance.verifiedAt ??
        admitted.issuance.consumedAt ??
        replayedAt,
      assessmentRunId: assessment.assessmentRunId,
      assessmentStatus: assessment.assessmentStatus,
    });
  }

  if (originalIssuance.status !== "issued") {
    throw new Error("Issuance has already been consumed");
  }

  if (isExpired(originalIssuance.expiresAt)) {
    if (originalIntake.state !== "expired") {
      await transitionIntakeState({
        intake: originalIntake,
        nextState: "expired",
        eventType: "INTAKE_EXPIRED",
        source: "api/verify-token",
        occurredAt: nowIso(),
        issuanceId: originalIssuance.issuanceId,
      });
    }
    throw new Error("Issuance has expired");
  }

  const verifiedAt = nowIso();

  const verifiedIssuance = await updateIssuance(
    originalIssuance.issuanceId,
    (existing) => ({
      ...existing,
      status: "verified",
      verifiedAt,
      consumedAt: verifiedAt,
    }),
  );

  const verifiedIntake = await transitionIntakeState({
    intake: originalIntake,
    nextState: "verified",
    eventType: "INTAKE_VERIFIED",
    source: "api/verify-token",
    occurredAt: verifiedAt,
    issuanceId: verifiedIssuance.issuanceId,
    patch: {
      latestIssuanceId: verifiedIssuance.issuanceId,
    },
    payload: {
      mailbox: verifiedIssuance.delivery.mailbox,
    },
  });

  const admitted = await admitVerifiedIntake({
    intake: verifiedIntake,
    issuance: verifiedIssuance,
    source: "api/verify-token",
    occurredAt: verifiedAt,
  });
  const notifiedIntake = await ensureOperatorNotificationSent({
    intake: admitted.intake,
    issuance: admitted.issuance,
    source: "api/verify-token",
    occurredAt: verifiedAt,
  });

  return toVerificationResponse({
    intake: notifiedIntake,
    issuance: admitted.issuance,
    verifiedAt,
    assessmentRunId: admitted.issuance.assessmentRunId ?? null,
    assessmentStatus: admitted.issuance.assessmentStatus ?? "unavailable",
  });
}
