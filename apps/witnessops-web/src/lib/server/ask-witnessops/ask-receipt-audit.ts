import "server-only";

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

import type { ActorIdentity, AccessDecision } from "./ask-receipt-access-policy";

/**
 * WITNESSOPS_ASK_RUNTIME_RECEIPT_AUDIT_V1
 *
 * Durable audit writer for Ask receipt retrieval.
 * Events are written atomically with content hash for integrity.
 * This is separate custody from the receipt store.
 * Console output is for ops visibility only; durable files are the custody.
 */

export interface ReceiptAuditEvent {
  readonly schema: "witnessops.ask.receipt-audit.v1";
  readonly audit_id: string;
  readonly timestamp: string;
  readonly event: "receipt_retrieved" | "retrieval_denied" | "retrieval_failed";
  readonly actor: ActorIdentity | null;
  readonly receipt_id?: string;
  readonly receipt_class_id?: string;
  readonly decision: AccessDecision;
  readonly details?: string;
  readonly retrieval_view?: string;
}

const DEFAULT_AUDIT_ROOT = path.resolve(
  process.env.ASK_AUDIT_ROOT || "/var/lib/witnessops/ask-audits"
);

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

function auditPath(auditId: string, root: string = DEFAULT_AUDIT_ROOT): string {
  const safeId = auditId.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return path.join(root, `${safeId}.json`);
}

function computeContentHash(obj: unknown): string {
  const canonical = JSON.stringify(canonicalize(obj));
  return createHash("sha256").update(canonical).digest("hex");
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, canonicalize(record[key])]),
  );
}

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function writeAuditEvent(
  event: ReceiptAuditEvent,
  root: string = DEFAULT_AUDIT_ROOT
): Promise<{ ok: true; path: string } | { ok: false; reason: string }> {
  ensureDir(root);

  const targetPath = auditPath(event.audit_id, root);
  const tempPath = `${targetPath}.tmp.${process.pid}.${Date.now()}`;

  try {
    const payload = {
      ...event,
      _content_hash: computeContentHash({ ...event, _content_hash: undefined }),
    };

    const data = JSON.stringify(payload, null, 2);

    await fs.promises.writeFile(tempPath, data, { mode: 0o600 });
    const fd = await fs.promises.open(tempPath, "r+");
    await fd.sync();
    await fd.close();

    // Verify
    const written = await fs.promises.readFile(tempPath, "utf8");
    const writtenObj = JSON.parse(written) as { _content_hash?: unknown };
    if (writtenObj._content_hash !== payload._content_hash) {
      await fs.promises.unlink(tempPath).catch(() => {});
      return { ok: false, reason: "WRITE_VERIFICATION_FAILED" };
    }

    try {
      await fs.promises.rename(tempPath, targetPath);
    } catch (renameError: unknown) {
      await fs.promises.unlink(tempPath).catch(() => {});
      if (errorCode(renameError) === "EEXIST") {
        return { ok: false, reason: "AUDIT_ALREADY_EXISTS" };
      }
      throw renameError;
    }

    // Also emit for operational visibility (not custody)
    console.log(JSON.stringify({
      event: "ask_receipt_audit_written",
      audit_id: event.audit_id,
      receipt_id: event.receipt_id,
      success: true,
    }));

    return { ok: true, path: targetPath };
  } catch (error: unknown) {
    await fs.promises.unlink(tempPath).catch(() => {});
    return { ok: false, reason: `AUDIT_WRITE_FAILED: ${errorMessage(error)}` };
  }
}
