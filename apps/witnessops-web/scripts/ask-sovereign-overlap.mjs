/**
 * Checks that suggestion chips never intersect a turn, and that Retry is fully
 * inside the thread. Saves the 24 narrow screenshots plus the wider proof shots.
 *
 * Requires `next dev` with NEXT_PUBLIC_WO_PREVIEW=1. ?sim is dev-only.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.env.ASK_BASE || "http://127.0.0.1:3001";
const outDir = process.env.ASK_OUT || "/opt/cursor/artifacts";
const chrome = process.env.CHROME_PATH || "/usr/local/bin/google-chrome";
mkdirSync(outDir, { recursive: true });

const locales = ["en", "pl"];
const widths = [320, 390, 1440];
const themes = ["light", "dark"];
const modes = ["answer", "error", "handoff"];
const lines = [];

function log(line) {
  lines.push(line);
  console.log(line);
}

const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ["--no-sandbox"] });

async function openCase({ locale, width, theme, mode, height = width >= 1200 ? 900 : 844, shot, reduced = false }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    colorScheme: theme,
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  await page.addInitScript((value) => {
    localStorage.setItem("wo-theme", value);
  }, theme);
  const path = `${locale === "pl" ? "/pl" : ""}/docs/assistant${mode === "answer" ? "" : `?sim=${mode}`}`;
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.activeElement?.id === "ask-sovereign-draft");
  const composerOnLoad = await page.evaluate(() => {
    const form = document.getElementById("ask-sovereign-draft")?.closest("form");
    if (!form) return false;
    const box = form.getBoundingClientRect();
    return box.height > 0 && box.top >= 0 && box.bottom <= window.innerHeight + 0.5;
  });
  if (locale === "en" && width === 1440 && mode === "answer") await page.screenshot({ path: `${outDir}/docs-assistant-1440-${theme}.png` });
  await page.evaluate(() => {
    window.__shifts = [];
    window.__askMark = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.startTime < window.__askMark) continue;
        window.__shifts.push({ value: entry.value, recent: entry.hadRecentInput });
      }
    }).observe({ type: "layout-shift", buffered: false });
  });
  const chip = page.getByRole("button", { name: locale === "pl" ? "Co obejmuje Agent Action Security Review?" : "What does the Agent Action Security Review cover?" });
  await page.evaluate(() => { window.__askMark = performance.now(); });
  await chip.click();
  if (mode === "error") await page.getByRole("button", { name: locale === "pl" ? "Spróbuj ponownie" : "Retry" }).waitFor();
  else if (mode === "handoff") await page.locator("[data-handoff-card]").waitFor();
  else await page.getByText(locale === "pl" ? "Podgląd: odpowiedź symulowana" : "Simulated response · preview").waitFor();
  await page.locator(".sv-fallback[data-face-ready]").waitFor();
  await page.waitForTimeout(400);
  const measured = await page.evaluate(({ expectRetry }) => {
    const root = document.querySelector("[data-sovereign-preview]");
    const thread = root.querySelector("[data-ask-thread]");
    const chips = root.querySelector("[data-ask-chips]");
    const turns = [...root.querySelectorAll("ol > li")];
    const chipBox = chips.getBoundingClientRect();
    const threadBox = thread.getBoundingClientRect();
    const overlaps = turns.filter((turn) => {
      const box = turn.getBoundingClientRect();
      const top = Math.max(box.top, threadBox.top);
      const bottom = Math.min(box.bottom, threadBox.bottom);
      const left = Math.max(box.left, threadBox.left);
      const right = Math.min(box.right, threadBox.right);
      if (bottom <= top || right <= left) return false;
      return !(bottom <= chipBox.top + 0.5 || chipBox.bottom <= top + 0.5 || right <= chipBox.left + 0.5 || chipBox.right <= left + 0.5);
    }).length;
    const retry = [...root.querySelectorAll("button")].find((button) => /Retry|Spróbuj ponownie/.test(button.textContent || ""));
    const retryBox = retry ? retry.getBoundingClientRect() : null;
    const retryInside = !expectRetry || (retryBox && retryBox.height > 0 && retryBox.top >= threadBox.top - 1 && retryBox.bottom <= threadBox.bottom + 1 && retryBox.right <= threadBox.right + 1);
    const fallback = root.querySelector(".sv-fallback");
    const background = fallback ? getComputedStyle(fallback).backgroundImage : "";
    const panel = root.querySelector("section");
    const panelBox = panel.getBoundingClientRect();
    const header = panel.querySelector("header");
    const headerBox = header.getBoundingClientRect();
    const handoffChipInHeader = (header.textContent || "").includes("Preview · simulated handoff");
    const handoffChipInThread = (thread.textContent || "").includes("Preview · simulated handoff");
    const simulatedLabel = /Simulated response · preview|Podgląd: odpowiedź symulowana/.test(thread.textContent || "");
    const chipButtons = [...chips.querySelectorAll("button")];
    const card = root.querySelector("[data-handoff-card]");
    const cardBox = card ? card.getBoundingClientRect() : null;
    const fits = (el) => el.scrollWidth <= el.clientWidth + 1;
    const turnWide = turns.filter((turn) => !fits(turn)).length;
    const chipWide = chipButtons.filter((button) => !fits(button)).length;
    const cardWide = card && !fits(card) ? 1 : 0;
    const headerWide = header && !fits(header) ? 1 : 0;
    const turnOutside = turns.filter((turn) => turn.getBoundingClientRect().right > threadBox.right + 0.5).length;
    const chipOutside = chipButtons.filter((button) => button.getBoundingClientRect().right > chipBox.right + 0.5).length;
    const cardInside = !cardBox || cardBox.right <= threadBox.right + 0.5;
    const headerInside = headerBox.right <= panelBox.right + 0.5;
    const tracks = [];
    for (const el of panel.querySelectorAll("*")) {
      if (el.clientWidth <= 1) continue;
      const style = getComputedStyle(el);
      const horizontalTrack = (style.overflowX === "auto" || style.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 1;
      const verticalTrack = (style.overflowY === "auto" || style.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 1;
      if (horizontalTrack) tracks.push(`x:${el.tagName}`);
      if (verticalTrack && !el.hasAttribute("data-ask-thread")) tracks.push(`y:${el.tagName}`);
    }
    const title = header.querySelector("p");
    const unit = title?.querySelector("span");
    const badge = unit?.querySelector("span");
    const unitBox = unit ? unit.getBoundingClientRect() : null;
    const badgeBox = badge ? badge.getBoundingClientRect() : null;
    return {
      overlaps,
      retryInside,
      wrap: chips ? getComputedStyle(chips).flexWrap : "",
      chips: chipButtons.length,
      faceReady: fallback?.hasAttribute("data-face-ready") ?? false,
      backgroundNone: background === "none",
      cls: (window.__shifts || []).filter((entry) => !entry.recent).reduce((sum, entry) => sum + entry.value, 0),
      turnWide,
      chipWide,
      cardWide,
      headerWide,
      turnOutside,
      chipOutside,
      cardInside,
      headerInside,
      tracks: tracks.length,
      trackSample: tracks.slice(0, 3).join(" "),
      badgeLine: !badgeBox || !unitBox || (badgeBox.top < unitBox.bottom && badgeBox.bottom > unitBox.top),
      headerRows: headerBox.height <= 80 ? 1 : 2,
      handoffChipInHeader,
      handoffChipInThread,
      simulatedLabel,
    };
  }, { expectRetry: mode === "error" });
  measured.composerOnLoad = composerOnLoad;
  if (shot) await page.screenshot({ path: `${outDir}/${shot}` });
  if (locale === "pl" && width === 320 && theme === "light" && mode === "handoff") {
    await page.locator("[data-sovereign-preview] header").screenshot({ path: `${outDir}/ask-pl-320-header.png` });
  }
  if (width === 390 && theme === "light" && mode === "answer") {
    await page.screenshot({ path: `${outDir}/ask-${locale}-390-chips-followup.png` });
  }
  await context.close();
  return measured;
}

try {
  for (const locale of locales) {
    for (const width of widths) {
      for (const theme of themes) {
        for (const mode of modes) {
          const shot = `ask-${locale}-${width}-${theme}-${mode}.png`;
          const measured = await openCase({ locale, width, theme, mode, shot });
          const horizontal = measured.turnWide === 0 && measured.chipWide === 0 && measured.cardWide === 0 && measured.headerWide === 0 && measured.turnOutside === 0 && measured.chipOutside === 0 && measured.cardInside && measured.headerInside && measured.tracks === 0 && measured.wrap === "wrap" && measured.chips <= 2 && measured.badgeLine && (mode !== "handoff" || (measured.handoffChipInThread && !measured.handoffChipInHeader)) && (mode === "error" || measured.simulatedLabel);
          const composerOk = width !== 1440 || measured.composerOnLoad;
          const headerOk = !(width === 320 && mode !== "error") || measured.headerRows === 1;
          const ok = measured.overlaps === 0 && measured.retryInside && measured.faceReady && measured.backgroundNone && horizontal && composerOk && headerOk;
          log(`${shot} overlaps=${measured.overlaps} retryInside=${measured.retryInside} wrap=${measured.wrap} chips=${measured.chips} turnWide=${measured.turnWide} chipWide=${measured.chipWide} cardWide=${measured.cardWide} headerWide=${measured.headerWide} turnOutside=${measured.turnOutside} chipOutside=${measured.chipOutside} cardInside=${measured.cardInside} headerInside=${measured.headerInside} tracks=${measured.tracks} ${measured.trackSample} badgeLine=${measured.badgeLine} headerRows=${measured.headerRows} composerOnLoad=${measured.composerOnLoad} ${ok ? "OK" : "FAIL"}`);
          if (!ok) throw new Error(shot);
        }
      }
    }
  }

  for (const locale of locales) {
    const shot = `ask-${locale}-320-reduced-handoff.png`;
    const measured = await openCase({ locale, width: 320, theme: "light", mode: "handoff", reduced: true, shot });
    const ok = measured.overlaps === 0 && measured.retryInside && measured.turnWide === 0 && measured.chipWide === 0 && measured.cardWide === 0 && measured.headerWide === 0 && measured.turnOutside === 0 && measured.cardInside && measured.tracks === 0 && measured.wrap === "wrap" && measured.chips <= 2 && measured.badgeLine && measured.headerRows === 1 && measured.handoffChipInThread && !measured.handoffChipInHeader && measured.simulatedLabel;
    log(`${shot} overlaps=${measured.overlaps} turnWide=${measured.turnWide} chipWide=${measured.chipWide} tracks=${measured.tracks} headerRows=${measured.headerRows} chips=${measured.chips} ${ok ? "OK" : "FAIL"}`);
    if (!ok) throw new Error(shot);
  }

  const extras = [
    { locale: "en", width: 1440, height: 900, theme: "light", mode: "error", shot: "ask-en-1440-error-light.png" },
    { locale: "en", width: 1440, height: 900, theme: "dark", mode: "error", shot: "ask-en-1440-error-dark.png" },
    { locale: "en", width: 390, height: 844, theme: "light", mode: "error", shot: "ask-en-390-error-light.png" },
    { locale: "en", width: 390, height: 844, theme: "dark", mode: "error", shot: "ask-en-390-error-dark.png" },
    { locale: "en", width: 1440, height: 900, theme: "light", mode: "handoff", shot: "ask-handoff-1440.png" },
    { locale: "pl", width: 390, height: 844, theme: "light", mode: "error", shot: "ask-pl-390-error.png" },
    { locale: "en", width: 390, height: 844, theme: "light", mode: "error", shot: "ask-retry-390.png" },
  ];
  for (const extra of extras) {
    const measured = await openCase(extra);
    const extraOk = measured.overlaps === 0 && measured.retryInside && measured.turnWide === 0 && measured.chipWide === 0 && measured.cardInside && measured.tracks === 0 && measured.wrap === "wrap" && measured.chips <= 2;
    log(`${extra.shot} overlaps=${measured.overlaps} retryInside=${measured.retryInside} turnWide=${measured.turnWide} chipWide=${measured.chipWide} tracks=${measured.tracks} chips=${measured.chips} ${extraOk ? "OK" : "FAIL"}`);
    if (!extraOk) throw new Error(extra.shot);
  }

  const blocked = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const blockedPage = await blocked.newPage();
  await blockedPage.route("**/ask-sovereign/**", (route) => route.abort());
  await blockedPage.goto(`${base}/docs/assistant?sim=error`, { waitUntil: "domcontentloaded" });
  await blockedPage.waitForTimeout(400);
  const blockedState = await blockedPage.evaluate(() => {
    const fallback = document.querySelector(".sv-fallback");
    const background = fallback ? getComputedStyle(fallback).backgroundImage : "";
    return { ready: fallback?.hasAttribute("data-face-ready") ?? false, dataUri: background.startsWith("url(\"data:image") };
  });
  log(`blocked-sprites ready=${blockedState.ready} dataUri=${blockedState.dataUri} ${!blockedState.ready && blockedState.dataUri ? "OK" : "FAIL"}`);
  if (blockedState.ready || !blockedState.dataUri) throw new Error("blocked sprites did not keep the idle fallback");
  await blocked.close();

  const changing = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const changePage = await changing.newPage();
  let release = () => {};
  const held = new Promise((resolveHold) => { release = resolveHold; });
  await changePage.route("**/sovereign-error*", async (route) => {
    await held;
    await route.continue();
  });
  await changePage.goto(`${base}/docs/assistant?sim=error`, { waitUntil: "domcontentloaded" });
  await changePage.waitForFunction(() => document.activeElement?.id === "ask-sovereign-draft");
  await changePage.locator(".sv-fallback[data-face-ready]").waitFor();
  const click = changePage.getByRole("button", { name: "What does the Agent Action Security Review cover?" }).click();
  await changePage.waitForFunction(() => {
    const fallback = document.querySelector(".sv-fallback");
    return fallback && !fallback.hasAttribute("data-face-ready") && !fallback.querySelector("[class*='spriteFace']");
  });
  log("state-change fallback-before-new-frame OK");
  release();
  await click;
  await changePage.locator(".sv-fallback[data-face-ready]").waitFor();
  const after = await changePage.evaluate(() => getComputedStyle(document.querySelector(".sv-fallback")).backgroundImage);
  log(`state-change after-load backgroundNone=${after === "none"} ${after === "none" ? "OK" : "FAIL"}`);
  if (after !== "none") throw new Error("fallback remained after the new frame loaded");
  await changing.close();
  log("OVERLAP_OK");
} catch (error) {
  log(`OVERLAP_FAIL ${error instanceof Error ? error.message : String(error)}`);
  writeFileSync(`${outDir}/overlap-check.txt`, `${lines.join("\n")}\n`);
  await browser.close();
  process.exit(1);
}

writeFileSync(`${outDir}/overlap-check.txt`, `${lines.join("\n")}\n`);
await browser.close();
