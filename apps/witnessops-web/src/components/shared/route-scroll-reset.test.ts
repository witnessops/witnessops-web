import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = readFileSync(
  resolve(import.meta.dirname, "route-scroll-reset.tsx"),
  "utf8",
);

test("global route policy leaves hash and history scrolling to the platform", () => {
  assert.doesNotMatch(source, /scrollTo\(/);
  assert.doesNotMatch(source, /scrollTop/);
  assert.doesNotMatch(source, /scrollIntoView\(/);
  assert.doesNotMatch(source, /requestAnimationFrame/);
  assert.doesNotMatch(source, /usePathname/);
  assert.doesNotMatch(source, /popstate/);
});
