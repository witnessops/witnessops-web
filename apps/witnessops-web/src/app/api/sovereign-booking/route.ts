import { z } from "zod";
import { BookingSession, draftSchema, expireSessions, sessions } from "@/lib/sovereign-booking-session";
import { connectBookingVoice } from "@/lib/sovereign-booking-live";
import { DEMO_EMAIL_CODE, DemoBookingError } from "@/components/ask-sovereign/demo-booking-calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const string = z.string().min(1).max(100);
const actions = z.union([
  z.object({ action: z.literal("start") }).strict(),
  z.object({ action: z.enum(["read", "availability", "release", "heartbeat", "voice-stop", "end", "conflict", "expire"]), token: string }).strict(),
  z.object({ action: z.literal("prepare"), token: string, slotId: string, draft: draftSchema, replaces: string.optional(), code: z.literal(DEMO_EMAIL_CODE) }).strict(),
  z.object({ action: z.literal("confirm"), token: string, holdId: string }).strict(),
  z.object({ action: z.literal("cancel"), token: string, reference: string }).strict(),
  z.object({ action: z.literal("voice-start"), token: string, sdp: z.string().min(10).max(60_000), locale: z.enum(["en", "pl"]) }).strict(),
  z.object({ action: z.literal("voice-handoff"), token: string, revision: z.number().int().nonnegative() }).strict(),
]);
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "Vary": "Origin" } });

// Local preview only, regardless of flags or credentials in a production build.
function previewRequestAllowed(request: Request) {
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (!/^(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(host)) return false;
  return request.headers.get("origin") === `http://${host}` && request.headers.get("content-type")?.split(";")[0] === "application/json";
}

async function boundedJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid");
  let size = 0; const chunks: Uint8Array[] = [];
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 65_536) throw new Error("too_large"); chunks.push(value); } }
  finally { await reader.cancel(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_WO_PREVIEW !== "1") return reply({ error: "preview_closed" }, 410);
  if (!previewRequestAllowed(request)) return reply({ error: "origin_rejected" }, 403);
  try {
    const parsed = actions.parse(await boundedJson(request));
    expireSessions();
    if (parsed.action === "start") {
      if (sessions().size >= 16) return reply({ error: "preview_busy" }, 429);
      const session = new BookingSession(); sessions().set(session.token, session);
      return reply({ token: session.token, voiceAvailable: Boolean(process.env.OPENAI_API_KEY), ...session.view() });
    }
    if (!("token" in parsed)) return reply({ error: "invalid" }, 400);
    const session = sessions().get(parsed.token);
    if (!session) return reply({ error: "session_expired" }, 401);
    session.touchedAt = Date.now();
    switch (parsed.action) {
      case "read": return reply(session.view());
      case "availability": return reply({ slots: session.calendar.available(session.booking?.status === "confirmed" ? session.booking.reference : undefined) });
      case "release": session.invalidate(); return reply(session.view());
      case "prepare": {
        const input = parsed;
        if (session.voice || session.voiceStarting) return reply({ error: "finish_voice_first" }, 409);
        session.invalidate();
        session.hold = session.calendar.prepare(input.slotId, input.draft, input.replaces);
        return reply({ hold: session.hold });
      }
      case "confirm": {
        const { holdId } = parsed;
        if (session.lastConfirmed === holdId) return reply({ booking: session.booking });
        if (session.voice || session.voiceStarting || session.hold?.id !== holdId) return reply({ error: "expired" }, 409);
        session.booking = session.calendar.confirm(holdId); session.lastConfirmed = holdId; session.invalidate();
        return reply({ booking: session.booking });
      }
      case "cancel": {
        const { reference } = parsed;
        session.invalidate(); session.booking = session.calendar.cancel(reference);
        session.voice?.notify(JSON.stringify({ booking: session.booking })); return reply({ booking: session.booking });
      }
      case "conflict": if (session.hold) session.calendar.simulateConflict(session.hold.slot.id); return reply({ ok: true });
      case "expire": if (session.hold) session.calendar.expire(session.hold.id); return reply({ ok: true });
      case "heartbeat": if (session.voice) session.voice.lastHeartbeat = Date.now(); return reply(session.view());
      case "voice-start": {
        const { sdp, locale } = parsed;
        if ([...sessions().values()].filter((value) => value.voice || value.voiceStarting).length >= 2) return reply({ error: "voice_busy_or_limit" }, 429);
        session.invalidate(); return reply(await connectBookingVoice(session, sdp, locale));
      }
      case "voice-handoff": {
        // Claim the exact current proposal before ending voice. An earlier read
        // response is not authority to discard a correction received since then.
        if (session.revision !== parsed.revision || session.proposal?.revision !== parsed.revision) return reply({ accepted: false });
        session.voiceGeneration++;
        const view = session.view();
        const finalized = await session.voice?.stop() ?? !session.voiceStarting;
        if (session.revision !== parsed.revision) return reply({ accepted: false });
        session.invalidate();
        return reply({ accepted: true, view: { ...view, voice: "off" }, finalized });
      }
      case "voice-stop": case "end": {
        session.voiceGeneration++;
        const finalized = await session.voice?.stop() ?? !session.voiceStarting;
        session.invalidate();
        if (parsed.action === "end") sessions().delete(session.token);
        return reply({ finalized });
      }
      default: return reply({ error: "invalid" }, 400);
    }
  } catch (error) {
    if (error instanceof DemoBookingError) return reply({ error: error.code }, 409);
    if (error instanceof z.ZodError || error instanceof SyntaxError) return reply({ error: "invalid" }, 400);
    const code = error instanceof Error && ["voice_not_configured", "voice_busy_or_limit", "voice_cancelled", "too_large"].includes(error.message) ? error.message : "voice_unavailable";
    return reply({ error: code }, code === "too_large" ? 413 : 503);
  }
}
