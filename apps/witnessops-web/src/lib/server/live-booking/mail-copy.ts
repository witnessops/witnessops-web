import { LIVE_BOOKING_ORGANIZER, LIVE_BOOKING_TIME_ZONE, type MailRole } from "./constants";
import { buildBookingIcs } from "./ics";
import type { BookingDraft } from "./records";
import { formatWarsawOffset } from "./warsaw-time";

export type OutboundMail = {
  role: MailRole;
  idempotencyKey: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  ics?: { method: "REQUEST" | "CANCEL"; filename: string; content: string };
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function when(iso: string, timeZone: string): string {
  const local = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "shortOffset",
  }).format(new Date(iso));
  return `${local}. Europe/Warsaw wall time ${formatWarsawOffset(iso)}. UTC ${iso}.`;
}

function paragraph(text: string): string {
  return `<p>${escapeHtml(text)}</p>`;
}

function message(subject: string, lines: string[], extra?: OutboundMail["ics"]): Pick<OutboundMail, "subject" | "text" | "html" | "ics"> {
  return {
    subject,
    text: lines.join("\n\n"),
    html: lines.map(paragraph).join(""),
    ics: extra,
  };
}

const CAVEAT = "Google Calendar is asked not to send its own invitation (sendUpdates=none). Google documents that some mail might still be sent. Inbox delivery is not observed.";

export function verificationMail(input: { to: string; verificationId: string; code: string }): OutboundMail {
  const body = message(
    "Your WitnessOps scheduling code",
    [
      `Scheduling code: ${input.code}`,
      "This message only checks that this mailbox can receive mail. It does not hold a time and it does not create a calendar event.",
      "The code expires in 15 minutes. Inbox delivery is not observed; provider acceptance is a separate step.",
    ],
  );
  return { role: "verification", idempotencyKey: `booking-verification/${input.verificationId}`, to: input.to, ...body };
}

export function confirmationMail(input: { to: string; bookingId: string; draft: BookingDraft; start: string; end: string }): OutboundMail {
  const body = message(
    "WitnessOps fit call calendar event recorded",
    [
      `A calendar event was recorded on ${LIVE_BOOKING_ORGANIZER} (${LIVE_BOOKING_TIME_ZONE}).`,
      `Reference ${input.bookingId}. ${when(input.start, input.draft.timezone)}`,
      `Topic: ${input.draft.topic}`,
      "This message is the confirmation. It is not the calendar invitation and it has no calendar attachment.",
      "A separate invitation message carries the calendar attachment. Provider acceptance is not inbox delivery.",
      "A fit call is a conversation. Delivery timing per signed SOW.",
      CAVEAT,
    ],
  );
  return { role: "confirmation", idempotencyKey: `booking-confirmation/${input.bookingId}`, to: input.to, ...body };
}

export function inviteMail(input: { to: string; bookingId: string; draft: BookingDraft; start: string; end: string; uid: string }): OutboundMail {
  const description = `WitnessOps fit call. Reference ${input.bookingId}. ${input.draft.topic}`;
  const ics = buildBookingIcs({
    method: "REQUEST",
    uid: input.uid,
    sequence: 0,
    start: input.start,
    end: input.end,
    summary: "WitnessOps fit call",
    description,
    organizer: LIVE_BOOKING_ORGANIZER,
    attendee: input.draft.email,
    attendeeName: input.draft.name,
  });
  const body = message(
    "Invitation: WitnessOps fit call",
    [
      "This message is the calendar invitation. The attachment is the invitation, not a second confirmation.",
      `Reference ${input.bookingId}. ${when(input.start, input.draft.timezone)}`,
      CAVEAT,
    ],
    { method: "REQUEST", filename: "witnessops-fit-call.ics", content: ics },
  );
  return { role: "invite", idempotencyKey: `booking-invite/${input.bookingId}`, to: input.to, ...body };
}

export function cancellationNoticeMail(input: { to: string; bookingId: string; draft: BookingDraft; start: string }): OutboundMail {
  const body = message(
    "WitnessOps fit call cancellation recorded",
    [
      `Cancellation was recorded for ${input.bookingId}.`,
      when(input.start, input.draft.timezone),
      "This message is the cancellation notice. It is not the calendar cancellation attachment.",
      "Provider acceptance is not inbox delivery.",
    ],
  );
  return { role: "cancellation_notice", idempotencyKey: `booking-cancel-notice/${input.bookingId}`, to: input.to, ...body };
}

export function cancellationInviteMail(input: { to: string; bookingId: string; draft: BookingDraft; start: string; end: string; uid: string }): OutboundMail {
  const ics = buildBookingIcs({
    method: "CANCEL",
    uid: input.uid,
    sequence: 1,
    start: input.start,
    end: input.end,
    summary: "WitnessOps fit call",
    description: `Cancelled. Reference ${input.bookingId}.`,
    organizer: LIVE_BOOKING_ORGANIZER,
    attendee: input.draft.email,
    attendeeName: input.draft.name,
  });
  const body = message(
    "Cancelled: WitnessOps fit call",
    [
      "This message is the calendar cancellation. The attachment uses method CANCEL.",
      `Reference ${input.bookingId}.`,
      CAVEAT,
    ],
    { method: "CANCEL", filename: "witnessops-fit-call-cancel.ics", content: ics },
  );
  return { role: "cancellation_invite", idempotencyKey: `booking-cancel-invite/${input.bookingId}`, to: input.to, ...body };
}
