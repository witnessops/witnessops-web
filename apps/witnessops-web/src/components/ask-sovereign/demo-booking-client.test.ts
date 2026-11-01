import assert from "node:assert/strict";
import test from "node:test";
import { bookingConnectionError, DemoBookingClient, DemoBookingRequestError } from "./demo-booking-client";

test("a failed booking session start can recover without reloading or duplicating a successful start", async (t) => {
  let starts = 0;
  t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    assert.equal(JSON.parse(init.body as string).action, "start");
    starts++;
    return starts === 1 ? Response.json({ error: "preview_busy" }, { status: 429 }) : Response.json({ token: "demo-session", voiceAvailable: false });
  });
  const client = new DemoBookingClient();
  await assert.rejects(client.ready(), (error) => error instanceof DemoBookingRequestError && error.status === 429);
  await Promise.all([client.ready(), client.ready()]);
  assert.equal(client.token, "demo-session");
  assert.equal(starts, 2);
});

test("booking connection errors do not blame contact details or expose raw server errors", () => {
  assert.match(bookingConnectionError(new TypeError("fetch failed"), "en"), /Couldn’t connect/);
  assert.match(bookingConnectionError(new DOMException("timeout", "TimeoutError"), "en"), /too long/);
  assert.match(bookingConnectionError(new DemoBookingRequestError("private", 429), "en"), /demo is busy/);
  assert.match(bookingConnectionError(new DemoBookingRequestError("private", 401), "en"), /session expired/);
  assert.match(bookingConnectionError(new DemoBookingRequestError("private", 410), "en"), /isn’t enabled/);
  assert.doesNotMatch(bookingConnectionError(new Error("private"), "en"), /private|details/);
});
