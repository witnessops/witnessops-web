/**
 * Local-only ledger of operator-initiated delivery retry requests (WEB-002).
 *
 * IMPORTANT: this ledger is web-side state ONLY. It records the *intent* to
 * retry delivery for a control-plane run. It is not delivery truth.
 *
 *  - delivered / acknowledged / completed remain control-plane authority
 *    (CP-001 / CP-002).
 *  - A retry request never marks a run as delivered. Successful recovery
 *    is observed through the next control-plane lifecycle read.
 *
 * Storage shape: append-only NDJSON, one row per request, sibling to the
 * existing intake event ledger.
 */
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getAdmissionStoreDir } from "./token-store";

export interface DeliveryRetryRequestRecord {
  event_id: string;
  run_id: string;
  requested_at: string;
  requested_by: string;
  reason: string;
}

function getEventDir(): string {
  return (
    process.env.WITNESSOPS_INTAKE_EVENT_DIR ??
    process.env.WITNESSOPS_TOKEN_AUDIT_DIR ??
    path.join(getAdmissionStoreDir(), "events")
  );
}

function getLedgerPath(): string {
  return path.join(getEventDir(), "delivery-retries.ndjson");
}

export async function readDeliveryRetryRequests(): Promise<
  DeliveryRetryRequestRecord[]
> {
  try {
    const raw = await readFile(getLedgerPath(), "utf8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        try {
          return JSON.parse(line) as DeliveryRetryRequestRecord;
        } catch {
          throw new Error(
            `Malformed delivery retry ledger entry at line ${index + 1}`,
          );
        }
      });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function readDeliveryRetryRequestsForRun(
  runId: string,
): Promise<DeliveryRetryRequestRecord[]> {
  const all = await readDeliveryRetryRequests();
  return all.filter((r) => r.run_id === runId);
}

export async function getLatestDeliveryRetryRequest(
  runId: string,
): Promise<DeliveryRetryRequestRecord | null> {
  const rows = await readDeliveryRetryRequestsForRun(runId);
  if (rows.length === 0) return null;
  // Append-only ledger; latest row is the latest request.
  return rows[rows.length - 1] ?? null;
}

export async function appendDeliveryRetryRequest(
  input: Omit<DeliveryRetryRequestRecord, "event_id" | "requested_at"> & {
    event_id?: string;
    requested_at?: string;
  },
): Promise<DeliveryRetryRequestRecord> {
  const record: DeliveryRetryRequestRecord = {
    event_id: input.event_id ?? `evt_${randomUUID().replace(/-/g, "")}`,
    run_id: input.run_id,
    requested_at: input.requested_at ?? new Date().toISOString(),
    requested_by: input.requested_by,
    reason: input.reason,
  };
  await mkdir(getEventDir(), { recursive: true });
  await appendFile(getLedgerPath(), `${JSON.stringify(record)}\n`, "utf8");
  return record;
}
