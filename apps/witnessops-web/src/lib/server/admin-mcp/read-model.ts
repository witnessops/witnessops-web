import "server-only";

import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { ROW_LIMIT, STORE_MAX_BYTES } from "./constants";
import { AdminMcpDenial } from "./errors";
import { hasSensitiveText } from "./sanitize";

/**
 * Local read of core-state.json. The spine list readers take an optional
 * actor, and a role-less actor is not a minimisation control, so this module
 * does not import them. Raw records never leave this file. The parse result
 * below is the only value returned.
 */

const safeId = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/);

const countSchema = z
  .object({
    threadsInspected: z.number().int().nonnegative(),
    messagesInspected: z.number().int().nonnegative(),
    inboxItemsCreated: z.number().int().nonnegative(),
    existingItemsUpdated: z.number().int().nonnegative(),
    noOp: z.number().int().nonnegative(),
    securityMessagesExcluded: z.number().int().nonnegative(),
    labelFailures: z.number().int().nonnegative(),
  })
  .strict();

export const healthOutputSchema = z
  .object({
    components: z
      .object({
        gmailSync: z.enum(["connected", "degraded", "disconnected", "unknown"]),
      })
      .strict(),
    lastGmailSync: z
      .object({
        state: z.enum(["completed", "partial", "failed", "none"]),
        completedAt: iso.nullable(),
      })
      .strict(),
  })
  .strict();

export const countsOutputSchema = z
  .object({
    reviewRequests: z.number().int().nonnegative(),
    deliveries: z.number().int().nonnegative(),
    receipts: z.number().int().nonnegative(),
    syncRuns: z.number().int().nonnegative(),
  })
  .strict();

export const syncRunSchema = z
  .object({
    syncRunId: safeId,
    status: z.enum(["completed", "partial", "failed"]),
    startedAt: iso,
    completedAt: iso,
    counts: countSchema,
    failureScopes: z.array(z.enum(["list", "message", "labels", "label", "store"])).max(50),
    retryableFailureCount: z.number().int().nonnegative(),
    failureCount: z.number().int().nonnegative(),
  })
  .strict();

export const reviewSchema = z
  .object({
    id: safeId,
    state: z.enum([
      "new",
      "triage",
      "needs_customer_information",
      "fit_review",
      "fit_confirmed",
      "approved_for_proof_run",
      "scheduled",
      "converted_to_proof_run",
      "declined",
      "closed",
    ]),
    ageSeconds: z.number().int().nonnegative(),
    productId: safeId.nullable(),
  })
  .strict();

export const deliverySchema = z
  .object({
    id: safeId,
    state: z.enum([
      "draft",
      "ready_for_operator_review",
      "sent",
      "acknowledged",
      "superseded",
      "failed",
    ]),
    receipt: z.enum(["present", "absent"]),
    sent: z.enum(["yes", "no"]),
  })
  .strict();

export const receiptSchema = z
  .object({
    id: safeId,
    structurallyValid: z.boolean(),
    claimScope: z.enum(["present", "absent", "redacted"]),
    verifierResult: z.enum(["present", "absent", "redacted"]),
  })
  .strict();

export const listSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item).max(ROW_LIMIT) }).strict();

export type HealthOutput = z.infer<typeof healthOutputSchema>;
export type CountsOutput = z.infer<typeof countsOutputSchema>;
export type SyncRunOutput = z.infer<typeof syncRunSchema>;
export type ReviewOutput = z.infer<typeof reviewSchema>;
export type DeliveryOutput = z.infer<typeof deliverySchema>;
export type ReceiptOutput = z.infer<typeof receiptSchema>;

export interface AdminMcpSnapshot {
  health: HealthOutput;
  counts: CountsOutput;
  syncRuns: SyncRunOutput[];
  reviews: ReviewOutput[];
  deliveries: DeliveryOutput[];
  receipts: ReceiptOutput[];
  redactions: {
    health: number;
    counts: number;
    syncRuns: number;
    reviews: number;
    deliveries: number;
    receipts: number;
  };
}

function unavailable(): AdminMcpDenial {
  return new AdminMcpDenial(503, "unavailable");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function collection(record: Record<string, unknown>, key: string): unknown[] {
  if (!Object.hasOwn(record, key)) return [];
  const value = record[key];
  if (!Array.isArray(value)) throw unavailable();
  return value;
}

function presence(value: unknown): { state: "present" | "absent" | "redacted"; redactions: number } {
  if (typeof value !== "string" || value.trim() === "") {
    return { state: "absent", redactions: 0 };
  }
  if (hasSensitiveText(value)) return { state: "redacted", redactions: 1 };
  return { state: "present", redactions: 0 };
}

function ageSeconds(value: unknown, now: number): number | null {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  const delta = Math.floor((now - parsed) / 1000);
  if (!Number.isSafeInteger(delta) || delta < 0) return 0;
  return delta;
}

function sortKey(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

export async function loadAdminMcpSnapshot(now: number): Promise<AdminMcpSnapshot> {
  const directory = process.env.WITNESSOPS_ADMIN_CORE_STORE_DIR?.trim();
  if (!directory) throw unavailable();
  const file = path.join(directory, "core-state.json");
  let bytes: Buffer;
  try {
    const info = await stat(file);
    if (!info.isFile() || info.size > STORE_MAX_BYTES) throw unavailable();
    bytes = await readFile(file);
  } catch (error) {
    if (error instanceof AdminMcpDenial) throw error;
    throw unavailable();
  }
  if (bytes.byteLength > STORE_MAX_BYTES) throw unavailable();
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8")) as unknown;
  } catch {
    throw unavailable();
  }
  const record = asRecord(parsed);
  if (!record || record.schemaVersion !== 1) throw unavailable();

  const reviewsRaw = collection(record, "reviewRequests");
  const deliveriesRaw = collection(record, "deliveries");
  const receiptsRaw = collection(record, "receipts");
  const syncRaw = collection(record, "gmailSyncReceipts");

  let reviewRedactions = 0;
  const reviews: ReviewOutput[] = [];
  for (const item of [...reviewsRaw].sort((left, right) => {
    const a = asRecord(left);
    const b = asRecord(right);
    return sortKey(b ?? {}, "updatedAt").localeCompare(sortKey(a ?? {}, "updatedAt"));
  })) {
    const row = asRecord(item);
    if (!row) continue;
    const product = row.proposedProductId;
    const projected = {
      id: row.id,
      state: row.state,
      ageSeconds: ageSeconds(row.createdAt, now),
      productId: typeof product === "string" ? product : product === null ? null : undefined,
    };
    if (typeof projected.id === "string" && hasSensitiveText(projected.id)) reviewRedactions += 1;
    if (typeof projected.productId === "string" && hasSensitiveText(projected.productId)) {
      reviewRedactions += 1;
    }
    const parsedRow = reviewSchema.safeParse(projected);
    if (parsedRow.success) reviews.push(parsedRow.data);
  }

  let deliveryRedactions = 0;
  const deliveries: DeliveryOutput[] = [];
  for (const item of [...deliveriesRaw].sort((left, right) => {
    const a = asRecord(left);
    const b = asRecord(right);
    return sortKey(b ?? {}, "updatedAt").localeCompare(sortKey(a ?? {}, "updatedAt"));
  })) {
    const row = asRecord(item);
    if (!row) continue;
    const receiptId = row.receiptId;
    const sentAt = row.sentAt;
    const sentByState = row.state === "sent" || row.state === "acknowledged" || row.state === "superseded";
    const projected = {
      id: row.id,
      state: row.state,
      receipt: typeof receiptId === "string" && receiptId.length > 0 ? "present" : "absent",
      sent: sentByState || (typeof sentAt === "string" && sentAt.length > 0) ? "yes" : "no",
    };
    if (typeof receiptId === "string" && hasSensitiveText(receiptId)) deliveryRedactions += 1;
    if (typeof projected.id === "string" && hasSensitiveText(projected.id)) deliveryRedactions += 1;
    const parsedRow = deliverySchema.safeParse(projected);
    if (parsedRow.success) deliveries.push(parsedRow.data);
  }

  let receiptRedactions = 0;
  const receipts: ReceiptOutput[] = [];
  for (const item of [...receiptsRaw].sort((left, right) => {
    const a = asRecord(left);
    const b = asRecord(right);
    return sortKey(b ?? {}, "updatedAt").localeCompare(sortKey(a ?? {}, "updatedAt"));
  })) {
    const row = asRecord(item);
    if (!row) continue;
    const claim = presence(row.claimScope);
    const verifier = presence(row.verifierResult);
    receiptRedactions += claim.redactions + verifier.redactions;
    if (typeof row.id === "string" && hasSensitiveText(row.id)) receiptRedactions += 1;
    const parsedRow = receiptSchema.safeParse({
      id: row.id,
      structurallyValid: row.structurallyValid,
      claimScope: claim.state,
      verifierResult: verifier.state,
    });
    if (parsedRow.success) receipts.push(parsedRow.data);
  }

  let syncRedactions = 0;
  const syncRuns: SyncRunOutput[] = [];
  for (const item of [...syncRaw].sort((left, right) => {
    const a = asRecord(left);
    const b = asRecord(right);
    return sortKey(b ?? {}, "completedAt").localeCompare(sortKey(a ?? {}, "completedAt"));
  })) {
    const row = asRecord(item);
    if (!row) continue;
    const failures = Array.isArray(row.failures) ? row.failures : [];
    const failureScopes: string[] = [];
    let retryableFailureCount = 0;
    for (const failure of failures) {
      const failureRecord = asRecord(failure);
      if (!failureRecord) continue;
      if (typeof failureRecord.error === "string" && hasSensitiveText(failureRecord.error)) {
        syncRedactions += 1;
      }
      if (typeof failureRecord.messageId === "string" && hasSensitiveText(failureRecord.messageId)) {
        syncRedactions += 1;
      }
      if (typeof failureRecord.scope === "string") failureScopes.push(failureRecord.scope);
      if (failureRecord.retryable === true) retryableFailureCount += 1;
    }
    if (typeof row.account === "string" && hasSensitiveText(row.account)) syncRedactions += 1;
    if (typeof row.query === "string" && hasSensitiveText(row.query)) syncRedactions += 1;
    if (typeof row.syncRunId === "string" && hasSensitiveText(row.syncRunId)) syncRedactions += 1;
    const parsedRow = syncRunSchema.safeParse({
      syncRunId: row.syncRunId,
      status: row.status,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      counts: row.counts,
      failureScopes: failureScopes.slice(0, 50),
      retryableFailureCount,
      failureCount: failures.length,
    });
    if (parsedRow.success) syncRuns.push(parsedRow.data);
  }

  const latest = syncRuns[0];
  const gmailSync = !latest
    ? "unknown"
    : latest.status === "completed"
      ? "connected"
      : latest.status === "partial"
        ? "degraded"
        : "disconnected";
  const healthParsed = healthOutputSchema.safeParse({
    components: { gmailSync },
    lastGmailSync: {
      state: latest ? latest.status : "none",
      completedAt: latest ? latest.completedAt : null,
    },
  });
  const countsParsed = countsOutputSchema.safeParse({
    reviewRequests: reviewsRaw.length,
    deliveries: deliveriesRaw.length,
    receipts: receiptsRaw.length,
    syncRuns: syncRaw.length,
  });
  if (!healthParsed.success || !countsParsed.success) throw unavailable();
  const health = healthParsed.data;
  const counts = countsParsed.data;

  return {
    health,
    counts,
    syncRuns: syncRuns.slice(0, ROW_LIMIT),
    reviews: reviews.slice(0, ROW_LIMIT),
    deliveries: deliveries.slice(0, ROW_LIMIT),
    receipts: receipts.slice(0, ROW_LIMIT),
    redactions: {
      health: 0,
      counts: 0,
      syncRuns: syncRedactions,
      reviews: reviewRedactions,
      deliveries: deliveryRedactions,
      receipts: receiptRedactions,
    },
  };
}
