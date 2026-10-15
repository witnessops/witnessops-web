import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import PolishWhyPage from "@/app/pl/why-witnessops/page";
import WhyPage from "@/app/why-witnessops/page";

const NAME = /Karol Stefanski|linkedin\.com\/in\/karol-s/i;

function filesUnder(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) filesUnder(path, out);
    else out.push(path);
  }
  return out;
}

test("public why pages render no personal name or LinkedIn profile", () => {
  const html = [
    renderToStaticMarkup(createElement(WhyPage)),
    renderToStaticMarkup(createElement(PolishWhyPage)),
  ].join("\n");
  assert.doesNotMatch(html, NAME);
  assert.match(html, />Founder</);
  assert.match(html, />Założyciel</);
});

test("public route sources do not render the personal name", () => {
  const appRoot = resolve(__dirname, "../../app");
  const hits: string[] = [];
  for (const file of filesUnder(appRoot)) {
    if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
    if (file.includes(`${join("app", "api")}/`) || file.endsWith(join("app", "api"))) continue;
    if (file.includes(".test.")) continue;
    const text = readFileSync(file, "utf8");
    if (NAME.test(text)) hits.push(file);
  }
  assert.deepEqual(hits, []);
});
