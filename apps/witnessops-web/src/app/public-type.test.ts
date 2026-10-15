import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const files = [
  "src/app/public-presentation.css",
  "src/app/public-type.css",
  "src/components/marketing/simple-homepage.module.css",
  "src/components/marketing/buyer-homepage.module.css",
  "src/components/marketing/review-offer.module.css",
  "src/components/ask-sovereign/ask-sovereign-preview.module.css",
  "src/app/footer-pages.module.css",
];

const allowedSpacing = new Set([
  "0",
  "0em",
  "normal",
  "-0.025em",
  "-0.03em",
  "-0.02em",
  "-0.015em",
  "-0.01em",
  "0.08em",
  "0.06em",
]);

function declarations(block: string, property: string) {
  const values: string[] = [];
  const pattern = new RegExp(`${property}\\s*:\\s*([^;!}]+)`, "g");
  for (const match of block.matchAll(pattern)) values.push(match[1].trim());
  return values;
}

function isToken(value: string) {
  return /^var\(--type-[a-z0-9-]+\)$/.test(value);
}

test("public type styles use the locked tokens", () => {
  const failures: string[] = [];
  for (const file of files) {
    const css = readFileSync(join(process.cwd(), file), "utf8");
    const rules = css.split("}");
    for (const rule of rules) {
      const [selector = "", body = ""] = rule.split("{");
      for (const value of declarations(body, "font-size")) {
        if (!isToken(value) && value !== "inherit" && value !== "0.875em") {
          failures.push(`${file} font-size: ${value}`);
        }
      }
      for (const value of declarations(body, "line-height")) {
        if (!isToken(value) && value !== "inherit" && value !== "normal") {
          failures.push(`${file} line-height: ${value}`);
        }
      }
      for (const value of declarations(body, "font-weight")) {
        if (!isToken(value) && !["300", "400", "500", "inherit", "normal"].includes(value)) {
          failures.push(`${file} font-weight: ${value}`);
        }
      }
      for (const value of declarations(body, "letter-spacing")) {
        const normalised = value.replace(/^\./, "0.").replace(/^-\./, "-0.");
        if (!isToken(value) && !allowedSpacing.has(normalised)) {
          failures.push(`${file} letter-spacing: ${value}`);
        }
      }
      if (/overflow-wrap\s*:\s*anywhere/.test(body) && /\bh[1-4]\b/.test(selector)) {
        failures.push(`${file} overflow-wrap: anywhere on ${selector.trim()}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

function cssFiles(dir: string, out: string[] = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".next")) continue;
      cssFiles(path, out);
    } else if (entry.name.endsWith(".css")) out.push(path);
  }
  return out;
}

test("--type-hero is only read by the homepage modules", () => {
  const allowed = [
    "src/components/marketing/simple-homepage.module.css",
    "src/components/marketing/buyer-homepage.module.css",
  ];
  const failures: string[] = [];
  for (const file of cssFiles("src")) {
    const css = readFileSync(file, "utf8");
    if (!css.includes("var(--type-hero")) continue;
    const normalised = file.split("\\").join("/");
    if (!allowed.some((item) => normalised.endsWith(item))) failures.push(normalised);
  }
  assert.deepEqual(failures, []);
});
