import "server-only";

import {
  checkRateLimit,
  getClientIp,
  scheduleRateLimitCleanup,
  _resetAllStores,
} from "@witnessops/config/rate-limit";

import {
  AUTH_FAILURE_BLOCK_MS,
  AUTH_FAILURE_LIMIT,
  AUTH_FAILURE_WINDOW_MS,
  CLIENT_LIMIT,
  CLIENT_WINDOW_MS,
  DAILY_ROW_BUDGET,
  MAX_IN_FLIGHT,
  PRE_AUTH_IP_LIMIT,
  PRE_AUTH_WINDOW_MS,
} from "./constants";

/**
 * In-memory and per process. Counters reset when the process restarts.
 * This is best effort. It is not a global limiter. The durable controls are
 * token expiry and the revocation marker.
 */
scheduleRateLimitCleanup(PRE_AUTH_WINDOW_MS);

const PRE_AUTH_NAMESPACE = "admin-mcp-pre-auth-ip";
const CLIENT_NAMESPACE = "admin-mcp-client";

interface FailureState {
  failures: number[];
  blockedUntil: number;
}

const failures = new Map<string, FailureState>();
const inFlight = new Map<string, number>();
const dailyRows = new Map<string, number>();

export interface LimitDecision {
  ok: boolean;
  retryAfterSeconds: number;
}

function denied(retryAfterSeconds: number): LimitDecision {
  return { ok: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
}

export function consumePreAuthIp(request: Request): LimitDecision {
  const result = checkRateLimit(PRE_AUTH_NAMESPACE, getClientIp(request), {
    limit: PRE_AUTH_IP_LIMIT,
    windowMs: PRE_AUTH_WINDOW_MS,
  });
  if (result.allowed) return { ok: true, retryAfterSeconds: 0 };
  return denied(result.retryAfterSeconds);
}

export function authFailureBlocked(request: Request, now: number): LimitDecision {
  const state = failures.get(getClientIp(request));
  if (!state || now >= state.blockedUntil) return { ok: true, retryAfterSeconds: 0 };
  return denied(Math.ceil((state.blockedUntil - now) / 1000));
}

export function noteAuthFailure(request: Request, now: number): void {
  const ip = getClientIp(request);
  const state = failures.get(ip) ?? { failures: [], blockedUntil: 0 };
  state.failures = state.failures.filter((stamp) => now - stamp < AUTH_FAILURE_WINDOW_MS);
  state.failures.push(now);
  if (state.failures.length >= AUTH_FAILURE_LIMIT) {
    state.blockedUntil = now + AUTH_FAILURE_BLOCK_MS;
  }
  failures.set(ip, state);
}

export function consumeClient(clientId: string): LimitDecision {
  const result = checkRateLimit(CLIENT_NAMESPACE, clientId, {
    limit: CLIENT_LIMIT,
    windowMs: CLIENT_WINDOW_MS,
  });
  if (result.allowed) return { ok: true, retryAfterSeconds: 0 };
  return denied(result.retryAfterSeconds);
}

export function tryAcquire(clientId: string): boolean {
  const current = inFlight.get(clientId) ?? 0;
  if (current >= MAX_IN_FLIGHT) return false;
  inFlight.set(clientId, current + 1);
  return true;
}

export function releaseInFlight(clientId: string): void {
  const current = inFlight.get(clientId) ?? 0;
  if (current <= 1) inFlight.delete(clientId);
  else inFlight.set(clientId, current - 1);
}

function dayKey(clientId: string, now: number): string {
  return `${clientId}:${new Date(now).toISOString().slice(0, 10)}`;
}

export function reserveRows(clientId: string, rows: number, now: number): boolean {
  if (rows < 0) return false;
  const key = dayKey(clientId, now);
  const used = dailyRows.get(key) ?? 0;
  if (used + rows > DAILY_ROW_BUDGET) return false;
  dailyRows.set(key, used + rows);
  return true;
}

export function resetAdminMcpLimitsForTests(): void {
  failures.clear();
  inFlight.clear();
  dailyRows.clear();
  _resetAllStores();
}
