import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const sources = [
  "../../app/verify/page.tsx",
  "../../app/pl/verify/page.tsx",
  "../../app/verify/skill/page.tsx",
  "./verify-console.tsx",
  "./verify-console.module.css",
  "./verification-result.tsx",
  "./skill-console.tsx",
  "./skill-console.module.css",
].map((path) => ({ path, text: readFileSync(resolve(__dirname, path), "utf8") }));

test("/verify surfaces use redesign tokens instead of hard-coded colours", () => {
  for (const { path, text } of sources) {
    assert.doesNotMatch(text, /#[0-9a-f]{3,8}\b/i, `${path} hard-codes a hex colour`);
    assert.doesNotMatch(text, /\brgba?\(/, `${path} hard-codes an rgb() colour`);
    assert.doesNotMatch(text, /\b(?:bg|text|border|ring|outline)-(?:white|black)\b/, `${path} uses a theme-blind colour utility`);
  }
});

test("/verify signal text uses theme-aware text tokens, not raw indicator tints", () => {
  for (const { path, text } of sources) {
    assert.doesNotMatch(text, /\btext-signal-(?:red|amber|green)\b/, `${path} colours text with a raw signal token`);
    assert.doesNotMatch(text, /^\s*color: var\(--color-signal-(?:red|amber|green)\);/m, `${path} colours text with a raw signal token`);
  }
});

test("/verify signal edges and tints derive from the theme-aware text tokens", () => {
  for (const { path, text } of sources) {
    assert.doesNotMatch(text, /\b(?:border|border-l|bg)-signal-(?:red|amber|green)\b/, `${path} uses a raw signal edge or tint`);
    assert.doesNotMatch(text, /^\s*border(?:-left)?(?:-color)?:[^;]*var\(--color-signal-(?:red|amber|green)\)/m, `${path} draws an edge with a raw signal token`);
    assert.doesNotMatch(text, /placeholder:text-[a-z-]+\/\d+/, `${path} fades placeholder text below its token`);
  }
});

test("/verify verdict and receipt controls never use undefined colour tokens", () => {
  for (const { path, text } of sources) {
    assert.doesNotMatch(text, /text-brand-ink|--skill-accent-soft|--color-signal-yellow/, `${path} references an undefined token`);
  }
});
