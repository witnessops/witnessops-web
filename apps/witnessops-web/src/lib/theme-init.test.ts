import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { THEME_INIT_SCRIPT } from "./theme-init";

test("theme init follows the system preference until a click stores a choice", () => {
  assert.match(THEME_INIT_SCRIPT, /localStorage\.getItem\("wo-theme"\)/);
  assert.match(THEME_INIT_SCRIPT, /t!=="light"&&t!=="dark"/);
  assert.match(THEME_INIT_SCRIPT, /prefers-color-scheme: dark/);
  assert.doesNotMatch(THEME_INIT_SCRIPT, /localStorage\.setItem|fetch|XMLHttpRequest|sendBeacon/);
  const layout = readFileSync(resolve(__dirname, "../app/layout.tsx"), "utf8");
  assert.match(layout, /data-theme="light"/);
  assert.match(layout, /THEME_INIT_SCRIPT/);
  assert.doesNotMatch(layout, /className="dark"/);
});
