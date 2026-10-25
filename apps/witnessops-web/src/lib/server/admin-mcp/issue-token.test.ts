import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../scripts/admin-mcp-issue-token.mjs",
);

test("the offline issuer prints a token once and only a hash line", async () => {
  const source = await readFile(script, "utf8");
  assert.equal(source.includes("writeFile"), false);
  assert.equal(source.includes("appendFile"), false);
  assert.equal(source.includes("createWriteStream"), false);
  assert.equal(source.includes("console.log"), false);
  const cwd = await mkdtemp(path.join(os.tmpdir(), "admin-mcp-issue-"));
  const result = spawnSync(process.execPath, [script, "reader", "health:read,counts:read"], {
    cwd,
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  const lines = result.stdout.split("\n").filter((line) => line.length > 0);
  assert.equal(lines.length, 2);
  const token = lines[0] ?? "";
  assert.match(token, /^wo_mcp_reader_[A-Za-z0-9_-]{43}$/);
  assert.equal(result.stderr.includes(token), false);
  const hashLine = lines[1] ?? "";
  assert.match(hashLine, /^[a-f0-9]{64}$/);
  assert.equal(source.includes("sha256:"), false);
  assert.equal(result.stdout.includes("sha256:"), false);
  assert.equal(hashLine, createHash("sha256").update(token).digest("hex"));
  assert.deepEqual(await readdir(cwd), []);
  assert.equal(result.stdout.indexOf(token), result.stdout.lastIndexOf(token));
});

test("the issuer refuses a lifetime above 30 days before printing a token", () => {
  const result = spawnSync(process.execPath, [script, "reader", "health:read", "31"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr.includes("wo_mcp_"), false);
  assert.match(result.stderr, /30 days/);
});
