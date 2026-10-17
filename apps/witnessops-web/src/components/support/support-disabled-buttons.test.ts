import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const webRoot = resolve(__dirname, "../../..");
const presentation = readFileSync(resolve(webRoot, "src/app/public-presentation.css"), "utf8");
const tokens = readFileSync(resolve(webRoot, "../../packages/ui/tokens/witnessops.css"), "utf8");
const supportStart = readFileSync(resolve(__dirname, "support-start.tsx"), "utf8");
const supportIntake = readFileSync(resolve(__dirname, "support-intake.tsx"), "utf8");

type Rgb = { r: number; g: number; b: number };

function channel(value: number) {
  const scaled = value / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function contrast(foreground: Rgb, background: Rgb) {
  const left = 0.2126 * channel(foreground.r) + 0.7152 * channel(foreground.g) + 0.0722 * channel(foreground.b);
  const right = 0.2126 * channel(background.r) + 0.7152 * channel(background.g) + 0.0722 * channel(background.b);
  return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
}

function hex(value: string): Rgb {
  const match = value.trim().match(/^#([0-9a-f]{6})$/i);
  assert.ok(match, `expected a palette hex, got ${value}`);
  const raw = match[1];
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16),
  };
}

function themeBlock(theme: "light" | "dark") {
  const marker = `html[data-theme="${theme}"] body:not(:has([data-admin-shell]))`;
  const start = tokens.indexOf(marker);
  assert.ok(start >= 0, marker);
  const open = tokens.indexOf("{", start);
  const close = tokens.indexOf("}", open);
  return tokens.slice(open + 1, close);
}

function tokenHex(block: string, name: string) {
  const match = block.match(new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(match, `${name} missing from theme block`);
  return match[1].toLowerCase();
}

function rules(css: string) {
  return css
    .split("}")
    .map((rule) => {
      const [selector = "", body = ""] = rule.split("{");
      return { selector: selector.trim(), body };
    })
    .filter((rule) => rule.selector.includes("button[type=\"submit\"]") && rule.body.trim());
}

function withoutExclusions(selector: string) {
  return selector.replace(/:not\(:disabled\)/g, "").replace(/:not\(\[aria-disabled="true"\]\)/g, "");
}

function declaration(body: string, property: string) {
  const match = body.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;!]+)`));
  return match?.[1].trim() ?? "";
}

test("disabled support submits use a muted palette treatment that screen readers can name", () => {
  const muted = rules(presentation).filter((rule) => /:disabled|\[aria-disabled="true"\]/.test(withoutExclusions(rule.selector)));
  assert.ok(muted.length > 0, "public presentation has no disabled submit rule");

  const resting = muted.find((rule) => !/:hover|:focus|:active/.test(rule.selector));
  assert.ok(resting, "disabled submit rule must set the resting treatment");
  assert.match(resting.selector, /\[aria-disabled="true"\]/);
  assert.equal(declaration(resting.body, "cursor"), "not-allowed");

  const backgroundRef = declaration(resting.body, "background");
  const colorRef = declaration(resting.body, "color");
  assert.match(backgroundRef, /^var\(--color-[a-z0-9-]+\)$/);
  assert.match(colorRef, /^var\(--color-[a-z0-9-]+\)$/);
  const backgroundName = backgroundRef.slice(4, -1);
  const colorName = colorRef.slice(4, -1);

  for (const theme of ["light", "dark"] as const) {
    const block = themeBlock(theme);
    const fill = hex(tokenHex(block, backgroundName));
    const ink = hex(tokenHex(block, colorName));
    const textRatio = contrast(ink, fill);
    assert.ok(textRatio >= 3 && textRatio <= 4.5, `${theme} disabled text contrast ${textRatio.toFixed(2)} is outside 3–4.5`);

    const enabledFill = hex(tokenHex(block, "--color-text-primary"));
    const enabledInk = hex(tokenHex(block, "--color-text-inverse"));
    const stateRatio = Math.max(contrast(fill, enabledFill), contrast(ink, enabledInk));
    assert.ok(stateRatio >= 1.5, `${theme} disabled state contrast ${stateRatio.toFixed(2)} is below 1.5`);
  }

  const hover = rules(presentation).find((rule) =>
    rule.selector.includes(":hover") && !/:disabled|\[aria-disabled="true"\]/.test(withoutExclusions(rule.selector)),
  );
  assert.ok(hover, "enabled submit hover rule missing");
  assert.match(hover.selector, /:not\(:disabled\)/);
  assert.match(hover.selector, /:not\(\[aria-disabled="true"\]\)/);

  for (const state of [":hover", ":focus", ":focus-visible", ":active"]) {
    const locked = muted.find((rule) => rule.selector.includes(state));
    assert.ok(locked, `disabled submit ${state} can fall through to the enabled treatment`);
    assert.equal(declaration(locked.body, "background"), backgroundRef);
    assert.equal(declaration(locked.body, "color"), colorRef);
    assert.equal(declaration(locked.body, "cursor"), "not-allowed");
  }

  assert.match(supportStart, /disabled=\{!question\.trim\(\)\}[\s\S]{0,80}aria-disabled=\{!question\.trim\(\)\}|aria-disabled=\{!question\.trim\(\)\}[\s\S]{0,80}disabled=\{!question\.trim\(\)\}/);
  assert.match(supportIntake, /disabled=\{!email\.trim\(\)\}[\s\S]{0,200}aria-disabled=\{!email\.trim\(\)\}|aria-disabled=\{!email\.trim\(\)\}[\s\S]{0,200}disabled=\{!email\.trim\(\)\}/);
});
