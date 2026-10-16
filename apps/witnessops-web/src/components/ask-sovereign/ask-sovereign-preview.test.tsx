import { execFileSync, spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test, { mock } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AskSovereignPreview, announcementText, armPendingQuestion, followUpSuggestions, liveText, pausedLoadPhase, PROCESSING_SHOW_DELAY_MS, PENDING_TIMEOUT_MS, SLOW_PENDING_MS, suggestionTopic } from "./ask-sovereign-preview";
import type { SovereignSpriteState } from "./sovereign-playback";

test("Ask Sovereign preview makes no fetch or XHR and stores nothing but the pause flag", () => {
  const files = ["ask-sovereign-preview.tsx", "sovereign-sprite.tsx", "ask-sovereign-answers.ts", "sovereign-playback.ts", "preview-triggers.ts"];
  const source = files.map((file) => readFileSync(resolve(__dirname, file), "utf8")).join("\n");
  assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|indexedDB|\/api\/ask-witnessops/);
  assert.match(source, /wo-sovereign-paused/);
  assert.match(source, /sessionStorage\.setItem\(PAUSE_KEY/);
  assert.doesNotMatch(source, /sessionStorage\.setItem\(\s*"/);
  const html = renderToStaticMarkup(createElement(AskSovereignPreview));
  assert.match(html, /Ask Sovereign/);
  assert.match(html, /Hello\. I can answer from the two published reviews/);
  assert.match(html, /Include this transcript when I contact a person/);
  assert.match(html, /Preview, sends nothing/);
  assert.match(html, /aria-describedby="ask-sovereign-optin-hint"/);
  assert.doesNotMatch(html, /This choice is not sent and is not stored/);
  assert.doesNotMatch(html, /Nothing from this chat is attached/);
  assert.match(html, /Pause animation/);
  assert.equal(html.match(/role="status"/g)?.length, 1);
  assert.equal(html.match(/aria-live=/g)?.length, 1);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-atomic="true"/);
  const visibleStatus = html.match(/<p class="[^"]*status[^"]*"[^>]*>/);
  assert.ok(visibleStatus);
  assert.doesNotMatch(visibleStatus[0], /aria-hidden|aria-live|role=/);
  assert.doesNotMatch(source, /aria-live="assertive"/);
  assert.doesNotMatch(source, /key=\{status\}/);
  assert.match(source, /Checking the published facts/);
  assert.doesNotMatch(source, /revealWaitMs|thinkingDurationMs/);
  assert.match(source, /setPhase\("ERROR"\)/);
  assert.match(source, /ask\(text, true\)/);
  assert.doesNotMatch(source, /scrollIntoView/);
  assert.match(source, /scrollTurnToThreadStart/);
  assert.equal(source.match(/composerRef\.current\?\.focus/g)?.length, 2);
  assert.equal(PROCESSING_SHOW_DELAY_MS, 150);
  assert.equal(PENDING_TIMEOUT_MS, 15_000);
  assert.equal(SLOW_PENDING_MS, 6_000);
  assert.doesNotMatch(html, /Needs review/);
  assert.match(html, /€2,500\u00A0excl\.\u00A0VAT/);
  assert.match(html, /€1,900\u00A0excl\.\u00A0VAT/);
  assert.match(source, /Simulated response\\u00A0· preview/);
  assert.match(source, /simulatedChip: "Simulated"/);
  assert.match(source, /Podgląd: odpowiedź symulowana/);
  assert.match(source, /simulatedChip: "Symulacja"/);
  assert.match(source, /Nothing was sent\. Try again\?/);
  assert.match(source, /Nic nie zostało wysłane\. Spróbować ponownie\?/);
  assert.match(source, /się\\u00A0mylić/);
  assert.match(source, /data-sheet-notice/);
  assert.match(source, /PL copy pending native review/);
  assert.doesNotMatch(html, /PL copy pending native review/);
  assert.match(source, /NEXT_PUBLIC_WO_PREVIEW === "1"/);
  assert.match(source, /if \(pending\) return/);
  assert.match(source, /disabled=\{pending\}/);
  assert.match(source, /flag === "timeout"/);
  assert.match(source, /sv-fallback/);
  assert.match(source, /sovereign-idle-fallback\.css/);
  assert.equal(announcementText("en", "answer", "Scope."), "Sovereign, simulated response: Scope.");
  assert.equal(announcementText("pl", "error"), "Błąd symulowany. Pytanie nie dostało odpowiedzi. Możesz spróbować ponownie.");
  assert.doesNotMatch(html, /openai|gpt-|api\/ask/i);
  assert.match(source, /CONTACT_ADDRESS = "engage@mail\.witnessops\.com"/);
  assert.match(source, /mailto:\$\{CONTACT_ADDRESS\}/);
  assert.match(source, /<wbr \/>/);
  assert.match(source, /followUpSuggestions\(copy\.suggestions, askedText, actionBeats \|\| !followUpsReady\)/);
  assert.match(source, /useLayoutEffect\(\(\) => \{/);
  assert.match(source, /setFollowUpsReady\(live !== "error" && live !== "handoff" && live !== "processing"\)/);
  assert.match(source, /activeSim === "slow" \|\| activeSim === "timeout"/);
  assert.equal(suggestionTopic("What does the External Attack Surface Review cover?"), "easr");
  assert.equal(suggestionTopic("What does the External Attack Surface Review include, and what does it cost?"), "easr");
  assert.equal(suggestionTopic("Co obejmuje External Attack Surface Review i ile kosztuje?"), "easr");
  assert.deepEqual(
    followUpSuggestions(
      [
        { id: "aasr", text: "Agent" },
        { id: "easr", text: "External include" },
        { id: "start", text: "Start" },
      ],
      "What does the External Attack Surface Review cover?",
      false,
    ).map((item) => item.id),
    ["aasr", "start"],
  );
  assert.deepEqual(followUpSuggestions([{ id: "easr", text: "External" }], "cost", true), []);
  assert.match(source, /handoffCaption/);
  assert.match(source, /visualViewport/);
  assert.match(source, /data-ask-thread="" ref=\{threadRef\} tabIndex=\{0\} aria-labelledby="ask-sovereign-title"/);
});

function chromeBinary(): string | null {
  for (const candidate of ["google-chrome", "google-chrome-stable", "chromium"]) {
    try {
      execFileSync("which", [candidate], { stdio: "ignore" });
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);
}

test("the answering sprite is a pixelated steps animation at 94 by 102", () => {
  const css = readFileSync(resolve(__dirname, "ask-sovereign-preview.module.css"), "utf8");
  const source = readFileSync(resolve(__dirname, "ask-sovereign-preview.tsx"), "utf8");
  assert.match(css, /width:\s*94px/);
  assert.match(css, /height:\s*102px/);
  assert.match(css, /image-rendering:\s*pixelated/);
  assert.match(css, /steps\(4\)/);
  assert.match(css, /border-radius:\s*8px/);
  assert.match(css, /border-radius:\s*0/);
  assert.doesNotMatch(css, /filter:/);
  assert.match(css, /\.status \{[^}]*min-height:\s*16px/);
  assert.match(css, /max-width:\s*419px\)\s*\{\s*\.status\s*\{\s*min-height:\s*32px/);
  assert.match(css, /@keyframes sv-status \{ from \{ opacity: 0\.6; \} to \{ opacity: 1; \} \}/);
  assert.match(css, /prefers-reduced-motion: reduce\)[\s\S]*statusText \{ animation: none/);
  assert.match(css, /prefers-reduced-motion: reduce\)[\s\S]*\.panel, \.scrim \{ animation-duration: 0ms; transition-duration: 0ms; \}/);
  assert.doesNotMatch(css, /\.pause\s*\{\s*display:\s*none/);
  assert.match(css, /max-width:\s*419px\)[\s\S]*\.simChip \{ order: 3; flex: 0 0 calc\(100% - 44px\);/);
  assert.match(css, /height:\s*20px/);
  assert.match(css, /font-weight:\s*500/);
  assert.match(css, /padding:\s*2px 6px/);
  assert.match(css, /border:\s*1px solid var\(--color-surface-border\)/);
  assert.match(css, /background:\s*var\(--color-surface-inset\)/);
  assert.match(css, /color:\s*var\(--color-text-muted\)/);
  assert.match(css, /\.sprite:global\(\.sv-fallback\)\[data-face-ready\]\s*\{\s*background-image:\s*none/);
  assert.match(css, /\.chips \{[^}]*flex-wrap:\s*wrap/);
  assert.match(css, /\.chips button \{[^}]*max-width:\s*100%/);
  assert.doesNotMatch(css, /\.chips[^{]*\{[^}]*overflow-x:\s*auto/);
  assert.match(css, /calc\(100dvh - 72px - 32px - 64px\)/);
  assert.match(css, /body:has\(\.pl-copy-review\)\) \.panel \{[^}]*calc\(100dvh - 72px - 32px - 64px - 1rem - var\(--type-caption-lh\) - 1px\)/);
  assert.match(css, /min-width:\s*1024px\)\s*\{\s*\.thread \{ min-height: 360px; \}/);
  assert.match(css, /\.titleUnit \{ white-space: nowrap; border: 0;/);
  assert.match(css, /\.badge, \.tag \{/);
  assert.doesNotMatch(css, /\.name span/);
  assert.match(css, /\.retry \{[^}]*white-space:\s*nowrap/);
  assert.match(css, /\.addressTail \{[^}]*white-space:\s*nowrap/);
  assert.match(css, /\.rail \{ height: auto; align-self: start;/);
  assert.match(css, /\.handoffCta \{[^}]*background:\s*var\(--color-brand-accent\)/);
  assert.match(css, /\.handoffCta \{[^}]*color:\s*var\(--color-text-inverse\)/);
  assert.match(css, /:where\(\.sovereign, \.handoffCard\) a:not\(\.handoffCta\)/);
  assert.match(css, /max-height:\s*699px\)[\s\S]*\.chips button:nth-child\(n\+3\)/);
  assert.match(source, /if \(phase === "ERROR"\)/);
  assert.match(source, /item\.role === "sovereign" && item\.simulatedError/);
  assert.match(source, /focusComposer\.current = true/);
  assert.match(css, /scrollbar-width:\s*thin/);
  assert.match(css, /scrollbar-color:\s*var\(--color-surface-border\)/);
  assert.match(css, /\.disclaimer \{[^}]*text-wrap:\s*pretty/);
  assert.match(css, /\.errorNote \{[^}]*text-wrap:\s*pretty/);
  assert.match(css, /\.threadFade \{[^}]*mask-image:\s*linear-gradient\(to bottom, #000 0, #000 calc\(100% - 16px\), transparent 100%\)/);
  assert.match(css, /\.offerPrice \{[^}]*white-space:\s*nowrap/);
  assert.match(css, /\.errorBody \{[^}]*grid-column:\s*1 \/ -1/);
  assert.match(css, /min-width:\s*480px\)[\s\S]*\.errorBody \{ grid-column: 2; \}/);
  assert.match(css, /\.sheetNotice \{[^}]*display:\s*none/);
  assert.match(css, /max-width:\s*767px\)[\s\S]*\.sheetNotice \{ display: block; \}/);
  assert.match(source, /scrollTurnToThreadStart\(thread, turn, reducedMotion\)/);
  assert.match(source, /data-latest-answer=/);
  assert.match(css, /\.rail \.lead \{[^}]*var\(--type-body-lg-size\)/);
  assert.match(css, /\.replyAddress \{[^}]*display:\s*block/);
  assert.match(source, /data-reply-address=""/);
  assert.match(source, /scrollPrimaryActionIntoView\(thread, action, reducedMotion\)/);
  assert.match(source, /behavior: reduced \? "auto" : "smooth"/);
  assert.match(css, /\.you, \.sovereign \{ min-width: 0; max-width: 100%; \}/);
  assert.match(css, /\.transcript \{[^}]*min-width: 0; max-width: 100%; \}/);
  assert.match(css, /\.handoffCard \{[^}]*min-width: 0;[^}]*max-width: 100%/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.doesNotMatch(css, /\.you p, \.sovereign p \{[^}]*font-size:\s*1[0-3]px/);
  const sprite = readFileSync(resolve(__dirname, "sovereign-sprite.tsx"), "utf8");
  assert.match(sprite, /data-face-ready=\{faceReady \? "" : undefined\}/);
  assert.match(sprite, /setFaceReady\(false\)/);
  assert.match(sprite, /setTopSrc\(undefined\)/);
});

test("liveText is non-empty for every phase in English and Polish", () => {
  const phases: SovereignSpriteState[] = ["GREETING", "IDLE", "PROCESSING", "COMPOSING", "HANDOFF", "ERROR"];
  const lives = ["idle", "processing", "answered", "handoff", "error"] as const;
  for (const locale of ["en", "pl"] as const) {
    for (const phase of phases) {
      for (const live of lives) {
        const text = liveText(locale, live, phase).trim();
        assert.ok(text.length > 0, `${locale} ${phase} ${live}`);
      }
    }
  }
  assert.equal(liveText("en", "idle", "GREETING"), "Ready");
  assert.equal(liveText("pl", "idle", "GREETING"), "Gotowy do pytań");
  assert.equal(liveText("en", "idle", "ERROR"), "Not answered");
  assert.equal(liveText("pl", "processing", "ERROR"), "Bez odpowiedzi");
  assert.equal(liveText("en", "answered", "ERROR"), "Not answered");
  assert.equal(liveText("en", "processing", "PROCESSING"), "Checking the published facts…");
  assert.equal(liveText("pl", "processing", "PROCESSING"), "Sprawdzam opublikowane informacje…");
  assert.equal(liveText("en", "answered", "IDLE"), "Ready");
  assert.equal(liveText("en", "handoff", "HANDOFF"), "Needs a person");
  const html = renderToStaticMarkup(createElement(AskSovereignPreview));
  assert.match(html, /role="status" aria-live="polite" aria-atomic="true"><\/p>/);
  assert.equal(html.match(/aria-live=/g)?.length, 1);
  const visibleStatus = html.match(/<p class="[^"]*status[^"]*"[^>]*>/);
  assert.ok(visibleStatus);
  assert.doesNotMatch(visibleStatus[0], /aria-hidden|aria-live|role=/);
  assert.match(html, /Ready/);
  const polish = renderToStaticMarkup(createElement(AskSovereignPreview, { locale: "pl" }));
  assert.match(polish, /Gotowy do pytań/);
  assert.match(polish, /Dołącz tę rozmowę, gdy napiszę do człowieka/);
  assert.match(polish, /Podgląd, nic nie wysyła/);
});

test("Polish Ask Sovereign chrome keeps the locked retest line and leaves review to the page banner", () => {
  const html = renderToStaticMarkup(createElement(AskSovereignPreview, { locale: "pl" }));
  const layout = readFileSync(resolve(__dirname, "../../app/pl/layout.tsx"), "utf8");
  assert.equal(html.match(/PL copy pending native review/g)?.length, 1);
  assert.match(html, /data-sheet-notice/);
  assert.match(layout, /PL copy pending native review/);
  assert.match(layout, /Narzędzie, nie przegląd/);
  assert.match(layout, /Nic nie zostało wysłane\. Spróbować ponownie\?/);
  assert.match(layout, /Podgląd · symulowane przekazanie/);
  assert.match(layout, /Podgląd · symulowany błąd/);
  assert.match(layout, /className="[^"]*reviewTag/);
  const status = html.match(/<p class="[^"]*status[^"]*"[\s\S]*?<\/p>/);
  const hint = html.match(/<p id="ask-sovereign-optin-hint"[\s\S]*?<\/p>/);
  assert.ok(status);
  assert.ok(hint);
  assert.doesNotMatch(status[0], /PL copy pending native review/);
  assert.doesNotMatch(hint[0], /PL copy pending native review/);
  assert.match(html, /Rozmawiasz z asystentem AI/);
  assert.match(html, /Dołącz tę rozmowę, gdy napiszę do człowieka/);
  assert.match(html, /Podgląd, nic nie wysyła/);
  assert.doesNotMatch(html, /Nie zaznaczono\./);
  assert.doesNotMatch(html, /Ten wybór nie jest wysyłany i nie jest zapisywany/);
  assert.doesNotMatch(html, /Nic z tej rozmowy nie jest dołączane/);
  assert.match(html, /Zapytaj o te dwa przeglądy/);
  assert.match(html, /aria-label="Wyślij"/);
  assert.match(html, /Na co Sovereign może odpowiedzieć/);
  assert.match(html, /Jak zacząć i gdzie napisać/);
  assert.match(html, /O tym asystencie/);
  assert.match(html, /€2\u00A0500\u00A0bez\u00A0VAT/);
  assert.match(html, /€1\u00A0900\u00A0bez\u00A0VAT/);
  assert.doesNotMatch(html, /€\s?[\d\s\u00A0]+\s?·\s?bez VAT/);
  assert.match(html, /Jeden ukierunkowany retest zgłoszonych ustaleń w ciągu 30 dni kalendarzowych od przekazania pierwszego raportu/);
  assert.doesNotMatch(html, /One focused retest of reported findings/);
  assert.match(html, />Dokumentacja</);
  assert.match(html, /Asystent AI/);
  assert.match(html, /Pytania o dwa przeglądy WitnessOps/);
  assert.doesNotMatch(html, />Docs</);
  assert.doesNotMatch(html, /AI assistant/);
  const source = readFileSync(resolve(__dirname, "ask-sovereign-preview.tsx"), "utf8");
  assert.match(source, /retry: "Spróbuj ponownie"/);
  assert.doesNotMatch(html, /Needs review/);
});

test("paused-on-load shows Ready and the idle sprite", () => {
  assert.equal(pausedLoadPhase(true), "IDLE");
  assert.equal(pausedLoadPhase(false), "GREETING");
  assert.equal(liveText("en", "idle", pausedLoadPhase(true)), "Ready");
  assert.equal(liveText("pl", "idle", pausedLoadPhase(true)), "Gotowy do pytań");
  const source = readFileSync(resolve(__dirname, "ask-sovereign-preview.tsx"), "utf8");
  assert.match(source, /setPhase\(\(current\) => \(current === "GREETING" \? pausedLoadPhase\(true\) : current\)\)/);
  assert.match(source, /setPhase\(pausedLoadPhase\(true\)\)/);
  assert.match(source, /<SovereignSprite state=\{phase\}/);
});

test("Ask Sovereign suggestion chips stay inside the thread at 320 and 390", (t) => {
  const chrome = chromeBinary();
  if (!chrome) {
    t.skip("Chrome is not available for the overflow measurement");
    return;
  }

  const source = readFileSync(resolve(__dirname, "ask-sovereign-preview.tsx"), "utf8");
  const cssPath = resolve(__dirname, "ask-sovereign-preview.module.css");
  const suggestionLists = [...source.matchAll(/suggestions:\s*\[([\s\S]*?)\]/g)].map((match) =>
    [...match[1].matchAll(/text:\s*"([^"]+)"/g)].map((item) => item[1]),
  );
  const greetings = [...source.matchAll(/greeting:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(suggestionLists.length, 2);
  assert.equal(greetings.length, 2);
  assert.ok(suggestionLists[0]?.some((item) => item.startsWith("What does the Agent Action")));
  assert.ok(suggestionLists[0]?.some((item) => item.startsWith("What does the External Attack")));

  const dir = mkdtempSync(join(tmpdir(), "ask-chip-overflow-"));
  for (const width of [320, 390]) {
    const threads = suggestionLists.map((suggestions, index) => {
      const buttons = suggestions.map((suggestion) => `<button type="button">${escapeHtml(suggestion)}</button>`).join("");
      return `<section class="panel" data-case="${index}" style="width:${width}px;height:640px">
      <div class="thread" data-thread="${index}">
        <p class="disclaimer">You are chatting with an AI assistant. It answers only from published offer facts and can be wrong.</p>
        <ol class="transcript"><li class="you" data-turn=""><p>${escapeHtml(suggestions[0] ?? "")}</p><p class="errorNote">Not answered. Nothing was sent.</p><button type="button" class="retry" data-retry="">Retry</button></li><li class="sovereign"><div class="withSprite"><div class="sprite" data-state="ERROR" data-still="1"></div><div><p>${escapeHtml(greetings[index] ?? "")}</p></div></div></li></ol>
      </div>
      <div class="askDock"><div class="chips" data-chips="">${buttons}</div></div>
      <form class="composer"><input /><button type="submit">Send</button></form>
    </section>`;
    }).join("");
    const htmlPath = join(dir, `overflow-${width}.html`);
    writeFileSync(
      htmlPath,
      `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${cssPath}">
      <style>.panel{position:relative !important;inset:auto !important;max-height:none !important;}</style>
      </head><body>${threads}
      <pre id="result"></pre>
      <script>
        const rows = [...document.querySelectorAll("[data-case]")].map((panel) => {
          const thread = panel.querySelector("[data-thread]");
          const turn = panel.querySelector("[data-turn]");
          const chips = panel.querySelector("[data-chips]");
          const retry = panel.querySelector("[data-retry]");
          const turnBox = turn.getBoundingClientRect();
          const threadBox = thread.getBoundingClientRect();
          const chipBox = chips.getBoundingClientRect();
          const retryBox = retry.getBoundingClientRect();
          const overlap = !(turnBox.bottom <= chipBox.top || chipBox.bottom <= turnBox.top || turnBox.right <= chipBox.left || chipBox.right <= turnBox.left);
          const chipFit = [...chips.querySelectorAll("button")].filter((button) => getComputedStyle(button).display !== "none").every((button) => button.scrollWidth <= button.clientWidth + 1 && button.getBoundingClientRect().right <= chipBox.right + 0.5);
          return {
            scroll: thread.scrollWidth,
            client: thread.clientWidth,
            box: threadBox.width,
            panel: panel.getBoundingClientRect().width,
            overlap,
            retryTop: retryBox.top,
            retryBottom: retryBox.bottom,
            threadTop: threadBox.top,
            threadBottom: threadBox.bottom,
            wrap: getComputedStyle(chips).flexWrap,
            chipFit,
          };
        });
        document.getElementById("result").textContent = JSON.stringify(rows);
      </script></body></html>`,
    );
    const launched = spawnSync(
      chrome,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--no-first-run",
        `--user-data-dir=${join(dir, `profile-${width}`)}`,
        `--window-size=${width},900`,
        "--force-device-scale-factor=1",
        "--virtual-time-budget=1000",
        "--dump-dom",
        htmlPath,
      ],
      { encoding: "utf8", timeout: 20000 },
    );
    const dom = String(launched.stdout ?? "");
    const matched = dom.match(/<pre id="result">([\s\S]*?)<\/pre>/);
    assert.ok(matched, `missing thread measurement at ${width}`);
    const rows = JSON.parse(matched[1]) as Array<{ scroll: number; client: number; box: number; panel: number; overlap: boolean; retryTop: number; retryBottom: number; threadTop: number; threadBottom: number; wrap: string; chipFit: boolean }>;
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.ok(Math.abs(row.box - row.panel) <= 1, `thread width ${row.box} panel ${row.panel} at ${width}`);
      assert.ok(row.scroll <= row.client + 1, `thread scrollWidth ${row.scroll} > clientWidth ${row.client} at ${width}`);
      assert.equal(row.overlap, false, `chips overlap a turn at ${width}`);
      assert.equal(row.wrap, "wrap");
      assert.equal(row.chipFit, true, `a chip is clipped at ${width}`);
      assert.ok(row.retryTop >= row.threadTop - 1 && row.retryBottom <= row.threadBottom + 1, `Retry is outside the thread at ${width}`);
    }
  }
});

test("a preview timeout reaches the error state and a second question waits", () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    let phase = "pending";
    const stopTimeout = armPendingQuestion("timeout", 1, () => 1, {
      show() { phase = "processing"; },
      resolve() { phase = "answered"; },
      fail() { phase = "error"; },
    });
    mock.timers.tick(PROCESSING_SHOW_DELAY_MS);
    assert.equal(phase, "processing");
    mock.timers.tick(PENDING_TIMEOUT_MS);
    assert.equal(phase, "error");
    stopTimeout();

    phase = "pending";
    let stopSlow = () => {};
    stopSlow = armPendingQuestion("slow", 2, () => 2, {
      show() { phase = "processing"; },
      resolve() { stopSlow(); phase = "answered"; },
      fail() { phase = "error"; },
    });
    mock.timers.tick(SLOW_PENDING_MS);
    assert.equal(phase, "answered");
    mock.timers.tick(PENDING_TIMEOUT_MS);
    assert.equal(phase, "answered");
  } finally {
    mock.timers.reset();
  }
  const source = readFileSync(resolve(__dirname, "ask-sovereign-preview.tsx"), "utf8");
  const askBody = source.slice(source.indexOf("function ask("), source.indexOf("const asked"));
  assert.ok(askBody.indexOf("if (pending) return") < askBody.indexOf("clearPendingTimers()"));
});

test("Ask Sovereign type classes stay on the locked roles", () => {
  const html = renderToStaticMarkup(createElement(AskSovereignPreview, { locale: "pl" }));
  assert.doesNotMatch(html, /reviewTag/);
  assert.doesNotMatch(html, /<h1[^>]*>Ask Sovereign<\/h1>/);
  assert.match(html, /id="ask-sovereign-title"/);
  assert.doesNotMatch(html, /data-display-title/);
  assert.match(html, /<h3[^>]*>Na co Sovereign może odpowiedzieć/);
  const css = readFileSync(resolve(__dirname, "ask-sovereign-preview.module.css"), "utf8");
  assert.match(css, /\.reviewTag \{[^}]*padding-inline: 16px/);
  assert.match(css, /\.name \{[^}]*var\(--type-h4-size\)/);
  assert.match(css, /\.status \{[^}]*var\(--type-mono-caps-size\)/);
  assert.match(css, /\.composer input \{[^}]*var\(--type-body-size\)/);
  assert.match(css, /\.page h1 \{[^}]*var\(--type-h1-size\)/);
});
