import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter, once } from "node:events";
import WebSocket, { WebSocketServer } from "ws";
import { BookingSession } from "./sovereign-booking-session";
import { connectBookingVoice } from "./sovereign-booking-live";

class Socket extends EventEmitter {
  readyState = 1;
  sent: { type: string }[] = [];
  constructor() { super(); queueMicrotask(() => this.emit("open")); }
  send(raw: string) { const event = JSON.parse(raw); this.sent.push(event); if (event.type === "session.close") queueMicrotask(() => this.emit("message", Buffer.from('{"type":"session.closed"}'))); }
  close() { this.readyState = 3; this.emit("close"); }
}
const created = () => Response.json({ session: { id: "opaque/live-fixture" }, transport: { type: "webrtc", sdp: "answer-fixture" } });

test("server exchanges SDP, authenticates a private sideband, and finalizes before disconnect", async () => {
  const before = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = "fixture-key";
  const sockets: Socket[] = [];
  try {
    const session = new BookingSession();
    const result = await connectBookingVoice(session, "offer-fixture", "en", {
      fetch: async (url, options) => {
        assert.equal(url, "https://api.openai.com/v1/live/sessions");
        assert.equal((options?.headers as Record<string, string>).Authorization, "Bearer fixture-key");
        const body = JSON.parse(options?.body as string);
        assert.equal(body.transport.sdp, "offer-fixture"); assert.equal(body.session.delegation.type, "responses");
        return created();
      },
      socket: (url, options) => {
        assert.equal(url, "wss://api.openai.com/v1/live/sessions/opaque%2Flive-fixture/attach");
        assert.equal(options.headers?.Authorization, "Bearer fixture-key");
        const socket = new Socket(); sockets.push(socket); return socket as unknown as WebSocket;
      },
    });
    assert.deepEqual(result, { sdp: "answer-fixture" });
    assert.ok(session.voice);
    assert.equal(await session.voice.stop(), true);
    assert.equal(session.voice, null);
    assert.equal(sockets[0].sent.some((event) => event.type === "session.close"), true);
    assert.equal(sockets[0].readyState, 3);
  } finally { if (before === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = before; }
});

test("cancel during SDP creation closes the returned session and never attaches it to the UI", async () => {
  const before = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = "fixture-key";
  const session = new BookingSession(); const sockets: Socket[] = [];
  let resolve!: (response: Response) => void;
  try {
    const pending = connectBookingVoice(session, "offer-fixture", "en", { fetch: () => new Promise((done) => { resolve = done; }), socket: () => { const socket = new Socket(); sockets.push(socket); return socket as unknown as WebSocket; } });
    session.voiceGeneration++; resolve(created());
    await assert.rejects(pending, /voice_cancelled/);
    assert.equal(session.voice, null); assert.equal(session.voiceStarting, false);
    assert.equal(sockets.length, 1);
    assert.equal(sockets[0].sent[0].type, "session.close");
    assert.equal(sockets[0].readyState, 3);
  } finally { if (before === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = before; }
});


test("a failing socket send cannot leave voice stuck closing or reject cleanup", async () => {
  const before = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = "fixture-key";
  let fail = false;
  class FailingSocket extends Socket {
    override send(raw: string) { if (fail) throw new TypeError("fixture masking failure"); super.send(raw); }
  }
  const session = new BookingSession();
  try {
    await connectBookingVoice(session, "offer-fixture", "en", { fetch: async () => created(), socket: () => new FailingSocket() as unknown as WebSocket });
    fail = true;
    assert.equal(await session.voice!.stop(), false);
    assert.equal(session.voice, null);
    assert.equal(session.voiceStarting, false);
  } finally { if (before === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = before; }
});


test("native ws sends masked control frames without optional bufferutil", async () => {
  const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  let client: WebSocket | undefined;
  try {
    await once(server, "listening");
    server.on("connection", (socket) => socket.on("message", (message) => socket.send(message)));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    client = new WebSocket(`ws://127.0.0.1:${address.port}`);
    await once(client, "open", { signal: AbortSignal.timeout(3000) });
    const received = once(client, "message", { signal: AbortSignal.timeout(3000) });
    const payload = JSON.stringify({ type: "session.close", event_id: "fixture-".repeat(30) });
    client.send(payload);
    assert.equal((await received)[0].toString(), payload);
  } finally {
    client?.terminate();
    for (const socket of server.clients) socket.terminate();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
