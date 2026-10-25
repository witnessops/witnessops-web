/**
 * Checks that suggestion chips never intersect a turn, and that the latest
 * turn's primary action sits fully inside the thread. Saves the preview shots.
 *
 * Requires `next dev` with NEXT_PUBLIC_WO_PREVIEW=1. ?sim is dev-only.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { mergeWidthRoutes, sampleCaseRoutes } from "./public-width-routes.mjs";

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
  { width: 1024, height: 900, key: "1024" },
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

function reportStamp() {
  const sha = process.env.ASK_SHA || "uncommitted";
  const at = new Date().toISOString();
  return [`# sha ${sha}`, `# at ${at}`];
}

function writeReport(name, bodyLines) {
  writeFileSync(`${outDir}/${name}`, `${[...reportStamp(), ...bodyLines].join("\n")}\n`);
}

async function publicRoutePaths() {
  const response = await fetch(`${base}/sitemap.xml`);
  if (!response.ok) throw new Error(`sitemap ${response.status}`);
  const xml = await response.text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => {
    try { return new URL(match[1]).pathname || "/"; } catch { return null; }
  }).filter(Boolean);
  const extras = [
    "/",
    "/check",
    "/company",
    "/docs/assistant",
    "/early-access",
    "/library",
    "/pl",
    "/pl/company",
    "/pl/docs/assistant",
    "/pl/library",
    "/pl/review/request",
    "/pl/support",
    "/review/request",
    "/support",
  ];
  const samples = sampleCaseRoutes(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
  return mergeWidthRoutes([...paths, ...extras], samples);
}

async function gotoReady(page, url) {
  let last;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      return;
    } catch (error) {
      last = error;
      await page.waitForTimeout(400);
    }
  }
  throw last;
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
    else await page.getByText(/Simulated response\s·\s*preview|Podgląd: odpowiedź symulowana/).waitFor();
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
    const handoffLabel = liveLocale === "pl" ? "Podgląd\u00A0· symulowane przekazanie" : "Preview\u00A0· simulated handoff";
    const errorLabel = liveLocale === "pl" ? "Podgląd\u00A0· symulowany błąd" : "Preview\u00A0· simulated error";
    const caption = thread.querySelector("[class*='handoffCaption']");
    const captionText = caption ? (caption.textContent || "").trim() : "";
    const previewCaptions = thread.querySelectorAll("[data-preview-caption]").length;
    const captionOutside = !caption || !caption.closest("[class*='youBubble']");
    const captionVisible = !caption || (caption.getBoundingClientRect().height > 0 && getComputedStyle(caption).visibility !== "hidden");
    const handoffChipInHeader = (header.textContent || "").includes(handoffLabel);
    const handoffChipInThread = (thread.textContent || "").includes(handoffLabel);
    const errorChipInHeader = (header.textContent || "").includes(errorLabel);
    const errorChipInThread = (thread.textContent || "").includes(errorLabel);
    const simulatedLabel = /Simulated response\s·\s*preview|Podgląd: odpowiedź symulowana/.test(thread.textContent || "");
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
    const reply = thread.querySelector("[data-reply-address]");
    const replyRects = reply ? [...reply.getClientRects()].filter((rect) => rect.width > 1) : [];
    const replyLines = new Set(replyRects.map((rect) => Math.round(rect.top))).size;
    const replyTail = reply?.querySelector("[class*='addressTail']");
    const replyTailLines = replyTail ? new Set([...replyTail.getClientRects()].filter((rect) => rect.width > 1).map((rect) => Math.round(rect.top))).size : 0;
    const youBubble = root.querySelector("[class*='youBubble']");
    const youLi = youBubble?.closest("li") ?? null;
    const errorLi = retry?.closest("li") ?? null;
    const faceInYou = Boolean(youBubble?.querySelector(".sv-fallback, [class*='sprite']"));
    const plainYou = !youLi || (!youLi.querySelector("[data-retry]") && !youLi.querySelector("[class*='errorNote']") && !youLi.querySelector(".sv-fallback"));
    const errorFollows = Boolean(errorLi && youLi && errorLi.previousElementSibling === youLi);
    const faceOnError = Boolean(errorLi?.querySelector(".sv-fallback"));
    const panelReviewTags = root.querySelectorAll("[class*='reviewTag']").length;
    const errorCaption = thread.querySelector("[class*='errorCaption']");
    let errorRects = [];
    if (errorCaption) {
      const range = document.createRange();
      range.selectNodeContents(errorCaption);
      errorRects = [...range.getClientRects()].filter((rect) => rect.width > 1);
    }
    const errorLines = new Map();
    for (const rect of errorRects) {
      const key = Math.round(rect.top);
      const current = errorLines.get(key);
      if (!current || rect.left < current) errorLines.set(key, rect.left);
    }
    const errorLineLefts = [...errorLines.values()];
    const hanging = errorLineLefts.length < 2 || Math.abs(errorLineLefts[0] - errorLineLefts[1]) <= 1.5;
    const errorNote = thread.querySelector("[class*='errorNote']");
    const noteBox = errorNote ? errorNote.getBoundingClientRect() : null;
    const noteChip = errorNote?.querySelector("[class*='turnChip']");
    const noteCaption = errorNote?.querySelector("[class*='errorCaption']");
    const noteChipBox = noteChip ? noteChip.getBoundingClientRect() : null;
    const noteCaptionBox = noteCaption ? noteCaption.getBoundingClientRect() : null;
    const errorFace = errorLi?.querySelector("[class*='spriteFace']");
    const errorFacePosition = errorFace ? getComputedStyle(errorFace).backgroundPosition : "";
    const turnBox = errorLi ? errorLi.getBoundingClientRect() : null;
    const sprite = errorLi?.querySelector(".sv-fallback");
    const spriteBox = sprite ? sprite.getBoundingClientRect() : null;
    const faceCopy = errorLi?.querySelector("[class*='errorFaceCopy']");
    const faceCopyBox = faceCopy ? faceCopy.getBoundingClientRect() : null;
    let copyBottom = null;
    if (faceCopy) {
      for (const child of faceCopy.children) {
        if (child.querySelector("[class*='errorNote']")) continue;
        const box = child.getBoundingClientRect();
        if (box.height > 1) copyBottom = box.bottom;
      }
    }
    const chipGap = noteBox && copyBottom !== null ? noteBox.top - copyBottom : null;
    const faceGap = noteBox && spriteBox ? noteBox.top - spriteBox.bottom : null;
    const bubbleWidth = errorLi ? errorLi.clientWidth : 0;
    const retryWidth = retryBox ? retryBox.width : 0;
    const emailText = address ? (address.textContent || "").replace(/\s+/g, "") : "";
    const emailPeriod = emailText.endsWith(".");
    const emailCount = ((thread.textContent || "").match(/engage@mail\.witnessops\.com/g) || []).length;
    const threadStyle = getComputedStyle(thread);
    const threadMask = threadStyle.maskImage && threadStyle.maskImage !== "none" ? threadStyle.maskImage : threadStyle.webkitMaskImage || "none";
    const fadesTopMask = (mask) => /rgba\(0,\s*0,\s*0,\s*0\)\s+0px|transparent\s+0px/.test(mask);
    const errorTopFade = thread.scrollTop <= 1 || fadesTopMask(threadMask);
    const hardCover = /transparent[^,]*,\s*transparent\s+(\d+(?:\.\d+)?)px/.exec(threadMask);
    const coverPx = hardCover ? Number(hardCover[1]) : 16;
    let partialLine = false;
    let strongHits = 0;
    if (thread.scrollTop > 1) {
      const fade = parseFloat(thread.style.getPropertyValue("--thread-fade")) || 24;
      const bandFrame = thread.getBoundingClientRect();
      const bandTop = bandFrame.top + fade * 0.3;
      const bandBottom = bandFrame.top + fade;
      const bandWalker = document.createTreeWalker(thread, NodeFilter.SHOW_TEXT);
      let bandNode = bandWalker.nextNode();
      while (bandNode) {
        const parent = bandNode.parentElement;
        if (parent && !parent.closest("[class*='srOnly']") && (bandNode.textContent || "").trim()) {
          const range = document.createRange();
          range.selectNodeContents(bandNode);
          for (const rect of range.getClientRects()) {
            if (rect.width < 1 || rect.height < 1) continue;
            if (rect.bottom > bandTop + 0.5 && rect.top < bandBottom - 0.5) strongHits += 1;
          }
        }
        bandNode = bandWalker.nextNode();
      }
    }
    const noticeEl = root.querySelector("[data-sheet-notice]");
    const noticeOn = Boolean(noticeEl && getComputedStyle(noticeEl).display !== "none" && noticeEl.getBoundingClientRect().height > 0);
    if (noticeOn && thread.scrollTop > 1) {
      const frame = thread.getBoundingClientRect();
      const walker = document.createTreeWalker(thread, NodeFilter.SHOW_TEXT);
      let textNode = walker.nextNode();
      while (textNode && !partialLine) {
        const parent = textNode.parentElement;
        if (parent && !parent.closest("[class*='srOnly']") && (textNode.textContent || "").trim()) {
          const range = document.createRange();
          range.selectNodeContents(textNode);
          for (const rect of range.getClientRects()) {
            if (rect.width < 1 || rect.height < 1) continue;
            if (rect.bottom <= frame.top + 0.5) continue;
            if (rect.top >= frame.top + 16 - 0.5) continue;
            if (rect.bottom > frame.top + coverPx + 0.5) partialLine = true;
          }
        }
        textNode = walker.nextNode();
      }
    }
    const stackedNote = Boolean(noteBox && spriteBox && noteBox.left <= spriteBox.left + 4);
    const textLeft = stackedNote ? noteBox.left : faceCopyBox ? faceCopyBox.left : noteBox ? noteBox.left : 0;
    let middotStarts = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode) {
      const value = textNode.textContent || "";
      if (value.includes("·") && !textNode.parentElement?.closest("[class*='srOnly']")) {
        const lines = new Map();
        for (let index = 0; index < value.length; index += 1) {
          const range = document.createRange();
          range.setStart(textNode, index);
          range.setEnd(textNode, index + 1);
          const rect = range.getClientRects()[0];
          if (!rect || rect.width < 0.2 || rect.height < 0.2) continue;
          const key = Math.round(rect.top);
          const current = lines.get(key);
          if (!current || rect.left < current.left) lines.set(key, { left: rect.left, ch: value[index] });
        }
        for (const info of lines.values()) {
          if (info.ch === "·") middotStarts += 1;
        }
      }
      textNode = walker.nextNode();
    }
    const prices = [...root.querySelectorAll("[data-offer-price]")];
    const railBox = root.querySelector("aside")?.getBoundingClientRect();
    const priceFits = prices.length === 2 && prices.every((el) => {
      const box = el.getBoundingClientRect();
      const lines = new Set([...el.getClientRects()].filter((rect) => rect.width > 1).map((rect) => Math.round(rect.top))).size;
      return getComputedStyle(el).whiteSpace === "nowrap" && lines === 1 && box.width > 1 && (!railBox || box.right <= railBox.right + 1);
    });
    const priceText = prices.map((el) => (el.textContent || "").replace(/\s+/g, " ").trim()).join(" | ");
    const notice = root.querySelector("[data-sheet-notice]");
    const noticeBox = notice ? notice.getBoundingClientRect() : null;
    const noticeStyle = notice ? getComputedStyle(notice) : null;
    const titleEl = document.getElementById("ask-sovereign-title");
    const titleLine = titleEl ? titleEl.getClientRects().length === 1 : false;
    const sheetVisible = Boolean(noticeStyle && noticeStyle.display !== "none" && noticeBox && noticeBox.height > 0);
    const sheetBelow = Boolean(noticeBox && titleEl && noticeBox.top >= titleEl.getBoundingClientRect().bottom - 1);
    const disclaimerEl = root.querySelector("[class*='disclaimer']");
    let disclaimerTail = "";
    if (disclaimerEl) {
      const range = document.createRange();
      range.selectNodeContents(disclaimerEl);
      const rects = [...range.getClientRects()].filter((rect) => rect.width > 1);
      const lastTop = rects.length ? Math.round(rects[rects.length - 1].top) : 0;
      disclaimerTail = rects.filter((rect) => Math.round(rect.top) === lastTop).length ? "measured" : "";
      const last = rects.filter((rect) => Math.round(rect.top) === lastTop);
      if (last.length) disclaimerTail = `${Math.round(last[0].width)}`;
    }
    const disclaimerBound = (disclaimerEl?.textContent || "").includes("się\u00A0mylić.");
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
      previewCaptions,
      simulatedLabel,
      chipGap,
      faceGap,
      bubbleWidth,
      retryWidth,
      chipWidth: noteChipBox ? noteChipBox.width : 0,
      emailPeriod,
      emailCount,
      errorTopFade,
      partialLine,
      strongHits,
      emailLines,
      emailBreak,
      replyLines,
      replyTailLines,
      faceInYou,
      plainYou,
      errorFollows,
      faceOnError,
      panelReviewTags,
      youWidth: youBubble ? youBubble.getBoundingClientRect().width : 0,
      hanging,
      errorWrapped: errorRects.length >= 2,
      noteWidth: noteBox ? noteBox.width : 0,
      turnWidth: turnBox ? turnBox.width : 0,
      noteTop: noteBox ? noteBox.top : 0,
      spriteBottom: spriteBox ? spriteBox.bottom : 0,
      spriteRight: spriteBox ? spriteBox.right : 0,
      retryLeft: retryBox ? retryBox.left : 0,
      textLeft,
      noteBelowFace: Boolean(noteBox && spriteBox && noteBox.top >= spriteBox.bottom - 8),
      errorNoteStacked: Boolean(noteChipBox && noteCaptionBox && noteCaptionBox.top >= noteChipBox.bottom - 1 && Math.abs(noteCaptionBox.left - noteChipBox.left) <= 3),
      errorFacePosition,
      errorFaceLift: /-40px/.test(errorFacePosition),
      retryWithText: Boolean(retryBox && faceCopyBox && Math.abs(retryBox.left - textLeft) <= 3),
      middotStarts,
      priceFits,
      priceText,
      sheetVisible,
      sheetOpaque: !sheetVisible || (noticeStyle.backgroundColor !== "transparent" && noticeStyle.backgroundColor !== "rgba(0, 0, 0, 0)"),
      sheetBelow,
      titleLine,
      disclaimerTail,
      disclaimerBound,
      contrastLow: labels.filter((item) => item.ratio < 4.5),
      contrastSample: labels,
    };
  }, { expectRetry: mode === "error", mode, locale });
  Object.assign(measured, onLoad);
  if (shot) await page.screenshot({ path: `${outDir}/${shot}` });
  if (mode === "error" && theme === "light" && ((width === 320 && height === 640) || (width === 1440 && height === 900))) {
    await page.screenshot({ path: `${outDir}/ask-error-${width}-${locale}-${theme}.png` });
  }
  if (locale === "pl" && theme === "light" && mode === "idle" && ((width === 320 && height === 640) || width === 390)) {
    await page.screenshot({ path: `${outDir}/ask-pl-sheet-${width}.png` });
  }
  if (theme === "light" && mode === "idle" && (width === 1024 || (width === 1440 && height === 900))) {
    await page.locator("[data-sovereign-preview] aside").screenshot({ path: `${outDir}/ask-rail-${width}-${locale}.png` });
  }
  if (mode === "error") {
    clsLines.push(`${locale} ${width}x${height} ${theme} error cls=${measured.cls}`);
    const retryName = locale === "pl" ? "Spróbuj ponownie" : "Retry";
    await page.getByRole("button", { name: retryName }).click();
    await page.getByText(/Simulated response\s·\s*preview|Podgląd: odpowiedź symulowana/).waitFor();
    await page.waitForFunction(() => {
      const thread = document.querySelector("[data-ask-thread]");
      const answer = document.querySelector("[data-latest-answer]");
      if (!thread || !answer) return false;
      const frame = thread.getBoundingClientRect();
      const box = answer.getBoundingClientRect();
      const fade = parseFloat(thread.style.getPropertyValue("--thread-fade")) || 0;
      const clearTop = frame.top + (thread.scrollTop > 1 ? fade : 0);
      const copy = answer.querySelector("[data-answer-copy]") || answer;
      const range = document.createRange();
      range.selectNodeContents(copy);
      const first = [...range.getClientRects()].find((rect) => rect.width > 1 && rect.height > 1);
      const fits = box.height <= frame.height - 1;
      const inside = box.top >= frame.top - 1 && (fits ? box.bottom <= frame.bottom + 1 : box.top <= frame.bottom);
      return Boolean(first && first.top >= clearTop - 1 && inside);
    }, { timeout: 3000 }).catch(() => {});
    if (width === 320 && height === 640 && theme === "light") {
      await page.screenshot({ path: `${outDir}/ask-after-retry-320-${locale}.png` });
    }
    const afterRetry = await page.evaluate(async () => {
      const chips = document.querySelector("[data-ask-chips]");
      const visible = [...chips.querySelectorAll("button")].filter((button) => getComputedStyle(button).display !== "none").length;
      const answer = /Simulated response\s·\s*preview|Podgląd: odpowiedź symulowana/.test(document.body.textContent || "");
      const cls = (window.__shifts || []).filter((entry) => !entry.recent).reduce((sum, entry) => sum + entry.value, 0);
      const bubble = document.querySelector("[class*='youBubble']");
      const thread = document.querySelector("[data-ask-thread]");
      const answerTurn = document.querySelector("[data-latest-answer]");
      const threadBox = thread.getBoundingClientRect();
      const answerBox = answerTurn ? answerTurn.getBoundingClientRect() : null;
      const copy = answerTurn?.querySelector("[data-answer-copy]");
      let firstTop = null;
      if (copy) {
        const range = document.createRange();
        range.selectNodeContents(copy);
        const rect = [...range.getClientRects()].find((item) => item.width > 1 && item.height > 1);
        firstTop = rect ? rect.top : null;
      }
      const fade = parseFloat(thread.style.getPropertyValue("--thread-fade")) || 0;
      const clearTop = threadBox.top + (thread.scrollTop > 1 ? fade : 0);
      const fits = Boolean(answerBox && answerBox.height <= threadBox.height - 1);
      const inside = Boolean(answerBox && answerBox.top >= threadBox.top - 1 && (fits ? answerBox.bottom <= threadBox.bottom + 1 : answerBox.top <= threadBox.bottom));
      const reachedStart = Boolean(inside && firstTop !== null && firstTop >= clearTop - 1);
      const maskOf = () => {
        const style = getComputedStyle(thread);
        return style.maskImage && style.maskImage !== "none" ? style.maskImage : style.webkitMaskImage || "none";
      };
      const overflow = thread.scrollHeight > thread.clientHeight + 1;
      const atEnd = thread.scrollTop + thread.clientHeight >= thread.scrollHeight - 1;
      const beforeMask = maskOf();
      const beforeTop = thread.scrollTop;
      const fadesBottom = (mask) => mask.includes("calc(100% - 16px)");
      const fadesTop = (mask) => /rgba\(0,\s*0,\s*0,\s*0\)\s+0px|transparent\s+0px/.test(mask);
      const beforeOk = !overflow
        ? beforeMask === "none"
        : atEnd
          ? (beforeTop > 1 ? fadesTop(beforeMask) && !fadesBottom(beforeMask) : beforeMask === "none")
          : fadesBottom(beforeMask) && (beforeTop > 1 ? fadesTop(beforeMask) : true);
      const previous = thread.scrollTop;
      thread.scrollTop = thread.scrollHeight;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const endMask = maskOf();
      const endTop = thread.scrollTop;
      const endOk = !fadesBottom(endMask) && (endTop > 1 ? fadesTop(endMask) : endMask === "none");
      thread.scrollTop = previous;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const fadeOk = beforeOk && endOk;
      return {
        visible,
        answer,
        cls,
        youWidth: bubble ? bubble.getBoundingClientRect().width : 0,
        active: document.activeElement?.id || "",
        aligned: reachedStart,
        topCut: firstTop !== null && firstTop < threadBox.top - 1,
        fadeOk,
      };
    });
    measured.retryCls = afterRetry.cls;
    measured.retryChips = afterRetry.visible;
    measured.retryAnswer = afterRetry.answer;
    measured.retryYouWidth = afterRetry.youWidth;
    measured.retryActive = afterRetry.active;
    measured.answerAligned = afterRetry.aligned && !afterRetry.topCut;
    measured.fadeOk = afterRetry.fadeOk;
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
  if (mode === "error" && (measured.faceInYou || !measured.plainYou || !measured.errorFollows || !measured.faceOnError)) issues.push("error face not on the sovereign turn after the question");
  if (mode === "error" && measured.panelReviewTags) issues.push("review tag in panel");
  if (mode === "error" && (Math.abs((measured.youWidth || 0) - (measured.retryYouWidth || 0)) > 0.5 || measured.retryActive !== "ask-sovereign-draft")) issues.push(`you width ${measured.youWidth}->${measured.retryYouWidth} focus=${measured.retryActive}`);
  if (mode === "error" && (!measured.errorChipInThread || measured.errorChipInHeader || !measured.captionOutside || !measured.captionVisible)) issues.push(`error caption ${measured.captionText}`);
  if (mode === "handoff" && (!measured.handoffChipInThread || measured.handoffChipInHeader || !measured.captionOutside || measured.simulatedLabel || measured.previewCaptions !== 1)) issues.push(`handoff caption ${measured.captionText} captions=${measured.previewCaptions}`);
  if (mode === "answer" && !measured.simulatedLabel) issues.push("simulated label missing");
  if (mode === "handoff" && (measured.emailCount !== 1 || measured.emailLines !== 1 || !measured.emailPeriod)) issues.push(`card email count=${measured.emailCount} lines=${measured.emailLines} period=${measured.emailPeriod}`);
  if (mode === "handoff" && measured.replyLines !== 0) issues.push(`reply email duplicated lines ${measured.replyLines}`);
  if (mode === "handoff" && measured.emailBreak === "break-all") issues.push("email breaks anywhere");
  if (locale === "pl" && mode === "error" && width <= 390 && measured.errorWrapped && !measured.hanging) issues.push("error note indent");
  if (mode === "error" && width < 480 && (measured.faceGap == null || measured.faceGap > 24 || measured.faceGap < 8)) issues.push(`error chip gap ${measured.faceGap}`);
  if (mode === "error" && width < 480 && !(measured.noteWidth >= measured.bubbleWidth - 1 && measured.retryWidth >= measured.bubbleWidth - 1 && measured.chipWidth > 0 && measured.chipWidth < measured.bubbleWidth - 8)) issues.push(`error width chip=${Math.round(measured.chipWidth)} note=${Math.round(measured.noteWidth)} retry=${Math.round(measured.retryWidth)} bubble=${Math.round(measured.bubbleWidth)}`);
  if (mode === "error" && width >= 480 && measured.retryLeft < measured.spriteRight - 1) issues.push("retry under the face");
  if (mode === "error" && !measured.retryWithText) issues.push("retry not in the text column");
  if (measured.middotStarts) issues.push(`middot starts a line ${measured.middotStarts}`);
  if ((width === 1024 || width === 1440) && !measured.priceFits) issues.push(`price ${measured.priceText}`);
  if (locale === "pl" && width < 768 && (!measured.sheetVisible || !measured.sheetBelow || !measured.titleLine || !measured.sheetOpaque)) issues.push("sheet notice");
  if (locale === "pl" && mode === "error" && width < 480 && !measured.errorNoteStacked) issues.push("pl error note beside the chip");
  if (mode === "error" && !measured.errorFaceLift) issues.push(`error face offset ${measured.errorFacePosition}`);
  if ((locale !== "pl" || width >= 768) && measured.sheetVisible) issues.push("sheet notice visible");
  if (locale === "pl" && width === 1440 && !measured.disclaimerBound) issues.push("disclaimer tail");
  if (mode === "error" && measured.answerAligned === false) issues.push("answer not at block start after retry");
  if (mode === "error" && width <= 390 && measured.fadeOk === false) issues.push("thread fade");
  if (mode === "error" && width <= 390 && measured.errorTopFade === false) issues.push("error top fade");
  if (locale === "pl" && mode === "handoff" && width < 768 && measured.partialLine) issues.push("partial line under the notice");
  if (measured.strongHits) issues.push(`fade band ${measured.strongHits}`);
  if (!measured.disclaimerFull) issues.push("disclaimer not full width");
  if (width >= 900 && !measured.bottomsAligned) issues.push(`bottoms ${measured.panelBottom.toFixed(0)}/${measured.railBottom.toFixed(0)}`);
  if (locale === "pl" && width === 1440 && height === 900 && !measured.railInFold) issues.push(`rail past fold ${measured.railBottom.toFixed(0)}`);
  if (measured.contrastLow?.length) issues.push(`contrast ${measured.contrastLow.map((item) => `${item.ratio} ${item.text}`).join("; ")}`);
  if (mode === "error" && measured.cls !== 0) issues.push(`cls ${measured.cls}`);
  if (mode === "error" && (measured.retryCls !== 0 || !measured.retryAnswer || measured.retryChips < 1)) issues.push(`retry cls=${measured.retryCls} chips=${measured.retryChips}`);
  const expectedCaption = mode === "error"
    ? (locale === "pl" ? "Podgląd\u00A0· symulowany błąd" : "Preview\u00A0· simulated error")
    : mode === "handoff"
      ? (locale === "pl" ? "Podgląd\u00A0· symulowane przekazanie" : "Preview\u00A0· simulated handoff")
      : "";
  if (expectedCaption && measured.captionText !== expectedCaption) issues.push(`caption ${JSON.stringify(measured.captionText)}`);
  return issues;
}

async function runPageWidth() {
  const widthLines = ["# documentElement.scrollWidth <= clientWidth. The scrollbar is outside clientWidth."];
  const widthRoutes = await publicRoutePaths();
  widthLines.push(`# routes ${widthRoutes.length}`);
  log(`# routes ${widthRoutes.length}`);
  let widthFails = 0;
  const navX = new Map();
  for (const viewport of viewports) {
    for (const theme of themes) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        colorScheme: theme,
      });
      const page = await context.newPage();
      await page.addInitScript((value) => localStorage.setItem("wo-theme", value), theme);
      for (const path of widthRoutes) {
        const locale = path === "/pl" || path.startsWith("/pl/") ? "pl" : "en";
        await gotoReady(page, `${base}${path}`);
        const measured = await page.evaluate(() => {
          const root = document.documentElement;
          const bar = document.querySelector(".wo-navbar-bar");
          const navWraps = bar ? [...bar.querySelectorAll("a, button")].filter((el) => {
            if (el.closest("#witnessops-mobile-menu")) return false;
            const style = getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden") return false;
            const rects = [...el.getClientRects()].filter((rect) => rect.width > 1 && rect.height > 1);
            return new Set(rects.map((rect) => Math.round(rect.top))).size > 1;
          }).map((el) => (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 48)) : [];
          return {
            scroll: root.scrollWidth,
            client: root.clientWidth,
            banner: Boolean(document.querySelector(".pl-copy-review")),
            navWraps,
          };
        });
        const widthOk = measured.scroll <= measured.client;
        const bannerOk = locale !== "pl" || measured.banner;
        const navOk = measured.navWraps.length === 0;
        if (!widthOk || !bannerOk || !navOk) widthFails += 1;
        const line = `${widthOk && bannerOk && navOk ? "OK" : "FAIL"} ${theme} ${locale} ${viewport.key} ${path} scroll=${measured.scroll} client=${measured.client} banner=${measured.banner} navWrap=${measured.navWraps.join("|") || "none"}`;
        widthLines.push(line);
        log(line);
        if (viewport.width === 1024 && (path === "/" || path === "/pl")) {
          const positions = await page.evaluate(() => {
            const bar = document.querySelector(".wo-navbar-bar");
            if (!bar) return [];
            return [...bar.querySelectorAll("a, button")].filter((el) => {
              if (el.closest("#witnessops-mobile-menu")) return false;
              const style = getComputedStyle(el);
              if (style.display === "none" || style.visibility === "hidden") return false;
              const box = el.getBoundingClientRect();
              return box.width > 1 && box.height > 1;
            }).map((el) => Math.round(el.getBoundingClientRect().x));
          });
          navX.set(`${path}:${theme}`, positions);
          if (theme === "dark") {
            const light = navX.get(`${path}:light`) || [];
            const same = light.length > 0 && light.length === positions.length && light.every((value, index) => value === positions[index]);
            const navLine = `${same ? "OK" : "FAIL"} nav-x ${path} 1024 light=${light.join(",")} dark=${positions.join(",")}`;
            widthLines.push(navLine);
            log(navLine);
            if (!same) widthFails += 1;
          }
        }
      }
      await context.close();
    }
  }
  widthLines.push(widthFails ? `PAGE_WIDTH_FAIL ${widthFails}` : "PAGE_WIDTH_OK");
  const widthFile = process.env.ASK_WIDTH_FILE || `${outDir}/page-width.txt`;
  writeFileSync(widthFile, `${[...reportStamp(), ...widthLines].join("\n")}\n`);
  log(widthLines.at(-1));
  if (widthFails) throw new Error(widthLines.at(-1));
}

try {
  if (process.env.ASK_ONLY === "width") {
    await runPageWidth();
    await browser.close();
    process.exit(0);
  }
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

  const focusLines = ["# Focus after Retry. Real pointer and keyboard activation. activeElement must be the composer."];
  for (const activation of ["mouse", "Enter", "Space"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(`${base}/docs/assistant?sim=error`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.activeElement?.id === "ask-sovereign-draft");
    await page.getByRole("button", { name: "What does the Agent Action Security Review cover?" }).click();
    const retry = page.getByRole("button", { name: "Retry" });
    await retry.waitFor();
    const before = await page.locator("[class*='youBubble']").evaluate((el) => el.getBoundingClientRect().width);
    if (activation === "mouse") await retry.click();
    else {
      await retry.focus();
      await page.keyboard.press(activation);
    }
    await page.getByText(/Simulated response\s·\s*preview/).waitFor();
    const after = await page.evaluate(() => ({
      active: document.activeElement?.id || document.activeElement?.tagName || "",
      you: document.querySelector("[class*='youBubble']")?.getBoundingClientRect().width ?? 0,
    }));
    const same = Math.abs(before - after.you) <= 0.5;
    const focused = after.active === "ask-sovereign-draft";
    const line = `${activation} active=${after.active} you ${before.toFixed(1)}->${after.you.toFixed(1)} ${focused && same ? "OK" : "FAIL"}`;
    focusLines.push(line);
    log(line);
    await context.close();
    if (!focused || !same) throw new Error(line);
  }
  writeReport("focus-retry.txt", focusLines);

  await runPageWidth();

  for (const width of [320, 390]) {
    const footer = await browser.newContext({ viewport: { width, height: 844 } });
    const footerPage = await footer.newPage();
    await footerPage.goto(`${base}/pl`, { waitUntil: "networkidle" });
    const footerLink = footerPage.locator("footer a", { hasText: "Narzędzie, nie przegląd" });
    const footerState = await footerLink.evaluate((el) => {
      const rects = [...el.getClientRects()].filter((rect) => rect.width > 1);
      return {
        text: (el.textContent || "").trim(),
        lines: new Set(rects.map((rect) => Math.round(rect.top))).size,
        nowrap: getComputedStyle(el).whiteSpace,
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      };
    });
    const footerOk = footerState.text === "Narzędzie, nie przegląd"
      && footerState.nowrap !== "nowrap"
      && footerState.lines === 1
      && footerState.scroll <= footerState.client;
    log(`pl-footer ${width} text=${JSON.stringify(footerState.text)} lines=${footerState.lines} whiteSpace=${footerState.nowrap} scroll=${footerState.scroll} ${footerOk ? "OK" : "FAIL"}`);
    await footer.close();
    if (!footerOk) throw new Error(`PL footer link at ${width}`);
  }

  const clsBad = clsLines.filter((line) => /cls=/.test(line)).filter((line) => !/cls=0(?:\s|$)/.test(line));
  log(`cls ${clsBad.length === 0 ? "OK" : `FAIL ${clsBad.join("; ")}`}`);
  if (clsBad.length) throw new Error(`CLS ${clsBad.join("; ")}`);

  for (const theme of themes) {
    const context = await browser.newContext({ viewport: { width: 320, height: 640 }, deviceScaleFactor: 1, colorScheme: theme });
    const page = await context.newPage();
    await page.addInitScript((value) => localStorage.setItem("wo-theme", value), theme);
    for (const path of ["/support", "/pl/support"]) {
      await gotoReady(page, `${base}${path}`);
      const rows = await page.evaluate(() => {
        function parseColor(input) {
          const match = String(input).match(/rgba?\(([^)]+)\)/);
          if (!match) return { r: 255, g: 255, b: 255, a: 1 };
          const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
          return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
        }
        function composite(fg, bg) {
          const alpha = fg.a;
          return { r: fg.r * alpha + bg.r * (1 - alpha), g: fg.g * alpha + bg.g * (1 - alpha), b: fg.b * alpha + bg.b * (1 - alpha), a: 1 };
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
        function parseAny(input) {
          const value = String(input).trim();
          const hex = value.match(/^#([0-9a-f]{6})$/i);
          if (!hex) return parseColor(value);
          return {
            r: Number.parseInt(hex[1].slice(0, 2), 16),
            g: Number.parseInt(hex[1].slice(2, 4), 16),
            b: Number.parseInt(hex[1].slice(4, 6), 16),
            a: 1,
          };
        }
        return [...document.querySelectorAll("button:disabled")].filter((button) => {
          const box = button.getBoundingClientRect();
          return box.width > 1 && box.height > 1;
        }).map((button) => {
          const style = getComputedStyle(button);
          const color = parseColor(style.color);
          const fill = parseColor(style.backgroundColor);
          const enabledFill = parseAny(style.getPropertyValue("--color-text-primary"));
          const enabledInk = parseAny(style.getPropertyValue("--color-text-inverse"));
          return {
            text: (button.textContent || "").replace(/\s+/g, " ").trim().slice(0, 70),
            ratio: Number(contrast(color, backing(button)).toFixed(2)),
            state: Number(Math.max(contrast(fill, enabledFill), contrast(color, enabledInk)).toFixed(2)),
            cursor: style.cursor,
            ariaDisabled: button.getAttribute("aria-disabled"),
          };
        });
      });
      if (path === "/support" && rows.length < 2) {
        const missing = `${theme} ${path} 320 disabled BUTTON missing ${rows.length}`;
        contrastLines.push(`${missing} FAIL`);
        log(`${missing} FAIL`);
      }
      for (const row of rows) {
        const ok = row.ratio >= 3 && row.ratio <= 4.5 && row.state >= 1.5 && row.cursor === "not-allowed" && row.ariaDisabled === "true";
        const contrastLine = `${theme} ${path} 320 disabled BUTTON ${row.ratio.toFixed(2)} state=${row.state.toFixed(2)} cursor=${row.cursor} aria-disabled=${row.ariaDisabled} ${ok ? "OK" : "FAIL"} ${JSON.stringify(row.text)}`;
        contrastLines.push(contrastLine);
        log(contrastLine);
      }
    }
    await context.close();
  }
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

  const priceLines = ["# Offer price units. One getClientRects line top per unit at 320 and 390."];
  let priceFails = 0;
  const recordPrice = (line, ok) => {
    const text = `${ok ? "OK" : "FAIL"} ${line}`;
    priceLines.push(text);
    log(text);
    if (!ok) priceFails += 1;
  };
  const questions = {
    en: {
      aasr: "What does the Agent Action Security Review cover?",
      easr: "What does the External Attack Surface Review include?",
    },
    pl: {
      aasr: "Co obejmuje Agent Action Security Review?",
      easr: "Co obejmuje External Attack Surface Review?",
    },
  };
  const priceSizes = [
    { width: 320, height: 640 },
    { width: 390, height: 844 },
  ];
  for (const locale of ["en", "pl"]) {
    for (const size of priceSizes) {
      for (const kind of ["aasr", "easr"]) {
        const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
        const page = await context.newPage();
        await gotoReady(page, `${base}${locale === "pl" ? "/pl" : ""}/docs/assistant`);
        await page.waitForFunction(() => document.activeElement?.id === "ask-sovereign-draft");
        await page.fill("#ask-sovereign-draft", questions[locale][kind]);
        await page.locator("form button[type=submit]").click();
        await page.getByText(/Simulated response\s·\s*preview|Podgląd: odpowiedź symulowana/).waitFor();
        await page.locator("[data-answer-copy] [data-price-unit]").waitFor();
        const measuredPrices = await page.evaluate(() => {
          function linesOf(el) {
            const rects = [...el.getClientRects()].filter((rect) => rect.width > 1 && rect.height > 1);
            return new Set(rects.map((rect) => Math.round(rect.top))).size;
          }
          const answer = document.querySelector("[data-answer-copy]");
          const answerUnits = [...(answer ? answer.querySelectorAll("[data-price-unit]") : [])];
          const railUnits = [...document.querySelectorAll("[data-offer-price]")];
          const answerText = answer ? answer.textContent || "" : "";
          const pairs = [...document.querySelectorAll("[class*='offerPair']")].map((pair) => {
            const name = pair.querySelector("[class*='offerName']");
            const tail = pair.querySelector("[class*='offerNameTail']");
            const price = pair.querySelector("[data-offer-price]");
            if (!name || !tail || !price) return { ok: false };
            const nameBox = name.getBoundingClientRect();
            const tailBox = tail.getBoundingClientRect();
            const priceBox = price.getBoundingClientRect();
            const oneLine = Math.abs(priceBox.top - nameBox.top) <= 3;
            const stacked = priceBox.top >= nameBox.bottom - 2;
            const colonWithName = linesOf(tail) === 1 && tailBox.top >= nameBox.top - 1 && tailBox.bottom <= nameBox.bottom + 1;
            const colonClear = stacked ? tailBox.bottom <= priceBox.top + 2 : Math.abs(tailBox.top - priceBox.top) <= 3;
            return { ok: colonWithName && colonClear && (oneLine || stacked) && linesOf(price) === 1, oneLine, stacked };
          });
          return {
            answerLines: answerUnits.map((el) => linesOf(el)),
            answerNowrap: answerUnits.every((el) => getComputedStyle(el).whiteSpace === "nowrap"),
            railLines: railUnits.map((el) => linesOf(el)),
            railNowrap: railUnits.every((el) => getComputedStyle(el).whiteSpace === "nowrap"),
            middot: /·\s*bez VAT/.test(answerText),
            loose: /€(?:2,500|1,900|2[\s\u00a0]500|1[\s\u00a0]900)(?!\u00a0(?:excl\.|bez)\u00a0VAT)/.test(answerText),
            pairs,
          };
        });
        const priceOk = measuredPrices.answerLines.length === 1
          && measuredPrices.answerLines.every((count) => count === 1)
          && measuredPrices.answerNowrap
          && measuredPrices.railLines.length === 2
          && measuredPrices.railLines.every((count) => count === 1)
          && measuredPrices.railNowrap
          && !measuredPrices.middot
          && !measuredPrices.loose
          && measuredPrices.pairs.length === 2
          && measuredPrices.pairs.every((pair) => pair.ok);
        recordPrice(`${locale} ${size.width}x${size.height} ${kind} answer=${measuredPrices.answerLines.join(",")} rail=${measuredPrices.railLines.join(",")} pairs=${JSON.stringify(measuredPrices.pairs)} middot=${measuredPrices.middot} loose=${measuredPrices.loose}`, priceOk);
        if (locale === "en" && size.width === 320 && kind === "easr") {
          await page.screenshot({ path: `${outDir}/ask-easr-320x640-en.png` });
        }
        if (locale === "pl" && size.width === 390 && kind === "aasr") {
          await page.screenshot({ path: `${outDir}/ask-aasr-390x844-pl.png` });
        }
        if (locale === "pl" && size.width === 320 && kind === "aasr") {
          await page.locator("[data-ask-thread]").evaluate((el) => { el.scrollTop = 160; });
          await page.screenshot({ path: `${outDir}/ask-pl-sheet-scrolled-320.png` });
        }
        await context.close();
      }
    }
  }
  const cardRoutes = [
    ["en", "/"],
    ["pl", "/pl"],
    ["en", "/reviews"],
    ["pl", "/pl/reviews"],
    ["en", "/reviews/agent-action-security-review"],
    ["en", "/reviews/external-attack-surface-review"],
    ["pl", "/pl/reviews/agent-action-security-review"],
    ["pl", "/pl/reviews/external-attack-surface-review"],
  ];
  for (const size of priceSizes) {
    const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
    const page = await context.newPage();
    for (const [locale, path] of cardRoutes) {
      await gotoReady(page, `${base}${path}`);
      const cards = await page.evaluate(() => [...document.querySelectorAll("[data-price-unit]")].map((el) => {
        const rects = [...el.getClientRects()].filter((rect) => rect.width > 1 && rect.height > 1);
        return {
          lines: new Set(rects.map((rect) => Math.round(rect.top))).size,
          nowrap: getComputedStyle(el).whiteSpace,
        };
      }));
      recordPrice(`${locale} ${size.width} cards ${path} n=${cards.length} lines=${cards.map((card) => card.lines).join(",")}`, cards.length >= 1 && cards.every((card) => card.lines === 1 && card.nowrap === "nowrap"));
    }
    await context.close();
  }
  for (const width of [1024, 1440]) {
    for (const locale of ["en", "pl"]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      await gotoReady(page, `${base}${locale === "pl" ? "/pl" : ""}/docs/assistant`);
      const rail = await page.evaluate(() => [...document.querySelectorAll("[data-offer-price]")].map((el) => {
        const rects = [...el.getClientRects()].filter((rect) => rect.width > 1);
        const pair = el.closest("[class*='offerPair']");
        const name = pair?.querySelector("[class*='offerName']");
        const tail = pair?.querySelector("[class*='offerNameTail']");
        const nameBox = name?.getBoundingClientRect();
        const priceBox = el.getBoundingClientRect();
        const tailBox = tail?.getBoundingClientRect();
        return {
          lines: new Set(rects.map((rect) => Math.round(rect.top))).size,
          oneLine: Boolean(nameBox && Math.abs(priceBox.top - nameBox.top) <= 3),
          stacked: Boolean(nameBox && priceBox.top >= nameBox.bottom - 2),
          colon: Boolean(tailBox && nameBox && tailBox.top >= nameBox.top - 1 && tailBox.bottom <= nameBox.bottom + 1),
        };
      }));
      recordPrice(`${locale} ${width} rail ${JSON.stringify(rail)}`, rail.length === 2 && rail.every((item) => item.lines === 1 && item.colon && (item.oneLine || item.stacked)));
      await context.close();
    }
  }
  priceLines.push(priceFails ? `PRICE_UNIT_FAIL ${priceFails}` : "PRICE_UNIT_OK");
  writeReport("price-unit.txt", priceLines);
  log(priceLines.at(-1));
  if (priceFails) throw new Error(priceLines.at(-1));

  log("OVERLAP_OK");
} catch (error) {
  log(`OVERLAP_FAIL ${error instanceof Error ? error.message : String(error)}`);
  writeReport("overlap-check.txt", lines);
  writeReport("cls.txt", clsLines);
  writeReport("contrast.txt", contrastLines);
  await browser.close();
  process.exit(1);
}

writeReport("overlap-check.txt", lines);
writeReport("cls.txt", clsLines);
writeReport("contrast.txt", contrastLines);
await browser.close();
