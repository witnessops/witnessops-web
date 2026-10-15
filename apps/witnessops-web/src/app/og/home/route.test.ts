import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

test("retired home OG route redirects permanently and stays off the Edge runtime", () => {
  const source = readFileSync(resolve(__dirname, "route.tsx"), "utf-8");

  assert.doesNotMatch(source, /export\s+const\s+runtime\s*=\s*["']edge["']/);
  assert.match(source, /NextResponse\.redirect\(/);
  assert.match(source, /["']\/opengraph-image["']/);
  assert.match(source, /\b308\b/);
  assert.doesNotMatch(source, /ImageResponse/);
});

function filesUnder(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".next")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) filesUnder(path, out);
    else out.push(path);
  }
  return out;
}

test("no page references /og/home", () => {
  const roots = [
    resolve(__dirname, "../../.."),
    resolve(__dirname, "../../../../../../content"),
  ];
  const hits: string[] = [];
  for (const root of roots) {
    for (const file of filesUnder(root)) {
      if (file.endsWith(`${join("og", "home", "route.test.ts")}`)) continue;
      if (!/\.(ts|tsx|js|jsx|css|yaml|yml|json|md|mdx)$/.test(file)) continue;
      const text = readFileSync(file, "utf8");
      if (text.includes("/og/home")) hits.push(file);
    }
  }
  assert.deepEqual(hits, []);
});
