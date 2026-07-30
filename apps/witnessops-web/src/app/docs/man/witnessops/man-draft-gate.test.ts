import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { isManWitnessOpsPubliclyServed } from "./page";

test("man witnessops route gates draft frontmatter with notFound", () => {
  const page = readFileSync(resolve(__dirname, "page.tsx"), "utf-8");
  assert.match(page, /notFound\s*\(/);
  assert.match(page, /\.draft/);

  const mdx = readFileSync(
    resolve(process.cwd(), "../../content/witnessops/docs/man/witnessops.mdx"),
    "utf-8",
  );
  assert.match(mdx, /^draft:\s*true\b/m);

  assert.equal(isManWitnessOpsPubliclyServed(true), false);
  assert.equal(isManWitnessOpsPubliclyServed(false), true);
});
