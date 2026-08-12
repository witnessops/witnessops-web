import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const globals = readFileSync(resolve(__dirname, "globals.css"), "utf-8");
const navbar = readFileSync(
  resolve(__dirname, "../components/shared/navbar.tsx"),
  "utf-8",
);
const footer = readFileSync(
  resolve(__dirname, "../components/marketing/footer.tsx"),
  "utf-8",
);

test("the shared public shell follows the page surface theme", () => {
  assert.match(globals, /body:has\(\.buyer-page\) \.public-shell/);
  assert.match(
    globals,
    /body:has\(main\[data-page="home"\]\) \.public-shell/,
  );
  assert.doesNotMatch(
    globals,
    /\.public-shell,\s*\.buyer-page/,
    "The shared shell must not force the paper palette on dark pages.",
  );
});

test("navbar and footer marks inherit the active shell contrast", () => {
  for (const source of [navbar, footer]) {
    assert.match(source, /tone="current"/);
    assert.match(source, /text-text-primary/);
  }
});
