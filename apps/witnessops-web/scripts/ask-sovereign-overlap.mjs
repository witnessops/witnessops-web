/**
 * Checks that suggestion chips never intersect a turn, and that the latest
 * turn's primary action sits fully inside the thread. Saves the preview shots.
 *
 * Requires `next dev` with NEXT_PUBLIC_WO_PREVIEW=1. ?sim is dev-only.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const base = process.env.ASK_BASE || "http://127.0.0.1:3001";
const outDir = process.env.ASK_OUT || "/opt/cursor/artifacts";
const chrome = process.env.CHROME_PATH || "/usr/bin/google-chrome";
mkdirSync(outDir, { recursive: true });

const locales = ["en", "pl"];
const themes = ["light", "dark"];
const modes = ["idle", "answer", "error", "handoff"];
const viewports = [
  { width: 320, height: 640, key: "320x640" },
  { width: 320, height: 844, key: "320x844" },
  { width: 390, height: 844, key: "390" },
  { width: 1440, height: 900, key: "1440x900" },
  { width: 1440, height: 800, key: "1440x800" },
];
const lines = [];
const clsLines = ["# CLS for the error state, including Retry. Target 0. Shifts with recent input are excluded."];
const contrastLines = ["# Computed contrast of button and link labels in the Ask panel and side column. Threshold 4.5:1."];

function log(line) {
  lines.push(line);
  console.log(line);
}

const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ["--no-sandbox"] });

function shotFor({ locale, key, theme, mode, width }) {
  if (width >= 1200) return mode === "idle" ? `docs-assistant-${key}-${locale}-${theme}.png` : null;
  if (mode === "answer") return null;
  return `ask-${locale}-${key}-${theme}-${mode}.png`;
}

async function openCase({ locale, width, height, theme, mode, shot, reduced = false }) {
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
  const path = `${locale === "pl" ? "/pl" : ""}/docs/assistant${mode === "answer" || mode === "idle" ? "" : `?sim=${mode}`}`;
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.activeElement?.id === "ask-sovereign-draft");
  const onLoad = await page.evaluate(() => {
    const root = document.querySelector("[data-sovereign-preview]");
    const thread = root.querySelector("[data-ask-thread]");
    const form = document.getElementById("ask-sovereign-draft")?.closest("form");
    const greeting = root.querySelector("ol > li");
    const chips = root.querySelector("[data-ask-chips]");
    const threadBox = thread.getBoundingClientRect();
    const greetingBox = greeting ? greeting.getBoundingClientRect() : null;
    const formBox = form ? form.getBoundingClientRect() : null;
    const visibleChips = [...chips.querySelectorAll("button")].filter((button) => getComputedStyle(button).display !== "none").length;
    const rail = root.querySelector("aside");
    const panel = root.querySelector("section");
    const panelBox = panel.getBoundingClientRect();
    const railBox = rail.getBoundingClientRect();
    const disclaimer = root.querySelector("[class*='disclaimer']");
    const disclaimerBox = disclaimer ? disclaimer.getBoundingClientRect() : null;
    const header = panel.querySelector("header");
    const headerBox = header.getBoundingClientRect();
    const title = document.getElementById("ask-sovereign-title");
    const badge = title?.querySelector("[class*='badge']");
    const badgeBox = badge ? badge.getBoundingClientRect() : null;
    const titleBox = title ? title.getBoundingClientRect() : null;
    return {
      composerOnLoad: Boolean(formBox && formBox.height > 0 && formBox.top >= 0 && formBox.bottom <= window.innerHeight + 0.5 && formBox.bottom <= panelBox.bottom + 1),
      greetingInside: Boolean(greetingBox && greetingBox.height > 0 && greetingBox.top >= threadBox.top - 1 && greetingBox.bottom <= threadBox.bottom + 1 && greetingBox.left >= threadBox.left - 1 && greetingBox.right <= threadBox.right + 1),
      visibleChips,
      threadHeight: thread.clientHeight,
      panelBottom: panelBox.bottom,
      railBottom: railBox.bottom,
      railInFold: railBox.bottom <= window.innerHeight + 0.5,
      bottomsAligned: Math.abs(panelBox.bottom - railBox.bottom) <= 2,
      disclaimerFull: Boolean(disclaimerBox && Math.abs(disclaimerBox.left - panelBox.left) <= 2 && disclaimerBox.width >= panel.clientWidth - 2),
      headerUnit: Boolean(titleBox && badgeBox && title.getClientRects().length === 1 && badgeBox.top < titleBox.bottom && badgeBox.bottom > titleBox.top && badgeBox.right <= headerBox.right + 0.5 && titleBox.left >= headerBox.left - 0.5),
    };
  });
  if (mode !== "idle") {
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
    if (mode === "error" || mode === "handoff") {
      await page.waitForFunction((expect) => {
        const thread = document.querySelector("[data-ask-thread]");
        const action = document.querySelector(expect === "error" ? "[data-retry]" : "[data-handoff-card]");
        if (!thread || !action) return false;
        const frame = thread.getBoundingClientRect();
        const box = action.getBoundingClientRect();
        const fits = box.height <= frame.height - 16;
        const vertically = fits
          ? box.top >= frame.top - 1 && box.bottom <= frame.bottom + 1
          : box.top >= frame.top - 1 && box.top <= frame.bottom;
        return box.height > 0 && vertically && box.left >= frame.left - 1 && box.right <= frame.right + 1;
      }, mode, { timeout: 2000 }).catch(() => {});
    }
    await page.waitForTimeout(700);
  }
  const measured = await page.evaluate(({ expectRetry, mode: liveMode, locale: liveLocale }) => {
    function parseColor(input) {
      const match = String(input).match(/rgba?\(([^)]+)\)/);
      if (!match) return { r: 255, g: 255, b: 255, a: 1 };
      const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
    }
    function composite(fg, bg) {
      const alpha = fg.a;
      return {
        r: fg.r * alpha + bg.r * (1 - alpha),
        g: fg.g * alpha + bg.g * (1 - alpha),
        b: fg.b * alpha + bg.b * (1 - alpha),
        a: 1,
      };
    }
    function channel(value) {
      const scaled = value / 255;
      return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
    }
    function luminance(color) {
      return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
    }
    function contrast(fg, bg) {
      const left = luminance(fg);
      const right = luminance(bg);
      return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
    }
    function backing(element) {
      const layers = [];
      let node = element;
      while (node) {
        const color = parseColor(getComputedStyle(node).backgroundColor);
        if (color.a > 0) layers.push(color);
        if (color.a >= 0.99) break;
        node = node.parentElement;
      }
      let paint = layers.length ? layers[layers.length - 1] : { r: 255, g: 255, b: 255, a: 1 };
      for (let index = layers.length - 2; index >= 0; index -= 1) paint = composite(layers[index], paint);
      return paint;
    }
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
    const retry = root.querySelector("[data-retry]");
    const cta = root.querySelector("[data-handoff-cta]");
    const card = root.querySelector("[data-handoff-card]");
    const action = liveMode === "error" ? retry : liveMode === "handoff" ? card : null;
    const actionBox = action ? action.getBoundingClientRect() : null;
    const fitsCard = !actionBox || actionBox.height <= threadBox.height - 16;
    const actionInside = !actionBox || (
      actionBox.height > 0
      && actionBox.left >= threadBox.left - 1
      && actionBox.right <= threadBox.right + 1
      && (fitsCard
        ? actionBox.top >= threadBox.top - 1 && actionBox.bottom <= threadBox.bottom + 1
        : actionBox.top >= threadBox.top - 1 && actionBox.top <= threadBox.bottom)
    );
    const ctaBox = cta ? cta.getBoundingClientRect() : null;
    const ctaInside = !ctaBox || (ctaBox.height > 0 && ctaBox.top >= threadBox.top - 1 && ctaBox.bottom <= threadBox.bottom + 1 && ctaBox.left >= threadBox.left - 1 && ctaBox.right <= threadBox.right + 1);
    const retryBox = retry ? retry.getBoundingClientRect() : null;
    const retryInside = !expectRetry || (retryBox && retryBox.height > 0 && retryBox.top >= threadBox.top - 1 && retryBox.bottom <= threadBox.bottom + 1 && retryBox.left >= threadBox.left - 1 && retryBox.right <= threadBox.right + 1);
    const fallback = root.querySelector(".sv-fallback");
    const background = fallback ? getComputedStyle(fallback).backgroundImage : "";
    const panel = root.querySelector("section");
    const panelBox = panel.getBoundingClientRect();
    const header = panel.querySelector("header");
    const headerBox = header.getBoundingClientRect();
    const handoffLabel = liveLocale === "pl" ? "Podgląd · symulowane przekazanie" : "Preview · simulated handoff";
    const errorLabel = liveLocale === "pl" ? "Podgląd · symulowany błąd" : "Preview · simulated error";
    const caption = thread.querySelector("[class*='handoffCaption']");
    const captionText = caption ? (caption.textContent || "").trim() : "";
    const captionOutside = !caption || !caption.closest("[class*='youBubble']");
    const captionVisible = !caption || (caption.getBoundingClientRect().height > 0 && getComputedStyle(caption).visibility !== "hidden");
    const handoffChipInHeader = (header.textContent || "").includes(handoffLabel);
    const handoffChipInThread = (thread.textContent || "").includes(handoffLabel);
    const errorChipInHeader = (header.textContent || "").includes(errorLabel);
    const errorChipInThread = (thread.textContent || "").includes(errorLabel);
    const simulatedLabel = /Simulated response · preview|Podgląd: odpowiedź symulowana/.test(thread.textContent || "");
    const chipButtons = [...chips.querySelectorAll("button")].filter((button) => getComputedStyle(button).display !== "none");
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
    const badge = title?.querySelector("[class*='badge']");
    const unitBox = unit ? unit.getBoundingClientRect() : null;
    const badgeBox = badge ? badge.getBoundingClientRect() : null;
    const unitStyle = unit ? getComputedStyle(unit) : null;
    const titleStyle = title ? getComputedStyle(title) : null;
    const retryStyle = retry ? getComputedStyle(retry) : null;
    const address = card?.querySelector("[class*='handoffAddress'] a");
    const emailRects = address ? [...address.getClientRects()].filter((rect) => rect.width > 1) : [];
    const emailLines = new Set(emailRects.map((rect) => Math.round(rect.top))).size;
    const emailBreak = address ? getComputedStyle(address).wordBreak : "";
    const spriteOnYou = !retry || Boolean(retry.closest("li")?.contains(fallback));
    const errorCaption = thread.querySelector("[class*='errorCaption']");
    let errorRects = [];
    if (errorCaption) {
      const range = document.createRange();
      range.selectNodeContents(errorCaption);
      errorRects = [...range.getClientRects()].filter((rect) => rect.width > 1);
    }
    const hanging = errorRects.length < 2 || Math.abs(errorRects[0].left - errorRects[1].left) <= 1.5;
    const labels = [...root.querySelectorAll("button, a")].filter((el) => {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const box = el.getBoundingClientRect();
      return box.width > 1 && box.height > 1;
    }).map((el) => {
      const color = parseColor(getComputedStyle(el).color);
      const ratio = contrast(color, backing(el));
      return {
        tag: el.tagName,
        text: (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 70),
        ratio: Number(ratio.toFixed(2)),
      };
    });
    return {
      overlaps,
      retryInside,
      actionInside,
      ctaInside,
      wrap: chips ? getComputedStyle(chips).flexWrap : "",
      chips: chipButtons.length,
      faceReady: liveMode === "idle" ? true : (fallback?.hasAttribute("data-face-ready") ?? false),
      backgroundNone: liveMode === "idle" ? true : background === "none",
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
      titleBorder: unitStyle ? unitStyle.borderTopWidth : "",
      titleSize: titleStyle ? titleStyle.fontSize : "",
      titleWeight: titleStyle ? titleStyle.fontWeight : "",
      retryNowrap: !retryStyle || (retryStyle.whiteSpace === "nowrap" && retry.scrollWidth <= retry.clientWidth + 1),
      headerRows: headerBox.height <= 80 ? 1 : 2,
      handoffChipInHeader,
      handoffChipInThread,
      errorChipInHeader,
      errorChipInThread,
      captionText,
      captionOutside,
      captionVisible,
      simulatedLabel,
      emailLines,
      emailBreak,
      spriteOnYou,
      hanging,
      errorWrapped: errorRects.length >= 2,
      contrastLow: labels.filter((item) => item.ratio < 4.5),
      contrastSample: labels,
    };
  }, { expectRetry: mode === "error", mode, locale });
  Object.assign(measured, onLoad);
  if (shot) await page.screenshot({ path: `${outDir}/${shot}` });
  if (mode === "error") {
    clsLines.push(`${locale} ${width}x${height} ${theme} error cls=${measured.cls}`);
    const retryName = locale === "pl" ? "Spróbuj ponownie" : "Retry";
    await page.getByRole("button", { name: retryName }).click();
    await page.getByText(locale === "pl" ? "Podgląd: odpowiedź symulowana" : "Simulated response · preview").waitFor();
    await page.waitForTimeout(400);
    const afterRetry = await page.evaluate(() => {
      const chips = document.querySelector("[data-ask-chips]");
      const visible = [...chips.querySelectorAll("button")].filter((button) => getComputedStyle(button).display !== "none").length;
      const answer = /Simulated response · preview|Podgląd: odpowiedź symulowana/.test(document.body.textContent || "");
      const cls = (window.__shifts || []).filter((entry) => !entry.recent).reduce((sum, entry) => sum + entry.value, 0);
      return { visible, answer, cls };
    });
    measured.retryCls = afterRetry.cls;
    measured.retryChips = afterRetry.visible;
    measured.retryAnswer = afterRetry.answer;
    clsLines.push(`${locale} ${width}x${height} ${theme} retry cls=${afterRetry.cls} chips=${afterRetry.visible} answer=${afterRetry.answer}`);
  }
  await context.close();
  return measured;
}

function problems(measured, { locale, width, height, mode }) {
  const issues = [];
  const idleLimit = height < 700 ? 2 : width < 768 ? 3 : 4;
  const chipLimit = mode === "error" || mode === "handoff" ? 0 : mode === "idle" ? idleLimit : 2;
  if (measured.overlaps !== 0) issues.push(`overlaps ${measured.overlaps}`);
  if (!measured.retryInside) issues.push("retry outside");
  if (!measured.actionInside) issues.push("action outside");
  if (mode === "handoff" && !measured.ctaInside) issues.push("cta outside");
  if (!measured.greetingInside) issues.push("greeting clipped");
  if (mode !== "idle" && !measured.faceReady) issues.push("face not ready");
  if (mode !== "idle" && !measured.backgroundNone) issues.push("fallback still painted");
  if (measured.turnWide || measured.chipWide || measured.cardWide || measured.headerWide) issues.push("horizontal overflow");
  if (measured.turnOutside || measured.chipOutside || !measured.cardInside || !measured.headerInside) issues.push("outside container");
  if (measured.tracks !== 0) issues.push(`tracks ${measured.trackSample}`);
  if (measured.wrap !== "wrap") issues.push(`wrap ${measured.wrap}`);
  if (measured.chips > chipLimit) issues.push(`chips ${measured.chips}>${chipLimit}`);
  if (measured.visibleChips > idleLimit) issues.push(`idle chips ${measured.visibleChips}>${idleLimit}`);
  if (!measured.badgeLine || measured.titleBorder !== "0px" || measured.titleWeight !== "500") issues.push("title style");
  if ((width < 768 && measured.titleSize !== "16px") || (width >= 768 && measured.titleSize !== "18px")) issues.push(`title size ${measured.titleSize}`);
  if (width <= 390 && measured.headerRows !== 1) issues.push(`header rows ${measured.headerRows}`);
  if (width <= 390 && !measured.headerUnit) issues.push("header title/badge not one line");
  if (width >= 1024 && measured.threadHeight < 360) issues.push(`thread ${measured.threadHeight}`);
  if (width >= 1200 && height >= 860 && !measured.composerOnLoad) issues.push("composer below fold");
  if (mode === "error" && !measured.retryNowrap) issues.push("retry wraps");
  if (mode === "error" && !measured.spriteOnYou) issues.push("error face not on the you turn");
  if (mode === "error" && (!measured.errorChipInThread || measured.errorChipInHeader || !measured.captionOutside || !measured.captionVisible)) issues.push(`error caption ${measured.captionText}`);
  if (mode === "handoff" && (!measured.handoffChipInThread || measured.handoffChipInHeader || !measured.captionOutside || !measured.simulatedLabel)) issues.push(`handoff caption ${measured.captionText}`);
  if (mode === "answer" && !measured.simulatedLabel) issues.push("simulated label missing");
  if (mode === "handoff" && width <= 320 && (measured.emailLines < 1 || measured.emailLines > 2)) issues.push(`email lines ${measured.emailLines}`);
  if (mode === "handoff" && measured.emailBreak === "break-all") issues.push("email breaks anywhere");
  if (locale === "pl" && mode === "error" && width <= 390 && !measured.hanging) issues.push("error note indent");
  if (locale === "pl" && mode === "error" && width === 320 && !measured.errorWrapped) issues.push("error note did not wrap");
  if (!measured.disclaimerFull) issues.push("disclaimer not full width");
  if (width >= 900 && !measured.bottomsAligned) issues.push(`bottoms ${measured.panelBottom.toFixed(0)}/${measured.railBottom.toFixed(0)}`);
  if (locale === "pl" && width === 1440 && height === 900 && !measured.railInFold) issues.push(`rail past fold ${measured.railBottom.toFixed(0)}`);
  if (measured.contrastLow?.length) issues.push(`contrast ${measured.contrastLow.map((item) => `${item.ratio} ${item.text}`).join("; ")}`);
  if (mode === "error" && measured.cls !== 0) issues.push(`cls ${measured.cls}`);
  if (mode === "error" && (measured.retryCls !== 0 || !measured.retryAnswer || measured.retryChips < 1)) issues.push(`retry cls=${measured.retryCls} chips=${measured.retryChips}`);
  const expectedCaption = mode === "error"
    ? (locale === "pl" ? "Podgląd · symulowany błąd" : "Preview · simulated error")
    : mode === "handoff"
      ? (locale === "pl" ? "Podgląd · symulowane przekazanie" : "Preview · simulated handoff")
      : "";
  if (expectedCaption && measured.captionText !== expectedCaption) issues.push(`caption ${JSON.stringify(measured.captionText)}`);
  return issues;
}

try {
  for (const viewport of viewports) {
    for (const locale of locales) {
      for (const theme of themes) {
        for (const mode of modes) {
          const shot = shotFor({ locale, key: viewport.key, theme, mode, width: viewport.width });
          const measured = await openCase({ locale, ...viewport, theme, mode, shot });
          const issues = problems(measured, { locale, ...viewport, mode });
          if (mode === "handoff" || mode === "idle" || mode === "error") {
            for (const item of measured.contrastSample || []) {
              contrastLines.push(`${theme} ${locale} ${viewport.key} ${mode} ${item.tag} ${item.ratio.toFixed(2)} ${item.ratio >= 4.5 ? "OK" : "FAIL"} ${JSON.stringify(item.text)}`);
            }
          }
          log(`${locale}-${viewport.key}-${theme}-${mode} ${issues.length ? `FAIL ${issues.join(", ")}` : "OK"} overlaps=${measured.overlaps} action=${measured.actionInside} greeting=${measured.greetingInside} chips=${measured.chips} idleChips=${measured.visibleChips} headerUnit=${measured.headerUnit} composer=${measured.composerOnLoad} bottoms=${measured.bottomsAligned} railFold=${measured.railInFold} disclaimer=${measured.disclaimerFull} email=${measured.emailLines} cls=${measured.cls ?? 0}`);
          if (issues.length) throw new Error(`${locale}-${viewport.key}-${theme}-${mode}: ${issues.join(", ")}`);
        }
      }
    }
  }

  for (const locale of locales) {
    const shot = `ask-${locale}-320-reduced-handoff.png`;
    const measured = await openCase({ locale, width: 320, height: 844, theme: "light", mode: "handoff", reduced: true, shot });
    const issues = problems(measured, { locale, width: 320, height: 844, mode: "handoff" });
    log(`${shot} ${issues.length ? `FAIL ${issues.join(", ")}` : "OK"}`);
    if (issues.length) throw new Error(shot);
  }

  const footer = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const footerPage = await footer.newPage();
  await footerPage.goto(`${base}/pl`, { waitUntil: "networkidle" });
  const footerLink = footerPage.locator("footer a", { hasText: "Narzędzie, nie przegląd" });
  const footerState = await footerLink.evaluate((el) => ({
    text: (el.textContent || "").trim(),
    lines: el.getClientRects().length,
    nowrap: getComputedStyle(el).whiteSpace,
  }));
  const footerOk = footerState.text === "Narzędzie, nie przegląd" && footerState.lines === 1;
  log(`pl-footer text=${JSON.stringify(footerState.text)} lines=${footerState.lines} whiteSpace=${footerState.nowrap} ${footerOk ? "OK" : "FAIL"}`);
  if (!footerOk) throw new Error("PL footer link");
  await footer.close();

  const clsBad = clsLines.filter((line) => /cls=/.test(line)).filter((line) => !/cls=0(?:\s|$)/.test(line));
  log(`cls ${clsBad.length === 0 ? "OK" : `FAIL ${clsBad.join("; ")}`}`);
  if (clsBad.length) throw new Error(`CLS ${clsBad.join("; ")}`);

  const contrastBad = contrastLines.filter((line) => line.includes(" FAIL "));
  contrastLines.push(contrastBad.length ? `CONTRAST_FAIL ${contrastBad.length}` : "CONTRAST_OK");
  log(contrastBad.length ? `contrast FAIL ${contrastBad.length}` : "contrast OK");
  if (contrastBad.length) throw new Error(`contrast ${contrastBad.length}`);

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
  writeFileSync(`${outDir}/cls.txt`, `${clsLines.join("\n")}\n`);
  writeFileSync(`${outDir}/contrast.txt`, `${contrastLines.join("\n")}\n`);
  await browser.close();
  process.exit(1);
}

writeFileSync(`${outDir}/overlap-check.txt`, `${lines.join("\n")}\n`);
writeFileSync(`${outDir}/cls.txt`, `${clsLines.join("\n")}\n`);
writeFileSync(`${outDir}/contrast.txt`, `${contrastLines.join("\n")}\n`);
await browser.close();
