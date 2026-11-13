import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { THEME_INIT_SCRIPT } from "./theme-init";

const webRoot = resolve(__dirname, "../..");

test("the public site is dark only: no stored choice or system preference is read (footer bundle B)", () => {
  assert.match(THEME_INIT_SCRIPT, /setAttribute\("data-theme","dark"\)/);
  assert.doesNotMatch(THEME_INIT_SCRIPT, /localStorage|prefers-color-scheme|matchMedia|"light"/);
  assert.doesNotMatch(THEME_INIT_SCRIPT, /setItem|fetch|XMLHttpRequest|sendBeacon/);
  const layout = readFileSync(resolve(__dirname, "../app/layout.tsx"), "utf8");
  assert.match(layout, /data-theme="dark"/);
  assert.doesNotMatch(layout, /data-theme="light"/);
  assert.match(layout, /<meta name="color-scheme" content="dark" \/>/);
  assert.doesNotMatch(layout, /prefers-color-scheme/);
  assert.match(layout, /THEME_INIT_SCRIPT/);
});

test("no theme control remains on public surfaces", () => {
  assert.equal(existsSync(resolve(webRoot, "src/components/shared/theme-toggle.tsx")), false);
  assert.equal(existsSync(resolve(webRoot, "src/components/marketing/theme-memory.tsx")), false);
  for (const file of ["src/components/marketing/footer.tsx", "src/components/shared/mobile-navbar-menu.tsx", "src/components/shared/navbar.tsx"]) {
    const source = readFileSync(resolve(webRoot, file), "utf8");
    assert.doesNotMatch(source, /ThemeToggle|ThemeMemory|data-theme-choice|data-theme-toggle|wo-theme/, file);
  }
});
