import assert from "node:assert/strict";
import { mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { withFilesystemLock } from "./filesystem-lock";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("stale lock recovery serializes competing recovery attempts", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "wops-lock-test-"));
  const lockPath = path.join(directory, "state.lock");
  await writeFile(lockPath, "orphaned-lock", "utf8");
  const old = new Date(Date.now() - 60_000);
  await utimes(lockPath, old, old);

  let activeActions = 0;
  let maximumConcurrentActions = 0;

  try {
    await Promise.all(
      Array.from({ length: 12 }, () =>
        withFilesystemLock(
          {
            lockPath,
            description: "test state",
            waitMs: 1,
            timeoutMs: 5_000,
            staleMs: 30_000,
          },
          async () => {
            activeActions += 1;
            maximumConcurrentActions = Math.max(
              maximumConcurrentActions,
              activeActions,
            );
            await wait(5);
            activeActions -= 1;
          },
        ),
      ),
    );

    assert.equal(maximumConcurrentActions, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
