import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

for (const [name, selector] of [["empty", ""], ["whitespace-only", " \t "]] as const) {
  test(`audio generator rejects an explicitly ${name} chapter selector before planning`, () => {
    const result = spawnSync(process.execPath, [
      "--no-experimental-fetch",
      "--import", "tsx",
      fileURLToPath(new URL("../../../../scripts/generate-chronicle-audio.ts", import.meta.url)),
      "--dry-run",
      `--chapter=${selector}`,
    ], {
      cwd: fileURLToPath(new URL("../../", import.meta.url)),
      env: { ...process.env, XAI_API_KEY: "" },
      encoding: "utf8",
      timeout: 10_000,
    });

    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /The chapter selector must not be empty\./);
    assert.equal(result.stdout, "");
  });
}
