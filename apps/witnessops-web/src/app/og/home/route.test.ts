import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

const webRoot = resolve(__dirname, "../../../..");

test("/og/home is a permanent config redirect to a relative path", () => {
  const source = readFileSync(resolve(webRoot, "next.config.js"), "utf8");
  assert.match(
    source,
    /source:\s*"\/og\/home",\s*destination:\s*"\/opengraph-image",\s*permanent:\s*true/,
  );
  assert.equal(existsSync(resolve(__dirname, "route.tsx")), false);
  assert.doesNotMatch(source, /trustHostHeader|request\.url/);
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
