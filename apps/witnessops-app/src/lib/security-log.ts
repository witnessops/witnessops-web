import "server-only";

/** Closed event vocabulary. Callers cannot attach request bytes, headers, or URLs. */
const EVENTS = ["admission_rejected", "auth_rejected", "lock_contention"] as const;
const REASONS = [
  "unknown_proxy_mode",
  "forwarding_metadata",
  "origin",
  "query",
  "unauthenticated",
  "forbidden",
  "invalid_credential",
  "invalid_session",
  "revoked_session",
  "busy",
] as const;
const STATUSES = new Set<number>([400, 401, 403, 429]);
const REDACTED = '{"event":"auth_rejected","status":0,"reason":"redacted"}';

export type SecurityEventName = (typeof EVENTS)[number];
type SecurityReason = (typeof REASONS)[number];

const seen = new WeakSet<object>();
let sink: (line: string) => void = writeLine;

function writeLine(line: string) {
  process.stdout.write(`${line}\n`);
}

function allowed<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

/** One JSON object. Unknown or unsafe inputs collapse to a fixed redacted line. */
export function formatSecurityEvent(event: string, status: number, reason: string): string {
  if (!allowed(EVENTS, event) || !STATUSES.has(status) || !allowed(REASONS, reason)) return REDACTED;
  const line = JSON.stringify({ event, status, reason });
  if (line.length > 160 || /[@?]/.test(line)) return REDACTED;
  return line;
}

export function logSecurityEvent(event: SecurityEventName, status: number, reason: SecurityReason, error?: object): void {
  if (error) {
    if (seen.has(error)) return;
    seen.add(error);
  }
  sink(formatSecurityEvent(event, status, reason));
}

/** Tests replace the writer and must restore the previous one. */
export function setSecurityLogSink(next: ((line: string) => void) | null): (line: string) => void {
  const previous = sink;
  sink = next ?? writeLine;
  return previous;
}
