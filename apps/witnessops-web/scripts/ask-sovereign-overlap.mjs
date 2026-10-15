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
const widths = [390, 320];
const themes = ["light", "dark", "reduced"];
const modes = ["answer", "error", "handoff"];
const lines = [];

function log(line) {
  lines.push(line);
  console.log(line);
}

const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ["--no-sandbox"] });

async function openCase({ locale, width, theme, mode, height = 844, shot }) {
  const reduced = theme === "reduced";
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    colorScheme: reduced ? "light" : theme,
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  await page.addInitScript((value) => {
    localStorage.setItem("wo-theme", value);
  }, theme);
  const path = `${locale === "pl" ? "/pl" : ""}/docs/assistant${mode === "answer" ? "" : `?sim=${mode}`}`;
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.activeElement?.id === "ask-sovereign-draft");
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
  const measured = await page.evaluate((expectRetry) => {
    const root = document.querySelector("[data-sovereign-preview]");
    const thread = root.querySelector("[data-ask-thread]");
    const chips = root.querySelector("[data-ask-chips]");
    const turns = [...root.querySelectorAll("ol > li")];
    const chipBox = chips.getBoundingClientRect();
    const threadBox = thread.getBoundingClientRect();
    const overlaps = turns.filter((turn) => {
      const box = turn.getBoundingClientRect();
      return !(box.bottom <= chipBox.top + 0.5 || chipBox.bottom <= box.top + 0.5 || box.right <= chipBox.left + 0.5 || chipBox.right <= box.left + 0.5);
    }).length;
    const retry = [...root.querySelectorAll("button")].find((button) => /Retry|Spróbuj ponownie/.test(button.textContent || ""));
    const retryBox = retry ? retry.getBoundingClientRect() : null;
    const retryInside = !expectRetry || (retryBox && retryBox.height > 0 && retryBox.top >= threadBox.top - 1 && retryBox.bottom <= threadBox.bottom + 1 && retryBox.right <= threadBox.right + 1);
    const fallback = root.querySelector(".sv-fallback");
    const background = fallback ? getComputedStyle(fallback).backgroundImage : "";
    const panel = root.querySelector("section");
    const wide = [];
    for (const el of panel.querySelectorAll("*")) {
      if (el.closest("[data-ask-chips]")) continue;
      if (el.clientWidth <= 1) continue;
      if (el.scrollWidth > el.clientWidth + 1) {
        const name = el.getAttribute("data-ask-thread") != null ? "thread" : el.getAttribute("data-handoff-card") != null ? "handoff-card" : el.tagName;
        wide.push(`${name}:${el.scrollWidth}>${el.clientWidth}`);
      }
    }
    const turnOverflow = turns.filter((turn) => turn.getBoundingClientRect().right > threadBox.right + 0.5).length;
    const card = root.querySelector("[data-handoff-card]");
    const cardBox = card ? card.getBoundingClientRect() : null;
    const cardInside = !cardBox || cardBox.right <= threadBox.right + 0.5;
    return {
      overlaps,
      retryInside,
      nowrap: chips ? getComputedStyle(chips).flexWrap : "",
      faceReady: fallback?.hasAttribute("data-face-ready") ?? false,
      backgroundNone: background === "none",
      cls: (window.__shifts || []).filter((entry) => !entry.recent).reduce((sum, entry) => sum + entry.value, 0),
      wide: wide.length,
      wideSample: wide.slice(0, 3).join(" "),
      turnOverflow,
      cardInside,
    };
  }, mode === "error");
  if (shot) await page.screenshot({ path: `${outDir}/${shot}` });
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
          const horizontal = measured.wide === 0 && measured.turnOverflow === 0 && measured.cardInside;
          const ok = measured.overlaps === 0 && measured.retryInside && measured.nowrap === "nowrap" && measured.faceReady && measured.backgroundNone && horizontal;
          log(`${shot} overlaps=${measured.overlaps} retryInside=${measured.retryInside} nowrap=${measured.nowrap} faceReady=${measured.faceReady} backgroundNone=${measured.backgroundNone} cls=${measured.cls} wide=${measured.wide} turnOverflow=${measured.turnOverflow} cardInside=${measured.cardInside} ${measured.wideSample} ${ok ? "OK" : "FAIL"}`);
          if (!ok) throw new Error(shot);
        }
      }
    }
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
    const extraOk = measured.overlaps === 0 && measured.retryInside && measured.wide === 0 && measured.turnOverflow === 0 && measured.cardInside;
    log(`${extra.shot} overlaps=${measured.overlaps} retryInside=${measured.retryInside} wide=${measured.wide} turnOverflow=${measured.turnOverflow} cardInside=${measured.cardInside} ${extraOk ? "OK" : "FAIL"}`);
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
