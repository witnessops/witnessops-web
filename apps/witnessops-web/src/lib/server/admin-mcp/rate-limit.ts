import "server-only";

import {
  checkRateLimit,
  getClientIp,
  scheduleRateLimitCleanup,
  _resetAllStores,
} from "@witnessops/config/rate-limit";

import { parseClientId, readBearer } from "./auth";
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
/**
 * Admission expiry for unknown-IP pre-auth keys. The shared limiter prunes
 * expired windows; this map caps how many of those keys are created.
 */
const unknownPreAuthUntil = new Map<string, number>();

/** getClientIp's shared fallback. A real address is any other return value. */
const UNKNOWN_IP = "unknown";
/** Malformed or absent bearer. Not a valid client id, so it cannot collide. */
const UNKNOWN_PLACEHOLDER_KEY = "unknown:";
/**
 * Token config accepts at most 32 entries. Claimed client buckets on the
 * unknown-IP path stop at that same bound.
 */
const MAX_UNKNOWN_CLIENT_BUCKETS = 32;

export interface LimitDecision {
  ok: boolean;
  retryAfterSeconds: number;
}

function denied(retryAfterSeconds: number): LimitDecision {
  return { ok: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
}

function isUnknownClientKey(key: string): boolean {
  return key.startsWith(`${UNKNOWN_IP}:`) && key !== UNKNOWN_PLACEHOLDER_KEY;
}

function claimedUnknownKey(request: Request): string {
  const clientId = parseClientId(readBearer(request));
  if (clientId === null) return UNKNOWN_PLACEHOLDER_KEY;
  return `${UNKNOWN_IP}:${clientId}`;
}

function countUnknownClients(keys: Iterable<string>): number {
  let count = 0;
  for (const key of keys) {
    if (isUnknownClientKey(key)) count += 1;
  }
  return count;
}

function pruneExpired(map: Map<string, number>, now: number): void {
  for (const [key, expiresAt] of map) {
    if (now >= expiresAt) map.delete(key);
  }
}

function admitUnknownPreAuth(key: string, now: number): boolean {
  pruneExpired(unknownPreAuthUntil, now);
  if (key === UNKNOWN_PLACEHOLDER_KEY || unknownPreAuthUntil.has(key)) {
    unknownPreAuthUntil.set(key, now + PRE_AUTH_WINDOW_MS);
    return true;
  }
  if (countUnknownClients(unknownPreAuthUntil.keys()) >= MAX_UNKNOWN_CLIENT_BUCKETS) return false;
  unknownPreAuthUntil.set(key, now + PRE_AUTH_WINDOW_MS);
  return true;
}

function recordFailure(key: string, now: number): void {
  const state = failures.get(key) ?? { failures: [], blockedUntil: 0 };
  state.failures = state.failures.filter((stamp) => now - stamp < AUTH_FAILURE_WINDOW_MS);
  state.failures.push(now);
  if (state.failures.length >= AUTH_FAILURE_LIMIT) {
    state.blockedUntil = now + AUTH_FAILURE_BLOCK_MS;
  }
  failures.set(key, state);
}

function failureDecision(key: string, now: number): LimitDecision {
  const state = failures.get(key);
  if (!state || now >= state.blockedUntil) return { ok: true, retryAfterSeconds: 0 };
  return denied(Math.ceil((state.blockedUntil - now) / 1000));
}

function pruneUnknownFailures(now: number): void {
  for (const [key, state] of failures) {
    if (!key.startsWith(`${UNKNOWN_IP}:`)) continue;
    const live = state.failures.some((stamp) => now - stamp < AUTH_FAILURE_WINDOW_MS);
    if (!live && now >= state.blockedUntil) failures.delete(key);
  }
}

function canTrackUnknownFailure(key: string, now: number): boolean {
  pruneUnknownFailures(now);
  if (key === UNKNOWN_PLACEHOLDER_KEY || failures.has(key)) return true;
  return countUnknownClients(failures.keys()) < MAX_UNKNOWN_CLIENT_BUCKETS;
}

function preAuthDecision(key: string): LimitDecision {
  const result = checkRateLimit(PRE_AUTH_NAMESPACE, key, {
    limit: PRE_AUTH_IP_LIMIT,
    windowMs: PRE_AUTH_WINDOW_MS,
  });
  if (result.allowed) return { ok: true, retryAfterSeconds: 0 };
  return denied(result.retryAfterSeconds);
}

export function consumePreAuthIp(request: Request): LimitDecision {
  const ip = getClientIp(request);
  if (ip !== UNKNOWN_IP) return preAuthDecision(ip);
  const key = claimedUnknownKey(request);
  if (!admitUnknownPreAuth(key, Date.now())) return denied(Math.ceil(PRE_AUTH_WINDOW_MS / 1000));
  return preAuthDecision(key);
}

export function authFailureBlocked(request: Request, now: number): LimitDecision {
  const ip = getClientIp(request);
  if (ip !== UNKNOWN_IP) return failureDecision(ip, now);
  const key = claimedUnknownKey(request);
  if (!canTrackUnknownFailure(key, now)) return denied(Math.ceil(AUTH_FAILURE_WINDOW_MS / 1000));
  return failureDecision(key, now);
}

export function noteAuthFailure(request: Request, now: number): void {
  const ip = getClientIp(request);
  if (ip !== UNKNOWN_IP) {
    recordFailure(ip, now);
    return;
  }
  const key = claimedUnknownKey(request);
  if (!canTrackUnknownFailure(key, now)) return;
  recordFailure(key, now);
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
  unknownPreAuthUntil.clear();
  _resetAllStores();
}
