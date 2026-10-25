import { execFileSync, spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { snapThreadClearOfFade, threadFadePx } from "./thread-fade";

function chromeBinary(): string | null {
  if (existsSync("/opt/google/chrome/chrome")) return "/opt/google/chrome/chrome";
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

const COPY = {
  en: "You are chatting with an AI assistant. It answers only from published offer facts and can be wrong.",
  pl: "Rozmawiasz z asystentem AI. Odpowiada tylko na podstawie opublikowanych faktów oferty i może się mylić. Pytaj o zakres, cenę albo jak zacząć.",
} as const;

test("the shared top fade keeps every line out of the strong band", (t) => {
  const chrome = chromeBinary();
  if (!chrome) {
    t.skip("Chrome is not available for the fade measurement");
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), "ask-thread-fade-"));
  const views = [
    { locale: "en", width: 390, height: 844 },
    { locale: "en", width: 320, height: 640 },
    { locale: "en", width: 320, height: 844 },
    { locale: "pl", width: 390, height: 844 },
    { locale: "pl", width: 320, height: 640 },
    { locale: "pl", width: 320, height: 844 },
    { locale: "en", width: 1440, height: 900 },
    { locale: "pl", width: 1440, height: 900 },
  ];
  const htmlPath = join(dir, "fade.html");
  const panels = views.map((view, index) => `<section data-case="${index}" data-locale="${view.locale}" style="width:${view.width}px">
    <div class="thread" data-thread style="height:240px">
      <p class="disclaimer">${COPY[view.locale as "en" | "pl"]}</p>
      <p class="body">Hello. I can answer from the two published reviews. Ask about scope, price or how to start. ${COPY.pl}</p>
      <p class="you" data-turn>What does the External Attack Surface Review include, and what does it cost?</p>
      <p class="body">A simulated answer long enough to scroll the disclaimer under the top fade. ${COPY[view.locale as "en" | "pl"]} ${COPY.pl} ${COPY.en} ${COPY.pl}</p>
      <p class="body">${COPY.en} ${COPY.pl} ${COPY.en}</p>
    </div>
  </section>`).join("");
  writeFileSync(htmlPath, `<!doctype html><html><head><meta charset="utf-8"><style>
    :root { --type-small-lh: 20px; --type-body-lh: 24px; --type-caption-lh: 16px; }
    body { margin: 0; }
    .thread { overflow: auto; }
    .disclaimer { margin: 0; padding: 12px 16px; font-size: 14px; line-height: var(--type-small-lh); }
    .body, .you { margin: 16px; font-size: 16px; line-height: var(--type-body-lh); }
  </style></head><body>${panels}<pre id="result"></pre>
  <script>
    const threadFadePx = ${threadFadePx.toString()};
    const snapThreadClearOfFade = ${snapThreadClearOfFade.toString()};
    const rows = [...document.querySelectorAll("[data-case]")].map((panel) => {
      const thread = panel.querySelector("[data-thread]");
      const turn = panel.querySelector("[data-turn]");
      const fade = threadFadePx(thread);
      thread.style.setProperty("--thread-fade", fade + "px");
      const top = turn.getBoundingClientRect().top - thread.getBoundingClientRect().top + thread.scrollTop;
      thread.scrollTop = Math.max(0, top - 8);
      const before = thread.scrollTop;
      snapThreadClearOfFade(thread, fade);
      const frame = thread.getBoundingClientRect();
      const bandTop = frame.top + fade * 0.3;
      const bandBottom = frame.top + fade;
      const walker = document.createTreeWalker(thread, NodeFilter.SHOW_TEXT);
      const hits = [];
      let node = walker.nextNode();
      while (node) {
        if (!(node.textContent || "").trim()) { node = walker.nextNode(); continue; }
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) {
          if (rect.width < 1 || rect.height < 1) continue;
          if (rect.bottom <= frame.top + 0.5 || rect.top >= frame.bottom) continue;
          if (rect.bottom > bandTop + 0.5 && rect.top < bandBottom - 0.5) hits.push((node.textContent || "").trim().slice(0, 60));
        }
        node = walker.nextNode();
      }
      return { locale: panel.getAttribute("data-locale"), width: Math.round(panel.getBoundingClientRect().width), fade, before, hits };
    });
    document.getElementById("result").textContent = JSON.stringify(rows);
  </script></body></html>`);
  const launched = spawnSync(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--no-first-run",
    `--user-data-dir=${join(dir, "profile")}`,
    "--window-size=1440,900",
    "--force-device-scale-factor=1",
    "--virtual-time-budget=1000",
    "--dump-dom",
    htmlPath,
  ], { encoding: "utf8", timeout: 60_000 });
  const stdout = String(launched.stdout ?? "");
  const matched = stdout.match(/<pre id="result">([\s\S]*?)<\/pre>/);
  assert.ok(matched, `missing fade measurement status=${launched.status} signal=${launched.signal} error=${launched.error?.message ?? "none"} stderr=${String(launched.stderr ?? "").slice(-400)}`);
  const rows = JSON.parse(matched[1]) as Array<{ locale: string; width: number; fade: number; before: number; hits: string[] }>;
  assert.equal(rows.length, views.length);
  for (const row of rows) {
    assert.ok(row.fade >= 24, `${row.locale} ${row.width} fade ${row.fade}`);
    assert.ok(row.before > 1, `${row.locale} ${row.width} did not scroll the thread`);
    assert.deepEqual(row.hits, [], `${row.locale} ${row.width} lines in the strong fade: ${row.hits.join(" | ")}`);
  }
});
