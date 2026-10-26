import "server-only";
import { isIP } from "node:net";

/**
 * Client address from the app proxy contract. The host Caddy snippet overwrites
 * X-Forwarded-For and X-Real-IP from the accepted connection. That snippet is
 * source only until a separate operator action applies it.
 *
 * A missing or unparseable address is null. Callers must not put those
 * requests in one shared bucket. The existing global or per-resource limits
 * still apply in that case.
 */
export function clientIpFromProxy(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded !== null) {
    const hop = forwarded.split(",").at(-1)?.trim() ?? "";
    return isLikelyClientIp(hop) ? hop : null;
  }
  const real = request.headers.get("x-real-ip")?.trim() ?? "";
  return isLikelyClientIp(real) ? real : null;
}

function isLikelyClientIp(value: string): boolean {
  if (!value || value.length > 45 || value === "unknown") return false;
  return isIP(value) !== 0;
}

export const CLI_LOGIN_IP_LIMIT = 10;
export const CLI_LOGIN_IP_WINDOW_MS = 60_000;
export const SHARE_UNLOCK_IP_LIMIT = 10;
export const SHARE_UNLOCK_IP_WINDOW_MS = 15 * 60_000;
const MAX_TRACKED_IPS = 4096;

type Bucket = { count: number; windowStart: number };

/**
 * Process-local fixed window. Not an edge limiter and not shared across
 * processes. Null addresses are allowed here so they cannot collapse into
 * one bucket. When the table is full, a new address is also allowed rather
 * than folded into a shared overflow bucket; global and per-resource limits
 * remain. Pass a clock so tests can move the window.
 */
export class ClientIpLimiter {
  private readonly buckets = new Map<string, Bucket>();
  constructor(private readonly limit: number, private readonly windowMs: number, private readonly now: () => number = Date.now) {}
  allow(ip: string | null): { allowed: boolean; retryAfterSeconds: number } {
    if (ip === null) return { allowed: true, retryAfterSeconds: 0 };
    const now = this.now();
    this.prune(now);
    const entry = this.buckets.get(ip);
    if (!entry && this.buckets.size >= MAX_TRACKED_IPS) return { allowed: true, retryAfterSeconds: 0 };
    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.buckets.set(ip, { count: 1, windowStart: now });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (entry.count < this.limit) {
      entry.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    }
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.windowStart + this.windowMs - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }
  private prune(now: number) {
    for (const [ip, entry] of this.buckets) {
      if (now - entry.windowStart >= this.windowMs) this.buckets.delete(ip);
    }
  }
}
