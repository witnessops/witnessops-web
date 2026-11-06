import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import {
  CODE_MAX_ATTEMPTS,
  CODE_MAX_SENDS,
  CODE_TTL_MS,
  CODES_PER_EMAIL_HOUR,
  DEMO_CODE_FORBIDDEN,
  HOLD_MS,
  HOUR_MS,
  MAX_OPEN_SESSIONS,
  SESSION_ABSOLUTE_MS,
  SESSION_SLIDING_MS,
  STARTS_PER_IP_HOUR,
} from "./constants";
import type { CalendarTransport } from "./calendar-transport";
import {
  cancellationInviteMail,
  cancellationNoticeMail,
  confirmationMail,
  inviteMail,
  verificationMail,
} from "./mail-copy";
import type { MailTransport } from "./mail-transport";
import type { BookingDraft, BookingRecord, BookingStatus, HoldRecord, MailAcceptance, PublicBooking, SessionRecord, VerificationRecord } from "./records";
import {
  consumeBudget,
  countOpenSessions,
  deleteHold,
  holdIsActive,
  listActiveHolds,
  listBookings,
  LiveBookingStoreError,
  readBooking,
  readCancellation,
  readHold,
  readSession,
  readVerification,
  withStoreLock,
  writeBooking,
  writeCancellation,
  writeHold,
  writeSession,
  writeVerification,
} from "./store";
import { overlaps, warsawSlots, type WarsawSlot } from "./warsaw-time";

export class LiveBookingFailure extends Error {
  constructor(readonly httpStatus: number, readonly code: string) {
    super(code);
    this.name = "LiveBookingFailure";
  }
}

export type LiveBookingDeps = {
  now: () => number;
  storeDir: string;
  pepper: string;
  calendar: CalendarTransport;
  mail: MailTransport;
  newCode?: () => string;
};

export type SessionView = {
  codeAccepted: boolean;
  hold: { id: string; slot: WarsawSlot; expiresAt: number; draft: BookingDraft } | null;
  booking: (PublicBooking & { cancelToken?: string }) | null;
};

const emptyMail = {
  confirmation: "not_sent" as const,
  invite: "not_sent" as const,
  cancellationNotice: "not_sent" as const,
  cancellationInvite: "not_sent" as const,
};

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function newCalendarEventId(): string {
  return [...randomBytes(20)].map((byte) => "0123456789abcdefghijklmnopqrstuv"[byte & 31]).join("");
}

function newId(prefix: string, bytes = 16): string {
  return `${prefix}${randomBytes(bytes).toString("hex")}`;
}

function hashesEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function defaultCode(): string {
  let code = DEMO_CODE_FORBIDDEN;
  while (code === DEMO_CODE_FORBIDDEN) code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  return code;
}

function fail(status: number, code: string): never {
  throw new LiveBookingFailure(status, code);
}

function calendarEventOf(status: BookingStatus): PublicBooking["calendarEvent"] {
  switch (status) {
    case "event_recorded":
      return "recorded";
    case "insert_started":
    case "overlap_unknown":
    case "cancel_unknown":
      return "unknown";
    case "insert_rejected":
    case "released_external_overlap":
    case "cancelled":
      return "not_recorded";
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}

function toPublic(booking: BookingRecord, verification: MailAcceptance = "not_sent"): PublicBooking {
  return {
    reference: booking.id,
    slot: { id: booking.slotId, start: booking.start, end: booking.end },
    draft: booking.draft,
    status: booking.status,
    calendarEvent: calendarEventOf(booking.status),
    mail: { verification, ...booking.mail, delivery: "not_observed" },
    googleNotifications: "suppressed_send_updates_none",
    googleNotificationCaveat: "provider_documents_that_some_mail_might_still_be_sent",
    delivery: "not_observed",
  };
}

function withCancel(booking: BookingRecord, verification?: MailAcceptance): PublicBooking & { cancelToken: string } {
  return { ...toPublic(booking, verification), cancelToken: booking.cancelToken };
}

function occupies(status: BookingStatus): boolean {
  return status === "insert_started" || status === "event_recorded" || status === "overlap_unknown" || status === "cancel_unknown";
}

async function loadSession(store: string, token: string, now: number): Promise<{ session: SessionRecord; hash: string }> {
  const hash = sha256(token);
  const session = await readSession(store, hash);
  if (!session || now > session.expiresAt || now > session.createdAt + SESSION_ABSOLUTE_MS) fail(401, "session_expired");
  session.touchedAt = now;
  session.expiresAt = Math.min(session.createdAt + SESSION_ABSOLUTE_MS, now + SESSION_SLIDING_MS);
  return { session, hash };
}

async function slotFree(store: string, slot: WarsawSlot, now: number, sessionHash: string): Promise<boolean> {
  const hold = await readHold(store, slot.id);
  if (holdIsActive(hold, now) && hold.sessionHash !== sessionHash) return false;
  const bookings = await listBookings(store);
  return !bookings.some((booking) => booking.slotId === slot.id && occupies(booking.status) && booking.sessionHash !== sessionHash);
}

async function calendarClear(calendar: CalendarTransport, slot: WarsawSlot): Promise<boolean> {
  const busy = await calendar.freeBusy(slot.start, slot.end);
  if (busy.kind !== "ok") fail(503, "calendar_unavailable");
  return !busy.busy.some((interval) => overlaps(slot.start, slot.end, interval.start, interval.end));
}

async function applyMail(deps: LiveBookingDeps, store: string, booking: BookingRecord, mail: Parameters<MailTransport["send"]>[0], field: keyof BookingRecord["mail"]): Promise<void> {
  if (booking.mail[field] === "accepted") return;
  const result = await deps.mail.send(mail);
  booking.mail[field] = result.kind === "accepted" ? "accepted" : result.kind === "rejected" ? "rejected" : "unknown";
  booking.updatedAt = deps.now();
  await writeBooking(store, booking);
}

function uidFor(booking: BookingRecord): string {
  return booking.iCalUid ?? `${booking.eventId}@mail.witnessops.com`;
}

export async function startLiveSession(deps: LiveBookingDeps, ipHash: string): Promise<{ token: string }> {
  const token = randomBytes(32).toString("hex");
  const now = deps.now();
  await withStoreLock(deps.storeDir, async (store) => {
    const allowed = await consumeBudget(store, ipHash, STARTS_PER_IP_HOUR, HOUR_MS, now);
    if (!allowed) fail(429, "rate_limited");
    if (await countOpenSessions(store, now) >= MAX_OPEN_SESSIONS) fail(429, "busy");
    const session: SessionRecord = {
      tokenHash: sha256(token),
      createdAt: now,
      touchedAt: now,
      expiresAt: Math.min(now + SESSION_ABSOLUTE_MS, now + SESSION_SLIDING_MS),
      verifiedEmail: null,
      verificationExpiresAt: null,
      holdId: null,
      bookingId: null,
      codeSends: 0,
      lastCodeKey: null,
      lastCodeResult: null,
      lastVerificationId: null,
    };
    await writeSession(store, session);
  });
  return { token };
}

export async function liveAvailability(deps: LiveBookingDeps, token: string): Promise<{ slots: WarsawSlot[]; timeZone: "Europe/Warsaw" }> {
  const now = deps.now();
  const slots = warsawSlots(now);
  if (slots.length === 0) {
    await withStoreLock(deps.storeDir, async (store) => { await loadSession(store, token, now); });
    return { slots: [], timeZone: "Europe/Warsaw" };
  }
  const busy = await deps.calendar.freeBusy(slots[0].start, slots[slots.length - 1].end);
  if (busy.kind !== "ok") fail(503, "calendar_unavailable");
  return withStoreLock(deps.storeDir, async (store) => {
    const { session } = await loadSession(store, token, now);
    await writeSession(store, session);
    const holds = await listActiveHolds(store, now);
    const bookings = await listBookings(store);
    const open = slots.filter((slot) => {
      if (busy.busy.some((interval) => overlaps(slot.start, slot.end, interval.start, interval.end))) return false;
      if (holds.some((hold) => hold.slotId === slot.id && hold.sessionHash !== session.tokenHash)) return false;
      return !bookings.some((booking) => booking.slotId === slot.id && occupies(booking.status));
    });
    return { slots: open, timeZone: "Europe/Warsaw" as const };
  });
}

export async function requestLiveCode(deps: LiveBookingDeps, input: { token: string; email: string; idempotencyKey: string; emailHash: string }): Promise<{ acceptance: MailAcceptance; delivery: "not_observed" }> {
  const now = deps.now();
  const email = input.email.trim().toLowerCase();
  return withStoreLock(deps.storeDir, async (store) => {
    const { session } = await loadSession(store, input.token, now);
    if (session.lastCodeKey === input.idempotencyKey && session.lastCodeResult) {
      await writeSession(store, session);
      return { acceptance: session.lastCodeResult, delivery: "not_observed" as const };
    }
    if (session.codeSends >= CODE_MAX_SENDS) fail(429, "rate_limited");
    const allowed = await consumeBudget(store, input.emailHash, CODES_PER_EMAIL_HOUR, HOUR_MS, now);
    if (!allowed) fail(429, "rate_limited");
    const verificationId = newId("vf");
    const code = deps.newCode?.() ?? defaultCode();
    if (code === DEMO_CODE_FORBIDDEN) fail(500, "unavailable");
    const verification: VerificationRecord = {
      id: verificationId,
      sessionHash: session.tokenHash,
      email,
      codeHash: sha256(`${deps.pepper}\0${verificationId}\0${code}`),
      expiresAt: now + CODE_TTL_MS,
      attempts: 0,
      consumed: false,
    };
    session.codeSends += 1;
    session.lastCodeKey = input.idempotencyKey;
    session.lastVerificationId = verificationId;
    session.verifiedEmail = null;
    session.verificationExpiresAt = null;
    session.lastCodeResult = "unknown";
    await writeVerification(store, verification);
    await writeSession(store, session);
    const result = await deps.mail.send(verificationMail({ to: email, verificationId, code }));
    const acceptance: MailAcceptance = result.kind === "accepted" ? "accepted" : result.kind === "rejected" ? "rejected" : "unknown";
    const saved = await readVerification(store, verificationId);
    if (!saved) fail(503, "store_unavailable");
    if (acceptance === "rejected") saved.consumed = true;
    await writeVerification(store, saved);
    session.lastCodeResult = acceptance;
    await writeSession(store, session);
    return { acceptance: session.lastCodeResult, delivery: "not_observed" as const };
  });
}

export async function checkLiveCode(deps: LiveBookingDeps, input: { token: string; email: string; code: string }): Promise<{ code: "matched" | "rejected" | "expired" | "too_many_attempts" }> {
  const now = deps.now();
  const email = input.email.trim().toLowerCase();
  return withStoreLock(deps.storeDir, async (store) => {
    const { session } = await loadSession(store, input.token, now);
    const verification = session.lastVerificationId ? await readVerification(store, session.lastVerificationId) : null;
    if (!verification || verification.consumed || verification.email !== email || verification.expiresAt <= now) {
      await writeSession(store, session);
      return { code: "expired" as const };
    }
    verification.attempts += 1;
    if (verification.attempts > CODE_MAX_ATTEMPTS) {
      verification.consumed = true;
      await writeVerification(store, verification);
      await writeSession(store, session);
      return { code: "too_many_attempts" as const };
    }
    const expected = sha256(`${deps.pepper}\0${verification.id}\0${input.code}`);
    if (input.code === DEMO_CODE_FORBIDDEN || !hashesEqual(verification.codeHash, expected)) {
      await writeVerification(store, verification);
      await writeSession(store, session);
      return { code: "rejected" as const };
    }
    verification.consumed = true;
    session.verifiedEmail = email;
    session.verificationExpiresAt = verification.expiresAt;
    await writeVerification(store, verification);
    await writeSession(store, session);
    return { code: "matched" as const };
  });
}

export async function prepareLiveHold(deps: LiveBookingDeps, input: { token: string; slotId: string; draft: BookingDraft }): Promise<{ hold: { id: string; expiresAt: number; slot: WarsawSlot; draft: BookingDraft } }> {
  const now = deps.now();
  const slot = warsawSlots(now).find((candidate) => candidate.id === input.slotId);
  if (!slot) fail(409, "slot_unavailable");
  const email = input.draft.email.trim().toLowerCase();
  const draft = { ...input.draft, email, topic: input.draft.topic.trim(), name: input.draft.name.trim() };
  return withStoreLock(deps.storeDir, async (store) => {
    const { session, hash } = await loadSession(store, input.token, now);
    if (session.verifiedEmail !== email || !session.verificationExpiresAt || session.verificationExpiresAt <= now) fail(409, "code_required");
    if (!await calendarClear(deps.calendar, slot) || !await slotFree(store, slot, now, hash)) fail(409, "slot_unavailable");
    const existing = await readHold(store, slot.id);
    const hold: HoldRecord = {
      id: holdIsActive(existing, now) && existing.sessionHash === hash ? existing.id : newId("hld"),
      slotId: slot.id,
      start: slot.start,
      end: slot.end,
      sessionHash: hash,
      draft,
      expiresAt: now + HOLD_MS,
    };
    session.holdId = hold.id;
    await writeHold(store, hold);
    await writeSession(store, session);
    return { hold: { id: hold.id, expiresAt: hold.expiresAt, slot, draft } };
  });
}

export async function confirmLiveBooking(deps: LiveBookingDeps, input: { token: string; holdId: string; idempotencyKey: string }): Promise<{ booking: PublicBooking & { cancelToken: string } }> {
  const now = deps.now();
  return withStoreLock(deps.storeDir, async (store) => {
    const { session, hash } = await loadSession(store, input.token, now);
    const existingBooking = session.bookingId ? await readBooking(store, session.bookingId) : null;
    if (existingBooking) {
      if (existingBooking.idempotencyKey !== input.idempotencyKey) fail(409, "invalid");
      await writeSession(store, session);
      return { booking: await settle(deps, store, existingBooking) };
    }
    const holds = await listActiveHolds(store, 0);
    const hold = holds.find((item) => item.id === input.holdId && item.sessionHash === hash);
    if (!hold || hold.expiresAt <= now) {
      if (hold) await deleteHold(store, hold.slotId);
      await writeSession(store, session);
      fail(409, "expired");
    }
    const eventId = newCalendarEventId();
    const cancelToken = randomBytes(32).toString("hex");
    const booking: BookingRecord = {
      id: `bk_${eventId}`,
      sessionHash: hash,
      cancelTokenHash: sha256(`${deps.pepper}\0${cancelToken}`),
      cancelToken,
      slotId: hold.slotId,
      start: hold.start,
      end: hold.end,
      draft: hold.draft,
      eventId,
      iCalUid: null,
      status: "insert_started",
      mail: { ...emptyMail },
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    };
    await writeBooking(store, booking);
    await writeCancellation(store, booking.cancelTokenHash, booking.id);
    session.bookingId = booking.id;
    await writeSession(store, session);
    return { booking: await settle(deps, store, booking) };
  });
}

function slotTimes(booking: BookingRecord): WarsawSlot {
  return { id: booking.slotId, start: booking.start, end: booking.end };
}

async function settle(deps: LiveBookingDeps, store: string, booking: BookingRecord): Promise<PublicBooking & { cancelToken: string }> {
  const now = deps.now();
  if (booking.status === "insert_rejected" || booking.status === "released_external_overlap" || booking.status === "cancelled") {
    return withCancel(booking);
  }
  if (booking.status === "insert_started") {
    const existing = await deps.calendar.getEvent(booking.eventId);
    if (existing.kind === "unknown" || existing.kind === "rejected") {
      booking.updatedAt = now;
      await writeBooking(store, booking);
      return withCancel(booking);
    }
    if (existing.kind === "absent") {
      const slot = slotTimes(booking);
      if (!await calendarClear(deps.calendar, slot)) {
        booking.status = "insert_rejected";
        booking.updatedAt = now;
        await writeBooking(store, booking);
        await deleteHold(store, booking.slotId);
        return withCancel(booking);
      }
      const inserted = await deps.calendar.insertEvent({
        eventId: booking.eventId,
        bookingId: booking.id,
        start: booking.start,
        end: booking.end,
        summary: "WitnessOps fit call",
        description: `${booking.draft.topic}\nReference ${booking.id}`,
        attendeeEmail: booking.draft.email,
        attendeeName: booking.draft.name,
      });
      if (inserted.kind === "conflict") {
        const again = await deps.calendar.getEvent(booking.eventId);
        if (again.kind !== "ok") {
          booking.updatedAt = now;
          await writeBooking(store, booking);
          return withCancel(booking);
        }
        booking.iCalUid = again.iCalUid;
        booking.status = again.status === "cancelled" ? "cancelled" : "event_recorded";
      } else if (inserted.kind !== "ok") {
        if (inserted.kind === "rejected") {
          booking.status = "insert_rejected";
          await deleteHold(store, booking.slotId);
        }
        booking.updatedAt = now;
        await writeBooking(store, booking);
        return withCancel(booking);
      } else {
        booking.iCalUid = inserted.iCalUid;
        booking.status = "event_recorded";
      }
      booking.updatedAt = now;
      await writeBooking(store, booking);
    } else {
      booking.iCalUid = existing.iCalUid;
      booking.status = existing.status === "cancelled" ? "cancelled" : "event_recorded";
      booking.updatedAt = now;
      await writeBooking(store, booking);
    }
  }
  if (booking.status === "event_recorded" || booking.status === "overlap_unknown") {
    const overlap = await deps.calendar.listBlocking(booking.start, booking.end, booking.eventId);
    if (overlap.kind !== "ok") {
      booking.status = "overlap_unknown";
      booking.updatedAt = now;
      await writeBooking(store, booking);
      return withCancel(booking);
    }
    if (overlap.overlaps) {
      const cancelled = await deps.calendar.cancelEvent(booking.eventId);
      booking.status = cancelled.kind === "ok" || cancelled.kind === "absent" ? "released_external_overlap" : "cancel_unknown";
      booking.updatedAt = now;
      await writeBooking(store, booking);
      if (booking.status === "released_external_overlap") await deleteHold(store, booking.slotId);
      return withCancel(booking);
    }
    booking.status = "event_recorded";
    await applyMail(deps, store, booking, confirmationMail({
      to: booking.draft.email,
      bookingId: booking.id,
      draft: booking.draft,
      start: booking.start,
      end: booking.end,
    }), "confirmation");
    if (booking.mail.confirmation === "accepted") {
      await applyMail(deps, store, booking, inviteMail({
        to: booking.draft.email,
        bookingId: booking.id,
        draft: booking.draft,
        start: booking.start,
        end: booking.end,
        uid: uidFor(booking),
      }), "invite");
    }
    await deleteHold(store, booking.slotId);
    return withCancel(booking);
  }
  return withCancel(booking);
}

export async function cancelLiveBooking(deps: LiveBookingDeps, input: { token?: string; cancelToken?: string; reference: string }): Promise<{ booking: PublicBooking }> {
  const now = deps.now();
  return withStoreLock(deps.storeDir, async (store) => {
    let booking: BookingRecord | null = null;
    if (input.token) {
      const { session } = await loadSession(store, input.token, now);
      if (session.bookingId !== input.reference) fail(404, "not_found");
      booking = await readBooking(store, input.reference);
      await writeSession(store, session);
    } else if (input.cancelToken) {
      const cancelHash = sha256(`${deps.pepper}\0${input.cancelToken}`);
      const index = await readCancellation(store, cancelHash);
      if (!index || index.bookingId !== input.reference) fail(404, "not_found");
      booking = await readBooking(store, input.reference);
      if (!booking || !hashesEqual(booking.cancelTokenHash, cancelHash)) fail(404, "not_found");
    } else fail(400, "invalid");
    if (!booking) fail(404, "not_found");
    if (booking.status === "cancelled" || booking.status === "released_external_overlap" || booking.status === "insert_rejected") {
      if (booking.status !== "cancelled") {
        booking.status = "cancelled";
        booking.updatedAt = now;
        await writeBooking(store, booking);
      }
      return { booking: toPublic(booking) };
    }
    if (booking.status === "insert_started") {
      const existing = await deps.calendar.getEvent(booking.eventId);
      if (existing.kind === "unknown" || existing.kind === "rejected") {
        booking.status = "cancel_unknown";
        booking.updatedAt = now;
        await writeBooking(store, booking);
        return { booking: toPublic(booking) };
      }
      if (existing.kind === "absent") {
        booking.status = "cancelled";
        booking.updatedAt = now;
        await writeBooking(store, booking);
        await deleteHold(store, booking.slotId);
        return { booking: toPublic(booking) };
      }
    }
    const cancelled = await deps.calendar.cancelEvent(booking.eventId);
    if (cancelled.kind === "unknown" || cancelled.kind === "rejected") {
      booking.status = "cancel_unknown";
      booking.updatedAt = now;
      await writeBooking(store, booking);
      return { booking: toPublic(booking) };
    }
    booking.status = "cancelled";
    booking.updatedAt = now;
    await writeBooking(store, booking);
    await deleteHold(store, booking.slotId);
    await applyMail(deps, store, booking, cancellationNoticeMail({
      to: booking.draft.email,
      bookingId: booking.id,
      draft: booking.draft,
      start: booking.start,
    }), "cancellationNotice");
    if (booking.mail.cancellationNotice === "accepted") {
      await applyMail(deps, store, booking, cancellationInviteMail({
        to: booking.draft.email,
        bookingId: booking.id,
        draft: booking.draft,
        start: booking.start,
        end: booking.end,
        uid: uidFor(booking),
      }), "cancellationInvite");
    }
    return { booking: toPublic(booking) };
  });
}

export async function readLiveSession(deps: LiveBookingDeps, token: string): Promise<SessionView> {
  const now = deps.now();
  return withStoreLock(deps.storeDir, async (store) => {
    const { session } = await loadSession(store, token, now);
    await writeSession(store, session);
    const holds = await listActiveHolds(store, now);
    const hold = holds.find((item) => item.id === session.holdId && item.sessionHash === session.tokenHash) ?? null;
    const booking = session.bookingId ? await readBooking(store, session.bookingId) : null;
    return {
      codeAccepted: Boolean(session.verifiedEmail && session.verificationExpiresAt && session.verificationExpiresAt > now),
      hold: hold ? {
        id: hold.id,
        expiresAt: hold.expiresAt,
        draft: hold.draft,
        slot: { id: hold.slotId, start: hold.start, end: hold.end },
      } : null,
      booking: booking ? withCancel(booking) : null,
    };
  });
}

export function storeFailure(error: unknown): LiveBookingFailure | null {
  if (error instanceof LiveBookingFailure) return error;
  if (error instanceof LiveBookingStoreError) {
    return new LiveBookingFailure(error.message === "busy" ? 429 : 503, error.message === "busy" ? "busy" : "store_unavailable");
  }
  return null;
}
