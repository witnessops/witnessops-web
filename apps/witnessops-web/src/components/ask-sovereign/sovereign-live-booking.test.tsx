import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AskSovereignPreview } from "./ask-sovereign-preview";
import { LiveBookingResult, liveBookingStatusLines, type LiveBookingView } from "./sovereign-live-booking";

function booking(status: LiveBookingView["status"], calendarEvent: LiveBookingView["calendarEvent"], mail: Partial<LiveBookingView["mail"]> = {}): LiveBookingView {
  return {
    reference: "bk_0123456789abcdefghij",
    slot: { id: "waw-20261106-1500", start: "2026-11-06T14:00:00.000Z", end: "2026-11-06T14:20:00.000Z" },
    draft: { topic: "Synthetic agent refunds", stage: "planned", name: "Synthetic Person", email: "synthetic@example.test", timezone: "Europe/Warsaw" },
    status,
    calendarEvent,
    mail: {
      confirmation: "not_sent",
      invite: "not_sent",
      cancellationNotice: "not_sent",
      cancellationInvite: "not_sent",
      delivery: "not_observed",
      ...mail,
    },
    googleNotifications: "suppressed_send_updates_none",
    delivery: "not_observed",
  };
}

test("static assistant markup does not turn the fictional preview into live scheduling", () => {
  const saved = { node: process.env.NODE_ENV, preview: process.env.NEXT_PUBLIC_WO_PREVIEW };
  Object.assign(process.env, { NODE_ENV: "production", NEXT_PUBLIC_WO_PREVIEW: "1" });
  try {
    const html = renderToStaticMarkup(createElement(AskSovereignPreview, { connection: "api" }));
    assert.doesNotMatch(html, /Live scheduling is not enabled|data-live-booking-status|Book a fit call|Fictional calendar/);
  } finally {
    Object.assign(process.env, { NODE_ENV: saved.node });
    if (saved.preview === undefined) delete process.env.NEXT_PUBLIC_WO_PREVIEW;
    else process.env.NEXT_PUBLIC_WO_PREVIEW = saved.preview;
  }
});

test("live booking copy keeps event, mail acceptance, and delivery apart", () => {
  const recorded = renderToStaticMarkup(createElement(LiveBookingResult, {
    locale: "en",
    booking: booking("event_recorded", "recorded", { confirmation: "accepted", invite: "unknown" }),
  }));
  assert.match(recorded, /A calendar event was recorded/);
  assert.match(recorded, /Confirmation: accepted by the mail provider/);
  assert.match(recorded, /Invitation: acceptance unknown/);
  assert.match(recorded, /Inbox delivery is not observed/);
  assert.match(recorded, /some mail might still be sent/);
  assert.doesNotMatch(recorded, /verified|delivered to the inbox|booking confirmed/i);
  const unknown = liveBookingStatusLines("en", booking("insert_started", "unknown"));
  assert.match(unknown.join(" "), /not a completed scheduling result/);
  const cancelled = renderToStaticMarkup(createElement(LiveBookingResult, {
    locale: "pl",
    booking: booking("cancelled", "not_recorded", { cancellationNotice: "accepted", cancellationInvite: "rejected" }),
  }));
  assert.match(cancelled, /Anulowanie zostało zapisane/);
  assert.match(cancelled, /Dostarczenie do skrzynki nie jest obserwowane/);
  assert.match(cancelled, /odrzucone/);
});
