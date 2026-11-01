import { test } from "node:test";
import assert from "node:assert/strict";
import { BookingSession } from "./sovereign-booking-session";
import { BookingToolExecutor, bookingTools, liveConfig } from "./sovereign-booking-live";
import { BUYER_SERVICES } from "./buyer-services";
import { publicPaidReviews } from "./public-paid-reviews";
import { bookingBusinessFacts } from "./sovereign-booking-business";

const draft = { topic: "Refund approval agent", stage: "planned" as const, name: "Demo Visitor", email: "visitor@example.test", timezone: "Europe/Warsaw" };
const envelope = (event: object) => ({ type: "response.event", delegation_id: "delegation-1", event });

test("voice tools cannot save a booking and corrections invalidate a proposal and hold", () => {
  const session = new BookingSession();
  const slot = session.calendar.available()[0];
  session.tool("propose_booking", { ...draft, slotId: slot.id, revision: 0 }, 0);
  assert.equal(session.booking, null);
  assert.equal(session.proposal?.slotId, slot.id);
  session.hold = session.calendar.prepare(slot.id, draft);
  session.invalidate();
  assert.equal(session.hold, null); assert.equal(session.proposal, null);
  assert.equal(session.calendar.available().some((s) => s.id === slot.id), true);
  assert.deepEqual(session.tool("confirm_booking", {}, session.revision), { error: "unsupported_tool" });
  assert.equal(bookingTools.some((t) => /confirm|cancel/.test(t.name)), false);
});

test("search applies calendar dates in the requested timezone", () => {
  const session = new BookingSession();
  const slot = session.calendar.available()[0];
  const zone = "America/Los_Angeles";
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(new Date(slot.start));
  const result = session.tool("check_availability", { timezone: zone, day, period: "morning" }, 0) as { slots: unknown[] };
  assert.ok(result.slots.length > 0);
});

test("executor waits for completed response, executes once, then continues Responses", () => {
  const session = new BookingSession();
  const sent: { type?: string; item?: { output?: string } }[] = [];
  const executor = new BookingToolExecutor(session, (event) => sent.push(event), () => {});
  executor.event(envelope({ type: "response.created", response: { id: "response-1" } }));
  const call = envelope({ type: "response.output_item.done", item: { type: "function_call", call_id: "call-1", name: "check_availability", arguments: JSON.stringify({ timezone: "UTC", day: "", period: "all" }) } });
  executor.event(call); executor.event(call);
  assert.equal(sent.length, 0);
  executor.event(envelope({ type: "response.completed", response: { id: "response-1" } }));
  assert.deepEqual(sent.map((e) => e.type), ["response.item.create", "response.create"]);
  assert.ok(JSON.parse(sent[0].item!.output!).slots.length > 0);
  executor.event(envelope({ type: "response.completed" }));
  assert.equal(sent.length, 2);
});

test("speech arriving while a backend response is running rejects its late proposal", () => {
  const session = new BookingSession(); const sent: { item?: { output?: string } }[] = [];
  const executor = new BookingToolExecutor(session, (event) => sent.push(event), () => {});
  executor.event(envelope({ type: "response.created" }));
  executor.event(envelope({ type: "response.output_item.done", item: { type: "function_call", call_id: "old", name: "propose_booking", arguments: JSON.stringify({ ...draft, revision: 0, slotId: session.calendar.available()[0].id }) } }));
  executor.event({ type: "session.input_transcript.delta", delta: "Actually, afternoon." });
  executor.event(envelope({ type: "response.completed" }));
  assert.equal(JSON.parse(sent[0].item!.output!).error, "preferences_changed");
  assert.equal(session.proposal, null);
});

test("failed responses do not execute buffered calls; tool names and inputs are validated", () => {
  const session = new BookingSession(); const sent: object[] = [];
  const executor = new BookingToolExecutor(session, (event) => sent.push(event), () => {});
  executor.event(envelope({ type: "response.created" }));
  executor.event(envelope({ type: "response.output_item.done", item: { type: "function_call", call_id: "old", name: "propose_booking", arguments: "{}" } }));
  executor.event(envelope({ type: "response.failed" }));
  executor.event(envelope({ type: "response.completed" }));
  assert.equal(sent.length, 0);
  assert.throws(() => session.tool("propose_booking", { ...draft, revision: 0, slotId: "invented", extra: true }, 0));
  assert.equal(session.booking, null);
});

test("Live uses Responses and confines browser events to closing the call", () => {
  const config = liveConfig("pl");
  assert.equal(config.model, "gpt-live-1"); assert.equal(config.delegation.type, "responses");
  assert.deepEqual(config.client.data_channel.allowed_client_events, ["session.close"]);
  assert.equal(config.store, false);
  assert.ok(config.instructions.includes("Polish"));
  assert.equal(config.client.data_channel.allowed_server_events.some((event) => event.type === "response.event"), false);
});

test("business information selects active offers, localizes facts, and cannot change a booking", () => {
  const session = new BookingSession();
  const slot = session.calendar.available()[0];
  session.tool("propose_booking", { ...draft, slotId: slot.id, revision: 0 }, 0);
  session.hold = session.calendar.prepare(slot.id, draft);
  const before = JSON.stringify(session.view());
  for (const locale of ["en", "pl"] as const) {
    const result = session.tool("get_witnessops_information", { locale }, session.revision) as ReturnType<typeof bookingBusinessFacts>;
    assert.deepEqual(result.currentPaidReviews.map((offer) => offer.id), ["agent-action-security-review"]);
    const canonical = publicPaidReviews(BUYER_SERVICES)[0];
    assert.equal(result.currentPaidReviews[0].situation, canonical.situation[locale]);
    assert.equal(result.currentPaidReviews[0].scope, canonical.boundary[locale]);
    assert.equal(result.currentPaidReviews[0].price, canonical.price[locale]);
    assert.equal(result.demoCall.fictional, true);
    assert.equal(JSON.stringify(session.view()), before);
  }
  assert.throws(() => session.tool("get_witnessops_information", { locale: "en", includeRetired: true }, session.revision));
  assert.throws(() => session.tool("get_witnessops_information", { locale: "invented" }, session.revision));
});

test("Responses can retrieve business facts without a calendar search or proposal", () => {
  const session = new BookingSession();
  session.calendar.available = () => { throw new Error("Business questions must not search the calendar"); };
  const sent: { type?: string; item?: { output?: string } }[] = [];
  const executor = new BookingToolExecutor(session, (event) => sent.push(event), () => assert.fail("Business questions must not end voice"));
  executor.event(envelope({ type: "response.created" }));
  executor.event(envelope({ type: "response.output_item.done", item: { type: "function_call", call_id: "business-info", name: "get_witnessops_information", arguments: '{"locale":"en"}' } }));
  executor.event(envelope({ type: "response.completed" }));
  assert.deepEqual(sent.map((event) => event.type), ["response.item.create", "response.create"]);
  assert.equal(JSON.parse(sent[0].item!.output!).currentPaidReviews[0].id, "agent-action-security-review");
  assert.equal(session.revision, 0);
  assert.equal(session.proposal, null);
  assert.equal(session.booking, null);
});

test("both voice and Responses receive canonical business context before answering", () => {
  for (const locale of ["en", "pl"] as const) {
    const config = liveConfig(locale);
    const canonical = publicPaidReviews(BUYER_SERVICES)[0];
    assert.ok(config.instructions.includes(canonical.situation[locale]));
    assert.ok(config.delegation.responses.instructions.includes(canonical.situation[locale]));
    assert.ok(config.delegation.responses.tools.some((tool) => tool.name === "get_witnessops_information"));
  }
});
