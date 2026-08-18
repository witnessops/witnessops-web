// ──────────────────────────────────────────────────────────────────
// Instance-local, best-effort rate limiting for Next.js API routes.
//
// This is NOT a global or distributed rate limiter. Each server
// instance maintains its own counters. It is intended to reduce
// cheap abuse and burst pressure on public verification routes.
//
// It does not replace edge/WAF/global rate controls.
// ──────────────────────────────────────────────────────────────────

// ── Client identity ──

/**
 * Extract client IP from request headers using common proxy conventions.
 *
 * This is app-layer best effort. It uses the first x-forwarded-for hop
 * when that value looks like an IP, then x-real-ip. Values that are not
 * IPv4/IPv6, and requests with neither header, return "unknown" so they
 * share one rate-limit bucket instead of minting a unique key per spoof.
 *
 * Do not treat these headers as a cryptographic client identity.
 */
function isLikelyClientIp(value: string): boolean {
  if (!value || value.length > 45 || value === "unknown") {
    return false;
  }

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value);
  if (ipv4) {
    return ipv4.slice(1).every((octet) => Number(octet) <= 255);
  }

  return value.includes(":") && /^[0-9a-fA-F:.]+$/.test(value);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && isLikelyClientIp(first)) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && isLikelyClientIp(realIp)) return realIp;

  return "unknown";
}

// ── Rate limit state ──

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitConfig {
  /** Maximum requests per window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(namespace: string): Map<string, RateLimitEntry> {
  let store = stores.get(namespace);
  if (!store) {
    store = new Map();
    stores.set(namespace, store);
  }
  return store;
}

/**
 * Check whether a request should be allowed under the rate limit.
 *
 * @param namespace - Isolates counters per route (e.g., "verify" or "verify-canonical")
 * @param key - Client identity key (typically IP address)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  namespace: string,
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const store = getStore(namespace);
  const entry = store.get(key);

  // Window expired or first request — reset
  if (!entry || now - entry.windowStart >= config.windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: config.limit - 1,
      retryAfterSeconds: 0,
    };
  }

  // Within window
  if (entry.count < config.limit) {
    entry.count += 1;
    return {
      allowed: true,
      remaining: config.limit - entry.count,
      retryAfterSeconds: 0,
    };
  }

  // Over limit
  const windowEnd = entry.windowStart + config.windowMs;
  const retryAfterMs = Math.max(0, windowEnd - now);
  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
  };
}

// ── Periodic cleanup ──
// Prevent unbounded memory growth by removing expired entries every 5 minutes.

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function cleanupExpiredEntries(windowMs: number) {
  const now = Date.now();
  for (const store of stores.values()) {
    for (const [key, entry] of store) {
      if (now - entry.windowStart >= windowMs) {
        store.delete(key);
      }
    }
  }
}

let cleanupScheduled = false;

/** Call once at module load to schedule periodic cleanup. */
export function scheduleRateLimitCleanup(windowMs: number): void {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  setInterval(() => cleanupExpiredEntries(windowMs), CLEANUP_INTERVAL_MS).unref();
}

// ── Rate limit response ──

export interface RateLimitErrorBody {
  ok: false;
  error: "Rate limit exceeded";
  code: "RATE_LIMITED";
  retryAfterSeconds: number;
}

export function rateLimitErrorBody(retryAfterSeconds: number): RateLimitErrorBody {
  return {
    ok: false,
    error: "Rate limit exceeded",
    code: "RATE_LIMITED",
    retryAfterSeconds,
  };
}

// ── Convenience: default verify policy ──

export const VERIFY_RATE_LIMIT_CONFIG: RateLimitConfig = {
  limit: 10,
  windowMs: 60_000, // 1 minute
};

// ── Test support ──

/** Reset all rate limit state. Only use in tests. */
export function _resetAllStores(): void {
  stores.clear();
}
