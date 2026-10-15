import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(process.cwd(), "public/brand/witnessops-logo-system-v1");

test("canonical logo system is byte-identical to SHA256SUMS", () => {
  const lines = readFileSync(join(root, "SHA256SUMS.txt"), "utf8").trim().split("\n");
  assert.equal(lines.length, 47);
  for (const line of lines) {
    const [hash, ...rest] = line.trim().split(/\s+/);
    const file = rest.join(" ").replace(/^\*/, "");
    const actual = createHash("sha256").update(readFileSync(join(root, file))).digest("hex");
    assert.equal(actual, hash, file);
  }
});

test("favicon.ico at /public is the canonical file", () => {
  const a = readFileSync(join(process.cwd(), "public/favicon.ico"));
  const b = readFileSync(join(root, "favicon/favicon.ico"));
  assert.ok(a.equals(b));
});

test("manifest icons exist, use purpose any, and point into the canonical folder", () => {
  const m = JSON.parse(readFileSync(join(process.cwd(), "public/site.webmanifest"), "utf8"));
  assert.ok(Array.isArray(m.icons) && m.icons.length > 0);
  for (const i of m.icons) {
    assert.match(i.src, /^\/brand\/witnessops-logo-system-v1\/favicon\//);
    assert.equal(i.purpose, "any");
    readFileSync(join(process.cwd(), "public", i.src));
  }
});
