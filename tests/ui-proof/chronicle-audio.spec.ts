import { expect, test } from "@playwright/test";

const scopeEscalationChapter = "2040-the-scope-escalation";
const chapters = [
  "001-the-unauthorized-feline",
  "002-sir-whiskers-opens-a-pull-request",
  "003-the-meeting-nobody-authorized",
  "004-the-agent-who-scheduled-a-meeting-with-himself",
  "005-the-dashboard-that-never-was",
  scopeEscalationChapter,
];

test("each Chronicle has narration without loading or playing it automatically", async ({ page }) => {
  const audioRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/audio/chronicles/")) audioRequests.push(request.url());
  });
  for (const slug of chapters) {
    await page.goto(`/chronicles/${slug}`, { waitUntil: "networkidle" });
    const player = page.locator("[data-chronicle-audio]");
    await expect(player).toBeVisible();
    await expect(player).toContainText("AI narration");
    await expect(player.getByRole("button", { name: "Play narration" })).toBeVisible();
    await expect(player.locator("audio")).toHaveAttribute("preload", "none");
    await expect(player.locator("audio")).toHaveAttribute("src", /^\/audio\/chronicles\/chapter-\d{3,4}-[a-f0-9]{12}\.mp3$/);
    expect(await player.locator("audio").evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(true);
  }
  expect(audioRequests).toEqual([]);
});

for (const slug of [chapters[0], scopeEscalationChapter]) {
  for (const width of [320, 390, 1440]) {
    test(`${slug} narration playback, seeking and speed work at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/chronicles/${slug}`);
      const player = page.locator("[data-chronicle-audio]");
      const audio = player.locator("audio");
      await audio.evaluate((element: HTMLAudioElement) => { element.muted = true; });
      await player.getByRole("button", { name: "Play narration" }).click();
      await expect(player.getByRole("button", { name: "Pause narration" })).toBeVisible();
      await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
      await player.getByRole("combobox", { name: "Playback speed" }).selectOption("1.5");
      expect(await audio.evaluate((element: HTMLAudioElement) => element.playbackRate)).toBe(1.5);
      await player.getByRole("button", { name: "Pause narration" }).click();
      const seek = player.getByRole("slider", { name: "Narration position" });
      await seek.focus();
      await seek.press("ArrowRight");
      expect(await audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
      await seek.press("End");
      expect(await audio.evaluate((element: HTMLAudioElement) => Math.abs(element.duration - element.currentTime))).toBeLessThan(1);
      await seek.press("Home");
      expect(await audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeLessThan(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await player.boundingBox())!.height).toBeLessThanOrEqual(80);
      await expect(player.getByRole("status")).toBeEmpty();
    });
  }
}

test("narration stops and releases its source when navigating to another chapter", async ({ page }) => {
  await page.addInitScript(() => {
    const Context = window.AudioContext;
    const contexts: AudioContext[] = [];
    Object.assign(window, { __chronicleAudioContexts: contexts });
    window.AudioContext = class extends Context {
      constructor(options?: AudioContextOptions) {
        super(options);
        contexts.push(this);
      }
    };
  });
  await page.goto(`/chronicles/${chapters[0]}`);
  expect(await page.evaluate(() => (window as Window & { __chronicleAudioContexts: AudioContext[] }).__chronicleAudioContexts.length)).toBe(0);
  const audio = await page.locator("[data-chronicle-audio] audio").elementHandle();
  await audio!.evaluate((element: HTMLAudioElement) => { element.muted = true; });
  await page.getByRole("button", { name: "Play narration" }).click();
  await expect.poll(() => audio!.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
  await page.getByRole("link", { name: "Chapter 002", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(chapters[1]));
  expect(await audio!.evaluate((element: HTMLAudioElement) => element.paused && !element.hasAttribute("src"))).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as Window & { __chronicleAudioContexts: AudioContext[] }).__chronicleAudioContexts.every((context) => context.state === "closed"))).toBe(true);
  await expect(page.getByRole("button", { name: "Play narration" })).toBeVisible();
});

for (const slug of [chapters[0], scopeEscalationChapter]) {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`${slug} waveform follows the actual voice and becomes flat when silent (${reducedMotion})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion });
      await page.goto(`/chronicles/${slug}`);
      const audio = page.locator("[data-chronicle-audio] audio");
      const waveform = page.locator("[data-audio-waveform]");
      const levels = () => waveform.locator("span").evaluateAll((bars) => bars.map((bar) =>
        Number.parseFloat((bar as HTMLElement).style.getPropertyValue("--bar-height")),
      ));
      expect((await levels()).every((level) => level === 3)).toBe(true);
      // The headless browser mutes its output, not the media element feeding the analyser.
      await page.getByRole("button", { name: "Play narration" }).click();
      await expect.poll(async () => Math.max(...await levels())).toBeGreaterThan(6);
      const first = await levels();
      await expect.poll(async () => JSON.stringify(await levels())).not.toBe(JSON.stringify(first));
      await audio.evaluate((element: HTMLAudioElement) => { element.muted = true; });
      await expect.poll(async () => (await levels()).every((level) => level === 3)).toBe(true);
      await audio.evaluate((element: HTMLAudioElement) => { element.muted = false; });
      await expect.poll(async () => Math.max(...await levels())).toBeGreaterThan(6);
      await page.getByRole("button", { name: "Pause narration" }).click();
      await expect.poll(async () => (await levels()).every((level) => level === 3)).toBe(true);
    });
  }
}

test("an unavailable recording shows an error and can be retried", async ({ page }) => {
  await page.route("**/audio/chronicles/*.mp3", (route) => route.abort());
  await page.goto(`/chronicles/${chapters[0]}`);
  await page.locator("audio").evaluate((element: HTMLAudioElement) => { element.muted = true; });
  await page.getByRole("combobox", { name: "Playback speed" }).selectOption("1.5");
  await page.getByRole("button", { name: "Play narration" }).click();
  await expect(page.getByRole("status")).toContainText(/couldn’t.*narration/);
  await page.unroute("**/audio/chronicles/*.mp3");
  await page.getByRole("button", { name: "Play narration" }).click();
  await expect.poll(() => page.locator("audio").evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
  await expect(page.getByRole("combobox", { name: "Playback speed" })).toHaveValue("1.5");
  expect(await page.locator("audio").evaluate((element: HTMLAudioElement) => element.playbackRate)).toBe(1.5);
  await expect(page.getByRole("status")).toBeEmpty();
});
