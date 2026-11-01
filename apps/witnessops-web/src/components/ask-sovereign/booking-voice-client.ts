import type { DemoBookingClient, BookingView } from "./demo-booking-client";

export type VoiceStatus = "off" | "permission" | "connecting" | "listening" | "closing";
export class BookingVoiceClient {
  private generation = 0;
  private stream?: MediaStream;
  private peer?: RTCPeerConnection;
  private channel?: RTCDataChannel;
  private audio?: HTMLAudioElement;
  private timer?: ReturnType<typeof setTimeout>;
  private poll?: ReturnType<typeof setInterval>;
  private pollBusy = false;
  private status: VoiceStatus = "off";
  private muted = false;
  private inputRevision = 0;
  private handoffGeneration?: number;
  private stopPromise?: Promise<void>;
  constructor(private client: DemoBookingClient, private callbacks: { state: (status: VoiceStatus) => void; error: (message: string) => void; transcript: (speaker: "user" | "assistant", text: string) => void; view: (view: BookingView) => void }) {}
  private setStatus(status: VoiceStatus) { this.status = status; this.callbacks.state(status); }
  async start(locale: "en" | "pl") {
    if (this.status !== "off") return;
    const generation = ++this.generation;
    this.stopPromise = undefined; this.setStatus("connecting");
    try {
      await this.client.ready();
      await this.client.release();
      if (!this.client.voiceAvailable) throw new Error("voice_not_configured");
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("microphone_unavailable");
      if (generation !== this.generation) return;
      this.setStatus("permission");
      this.timer = setTimeout(() => { if (generation === this.generation) { this.callbacks.error("microphone_timeout"); void this.stop(); } }, 15_000);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (generation !== this.generation) { stream.getTracks().forEach((track) => track.stop()); return; }
      clearTimeout(this.timer);
      this.setStatus("connecting");
      this.timer = setTimeout(() => { if (generation === this.generation) { this.callbacks.error("connection_lost"); void this.stop(); } }, 45_000);
      this.stream = stream; this.muted = false;
      const peer = this.peer = new RTCPeerConnection();
      const audio = this.audio = new Audio(); audio.autoplay = true;
      peer.ontrack = (event) => { if (generation !== this.generation) return; audio.srcObject = new MediaStream([event.track]); void audio.play().catch(() => this.callbacks.error("sound_blocked")); };
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      const channel = this.channel = peer.createDataChannel("oai-events");
      const transportClosed = () => {
        if (generation !== this.generation) return;
        if (this.handoffGeneration === generation) {
          // The server closes voice before returning the claimed proposal. Stop
          // capture now, but let that response finish the handoff unless cancelled.
          this.stream?.getTracks().forEach((track) => { track.enabled = false; track.stop(); });
          this.setStatus("closing");
        } else void this.stop();
      };
      channel.onmessage = (message) => {
        if (generation !== this.generation) return;
        try {
          const event = JSON.parse(message.data);
          if (event.type === "session.started") { clearTimeout(this.timer); this.setStatus("listening"); }
          if (event.type === "session.closed") { transportClosed(); return; }
          if (event.type === "error") { this.callbacks.error("voice_unavailable"); void this.stop(); return; }
          if (["session.input_transcript.delta", "session.output_transcript.delta"].includes(event.type) && typeof event.delta === "string") {
            if (event.type === "session.input_transcript.delta" && event.delta) this.inputRevision++;
            this.callbacks.transcript(event.type === "session.input_transcript.delta" ? "user" : "assistant", event.delta);
          }
        } catch { this.callbacks.error("voice_unavailable"); void this.stop(); }
      };
      channel.onclose = transportClosed;
      peer.onconnectionstatechange = () => { if (["failed", "disconnected"].includes(peer.connectionState) && generation === this.generation) { if (this.handoffGeneration === generation) transportClosed(); else { this.callbacks.error("connection_lost"); void this.stop(); } } };
      await peer.setLocalDescription(await peer.createOffer());
      if (peer.iceGatheringState !== "complete") await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => { peer.removeEventListener("icegatheringstatechange", check); reject(new Error("connection_lost")); }, 10_000);
        const check = () => { if (peer.iceGatheringState === "complete") { clearTimeout(timeout); peer.removeEventListener("icegatheringstatechange", check); resolve(); } };
        peer.addEventListener("icegatheringstatechange", check); check();
      });
      if (generation !== this.generation) return;
      const result = await this.client.request<{ sdp: string }>("voice-start", { sdp: peer.localDescription?.sdp, locale });
      if (generation !== this.generation) return;
      await peer.setRemoteDescription({ type: "answer", sdp: result.sdp });
      if (generation !== this.generation) return;
      if ((this.status as VoiceStatus) !== "listening") {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => { if (this.status === "connecting") { this.callbacks.error("connection_lost"); void this.stop(); } }, 20_000);
      }
      let tick = 0;
      this.poll = setInterval(async () => {
        if (this.pollBusy || generation !== this.generation) return;
        this.pollBusy = true;
        try {
          const inputRevision = this.inputRevision;
          let view = await this.client.request<BookingView>(++tick % 10 === 0 ? "heartbeat" : "read");
          if (generation !== this.generation || inputRevision !== this.inputRevision) return;
          if (view.proposal && view.proposal.revision === view.revision) {
            this.handoffGeneration = generation;
            const handoff = await this.client.request<{ accepted: false } | { accepted: true; view: BookingView; finalized: boolean }>("voice-handoff", { revision: view.revision });
            if (generation !== this.generation || inputRevision !== this.inputRevision || !handoff.accepted) return;
            view = handoff.view;
            if (!handoff.finalized) this.callbacks.error("close_unconfirmed");
          }
          this.callbacks.view(view);
          if (view.voice === "off" || view.voice === "closing") void this.stop();
        } catch { if (generation === this.generation) { this.callbacks.error("connection_lost"); void this.stop(); } }
        finally { this.pollBusy = false; if (this.handoffGeneration === generation) this.handoffGeneration = undefined; }
      }, 750);
    } catch (error) {
      if (generation !== this.generation) return;
      this.callbacks.error(error instanceof Error ? (error.name === "NotAllowedError" || error.name === "NotFoundError" || error.name === "NotReadableError" ? error.name : error.message) : "voice_unavailable");
      await this.stop();
    }
  }
  mute() { this.muted = !this.muted; this.stream?.getTracks().forEach((track) => { track.enabled = !this.muted; }); return this.muted; }
  async enableSound() { try { await this.audio?.play(); } catch { this.callbacks.error("sound_blocked"); } }
  stop(): Promise<void> {
    if (this.stopPromise) return this.stopPromise;
    if (this.status === "off") return Promise.resolve();
    ++this.generation; this.setStatus("closing");
    // Disable input immediately. Keep transports briefly for the final close event.
    this.stream?.getTracks().forEach((track) => { track.enabled = false; track.stop(); });
    clearTimeout(this.timer); clearInterval(this.poll);
    this.audio?.pause();
    try { if (this.channel?.readyState === "open") this.channel.send(JSON.stringify({ type: "session.close", event_id: crypto.randomUUID() })); } catch { /* The server also closes the session. */ }
    this.stopPromise = (async () => {
      try { const result = await this.client.request<{ finalized: boolean }>("voice-stop"); if (!result.finalized) this.callbacks.error("close_unconfirmed"); }
      catch { this.callbacks.error("close_unconfirmed"); }
      finally { this.cleanup(); this.setStatus("off"); }
    })();
    return this.stopPromise;
  }
  private cleanup() {
    clearTimeout(this.timer); clearInterval(this.poll);
    this.stream?.getTracks().forEach((track) => track.stop()); this.stream = undefined;
    if (this.channel) { this.channel.onclose = null; this.channel.onmessage = null; this.channel.close(); this.channel = undefined; }
    if (this.peer) { this.peer.onconnectionstatechange = null; this.peer.close(); this.peer = undefined; }
    if (this.audio) { this.audio.pause(); this.audio.srcObject = null; this.audio = undefined; }
  }
  unload() { ++this.generation; this.cleanup(); this.client.unload(); }
}
