import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { ChannelName } from "@/lib/channel-policy";
import type { AdmissionState } from "@/lib/token-contract";

import { getAdmissionStoreDir } from "./token-store";

/**
 * Material admission transitions become authoritative when they are written to
 * this append-only ledger. Snapshots may lag or require repair, but they must
 * stay derivable from the event log.
 */

export interface IntakeEventRecord {
  event_id: string;
  event_type: string;
  occurred_at: string;
  channel: ChannelName;
  intake_id: string;
  issuance_id: string | null;
  thread_id: string | null;
  previous_state: AdmissionState | null;
  next_state: AdmissionState;
  source: string;
  payload?: Record<string, unknown>;
}

function getEventDir(): string {
  return (
    process.env.WITNESSOPS_INTAKE_EVENT_DIR ??
    process.env.WITNESSOPS_TOKEN_AUDIT_DIR ??
    path.join(getAdmissionStoreDir(), "events")
  );
}

function getEventLogPath(): string {
  return path.join(getEventDir(), "events.ndjson");
}

export async function readIntakeEvents(): Promise<IntakeEventRecord[]> {
  try {
    const raw = await readFile(getEventLogPath(), "utf8");

    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        try {
          return JSON.parse(line) as IntakeEventRecord;
        } catch {
          throw new Error(
            `Malformed intake event ledger entry at line ${index + 1}`,
          );
        }
      });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export async function appendIntakeEvent(
  event: Omit<IntakeEventRecord, "event_id"> & { event_id?: string },
): Promise<IntakeEventRecord> {
  const record: IntakeEventRecord = {
    ...event,
    event_id: event.event_id ?? `evt_${randomUUID().replace(/-/g, "")}`,
  };

  await mkdir(getEventDir(), { recursive: true });
  await appendFile(getEventLogPath(), `${JSON.stringify(record)}\n`, "utf8");
  return record;
}
