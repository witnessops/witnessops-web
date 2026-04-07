import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import type { ChannelName } from "@/lib/channel-policy";
import type {
  AdmissionState,
  AdminActorAuthSource,
} from "@/lib/token-contract";

import type {
  IntakeResponseProviderOutcomeSource,
  IntakeResponseProviderOutcomeStatus,
} from "@/lib/provider-outcomes";
import type { DeliveryEvidenceSubcase } from "./reconciliation-subcases";

/**
 * Intake and issuance JSON files are read models for lookup and operator views.
 * The append-only admission ledger remains authoritative for reconstructing
 * custody and state. If snapshots and ledger history disagree, treat the
 * snapshot as stale and rebuild from the ledger.
 */

export type TokenIssuanceStatus = "issued" | "verified";

export type AssessmentStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "unavailable";

export interface TokenDeliveryMetadata {
  mailbox: string;
  alias: string | null;
  templateVersion: string;
  provider: string;
  providerMessageId: string | null;
  deliveredAt: string;
}

export interface IntakeSubmissionRecord {
  name?: string | null;
  org?: string | null;
  intent?: string | null;
  scope?: string | null;
  subject?: string | null;
  category?: string | null;
  severity?: string | null;
  message?: string | null;
}

export interface IntakeResponseRecord {
  deliveryAttemptId: string;
  subject: string;
  bodyDigest: string;
  actor: string;
  actorAuthSource?: AdminActorAuthSource;
  actorSessionHash?: string | null;
  mailbox: string;
  provider: string;
  providerMessageId: string | null;
  deliveredAt: string;
}

export interface IntakeReconciliationRecord {
  reconciledAt: string;
  actor: string;
  actorAuthSource?: AdminActorAuthSource;
  actorSessionHash?: string | null;
  note: string;
  evidenceSubcase?: DeliveryEvidenceSubcase;
  notePolicyVersion?: string;
  deliveryAttemptId: string;
  provider: string;
  providerMessageId: string | null;
  mailbox: string;
}

export interface IntakeResponseProviderOutcomeRecord {
  status: IntakeResponseProviderOutcomeStatus;
  observedAt: string;
  provider: string;
  providerEventId: string;
  providerMessageId: string | null;
  deliveryAttemptId: string;
  source: IntakeResponseProviderOutcomeSource;
  rawEventType: string;
  detail?: string | null;
}

export interface IntakeMailboxReceiptRecord {
  status: IntakeResponseProviderOutcomeStatus;
  observedAt: string;
  deliveryAttemptId: string;
  providerMessageId: string | null;
  receiptId: string;
  detail?: string | null;
}

export interface IntakeRecord {
  intakeId: string;
  channel: ChannelName;
  email: string;
  state: AdmissionState;
  createdAt: string;
  updatedAt: string;
  latestIssuanceId: string | null;
  threadId: string | null;
  verificationSentAt?: string;
  verifiedAt?: string;
  admittedAt?: string;
  respondedAt?: string;
  expiredAt?: string;
  rejectedAt?: string;
  replayedAt?: string;
  submission: IntakeSubmissionRecord;
  firstResponse?: IntakeResponseRecord;
  responseProviderOutcome?: IntakeResponseProviderOutcomeRecord;
  responseMailboxReceipt?: IntakeMailboxReceiptRecord;
  reconciliation?: IntakeReconciliationRecord;
  /**
   * Operator-side action recorded against this intake (WEB-004).
   * Surfaces explicit reject and clarification-request outcomes that
   * were previously approximated through reply/reconcile flows.
   */
  operatorAction?: OperatorActionRecord | null;
}

export interface OperatorActionRecord {
  kind: "reject" | "request_clarification";
  recordedAt: string;
  actor: string;
  reason: string;
  /** Only present when kind === "request_clarification". */
  clarificationQuestion?: string | null;
}

export interface TokenIssuanceRecord {
  issuanceId: string;
  intakeId?: string;
  channel?: ChannelName;
  email: string;
  tokenDigest: string;
  createdAt: string;
  expiresAt: string;
  status: TokenIssuanceStatus;
  delivery: TokenDeliveryMetadata;
  verifiedAt?: string;
  consumedAt?: string;
  threadId?: string | null;
  approvalStatus?: "pending" | "approved" | "approval_denied";
  approvalAt?: string;
  approverEmail?: string;
  approverName?: string | null;
  approvalNote?: string | null;
  assessmentRunId?: string;
  assessmentStatus?: AssessmentStatus;
  assessmentError?: string | null;
  controlPlaneRunId?: string;
  /**
   * Claimant-side back-out or amendment action recorded before approval (WEB-003).
   * Null when no claimant action has been taken.
   *  - amend     : claimant revised the submission; approval still allowed.
   *  - retract   : claimant exited the engagement; approval blocked.
   *  - disagree  : claimant disputed the proposed scope; approval blocked.
   */
  claimantAction?: ClaimantActionRecord | null;
}

export interface ClaimantActionRecord {
  kind: "amend" | "retract" | "disagree";
  recordedAt: string;
  reason: string;
  /** Only present for kind = "amend". The submitted replacement scope text. */
  amendedScope?: string | null;
}

export function getAdmissionStoreDir(): string {
  return (
    process.env.WITNESSOPS_INTAKE_STORE_DIR ??
    process.env.WITNESSOPS_TOKEN_STORE_DIR ??
    path.join(process.cwd(), ".witnessops-token-store")
  );
}

/**
 * Whitelist for record identifiers used to build filesystem paths.
 *
 * Restricting to `[A-Za-z0-9_-]+` blocks every path-traversal vector
 * (no `/`, `\`, `..`, or NUL) without changing the IDs the rest of the
 * system actually generates (`intk_<hex>`, `iss_<hex>`). Any caller
 * passing a malformed identifier — including HTTP request bodies that
 * reach `getIntakeById` / `getIssuanceById` — is rejected before the
 * path is constructed.
 */
const SAFE_RECORD_ID_RE = /^[A-Za-z0-9_-]+$/;

function assertSafeRecordId(id: string, kind: "intake" | "issuance"): void {
  if (typeof id !== "string" || !SAFE_RECORD_ID_RE.test(id)) {
    throw new Error(`Invalid ${kind} id`);
  }
}

function safeRecordPath(
  id: string,
  kind: "intake" | "issuance",
  subdir: "intakes" | "issuances",
): string {
  assertSafeRecordId(id, kind);
  const base = path.resolve(getAdmissionStoreDir(), subdir);
  // path.basename strips any directory components that might survive the
  // regex check, and the prefix assertion below proves the final path
  // never escapes the base directory. Together with the regex, this is
  // the CodeQL-recognized sanitizer pattern for path traversal.
  const safeName = `${path.basename(id)}.json`;
  const resolved = path.resolve(base, safeName);
  if (resolved !== path.join(base, safeName)) {
    throw new Error(`Invalid ${kind} id`);
  }
  if (!resolved.startsWith(base + path.sep)) {
    throw new Error(`Invalid ${kind} id`);
  }
  return resolved;
}

function intakePath(intakeId: string): string {
  return safeRecordPath(intakeId, "intake", "intakes");
}

function issuancePath(issuanceId: string): string {
  return safeRecordPath(issuanceId, "issuance", "issuances");
}

async function ensureStoreDirs(): Promise<void> {
  await Promise.all([
    mkdir(path.join(getAdmissionStoreDir(), "intakes"), { recursive: true }),
    mkdir(path.join(getAdmissionStoreDir(), "issuances"), { recursive: true }),
  ]);
}

async function writeJsonAtomic(
  filePath: string,
  value: unknown,
): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);
}

async function readJsonCollection<T>(dir: string): Promise<T[]> {
  const entries = await readdir(dir);
  const records = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry) => {
        const raw = await readFile(path.join(dir, entry), "utf8");
        return JSON.parse(raw) as T;
      }),
  );

  return records;
}

export async function saveIssuance(record: TokenIssuanceRecord): Promise<void> {
  await ensureStoreDirs();
  await writeJsonAtomic(issuancePath(record.issuanceId), record);
}

export async function saveIntake(record: IntakeRecord): Promise<void> {
  await ensureStoreDirs();
  await writeJsonAtomic(intakePath(record.intakeId), record);
}

export async function getIssuanceById(
  issuanceId: string,
): Promise<TokenIssuanceRecord | null> {
  try {
    const raw = await readFile(issuancePath(issuanceId), "utf8");
    return JSON.parse(raw) as TokenIssuanceRecord;
  } catch {
    return null;
  }
}

export async function getIntakeById(
  intakeId: string,
): Promise<IntakeRecord | null> {
  try {
    const raw = await readFile(intakePath(intakeId), "utf8");
    return JSON.parse(raw) as IntakeRecord;
  } catch {
    return null;
  }
}

export async function getIssuancesByEmail(
  email: string,
): Promise<TokenIssuanceRecord[]> {
  await ensureStoreDirs();
  const matches = (
    await readJsonCollection<TokenIssuanceRecord>(
      path.join(getAdmissionStoreDir(), "issuances"),
    )
  ).map((record) => (record.email === email ? record : null));

  return matches.filter(
    (record): record is TokenIssuanceRecord => record !== null,
  );
}

export async function getIntakesByEmail(
  email: string,
): Promise<IntakeRecord[]> {
  await ensureStoreDirs();
  const matches = (
    await readJsonCollection<IntakeRecord>(
      path.join(getAdmissionStoreDir(), "intakes"),
    )
  ).map((record) => (record.email === email ? record : null));

  return matches.filter((record): record is IntakeRecord => record !== null);
}

export async function getAllIssuances(): Promise<TokenIssuanceRecord[]> {
  await ensureStoreDirs();
  return readJsonCollection<TokenIssuanceRecord>(
    path.join(getAdmissionStoreDir(), "issuances"),
  );
}

export async function getAllIntakes(): Promise<IntakeRecord[]> {
  await ensureStoreDirs();
  return readJsonCollection<IntakeRecord>(
    path.join(getAdmissionStoreDir(), "intakes"),
  );
}

export async function updateIssuance(
  issuanceId: string,
  updater: (record: TokenIssuanceRecord) => TokenIssuanceRecord,
): Promise<TokenIssuanceRecord> {
  const existing = await getIssuanceById(issuanceId);
  if (!existing) {
    throw new Error(`Unknown issuanceId: ${issuanceId}`);
  }

  const updated = updater(existing);
  await saveIssuance(updated);
  return updated;
}

export async function updateIntake(
  intakeId: string,
  updater: (record: IntakeRecord) => IntakeRecord,
): Promise<IntakeRecord> {
  const existing = await getIntakeById(intakeId);
  if (!existing) {
    throw new Error(`Unknown intakeId: ${intakeId}`);
  }

  const updated = updater(existing);
  await saveIntake(updated);
  return updated;
}

export async function clearTokenStore(): Promise<void> {
  await rm(getAdmissionStoreDir(), { recursive: true, force: true });
}
