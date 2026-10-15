import { execFileSync, spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AskSovereignPreview } from "./ask-sovereign-preview";

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
  assert.match(html, /This choice is not sent and is not stored/);
  assert.match(html, /Pause animation/);
  assert.match(html, /role="status"/);
  for (const topic of ["Retention", "Data location", "AI provider", "AI disclosure", "Legal clauses"]) {
    assert.match(html, new RegExp(`${topic}.*Needs review`));
  }
  assert.match(html, /€2,500 excl\. VAT/);
  assert.match(html, /€1,900 excl\. VAT/);
  assert.match(source, /Simulated response · preview/);
  assert.match(source, /Podgląd: odpowiedź symulowana/);
  assert.match(source, /PL copy pending native review/);
  assert.match(source, /NEXT_PUBLIC_WO_PREVIEW === "1"/);
  assert.match(source, /Unavailable/);
  assert.match(source, /Asystent niedostępny/);
  assert.doesNotMatch(html, /openai|gpt-|api\/ask/i);
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
  assert.match(css, /width:\s*94px/);
  assert.match(css, /height:\s*102px/);
  assert.match(css, /image-rendering:\s*pixelated/);
  assert.match(css, /steps\(4\)/);
  assert.match(css, /border-radius:\s*8px/);
  assert.match(css, /border-radius:\s*0/);
  assert.doesNotMatch(css, /filter:/);
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
    [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]),
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
      return `<section class="panel" style="width:${width}px"><div class="thread" data-thread="${index}">
      <p class="disclaimer">You are chatting with an AI assistant. It answers only from published offer facts and can be wrong.</p>
      <ol class="transcript"><li class="sovereign"><div class="withSprite"><div class="sprite" data-state="idle" data-still="1"></div><div><p class="status">Ready</p><p>${escapeHtml(greetings[index] ?? "")}</p></div></div></li></ol>
      <div class="chips">${buttons}</div>
      <div class="chips chipsRow">${buttons}</div>
    </div></section>`;
    }).join("");
    const htmlPath = join(dir, `overflow-${width}.html`);
    writeFileSync(
      htmlPath,
      `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${cssPath}">
      <style>.panel{position:relative !important;inset:auto !important;height:auto !important;max-height:none !important;}</style>
      </head><body>${threads}
      <pre id="result"></pre>
      <script>
        const rows = [...document.querySelectorAll("[data-thread]")].map((thread) => {
          const chip = thread.querySelector("button");
          return {
            scroll: thread.scrollWidth,
            client: thread.clientWidth,
            chipScroll: chip ? chip.scrollWidth : 0,
            chipClient: chip ? chip.clientWidth : 0,
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
    const rows = JSON.parse(matched[1]) as Array<{ scroll: number; client: number; chipScroll: number; chipClient: number }>;
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.ok(row.client >= width - 2 && row.client <= width, `thread clientWidth ${row.client} at ${width}`);
      assert.ok(row.scroll <= row.client, `thread scrollWidth ${row.scroll} > clientWidth ${row.client} at ${width}`);
      assert.ok(row.chipClient > 0 && row.chipClient <= row.client, `chip clientWidth ${row.chipClient} outside thread ${row.client} at ${width}`);
      assert.ok(row.chipScroll <= row.chipClient, `chip scrollWidth ${row.chipScroll} > clientWidth ${row.chipClient} at ${width}`);
    }
  }
});
