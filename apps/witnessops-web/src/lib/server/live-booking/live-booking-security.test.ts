import assert from "node:assert/strict";
import { chmod, lstat, mkdtemp, readFile, readdir, rm, stat, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { buildBookingIcs } from "./ics";
import { createGoogleCalendarTransport } from "./calendar-transport";
import { LIVE_BOOKING_CALENDAR_ID, LIVE_BOOKING_TIME_ZONE, GLOBAL_VERIFICATION_PER_HOUR } from "./constants";
import { configFromEnv } from "./mode";
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
  sha256,
  startLiveSession,
  type LiveBookingDeps,
} from "./service";
import { LiveBookingStoreError, withStoreLock } from "./store";

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
  return mkdtemp(path.join(tmpdir(), "live-booking-sec-"));
}

function deps(storeDir: string, nowRef: { value: number }, calendar: LiveBookingDeps["calendar"], mail: LiveBookingDeps["mail"], code = "102030"): LiveBookingDeps {
  return { now: () => nowRef.value, storeDir, pepper: pepper(), calendar, mail, newCode: () => code };
}

function quietCalendar(freeBusy = async () => ({ kind: "ok" as const, busy: [] as Array<{ start: string; end: string }> })): LiveBookingDeps["calendar"] {
  return {
    freeBusy,
    async getEvent() { return { kind: "absent" }; },
    async insertEvent() { return { kind: "ok", iCalUid: "synthetic-uid@example.test" }; },
    async listBlocking() { return { kind: "ok", overlaps: false }; },
    async cancelEvent() { return { kind: "ok" }; },
  };
}

test("finding 1: an unknown session does not call freeBusy, and availability is budgeted", async () => {
  const storeDir = await tempStore();
  const now = { value: Date.parse("2026-11-06T08:00:00.000Z") };
  let calls = 0;
  const calendar = quietCalendar(async () => { calls += 1; return { kind: "ok", busy: [] }; });
  const bookingDeps = deps(storeDir, now, calendar, { async send() { return { kind: "accepted", id: "synthetic" }; } });
  try {
    for (let index = 0; index < 30; index += 1) {
      const token = "ab".repeat(32);
      await assert.rejects(() => liveAvailability(bookingDeps, token), (error: unknown) => error instanceof LiveBookingFailure && error.code === "session_expired");
    }
    assert.equal(calls, 0);
    const started = await startLiveSession(bookingDeps, sha256("ip"));
    for (let index = 0; index < 12; index += 1) await liveAvailability(bookingDeps, started.token);
    await assert.rejects(() => liveAvailability(bookingDeps, started.token), (error: unknown) => error instanceof LiveBookingFailure && error.code === "rate_limited");
    assert.equal(calls, 12);
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("finding 2: a later cancel retries the notice without a second calendar cancel", async () => {
  const storeDir = await tempStore();
  const now = { value: Date.parse("2026-11-06T08:00:00.000Z") };
  let cancels = 0;
  let notices = 0;
  const calendar = quietCalendar();
  calendar.cancelEvent = async () => { cancels += 1; return { kind: "ok" }; };
  const mail = {
    async send(message: { role: string }) {
      if (message.role === "cancellation_notice") {
        notices += 1;
        return notices === 1 ? { kind: "unknown" as const } : { kind: "accepted" as const, id: "synthetic-notice" };
      }
      return { kind: "accepted" as const, id: `synthetic-${message.role}` };
    },
  };
  const bookingDeps = deps(storeDir, now, calendar, mail);
  try {
    const token = (await startLiveSession(bookingDeps, sha256("ip"))).token;
    const slot = (await liveAvailability(bookingDeps, token)).slots[0];
    await requestLiveCode(bookingDeps, { token, email: draft.email, idempotencyKey: "code-key-sec-002", emailHash: sha256(draft.email) });
    await checkLiveCode(bookingDeps, { token, email: draft.email, code: "102030" });
    const hold = await prepareLiveHold(bookingDeps, { token, slotId: slot.id, draft });
    const confirmed = await confirmLiveBooking(bookingDeps, { token, holdId: hold.hold.id, idempotencyKey: "confirm-key-sec-002" });
    const first = await cancelLiveBooking(bookingDeps, { token, reference: confirmed.booking.reference });
    assert.equal(first.booking.status, "cancelled");
    assert.equal(first.booking.mail.cancellationNotice, "unknown");
    assert.equal(cancels, 1);
    assert.equal(notices, 1);
    const second = await cancelLiveBooking(bookingDeps, { token, reference: confirmed.booking.reference });
    assert.equal(second.booking.mail.cancellationNotice, "accepted");
    assert.equal(second.booking.mail.cancellationInvite, "accepted");
    assert.equal(cancels, 1);
    assert.equal(notices, 2);
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("finding 3: a live lock is not stolen after its mtime is backdated, and freeBusy does not block start", async () => {
  const storeDir = await tempStore();
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const held = withStoreLock(storeDir, async () => gate);
  await new Promise((resolve) => setTimeout(resolve, 30));
  const lockPath = path.join(storeDir, "locks", "mutation.lock");
  const past = new Date(Date.now() - 120_000);
  await utimes(lockPath, past, past);
  let stolen = false;
  const second = withStoreLock(storeDir, async () => { stolen = true; return "second"; });
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(stolen, false);
  release();
  await held;
  await second;

  const now = { value: Date.parse("2026-11-06T08:00:00.000Z") };
  let releaseBusy: () => void = () => undefined;
  const busyGate = new Promise<void>((resolve) => { releaseBusy = resolve; });
  let busyCalls = 0;
  const calendar = quietCalendar(async () => {
    busyCalls += 1;
    if (busyCalls > 1) await busyGate;
    return { kind: "ok", busy: [] };
  });
  const bookingDeps = deps(storeDir, now, calendar, { async send() { return { kind: "accepted", id: "synthetic" }; } });
  const token = (await startLiveSession(bookingDeps, sha256("prep"))).token;
  await requestLiveCode(bookingDeps, { token, email: draft.email, idempotencyKey: "code-key-sec-003", emailHash: sha256(draft.email) });
  await checkLiveCode(bookingDeps, { token, email: draft.email, code: "102030" });
  const slot = (await liveAvailability(bookingDeps, token)).slots[0];
  const preparing = prepareLiveHold(bookingDeps, { token, slotId: slot.id, draft });
  const started = await startLiveSession(bookingDeps, sha256("during-prepare"));
  assert.equal(started.token.length, 64);
  releaseBusy();
  await preparing;
  await rm(storeDir, { recursive: true, force: true });
});

test("finding 4: an all-day event covering the slot is an overlap", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw);
    if (url.hostname === "oauth2.googleapis.com") return Response.json({ access_token: "synthetic-access", expires_in: 3600 });
    if (url.hostname === "www.googleapis.com" && url.pathname.endsWith("/events")) {
      return Response.json({
        items: [{ id: "allday0123456789abcd", status: "confirmed", start: { date: "2026-11-06" }, end: { date: "2026-11-07" } }],
      });
    }
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
  const overlap = await transport.listBlocking("2026-11-06T14:00:00.000Z", "2026-11-06T14:20:00.000Z", "ours0123456789abcdef");
  assert.deepEqual(overlap, { kind: "ok", overlaps: true });
  assert.equal(LIVE_BOOKING_TIME_ZONE, "Europe/Warsaw");
});

test("finding 5: the cancel code is not stored, and new directories are mode 0700", async () => {
  const storeDir = await tempStore();
  const now = { value: Date.parse("2026-11-06T08:00:00.000Z") };
  const bookingDeps = deps(storeDir, now, quietCalendar(), { async send() { return { kind: "accepted", id: "synthetic" }; } });
  const previous = process.umask(0);
  try {
    const token = (await startLiveSession(bookingDeps, sha256("ip"))).token;
    const slot = (await liveAvailability(bookingDeps, token)).slots[0];
    await requestLiveCode(bookingDeps, { token, email: draft.email, idempotencyKey: "code-key-sec-005", emailHash: sha256(draft.email) });
    await checkLiveCode(bookingDeps, { token, email: draft.email, code: "102030" });
    const hold = await prepareLiveHold(bookingDeps, { token, slotId: slot.id, draft });
    const confirmed = await confirmLiveBooking(bookingDeps, { token, holdId: hold.hold.id, idempotencyKey: "confirm-key-sec-005" });
    assert.equal(typeof confirmed.booking.cancelToken, "string");
    const names = await readdir(path.join(storeDir, "bookings"));
    const raw = await readFile(path.join(storeDir, "bookings", names[0]), "utf8");
    assert.equal(raw.includes(confirmed.booking.cancelToken ?? "missing"), false);
    assert.equal(/"cancelToken"\s*:/.test(raw), false);
    const readBack = await readLiveSession(bookingDeps, token);
    assert.equal(readBack.booking && "cancelToken" in readBack.booking, false);
    const directory = await stat(path.join(storeDir, "bookings"));
    assert.equal(directory.mode & 0o777, 0o700);
    const verifications = await readdir(path.join(storeDir, "verifications")).catch(() => []);
    assert.deepEqual(verifications, []);
  } finally {
    process.umask(previous);
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("finding 6: spoofed forwarding hops cannot exceed the global verification ceiling", async () => {
  const storeDir = await tempStore();
  const now = { value: Date.parse("2026-11-06T08:00:00.000Z") };
  let sends = 0;
  const bookingDeps = deps(storeDir, now, quietCalendar(), { async send() { sends += 1; return { kind: "accepted", id: "synthetic" }; } });
  try {
    for (let index = 0; index < GLOBAL_VERIFICATION_PER_HOUR; index += 1) {
      const token = (await startLiveSession(bookingDeps, sha256(`ip-${index}`))).token;
      const email = `person${index}@example.test`;
      const sent = await requestLiveCode(bookingDeps, { token, email, idempotencyKey: `code-key-sec-6-${index}`, emailHash: sha256(email) });
      assert.equal(sent.acceptance, "accepted");
    }
    const extra = (await startLiveSession(bookingDeps, sha256("ip-extra"))).token;
    await assert.rejects(
      () => requestLiveCode(bookingDeps, { token: extra, email: "extra@example.test", idempotencyKey: "code-key-sec-6-extra", emailHash: sha256("extra@example.test") }),
      (error: unknown) => error instanceof LiveBookingFailure && error.code === "rate_limited",
    );
    assert.equal(sends, GLOBAL_VERIFICATION_PER_HOUR);
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("finding 7: a symlink into the token store and an intake alias stay unavailable", async () => {
  const tokenStore = await tempStore();
  const parent = await tempStore();
  const link = path.join(parent, "alias");
  const bookingDir = await tempStore();
  const savedToken = process.env.WITNESSOPS_TOKEN_STORE_DIR;
  const savedIntake = process.env.WITNESSOPS_INTAKE_STORE_DIR;
  const savedStore = process.env.WITNESSOPS_LIVE_BOOKING_STORE_DIR;
  const savedFlag = process.env.WITNESSOPS_LIVE_BOOKING_ENABLED;
  try {
    await symlink(tokenStore, link);
    process.env.WITNESSOPS_LIVE_BOOKING_ENABLED = "1";
    process.env.WITNESSOPS_TOKEN_STORE_DIR = tokenStore;
    process.env.WITNESSOPS_LIVE_BOOKING_STORE_DIR = link;
    process.env.WITNESSOPS_LIVE_BOOKING_PUBLIC_ORIGIN = "https://booking.example.test";
    process.env.WITNESSOPS_LIVE_BOOKING_FROM_EMAIL = "bookings@example.test";
    process.env.WITNESSOPS_LIVE_BOOKING_CODE_PEPPER = pepper();
    process.env.WITNESSOPS_RESEND_API_KEY = "synthetic-resend-key-not-real";
    process.env.WITNESSOPS_MAIL_PROVIDER = "resend";
    process.env.WITNESSOPS_LIVE_BOOKING_GOOGLE_CLIENT_ID = "synthetic-client-id-xxxx";
    process.env.WITNESSOPS_LIVE_BOOKING_GOOGLE_CLIENT_SECRET = "synthetic-client-secret";
    process.env.WITNESSOPS_LIVE_BOOKING_GOOGLE_REFRESH_TOKEN = "synthetic-refresh-token";
    process.env.WITNESSOPS_LIVE_BOOKING_CALENDAR_ID = LIVE_BOOKING_CALENDAR_ID;
    process.env.WITNESSOPS_LIVE_BOOKING_TIME_ZONE = LIVE_BOOKING_TIME_ZONE;
    assert.equal(configFromEnv(process.env).mode, "unavailable");
    const now = { value: Date.parse("2026-11-06T08:00:00.000Z") };
    await assert.rejects(() => startLiveSession(deps(link, now, quietCalendar(), { async send() { return { kind: "accepted", id: "x" }; } }), sha256("ip")));
    assert.deepEqual(await readdir(tokenStore), []);
    process.env.WITNESSOPS_LIVE_BOOKING_STORE_DIR = bookingDir;
    process.env.WITNESSOPS_INTAKE_STORE_DIR = bookingDir;
    assert.equal(configFromEnv(process.env).mode, "unavailable");
  } finally {
    if (savedToken === undefined) delete process.env.WITNESSOPS_TOKEN_STORE_DIR;
    else process.env.WITNESSOPS_TOKEN_STORE_DIR = savedToken;
    if (savedIntake === undefined) delete process.env.WITNESSOPS_INTAKE_STORE_DIR;
    else process.env.WITNESSOPS_INTAKE_STORE_DIR = savedIntake;
    if (savedStore === undefined) delete process.env.WITNESSOPS_LIVE_BOOKING_STORE_DIR;
    else process.env.WITNESSOPS_LIVE_BOOKING_STORE_DIR = savedStore;
    if (savedFlag === undefined) delete process.env.WITNESSOPS_LIVE_BOOKING_ENABLED;
    else process.env.WITNESSOPS_LIVE_BOOKING_ENABLED = savedFlag;
    await rm(tokenStore, { recursive: true, force: true });
    await rm(parent, { recursive: true, force: true });
    await rm(bookingDir, { recursive: true, force: true });
  }
});

test("finding 8: only the raw enable value 1 leaves the disabled state", () => {
  const env = {
    WITNESSOPS_LIVE_BOOKING_ENABLED: "1",
    WITNESSOPS_LIVE_BOOKING_STORE_DIR: "/tmp",
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
  for (const value of [" 1 ", "1\n", "\t1", "true", "01"]) {
    const probe = { ...env, WITNESSOPS_LIVE_BOOKING_ENABLED: value };
    assert.equal(configFromEnv(probe as unknown as NodeJS.ProcessEnv).mode, "disabled", value);
  }
});

test("finding 9: ICS escapes U+2028, U+2029, and the attendee address", () => {
  const ics = buildBookingIcs({
    method: "REQUEST",
    uid: "synthetic-uid@example.test",
    sequence: 0,
    start: "2026-11-06T14:00:00.000Z",
    end: "2026-11-06T14:20:00.000Z",
    summary: "WitnessOps fit call",
    description: "line\u2028next\nEND:VEVENT",
    organizer: "engage@mail.witnessops.com",
    attendee: "synthetic@example.test",
    attendeeName: "A\u2028B\r\nORGANIZER:injected",
  });
  const unfolded = ics.replace(/\r\n[ \t]/g, "");
  assert.equal(unfolded.includes("\u2028"), false);
  assert.equal(unfolded.includes("\u2029"), false);
  assert.equal(unfolded.split("\n").filter((line) => line.startsWith("ORGANIZER")).length, 1);
  assert.match(unfolded, /mailto:synthetic@example\.test/);
  assert.match(unfolded, /\\n/);
});

test("finding 10: the same idempotency key does not report acceptance for a different mailbox", async () => {
  const storeDir = await tempStore();
  const now = { value: Date.parse("2026-11-06T08:00:00.000Z") };
  let sends = 0;
  const bookingDeps = deps(storeDir, now, quietCalendar(), { async send() { sends += 1; return { kind: "accepted", id: "synthetic" }; } });
  try {
    const token = (await startLiveSession(bookingDeps, sha256("ip"))).token;
    const first = await requestLiveCode(bookingDeps, { token, email: draft.email, idempotencyKey: "code-key-sec-010", emailHash: sha256(draft.email) });
    assert.equal(first.acceptance, "accepted");
    await assert.rejects(
      () => requestLiveCode(bookingDeps, { token, email: "other@example.test", idempotencyKey: "code-key-sec-010", emailHash: sha256("other@example.test") }),
      (error: unknown) => error instanceof LiveBookingFailure && error.code === "idempotency_mismatch",
    );
    assert.equal(sends, 1);
    assert.equal((await checkLiveCode(bookingDeps, { token, email: "other@example.test", code: "102030" })).code, "expired");
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});

type ProviderState = "none" | "active" | "cancelled";

function acceptedMail(roles: string[]) {
  return {
    async send(message: { role: string }) {
      roles.push(message.role);
      return { kind: "accepted" as const, id: `synthetic-${message.role}` };
    },
  };
}

function providerDouble(cancelResult: "ok" | "unknown" = "ok") {
  let state: ProviderState = "none";
  let release = () => undefined as void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let entered = 0;
  let inserts = 0;
  let cancelEvents = 0;
  const trace: string[] = [];
  const calendar = quietCalendar();
  calendar.getEvent = async () => {
    trace.push(`get:${state}`);
    if (state === "none") return { kind: "absent" };
    return { kind: "ok", iCalUid: "synthetic-uid@example.test", status: state === "cancelled" ? "cancelled" as const : "confirmed" as const };
  };
  calendar.insertEvent = async () => {
    entered += 1;
    trace.push(`insert:entered:${entered}`);
    await gate;
    state = "active";
    inserts += 1;
    trace.push("insert:active");
    return { kind: "ok", iCalUid: "synthetic-uid@example.test" };
  };
  calendar.cancelEvent = async () => {
    cancelEvents += 1;
    if (cancelResult === "unknown") {
      trace.push(`cancelEvent:unknown:${state}`);
      return { kind: "unknown" as const };
    }
    if (state === "none") {
      trace.push("cancelEvent:absent");
      return { kind: "absent" as const };
    }
    state = "cancelled";
    trace.push("cancelEvent:cancelled");
    return { kind: "ok" as const };
  };
  return {
    calendar,
    release: () => release(),
    entered: () => entered,
    inserts: () => inserts,
    cancelEvents: () => cancelEvents,
    state: () => state,
    trace,
  };
}

async function until(ready: () => boolean): Promise<void> {
  const deadline = Date.now() + 3_000;
  while (!ready()) {
    if (Date.now() > deadline) throw new Error("interleave timed out");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

async function storedBooking(storeDir: string): Promise<{ id: string; status: string; mail: { confirmation: string; invite: string } }> {
  const names = await readdir(path.join(storeDir, "bookings"));
  return JSON.parse(await readFile(path.join(storeDir, "bookings", names[0]), "utf8")) as { id: string; status: string; mail: { confirmation: string; invite: string } };
}

async function holdFor(bookingDeps: LiveBookingDeps, ip = "ip-hold", email = draft.email) {
  const token = (await startLiveSession(bookingDeps, sha256(ip))).token;
  const slot = (await liveAvailability(bookingDeps, token)).slots[0];
  await requestLiveCode(bookingDeps, { token, email, idempotencyKey: `code-${ip}`, emailHash: sha256(email) });
  await checkLiveCode(bookingDeps, { token, email, code: "102030" });
  const hold = await prepareLiveHold(bookingDeps, { token, slotId: slot.id, draft: { ...draft, email } });
  return { token, hold };
}

test("finding A: a paused insert does not overwrite a completed cancel and cancels the created event", async () => {
  const storeDir = await tempStore();
  const now = { value: Date.parse("2026-11-06T08:00:00.000Z") };
  const provider = providerDouble();
  const roles: string[] = [];
  const bookingDeps = deps(storeDir, now, provider.calendar, acceptedMail(roles));
  try {
    const { token, hold } = await holdFor(bookingDeps);
    const confirming = confirmLiveBooking(bookingDeps, { token, holdId: hold.hold.id, idempotencyKey: "confirm-a-pause" });
    await until(() => provider.entered() === 1);
    const pending = await storedBooking(storeDir);
    const cancelled = await cancelLiveBooking(bookingDeps, { token, reference: pending.id });
    assert.equal(cancelled.booking.status, "cancelled");
    assert.equal(provider.state(), "none");
    assert.equal(provider.inserts(), 0);
    provider.release();
    const confirmed = await confirming;
    assert.equal(confirmed.booking.status, "cancelled");
    assert.equal(confirmed.booking.mail.confirmation, "not_sent");
    assert.equal(confirmed.booking.mail.invite, "not_sent");
    assert.equal(provider.state(), "cancelled");
    assert.equal(provider.inserts(), 1);
    assert.equal(provider.cancelEvents(), 1);
    const stored = await storedBooking(storeDir);
    assert.equal(stored.status, "cancelled");
    assert.equal(stored.mail.confirmation, "not_sent");
    assert.equal(stored.mail.invite, "not_sent");
    assert.equal(roles.includes("confirmation"), false);
    assert.equal(roles.includes("invite"), false);
    assert.equal(roles.includes("cancellation_notice"), true);
    assert.equal(roles.includes("cancellation_invite"), true);
    assert.deepEqual(provider.trace.filter((step) => step.startsWith("insert") || step.startsWith("cancelEvent")), ["insert:entered:1", "insert:active", "cancelEvent:cancelled"]);
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("finding A: overlapping confirm retries observe the cancel and do not send an invite", async () => {
  const storeDir = await tempStore();
  const now = { value: Date.parse("2026-11-06T08:00:00.000Z") };
  const provider = providerDouble();
  const roles: string[] = [];
  const bookingDeps = deps(storeDir, now, provider.calendar, acceptedMail(roles));
  try {
    const { token, hold } = await holdFor(bookingDeps, "ip-overlap");
    const first = confirmLiveBooking(bookingDeps, { token, holdId: hold.hold.id, idempotencyKey: "confirm-a-overlap" });
    await until(() => provider.entered() === 1);
    const second = confirmLiveBooking(bookingDeps, { token, holdId: hold.hold.id, idempotencyKey: "confirm-a-overlap" });
    await until(() => provider.entered() === 2);
    const pending = await storedBooking(storeDir);
    const cancelled = await cancelLiveBooking(bookingDeps, { token, reference: pending.id });
    assert.equal(cancelled.booking.status, "cancelled");
    provider.release();
    const results = await Promise.all([first, second]);
    assert.equal(results[0].booking.status, "cancelled");
    assert.equal(results[1].booking.status, "cancelled");
    assert.equal(results[0].booking.mail.invite, "not_sent");
    assert.equal(results[1].booking.mail.invite, "not_sent");
    assert.equal(provider.inserts(), 2);
    assert.ok(provider.cancelEvents() >= 1);
    assert.equal(provider.state(), "cancelled");
    const stored = await storedBooking(storeDir);
    assert.equal(stored.status, "cancelled");
    assert.equal(stored.mail.confirmation, "not_sent");
    assert.equal(stored.mail.invite, "not_sent");
    assert.equal(roles.includes("confirmation"), false);
    assert.equal(roles.includes("invite"), false);
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("finding A: a confirmation already in flight after cancel is not a successful confirm or invite", async () => {
  const storeDir = await tempStore();
  const now = { value: Date.parse("2026-11-06T08:00:00.000Z") };
  let state: ProviderState = "none";
  let cancelEvents = 0;
  const roles: string[] = [];
  let releaseMail = () => undefined as void;
  const mailGate = new Promise<void>((resolve) => { releaseMail = resolve; });
  let confirmationStarted = false;
  const calendar = quietCalendar();
  calendar.insertEvent = async () => {
    state = "active";
    return { kind: "ok", iCalUid: "synthetic-uid@example.test" };
  };
  calendar.getEvent = async () => {
    if (state === "none") return { kind: "absent" };
    return { kind: "ok", iCalUid: "synthetic-uid@example.test", status: state === "cancelled" ? "cancelled" as const : "confirmed" as const };
  };
  calendar.cancelEvent = async () => {
    cancelEvents += 1;
    if (state === "none") return { kind: "absent" as const };
    state = "cancelled";
    return { kind: "ok" as const };
  };
  const mail = {
    async send(message: { role: string }) {
      roles.push(message.role);
      if (message.role === "confirmation") {
        confirmationStarted = true;
        await mailGate;
      }
      return { kind: "accepted" as const, id: `synthetic-${message.role}` };
    },
  };
  const bookingDeps = deps(storeDir, now, calendar, mail);
  try {
    const { token, hold } = await holdFor(bookingDeps, "ip-mail");
    const confirming = confirmLiveBooking(bookingDeps, { token, holdId: hold.hold.id, idempotencyKey: "confirm-a-mail" });
    await until(() => confirmationStarted);
    const pending = await storedBooking(storeDir);
    assert.equal(pending.status, "event_recorded");
    const cancelled = await cancelLiveBooking(bookingDeps, { token, reference: pending.id });
    assert.equal(cancelled.booking.status, "cancelled");
    assert.equal(state, "cancelled");
    releaseMail();
    const confirmed = await confirming;
    assert.equal(confirmed.booking.status, "cancelled");
    assert.equal(confirmed.booking.mail.confirmation, "unknown");
    assert.equal(confirmed.booking.mail.invite, "not_sent");
    assert.equal(roles.includes("invite"), false);
    assert.equal(roles.filter((role) => role === "confirmation").length, 1);
    assert.equal(cancelEvents, 1);
    assert.equal(state, "cancelled");
    const stored = await storedBooking(storeDir);
    assert.equal(stored.status, "cancelled");
    assert.equal(stored.mail.confirmation, "unknown");
    assert.equal(stored.mail.invite, "not_sent");
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("finding A: an unknown provider cancel after insert stays unknown and leaves the event active", async () => {
  const storeDir = await tempStore();
  const now = { value: Date.parse("2026-11-06T08:00:00.000Z") };
  const provider = providerDouble("unknown");
  const roles: string[] = [];
  const bookingDeps = deps(storeDir, now, provider.calendar, acceptedMail(roles));
  try {
    const { token, hold } = await holdFor(bookingDeps, "ip-unknown");
    const confirming = confirmLiveBooking(bookingDeps, { token, holdId: hold.hold.id, idempotencyKey: "confirm-a-unknown" });
    await until(() => provider.entered() === 1);
    const pending = await storedBooking(storeDir);
    const cancelled = await cancelLiveBooking(bookingDeps, { token, reference: pending.id });
    assert.equal(cancelled.booking.status, "cancelled");
    provider.release();
    const confirmed = await confirming;
    assert.equal(confirmed.booking.status, "cancel_unknown");
    assert.equal(confirmed.booking.calendarEvent, "unknown");
    assert.equal(confirmed.booking.mail.confirmation, "not_sent");
    assert.equal(confirmed.booking.mail.invite, "not_sent");
    assert.equal(provider.state(), "active");
    assert.equal(provider.inserts(), 1);
    assert.equal(provider.cancelEvents(), 1);
    assert.equal(provider.trace.includes("cancelEvent:unknown:active"), true);
    const stored = await storedBooking(storeDir);
    assert.equal(stored.status, "cancel_unknown");
    assert.equal(stored.mail.confirmation, "not_sent");
    assert.equal(stored.mail.invite, "not_sent");
    assert.equal(roles.includes("confirmation"), false);
    assert.equal(roles.includes("invite"), false);
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("finding B: an interior symlink in a mode 0700 store does not receive writes", async () => {
  const now = { value: Date.parse("2026-11-06T08:00:00.000Z") };
  const mail = { async send() { return { kind: "accepted" as const, id: "synthetic" }; } };
  const folders = ["sessions", "holds", "bookings", "verifications", "cancellations", "abuse", "locks"] as const;
  for (const folder of folders) {
    const storeDir = await tempStore();
    const external = await tempStore();
    await chmod(storeDir, 0o700);
    await writeFile(path.join(external, "keep.txt"), "unchanged");
    const bookingDeps = deps(storeDir, now, quietCalendar(), mail);
    try {
      const root = await lstat(storeDir);
      assert.equal(root.isSymbolicLink(), false);
      assert.equal(root.isDirectory(), true);
      assert.equal(root.mode & 0o777, 0o700);
      const refuses = async (run: () => Promise<unknown>) => {
        await assert.rejects(run, (error: unknown) => error instanceof LiveBookingStoreError && error.message === "store_alias");
      };
      if (folder === "sessions" || folder === "abuse" || folder === "locks") {
        await symlink(external, path.join(storeDir, folder));
        await refuses(() => startLiveSession(bookingDeps, sha256(`ip-${folder}`)));
      } else if (folder === "verifications") {
        const token = (await startLiveSession(bookingDeps, sha256("ip-verify"))).token;
        await symlink(external, path.join(storeDir, folder));
        await refuses(() => requestLiveCode(bookingDeps, { token, email: draft.email, idempotencyKey: "code-b-verify", emailHash: sha256(draft.email) }));
      } else if (folder === "holds") {
        const token = (await startLiveSession(bookingDeps, sha256("ip-holds"))).token;
        const slot = (await liveAvailability(bookingDeps, token)).slots[0];
        await requestLiveCode(bookingDeps, { token, email: draft.email, idempotencyKey: "code-b-holds", emailHash: sha256(draft.email) });
        await checkLiveCode(bookingDeps, { token, email: draft.email, code: "102030" });
        await symlink(external, path.join(storeDir, folder));
        await refuses(() => prepareLiveHold(bookingDeps, { token, slotId: slot.id, draft }));
      } else {
        const prepared = await holdFor(bookingDeps, `ip-${folder}`);
        await symlink(external, path.join(storeDir, folder));
        await refuses(() => confirmLiveBooking(bookingDeps, { token: prepared.token, holdId: prepared.hold.hold.id, idempotencyKey: `confirm-b-${folder}` }));
      }
      assert.deepEqual(await readdir(external), ["keep.txt"]);
      assert.equal(await readFile(path.join(external, "keep.txt"), "utf8"), "unchanged");
    } finally {
      await rm(storeDir, { recursive: true, force: true });
      await rm(external, { recursive: true, force: true });
    }
  }

  const storeDir = await tempStore();
  const external = await tempStore();
  const target = path.join(external, "session.json");
  await writeFile(target, "unchanged");
  const bookingDeps = deps(storeDir, now, quietCalendar(), mail);
  try {
    const token = (await startLiveSession(bookingDeps, sha256("ip-file"))).token;
    const sessionPath = path.join(storeDir, "sessions", `${sha256(token)}.json`);
    await rm(sessionPath);
    await symlink(target, sessionPath);
    await assert.rejects(
      () => readLiveSession(bookingDeps, token),
      (error: unknown) => error instanceof LiveBookingStoreError && error.message === "store_alias",
    );
    assert.equal(await readFile(target, "utf8"), "unchanged");
    const lockTarget = path.join(external, "lock");
    await writeFile(lockTarget, "unchanged");
    await symlink(lockTarget, path.join(storeDir, "locks", "mutation.lock"));
    await assert.rejects(
      () => startLiveSession(bookingDeps, sha256("ip-lock-file")),
      (error: unknown) => error instanceof LiveBookingStoreError && error.message === "store_alias",
    );
    assert.equal(await readFile(lockTarget, "utf8"), "unchanged");
    assert.deepEqual((await readdir(external)).sort(), ["lock", "session.json"]);
  } finally {
    await rm(storeDir, { recursive: true, force: true });
    await rm(external, { recursive: true, force: true });
  }
});

async function budgetCount(storeDir: string, key: string): Promise<number> {
  const raw = await readFile(path.join(storeDir, "abuse", `${key}.json`), "utf8");
  return (JSON.parse(raw) as { count: number }).count;
}

test("finding 6: rejected mailbox repeats do not consume the global send ceiling", async () => {
  const storeDir = await tempStore();
  const now = { value: Date.parse("2026-11-06T08:00:00.000Z") };
  let sends = 0;
  const mailbox = "limited@example.test";
  const bookingDeps = deps(storeDir, now, quietCalendar(), { async send() { sends += 1; return { kind: "accepted", id: "synthetic" }; } });
  try {
    for (let index = 0; index < 8; index += 1) {
      const token = (await startLiveSession(bookingDeps, sha256(`ip-${index % 2}`))).token;
      const sent = await requestLiveCode(bookingDeps, { token, email: mailbox, idempotencyKey: `code-6-ok-${index}`, emailHash: sha256(mailbox) });
      assert.equal(sent.acceptance, "accepted");
      if (index === 0) {
        const replay = await requestLiveCode(bookingDeps, { token, email: mailbox, idempotencyKey: "code-6-ok-0", emailHash: sha256(mailbox) });
        assert.equal(replay.acceptance, "accepted");
        assert.equal(sends, 1);
      }
    }
    assert.equal(sends, 8);
    assert.equal(await budgetCount(storeDir, "globalmail"), 8);
    assert.equal(await budgetCount(storeDir, sha256(mailbox)), 8);
    for (let index = 0; index < 22; index += 1) {
      const token = (await startLiveSession(bookingDeps, sha256(`ip-${index % 2}`))).token;
      await assert.rejects(
        () => requestLiveCode(bookingDeps, { token, email: mailbox, idempotencyKey: `code-6-no-${index}`, emailHash: sha256(mailbox) }),
        (error: unknown) => error instanceof LiveBookingFailure && error.code === "rate_limited",
      );
    }
    assert.equal(sends, 8);
    assert.equal(await budgetCount(storeDir, "globalmail"), 8);
    assert.equal(await budgetCount(storeDir, sha256(mailbox)), 8);
    const fresh = (await startLiveSession(bookingDeps, sha256("ip-new-mailbox"))).token;
    const next = await requestLiveCode(bookingDeps, { token: fresh, email: "other@example.test", idempotencyKey: "code-6-other", emailHash: sha256("other@example.test") });
    assert.equal(next.acceptance, "accepted");
    assert.equal(sends, 9);
    assert.equal(await budgetCount(storeDir, "globalmail"), 9);
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("finding 6: a provider rejection still consumes a reserved send, and the last global slot is reserved once", async () => {
  const storeDir = await tempStore();
  const now = { value: Date.parse("2026-11-06T08:00:00.000Z") };
  let attempted = 0;
  const bookingDeps = deps(storeDir, now, quietCalendar(), {
    async send(message: { to: string }) {
      attempted += 1;
      return message.to === "bounce@example.test" ? { kind: "rejected" as const } : { kind: "accepted" as const, id: "synthetic" };
    },
  });
  try {
    const bounced = (await startLiveSession(bookingDeps, sha256("ip-bounce"))).token;
    const rejected = await requestLiveCode(bookingDeps, { token: bounced, email: "bounce@example.test", idempotencyKey: "code-6-bounce", emailHash: sha256("bounce@example.test") });
    assert.equal(rejected.acceptance, "rejected");
    assert.equal(attempted, 1);
    assert.equal(await budgetCount(storeDir, "globalmail"), 1);
    for (let index = 0; index < 28; index += 1) {
      const token = (await startLiveSession(bookingDeps, sha256(`ip-fill-${index % 2}`))).token;
      const email = `fill${index}@example.test`;
      const sent = await requestLiveCode(bookingDeps, { token, email, idempotencyKey: `code-6-fill-${index}`, emailHash: sha256(email) });
      assert.equal(sent.acceptance, "accepted");
    }
    assert.equal(attempted, 29);
    assert.equal(await budgetCount(storeDir, "globalmail"), 29);
    const race = [0, 1].map((index) => (async () => {
      const token = (await startLiveSession(bookingDeps, sha256(`ip-race-${index}`))).token;
      const email = `race${index}@example.test`;
      return requestLiveCode(bookingDeps, { token, email, idempotencyKey: `code-6-race-${index}`, emailHash: sha256(email) });
    })());
    const results = await Promise.allSettled(race);
    const accepted = results.filter((result) => result.status === "fulfilled" && result.value.acceptance === "accepted");
    const limited = results.filter((result) => result.status === "rejected" && result.reason instanceof LiveBookingFailure && result.reason.code === "rate_limited");
    assert.equal(accepted.length, 1);
    assert.equal(limited.length, 1);
    assert.equal(attempted, 30);
    assert.equal(await budgetCount(storeDir, "globalmail"), 30);
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});
