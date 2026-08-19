import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

import { getWorkflowSkus } from "@witnessops/catalog";
import { listReceipts } from "@/lib/receipts";
import {
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_CONTACT_PRIMARY_HREF,
} from "@/lib/public-contact";
import {
  type AdminRole,
  hasAdministrationAuthority,
  hasBusinessAuthority,
  isSameOperator,
} from "./admin-authorization";
import { getAdmissionStoreDir } from "./token-store";
import { withFilesystemLock } from "./filesystem-lock";

export const ADMIN_CORE_SCHEMA_VERSION = 1 as const;
export const SECURITY_DISCLOSURE_EMAIL = "security@witnessops.com";
export const ADMIN_CORE_NO_SECRETS_NOTE =
  "Do not send passwords, private keys, API keys, recovery codes, session tokens, or other secrets.";

export type InboxItemState =
  | "new"
  | "reviewed"
  | "linked"
  | "archived"
  | "security-routed"
  | "excluded";

export type ReviewRequestState =
  | "new"
  | "triage"
  | "needs_customer_information"
  | "fit_review"
  | "fit_confirmed"
  | "approved_for_proof_run"
  | "scheduled"
  | "converted_to_proof_run"
  | "declined"
  | "closed";

export type ProofRunState =
  | "planned"
  | "ready"
  | "running"
  | "blocked"
  | "operator_review"
  | "complete"
  | "cancelled";

export type EvidenceState =
  | "not_started"
  | "expected"
  | "partial"
  | "complete"
  | "blocked"
  | "excluded"
  | "not_applicable";

export type DeliveryState =
  | "draft"
  | "ready_for_operator_review"
  | "sent"
  | "acknowledged"
  | "superseded"
  | "failed";

export type AttachmentClassification =
  | "reference"
  | "scope_material"
  | "evidence_candidate"
  | "excluded";

export type HealthState = "connected" | "degraded" | "disconnected" | "unknown";

export interface GmailAttachmentMetadata {
  attachmentId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number | null;
  reviewed: boolean;
  classification: AttachmentClassification | null;
  driveFileId?: string | null;
}

export interface CoreLineage {
  lineageId: string;
  inboxItemId: string | null;
  reviewRequestId: string | null;
  customerId: string | null;
  productContractVersionId: string | null;
  proofRunId: string | null;
  deliveryId: string | null;
  receiptId: string | null;
  driveFileIds: string[];
}

export interface InboxItemRecord {
  id: string;
  state: InboxItemState;
  source: "gmail";
  gmailMessageId: string;
  gmailThreadId: string;
  sender: string;
  recipients: string[];
  subject: string;
  receivedAt: string;
  excerpt: string;
  gmailLabels: string[];
  attachments: GmailAttachmentMetadata[];
  securityRouteReason: string | null;
  reviewRequestId: string | null;
  lineageId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  organization: string | null;
  notes: string;
  owner: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductContractVersionRecord {
  id: string;
  productId: string;
  productName: string;
  contractVersion: string;
  status: "current" | "retired";
  scope: string;
  boundaries: string[];
  expectedInputs: string[];
  expectedOutputs: string[];
  evidenceClasses: string[];
  verificationPath: string;
  deliveryRequirements: string[];
  receiptRequirements: string[];
  responsibleOperator: string | null;
  commercialTerms: string | null;
  sourceCatalogVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRequestRecord {
  id: string;
  state: ReviewRequestState;
  lineageId: string;
  inboxItemId: string;
  customerId: string;
  originatingGmailThreadId: string;
  requestText: string;
  proposedProductId: string | null;
  scope: string;
  workflowBoundary: string;
  authorityBoundary: string;
  desiredOutcome: string;
  timing: string;
  evidencePosture: string;
  missingInformation: string[];
  commercialStatus: string;
  nextAction: string;
  owner: string | null;
  internalNotes: VersionedNote[];
  customerReplyDrafts: CustomerReplyDraft[];
  productContractVersionId: string | null;
  proofRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VersionedNote {
  noteId: string;
  body: string;
  author: string;
  createdAt: string;
  supersedesNoteId: string | null;
}

export interface CustomerReplyDraft {
  draftId: string;
  subject: string;
  body: string;
  author: string;
  createdAt: string;
  status: "draft" | "used" | "discarded";
}

export interface ProductContractSnapshot {
  productId: string;
  productName: string;
  contractVersion: string;
  scope: string;
  boundaries: string[];
  expectedInputs: string[];
  expectedOutputs: string[];
  evidenceClasses: string[];
  verificationPath: string;
  deliveryRequirements: string[];
  receiptRequirements: string[];
  responsibleOperator: string | null;
  commercialTerms: string | null;
}

export interface ProofRunRecord {
  id: string;
  state: ProofRunState;
  evidenceState: EvidenceState;
  lineageId: string;
  reviewRequestId: string;
  customerId: string;
  productContractVersionId: string;
  productContractSnapshot: ProductContractSnapshot;
  owner: string | null;
  nextAction: string;
  scopeComplete: boolean;
  requiredOutputs: string[];
  outputReferences: string[];
  evidenceReferences: string[];
  knownGaps: string[];
  verificationInstructions: string;
  customerWordingReviewed: boolean;
  unsupportedClaims: string[];
  driveFileIds: string[];
  deliveryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptRecord {
  id: string;
  receiptId: string;
  customerId: string;
  proofRunId: string;
  productContractVersionId: string;
  claimScope: string;
  structurallyValid: boolean;
  evidenceReferences: string[];
  verifierMechanism: string;
  verifierResult: string;
  limitations: string[];
  archiveLocation: string;
  supersedesReceiptId: string | null;
  supersededByReceiptId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryRecord {
  id: string;
  state: DeliveryState;
  lineageId: string;
  proofRunId: string;
  customerId: string;
  receiptId: string | null;
  subject: string;
  body: string;
  downloadLinks: string[];
  verificationInstructions: string;
  customerWordingReviewed: boolean;
  unsupportedClaims: string[];
  contentRevision: number;
  sentContentRevision: number | null;
  sentContentDigest: string | null;
  provider: string | null;
  providerMessageId: string | null;
  sentAt: string | null;
  acknowledgedAt: string | null;
  failure: string | null;
  createdAt: string;
  updatedAt: string;
}

export const DELIVERY_SEND_CONTENT_SCHEMA =
  "witnessops.delivery-send-content.v1" as const;

export interface DeliverySendContentSnapshot {
  schema: typeof DELIVERY_SEND_CONTENT_SCHEMA;
  receiptId: string | null;
  subject: string;
  body: string;
  downloadLinks: string[];
  verificationInstructions: string;
  customerWordingReviewed: boolean;
  unsupportedClaims: string[];
}

export interface AuditEventRecord {
  eventId: string;
  recordType: string;
  recordId: string;
  action: string;
  actor: string;
  timestamp: string;
  previousState: string | null;
  resultingState: string | null;
  integrationResult: string | null;
  linkedExternalIds: string[];
  failureDetails: string | null;
  lineageId: string | null;
}

export interface IntegrationAttemptRecord {
  id: string;
  integration: "gmail" | "drive" | "mail" | "receipt-verifier" | "receipt-archive";
  operation: string;
  idempotencyKey: string;
  status: "started" | "succeeded" | "failed" | "retryable";
  attemptedAt: string;
  completedAt: string | null;
  externalId: string | null;
  error: string | null;
}

export interface DeliverySendReservationRecord {
  deliveryId: string;
  idempotencyKey: string;
  reservationToken: string;
  reservedBy: string;
  reservedAt: string;
  status: "reserved" | "sent" | "failed" | "outcome_unknown";
  completedAt: string | null;
  contentRevision?: number;
  contentDigest?: string;
  contentSnapshot?: DeliverySendContentSnapshot;
}

export interface DeliverySendReservationStatus {
  status: DeliverySendReservationRecord["status"];
  reservedAt: string;
  completedAt: string | null;
}

export type DeliverySendReconciliationInput =
  | {
      outcome: "sent";
      provider: string;
      providerMessageId: string | null;
      sentAt: string;
      note: string;
    }
  | {
      outcome: "not_sent";
      note: string;
    };

export interface GmailSyncLabelOperation {
  messageId: string;
  labelName: string;
  labelId: string | null;
  outcome: "applied" | "already_present" | "failed";
  idempotencyKey: string;
  error: string | null;
}

export interface GmailSyncFailure {
  scope: "list" | "message" | "labels" | "label" | "store";
  messageId: string | null;
  error: string;
  retryable: boolean;
}

export interface GmailSyncCounts {
  threadsInspected: number;
  messagesInspected: number;
  inboxItemsCreated: number;
  existingItemsUpdated: number;
  noOp: number;
  securityMessagesExcluded: number;
  labelFailures: number;
}

export interface GmailSyncReceipt {
  syncRunId: string;
  account: string;
  startedAt: string;
  completedAt: string;
  query: string;
  status: "completed" | "partial" | "failed";
  messageIdsInspected: string[];
  threadIdsInspected: string[];
  createdInboxItemIds: string[];
  updatedInboxItemIds: string[];
  skippedInboxItemIds: string[];
  excludedSecurityMessageIds: string[];
  excludedInboxItemIds: string[];
  resultingInternalRecordIds: string[];
  labelOperations: GmailSyncLabelOperation[];
  failures: GmailSyncFailure[];
  counts: GmailSyncCounts;
  idempotencyKey: string;
}

export interface GmailSyncReconciliationInput {
  syncRunId: string;
  account: string;
  startedAt: string;
  completedAt: string;
  query: string;
  messages: GmailInboxImport[];
  inspectedMessageIds?: string[];
  inspectedThreadIds?: string[];
  labelOperations: GmailSyncLabelOperation[];
  failures: GmailSyncFailure[];
  idempotencyKey: string;
  status?: GmailSyncReceipt["status"];
}

export interface CoreState {
  schemaVersion: typeof ADMIN_CORE_SCHEMA_VERSION;
  inboxItems: InboxItemRecord[];
  customers: CustomerRecord[];
  productContracts: ProductContractVersionRecord[];
  reviewRequests: ReviewRequestRecord[];
  proofRuns: ProofRunRecord[];
  deliveries: DeliveryRecord[];
  receipts: ReceiptRecord[];
  auditEvents: AuditEventRecord[];
  integrationAttempts: IntegrationAttemptRecord[];
  gmailSyncReceipts: GmailSyncReceipt[];
  idempotency: Record<string, { recordType: string; recordId: string }>;
  deliverySendReservations: Record<string, DeliverySendReservationRecord>;
}

export interface CoreActor {
  actor: string;
  role?: AdminRole;
}

function actorCanReadOwner(actor: CoreActor, owner: string | null): boolean {
  return (
    (actor.role ?? "Founder") !== "Delegated Operator" ||
    isSameOperator(owner, actor.actor)
  );
}

function filterStateForActor(state: CoreState, actor: CoreActor): CoreState {
  if ((actor.role ?? "Founder") !== "Delegated Operator") return state;

  const reviewRequests = state.reviewRequests.filter((record) =>
    actorCanReadOwner(actor, record.owner),
  );
  const reviewIds = new Set(reviewRequests.map((record) => record.id));
  const lineageIds = new Set(reviewRequests.map((record) => record.lineageId));
  const customerIds = new Set(reviewRequests.map((record) => record.customerId));
  const inboxIds = new Set(reviewRequests.map((record) => record.inboxItemId));

  const proofRuns = state.proofRuns.filter(
    (record) =>
      actorCanReadOwner(actor, record.owner) ||
      reviewIds.has(record.reviewRequestId),
  );
  for (const record of proofRuns) {
    lineageIds.add(record.lineageId);
    customerIds.add(record.customerId);
    reviewIds.add(record.reviewRequestId);
  }
  const proofRunIds = new Set(proofRuns.map((record) => record.id));
  const deliveries = state.deliveries.filter((record) =>
    proofRunIds.has(record.proofRunId),
  );
  const deliveryIds = new Set(deliveries.map((record) => record.id));
  const receipts = state.receipts.filter((record) =>
    proofRunIds.has(record.proofRunId),
  );
  const receiptIds = new Set(receipts.map((record) => record.id));
  const productContractIds = new Set<string>();
  for (const record of reviewRequests) {
    if (record.productContractVersionId) {
      productContractIds.add(record.productContractVersionId);
    }
  }
  for (const record of proofRuns) {
    productContractIds.add(record.productContractVersionId);
  }

  return {
    ...state,
    inboxItems: state.inboxItems.filter(
      (record) =>
        inboxIds.has(record.id) ||
        (record.reviewRequestId !== null && reviewIds.has(record.reviewRequestId)),
    ),
    customers: state.customers.filter((record) => customerIds.has(record.id)),
    productContracts: state.productContracts.filter((record) =>
      productContractIds.has(record.id),
    ),
    reviewRequests: state.reviewRequests.filter((record) =>
      reviewIds.has(record.id),
    ),
    proofRuns,
    deliveries,
    receipts,
    auditEvents: state.auditEvents.filter(
      (record) =>
        (record.lineageId !== null && lineageIds.has(record.lineageId)) ||
        reviewIds.has(record.recordId) ||
        proofRunIds.has(record.recordId) ||
        deliveryIds.has(record.recordId) ||
        receiptIds.has(record.recordId),
    ),
    integrationAttempts: [],
    gmailSyncReceipts: [],
    idempotency: {},
    deliverySendReservations: Object.fromEntries(
      Object.entries(state.deliverySendReservations).filter(([deliveryId]) =>
        deliveryIds.has(deliveryId),
      ),
    ),
  };
}

export class AdminCoreError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;

  constructor(code: string, message: string, status = 400, details: unknown = null) {
    super(message);
    this.name = "AdminCoreError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const reviewTransitions: Record<ReviewRequestState, readonly ReviewRequestState[]> = {
  new: ["triage", "declined"],
  triage: ["needs_customer_information", "fit_review", "declined"],
  needs_customer_information: ["triage", "declined"],
  fit_review: ["fit_confirmed", "needs_customer_information", "declined"],
  fit_confirmed: ["approved_for_proof_run", "declined"],
  approved_for_proof_run: ["scheduled", "converted_to_proof_run", "declined"],
  scheduled: ["converted_to_proof_run", "declined"],
  converted_to_proof_run: ["closed"],
  declined: ["closed"],
  closed: [],
};

const proofTransitions: Record<ProofRunState, readonly ProofRunState[]> = {
  planned: ["ready", "blocked", "cancelled"],
  ready: ["running", "blocked", "cancelled"],
  running: ["operator_review", "blocked", "cancelled"],
  blocked: ["ready", "cancelled"],
  operator_review: ["complete", "blocked", "cancelled"],
  complete: [],
  cancelled: [],
};

const deliveryTransitions: Record<DeliveryState, readonly DeliveryState[]> = {
  draft: ["ready_for_operator_review", "failed"],
  ready_for_operator_review: ["sent", "failed", "draft"],
  sent: ["acknowledged", "superseded", "failed"],
  acknowledged: ["superseded"],
  superseded: [],
  failed: ["draft", "ready_for_operator_review"],
};

function isoNow(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deliveryContentSnapshot(
  delivery: DeliveryRecord,
): DeliverySendContentSnapshot {
  return {
    schema: DELIVERY_SEND_CONTENT_SCHEMA,
    receiptId: delivery.receiptId,
    subject: delivery.subject,
    body: delivery.body,
    downloadLinks: [...delivery.downloadLinks],
    verificationInstructions: delivery.verificationInstructions,
    customerWordingReviewed: delivery.customerWordingReviewed,
    unsupportedClaims: [...delivery.unsupportedClaims],
  };
}

function deliveryContentDigest(snapshot: DeliverySendContentSnapshot): string {
  const digest = createHash("sha256")
    .update(JSON.stringify(snapshot), "utf8")
    .digest("hex");
  return `sha256:${digest}`;
}

function requireDeliveryContentMutable(
  state: CoreState,
  delivery: DeliveryRecord,
): void {
  const reservation = state.deliverySendReservations[delivery.id];
  if (
    reservation?.status === "reserved" ||
    reservation?.status === "outcome_unknown"
  ) {
    throw new AdminCoreError(
      "DELIVERY_SEND_UNRESOLVED",
      "Delivery content cannot change while its send outcome is unresolved.",
      409,
    );
  }
  if (
    delivery.state === "sent" ||
    delivery.state === "acknowledged" ||
    delivery.state === "superseded" ||
    reservation?.status === "sent" ||
    delivery.sentAt !== null ||
    delivery.sentContentRevision !== null ||
    delivery.sentContentDigest !== null
  ) {
    throw new AdminCoreError(
      "DELIVERY_CONTENT_IMMUTABLE",
      "Sent delivery content is immutable.",
      409,
    );
  }
}

function requireReservationContentBinding(
  delivery: DeliveryRecord,
  reservation: DeliverySendReservationRecord,
): { contentRevision: number; contentDigest: string } {
  const contentRevision = reservation.contentRevision;
  const contentDigest = reservation.contentDigest;
  const contentSnapshot = reservation.contentSnapshot;
  if (
    typeof contentRevision !== "number" ||
    !Number.isSafeInteger(contentRevision) ||
    contentRevision < 1 ||
    typeof contentDigest !== "string" ||
    !contentDigest.startsWith("sha256:") ||
    !contentSnapshot
  ) {
    throw new AdminCoreError(
      "DELIVERY_CONTENT_BINDING_MISSING",
      "The delivery send reservation has no immutable content binding.",
      409,
    );
  }

  const reservedSnapshotDigest = deliveryContentDigest(contentSnapshot);
  const currentSnapshotDigest = deliveryContentDigest(
    deliveryContentSnapshot(delivery),
  );
  if (
    reservedSnapshotDigest !== contentDigest ||
    currentSnapshotDigest !== contentDigest ||
    delivery.contentRevision !== contentRevision
  ) {
    throw new AdminCoreError(
      "DELIVERY_CONTENT_REVISION_CONFLICT",
      "Delivery content no longer matches the reserved send revision.",
      409,
    );
  }

  return { contentRevision, contentDigest };
}

function id(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll("-", "")}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function extractEmail(value: string): string {
  const bracketed = value.match(/<([^>]+)>/)?.[1];
  return normalizeEmail(bracketed || value);
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function assertNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new AdminCoreError("INVALID_INPUT", `${field} is required.`);
  return trimmed;
}

function coreStoreFile(): string {
  const configured = process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR?.trim();
  if (process.env.NODE_ENV === "production" && !configured) {
    throw new Error("Admin core store directory requires WITNESSOPS_ADMIN_CORE_STORE_DIR in production.");
  }
  const directory = configured || path.join(getAdmissionStoreDir(), "admin-core");
  return path.join(directory, "core-state.json");
}

function defaultProducts(): ProductContractVersionRecord[] {
  const now = isoNow();
  return getWorkflowSkus().map((sku) => ({
    id: `pcv_${sku.id.toLowerCase()}_v1`,
    productId: sku.id,
    productName: sku.name,
    contractVersion: "1.0.0",
    status: "current" as const,
    scope: sku.summary,
    boundaries: [...sku.boundaries],
    expectedInputs: ["Customer request and approved scope"],
    expectedOutputs: [...sku.deliverables],
    evidenceClasses: ["source references", "operator notes", "generated outputs"],
    verificationPath: "Open the linked receipt and follow its named verifier instructions.",
    deliveryRequirements: ["bounded scope", "required outputs", "reviewed customer wording"],
    receiptRequirements: ["receipt ID", "claim scope", "verifier mechanism and result"],
    responsibleOperator: null,
    commercialTerms: sku.price.display,
    sourceCatalogVersion: null,
    createdAt: now,
    updatedAt: now,
  }));
}

function emptyState(): CoreState {
  return {
    schemaVersion: ADMIN_CORE_SCHEMA_VERSION,
    inboxItems: [],
    customers: [],
    productContracts: defaultProducts(),
    reviewRequests: [],
    proofRuns: [],
    deliveries: [],
    receipts: [],
    auditEvents: [],
    integrationAttempts: [],
    gmailSyncReceipts: [],
    idempotency: {},
    deliverySendReservations: {},
  };
}

async function readState(): Promise<CoreState> {
  try {
    const raw = await readFile(coreStoreFile(), "utf8");
    const parsed = JSON.parse(raw) as CoreState;
    if (parsed.schemaVersion !== ADMIN_CORE_SCHEMA_VERSION) {
      throw new AdminCoreError("STORE_VERSION", "Admin core store version is unsupported.", 500);
    }
    parsed.gmailSyncReceipts ??= [];
    parsed.deliverySendReservations ??= {};
    for (const delivery of parsed.deliveries) {
      delivery.contentRevision ??= 1;
      delivery.sentContentRevision ??= null;
      delivery.sentContentDigest ??= null;
      if (
        !Number.isSafeInteger(delivery.contentRevision) ||
        delivery.contentRevision < 1
      ) {
        throw new AdminCoreError(
          "STORE_CORRUPT",
          "Delivery content revision is invalid.",
          500,
        );
      }
    }
    return parsed;
  } catch (error) {
    if (error instanceof AdminCoreError) throw error;
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyState();
    throw error;
  }
}

async function writeState(state: CoreState): Promise<void> {
  const file = coreStoreFile();
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(state, null, 2) + "\n", "utf8");
  await rename(temp, file);
}

const CORE_LOCK_WAIT_MS = 25;
const CORE_LOCK_TIMEOUT_MS = 30_000;
const CORE_LOCK_STALE_MS = 10 * 60_000;
const DELIVERY_SEND_RESERVATION_STALE_MS = 10 * 60_000;

function coreLockFile(): string {
  return path.join(path.dirname(coreStoreFile()), "core-state.lock");
}

async function withCoreStoreLock<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await withFilesystemLock(
      {
        lockPath: coreLockFile(),
        description: "admin core state",
        waitMs: CORE_LOCK_WAIT_MS,
        timeoutMs: CORE_LOCK_TIMEOUT_MS,
        staleMs: CORE_LOCK_STALE_MS,
      },
      action,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Timed out waiting for admin core state lock"
    ) {
      throw new AdminCoreError(
        "STORE_BUSY",
        "Admin core state is busy; retry the operation.",
        503,
      );
    }
    throw error;
  }
}

async function mutateState<T>(mutator: (state: CoreState) => T): Promise<T> {
  return withCoreStoreLock(async () => {
    const state = await readState();
    const result = mutator(state);
    await writeState(state);
    return result;
  });
}

function appendAudit(
  state: CoreState,
  input: Omit<AuditEventRecord, "eventId" | "timestamp">,
): AuditEventRecord {
  const event: AuditEventRecord = {
    ...input,
    eventId: id("audit"),
    timestamp: isoNow(),
  };
  state.auditEvents.push(event);
  return event;
}

function appendIntegration(
  state: CoreState,
  input: Omit<IntegrationAttemptRecord, "id" | "attemptedAt">,
): IntegrationAttemptRecord {
  const attempt: IntegrationAttemptRecord = {
    ...input,
    id: id("intg"),
    attemptedAt: isoNow(),
  };
  state.integrationAttempts.push(attempt);
  return attempt;
}

function requireRole(actor: CoreActor, action: "business-authority" | "administration"): void {
  const role = actor.role ?? "Founder";
  if (action === "business-authority" && !hasBusinessAuthority(role)) {
    throw new AdminCoreError(
      "BUSINESS_AUTHORITY_REQUIRED",
      "Administrator access does not grant authority to approve proof scope or customer-facing claims.",
      403,
    );
  }
  if (action === "administration" && !hasAdministrationAuthority(role)) {
    throw new AdminCoreError(
      "ADMINISTRATION_AUTHORITY_REQUIRED",
      "This action requires Founder or Administrator authority.",
      403,
    );
  }
}

export function requireAdministrationAuthority(actor: CoreActor): void {
  requireRole(actor, "administration");
}

function requireAssignedBusinessRecord(
  actor: CoreActor,
  assignedOperator: string | null,
): void {
  requireRole(actor, "business-authority");
  if (
    (actor.role ?? "Founder") === "Delegated Operator" &&
    !isSameOperator(assignedOperator, actor.actor)
  ) {
    throw new AdminCoreError(
      "RECORD_ASSIGNMENT_REQUIRED",
      "Delegated operators may change only records assigned to them.",
      403,
    );
  }
}

function requireDeliveryAssignment(
  state: CoreState,
  delivery: DeliveryRecord,
  actor: CoreActor,
): ProofRunRecord {
  const run = state.proofRuns.find((candidate) => candidate.id === delivery.proofRunId);
  if (!run) throw new AdminCoreError("STORE_CORRUPT", "Delivery proof run is missing.", 500);
  requireAssignedBusinessRecord(actor, run.owner);
  return run;
}

function linkedInboxOwner(state: CoreState, item: InboxItemRecord): string | null {
  if (!item.reviewRequestId) return null;
  const request = state.reviewRequests.find(
    (candidate) => candidate.id === item.reviewRequestId,
  );
  if (!request) {
    throw new AdminCoreError("STORE_CORRUPT", "Linked review request is missing.", 500);
  }
  return request.owner;
}

function requireInboxAssignment(
  state: CoreState,
  item: InboxItemRecord,
  actor: CoreActor,
): void {
  const owner = linkedInboxOwner(state, item);
  if (!owner && (actor.role ?? "Founder") === "Delegated Operator") {
    throw new AdminCoreError(
      "RECORD_ASSIGNMENT_REQUIRED",
      "This inbox item has not been assigned to the delegated operator.",
      403,
    );
  }
  requireAssignedBusinessRecord(actor, owner);
}

function requireTransition<T extends string>(
  recordType: string,
  current: T,
  next: T,
  transitions: Record<T, readonly T[]>,
): void {
  if (!transitions[current].includes(next)) {
    throw new AdminCoreError(
      "INVALID_TRANSITION",
      `Cannot transition ${recordType} from ${current} to ${next}.`,
      409,
      { recordType, current, next },
    );
  }
}

function snapshotProduct(product: ProductContractVersionRecord): ProductContractSnapshot {
  return {
    productId: product.productId,
    productName: product.productName,
    contractVersion: product.contractVersion,
    scope: product.scope,
    boundaries: [...product.boundaries],
    expectedInputs: [...product.expectedInputs],
    expectedOutputs: [...product.expectedOutputs],
    evidenceClasses: [...product.evidenceClasses],
    verificationPath: product.verificationPath,
    deliveryRequirements: [...product.deliveryRequirements],
    receiptRequirements: [...product.receiptRequirements],
    responsibleOperator: product.responsibleOperator,
    commercialTerms: product.commercialTerms,
  };
}

export function getAdminCoreStorePath(): string {
  return coreStoreFile();
}

export async function resetAdminCoreStoreForTests(): Promise<void> {
  await rm(coreStoreFile(), { force: true });
}

export async function getAdminCoreState(actor?: CoreActor): Promise<CoreState> {
  const state = await readState();
  return clone(actor ? filterStateForActor(state, actor) : state);
}

export async function listInboxItems(actor?: CoreActor): Promise<InboxItemRecord[]> {
  return clone((actor ? filterStateForActor(await readState(), actor) : await readState()).inboxItems.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
}

export async function getInboxItem(idValue: string, actor?: CoreActor): Promise<InboxItemRecord | null> {
  const state = actor ? filterStateForActor(await readState(), actor) : await readState();
  return clone(state.inboxItems.find((item) => item.id === idValue) ?? null);
}

export async function listCustomers(actor?: CoreActor): Promise<CustomerRecord[]> {
  return clone((actor ? filterStateForActor(await readState(), actor) : await readState()).customers.sort((a, b) => a.name.localeCompare(b.name)));
}

export async function getCustomer(idValue: string, actor?: CoreActor): Promise<CustomerRecord | null> {
  const state = actor ? filterStateForActor(await readState(), actor) : await readState();
  return clone(state.customers.find((item) => item.id === idValue) ?? null);
}

export async function listProductContracts(actor?: CoreActor): Promise<ProductContractVersionRecord[]> {
  const state = actor ? filterStateForActor(await readState(), actor) : await readState();
  return clone(state.productContracts.sort((a, b) => a.productName.localeCompare(b.productName)));
}

export async function listProductContractChoicesForReview(
  reviewRequestId: string,
  actor: CoreActor,
): Promise<Array<Pick<ProductContractVersionRecord, "id" | "productName" | "contractVersion">>> {
  const state = await readState();
  const request = state.reviewRequests.find(
    (candidate) => candidate.id === reviewRequestId,
  );
  if (!request) {
    throw new AdminCoreError("NOT_FOUND", "Review request not found.", 404);
  }
  requireAssignedBusinessRecord(actor, request.owner);
  return clone(
    state.productContracts
      .filter((product) => product.status === "current")
      .map(({ id: contractId, productName, contractVersion }) => ({
        id: contractId,
        productName,
        contractVersion,
      }))
      .sort((a, b) => a.productName.localeCompare(b.productName)),
  );
}

export async function getProductContract(idValue: string, actor?: CoreActor): Promise<ProductContractVersionRecord | null> {
  const state = actor ? filterStateForActor(await readState(), actor) : await readState();
  return clone(state.productContracts.find((item) => item.id === idValue) ?? null);
}

export async function listReviewRequests(actor?: CoreActor): Promise<ReviewRequestRecord[]> {
  return clone((actor ? filterStateForActor(await readState(), actor) : await readState()).reviewRequests.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
}

export async function getReviewRequest(idValue: string, actor?: CoreActor): Promise<ReviewRequestRecord | null> {
  const state = actor ? filterStateForActor(await readState(), actor) : await readState();
  return clone(state.reviewRequests.find((item) => item.id === idValue) ?? null);
}

export async function listProofRuns(actor?: CoreActor): Promise<ProofRunRecord[]> {
  return clone((actor ? filterStateForActor(await readState(), actor) : await readState()).proofRuns.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
}

export async function getProofRun(idValue: string, actor?: CoreActor): Promise<ProofRunRecord | null> {
  const state = actor ? filterStateForActor(await readState(), actor) : await readState();
  return clone(state.proofRuns.find((item) => item.id === idValue) ?? null);
}

export async function listDeliveries(actor?: CoreActor): Promise<DeliveryRecord[]> {
  return clone((actor ? filterStateForActor(await readState(), actor) : await readState()).deliveries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
}

export async function getDelivery(idValue: string, actor?: CoreActor): Promise<DeliveryRecord | null> {
  const state = actor ? filterStateForActor(await readState(), actor) : await readState();
  return clone(state.deliveries.find((item) => item.id === idValue) ?? null);
}

export async function getDeliverySendReservationStatus(
  deliveryId: string,
  actor: CoreActor,
): Promise<DeliverySendReservationStatus | null> {
  const state = await readState();
  const delivery = state.deliveries.find(
    (candidate) => candidate.id === deliveryId,
  );
  if (!delivery) {
    throw new AdminCoreError("NOT_FOUND", "Delivery not found.", 404);
  }
  requireDeliveryAssignment(state, delivery, actor);
  const reservation = state.deliverySendReservations[deliveryId];
  if (!reservation) return null;
  return clone({
    status: reservation.status,
    reservedAt: reservation.reservedAt,
    completedAt: reservation.completedAt,
  });
}

export async function listReceiptRecords(actor?: CoreActor): Promise<ReceiptRecord[]> {
  return clone((actor ? filterStateForActor(await readState(), actor) : await readState()).receipts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
}

export async function getReceiptRecord(idValue: string, actor?: CoreActor): Promise<ReceiptRecord | null> {
  const state = actor ? filterStateForActor(await readState(), actor) : await readState();
  return clone(state.receipts.find((item) => item.id === idValue || item.receiptId === idValue) ?? null);
}

export async function listAuditEvents(lineageId?: string, actor?: CoreActor): Promise<AuditEventRecord[]> {
  const state = actor ? filterStateForActor(await readState(), actor) : await readState();
  const events = state.auditEvents;
  return clone(lineageId ? events.filter((event) => event.lineageId === lineageId) : events);
}

export async function listGmailSyncReceipts(limit = 20, actor?: CoreActor): Promise<GmailSyncReceipt[]> {
  const state = actor ? filterStateForActor(await readState(), actor) : await readState();
  const receipts = state.gmailSyncReceipts;
  return clone([...receipts].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, limit));
}

export async function getGmailSyncReceipt(syncRunId: string): Promise<GmailSyncReceipt | null> {
  const receipt = (await readState()).gmailSyncReceipts.find((candidate) => candidate.syncRunId === syncRunId);
  return clone(receipt ?? null);
}

export async function getGmailSyncReceiptByIdempotency(idempotencyKey: string): Promise<GmailSyncReceipt | null> {
  const receipt = (await readState()).gmailSyncReceipts.find((candidate) => candidate.idempotencyKey === idempotencyKey);
  return clone(receipt ?? null);
}

export interface GmailInboxImport {
  gmailMessageId: string;
  gmailThreadId: string;
  sender: string;
  recipients: string[];
  subject: string;
  receivedAt: string;
  excerpt: string;
  gmailLabels?: string[];
  attachments?: Array<{
    attachmentId: string;
    filename: string;
    mimeType: string;
    sizeBytes?: number | null;
    driveFileId?: string | null;
  }>;
}

function isSecurityGmailInput(input: GmailInboxImport): boolean {
  return [input.sender, ...input.recipients].some((value) => value.toLowerCase().split(/[^a-z0-9@.+_-]+/).includes(SECURITY_DISCLOSURE_EMAIL));
}

function mergedGmailAttachments(
  existing: GmailAttachmentMetadata[] | undefined,
  incoming: GmailInboxImport["attachments"],
): GmailAttachmentMetadata[] {
  const prior = new Map((existing ?? []).map((attachment) => [attachment.attachmentId, attachment]));
  return (incoming ?? []).map((attachment) => {
    const previous = prior.get(attachment.attachmentId);
    return {
      attachmentId: assertNonEmpty(attachment.attachmentId, "attachmentId"),
      filename: assertNonEmpty(attachment.filename, "attachment.filename"),
      mimeType: assertNonEmpty(attachment.mimeType, "attachment.mimeType"),
      sizeBytes: attachment.sizeBytes ?? null,
      reviewed: previous?.reviewed ?? false,
      classification: previous?.classification ?? null,
      driveFileId: attachment.driveFileId ?? previous?.driveFileId ?? null,
    };
  });
}

function buildInboxItemFromGmail(
  input: GmailInboxImport,
  isSecurity: boolean,
  now: string,
): InboxItemRecord {
  const messageId = assertNonEmpty(input.gmailMessageId, "gmailMessageId");
  return {
    id: id("inbox"),
    state: isSecurity ? "security-routed" : "new",
    source: "gmail",
    gmailMessageId: messageId,
    gmailThreadId: assertNonEmpty(input.gmailThreadId, "gmailThreadId"),
    sender: assertNonEmpty(input.sender, "sender"),
    recipients: [...input.recipients],
    subject: assertNonEmpty(input.subject, "subject"),
    receivedAt: assertNonEmpty(input.receivedAt, "receivedAt"),
    excerpt: input.excerpt.trim(),
    gmailLabels: [...(input.gmailLabels ?? [])],
    attachments: mergedGmailAttachments([], input.attachments),
    securityRouteReason: isSecurity ? "Contains security@witnessops.com route." : null,
    reviewRequestId: null,
    lineageId: id("lineage"),
    createdAt: now,
    updatedAt: now,
  };
}

function updateInboxItemFromGmail(item: InboxItemRecord, input: GmailInboxImport, isSecurity: boolean, now: string): boolean {
  const nextAttachments = mergedGmailAttachments(item.attachments, input.attachments);
  const before = JSON.stringify({
    sender: item.sender,
    recipients: item.recipients,
    subject: item.subject,
    receivedAt: item.receivedAt,
    excerpt: item.excerpt,
    gmailLabels: item.gmailLabels,
    attachments: item.attachments,
    securityRouteReason: item.securityRouteReason,
  });
  item.sender = assertNonEmpty(input.sender, "sender");
  item.recipients = [...input.recipients];
  item.subject = assertNonEmpty(input.subject, "subject");
  item.receivedAt = assertNonEmpty(input.receivedAt, "receivedAt");
  item.excerpt = input.excerpt.trim();
  item.gmailLabels = [...(input.gmailLabels ?? [])];
  item.attachments = nextAttachments;
  if (isSecurity && !item.reviewRequestId) {
    item.state = "security-routed";
    item.securityRouteReason = "Contains security@witnessops.com route.";
  }
  const after = JSON.stringify({
    sender: item.sender,
    recipients: item.recipients,
    subject: item.subject,
    receivedAt: item.receivedAt,
    excerpt: item.excerpt,
    gmailLabels: item.gmailLabels,
    attachments: item.attachments,
    securityRouteReason: item.securityRouteReason,
  });
  const changed = before !== after;
  if (changed) item.updatedAt = now;
  return changed;
}

function syncStatus(input: GmailSyncReconciliationInput): GmailSyncReceipt["status"] {
  if (input.status) return input.status;
  return input.failures.length > 0 || input.labelOperations.some((operation) => operation.outcome === "failed")
    ? "partial"
    : "completed";
}

export async function reconcileGmailInbox(
  input: GmailSyncReconciliationInput,
  actor: CoreActor,
): Promise<{ receipt: GmailSyncReceipt; idempotent: boolean }> {
  requireRole(actor, "administration");
  return mutateState((state) => {
    const prior = state.gmailSyncReceipts.find((receipt) => receipt.idempotencyKey === input.idempotencyKey);
    if (prior) return { receipt: clone(prior), idempotent: true };

    const createdInboxItemIds: string[] = [];
    const updatedInboxItemIds: string[] = [];
    const skippedInboxItemIds: string[] = [];
    const excludedSecurityMessageIds: string[] = [];
    const excludedInboxItemIds: string[] = [];
    const messageIdsInspected = new Set(input.inspectedMessageIds ?? []);
    const threadIdsInspected = new Set(input.inspectedThreadIds ?? []);
    const itemByMessageId = new Map<string, InboxItemRecord>();
    const now = input.completedAt;

    for (const message of input.messages) {
      const messageId = assertNonEmpty(message.gmailMessageId, "gmailMessageId");
      const threadId = assertNonEmpty(message.gmailThreadId, "gmailThreadId");
      messageIdsInspected.add(messageId);
      threadIdsInspected.add(threadId);
      const isSecurity = isSecurityGmailInput(message);
      let item = state.inboxItems.find((candidate) => candidate.gmailMessageId === messageId);
      const wasNew = !item;
      if (!item) {
        item = buildInboxItemFromGmail(message, isSecurity, now);
        state.inboxItems.push(item);
      } else {
        const changed = updateInboxItemFromGmail(item, message, isSecurity, now);
        if (isSecurity) excludedSecurityMessageIds.push(messageId);
        else if (changed) updatedInboxItemIds.push(item.id);
        else skippedInboxItemIds.push(item.id);
      }
      itemByMessageId.set(messageId, item);
      if (isSecurity) {
        excludedSecurityMessageIds.push(...(wasNew ? [messageId] : []));
        excludedInboxItemIds.push(item.id);
      } else if (wasNew) {
        createdInboxItemIds.push(item.id);
      }
      if (wasNew) {
        appendIntegration(state, {
          integration: "gmail",
          operation: "sync_message_metadata",
          idempotencyKey: `gmail-sync-message:${input.syncRunId}:${messageId}`,
          status: "succeeded",
          completedAt: now,
          externalId: messageId,
          error: null,
        });
        appendAudit(state, {
          recordType: "inbox_item",
          recordId: item.id,
          action: isSecurity ? "security_route" : "sync_import",
          actor: actor.actor,
          previousState: null,
          resultingState: item.state,
          integrationResult: "gmail metadata retained by reference",
          linkedExternalIds: [messageId, threadId],
          failureDetails: null,
          lineageId: item.lineageId,
        });
      } else if (!isSecurity && updatedInboxItemIds.includes(item.id)) {
        appendAudit(state, {
          recordType: "inbox_item",
          recordId: item.id,
          action: "sync_update_metadata",
          actor: actor.actor,
          previousState: item.state,
          resultingState: item.state,
          integrationResult: "gmail metadata refreshed by reference",
          linkedExternalIds: [messageId, threadId],
          failureDetails: null,
          lineageId: item.lineageId,
        });
      }
    }

    for (const operation of input.labelOperations) {
      const item = itemByMessageId.get(operation.messageId);
      if (!item) continue;
      if (operation.outcome !== "failed" && operation.labelId && !item.gmailLabels.includes(operation.labelId)) {
        item.gmailLabels.push(operation.labelId);
        item.updatedAt = now;
      }
      appendIntegration(state, {
        integration: "gmail",
        operation: "apply_lifecycle_label",
        idempotencyKey: operation.idempotencyKey,
        status: operation.outcome === "failed" ? "failed" : "succeeded",
        completedAt: now,
        externalId: operation.messageId,
        error: operation.error,
      });
      appendAudit(state, {
        recordType: "inbox_item",
        recordId: item.id,
        action: operation.outcome === "failed" ? "gmail_label_failed" : "gmail_label_applied",
        actor: actor.actor,
        previousState: item.state,
        resultingState: item.state,
        integrationResult: `${operation.outcome}:${operation.labelName}`,
        linkedExternalIds: [operation.messageId, ...(operation.labelId ? [operation.labelId] : [])],
        failureDetails: operation.error,
        lineageId: item.lineageId,
      });
    }

    const labelFailures = input.labelOperations.filter((operation) => operation.outcome === "failed").length;
    const receipt: GmailSyncReceipt = {
      syncRunId: assertNonEmpty(input.syncRunId, "syncRunId"),
      account: assertNonEmpty(input.account, "account"),
      startedAt: assertNonEmpty(input.startedAt, "startedAt"),
      completedAt: assertNonEmpty(input.completedAt, "completedAt"),
      query: assertNonEmpty(input.query, "query"),
      status: syncStatus(input),
      messageIdsInspected: [...messageIdsInspected],
      threadIdsInspected: [...threadIdsInspected],
      createdInboxItemIds,
      updatedInboxItemIds,
      skippedInboxItemIds,
      excludedSecurityMessageIds: [...new Set(excludedSecurityMessageIds)],
      excludedInboxItemIds: [...new Set(excludedInboxItemIds)],
      resultingInternalRecordIds: [...new Set([...createdInboxItemIds, ...updatedInboxItemIds, ...skippedInboxItemIds, ...excludedInboxItemIds])],
      labelOperations: clone(input.labelOperations),
      failures: clone(input.failures),
      counts: {
        threadsInspected: threadIdsInspected.size,
        messagesInspected: messageIdsInspected.size,
        inboxItemsCreated: createdInboxItemIds.length,
        existingItemsUpdated: updatedInboxItemIds.length,
        noOp: skippedInboxItemIds.length,
        securityMessagesExcluded: new Set(excludedSecurityMessageIds).size,
        labelFailures,
      },
      idempotencyKey: assertNonEmpty(input.idempotencyKey, "idempotencyKey"),
    };
    state.gmailSyncReceipts.push(receipt);
    return { receipt: clone(receipt), idempotent: false };
  });
}

export async function recordGmailSyncFailure(
  input: Omit<GmailSyncReconciliationInput, "messages" | "labelOperations"> & { messages?: GmailInboxImport[]; labelOperations?: GmailSyncLabelOperation[] },
  actor: CoreActor,
): Promise<{ receipt: GmailSyncReceipt; idempotent: boolean }> {
  return reconcileGmailInbox({
    ...input,
    messages: input.messages ?? [],
    labelOperations: input.labelOperations ?? [],
    status: "failed",
  }, actor);
}

export async function importGmailInboxItem(
  input: GmailInboxImport,
  actor: CoreActor,
): Promise<{ item: InboxItemRecord; created: boolean }> {
  requireRole(actor, "administration");
  const messageId = assertNonEmpty(input.gmailMessageId, "gmailMessageId");
  const threadId = assertNonEmpty(input.gmailThreadId, "gmailThreadId");
  const sender = assertNonEmpty(input.sender, "sender");
  const subject = assertNonEmpty(input.subject, "subject");
  return mutateState((state) => {
    const existing = state.inboxItems.find((item) => item.gmailMessageId === messageId);
    if (existing) return { item: clone(existing), created: false };

    const allAddresses = [sender, ...(input.recipients ?? [])].map(normalizeEmail);
    const isSecurity = allAddresses.includes(SECURITY_DISCLOSURE_EMAIL);
    const lineageId = id("lineage");
    const now = isoNow();
    const item: InboxItemRecord = {
      id: id("inbox"),
      state: isSecurity ? "security-routed" : "new",
      source: "gmail",
      gmailMessageId: messageId,
      gmailThreadId: threadId,
      sender,
      recipients: [...(input.recipients ?? [])],
      subject,
      receivedAt: assertNonEmpty(input.receivedAt, "receivedAt"),
      excerpt: input.excerpt.trim(),
      gmailLabels: [...(input.gmailLabels ?? [])],
      attachments: (input.attachments ?? []).map((attachment) => ({
        attachmentId: assertNonEmpty(attachment.attachmentId, "attachmentId"),
        filename: assertNonEmpty(attachment.filename, "attachment.filename"),
        mimeType: assertNonEmpty(attachment.mimeType, "attachment.mimeType"),
        sizeBytes: attachment.sizeBytes ?? null,
        reviewed: false,
        classification: null,
        driveFileId: attachment.driveFileId ?? null,
      })),
      securityRouteReason: isSecurity ? "Contains security@witnessops.com route." : null,
      reviewRequestId: null,
      lineageId,
      createdAt: now,
      updatedAt: now,
    };
    state.inboxItems.push(item);
    appendIntegration(state, {
      integration: "gmail",
      operation: "import_message_metadata",
      idempotencyKey: `gmail-message:${messageId}`,
      status: "succeeded",
      completedAt: now,
      externalId: messageId,
      error: null,
    });
    appendAudit(state, {
      recordType: "inbox_item",
      recordId: item.id,
      action: isSecurity ? "security_route" : "import",
      actor: actor.actor,
      previousState: null,
      resultingState: item.state,
      integrationResult: "gmail metadata retained by reference",
      linkedExternalIds: [messageId, threadId],
      failureDetails: null,
      lineageId,
    });
    return { item: clone(item), created: true };
  });
}

export async function classifyInboxAttachment(
  inboxItemId: string,
  attachmentId: string,
  classification: AttachmentClassification,
  actor: CoreActor,
): Promise<InboxItemRecord> {
  return mutateState((state) => {
    const item = state.inboxItems.find((candidate) => candidate.id === inboxItemId);
    if (!item) throw new AdminCoreError("NOT_FOUND", "Inbox item not found.", 404);
    requireInboxAssignment(state, item, actor);
    const attachment = item.attachments.find((candidate) => candidate.attachmentId === attachmentId);
    if (!attachment) throw new AdminCoreError("NOT_FOUND", "Attachment not found.", 404);
    attachment.classification = classification;
    attachment.reviewed = true;
    item.state = item.state === "new" ? "reviewed" : item.state;
    item.updatedAt = isoNow();
    appendAudit(state, {
      recordType: "inbox_item",
      recordId: item.id,
      action: "classify_attachment",
      actor: actor.actor,
      previousState: null,
      resultingState: item.state,
      integrationResult: "attachment remains untrusted until explicitly classified",
      linkedExternalIds: [attachmentId],
      failureDetails: null,
      lineageId: item.lineageId,
    });
    return clone(item);
  });
}

export async function recordGmailLabelSync(
  inboxItemId: string,
  labels: string[],
  result: { status: "succeeded" | "failed" | "retryable"; error?: string | null },
  actor: CoreActor,
): Promise<InboxItemRecord> {
  return mutateState((state) => {
    const item = state.inboxItems.find((candidate) => candidate.id === inboxItemId);
    if (!item) throw new AdminCoreError("NOT_FOUND", "Inbox item not found.", 404);
    requireInboxAssignment(state, item, actor);
    const now = isoNow();
    appendIntegration(state, {
      integration: "gmail",
      operation: "apply_labels",
      idempotencyKey: `gmail-labels:${item.gmailMessageId}:${labels.join(",")}`,
      status: result.status,
      completedAt: now,
      externalId: item.gmailMessageId,
      error: result.error ?? null,
    });
    if (result.status === "succeeded") {
      item.gmailLabels = [...labels];
      item.updatedAt = now;
    }
    appendAudit(state, {
      recordType: "inbox_item",
      recordId: item.id,
      action: "gmail_label_sync",
      actor: actor.actor,
      previousState: item.state,
      resultingState: item.state,
      integrationResult: result.status,
      linkedExternalIds: [item.gmailMessageId],
      failureDetails: result.error ?? null,
      lineageId: item.lineageId,
    });
    return clone(item);
  });
}

export interface ConvertInboxResult {
  reviewRequest: ReviewRequestRecord;
  customer: CustomerRecord;
  created: boolean;
}

export async function convertInboxItemToReviewRequest(
  inboxItemId: string,
  actor: CoreActor,
  idempotencyKey = `convert:${inboxItemId}`,
): Promise<ConvertInboxResult> {
  requireRole(actor, "business-authority");
  return mutateState((state) => {
    const item = state.inboxItems.find((candidate) => candidate.id === inboxItemId);
    if (!item) throw new AdminCoreError("NOT_FOUND", "Inbox item not found.", 404);
    if (item.state === "security-routed") {
      throw new AdminCoreError("SECURITY_ROUTE", "Security disclosure messages remain outside the review-request lifecycle.", 409);
    }
    if (item.reviewRequestId) {
      const existing = state.reviewRequests.find((request) => request.id === item.reviewRequestId);
      const customer = existing ? state.customers.find((candidate) => candidate.id === existing.customerId) : null;
      if (!existing || !customer) throw new AdminCoreError("STORE_CORRUPT", "Linked review request is incomplete.", 500);
      requireAssignedBusinessRecord(actor, existing.owner);
      return { reviewRequest: clone(existing), customer: clone(customer), created: false };
    }
    const existingIdempotency = state.idempotency[idempotencyKey];
    if (existingIdempotency) {
      const existing = state.reviewRequests.find((request) => request.id === existingIdempotency.recordId);
      const customer = existing ? state.customers.find((candidate) => candidate.id === existing.customerId) : null;
      if (existing && customer) {
        requireAssignedBusinessRecord(actor, existing.owner);
        return { reviewRequest: clone(existing), customer: clone(customer), created: false };
      }
    }

    const email = extractEmail(item.sender);
    let customer = state.customers.find((candidate) => candidate.email === email);
    const now = isoNow();
    if (!customer) {
      customer = {
        id: id("cust"),
        name: item.sender.split("<")[0]?.trim() || email,
        email,
        organization: null,
        notes: "Created from Gmail-originated review request.",
        owner: actor.actor,
        createdAt: now,
        updatedAt: now,
      };
      state.customers.push(customer);
      appendAudit(state, {
        recordType: "customer",
        recordId: customer.id,
        action: "create_minimal_customer",
        actor: actor.actor,
        previousState: null,
        resultingState: "active",
        integrationResult: null,
        linkedExternalIds: [item.gmailMessageId],
        failureDetails: null,
        lineageId: item.lineageId,
      });
    }
    const request: ReviewRequestRecord = {
      id: id("rr"),
      state: "new",
      lineageId: item.lineageId,
      inboxItemId: item.id,
      customerId: customer.id,
      originatingGmailThreadId: item.gmailThreadId,
      requestText: item.excerpt || item.subject,
      proposedProductId: null,
      scope: "To be confirmed by operator.",
      workflowBoundary: "WitnessOps performs only the bounded work approved in the product contract.",
      authorityBoundary: "No execution authority is implied by receiving or reviewing this message.",
      desiredOutcome: "Operator review and a bounded proof-backed delivery.",
      timing: "Not specified.",
      evidencePosture: "Attachments are unreviewed until classified; no attachment is automatically evidence.",
      missingInformation: [],
      commercialStatus: "unconfirmed",
      nextAction: "Triage the request and confirm fit.",
      owner: actor.actor,
      internalNotes: [],
      customerReplyDrafts: [],
      productContractVersionId: null,
      proofRunId: null,
      createdAt: now,
      updatedAt: now,
    };
    state.reviewRequests.push(request);
    item.reviewRequestId = request.id;
    item.state = "linked";
    item.updatedAt = now;
    state.idempotency[idempotencyKey] = { recordType: "review_request", recordId: request.id };
    appendAudit(state, {
      recordType: "review_request",
      recordId: request.id,
      action: "convert_inbox_item",
      actor: actor.actor,
      previousState: null,
      resultingState: request.state,
      integrationResult: null,
      linkedExternalIds: [item.gmailMessageId, item.gmailThreadId],
      failureDetails: null,
      lineageId: item.lineageId,
    });
    appendAudit(state, {
      recordType: "inbox_item",
      recordId: item.id,
      action: "link_review_request",
      actor: actor.actor,
      previousState: "new",
      resultingState: item.state,
      integrationResult: null,
      linkedExternalIds: [request.id],
      failureDetails: null,
      lineageId: item.lineageId,
    });
    return { reviewRequest: clone(request), customer: clone(customer), created: true };
  });
}

export async function transitionReviewRequest(
  reviewRequestId: string,
  nextState: ReviewRequestState,
  actor: CoreActor,
): Promise<ReviewRequestRecord> {
  requireRole(actor, "business-authority");
  return mutateState((state) => {
    const request = state.reviewRequests.find((candidate) => candidate.id === reviewRequestId);
    if (!request) throw new AdminCoreError("NOT_FOUND", "Review request not found.", 404);
    requireAssignedBusinessRecord(actor, request.owner);
    requireTransition("review_request", request.state, nextState, reviewTransitions);
    const previous = request.state;
    request.state = nextState;
    request.updatedAt = isoNow();
    request.nextAction = nextState === "fit_confirmed"
      ? "Approve the selected immutable product contract version."
      : nextState === "approved_for_proof_run"
        ? "Create the pinned proof run."
        : request.nextAction;
    appendAudit(state, {
      recordType: "review_request",
      recordId: request.id,
      action: "transition",
      actor: actor.actor,
      previousState: previous,
      resultingState: nextState,
      integrationResult: null,
      linkedExternalIds: [request.originatingGmailThreadId],
      failureDetails: null,
      lineageId: request.lineageId,
    });
    return clone(request);
  });
}

export async function approveReviewRequest(
  reviewRequestId: string,
  productContractVersionId: string,
  actor: CoreActor,
): Promise<ReviewRequestRecord> {
  requireRole(actor, "business-authority");
  return mutateState((state) => {
    const request = state.reviewRequests.find((candidate) => candidate.id === reviewRequestId);
    if (!request) throw new AdminCoreError("NOT_FOUND", "Review request not found.", 404);
    requireAssignedBusinessRecord(actor, request.owner);
    const product = state.productContracts.find((candidate) => candidate.id === productContractVersionId);
    if (!product) throw new AdminCoreError("NOT_FOUND", "Product contract version not found.", 404);
    if (product.status !== "current") {
      throw new AdminCoreError(
        "PRODUCT_CONTRACT_RETIRED",
        "A retired product contract cannot be approved for a new proof run.",
        409,
      );
    }
    requireTransition("review_request", request.state, "approved_for_proof_run", reviewTransitions);
    const previous = request.state;
    request.productContractVersionId = product.id;
    request.state = "approved_for_proof_run";
    request.nextAction = "Create the pinned proof run.";
    request.updatedAt = isoNow();
    appendAudit(state, {
      recordType: "review_request",
      recordId: request.id,
      action: "approve_product_contract",
      actor: actor.actor,
      previousState: previous,
      resultingState: request.state,
      integrationResult: null,
      linkedExternalIds: [product.id],
      failureDetails: null,
      lineageId: request.lineageId,
    });
    return clone(request);
  });
}

export async function addReviewRequestNote(
  reviewRequestId: string,
  body: string,
  actor: CoreActor,
): Promise<ReviewRequestRecord> {
  const noteBody = assertNonEmpty(body, "note");
  return mutateState((state) => {
    const request = state.reviewRequests.find((candidate) => candidate.id === reviewRequestId);
    if (!request) throw new AdminCoreError("NOT_FOUND", "Review request not found.", 404);
    requireAssignedBusinessRecord(actor, request.owner);
    const prior = request.internalNotes.at(-1);
    const note: VersionedNote = {
      noteId: id("note"),
      body: noteBody,
      author: actor.actor,
      createdAt: isoNow(),
      supersedesNoteId: prior?.noteId ?? null,
    };
    request.internalNotes.push(note);
    request.updatedAt = note.createdAt;
    appendAudit(state, {
      recordType: "review_request",
      recordId: request.id,
      action: "append_internal_note",
      actor: actor.actor,
      previousState: null,
      resultingState: request.state,
      integrationResult: null,
      linkedExternalIds: [note.noteId, ...(prior ? [prior.noteId] : [])],
      failureDetails: null,
      lineageId: request.lineageId,
    });
    return clone(request);
  });
}

export async function updateCustomer(
  customerId: string,
  patch: Partial<Pick<CustomerRecord, "name" | "organization" | "notes" | "owner">>,
  actor: CoreActor,
): Promise<CustomerRecord> {
  requireRole(actor, "business-authority");
  return mutateState((state) => {
    const customer = state.customers.find((candidate) => candidate.id === customerId);
    if (!customer) throw new AdminCoreError("NOT_FOUND", "Customer not found.", 404);
    requireAssignedBusinessRecord(actor, customer.owner);
    if (
      (actor.role ?? "Founder") === "Delegated Operator" &&
      patch.owner !== undefined &&
      !isSameOperator(patch.owner, actor.actor)
    ) {
      throw new AdminCoreError(
        "ASSIGNMENT_CHANGE_NOT_ALLOWED",
        "Delegated operators cannot reassign customer ownership.",
        403,
      );
    }
    if (patch.name !== undefined) customer.name = assertNonEmpty(patch.name, "name");
    if (patch.organization !== undefined) customer.organization = patch.organization?.trim() || null;
    if (patch.notes !== undefined) customer.notes = patch.notes.trim();
    if (patch.owner !== undefined) customer.owner = patch.owner?.trim() || null;
    customer.updatedAt = isoNow();
    appendAudit(state, {
      recordType: "customer",
      recordId: customer.id,
      action: "update_minimal_record",
      actor: actor.actor,
      previousState: null,
      resultingState: "active",
      integrationResult: null,
      linkedExternalIds: [],
      failureDetails: null,
      lineageId: null,
    });
    return clone(customer);
  });
}

export async function createProductContractVersion(
  input: Omit<ProductContractVersionRecord, "id" | "createdAt" | "updatedAt" | "status"> & { status?: ProductContractVersionRecord["status"] },
  actor: CoreActor,
): Promise<ProductContractVersionRecord> {
  requireRole(actor, "administration");
  return mutateState((state) => {
    const now = isoNow();
    const product: ProductContractVersionRecord = {
      ...input,
      id: id("pcv"),
      status: input.status ?? "current",
      createdAt: now,
      updatedAt: now,
      boundaries: [...input.boundaries],
      expectedInputs: [...input.expectedInputs],
      expectedOutputs: [...input.expectedOutputs],
      evidenceClasses: [...input.evidenceClasses],
      deliveryRequirements: [...input.deliveryRequirements],
      receiptRequirements: [...input.receiptRequirements],
    };
    state.productContracts.push(product);
    appendAudit(state, {
      recordType: "product_contract_version",
      recordId: product.id,
      action: "create_immutable_version",
      actor: actor.actor,
      previousState: null,
      resultingState: product.status,
      integrationResult: null,
      linkedExternalIds: [product.productId],
      failureDetails: null,
      lineageId: null,
    });
    return clone(product);
  });
}

export async function createProofRunForRequest(
  reviewRequestId: string,
  productContractVersionId: string,
  actor: CoreActor,
  idempotencyKey = `proof-run:${reviewRequestId}`,
): Promise<ProofRunRecord> {
  requireRole(actor, "business-authority");
  return mutateState((state) => {
    const request = state.reviewRequests.find((candidate) => candidate.id === reviewRequestId);
    if (!request) throw new AdminCoreError("NOT_FOUND", "Review request not found.", 404);
    requireAssignedBusinessRecord(actor, request.owner);
    const existingIdempotency = state.idempotency[idempotencyKey];
    if (existingIdempotency) {
      const existing = state.proofRuns.find((run) => run.id === existingIdempotency.recordId);
      if (existing) {
        requireAssignedBusinessRecord(actor, existing.owner);
        return clone(existing);
      }
    }
    const product = state.productContracts.find((candidate) => candidate.id === productContractVersionId);
    if (!product) throw new AdminCoreError("NOT_FOUND", "Product contract version not found.", 404);
    if (request.state !== "approved_for_proof_run") {
      throw new AdminCoreError("INVALID_TRANSITION", "A proof run requires review request state approved_for_proof_run.", 409);
    }
    if (request.proofRunId) {
      const existing = state.proofRuns.find((run) => run.id === request.proofRunId);
      if (existing) return clone(existing);
    }
    const now = isoNow();
    const snapshot = snapshotProduct(product);
    const proofRun: ProofRunRecord = {
      id: id("proof"),
      state: "planned",
      evidenceState: "not_started",
      lineageId: request.lineageId,
      reviewRequestId: request.id,
      customerId: request.customerId,
      productContractVersionId: product.id,
      productContractSnapshot: snapshot,
      owner: actor.actor,
      nextAction: "Confirm scope and mark the run ready.",
      scopeComplete: false,
      requiredOutputs: [...snapshot.expectedOutputs],
      outputReferences: [],
      evidenceReferences: [],
      knownGaps: [],
      verificationInstructions: snapshot.verificationPath,
      customerWordingReviewed: false,
      unsupportedClaims: [],
      driveFileIds: [],
      deliveryId: null,
      createdAt: now,
      updatedAt: now,
    };
    state.proofRuns.push(proofRun);
    request.productContractVersionId = product.id;
    request.proofRunId = proofRun.id;
    request.state = "converted_to_proof_run";
    request.updatedAt = now;
    state.idempotency[idempotencyKey] = { recordType: "proof_run", recordId: proofRun.id };
    appendAudit(state, {
      recordType: "proof_run",
      recordId: proofRun.id,
      action: "create_with_pinned_product_contract",
      actor: actor.actor,
      previousState: null,
      resultingState: proofRun.state,
      integrationResult: null,
      linkedExternalIds: [request.id, product.id],
      failureDetails: null,
      lineageId: request.lineageId,
    });
    appendAudit(state, {
      recordType: "review_request",
      recordId: request.id,
      action: "convert_to_proof_run",
      actor: actor.actor,
      previousState: "approved_for_proof_run",
      resultingState: request.state,
      integrationResult: null,
      linkedExternalIds: [proofRun.id, product.id],
      failureDetails: null,
      lineageId: request.lineageId,
    });
    return clone(proofRun);
  });
}

export async function updateProofRun(
  proofRunId: string,
  patch: Partial<Pick<ProofRunRecord, "scopeComplete" | "outputReferences" | "evidenceReferences" | "knownGaps" | "verificationInstructions" | "customerWordingReviewed" | "unsupportedClaims" | "driveFileIds" | "owner" | "nextAction" | "evidenceState">>,
  actor: CoreActor,
): Promise<ProofRunRecord> {
  requireRole(actor, "business-authority");
  return mutateState((state) => {
    const run = state.proofRuns.find((candidate) => candidate.id === proofRunId);
    if (!run) throw new AdminCoreError("NOT_FOUND", "Proof run not found.", 404);
    requireAssignedBusinessRecord(actor, run.owner);
    if (
      (actor.role ?? "Founder") === "Delegated Operator" &&
      patch.owner !== undefined &&
      !isSameOperator(patch.owner, actor.actor)
    ) {
      throw new AdminCoreError(
        "ASSIGNMENT_CHANGE_NOT_ALLOWED",
        "Delegated operators cannot reassign proof-run ownership.",
        403,
      );
    }
    Object.assign(run, Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)));
    run.updatedAt = isoNow();
    appendAudit(state, {
      recordType: "proof_run",
      recordId: run.id,
      action: "update_execution_or_evidence",
      actor: actor.actor,
      previousState: run.state,
      resultingState: run.state,
      integrationResult: null,
      linkedExternalIds: [...run.driveFileIds, ...run.evidenceReferences],
      failureDetails: null,
      lineageId: run.lineageId,
    });
    return clone(run);
  });
}

export async function transitionProofRun(
  proofRunId: string,
  nextState: ProofRunState,
  actor: CoreActor,
): Promise<ProofRunRecord> {
  requireRole(actor, "business-authority");
  return mutateState((state) => {
    const run = state.proofRuns.find((candidate) => candidate.id === proofRunId);
    if (!run) throw new AdminCoreError("NOT_FOUND", "Proof run not found.", 404);
    requireAssignedBusinessRecord(actor, run.owner);
    requireTransition("proof_run", run.state, nextState, proofTransitions);
    if (nextState === "complete") {
      const readiness = buildProofReadinessCheck(run);
      if (readiness.fail.length > 0 || readiness.unresolved.length > 0) {
        throw new AdminCoreError("PROOF_NOT_READY", "Proof run cannot be marked complete while readiness checks fail or remain unresolved.", 409, readiness);
      }
    }
    const previous = run.state;
    run.state = nextState;
    run.nextAction = nextState === "complete" ? "Prepare delivery and link the receipt." : run.nextAction;
    run.updatedAt = isoNow();
    appendAudit(state, {
      recordType: "proof_run",
      recordId: run.id,
      action: "transition",
      actor: actor.actor,
      previousState: previous,
      resultingState: nextState,
      integrationResult: null,
      linkedExternalIds: [run.productContractVersionId],
      failureDetails: null,
      lineageId: run.lineageId,
    });
    return clone(run);
  });
}

export interface ReadinessCheck {
  pass: Array<{ code: string; label: string }>;
  fail: Array<{ code: string; label: string; detail: string }>;
  unresolved: Array<{ code: string; label: string; detail: string }>;
}

export function buildProofReadinessCheck(run: ProofRunRecord): ReadinessCheck {
  const result: ReadinessCheck = { pass: [], fail: [], unresolved: [] };
  const check = (condition: boolean, code: string, label: string, detail: string) => {
    if (condition) result.pass.push({ code, label });
    else result.fail.push({ code, label, detail });
  };
  check(run.scopeComplete, "SCOPE_COMPLETE", "Scope is complete or explicitly bounded", "Mark scope complete or record a bounded exclusion before completion.");
  check(run.requiredOutputs.every((output) => run.outputReferences.includes(output)), "OUTPUTS_PRESENT", "Required outputs exist", "Every required output needs a reference.");
  check(run.evidenceState === "complete" || run.evidenceState === "not_applicable", "EVIDENCE_COMPLETE", "Evidence state is complete", "Evidence remains incomplete.");
  if (run.knownGaps.length > 0) result.unresolved.push({ code: "KNOWN_GAPS", label: "Known gaps are recorded", detail: run.knownGaps.join("; ") });
  else result.pass.push({ code: "NO_UNRECORDED_GAPS", label: "No known gaps remain unrecorded" });
  check(run.verificationInstructions.trim().length > 0, "VERIFICATION_INSTRUCTIONS", "Verification instructions exist", "Add instructions a customer can follow.");
  check(run.customerWordingReviewed, "CUSTOMER_WORDING_REVIEWED", "Customer-facing wording is reviewed", "Review the delivery wording before completion.");
  check(run.unsupportedClaims.length === 0, "NO_UNSUPPORTED_CLAIMS", "No unsupported claims are presented as proven", "Remove or bound unsupported claims.");
  return result;
}

export async function buildProofReadiness(proofRunId: string, actor?: CoreActor): Promise<ReadinessCheck> {
  const run = await getProofRun(proofRunId, actor);
  if (!run) throw new AdminCoreError("NOT_FOUND", "Proof run not found.", 404);
  return buildProofReadinessCheck(run);
}

export async function prepareDelivery(
  proofRunId: string,
  actor: CoreActor,
): Promise<DeliveryRecord> {
  requireRole(actor, "business-authority");
  return mutateState((state) => {
    const run = state.proofRuns.find((candidate) => candidate.id === proofRunId);
    if (!run) throw new AdminCoreError("NOT_FOUND", "Proof run not found.", 404);
    requireAssignedBusinessRecord(actor, run.owner);
    if (run.deliveryId) {
      const existing = state.deliveries.find((delivery) => delivery.id === run.deliveryId);
      if (existing) return clone(existing);
    }
    const customer = state.customers.find((candidate) => candidate.id === run.customerId);
    if (!customer) throw new AdminCoreError("STORE_CORRUPT", "Proof run customer is missing.", 500);
    const now = isoNow();
    const delivery: DeliveryRecord = {
      id: id("delivery"),
      state: "draft",
      lineageId: run.lineageId,
      proofRunId: run.id,
      customerId: customer.id,
      receiptId: null,
      subject: `WitnessOps delivery — ${run.productContractSnapshot.productName}`,
      body: "Delivery draft requires operator review.",
      downloadLinks: [...run.outputReferences],
      verificationInstructions: run.verificationInstructions,
      customerWordingReviewed: run.customerWordingReviewed,
      unsupportedClaims: [...run.unsupportedClaims],
      contentRevision: 1,
      sentContentRevision: null,
      sentContentDigest: null,
      provider: null,
      providerMessageId: null,
      sentAt: null,
      acknowledgedAt: null,
      failure: null,
      createdAt: now,
      updatedAt: now,
    };
    state.deliveries.push(delivery);
    run.deliveryId = delivery.id;
    run.updatedAt = now;
    appendAudit(state, {
      recordType: "delivery",
      recordId: delivery.id,
      action: "prepare_draft",
      actor: actor.actor,
      previousState: null,
      resultingState: delivery.state,
      integrationResult: null,
      linkedExternalIds: [run.id, customer.id],
      failureDetails: null,
      lineageId: run.lineageId,
    });
    return clone(delivery);
  });
}

export async function updateDeliveryDraft(
  deliveryId: string,
  patch: Partial<Pick<DeliveryRecord, "subject" | "body" | "downloadLinks" | "verificationInstructions" | "customerWordingReviewed" | "unsupportedClaims">>,
  actor: CoreActor,
): Promise<DeliveryRecord> {
  requireRole(actor, "business-authority");
  return mutateState((state) => {
    const delivery = state.deliveries.find((candidate) => candidate.id === deliveryId);
    if (!delivery) throw new AdminCoreError("NOT_FOUND", "Delivery not found.", 404);
    requireDeliveryAssignment(state, delivery, actor);
    requireDeliveryContentMutable(state, delivery);
    const previousContentDigest = deliveryContentDigest(
      deliveryContentSnapshot(delivery),
    );
    Object.assign(delivery, Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)));
    const nextContentDigest = deliveryContentDigest(
      deliveryContentSnapshot(delivery),
    );
    if (nextContentDigest !== previousContentDigest) {
      delivery.contentRevision += 1;
    }
    delivery.updatedAt = isoNow();
    appendAudit(state, {
      recordType: "delivery",
      recordId: delivery.id,
      action: "update_draft",
      actor: actor.actor,
      previousState: delivery.state,
      resultingState: delivery.state,
      integrationResult: null,
      linkedExternalIds: [delivery.proofRunId],
      failureDetails: null,
      lineageId: delivery.lineageId,
    });
    return clone(delivery);
  });
}

export async function buildDeliveryReadiness(deliveryId: string, actor?: CoreActor): Promise<ReadinessCheck> {
  const fullState = await readState();
  const state = actor ? filterStateForActor(fullState, actor) : fullState;
  const delivery = state.deliveries.find((candidate) => candidate.id === deliveryId);
  if (!delivery) throw new AdminCoreError("NOT_FOUND", "Delivery not found.", 404);
  const run = state.proofRuns.find((candidate) => candidate.id === delivery.proofRunId);
  const result: ReadinessCheck = { pass: [], fail: [], unresolved: [] };
  if (!run) {
    result.fail.push({ code: "PROOF_RUN_LINK", label: "Proof run is linked", detail: "The delivery has no proof run." });
    return result;
  }
  const proof = buildProofReadinessCheck(run);
  result.pass.push(...proof.pass);
  result.fail.push(...proof.fail);
  result.unresolved.push(...proof.unresolved);
  const check = (condition: boolean, code: string, label: string, detail: string) => {
    if (condition) result.pass.push({ code, label });
    else result.fail.push({ code, label, detail });
  };
  check(Boolean(delivery.receiptId), "RECEIPT_LINKED", "Receipt is linked", "Link a durable receipt before delivery can be ready.");
  const linkedReceipt = state.receipts.find((receipt) => receipt.receiptId === delivery.receiptId);
  const receiptMatchesLineage = Boolean(
    linkedReceipt &&
    linkedReceipt.customerId === delivery.customerId &&
    linkedReceipt.proofRunId === run.id &&
    linkedReceipt.productContractVersionId === run.productContractVersionId,
  );
  check(receiptMatchesLineage, "RECEIPT_LINEAGE", "Receipt matches delivery lineage", "The linked receipt must belong to this delivery lineage.");
  check(Boolean(receiptMatchesLineage && linkedReceipt?.structurallyValid), "RECEIPT_STRUCTURAL_VALID", "Receipt is structurally valid", "The linked receipt must be structurally valid.");
  check(delivery.verificationInstructions.trim().length > 0, "DELIVERY_VERIFICATION", "Verification instructions exist", "Add verification instructions.");
  check(delivery.customerWordingReviewed, "DELIVERY_WORDING", "Customer-facing wording is reviewed", "Review the customer-facing wording.");
  check(delivery.unsupportedClaims.length === 0, "DELIVERY_CLAIMS", "Delivery contains no unsupported claims", "Remove or bound unsupported claims.");
  return result;
}

export async function transitionDelivery(
  deliveryId: string,
  nextState: DeliveryState,
  actor: CoreActor,
): Promise<DeliveryRecord> {
  requireRole(actor, "business-authority");
  return mutateState((state) => {
    const delivery = state.deliveries.find((candidate) => candidate.id === deliveryId);
    if (!delivery) throw new AdminCoreError("NOT_FOUND", "Delivery not found.", 404);
    requireDeliveryAssignment(state, delivery, actor);
    if (nextState === "sent") {
      throw new AdminCoreError(
        "DELIVERY_SEND_REQUIRED",
        "Delivery must be sent through the reserved send action.",
        409,
      );
    }
    const sendReservation = state.deliverySendReservations[deliveryId];
    if (
      sendReservation?.status === "reserved" ||
      sendReservation?.status === "outcome_unknown"
    ) {
      throw new AdminCoreError(
        "DELIVERY_SEND_UNRESOLVED",
        "Delivery cannot transition while its send outcome is unresolved.",
        409,
      );
    }
    requireTransition("delivery", delivery.state, nextState, deliveryTransitions);
    if (nextState === "ready_for_operator_review") {
      const readiness = buildDeliveryReadinessSync(state, delivery.id);
      if (readiness.fail.length > 0 || readiness.unresolved.length > 0) {
        throw new AdminCoreError("DELIVERY_NOT_READY", "Delivery readiness checks have not passed.", 409, readiness);
      }
    }
    const previous = delivery.state;
    delivery.state = nextState;
    delivery.updatedAt = isoNow();
    appendAudit(state, {
      recordType: "delivery",
      recordId: delivery.id,
      action: "transition",
      actor: actor.actor,
      previousState: previous,
      resultingState: nextState,
      integrationResult: null,
      linkedExternalIds: [delivery.proofRunId, ...(delivery.receiptId ? [delivery.receiptId] : [])],
      failureDetails: null,
      lineageId: delivery.lineageId,
    });
    return clone(delivery);
  });
}

function buildDeliveryReadinessSync(state: CoreState, deliveryId: string): ReadinessCheck {
  const delivery = state.deliveries.find((candidate) => candidate.id === deliveryId);
  if (!delivery) throw new AdminCoreError("NOT_FOUND", "Delivery not found.", 404);
  const run = state.proofRuns.find((candidate) => candidate.id === delivery.proofRunId);
  const result: ReadinessCheck = { pass: [], fail: [], unresolved: [] };
  if (!run) {
    result.fail.push({ code: "PROOF_RUN_LINK", label: "Proof run is linked", detail: "The delivery has no proof run." });
    return result;
  }
  const proof = buildProofReadinessCheck(run);
  result.pass.push(...proof.pass);
  result.fail.push(...proof.fail);
  result.unresolved.push(...proof.unresolved);
  const check = (condition: boolean, code: string, label: string, detail: string) => {
    if (condition) result.pass.push({ code, label });
    else result.fail.push({ code, label, detail });
  };
  check(Boolean(delivery.receiptId), "RECEIPT_LINKED", "Receipt is linked", "Link a durable receipt before delivery can be ready.");
  const linkedReceipt = state.receipts.find((receipt) => receipt.receiptId === delivery.receiptId);
  const receiptMatchesLineage = Boolean(
    linkedReceipt &&
    linkedReceipt.customerId === delivery.customerId &&
    linkedReceipt.proofRunId === run.id &&
    linkedReceipt.productContractVersionId === run.productContractVersionId,
  );
  check(receiptMatchesLineage, "RECEIPT_LINEAGE", "Receipt matches delivery lineage", "The linked receipt must belong to this delivery lineage.");
  check(Boolean(receiptMatchesLineage && linkedReceipt?.structurallyValid), "RECEIPT_STRUCTURAL_VALID", "Receipt is structurally valid", "The linked receipt must be structurally valid.");
  check(delivery.verificationInstructions.trim().length > 0, "DELIVERY_VERIFICATION", "Verification instructions exist", "Add verification instructions.");
  check(delivery.customerWordingReviewed, "DELIVERY_WORDING", "Customer-facing wording is reviewed", "Review the customer-facing wording.");
  check(delivery.unsupportedClaims.length === 0, "DELIVERY_CLAIMS", "Delivery contains no unsupported claims", "Remove or bound unsupported claims.");
  return result;
}

export interface ReceiptLinkInput {
  receiptId: string;
  claimScope: string;
  structurallyValid: boolean;
  evidenceReferences: string[];
  verifierMechanism: string;
  verifierResult: string;
  limitations: string[];
  archiveLocation: string;
  supersedesReceiptId?: string | null;
}

export async function linkReceiptToDelivery(
  deliveryId: string,
  input: ReceiptLinkInput,
  actor: CoreActor,
): Promise<ReceiptRecord> {
  requireRole(actor, "business-authority");
  const publishedReceiptIds = new Set(
    (await listReceipts()).map((receipt) => receipt.receiptId),
  );
  return mutateState((state) => {
    const delivery = state.deliveries.find((candidate) => candidate.id === deliveryId);
    if (!delivery) throw new AdminCoreError("NOT_FOUND", "Delivery not found.", 404);
    const run = requireDeliveryAssignment(state, delivery, actor);
    requireDeliveryContentMutable(state, delivery);
    const receiptId = assertNonEmpty(input.receiptId, "receiptId");
    const mechanism = assertNonEmpty(input.verifierMechanism, "verifierMechanism");
    const verifierResult = assertNonEmpty(input.verifierResult, "verifierResult");
    const archiveLocation = assertNonEmpty(input.archiveLocation, "archiveLocation");
    const supersedesReceiptId = input.supersedesReceiptId
      ? assertNonEmpty(input.supersedesReceiptId, "supersedesReceiptId")
      : null;
    if (
      publishedReceiptIds.has(receiptId) ||
      (supersedesReceiptId && publishedReceiptIds.has(supersedesReceiptId))
    ) {
      throw new AdminCoreError(
        "RECEIPT_LINEAGE_CONFLICT",
        "Published receipt identifiers cannot be rebound or superseded.",
        409,
      );
    }
    let receipt = state.receipts.find((candidate) => candidate.receiptId === receiptId);
    const matchesDeliveryLineage = (candidate: ReceiptRecord) =>
      candidate.customerId === delivery.customerId &&
      candidate.proofRunId === run.id &&
      candidate.productContractVersionId === run.productContractVersionId;
    if (receipt && !matchesDeliveryLineage(receipt)) {
      throw new AdminCoreError(
        "RECEIPT_LINEAGE_CONFLICT",
        "Receipt identifier belongs to another delivery lineage.",
        409,
      );
    }
    if (!receipt) {
      if (supersedesReceiptId === receiptId) {
        throw new AdminCoreError(
          "RECEIPT_LINEAGE_CONFLICT",
          "A receipt cannot supersede itself.",
          409,
        );
      }
      const prior = supersedesReceiptId
        ? state.receipts.find((candidate) => candidate.receiptId === supersedesReceiptId)
        : null;
      if (supersedesReceiptId && !prior) {
        throw new AdminCoreError(
          "RECEIPT_LINEAGE_CONFLICT",
          "Superseded receipt does not exist in this delivery lineage.",
          409,
        );
      }
      if (prior && !matchesDeliveryLineage(prior)) {
        throw new AdminCoreError(
          "RECEIPT_LINEAGE_CONFLICT",
          "Superseded receipt belongs to another delivery lineage.",
          409,
        );
      }
      receipt = {
        id: id("receipt"),
        receiptId,
        customerId: delivery.customerId,
        proofRunId: run.id,
        productContractVersionId: run.productContractVersionId,
        claimScope: assertNonEmpty(input.claimScope, "claimScope"),
        structurallyValid: input.structurallyValid,
        evidenceReferences: [...input.evidenceReferences],
        verifierMechanism: mechanism,
        verifierResult,
        limitations: [...input.limitations],
        archiveLocation,
        supersedesReceiptId,
        supersededByReceiptId: null,
        createdAt: isoNow(),
        updatedAt: isoNow(),
      };
      state.receipts.push(receipt);
      if (prior) prior.supersededByReceiptId = receipt.receiptId;
      appendIntegration(state, {
        integration: "receipt-archive",
        operation: "link_receipt",
        idempotencyKey: `receipt:${receiptId}`,
        status: "succeeded",
        completedAt: receipt.createdAt,
        externalId: receiptId,
        error: null,
      });
    }
    if (delivery.receiptId !== receipt.receiptId) {
      delivery.receiptId = receipt.receiptId;
      delivery.contentRevision += 1;
    }
    delivery.updatedAt = isoNow();
    appendAudit(state, {
      recordType: "receipt",
      recordId: receipt.id,
      action: "link_to_delivery",
      actor: actor.actor,
      previousState: null,
      resultingState: "archived",
      integrationResult: `verifier=${receipt.verifierMechanism}; result=${receipt.verifierResult}`,
      linkedExternalIds: [receipt.receiptId, receipt.archiveLocation],
      failureDetails: null,
      lineageId: delivery.lineageId,
    });
    return clone(receipt);
  });
}

export async function recordDeliverySent(
  deliveryId: string,
  result: { provider: string; providerMessageId: string | null; sentAt: string },
  actor: CoreActor,
  idempotencyKey = `delivery-send:${deliveryId}`,
  reservationToken?: string,
): Promise<DeliveryRecord> {
  requireRole(actor, "business-authority");
  return mutateState((state) => {
    const delivery = state.deliveries.find((candidate) => candidate.id === deliveryId);
    if (!delivery) throw new AdminCoreError("NOT_FOUND", "Delivery not found.", 404);
    requireDeliveryAssignment(state, delivery, actor);
    if (delivery.state === "sent" || delivery.state === "acknowledged") return clone(delivery);
    const reservation = state.deliverySendReservations[deliveryId];
    if (
      !reservationToken ||
      !reservation ||
      reservation.status !== "reserved" ||
      reservation.reservationToken !== reservationToken ||
      reservation.idempotencyKey !== idempotencyKey
    ) {
      throw new AdminCoreError(
        "DELIVERY_RESERVATION_CONFLICT",
        "Delivery send reservation is no longer current.",
        409,
      );
    }
    const contentBinding = requireReservationContentBinding(
      delivery,
      reservation,
    );
    requireTransition("delivery", delivery.state, "sent", deliveryTransitions);
    const readiness = buildDeliveryReadinessSync(state, delivery.id);
    if (readiness.fail.length > 0 || readiness.unresolved.length > 0) {
      throw new AdminCoreError("DELIVERY_NOT_READY", "Delivery readiness checks have not passed.", 409, readiness);
    }
    const previous = delivery.state;
    delivery.state = "sent";
    delivery.provider = result.provider;
    delivery.providerMessageId = result.providerMessageId;
    delivery.sentAt = result.sentAt;
    delivery.sentContentRevision = contentBinding.contentRevision;
    delivery.sentContentDigest = contentBinding.contentDigest;
    delivery.failure = null;
    delivery.updatedAt = isoNow();
    state.idempotency[idempotencyKey] = { recordType: "delivery", recordId: delivery.id };
    if (reservation) {
      reservation.status = "sent";
      reservation.completedAt = delivery.updatedAt;
    }
    appendIntegration(state, {
      integration: "mail",
      operation: "send_delivery",
      idempotencyKey,
      status: "succeeded",
      completedAt: delivery.updatedAt,
      externalId: result.providerMessageId,
      error: null,
    });
    appendAudit(state, {
      recordType: "delivery",
      recordId: delivery.id,
      action: "record_sent",
      actor: actor.actor,
      previousState: previous,
      resultingState: delivery.state,
      integrationResult: `${result.provider}:${result.providerMessageId ?? "no-provider-id"}; content=${contentBinding.contentDigest}`,
      linkedExternalIds: [delivery.proofRunId, ...(delivery.receiptId ? [delivery.receiptId] : []), contentBinding.contentDigest],
      failureDetails: null,
      lineageId: delivery.lineageId,
    });
    return clone(delivery);
  });
}

export async function assertDeliveryActionAuthorized(
  deliveryId: string,
  actor: CoreActor,
): Promise<void> {
  const state = await readState();
  const delivery = state.deliveries.find((candidate) => candidate.id === deliveryId);
  if (!delivery) throw new AdminCoreError("NOT_FOUND", "Delivery not found.", 404);
  requireDeliveryAssignment(state, delivery, actor);
}

export type DeliverySendReservationResult =
  | {
      kind: "reserved";
      delivery: DeliveryRecord;
      reservationToken: string;
      contentRevision: number;
      contentDigest: string;
      sendContent: DeliverySendContentSnapshot;
    }
  | {
      kind: "replay";
      delivery: DeliveryRecord;
    }
  | {
      kind: "in_progress";
      delivery: DeliveryRecord;
    };

export async function reserveDeliverySend(
  deliveryId: string,
  actor: CoreActor,
  idempotencyKey = `delivery-send:${deliveryId}`,
): Promise<DeliverySendReservationResult> {
  requireRole(actor, "business-authority");
  const normalizedKey = assertNonEmpty(idempotencyKey, "idempotencyKey");
  return mutateState((state) => {
    const delivery = state.deliveries.find((candidate) => candidate.id === deliveryId);
    if (!delivery) throw new AdminCoreError("NOT_FOUND", "Delivery not found.", 404);
    requireDeliveryAssignment(state, delivery, actor);
    if (delivery.state === "sent" || delivery.state === "acknowledged") {
      return { kind: "replay", delivery: clone(delivery) };
    }
    const existing = state.deliverySendReservations[deliveryId];
    if (
      existing?.status === "reserved" ||
      existing?.status === "outcome_unknown"
    ) {
      return { kind: "in_progress", delivery: clone(delivery) };
    }
    if (existing?.status === "sent") {
      return { kind: "replay", delivery: clone(delivery) };
    }
    requireTransition("delivery", delivery.state, "sent", deliveryTransitions);
    const readiness = buildDeliveryReadinessSync(state, delivery.id);
    if (readiness.fail.length > 0 || readiness.unresolved.length > 0) {
      throw new AdminCoreError(
        "DELIVERY_NOT_READY",
        "Delivery readiness checks have not passed.",
        409,
        readiness,
      );
    }

    const now = isoNow();
    const reservationToken = id("sendres");
    const contentRevision = delivery.contentRevision;
    const contentSnapshot = deliveryContentSnapshot(delivery);
    const contentDigest = deliveryContentDigest(contentSnapshot);
    state.deliverySendReservations[deliveryId] = {
      deliveryId,
      idempotencyKey: normalizedKey,
      reservationToken,
      reservedBy: actor.actor,
      reservedAt: now,
      status: "reserved",
      completedAt: null,
      contentRevision,
      contentDigest,
      contentSnapshot,
    };
    appendIntegration(state, {
      integration: "mail",
      operation: "reserve_delivery_send",
      idempotencyKey: normalizedKey,
      status: "started",
      completedAt: null,
      externalId: null,
      error: null,
    });
    appendAudit(state, {
      recordType: "delivery",
      recordId: delivery.id,
      action: "reserve_send",
      actor: actor.actor,
      previousState: delivery.state,
      resultingState: delivery.state,
      integrationResult: `mail:reserved; content=${contentDigest}`,
      linkedExternalIds: [delivery.proofRunId, contentDigest],
      failureDetails: null,
      lineageId: delivery.lineageId,
    });
    return {
      kind: "reserved",
      delivery: clone(delivery),
      reservationToken,
      contentRevision,
      contentDigest,
      sendContent: clone(contentSnapshot),
    };
  });
}

export async function failDeliverySendReservation(
  deliveryId: string,
  reservationToken: string,
  actor: CoreActor,
  safeError: string,
): Promise<void> {
  await mutateState((state) => {
    const delivery = state.deliveries.find((candidate) => candidate.id === deliveryId);
    if (!delivery) throw new AdminCoreError("NOT_FOUND", "Delivery not found.", 404);
    requireDeliveryAssignment(state, delivery, actor);
    const reservation = state.deliverySendReservations[deliveryId];
    if (!reservation || reservation.reservationToken !== reservationToken) {
      throw new AdminCoreError(
        "DELIVERY_RESERVATION_CONFLICT",
        "Delivery send reservation is no longer current.",
        409,
      );
    }
    reservation.status = "failed";
    reservation.completedAt = isoNow();
    delivery.failure = safeError;
    delivery.updatedAt = reservation.completedAt;
  });
}

export async function markDeliverySendOutcomeUnknown(
  deliveryId: string,
  reservationToken: string,
  actor: CoreActor,
): Promise<void> {
  await mutateState((state) => {
    const delivery = state.deliveries.find((candidate) => candidate.id === deliveryId);
    if (!delivery) throw new AdminCoreError("NOT_FOUND", "Delivery not found.", 404);
    requireDeliveryAssignment(state, delivery, actor);
    const reservation = state.deliverySendReservations[deliveryId];
    if (
      !reservation ||
      reservation.status !== "reserved" ||
      reservation.reservationToken !== reservationToken
    ) {
      throw new AdminCoreError(
        "DELIVERY_RESERVATION_CONFLICT",
        "Delivery send reservation is no longer current.",
        409,
      );
    }
    reservation.status = "outcome_unknown";
    reservation.completedAt = isoNow();
    delivery.failure =
      "Mail delivery outcome is unknown and requires reconciliation.";
    delivery.updatedAt = reservation.completedAt;
  });
}

export async function reconcileDeliverySendReservation(
  deliveryId: string,
  input: DeliverySendReconciliationInput,
  actor: CoreActor,
): Promise<DeliveryRecord> {
  requireRole(actor, "business-authority");
  const note = assertNonEmpty(input.note, "note");
  return mutateState((state) => {
    const delivery = state.deliveries.find(
      (candidate) => candidate.id === deliveryId,
    );
    if (!delivery) {
      throw new AdminCoreError("NOT_FOUND", "Delivery not found.", 404);
    }
    requireDeliveryAssignment(state, delivery, actor);
    const reservation = state.deliverySendReservations[deliveryId];
    if (
      !reservation ||
      (reservation.status !== "reserved" &&
        reservation.status !== "outcome_unknown")
    ) {
      throw new AdminCoreError(
        "DELIVERY_RECONCILIATION_NOT_REQUIRED",
        "Delivery has no unresolved send reservation.",
        409,
      );
    }
    if (
      reservation.status === "reserved" &&
      Date.now() - new Date(reservation.reservedAt).getTime() <=
        DELIVERY_SEND_RESERVATION_STALE_MS
    ) {
      throw new AdminCoreError(
        "DELIVERY_SEND_STILL_ACTIVE",
        "The delivery reservation is still active and cannot yet be reconciled.",
        409,
      );
    }

    const now = isoNow();
    if (input.outcome === "not_sent") {
      reservation.status = "failed";
      reservation.completedAt = now;
      delivery.failure =
        "An operator confirmed that the reserved delivery was not sent.";
      delivery.updatedAt = now;
      appendIntegration(state, {
        integration: "mail",
        operation: "reconcile_delivery_send_not_sent",
        idempotencyKey: reservation.idempotencyKey,
        status: "succeeded",
        completedAt: now,
        externalId: null,
        error: null,
      });
      appendAudit(state, {
        recordType: "delivery",
        recordId: delivery.id,
        action: "reconcile_send_not_sent",
        actor: actor.actor,
        previousState: delivery.state,
        resultingState: delivery.state,
        integrationResult: "mail:not_sent_confirmed",
        linkedExternalIds: [delivery.proofRunId],
        failureDetails: note,
        lineageId: delivery.lineageId,
      });
      return clone(delivery);
    }

    const provider = assertNonEmpty(input.provider, "provider");
    const sentAt = new Date(input.sentAt);
    if (!Number.isFinite(sentAt.getTime())) {
      throw new AdminCoreError(
        "INVALID_INPUT",
        "sentAt must be a valid timestamp.",
      );
    }
    const contentBinding = requireReservationContentBinding(
      delivery,
      reservation,
    );
    requireTransition("delivery", delivery.state, "sent", deliveryTransitions);
    const readiness = buildDeliveryReadinessSync(state, delivery.id);
    if (readiness.fail.length > 0 || readiness.unresolved.length > 0) {
      throw new AdminCoreError(
        "DELIVERY_NOT_READY",
        "Delivery readiness checks have not passed.",
        409,
        readiness,
      );
    }
    const previous = delivery.state;
    const providerMessageId = input.providerMessageId?.trim() || null;
    delivery.state = "sent";
    delivery.provider = provider;
    delivery.providerMessageId = providerMessageId;
    delivery.sentAt = sentAt.toISOString();
    delivery.sentContentRevision = contentBinding.contentRevision;
    delivery.sentContentDigest = contentBinding.contentDigest;
    delivery.failure = null;
    delivery.updatedAt = now;
    reservation.status = "sent";
    reservation.completedAt = now;
    state.idempotency[reservation.idempotencyKey] = {
      recordType: "delivery",
      recordId: delivery.id,
    };
    appendIntegration(state, {
      integration: "mail",
      operation: "reconcile_delivery_send_sent",
      idempotencyKey: reservation.idempotencyKey,
      status: "succeeded",
      completedAt: now,
      externalId: providerMessageId,
      error: null,
    });
    appendAudit(state, {
      recordType: "delivery",
      recordId: delivery.id,
      action: "reconcile_send_sent",
      actor: actor.actor,
      previousState: previous,
      resultingState: delivery.state,
      integrationResult: `${provider}:${providerMessageId ?? "no-provider-id"}; content=${contentBinding.contentDigest}`,
      linkedExternalIds: [
        delivery.proofRunId,
        ...(delivery.receiptId ? [delivery.receiptId] : []),
        contentBinding.contentDigest,
      ],
      failureDetails: note,
      lineageId: delivery.lineageId,
    });
    return clone(delivery);
  });
}

export async function recordIntegrationFailure(
  input: Omit<IntegrationAttemptRecord, "id" | "attemptedAt" | "status" | "completedAt"> & { status?: IntegrationAttemptRecord["status"] },
  actor: CoreActor,
  record?: { recordType: string; recordId: string; lineageId?: string | null },
): Promise<IntegrationAttemptRecord> {
  return mutateState((state) => {
    const attempt = appendIntegration(state, {
      ...input,
      status: input.status ?? "failed",
      completedAt: isoNow(),
    });
    appendAudit(state, {
      recordType: record?.recordType ?? "integration",
      recordId: record?.recordId ?? attempt.id,
      action: "integration_failure",
      actor: actor.actor,
      previousState: null,
      resultingState: null,
      integrationResult: `${attempt.integration}:${attempt.operation}`,
      linkedExternalIds: attempt.externalId ? [attempt.externalId] : [],
      failureDetails: attempt.error,
      lineageId: record?.lineageId ?? null,
    });
    return clone(attempt);
  });
}

export interface SearchResult {
  type: "customer" | "inbox" | "review-request" | "product" | "proof-run" | "delivery" | "receipt";
  id: string;
  label: string;
  href: string;
  matchedField: string;
}

export async function searchCoreRecords(query: string, actor?: CoreActor): Promise<SearchResult[]> {
  const needle = normalizeSearch(query);
  if (!needle) return [];
  const fullState = await readState();
  const state = actor ? filterStateForActor(fullState, actor) : fullState;
  const results: SearchResult[] = [];
  for (const customer of state.customers) {
    const field = ["name", "email", "organization"].find((key) => normalizeSearch(String(customer[key as keyof CustomerRecord] ?? "")).includes(needle));
    if (field) results.push({ type: "customer", id: customer.id, label: customer.name, href: `/admin/customers/${customer.id}`, matchedField: field });
  }
  for (const item of state.inboxItems) {
    const field = ["id", "gmailMessageId", "gmailThreadId", "subject", "sender"].find((key) => normalizeSearch(String(item[key as keyof InboxItemRecord] ?? "")).includes(needle));
    if (field) results.push({ type: "inbox", id: item.id, label: item.subject, href: `/admin/inbox/${item.id}`, matchedField: field });
  }
  for (const request of state.reviewRequests) {
    const field = ["id", "originatingGmailThreadId", "requestText"].find((key) => normalizeSearch(String(request[key as keyof ReviewRequestRecord] ?? "")).includes(needle));
    if (field) results.push({ type: "review-request", id: request.id, label: request.requestText, href: `/admin/review-requests/${request.id}`, matchedField: field });
  }
  for (const product of state.productContracts) {
    const field = ["id", "productId", "productName", "contractVersion"].find((key) => normalizeSearch(String(product[key as keyof ProductContractVersionRecord] ?? "")).includes(needle));
    if (field) results.push({ type: "product", id: product.id, label: product.productName, href: `/admin/products/${product.id}`, matchedField: field });
  }
  for (const run of state.proofRuns) {
    const field = ["id", "reviewRequestId", "productContractVersionId"].find((key) => normalizeSearch(String(run[key as keyof ProofRunRecord] ?? "")).includes(needle));
    if (field) results.push({ type: "proof-run", id: run.id, label: run.productContractSnapshot.productName, href: `/admin/proof-runs/${run.id}`, matchedField: field });
  }
  for (const delivery of state.deliveries) {
    const field = ["id", "proofRunId", "receiptId"].find((key) => normalizeSearch(String(delivery[key as keyof DeliveryRecord] ?? "")).includes(needle));
    if (field) results.push({ type: "delivery", id: delivery.id, label: delivery.subject, href: `/admin/deliveries/${delivery.id}`, matchedField: field });
  }
  for (const receipt of state.receipts) {
    const field = ["id", "receiptId", "proofRunId", "productContractVersionId"].find((key) => normalizeSearch(String(receipt[key as keyof ReceiptRecord] ?? "")).includes(needle));
    if (field) results.push({ type: "receipt", id: receipt.id, label: receipt.receiptId, href: `/admin/receipts/${receipt.id}`, matchedField: field });
  }
  if ((actor?.role ?? "Founder") !== "Delegated Operator") {
    for (const receipt of await listReceipts()) {
      if (normalizeSearch(receipt.receiptId).includes(needle)) {
        results.push({ type: "receipt", id: receipt.receiptId, label: receipt.receiptId, href: `/admin/receipts/${receipt.receiptId}`, matchedField: "receiptId" });
      }
    }
  }
  return results.slice(0, 100);
}

export async function getAdminCoreDashboard(actor?: CoreActor): Promise<{
  counts: Record<string, number>;
  today: { inbox: number; review: number; proofs: number; deliveries: number };
  recentProofRuns: ProofRunRecord[];
  health: ReturnType<typeof getAdminCoreHealth>;
}> {
  const fullState = await readState();
  const state = actor ? filterStateForActor(fullState, actor) : fullState;
  const today = new Date().toISOString().slice(0, 10);
  return {
    counts: {
      inbox: state.inboxItems.filter((item) => !["archived", "excluded", "security-routed"].includes(item.state)).length,
      reviewRequests: state.reviewRequests.filter((request) => !["closed", "declined"].includes(request.state)).length,
      waitingForCustomer: state.reviewRequests.filter((request) => request.state === "needs_customer_information").length,
      needsReview: state.proofRuns.filter((run) => run.state === "operator_review").length,
      readyToDeliver: state.deliveries.filter((delivery) => delivery.state === "ready_for_operator_review").length,
      receipts: state.receipts.length,
    },
    today: {
      inbox: state.inboxItems.filter((item) => item.createdAt.startsWith(today)).length,
      review: state.reviewRequests.filter((request) => request.createdAt.startsWith(today)).length,
      proofs: state.proofRuns.filter((run) => run.createdAt.startsWith(today)).length,
      deliveries: state.deliveries.filter((delivery) => delivery.createdAt.startsWith(today)).length,
    },
    recentProofRuns: clone(state.proofRuns.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5)),
    health: getAdminCoreHealth(),
  };
}

export function getAdminCoreHealth(): Record<string, { state: HealthState; lastSuccessfulCheck: string | null; lastError: string | null; detail: string }> {
  const configured = (name: string) => Boolean(process.env[name]?.trim());
  const now = isoNow();
  return {
    gmail: { state: "unknown", lastSuccessfulCheck: null, lastError: null, detail: `Manual Gmail sync targets ${PUBLIC_CONTACT_EMAIL} through the gws CLI; no live check has been recorded. Original Gmail content remains authoritative; the console stores message metadata and external IDs.` },
    drive: { state: configured("WITNESSOPS_DRIVE_ROOT") || configured("GOOGLE_DRIVE_ROOT") ? "unknown" : "disconnected", lastSuccessfulCheck: null, lastError: null, detail: configured("WITNESSOPS_DRIVE_ROOT") || configured("GOOGLE_DRIVE_ROOT") ? "Drive adapter is configured but no live check has been recorded." : "Drive adapter is not configured. Drive file IDs are retained by reference; the console does not copy attachments automatically." },
    mailDelivery: { state: configured("WITNESSOPS_MAIL_PROVIDER") ? "unknown" : "disconnected", lastSuccessfulCheck: null, lastError: configured("WITNESSOPS_MAIL_PROVIDER") ? null : "WITNESSOPS_MAIL_PROVIDER is not configured.", detail: configured("WITNESSOPS_MAIL_PROVIDER") ? "Mail provider is configured but no live check has been recorded." : "Uses the existing WitnessOps mail sender when configured." },
    receiptVerifier: { state: "connected", lastSuccessfulCheck: now, lastError: null, detail: "Named verifier mechanism and result are required on every linked receipt." },
    receiptArchive: { state: "connected", lastSuccessfulCheck: now, lastError: null, detail: "Receipt archive links and supersession chains are retained in the operational record." },
    publicContactRoute: { state: "connected", lastSuccessfulCheck: now, lastError: null, detail: `${PUBLIC_CONTACT_PRIMARY_HREF} is primary; ${PUBLIC_CONTACT_EMAIL} is fallback.` },
    publicFallbackMailbox: { state: "connected", lastSuccessfulCheck: now, lastError: null, detail: PUBLIC_CONTACT_EMAIL },
    securityDisclosureMailbox: { state: "connected", lastSuccessfulCheck: now, lastError: null, detail: SECURITY_DISCLOSURE_EMAIL + " remains outside review requests." },
  };
}
