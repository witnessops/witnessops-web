import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadTokenConfig } from "./config";

const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../scripts/admin-mcp-issue-token.mjs",
);

test("the offline issuer prints a token once and then the bare hash", async () => {
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
  const token = lines[0] ?? "";
  assert.match(token, /^wo_mcp_reader_[A-Za-z0-9_-]{43}$/);
  assert.equal(result.stderr.includes(token), false);
  const hashLine = lines[1] ?? "";
  assert.match(hashLine, /^[a-f0-9]{64}$/);
  assert.equal(source.includes("sha256:"), false);
  assert.equal(result.stdout.includes("sha256:"), false);
  assert.equal(hashLine, createHash("sha256").update(token).digest("hex"));
  assert.equal(result.stdout.startsWith(`${token}\n${hashLine}\n`), true);
  assert.deepEqual(await readdir(cwd), []);
  assert.equal(result.stdout.indexOf(token), result.stdout.lastIndexOf(token));
});

test("the issuer prints a schema-valid config entry and omits the token", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "admin-mcp-issue-"));
  const configDir = await mkdtemp(path.join(os.tmpdir(), "admin-mcp-entry-"));
  const configFile = path.join(configDir, "tokens.json");
  const saved = process.env.WITNESSOPS_ADMIN_MCP_TOKEN_CONFIG_FILE;
  const dayMs = 24 * 60 * 60 * 1000;
  try {
    const result = spawnSync(
      process.execPath,
      [script, "reader", "health:read,sync:read", "30"],
      { cwd, encoding: "utf8" },
    );
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    const lines = result.stdout.split("\n").filter((line) => line.length > 0);
    assert.equal(lines.length, 3);
    const token = lines[0] ?? "";
    const hashLine = lines[1] ?? "";
    const jsonLine = lines[2] ?? "";
    assert.match(token, /^wo_mcp_reader_[A-Za-z0-9_-]{43}$/);
    assert.equal(hashLine, createHash("sha256").update(token).digest("hex"));
    assert.equal(result.stdout.startsWith(`${token}\n${hashLine}\n`), true);
    assert.equal(jsonLine.includes(token), false);
    assert.equal(result.stdout.indexOf(token), result.stdout.lastIndexOf(token));
    const entry = JSON.parse(jsonLine) as {
      clientId: string;
      tokenHash: string;
      scopes: string[];
      issuedAt: string;
      expiresAt: string;
    };
    assert.equal(JSON.stringify(entry).includes(token), false);
    assert.equal(entry.clientId, "reader");
    assert.equal(entry.tokenHash, hashLine);
    assert.deepEqual(entry.scopes, ["health:read", "sync:read"]);
    assert.equal(Date.parse(entry.expiresAt) - Date.parse(entry.issuedAt), 30 * dayMs);
    await writeFile(configFile, JSON.stringify({ tokens: [entry] }));
    process.env.WITNESSOPS_ADMIN_MCP_TOKEN_CONFIG_FILE = configFile;
    const loaded = await loadTokenConfig();
    assert.equal(loaded.ok, true);
    if (!loaded.ok) return;
    assert.equal(loaded.tokens.length, 1);
    assert.equal(loaded.tokens[0]?.clientId, "reader");
    assert.equal(loaded.tokens[0]?.tokenHash.toString("hex"), hashLine);
    assert.deepEqual([...loaded.tokens[0]?.scopes ?? []], ["health:read", "sync:read"]);
    assert.equal(loaded.tokens[0]?.expiresAt - loaded.tokens[0]?.issuedAt, 30 * dayMs);
    assert.deepEqual(await readdir(cwd), []);
  } finally {
    if (saved === undefined) delete process.env.WITNESSOPS_ADMIN_MCP_TOKEN_CONFIG_FILE;
    else process.env.WITNESSOPS_ADMIN_MCP_TOKEN_CONFIG_FILE = saved;
    await rm(cwd, { recursive: true, force: true });
    await rm(configDir, { recursive: true, force: true });
  }
});

test("the issuer rejects duplicate scopes before printing any token", () => {
  for (const scopes of ["health:read,health:read", "health:read,counts:read,health:read"]) {
    const result = spawnSync(process.execPath, [script, "reader", scopes], {
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr.includes("wo_mcp_"), false);
    assert.match(result.stderr, /duplicate scopes/);
  }
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
