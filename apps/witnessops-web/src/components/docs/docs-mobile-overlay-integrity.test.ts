import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const sidebar = readFileSync(resolve(__dirname, "docs-sidebar.tsx"), "utf8");
const search = readFileSync(resolve(__dirname, "docs-search.tsx"), "utf8");

test("mobile docs drawer has a bounded scroll region and modal focus lifecycle", () => {
  assert.match(sidebar, /h-\[100dvh\] max-h-\[100dvh\] overflow-hidden/);
  assert.match(
    sidebar,
    /min-h-0 flex-1 overflow-y-auto overscroll-contain sidebar-kb-scroll/,
  );
  assert.match(sidebar, /env\(safe-area-inset-top\)/);
  assert.match(sidebar, /env\(safe-area-inset-bottom\)/);
  assert.match(sidebar, /data-docs-drawer-initial-focus/);
  assert.match(sidebar, /previousFocusRef\.current\?\.isConnected/);
  assert.match(sidebar, /FOCUSABLE_SELECTOR/);
  assert.match(sidebar, /handleDrawerKeyDown/);
  assert.match(sidebar, /aria-modal="true"/);
  assert.match(sidebar, /tabIndex=\{-1\}/);
  assert.match(sidebar, /style=\{mobile \? \{ fontSize: "16px" \} : undefined\}/);
});

test("docs menu trigger clears device insets and the branded footer", () => {
  assert.match(sidebar, /footer\[data-brand-footer\]/);
  assert.match(sidebar, /footer\.getBoundingClientRect\(\)\.top/);
  assert.match(sidebar, /safe-area-inset-bottom/);
  assert.match(sidebar, /safe-area-inset-left/);
  assert.match(sidebar, /\$\{footerClearance\}px/);
});

test("docs search remains usable in short mobile viewports", () => {
  assert.match(search, /h-\[100dvh\] max-h-\[100dvh\]/);
  assert.match(search, /max-h-full w-full max-w-xl flex-col overflow-hidden/);
  assert.match(search, /min-h-0 flex-1 overflow-y-auto overscroll-contain/);
  assert.match(search, /text-base[^\n]+lg:text-sm/);
  for (const inset of ["top", "right", "bottom", "left"]) {
    assert.match(search, new RegExp(`safe-area-inset-${inset}`));
  }
});

test("docs overlays share the composable body-scroll lock", () => {
  for (const source of [sidebar, search]) {
    assert.match(source, /acquireBodyScrollLock/);
    assert.doesNotMatch(source, /document\.body\.style\.overflow\s*=/);
  }
});

test("search consumes top-layer close shortcuts before lower overlays", () => {
  assert.match(search, /stopImmediatePropagation\(\)/);
  assert.match(search, /addEventListener\("keydown", handleKey, \{ capture: true \}\)/);
  assert.match(search, /removeEventListener\("keydown", handleKey, true\)/);
});

test("keyboard result navigation stays inside the Next router", () => {
  assert.match(search, /const router = useRouter\(\)/);
  assert.match(search, /router\.push\(target\.href\)/);
  assert.doesNotMatch(search, /window\.location\.href\s*=/);
});
