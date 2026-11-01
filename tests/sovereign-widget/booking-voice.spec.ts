import { test, expect, type Page } from "./booking-fixtures";

async function fixture(page: Page, permission: "allow" | "deny" | "pending", options: { proposal?: boolean; finalized?: boolean } = {}) {
  await page.addInitScript((mode) => {
    const state = { stopped: 0, requested: 0, closed: 0, resolve: null as null | (() => void), emit: null as null | ((event: object) => void) };
    Object.assign(window, { voiceFixture: state });
    const stream = { getTracks: () => [{ kind: "audio", enabled: true, stop: () => { state.stopped++; } }] };
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: async () => {
      state.requested++;
      if (mode === "deny") throw new DOMException("Declined", "NotAllowedError");
      if (mode === "pending") await new Promise<void>((resolve) => { state.resolve = resolve; });
      return stream;
    } } });
    class FakePeer {
      iceGatheringState = "complete";
      connectionState = "connected";
      localDescription = { sdp: "v=0-mocked-offer" };
      onconnectionstatechange = null;
      channel = { readyState: "open", onmessage: null as null | ((message: { data: string }) => void), onclose: null, send: () => {}, close: () => {} };
      addTrack() {}
      createDataChannel() { state.emit = (event) => this.channel.onmessage?.({ data: JSON.stringify(event) }); return this.channel; }
      async createOffer() { return this.localDescription; }
      async setLocalDescription() {}
      async setRemoteDescription() { this.channel.onmessage?.({ data: JSON.stringify({ type: "session.started" }) }); }
      close() { state.closed++; }
    }
    Object.defineProperty(window, "RTCPeerConnection", { value: FakePeer });
  }, permission);
  let live = false;
  let proposal: object | null = null;
  const actions: string[] = [];
  await page.route("**/api/sovereign-booking", async (route) => {
    const body = route.request().postDataJSON(); actions.push(body.action);
    if (body.action === "start") { const result = await route.fetch(); await route.fulfill({ response: result, json: { ...await result.json(), voiceAvailable: true } }); return; }
    if (body.action === "voice-start") {
      const result = await page.request.post("/api/sovereign-booking", { headers: { origin: "http://127.0.0.1:3012" }, data: { action: "availability", token: body.token } });
      const slot = (await result.json()).slots[0];
      proposal = { topic: "Voice demo approval agent", stage: "planned", name: "Demo Visitor", email: "visitor@example.test", timezone: "Europe/Warsaw", slotId: slot.id, revision: 4 };
      live = true; await route.fulfill({ json: { sdp: "v=0-mocked-answer" } }); return;
    }
    if (["read", "heartbeat"].includes(body.action) && live) { await route.fulfill({ json: { revision: 4, proposal: options.proposal === false ? null : proposal, hold: null, booking: null, voice: "connected", search: [{ id: (proposal as { slotId: string }).slotId, label: "A fictional available time" }] } }); return; }
    if (body.action === "voice-handoff" && live) {
      await page.evaluate(() => (window as unknown as { voiceFixture: { emit: (event: object) => void } }).voiceFixture.emit({ type: "session.closed" }));
      await route.fulfill({ json: { accepted: true, finalized: options.finalized !== false, view: { revision: 4, proposal, hold: null, booking: null, voice: "off", search: [{ id: (proposal as { slotId: string }).slotId, label: "A fictional available time" }] } } }); return;
    }
    if (body.action === "voice-stop") { live = false; await route.fulfill({ json: { finalized: options.finalized !== false } }); return; }
    await route.continue();
  });
  await page.goto("/docs/assistant");
  expect(await page.evaluate(() => (document as Document & { featurePolicy?: { allowsFeature: (name: string) => boolean } }).featurePolicy?.allowsFeature("microphone"))).toBe(true);
  await page.getByRole("button", { name: /Book a fit call/ }).click();
  await page.getByRole("button", { name: "Voice", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start voice", exact: true })).toBeEnabled();
  return actions;
}

test("voice is opt-in; denied microphone leaves the form available and creates no call", async ({ page }) => {
  const actions = await fixture(page, "deny");
  expect(await page.evaluate(() => (window as unknown as { voiceFixture: { requested: number } }).voiceFixture.requested)).toBe(0);
  await page.getByRole("button", { name: "Start voice", exact: true }).click();
  await expect(page.locator("[data-booking-voice]").getByRole("alert")).toContainText("Microphone access is blocked");
  await expect(page.getByLabel("One agent or automation action")).toBeEnabled();
  expect(actions).not.toContain("voice-start");
});

test("cancel during permission prompt stops a late microphone grant", async ({ page }) => {
  const actions = await fixture(page, "pending");
  await page.getByRole("button", { name: "Start voice", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { voiceFixture: { requested: number } }).voiceFixture.requested)).toBe(1);
  await page.getByRole("button", { name: "Stop voice · use form", exact: true }).click();
  await page.evaluate(() => (window as unknown as { voiceFixture: { resolve: () => void } }).voiceFixture.resolve());
  await expect.poll(() => page.evaluate(() => (window as unknown as { voiceFixture: { stopped: number } }).voiceFixture.stopped)).toBeGreaterThan(0);
  expect(actions).not.toContain("voice-start");
});

test("voice proposal automatically ends voice, unlocks edits, and requires explicit confirmation", async ({ page }) => {
  const actions = await fixture(page, "allow");
  await page.getByRole("button", { name: "Start voice", exact: true }).click();
  await expect(page.getByText("Listening — you can interrupt me", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Demo Visitor");
  await expect(page.getByLabel("Name", { exact: true })).toBeEnabled();
  await expect(page.getByText("Microphone off. Review your details — nothing is booked yet.", { exact: true })).toBeVisible();
  await expect(page.getByText("A fictional available time")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Who is the call for?", exact: true })).toBeFocused();
  await page.getByLabel("Name", { exact: true }).fill("Updated Demo Visitor");
  await page.getByLabel("Email", { exact: true }).fill("updated@example.test");
  await page.screenshot({ path: "artifacts/sovereign-widget/voice-handoff-editable.png" });
  await page.getByRole("button", { name: "Continue to demo email check", exact: true }).click();
  await expect(page.getByLabel("Demo code", { exact: true })).toBeEditable();
  await page.getByLabel("Demo code", { exact: true }).fill("000000");
  await page.getByRole("button", { name: "Check demo code", exact: true }).click();
  await expect(page.locator("[data-booking-preview]").getByRole("alert")).toContainText("Use the demo code shown above");
  expect(actions).not.toContain("prepare");
  expect(actions).not.toContain("confirm");
  await page.getByLabel("Demo code", { exact: true }).fill("314159");
  await page.getByRole("button", { name: "Check demo code", exact: true }).click();
  await expect(page.locator("[data-booking-summary]")).toContainText("Voice demo approval agent");
  await expect(page.locator("[data-booking-summary]")).toContainText("Updated Demo Visitor");
  await expect(page.locator("[data-booking-summary]")).toContainText("updated@example.test");
  expect(actions).not.toContain("confirm");
  await expect.poll(() => page.evaluate(() => (window as unknown as { voiceFixture: { stopped: number } }).voiceFixture.stopped)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Confirm demo booking", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Demo call booked", exact: true })).toBeVisible();
  expect(actions.indexOf("voice-stop")).toBeLessThan(actions.indexOf("confirm"));
});

test("voice can still be muted or stopped before a complete proposal", async ({ page }) => {
  const actions = await fixture(page, "allow", { proposal: false });
  await page.getByRole("button", { name: "Start voice", exact: true }).click();
  await expect(page.getByText("Listening — you can interrupt me", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await expect(page.getByText("Microphone muted", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Stop voice · use form", exact: true }).click();
  await expect(page.getByLabel("One agent or automation action")).toBeEnabled();
  expect(actions).toContain("voice-stop");
  expect(actions).not.toContain("confirm");
});

for (const correction of ["browser transcript", "server revision"]) {
  test(`a delayed proposal cannot end voice after a ${correction} correction`, async ({ page }) => {
    const actions = await fixture(page, "allow", { proposal: false });
    let reads = 0, handoffs = 0;
    let releaseRead!: () => void;
    let readStarted!: () => void;
    const waiting = new Promise<void>((resolve) => { releaseRead = resolve; });
    const started = new Promise<void>((resolve) => { readStarted = resolve; });
    await page.route("**/api/sovereign-booking", async (route) => {
      const body = route.request().postDataJSON();
      if (body.action === "voice-handoff") { handoffs++; await route.fulfill({ json: { accepted: false } }); return; }
      if (body.action !== "read") { await route.fallback(); return; }
      const stale = ++reads === 1;
      if (stale) { readStarted(); await waiting; }
      await route.fulfill({ json: { revision: stale ? 4 : 5, proposal: stale ? { revision: 4, topic: "Obsolete voice preferences", stage: "planned", name: "Old Visitor", email: "old@example.test", timezone: "Europe/Warsaw", slotId: "old-slot" } : null, hold: null, booking: null, voice: "connected", search: [] } });
    });
    await page.getByRole("button", { name: "Start voice", exact: true }).click();
    await started;
    if (correction === "browser transcript") await page.evaluate(() => {
      (window as unknown as { voiceFixture: { emit: (event: object) => void } }).voiceFixture.emit({ type: "session.input_transcript.delta", delta: "Actually, a different time." });
    });
    releaseRead();
    await expect.poll(() => reads).toBeGreaterThan(1);
    await expect(page.getByText("Listening — you can interrupt me", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Who is the call for?", exact: true })).toHaveCount(0);
    await expect(page.getByLabel("One agent or automation action")).toHaveValue("");
    expect(handoffs).toBe(correction === "server revision" ? 1 : 0);
    expect(actions).not.toContain("voice-stop");
    expect(actions).not.toContain("confirm");
    await page.getByRole("button", { name: "Stop voice · use form", exact: true }).click();
  });
}

test("unconfirmed voice shutdown keeps the proposal editable and reports the limitation", async ({ page }) => {
  const actions = await fixture(page, "allow", { finalized: false });
  await page.getByRole("button", { name: "Start voice", exact: true }).click();
  await expect(page.getByLabel("Name", { exact: true })).toBeEditable();
  await expect(page.locator("[data-booking-preview]").getByRole("alert")).toContainText("The service did not confirm the final session status");
  await expect.poll(() => page.evaluate(() => (window as unknown as { voiceFixture: { stopped: number } }).voiceFixture.stopped)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Continue to demo email check", exact: true }).click();
  await expect(page.getByLabel("Demo code", { exact: true })).toBeEditable();
  expect(actions).not.toContain("confirm");
});


test("microphone-free demo reaches confirmation without microphone or OpenAI calls", async ({ page }) => {
  const actions = await fixture(page, "deny");
  await page.getByRole("button", { name: "Type", exact: true }).click();
  await page.getByRole("button", { name: "Use demo example", exact: true }).click();
  const slot = page.getByRole("group", { name: "Available times" }).getByRole("button").first();
  await slot.click();
  await page.getByRole("button", { name: "Continue with this time", exact: true }).click();
  await page.getByRole("button", { name: "Continue to demo email check", exact: true }).click();
  await page.getByLabel("Demo code", { exact: true }).fill("314159");
  await page.getByRole("button", { name: "Check demo code", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review your fit call" })).toBeVisible();
  expect(actions).not.toContain("confirm");
  expect(actions).not.toContain("voice-start");
  expect(await page.evaluate(() => (window as unknown as { voiceFixture: { requested: number } }).voiceFixture.requested)).toBe(0);
  await page.getByRole("button", { name: "Confirm demo booking", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Demo call booked", exact: true })).toBeVisible();
});

test("unanswered microphone permission times out and a late grant cannot reopen the call", async ({ page }) => {
  const actions = await fixture(page, "pending");
  await page.clock.install();
  await page.getByRole("button", { name: "Start voice", exact: true }).click();
  await expect(page.getByText("Waiting for microphone permission…", { exact: true })).toBeVisible();
  await page.clock.fastForward(16_000);
  await expect(page.getByText("Microphone off", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Use demo example", exact: true })).toBeEnabled();
  await page.evaluate(() => (window as unknown as { voiceFixture: { resolve: () => void } }).voiceFixture.resolve());
  await expect.poll(() => page.evaluate(() => (window as unknown as { voiceFixture: { stopped: number } }).voiceFixture.stopped)).toBeGreaterThan(0);
  expect(actions).not.toContain("voice-start");
});
