import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

import { decideRead } from "./guard-read.mjs";

test("dotenv, device, and token paths are denied", () => {
  for (const filePath of [
    "/workspace/.env",
    "/workspace/.env.local",
    "/workspace/apps/witnessops-app/.env.test.local",
    "/workspace/secrets/my-device.json",
    "/workspace/device.json",
    "/workspace/.desktop-commander-device/config.json",
    "/workspace/.claude-server-commander/state.json",
    "/workspace/.hscli",
    "/workspace/.hscli/token",
    "/workspace/.witnessops-token-store/access.json",
  ]) {
    assert.equal(decideRead({ file_path: filePath }).permission, "deny", filePath);
  }
});

test("ordinary source and environment.json stay readable", () => {
  for (const filePath of [
    "/workspace/package.json",
    "/workspace/.cursor/environment.json",
    "/workspace/AGENTS.md",
    "/workspace/apps/witnessops-web/src/lib/public-contact.ts",
  ]) {
    assert.equal(decideRead({ file_path: filePath }).permission, "allow", filePath);
  }
});

test("a denied attachment blocks the read", () => {
  const decision = decideRead({
    file_path: "/workspace/README.md",
    attachments: [{ type: "file", file_path: "/workspace/.env" }],
  });
  assert.equal(decision.permission, "deny");
});

test("the hook CLI omits agent_message and denies .env", () => {
  const script = resolve(import.meta.dirname, "guard-read.mjs");
  const result = spawnSync(process.execPath, [script], {
    input: JSON.stringify({ file_path: "/workspace/.env", content: "SECRET=1" }),
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.permission, "deny");
  assert.equal("agent_message" in parsed, false);
});
