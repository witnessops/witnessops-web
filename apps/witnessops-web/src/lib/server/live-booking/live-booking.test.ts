import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { POST as previewPost } from "@/app/api/sovereign-booking/route";
import { LIVE_BOOKING_CALENDAR_ID, LIVE_BOOKING_GOOGLE_SCOPES, LIVE_BOOKING_TIME_ZONE } from "./constants";
import { assertLiveBookingEgress } from "./egress";
import { handleLiveBooking } from "./handler";
import { confirmationMail, inviteMail, verificationMail } from "./mail-copy";
import { createGoogleCalendarTransport } from "./calendar-transport";
import { createResendMailTransport } from "./mail-transport";
import { configFromEnv } from "./mode";
import type { BookingDraft } from "./records";
import {
  cancelLiveBooking,
  checkLiveCode,
  confirmLiveBooking,
  liveAvailability,
  LiveBookingFailure,
  prepareLiveHold,
  requestLiveCode,
  sha256,
  startLiveSession,
  type LiveBookingDeps,
} from "./service";
import { claimSlotRace } from "./store";

const webRoot = path.resolve(__dirname, "../../../..");
const draft: BookingDraft = {
  topic: "Synthetic agent refunds",
  stage: "planned",
  name: "Synthetic Person",
  email: "synthetic@example.test",
  timezone: "Europe/Warsaw",
};

function pepper(): string {
  return "synthetic-pepper-not-a-secret-0123456789";
}

async function tempStore(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "live-booking-"));
}

type Sent = { role: string; idempotencyKey: string; text: string; ics?: string };
type CalendarCall = { url?: string; body?: string; method?: string };

function fakes(options: { insert?: "ok" | "unknown" | "rejected"; overlap?: boolean; free?: "ok" | "unknown" } = {}) {
  const sent: Sent[] = [];
  const calls = { insert: 0, get: 0, cancel: 0, list: 0, free: 0 };
  let landed = false;
  const calendar = {
    async freeBusy() {
      calls.free += 1;
      if (options.free === "unknown") return { kind: "unknown" as const };
      return { kind: "ok" as const, busy: [] };
    },
    async getEvent(eventId: string) {
      calls.get += 1;
      if (!landed) return { kind: "absent" as const };
      return { kind: "ok" as const, iCalUid: `${eventId}@example.test`, status: "confirmed" };
    },
    async insertEvent() {
      calls.insert += 1;
      if (options.insert === "rejected") return { kind: "rejected" as const };
      landed = true;
      if (options.insert === "unknown") return { kind: "unknown" as const };
      return { kind: "ok" as const, iCalUid: "synthetic-uid@example.test" };
    },
    async listBlocking() {
      calls.list += 1;
      return { kind: "ok" as const, overlaps: Boolean(options.overlap) };
    },
    async cancelEvent() {
      calls.cancel += 1;
      return { kind: "ok" as const };
    },
  };
  const mail = {
    async send(message: { role: string; idempotencyKey: string; text: string; ics?: { content: string } }) {
      sent.push({ role: message.role, idempotencyKey: message.idempotencyKey, text: message.text, ics: message.ics?.content });
      return { kind: "accepted" as const, id: `synthetic-${message.role}` };
    },
  };
  return { calendar, mail, sent, calls, markLanded: () => { landed = true; } };
}

function deps(storeDir: string, nowRef: { value: number }, fake: ReturnType<typeof fakes>, code = "102030"): LiveBookingDeps {
  return {
    now: () => nowRef.value,
    storeDir,
    pepper: pepper(),
    calendar: fake.calendar,
    mail: fake.mail,
    newCode: () => code,
  };
}

async function readyEnv(storeDir: string): Promise<NodeJS.ProcessEnv> {
  return {
    ...process.env,
    NODE_ENV: "production",
    NEXT_PUBLIC_WO_PREVIEW: "1",
    WITNESSOPS_LIVE_BOOKING_ENABLED: "1",
    WITNESSOPS_LIVE_BOOKING_STORE_DIR: storeDir,
    WITNESSOPS_LIVE_BOOKING_PUBLIC_ORIGIN: "https://booking.example.test",
    WITNESSOPS_LIVE_BOOKING_FROM_EMAIL: "bookings@example.test",
    WITNESSOPS_LIVE_BOOKING_CODE_PEPPER: pepper(),
    WITNESSOPS_RESEND_API_KEY: "synthetic-resend-key-not-real",
    WITNESSOPS_MAIL_PROVIDER: "resend",
    WITNESSOPS_LIVE_BOOKING_GOOGLE_CLIENT_ID: "synthetic-client-id-xxxx",
    WITNESSOPS_LIVE_BOOKING_GOOGLE_CLIENT_SECRET: "synthetic-client-secret",
    WITNESSOPS_LIVE_BOOKING_GOOGLE_REFRESH_TOKEN: "synthetic-refresh-token",
    WITNESSOPS_LIVE_BOOKING_CALENDAR_ID: LIVE_BOOKING_CALENDAR_ID,
    WITNESSOPS_LIVE_BOOKING_TIME_ZONE: LIVE_BOOKING_TIME_ZONE,
  };
}

function liveRequest(body: unknown, origin = "https://booking.example.test"): Request {
  return new Request(`${origin}/api/live-booking`, {
    method: "POST",
    headers: { origin, host: "booking.example.test", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("production stays disabled and incomplete config stays unavailable without provider calls", async () => {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    throw new Error("unexpected egress");
  };
  const saved = { ...process.env };
  try {
    Object.assign(process.env, { NODE_ENV: "production" });
    process.env.NEXT_PUBLIC_WO_PREVIEW = "1";
    delete process.env.WITNESSOPS_LIVE_BOOKING_ENABLED;
    const disabled = await handleLiveBooking(liveRequest({ action: "start" }));
    assert.equal(disabled.status, 410);
    assert.equal((await disabled.json()).error, "not_enabled");
    const preview = await previewPost(new Request("http://localhost:3012/api/sovereign-booking", {
      method: "POST",
      headers: { origin: "http://localhost:3012", host: "localhost:3012", "content-type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    }));
    assert.equal(preview.status, 410);
    process.env.WITNESSOPS_LIVE_BOOKING_ENABLED = "1";
    delete process.env.WITNESSOPS_LIVE_BOOKING_STORE_DIR;
    const unavailable = await handleLiveBooking(liveRequest({ action: "start" }));
    assert.equal(unavailable.status, 503);
    assert.equal((await unavailable.json()).mode, "unavailable");
    assert.deepEqual(calls, []);
    assert.equal(configFromEnv(process.env).mode, "unavailable");
  } finally {
    globalThis.fetch = original;
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});

test("mail roles stay separate and Google writes request sendUpdates=none", async () => {
  const verification = verificationMail({ to: draft.email, verificationId: "vf0123456789abcdef0123456789abcdef", code: "102030" });
  const confirmation = confirmationMail({ to: draft.email, bookingId: "bk_0123456789abcdefghij", draft, start: "2026-11-06T14:00:00.000Z", end: "2026-11-06T14:20:00.000Z" });
  const invitation = inviteMail({ to: draft.email, bookingId: "bk_0123456789abcdefghij", draft, start: "2026-11-06T14:00:00.000Z", end: "2026-11-06T14:20:00.000Z", uid: "synthetic-uid@example.test" });
  assert.equal(verification.role, "verification");
  assert.equal(confirmation.role, "confirmation");
  assert.equal(invitation.role, "invite");
  assert.equal(verification.ics, undefined);
  assert.equal(confirmation.ics, undefined);
  assert.match(confirmation.text, /not the calendar invitation/);
  assert.doesNotMatch(confirmation.text, /BEGIN:VCALENDAR/);
  assert.equal(invitation.ics?.method, "REQUEST");
  assert.match(invitation.ics?.content ?? "", /METHOD:REQUEST/);
  assert.deepEqual([...LIVE_BOOKING_GOOGLE_SCOPES], [
    "https://www.googleapis.com/auth/calendar.events.owned",
    "https://www.googleapis.com/auth/calendar.events.freebusy",
  ]);

  const seen: CalendarCall[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    seen.push({ url, method: init?.method, body: typeof init?.body === "string" ? init.body : undefined });
    if (url.includes("oauth2.googleapis.com")) return Response.json({ access_token: "synthetic-access", expires_in: 3600 });
    if (url.includes("/events?") && init?.method === "POST") return Response.json({ id: "abcdefghij0123456789", iCalUID: "synthetic-uid@example.test" });
    return Response.json({});
  };
  const transport = createGoogleCalendarTransport({
    clientId: "synthetic-client-id-xxxx",
    clientSecret: "synthetic-client-secret",
    refreshToken: "synthetic-refresh-token",
    calendarId: LIVE_BOOKING_CALENDAR_ID,
    fetchImpl,
    now: () => Date.parse("2026-11-06T08:00:00.000Z"),
  });
  const inserted = await transport.insertEvent({
    eventId: "abcdefghij0123456789",
    bookingId: "bk_abcdefghij0123456789",
    start: "2026-11-06T14:00:00.000Z",
    end: "2026-11-06T14:20:00.000Z",
    summary: "WitnessOps fit call",
    description: "Synthetic",
    attendeeEmail: draft.email,
    attendeeName: draft.name,
  });
  assert.equal(inserted.kind, "ok");
  const insert = seen.find((call) => call.method === "POST" && call.url?.includes("/events?"));
  assert.match(insert?.url ?? "", /sendUpdates=none/);
  assert.doesNotMatch(insert?.body ?? "", /conferenceData|sendUpdates":"all"/);
  const mailCalls: Array<{ body: string; key: string | null }> = [];
  const resend = createResendMailTransport({
    apiKey: "synthetic-resend-key-not-real",
    from: "bookings@example.test",
    replyTo: "engage@mail.witnessops.com",
    fetchImpl: async (_input, init) => {
      const headers = new Headers(init?.headers);
      mailCalls.push({ body: String(init?.body), key: headers.get("idempotency-key") });
      return Response.json({ id: "synthetic-mail" });
    },
  });
  await resend.send(confirmation);
  await resend.send(invitation);
  assert.equal(mailCalls.some((call) => call.body.includes("BEGIN:VCALENDAR") && call.key === confirmation.idempotencyKey), false);
  const inviteCall = mailCalls.find((call) => call.key === invitation.idempotencyKey);
  assert.equal(inviteCall?.key, "booking-invite/bk_0123456789abcdefghij");
  const invitePayload = JSON.parse(inviteCall?.body ?? "{}") as { attachments?: Array<{ content?: string; content_type?: string }> };
  const attachment = Buffer.from(invitePayload.attachments?.[0]?.content ?? "", "base64").toString("utf8");
  assert.match(invitePayload.attachments?.[0]?.content_type ?? "", /method=REQUEST/);
  assert.match(attachment, /METHOD:REQUEST/);
  assert.doesNotMatch(JSON.parse(mailCalls[0]?.body ?? "{}").text ?? "", /BEGIN:VCALENDAR/);
  assert.throws(() => assertLiveBookingEgress("https://evil.example/collect"), /egress_denied/);
  assert.throws(() => assertLiveBookingEgress("http://www.googleapis.com/calendar/v3/freeBusy"), /egress_denied/);
});

test("verified code, hold, confirm, retry, cancel, and provider failures stay honest", async () => {
  const storeDir = await tempStore();
  const now = { value: Date.parse("2026-11-06T08:00:00.000Z") };
  const fake = fakes();
  const bookingDeps = deps(storeDir, now, fake);
  try {
    const started = await startLiveSession(bookingDeps, sha256("ip"));
    const slots = await liveAvailability(bookingDeps, started.token);
    assert.equal(slots.timeZone, "Europe/Warsaw");
    assert.equal(slots.slots[0]?.id, "waw-20261106-1500");
    const emailed = await requestLiveCode(bookingDeps, { token: started.token, email: draft.email, idempotencyKey: "code-key-000001", emailHash: sha256(draft.email) });
    assert.equal(emailed.acceptance, "accepted");
    assert.equal(emailed.delivery, "not_observed");
    assert.equal(fake.sent[0]?.role, "verification");
    assert.equal((await requestLiveCode(bookingDeps, { token: started.token, email: draft.email, idempotencyKey: "code-key-000001", emailHash: sha256(draft.email) })).acceptance, "accepted");
    assert.equal(fake.sent.length, 1);
    const demoCode = await checkLiveCode(bookingDeps, { token: started.token, email: draft.email, code: "314159" });
    assert.equal(demoCode.code, "rejected");
    const matched = await checkLiveCode(bookingDeps, { token: started.token, email: draft.email, code: "102030" });
    assert.equal(matched.code, "matched");
    const hold = await prepareLiveHold(bookingDeps, { token: started.token, slotId: slots.slots[0].id, draft });
    const other = await startLiveSession(bookingDeps, sha256("ip-2"));
    await requestLiveCode(deps(storeDir, now, fake, "102031"), { token: other.token, email: "other@example.test", idempotencyKey: "code-key-000002", emailHash: sha256("other@example.test") });
    await checkLiveCode(deps(storeDir, now, fake, "102031"), { token: other.token, email: "other@example.test", code: "102031" });
    await assert.rejects(() => prepareLiveHold(deps(storeDir, now, fake, "102031"), { token: other.token, slotId: slots.slots[0].id, draft: { ...draft, email: "other@example.test" } }), (error: unknown) => error instanceof LiveBookingFailure && error.code === "slot_unavailable");
    const confirmed = await confirmLiveBooking(bookingDeps, { token: started.token, holdId: hold.hold.id, idempotencyKey: "confirm-key-0001" });
    assert.equal(confirmed.booking.status, "event_recorded");
    assert.equal(confirmed.booking.calendarEvent, "recorded");
    assert.equal(confirmed.booking.mail.confirmation, "accepted");
    assert.equal(confirmed.booking.mail.invite, "accepted");
    assert.equal(confirmed.booking.delivery, "not_observed");
    assert.equal(fake.calls.insert, 1);
    const retried = await confirmLiveBooking(bookingDeps, { token: started.token, holdId: hold.hold.id, idempotencyKey: "confirm-key-0001" });
    assert.equal(retried.booking.reference, confirmed.booking.reference);
    assert.equal(fake.calls.insert, 1);
    assert.equal(fake.sent.filter((message) => message.role === "confirmation").length, 1);
    assert.equal(fake.sent.filter((message) => message.role === "invite").length, 1);
    const cancelled = await cancelLiveBooking(bookingDeps, { cancelToken: confirmed.booking.cancelToken, reference: confirmed.booking.reference });
    assert.equal(cancelled.booking.status, "cancelled");
    assert.equal(cancelled.booking.calendarEvent, "not_recorded");
    assert.equal(fake.calls.cancel, 1);
    assert.equal(fake.sent.some((message) => message.role === "cancellation_notice"), true);
    assert.match(fake.sent.find((message) => message.role === "cancellation_invite")?.ics ?? "", /METHOD:CANCEL/);
    const again = await cancelLiveBooking(bookingDeps, { cancelToken: confirmed.booking.cancelToken, reference: confirmed.booking.reference });
    assert.equal(again.booking.status, "cancelled");
    assert.equal(fake.calls.cancel, 1);
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("unknown provider results do not become a recorded event or a second insert", async () => {
  const storeDir = await tempStore();
  const now = { value: Date.parse("2026-11-06T08:00:00.000Z") };
  const fake = fakes({ insert: "unknown" });
  const bookingDeps = deps(storeDir, now, fake);
  try {
    const started = await startLiveSession(bookingDeps, sha256("ip"));
    const slot = (await liveAvailability(bookingDeps, started.token)).slots[0];
    await requestLiveCode(bookingDeps, { token: started.token, email: draft.email, idempotencyKey: "code-key-000010", emailHash: sha256("email") });
    await checkLiveCode(bookingDeps, { token: started.token, email: draft.email, code: "102030" });
    const hold = await prepareLiveHold(bookingDeps, { token: started.token, slotId: slot.id, draft });
    const first = await confirmLiveBooking(bookingDeps, { token: started.token, holdId: hold.hold.id, idempotencyKey: "confirm-key-0002" });
    assert.equal(first.booking.status, "insert_started");
    assert.equal(first.booking.calendarEvent, "unknown");
    assert.equal(fake.sent.some((message) => message.role === "confirmation"), false);
    const second = await confirmLiveBooking(bookingDeps, { token: started.token, holdId: hold.hold.id, idempotencyKey: "confirm-key-0002" });
    assert.equal(second.booking.status, "event_recorded");
    assert.equal(fake.calls.insert, 1);
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("calendar failure, overlap, hold expiry, and missing code do not confirm", async () => {
  const storeDir = await tempStore();
  const now = { value: Date.parse("2026-11-06T08:00:00.000Z") };
  try {
    const broken = fakes({ free: "unknown" });
    const brokenDeps = deps(storeDir, now, broken);
    const started = await startLiveSession(brokenDeps, sha256("ip"));
    await assert.rejects(() => liveAvailability(brokenDeps, started.token), (error: unknown) => error instanceof LiveBookingFailure && error.code === "calendar_unavailable");
    const overlap = fakes({ overlap: true });
    const overlapDeps = deps(storeDir, now, overlap);
    const token = (await startLiveSession(overlapDeps, sha256("ip2"))).token;
    const slot = (await liveAvailability(overlapDeps, token)).slots[0];
    await assert.rejects(() => prepareLiveHold(overlapDeps, { token, slotId: slot.id, draft }), (error: unknown) => error instanceof LiveBookingFailure && error.code === "code_required");
    await requestLiveCode(overlapDeps, { token, email: draft.email, idempotencyKey: "code-key-000020", emailHash: sha256("overlap") });
    await checkLiveCode(overlapDeps, { token, email: draft.email, code: "102030" });
    const hold = await prepareLiveHold(overlapDeps, { token, slotId: slot.id, draft });
    now.value += 5 * 60_000 + 1;
    await assert.rejects(() => confirmLiveBooking(overlapDeps, { token, holdId: hold.hold.id, idempotencyKey: "confirm-key-0003" }), (error: unknown) => error instanceof LiveBookingFailure && error.code === "expired");
    now.value = Date.parse("2026-11-06T08:00:00.000Z");
    const fresh = await prepareLiveHold(overlapDeps, { token, slotId: (await liveAvailability(overlapDeps, token)).slots[1].id, draft });
    const recorded = await confirmLiveBooking(overlapDeps, { token, holdId: fresh.hold.id, idempotencyKey: "confirm-key-0004" });
    assert.equal(recorded.booking.status, "released_external_overlap");
    assert.equal(overlap.calls.cancel, 1);
    assert.equal(overlap.sent.some((message) => message.role === "invite"), false);
    const rejected = fakes({ insert: "rejected" });
    const rejectedDeps = deps(storeDir, now, rejected);
    const other = (await startLiveSession(rejectedDeps, sha256("ip3"))).token;
    const nextSlot = (await liveAvailability(rejectedDeps, other)).slots.find((item) => item.id !== fresh.hold.slot.id);
    assert.ok(nextSlot);
    await requestLiveCode(rejectedDeps, { token: other, email: "reject@example.test", idempotencyKey: "code-key-000021", emailHash: sha256("reject") });
    await checkLiveCode(deps(storeDir, now, rejected, "102030"), { token: other, email: "reject@example.test", code: "102030" });
    const rejectedHold = await prepareLiveHold(rejectedDeps, { token: other, slotId: nextSlot.id, draft: { ...draft, email: "reject@example.test" } });
    const outcome = await confirmLiveBooking(rejectedDeps, { token: other, holdId: rejectedHold.hold.id, idempotencyKey: "confirm-key-0005" });
    assert.equal(outcome.booking.status, "insert_rejected");
    assert.equal(rejected.sent.some((message) => message.role !== "verification"), false);
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("two processes cannot both hold one slot in the isolated store", async () => {
  const storeDir = await tempStore();
  const go = path.join(storeDir, "go");
  const owners = [randomBytes(32).toString("hex"), randomBytes(32).toString("hex")];
  try {
    const sameProcess = await Promise.all(owners.map((owner) => claimSlotRace(storeDir, "waw-20260715-1200", owner, Date.parse("2026-07-15T06:00:00.000Z"))));
    assert.deepEqual(sameProcess.sort(), ["held", "taken"]);
    const children = owners.map((owner) => new Promise<string>((resolve, reject) => {
      const child = spawn(process.execPath, ["--import", "./scripts/register-server-only-test-stub.mjs", "--import", "tsx", "src/lib/server/live-booking/race-child.ts"], {
        cwd: webRoot,
        env: {
          ...process.env,
          NODE_ENV: "test",
          LIVE_BOOKING_RACE_CHILD: "1",
          LIVE_BOOKING_RACE_DIR: storeDir,
          LIVE_BOOKING_RACE_GO: go,
          LIVE_BOOKING_RACE_OWNER: owner,
        },
      });
      let stdout = "";
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.on("error", reject);
      child.on("exit", (code) => {
        if (code !== 0) reject(new Error(`race child exit ${code}: ${stdout}`));
        else resolve(stdout);
      });
    }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    await writeFile(go, "go");
    const output = await Promise.all(children);
    const results = output.map((text) => text.trim().split("\n").at(-1));
    assert.deepEqual(results.sort(), ["held", "taken"]);
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("enabled route uses the injected store and still ignores the preview flag", async () => {
  const storeDir = await tempStore();
  const env = await readyEnv(storeDir);
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    throw new Error("unexpected egress");
  };
  const now = { value: Date.parse("2026-11-06T08:00:00.000Z") };
  const fake = fakes();
  try {
    const response = await handleLiveBooking(liveRequest({ action: "start" }), { env, deps: deps(storeDir, now, fake) });
    assert.equal(response.status, 200);
    const body = await response.json() as { token?: string };
    assert.equal(body.token?.length, 64);
    assert.deepEqual(calls, []);
    const status = await handleLiveBooking(new Request("https://booking.example.test/api/live-booking", { headers: { origin: "https://booking.example.test", host: "booking.example.test" } }), { env });
    assert.equal(status.status, 200);
    assert.equal((await status.json()).mode, "ready");
    const foreign = await handleLiveBooking(new Request("https://booking.example.test/api/live-booking", { headers: { origin: "https://evil.example", host: "booking.example.test" } }), { env });
    assert.equal(foreign.status, 403);
  } finally {
    globalThis.fetch = original;
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("live booking source stays separate from the fictional preview", async () => {
  const liveRoute = await readFile(path.join(webRoot, "src/app/api/live-booking/route.ts"), "utf8");
  const previewRoute = await readFile(path.join(webRoot, "src/app/api/sovereign-booking/route.ts"), "utf8");
  const runbook = await readFile(path.resolve(webRoot, "../../docs/LIVE_BOOKING_DRAFT.md"), "utf8");
  assert.doesNotMatch(liveRoute, /NEXT_PUBLIC_WO_PREVIEW|314159|sovereign-booking-session|DemoBooking/);
  assert.doesNotMatch(previewRoute, /live-booking/);
  assert.match(runbook, /calendar\.events\.owned/);
  assert.match(runbook, /calendar\.events\.freebusy/);
  assert.match(runbook, /sendUpdates=none/);
  assert.match(runbook, /verification/);
  assert.match(runbook, /confirmation/);
  assert.match(runbook, /invite/);
  assert.match(runbook, /not enabled/);
});
