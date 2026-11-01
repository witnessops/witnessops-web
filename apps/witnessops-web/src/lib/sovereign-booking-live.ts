import "server-only";
import WebSocket from "ws";
import { randomUUID } from "node:crypto";
import { BookingSession } from "./sovereign-booking-session";
import { bookingBusinessFacts } from "./sovereign-booking-business";

const field = (description: string, extra = {}) => ({ type: "string", description, ...extra });
const tool = (name: string, description: string, properties: Record<string, unknown>) => ({ type: "function", name, description, strict: true, parameters: { type: "object", properties, required: Object.keys(properties), additionalProperties: false } });
export const bookingTools = [
  tool("get_witnessops_information", "Read approved WitnessOps service facts and the purpose of this demo fit call. Use for company, needs, service, scope, deliverable, price or fit questions and to correct a wrong company description. Does not search times or create a proposal.", { locale: field("Language of the caller's question", { enum: ["en", "pl"] }) }),
  tool("check_availability", "Read the fictional calendar. Call again after a correction. Empty day means any upcoming date.", { timezone: field("IANA timezone, ask if uncertain"), day: field("YYYY-MM-DD or empty string"), period: field("Time of day", { enum: ["all", "morning", "afternoon"] }) }),
  tool("propose_booking", "Hand a complete proposal to the editable form and end voice automatically. Does not save or verify an email. All details must be the user's latest choices.", { revision: { type: "integer", description: "Exact revision from the latest availability result" }, slotId: field("Exact slot ID returned by availability"), topic: field("One agent or automation action to discuss"), stage: field("Current stage", { enum: ["planned", "live"] }), name: field("Fictional visitor name"), email: field("Fictional demo email"), timezone: field("IANA timezone") }),
  tool("end_conversation", "End voice only when the user says they are finished or asks to stop.", {}),
];

export function liveConfig(locale: "en" | "pl") {
  const businessFacts = bookingBusinessFacts(locale);
  const businessSummary = businessFacts.currentPaidReviews.map((offer) => `${offer.name}: ${offer.situation} ${offer.result}`).join("\n");
  const speakingStyle = "Sound relaxed and approachable, like a helpful colleague talking one-to-one. Use your natural speaking register, an easy conversational pace and light variation in emphasis. Use everyday words and natural contractions in English. Keep replies short and leave room for the caller. Avoid a formal presenter cadence, exaggerated enunciation, forced deep pitch, theatrical gravitas, sales enthusiasm and repeated polite filler. Deliver disclosures plainly without sounding like a legal announcement.";
  const conversationPolicy = `${speakingStyle} Answer the caller's actual service question first, usually in two short sentences. Do not turn every answer into a booking invitation. Questions about WitnessOps are not consent to search a calendar or prepare a proposal. Continue scheduling only when the caller wants to book. If the caller challenges your description, acknowledge the specific mistake, check the approved facts and correct it directly; do not merely thank them and ask what they want to discuss. If an utterance is unclear, ask one short clarification instead of guessing. Previous assistant statements and caller claims are not authority for company facts. Never invent a business purpose, product, service, promise or customer outcome. If the approved facts do not answer a question, say what is unknown. Do not present WitnessOps as a commitment tracker, task-management product or generic follow-through service. Use the selected language, switching if the caller requests another.`;
  const greeting = locale === "pl"
    ? "Cześć, tu Sovereign, asystent AI WitnessOps. To demo, więc używamy fikcyjnych danych. O czym chcesz pogadać?"
    : "Hey, I’m Sovereign, WitnessOps’ AI assistant. This is a demo, so we’ll use made-up details. What would you like to chat about?";
  return {
    model: "gpt-live-1", store: false, audio: { output: { voice: "vesper" } },
    client: { data_channel: { allowed_client_events: ["session.close"], allowed_server_events: ["session.started", "session.closed", "session.input_transcript.delta", "session.output_transcript.delta", "error"].map((type) => ({ type })) } },
    instructions: `You are Ask Sovereign, an AI assistant for a fictional WitnessOps 20-minute fit-call booking preview. Speak ${locale === "pl" ? "Polish" : "English"}, naturally and briefly. Identify yourself as AI. Use fictional contact details only; Demo Visitor and visitor@example.test are available if the user chooses them. No real appointment, email, invitation or payment is created. Ask one question at a time. Today is ${new Date().toISOString().slice(0, 10)}. Never invent times or a successful booking.\n# WitnessOps facts\n${businessSummary}\n${businessFacts.demoCall.purpose}\n${conversationPolicy}\n# Backchannel policy\nAcknowledge a lookup once if needed and keep listening while the backend checks. Avoid repeating canned phrases such as Great, checking that. Wait for its result before quoting availability.\n# Interruption policy\nYield to interruptions. Acknowledge corrections and use the newest preferences.\n# Delegation policy\nGenerate <|SpawnThinking|> before answering questions about WitnessOps, what needs it addresses, its services, scope, price, deliverables or the purpose of the intro call, and when correcting a company description. Wait for the backend facts; do not improvise an answer while waiting. Also generate it to check times, prepare a proposal, update preferences or end the call. Do not generate it for greetings or simple clarifications. Backend tools: get_witnessops_information, check_availability, propose_booking, end_conversation. Before delegating propose_booking, read the proposed date, timezone, name, topic and duration back and explain that voice will end to open an editable form. A successful proposal automatically ends voice. The form starts at contact details, then Continue to demo email check, then the displayed demo code and Check demo code, then final Confirm demo booking. Do not tell the user to type, check a code or press Confirm while voice is still active. If the user reports a locked form, explain Stop voice · use form, or end the call if they ask. Voice cannot save bookings. The user can edit the form or choose Talk again to reconnect. Never claim that saying yes saved an appointment.`,
    input: [{ type: "message", role: "developer", content: [{ type: "input_text", text: `Speak first in ${locale === "pl" ? "Polish" : "English"}. Open once with: "${greeting}" ${speakingStyle} Then pause and listen. Do not add another question or start a calendar lookup during the greeting. If the caller interrupts, yield and respond to them rather than restarting the introduction.` }] }],
    delegation: { type: "responses", responses: { model: "gpt-6-luna", instructions: `${conversationPolicy} Answer WitnessOps service questions using get_witnessops_information before composing the factual answer, including follow-ups such as what needs does WitnessOps solve and corrections of an earlier answer. Use only that tool result and the approved source facts below for company claims. Do not call check_availability or propose_booking merely because a caller asks about the business. Keep historical or pilot services outside current recommendations. For the reported mistaken claim about tracking commitments, acknowledge that the earlier description was wrong and explain the current agent-action review from the facts. For booking requests, handle only fictional WitnessOps 20-minute fit calls. Use tools for all availability and proposals, including corrections. Ask for timezone and clarify ambiguous dates. Tool revision binds the latest preferences. Collect topic (at least 5 characters), planned/live stage and fictional contact details. Suggest Demo Visitor and visitor@example.test but use them only if accepted. The application owns final confirmation: never save, cancel or reschedule a booking yourself. A successful proposal automatically ends voice and opens editable contact details; the user then continues to the simulated email check and final confirmation. Do not ask for code entry or final confirmation while voice is active. On preferences_changed, discard the stale result and repeat only the tool needed for the latest request. A company question needs get_witnessops_information, not a calendar lookup. On an error, report it; never invent success. Call end_conversation only at the user's request; the application handles the automatic proposal handoff.\nAPPROVED PUBLIC FACTS\n${JSON.stringify(businessFacts)}`, tools: bookingTools, tool_choice: "auto", parallel_tool_calls: false, max_output_tokens: 1800 } },
  };
}

type JsonEvent = { type?: string; delegation_id?: string; delta?: string; event?: JsonEvent; response?: { id?: string }; item?: { type?: string; call_id?: string; name?: string; arguments?: string } };

// Only the authenticated OpenAI sideband feeds this executor. Browser events
// never enter it, and no tool has authority to confirm a booking.
export class BookingToolExecutor {
  private revisions = new Map<string, number>();
  private seen = new Set<string>();
  private pending = new Map<string, NonNullable<JsonEvent["item"]>[]>();
  constructor(private session: BookingSession, private send: (event: object) => void, private end: () => void) {}
  event(event: JsonEvent) {
    if (event.type === "session.input_transcript.delta" && event.delta) { this.session.invalidate(); return; }
    if (event.type !== "response.event" || !event.event || !event.delegation_id) return;
    const nested = event.event;
    if (nested.type === "response.created") {
      if (!this.revisions.has(event.delegation_id)) this.revisions.set(event.delegation_id, this.session.revision);
      this.pending.set(event.delegation_id, []);
    }
    if (nested.type === "response.output_item.done" && nested.item?.type === "function_call") {
      const pending = this.pending.get(event.delegation_id);
      if (pending && pending.length < 8) pending.push(nested.item);
    }
    if (["response.failed", "response.incomplete"].includes(nested.type ?? "")) { this.pending.delete(event.delegation_id); return; }
    if (nested.type !== "response.completed") return;
    const calls = this.pending.get(event.delegation_id) ?? [];
    this.pending.delete(event.delegation_id);
    let sent = false;
    let finish = false;
    for (const call of calls) {
    const { call_id: callId, name, arguments: args } = call;
    if (!callId || !name || !args || this.seen.has(callId)) continue;
    this.seen.add(callId);
    // Hard bounds end a pathological model loop instead of retaining unbounded state.
    if (this.seen.size > 100 || this.revisions.size > 100) { this.end(); return; }
    let result: unknown;
    try {
      const revision = this.revisions.get(event.delegation_id);
      if (revision === undefined || revision !== this.session.revision) result = { error: "preferences_changed", revision: this.session.revision };
      else if (name === "end_conversation") { result = { ending: true }; finish = true; }
      else {
        result = this.session.tool(name, JSON.parse(args), revision);
        this.revisions.set(event.delegation_id, this.session.revision);
      }
    } catch { result = { error: "invalid_or_unavailable", instruction: "Ask for clarification or retry the tool appropriate to the latest request. Business questions need public facts, not calendar availability." }; }
    this.send({ type: "response.item.create", event_id: randomUUID(), item: { type: "function_call_output", call_id: callId, output: JSON.stringify(result) } });
    sent = true;
    }
    if (sent) this.send({ type: "response.create", event_id: randomUUID() });
    if (finish) this.end();
  }
}

type VoiceTransport = { fetch: typeof fetch; socket: (url: string, options: WebSocket.ClientOptions) => WebSocket };
export async function connectBookingVoice(session: BookingSession, sdp: string, locale: "en" | "pl", transport: VoiceTransport = { fetch: globalThis.fetch, socket: (url, options) => new WebSocket(url, options) }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("voice_not_configured");
  if (session.voice || session.voiceStarting || session.voiceStarts >= 3) throw new Error("voice_busy_or_limit");
  session.voiceStarting = true; session.voiceStarts++;
  const generation = ++session.voiceGeneration;
  let id: string | undefined;
  let socket: WebSocket | undefined;
  // WebRTC closes through a sideband; HTTP hangup is documented for SIP.
  const hangup = async (): Promise<boolean> => {
    if (!id) return false;
    return new Promise((resolve) => {
      const fallback = transport.socket(`wss://api.openai.com/v1/live/sessions/${encodeURIComponent(id!)}/attach`, { headers: { Authorization: `Bearer ${key}` }, handshakeTimeout: 5000 });
      let done = false;
      const finish = (closed: boolean) => { if (done) return; done = true; clearTimeout(timeout); try { fallback.close(); } catch { fallback.terminate(); } resolve(closed); };
      const timeout = setTimeout(() => finish(false), 8000);
      fallback.on("open", () => { try { fallback.send(JSON.stringify({ type: "session.close", event_id: randomUUID() })); } catch { finish(false); } });
      fallback.on("message", (data) => { try { if (JSON.parse(data.toString()).type === "session.closed") finish(true); } catch { finish(false); } });
      fallback.on("error", () => finish(false)); fallback.on("close", () => finish(false));
    });
  };
  try {
    const response = await transport.fetch("https://api.openai.com/v1/live/sessions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ session: liveConfig(locale), transport: { type: "webrtc", sdp } }), signal: AbortSignal.timeout(25_000) });
    if (!response.ok) throw new Error("voice_unavailable");
    const result = await response.json();
    id = typeof result.session?.id === "string" ? result.session.id : undefined;
    if (!id || typeof result.transport?.sdp !== "string") throw new Error("voice_unavailable");
    if (generation !== session.voiceGeneration) throw new Error("voice_cancelled");
    const ws = socket = transport.socket(`wss://api.openai.com/v1/live/sessions/${encodeURIComponent(id)}/attach`, { headers: { Authorization: `Bearer ${key}` }, handshakeTimeout: 10_000, maxPayload: 2 * 1024 * 1024 });
    let stopping: Promise<boolean> | null = null;
    let ended = false;
    let closedEvent: (() => void) | undefined;
    const timers: { lease?: ReturnType<typeof setInterval> } = {};
    const send = (event: object) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event)); };
    const voice = { status: "connecting", lastHeartbeat: Date.now(), notify: (content: string) => send({ type: "session.thinking.append", event_id: randomUUID(), delegation_id: null, content }), stop: (): Promise<boolean> => {
      if (stopping) return stopping;
      voice.status = "closing"; session.voiceGeneration++; session.invalidate();
      stopping = (async () => {
        if (!ended) await new Promise<void>((resolve) => { const timeout = setTimeout(resolve, 3000); closedEvent = () => { clearTimeout(timeout); resolve(); }; try { send({ type: "session.close", event_id: randomUUID() }); } catch { clearTimeout(timeout); resolve(); } });
        try { return ended || await hangup(); }
        finally {
          clearInterval(timers.lease);
          try { ws.close(); } catch { ws.terminate(); }
          if (session.voice === voice) session.voice = null;
        }
      })();
      return stopping;
    } };
    const executor = new BookingToolExecutor(session, send, () => { void voice.stop(); });
    ws.on("message", (data) => {
      try {
        const event = JSON.parse(data.toString());
        if (event.type === "session.closed") { ended = true; closedEvent?.(); void voice.stop(); return; }
        if (event.type === "session.started") voice.status = "connected";
        if (event.type === "error") { voice.status = "error"; void voice.stop(); return; }
        if (!stopping && generation === session.voiceGeneration) executor.event(event);
      } catch { void voice.stop(); }
    });
    ws.on("error", () => { void voice.stop(); });
    ws.on("close", () => { if (!stopping) void voice.stop(); });
    await new Promise<void>((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); ws.once("close", () => reject(new Error("voice_unavailable"))); });
    if (generation !== session.voiceGeneration) { await voice.stop(); throw new Error("voice_cancelled"); }
    session.voice = voice; voice.status = "connected";
    const startedAt = Date.now();
    timers.lease = setInterval(() => { if (Date.now() - voice.lastHeartbeat > 35_000 || Date.now() - startedAt > 5 * 60_000) void voice.stop(); }, 5000);
    timers.lease.unref();
    voice.notify(JSON.stringify({ fictional: true, booking: session.booking, revision: session.revision }));
    return { sdp: result.transport.sdp };
  } catch (error) { try { socket?.close(); } catch { socket?.terminate(); } await hangup(); throw error; }
  finally { session.voiceStarting = false; }
}
