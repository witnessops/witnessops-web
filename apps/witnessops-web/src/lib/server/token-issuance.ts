import { isBusinessEmail } from "@/lib/freemail-policy";
import {
  getChannelMailbox,
  getChannelPolicy,
  assertInboundAllowed,
  type ChannelName,
} from "@/lib/channel-policy";
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

function normalizeSubmission(
  submission?: IntakeSubmissionRecord,
): IntakeSubmissionRecord {
  return {
    name: normalizeText(submission?.name),
    org: normalizeText(submission?.org),
    intent: normalizeText(submission?.intent),
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
    run_id: args.assessmentRunId ?? undefined,
  };
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
  const verifyUrl = new URL("/api/verify-token", readVerifyBaseUrl());
  verifyUrl.searchParams.set("issuanceId", issuanceId);
  verifyUrl.searchParams.set("email", input.email);
  verifyUrl.searchParams.set("token", rawToken);

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
  });

  const delivery = await sendVerificationEmail({
    to: input.email,
    from: getChannelMailbox(input.channel),
    subject: template.subject,
    text: template.text,
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
      mailbox: getChannelMailbox(input.channel),
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
    const assessment = await ensureAssessmentAttached(admitted.issuance);
    return toVerificationResponse({
      intake: admitted.intake,
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

  return toVerificationResponse({
    intake: admitted.intake,
    issuance: admitted.issuance,
    verifiedAt,
    assessmentRunId: admitted.issuance.assessmentRunId ?? null,
    assessmentStatus: admitted.issuance.assessmentStatus ?? "unavailable",
  });
}
