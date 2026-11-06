import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getClientIp } from "@witnessops/config/rate-limit";
import { createGoogleCalendarTransport } from "./calendar-transport";
import { LIVE_BOOKING_TIME_ZONE } from "./constants";
import { createResendMailTransport } from "./mail-transport";
import { resolveLiveBookingMode, type ReadyLiveBookingConfig } from "./mode";
import type { BookingDraft } from "./records";
import {
  cancelLiveBooking,
  checkLiveCode,
  confirmLiveBooking,
  liveAvailability,
  LiveBookingFailure,
  prepareLiveHold,
  readLiveSession,
  requestLiveCode,
  startLiveSession,
  storeFailure,
  type LiveBookingDeps,
} from "./service";

const draftSchema = z.object({
  topic: z.string().trim().min(5).max(300),
  stage: z.enum(["planned", "live"]),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
  timezone: z.string().max(80).refine((zone) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: zone });
      return true;
    } catch {
      return false;
    }
  }),
}).strict();

const idempotency = z.string().regex(/^[a-zA-Z0-9_-]{12,80}$/);
const token = z.string().regex(/^[a-f0-9]{64}$/);
const actions = z.union([
  z.object({ action: z.literal("start") }).strict(),
  z.object({ action: z.literal("read"), token }).strict(),
  z.object({ action: z.literal("availability"), token }).strict(),
  z.object({ action: z.literal("request-code"), token, email: z.string().trim().email().max(200), idempotencyKey: idempotency }).strict(),
  z.object({ action: z.literal("check-code"), token, email: z.string().trim().email().max(200), code: z.string().regex(/^\d{6}$/) }).strict(),
  z.object({ action: z.literal("prepare"), token, slotId: z.string().regex(/^waw-\d{8}-\d{4}$/), draft: draftSchema }).strict(),
  z.object({ action: z.literal("confirm"), token, holdId: z.string().regex(/^hld[a-f0-9]{32}$/), idempotencyKey: idempotency }).strict(),
  z.object({ action: z.literal("cancel"), token, reference: z.string().regex(/^bk_[0-9a-v]{20}$/) }).strict(),
  z.object({ action: z.literal("cancel-with-code"), cancelToken: z.string().regex(/^[a-f0-9]{64}$/), reference: z.string().regex(/^bk_[0-9a-v]{20}$/) }).strict(),
]);

function reply(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "cache-control": "no-store", vary: "Origin" } });
}

async function boundedJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value?.byteLength ?? 0;
      if (size > 16_384) throw new Error("too_large");
      if (value) chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function originAllowed(request: Request, expected: string, requiresJson: boolean): boolean {
  if (request.headers.get("origin") !== expected) return false;
  const host = request.headers.get("host")?.toLowerCase();
  if (host !== new URL(expected).host.toLowerCase()) return false;
  if (!requiresJson) return true;
  return request.headers.get("content-type")?.split(";")[0]?.trim() === "application/json";
}

export function productionLiveBookingDeps(config: ReadyLiveBookingConfig, fetchImpl?: typeof fetch): LiveBookingDeps {
  return {
    now: Date.now,
    storeDir: config.storeDir,
    pepper: config.pepper,
    calendar: createGoogleCalendarTransport({
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
      refreshToken: config.googleRefreshToken,
      calendarId: config.calendarId,
      fetchImpl,
    }),
    mail: createResendMailTransport({
      apiKey: config.resendApiKey,
      from: config.fromEmail,
      replyTo: config.replyTo,
      fetchImpl,
    }),
  };
}

function ipHash(pepper: string, request: Request): string {
  return createHash("sha256").update(`${pepper}\0${getClientIp(request)}`).digest("hex");
}

function emailHash(pepper: string, email: string): string {
  return createHash("sha256").update(`${pepper}\0${email.trim().toLowerCase()}`).digest("hex");
}

export async function handleLiveBooking(request: Request, options: { deps?: LiveBookingDeps; env?: NodeJS.ProcessEnv } = {}): Promise<Response> {
  const env = options.env ?? process.env;
  const resolved = await resolveLiveBookingMode(env);
  if (request.method === "GET") {
    if (resolved.mode === "ready" && !originAllowed(request, resolved.config.publicOrigin, false)) return reply({ error: "origin_rejected" }, 403);
    return reply({
      mode: resolved.mode,
      timeZone: resolved.mode === "ready" ? LIVE_BOOKING_TIME_ZONE : null,
      delivery: "not_observed",
    });
  }
  if (request.method !== "POST") return reply({ error: "invalid" }, 405);
  if (resolved.mode === "disabled") return reply({ error: "not_enabled", mode: "disabled", delivery: "not_observed" }, 410);
  if (resolved.mode === "unavailable") return reply({ error: "unavailable", mode: "unavailable", delivery: "not_observed" }, 503);
  if (!originAllowed(request, resolved.config.publicOrigin, true)) return reply({ error: "origin_rejected" }, 403);
  const deps = options.deps ?? productionLiveBookingDeps(resolved.config);
  try {
    const parsed = actions.parse(await boundedJson(request));
    switch (parsed.action) {
      case "start":
        return reply(await startLiveSession(deps, ipHash(resolved.config.pepper, request)));
      case "read":
        return reply(await readLiveSession(deps, parsed.token));
      case "availability":
        return reply(await liveAvailability(deps, parsed.token));
      case "request-code":
        return reply(await requestLiveCode(deps, { token: parsed.token, email: parsed.email, idempotencyKey: parsed.idempotencyKey, emailHash: emailHash(resolved.config.pepper, parsed.email) }));
      case "check-code":
        return reply(await checkLiveCode(deps, parsed));
      case "prepare":
        return reply(await prepareLiveHold(deps, { token: parsed.token, slotId: parsed.slotId, draft: parsed.draft as BookingDraft }));
      case "confirm":
        return reply(await confirmLiveBooking(deps, parsed));
      case "cancel":
        return reply(await cancelLiveBooking(deps, { token: parsed.token, reference: parsed.reference }));
      case "cancel-with-code":
        return reply(await cancelLiveBooking(deps, { cancelToken: parsed.cancelToken, reference: parsed.reference }));
      default: {
        const unreachable: never = parsed;
        return unreachable;
      }
    }
  } catch (error) {
    const known = storeFailure(error);
    if (known) return reply({ error: known.code, delivery: "not_observed" }, known.httpStatus);
    if (error instanceof z.ZodError || error instanceof SyntaxError) return reply({ error: "invalid" }, 400);
    if (error instanceof Error && (error.message === "too_large" || error.message === "invalid")) {
      return reply({ error: error.message }, error.message === "too_large" ? 413 : 400);
    }
    if (error instanceof LiveBookingFailure) return reply({ error: error.code, delivery: "not_observed" }, error.httpStatus);
    console.error("live booking failed", { code: "unhandled" });
    return reply({ error: "unavailable", delivery: "not_observed" }, 503);
  }
}
