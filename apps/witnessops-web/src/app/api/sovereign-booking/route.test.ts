import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "./route";
import { BookingSession, sessions } from "@/lib/sovereign-booking-session";

function request(body: unknown, origin = "http://localhost:3012") { return new Request("http://localhost:3012/api/sovereign-booking", { method: "POST", headers: { Origin: origin, Host: "localhost:3012", "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
const draft = { topic: "Demo approval agent", stage: "planned", name: "Demo Visitor", email: "visitor@example.test", timezone: "Europe/Warsaw" };

test("preview route production boundary, origin, session isolation and explicit confirmation", async () => {
  const env = { NODE_ENV: process.env.NODE_ENV, NEXT_PUBLIC_WO_PREVIEW: process.env.NEXT_PUBLIC_WO_PREVIEW, OPENAI_API_KEY: process.env.OPENAI_API_KEY };
  try {
    Object.assign(process.env, { NODE_ENV: "production", NEXT_PUBLIC_WO_PREVIEW: "1", OPENAI_API_KEY: "fixture-never-used" });
    assert.equal((await POST(request({ action: "start" }))).status, 410);
    Object.assign(process.env, { NODE_ENV: "test", NEXT_PUBLIC_WO_PREVIEW: "0" });
    assert.equal((await POST(request({ action: "start" }))).status, 410);
    process.env.NEXT_PUBLIC_WO_PREVIEW = "1"; delete process.env.OPENAI_API_KEY;
    assert.equal((await POST(request({ action: "start" }, "https://evil.test"))).status, 403);
    assert.equal((await POST(request({ action: "start", padding: "x".repeat(70000) }))).status, 413);
    const first = await (await POST(request({ action: "start" }))).json();
    const second = await (await POST(request({ action: "start" }))).json();
    assert.equal(first.voiceAvailable, false); assert.notEqual(first.token, second.token);
    assert.equal((await POST(request({ action: "read", token: "unknown" }))).status, 401);
    const slots = await (await POST(request({ action: "availability", token: first.token }))).json();
    assert.equal((await POST(request({ action: "prepare", token: first.token, slotId: slots.slots[0].id, draft, code: "wrong" }))).status, 400);
    const prepared = await (await POST(request({ action: "prepare", token: first.token, slotId: slots.slots[0].id, draft, code: "314159" }))).json();
    assert.equal((await POST(request({ action: "confirm", token: second.token, holdId: prepared.hold.id }))).status, 409);
    const confirmation = { action: "confirm", token: first.token, holdId: prepared.hold.id };
    const result = await (await POST(request(confirmation))).json();
    assert.equal(result.booking.status, "confirmed");
    assert.deepEqual(await (await POST(request(confirmation))).json(), result);
    const next = await (await POST(request({ action: "prepare", token: first.token, slotId: slots.slots[2].id, draft, replaces: result.booking.reference, code: "314159" }))).json();
    await POST(request({ action: "release", token: first.token }));
    assert.equal((await POST(request({ action: "confirm", token: first.token, holdId: next.hold.id }))).status, 409);
    assert.equal((await POST(request({ action: "voice-start", token: first.token, sdp: "v=0-demo-sdp", locale: "en" }))).status, 503);
    await POST(request({ action: "end", token: first.token }));
    assert.equal((await POST(request({ action: "read", token: first.token }))).status, 401);
  } finally {
    sessions().clear();
    for (const [key, value] of Object.entries(env)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

test("voice handoff rejects stale proposals and claims only the current server revision", async () => {
  const env = { NODE_ENV: process.env.NODE_ENV, NEXT_PUBLIC_WO_PREVIEW: process.env.NEXT_PUBLIC_WO_PREVIEW };
  try {
    Object.assign(process.env, { NODE_ENV: "test", NEXT_PUBLIC_WO_PREVIEW: "1" });
    const session = new BookingSession(); sessions().set(session.token, session);
    const propose = () => session.tool("propose_booking", { ...draft, slotId: session.calendar.available()[0].id, revision: session.revision }, session.revision);
    let stops = 0;
    session.voice = { stop: async () => { stops++; return true; }, notify: () => {}, status: "connected", lastHeartbeat: Date.now() };
    propose();
    const staleRevision = session.revision;
    session.invalidate(); // A caller correction after a read snapshot was serialized.
    const handoff = (revision: number) => POST(request({ action: "voice-handoff", token: session.token, revision }));
    assert.deepEqual(await (await handoff(staleRevision)).json(), { accepted: false });
    assert.equal(stops, 0); assert.equal(session.voiceGeneration, 0);
    propose();
    const currentRevision = session.revision;
    const result = await (await handoff(currentRevision)).json();
    assert.equal(result.accepted, true); assert.equal(result.finalized, true);
    assert.equal(result.view.proposal.revision, currentRevision);
    assert.equal(result.view.voice, "off"); assert.equal(result.view.booking, null);
    assert.equal(stops, 1); assert.equal(session.voiceGeneration, 1);
    assert.equal(session.proposal, null);
    assert.deepEqual(await (await handoff(currentRevision)).json(), { accepted: false });
    propose();
    session.voice.stop = async () => { session.invalidate(); return true; };
    assert.deepEqual(await (await handoff(session.revision)).json(), { accepted: false });
  } finally {
    sessions().clear();
    for (const [key, value] of Object.entries(env)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
