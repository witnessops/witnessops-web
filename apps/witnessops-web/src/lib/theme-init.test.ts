import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { THEME_INIT_SCRIPT } from "./theme-init";

test("theme init reads a stored choice and makes no network request", () => {
  assert.match(THEME_INIT_SCRIPT, /localStorage\.getItem\("wo-theme"\)/);
  assert.match(THEME_INIT_SCRIPT, /t==="light"\|\|t==="dark"/);
  assert.doesNotMatch(THEME_INIT_SCRIPT, /fetch|XMLHttpRequest|sendBeacon/);
  const layout = readFileSync(resolve(__dirname, "../app/layout.tsx"), "utf8");
  assert.match(layout, /data-theme="light"/);
  assert.match(layout, /THEME_INIT_SCRIPT/);
  assert.doesNotMatch(layout, /className="dark"/);
});
