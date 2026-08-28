import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const globals = readFileSync(resolve(__dirname, "globals.css"), "utf-8");
const tokens = readFileSync(
  resolve(__dirname, "../../../../packages/ui/tokens/witnessops.css"),
  "utf-8",
);
const navbar = readFileSync(
  resolve(__dirname, "../components/shared/navbar.tsx"),
  "utf-8",
);
const footer = readFileSync(
  resolve(__dirname, "../components/marketing/footer.tsx"),
  "utf-8",
);

test("the package token file owns the canonical public palette", () => {
  for (const marker of [
    "--color-surface-bg: #050505",
    "--color-surface-bg-alt: #0d0d0c",
    "--color-surface-inset: #141413",
    "--color-surface-card: #0d0d0c",
    "--color-surface-border: #2a2a28",
    "--color-surface-border-strong: #474743",
    "--color-text-primary: #fafaf7",
    "--color-text-secondary: #d0ccc4",
    "--color-text-muted: #9e9a93",
    "--color-brand-accent: #f27a3d",
    "--color-text-inverse: #160b05",
  ]) {
    assert.ok(tokens.includes(marker), `Missing canonical token: ${marker}`);
  }

  assert.doesNotMatch(
    globals,
    /--color-(?:brand|surface|text)-[^:\n]+:\s*(?:#|rgba?\()/,
    "Public routes and chrome must consume package tokens instead of redefining them.",
  );
});

test("homepage-native and buyer pages share the dark public contract", () => {
  assert.match(globals, /\.public-brand-page\s*\{[\s\S]*?var\(--color-surface-bg\)/);
  assert.match(
    globals,
    /\.buyer-page\s*\{[\s\S]*?background:\s*var\(--color-surface-bg\);[\s\S]*?color:\s*var\(--color-text-primary\);/,
  );
  assert.doesNotMatch(globals, /body:has\(\.buyer-page\)/);
  assert.doesNotMatch(globals, /#ffffff|#f6f6f6|#eeeeee|#d5d5d5/);
});

test("the public footer consumes the shared palette without a local override", () => {
  assert.match(
    globals,
    /footer\.public-shell\.public-footer\[data-brand-footer\]\s*\{\s*background:\s*var\(--color-surface-bg\);\s*color:\s*var\(--color-text-primary\);\s*\}/,
  );
});

test("navbar and footer marks inherit the active shell contrast", () => {
  for (const source of [navbar, footer]) {
    assert.match(source, /tone="current"/);
    assert.match(source, /text-text-primary/);
  }
});
