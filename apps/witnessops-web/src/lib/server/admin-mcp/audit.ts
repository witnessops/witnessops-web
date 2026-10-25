import "server-only";

import { createHash, createHmac } from "node:crypto";
import { open, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { ADMIN_MCP_AUDIT_DIR, AUDIT_FILE_MAX_BYTES, AUDIT_RETENTION_DAYS } from "./constants";
import { AdminMcpDenial } from "./errors";

/**
 * Append-only JSONL outside core-state.json. Intent is synced before a tool
 * runs. Outcome is synced after. If either write fails, the caller withholds
 * the tool result.
 *
 * Operator retention is 90 days (AUDIT_RETENTION_DAYS). This process does not
 * delete aged files and does not create the directory. A second replica can
 * interleave lines; the hash chain is per process best effort.
 */

const GENESIS = "0".repeat(64);
const RETENTION_NOTE = AUDIT_RETENTION_DAYS;

void RETENTION_NOTE;

const AUDIT_TOOLS = new Set([
  "health_get",
  "dashboard_counts",
  "sync_runs_list",
  "review_requests_list",
  "deliveries_list",
  "receipts_list",
  "initialize",
  "ping",
  "tools/list",
  "notifications/initialized",
  "none",
]);

const RESULT_CODES = new Set([
  "started",
  "ok",
  "forbidden",
  "bad_request",
  "unavailable",
  "unauthorized",
  "budget_exceeded",
  "response_too_large",
  "tool_error",
]);

export interface AuditEvent {
  kind: "intent" | "outcome" | "auth_failures";
  requestId: string;
  clientId: string;
  tool: string;
  resultCode: string;
  argsDigest?: string;
  returnedIds?: readonly string[];
  bytes?: number;
  redactions?: number;
  failureCount?: number;
  minute?: string;
}

let queue: Promise<void> = Promise.resolve();
let authBucket: { minute: string; count: number } | null = null;

function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work, work);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function resetAuditForTests(): void {
  queue = Promise.resolve();
  authBucket = null;
}

export function auditDirectoryConfigured(): string | null {
  const directory = process.env[ADMIN_MCP_AUDIT_DIR]?.trim();
  return directory || null;
}

export async function assertAuditDirectory(): Promise<string> {
  const directory = auditDirectoryConfigured();
  if (!directory) throw new AdminMcpDenial(503, "unavailable");
  try {
    if (!(await stat(directory)).isDirectory()) throw new AdminMcpDenial(503, "unavailable");
  } catch (error) {
    if (error instanceof AdminMcpDenial) throw error;
    throw new AdminMcpDenial(503, "unavailable");
  }
  return directory;
}

function safeClient(clientId: string): string {
  if (clientId === "aggregate") return clientId;
  return /^[a-z0-9][a-z0-9-]{0,62}$/.test(clientId) ? clientId : "aggregate";
}

function safeTool(tool: string): string {
  return AUDIT_TOOLS.has(tool) ? tool : "none";
}

function safeCode(code: string): string {
  return RESULT_CODES.has(code) ? code : "tool_error";
}

function safeIds(ids: readonly string[] | undefined): string[] {
  if (!ids) return [];
  return ids.filter((id) => /^[A-Za-z0-9_-]{1,80}$/.test(id)).slice(0, 50);
}

export function digestArguments(hmacKey: Buffer, value: unknown): string {
  return createHmac("sha256", hmacKey).update(JSON.stringify(value ?? {})).digest("hex");
}

function fileName(day: string, sequence: number): string {
  if (sequence <= 1) return `admin-mcp-${day}.jsonl`;
  return `admin-mcp-${day}.${sequence}.jsonl`;
}

async function previousHash(file: string): Promise<string> {
  try {
    const raw = await readFile(file, "utf8");
    const lines = raw.split("\n").filter((line) => line.length > 0);
    const last = lines[lines.length - 1];
    if (!last) return GENESIS;
    return createHash("sha256").update(last).digest("hex");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return GENESIS;
    throw new AdminMcpDenial(503, "unavailable");
  }
}

async function chooseFile(directory: string, now: number): Promise<{ file: string; prevHash: string }> {
  const day = new Date(now).toISOString().slice(0, 10);
  const names = await readdir(directory);
  let sequence = 1;
  for (const name of names) {
    const match = new RegExp(`^admin-mcp-${day}(?:\\.(\\d+))?\\.jsonl$`).exec(name);
    if (!match) continue;
    const found = match[1] ? Number(match[1]) : 1;
    if (found > sequence) sequence = found;
  }
  const current = path.join(directory, fileName(day, sequence));
  const prevHash = await previousHash(current);
  try {
    if ((await stat(current)).size >= AUDIT_FILE_MAX_BYTES) {
      sequence += 1;
      if (sequence > 100) throw new AdminMcpDenial(503, "unavailable");
      return { file: path.join(directory, fileName(day, sequence)), prevHash };
    }
  } catch (error) {
    if (error instanceof AdminMcpDenial) throw error;
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new AdminMcpDenial(503, "unavailable");
    }
  }
  return { file: current, prevHash };
}

async function appendTo(directory: string, file: string, line: string): Promise<void> {
  const handle = await open(file, "a", 0o600);
  try {
    const payload = Buffer.from(`${line}\n`, "utf8");
    const written = await handle.write(payload);
    if (written.bytesWritten !== payload.byteLength) {
      throw new AdminMcpDenial(503, "unavailable");
    }
    await handle.sync();
  } finally {
    await handle.close();
  }
  const directoryHandle = await open(directory, "r");
  try {
    await directoryHandle.sync();
  } finally {
    await directoryHandle.close();
  }
}

function eventLine(event: AuditEvent, prevHash: string, now: number): string {
  return JSON.stringify({
    v: 1,
    kind: event.kind,
    ts: new Date(now).toISOString(),
    prevHash,
    requestId: /^req_[a-f0-9]{16}$/.test(event.requestId) ? event.requestId : "req_0000000000000000",
    clientId: safeClient(event.clientId),
    tool: safeTool(event.tool),
    resultCode: safeCode(event.resultCode),
    argsDigest: event.argsDigest ?? "",
    returnedIds: safeIds(event.returnedIds),
    bytes: Number.isSafeInteger(event.bytes) ? event.bytes : 0,
    redactions: Number.isSafeInteger(event.redactions) ? event.redactions : 0,
    failureCount: event.failureCount ?? 0,
    minute: event.minute ?? "",
  });
}

export async function writeAuditEvent(event: AuditEvent, now: number): Promise<void> {
  await enqueue(async () => {
    const directory = await assertAuditDirectory();
    await flushClosedAuthBucket(directory, now);
    const chosen = await chooseFile(directory, now);
    await appendTo(directory, chosen.file, eventLine(event, chosen.prevHash, now));
  });
}

async function flushClosedAuthBucket(directory: string, now: number): Promise<void> {
  if (!authBucket || authBucket.count === 0) return;
  const minute = new Date(now).toISOString().slice(0, 16);
  if (authBucket.minute === minute) return;
  const bucket = authBucket;
  authBucket = null;
  const chosen = await chooseFile(directory, now);
  const line = eventLine(
    {
      kind: "auth_failures",
      requestId: "req_0000000000000000",
      clientId: "aggregate",
      tool: "none",
      resultCode: "unauthorized",
      failureCount: bucket.count,
      minute: bucket.minute,
    },
    chosen.prevHash,
    now,
  );
  await appendTo(directory, chosen.file, line);
}

export async function noteAuthFailureAudit(now: number): Promise<void> {
  const minute = new Date(now).toISOString().slice(0, 16);
  await enqueue(async () => {
    const directory = auditDirectoryConfigured();
    if (!directory) return;
    try {
      if (!(await stat(directory)).isDirectory()) return;
      await flushClosedAuthBucket(directory, now);
    } catch {
      return;
    }
    if (!authBucket || authBucket.minute !== minute) {
      authBucket = { minute, count: 0 };
    }
    authBucket.count += 1;
  });
}

export function auditQueueForTests(): Promise<void> {
  return queue;
}
