import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
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
    "--color-surface-bg: #0b0c0b",
    "--color-surface-bg-alt: #0f100e",
    "--color-surface-inset: #0b0c0b",
    "--color-surface-card: #121310",
    "--color-surface-card-hover: #1a1b17",
    "--color-surface-border: #2f302b",
    "--color-surface-border-strong: #6f6e64",
    "--color-text-primary: #f5f1e8",
    "--color-text-secondary: #c3bfb6",
    "--color-text-muted: #a7a399",
    "--color-brand-accent: #b89b62",
    "--color-text-inverse: #0b0c0b",
    "--color-action-fill: #b89b62",
    "--color-action-on-fill: #0b0c0b",
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

test("navbar and footer lockups use the canonical black and white files", () => {
  for (const source of [navbar, footer]) {
    assert.match(source, /witnessops-horizontal-black\.svg/);
    assert.match(source, /witnessops-horizontal-white\.svg/);
    assert.match(source, /alt="WitnessOps"/);
    assert.doesNotMatch(source, /tone="current"/);
    assert.doesNotMatch(source, /WitnessOpsMark/);
  }
});

function block(selector: string) {
  const start = tokens.indexOf(`${selector} {`);
  assert.ok(start >= 0, `Missing token block: ${selector}`);
  return tokens.slice(start, tokens.indexOf("}", start));
}

test("the dark theme declares every palette token instead of inheriting legacy values", () => {
  const dark = block('html[data-theme="dark"] body:not(:has([data-admin-shell]))');
  for (const marker of [
    "--color-surface-card-hover: #1a1b17",
    "--color-surface-border-hover: #a7a399",
    "--color-surface-border-accent: #4c432d",
    "--color-brand-primary-hover: #ffffff",
    "--color-brand-secondary: #c3bfb6",
    "--color-brand-muted: #a7a399",
    "--color-action-fill: #b89b62",
    "--color-action-fill-hover: #cbb27d",
    "--color-action-fill-press: #a68b57",
    "--color-action-on-fill: #0b0c0b",
    "--color-signal-red: #f28b93",
    "--color-signal-green: #86be8e",
    "--color-signal-amber: #d6c49e",
    "--color-signal-copper: #b89b62",
    "--color-accent-trust: #b89b62",
    "--hero-glow: none",
    "--grid-minor: #171815",
    "--grid-major: #22231f",
    "--crop-color: #b89b62",
    "--crop-offset: 13px",
  ]) {
    assert.ok(dark.includes(marker), `Missing dark token: ${marker}`);
  }
});

test("the light theme keeps its ink primary and leaves hover and press to existing fallbacks", () => {
  const light = block('html[data-theme="light"] body:not(:has([data-admin-shell]))');
  assert.ok(light.includes("--color-action-fill: #0b0c0b"));
  assert.ok(light.includes("--color-action-on-fill: #f5f1e8"));
  assert.doesNotMatch(light, /--color-action-fill-(?:hover|press)|--grid-|--crop-/);
  assert.doesNotMatch(block(":root"), /--color-action-fill-(?:hover|press)/);
});

test("the grid and crop marks are dark-only and off in print and forced colours", () => {
  assert.match(globals, /html\[data-theme="dark"\] body:not\(:has\(\[data-admin-shell\]\)\) \{\s*background-image:\s*linear-gradient\(to right, var\(--grid-major\)/);
  assert.match(globals, /html\[data-theme="dark"\] body:not\(:has\(\[data-admin-shell\]\)\) :is\(\.crop, \.crop-frame\)::before/);
  assert.match(globals, /@media print, \(forced-colors: active\) \{\s*html body \{ background-image: none !important; \}/);
});

const LEGACY_PALETTE = /f27a3d|ff6b35|242[\s,]+122[\s,]+61|255[\s,]+107[\s,]+53|255[\s,]+140[\s,]+80|255[\s,]+160[\s,]+100|64a8ac|100[\s,]+168[\s,]+172/i;

function cssFiles(root: string): string[] {
  return readdirSync(root, { recursive: true, encoding: "utf-8" })
    .filter((file) => file.endsWith(".css"))
    .map((file) => join(root, file));
}

test("shipped public CSS carries no legacy orange or teal", () => {
  const files = [
    ...cssFiles(resolve(__dirname, "..")),
    ...cssFiles(resolve(__dirname, "../../../../packages/ui/tokens")),
    ...cssFiles(resolve(__dirname, "../../../../packages/ui/src")),
  ];
  assert.ok(files.length > 20, "CSS scan found too few files");
  for (const file of files) {
    assert.doesNotMatch(readFileSync(file, "utf-8"), LEGACY_PALETTE, `Legacy palette value in ${file}`);
  }
});

test("public primary controls carry no legacy orange shadow", () => {
  for (const file of [
    "../components/shared/navbar.tsx",
    "../components/shared/mobile-navbar-menu.tsx",
    "../components/shared/cta-button.tsx",
    "../components/support/support-intake.tsx",
    "(marketing)/contact/contact-form.tsx",
  ]) {
    assert.doesNotMatch(readFileSync(resolve(__dirname, file), "utf-8"), LEGACY_PALETTE, file);
  }
});

test("public peach hover and dark-on-accent text are retired from the homepage and quiet controls", () => {
  const buyerHomepage = readFileSync(resolve(__dirname, "../components/marketing/buyer-homepage.module.css"), "utf-8");
  for (const css of [globals, buyerHomepage]) {
    assert.doesNotMatch(css, /ff8a4c|ff8a5c|160b05/i);
  }
  assert.match(globals, /--public-control-hover: var\(--color-action-fill-hover, var\(--color-text-secondary\)\);/);
  assert.match(globals, /--public-control-pressed: var\(--color-action-fill-press, var\(--color-text-muted\)\);/);
});
