import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const middlewareSource = readFileSync(
  resolve(__dirname, "middleware.ts"),
  "utf8",
);
const layoutSource = readFileSync(resolve(__dirname, "app/layout.tsx"), "utf8");

test("middleware passes the requested locale into the server root layout", () => {
  assert.match(middlewareSource, /documentLanguageForPathname\(pathname\)/);
  assert.match(middlewareSource, /NextResponse\.next\(\{ request: \{ headers: requestHeaders \} \}\)/);
  assert.match(layoutSource, /<html lang=\{documentLanguage\}/);
  assert.doesNotMatch(layoutSource, /<html lang="en"/);
});

test("Polish language no longer depends on client hydration", () => {
  assert.doesNotMatch(middlewareSource, /document\.documentElement\.lang/);
  assert.doesNotMatch(layoutSource, /PolishLocaleBoundary/);
});
