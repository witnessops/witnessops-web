import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { THEME_INIT_SCRIPT } from "./theme-init";

const webRoot = resolve(__dirname, "../..");

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

test("wo-theme is written only inside an explicit theme click", () => {
  const toggle = readFileSync(resolve(webRoot, "src/components/shared/theme-toggle.tsx"), "utf8");
  const memory = readFileSync(resolve(webRoot, "src/components/marketing/theme-memory.tsx"), "utf8");
  const toggleEffect = toggle.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/);
  assert.ok(toggleEffect);
  assert.doesNotMatch(toggleEffect[0], /setItem|wo-theme/);
  assert.match(toggle, /function choose\(next: ThemeName\) \{\s*localStorage\.setItem\("wo-theme", next\);/);
  assert.match(toggle, /onClick=\{\(\) => choose\(next\)\}/);
  assert.doesNotMatch(memory, /useEffect/);
  assert.match(memory, /function choose\(theme: RememberedTheme\) \{\s*localStorage\.setItem\("wo-theme", theme\);/);
  assert.match(memory, /onClick=\{\(\) => choose\("dark"\)\}/);
  assert.match(memory, /onClick=\{\(\) => choose\("light"\)\}/);
  const privacy = readFileSync(resolve(webRoot, "../../content/witnessops/legal/privacy.mdx"), "utf8");
  const polish = readFileSync(resolve(webRoot, "../../content/witnessops/legal/pl/privacy.mdx"), "utf8");
  assert.match(privacy, /## Needs review[\s\S]*`wo-theme`[\s\S]*only after you click/);
  assert.match(polish, /## Do sprawdzenia[\s\S]*`wo-theme`[\s\S]*dopiero po kliknięciu/);
});
